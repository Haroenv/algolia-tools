import { deflateSync, inflateSync } from 'fflate';
import { CURRENT_DICTIONARY_PARAM, DICTIONARIES } from './dictionary';

// Share-link encoding. No server, so everything lives in the URL.
//
// Current:  `?<p>=<base64url(deflate-raw(JSON.stringify(values), dictionary))>`
//           where the param name <p> says which dictionary was used (`d` = V1,
//           a future `d2` = V2, …; see DICTIONARIES in dictionary.ts)
// Legacy:   `?0=<value>&1=<value>…`
//
// Optional UI state (which trees are picked as A/B for the diff, and which
// decoders ran a search) lives in a separate `s` param. The diff
// itself is never stored; it's recomputed from the inputs. Which decoders ran
// a search is stored in `searched`, and those searches are re-run on load. It's purely additive: older clients ignore it, and it never changes `d`.
//
// Both of these must keep decoding forever. The dictionary can still improve:
// add a new version under a new param rather than editing an old one.

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function parseValues(json: Uint8Array): string[] {
  const values = JSON.parse(new TextDecoder().decode(json));
  if (!Array.isArray(values)) throw new Error('invalid share payload');
  return values.map(String);
}

export function encodeValues(
  values: string[],
  param = CURRENT_DICTIONARY_PARAM,
): string {
  const json = new TextEncoder().encode(JSON.stringify(values));
  return toBase64Url(
    deflateSync(json, { level: 9, dictionary: DICTIONARIES[param] }),
  );
}

export function decodeValues(
  payload: string,
  param = CURRENT_DICTIONARY_PARAM,
): string[] {
  return parseValues(
    inflateSync(fromBase64Url(payload), { dictionary: DICTIONARIES[param] }),
  );
}

/** Reads values from a query string, supporting both new and legacy links. */
export async function valuesFromSearch(search: string): Promise<string[]> {
  const params = new URLSearchParams(search);
  const dictParam = Object.keys(DICTIONARIES).find((p) => params.has(p));
  if (dictParam) {
    try {
      return decodeValues(params.get(dictParam)!, dictParam);
    } catch (e) {
      console.error('could not decode shared link', e);
      return [];
    }
  }
  // legacy: ?0=…&1=…
  params.sort();
  return [...params].filter(([k]) => /^\d+$/.test(k)).map(([, v]) => v);
}

/**
 * A reference to a comparable tree: `<decoder index>` for its decoded JSON,
 * `<decoder index>.agent` for its algolia agent, or `<decoder index>.results`
 * for its search results (which are re-fetched on load, see `searched`).
 */
export type CompareRef = string;
export type Compare = { a?: CompareRef; b?: CompareRef };
export type ShareState = { compare?: Compare; searched?: number[] };

const STATE_PARAM = 's';
const REF = /^(\d+)(?:\.(agent|results))?$/;
const KINDS = [undefined, 'agent', 'results'] as const;

// The whole non-input state is one number, `s`, in base 36. With `n` decoders
// (known from the `d` payload) it is mixed-radix, lowest part first:
//
//   searched bitmap  n bits, bit i = decoder i ran a search
//   compare A        0 = none, else 1 + index * 3 + kind   (base 1 + 3n)
//   compare B        same as A
//
//   s = ((B * (1 + 3n) + A) << n) | searched
//
// kind: 0 decoded JSON, 1 algolia agent, 2 search results.
// Only valid for the same `n` on both ends, which holds as `d` stores one
// value per decoder. Changing this layout needs a new param, not an edit.

function refToSlot(ref: CompareRef | undefined, n: number): bigint {
  const m = ref && REF.exec(ref);
  if (!m || Number(m[1]) >= n) return 0n;
  return BigInt(1 + Number(m[1]) * 3 + KINDS.indexOf(m[2] as any));
}

function slotToRef(slot: bigint, n: number): CompareRef | undefined {
  if (slot === 0n) return undefined;
  const v = Number(slot) - 1;
  const index = Math.floor(v / 3);
  if (index >= n) return undefined;
  const kind = KINDS[v % 3];
  return kind ? `${index}.${kind}` : `${index}`;
}

function encodeState(
  n: number,
  { compare, searched = [] }: ShareState,
): bigint {
  let mask = 0n;
  for (const i of searched) if (i >= 0 && i < n) mask |= 1n << BigInt(i);
  const base = BigInt(1 + 3 * n);
  const slots = refToSlot(compare?.b, n) * base + refToSlot(compare?.a, n);
  return (slots << BigInt(n)) | mask;
}

function decodeState(n: number, value: bigint): Required<ShareState> {
  const mask = value & ((1n << BigInt(n)) - 1n);
  const base = BigInt(1 + 3 * n);
  const slots = value >> BigInt(n);
  return {
    searched: Array.from({ length: n }, (_, i) => i).filter(
      (i) => (mask >> BigInt(i)) & 1n,
    ),
    compare: {
      a: slotToRef(slots % base, n),
      b: slotToRef(slots / base, n),
    },
  };
}

function parseBase36(str: string): bigint {
  let value = 0n;
  for (const c of str) value = value * 36n + BigInt(parseInt(c, 36));
  return value;
}

/** Reads `?s=…` for a page with `n` decoders; empty when absent/invalid. */
export function stateFromSearch(
  search: string,
  n: number,
): Required<ShareState> {
  const raw = new URLSearchParams(search).get(STATE_PARAM);
  if (!raw || !/^[0-9a-z]+$/.test(raw)) return { searched: [], compare: {} };
  return decodeState(n, parseBase36(raw));
}

export function searchFromValues(
  values: string[],
  state: ShareState = {},
): string {
  let search = `?${CURRENT_DICTIONARY_PARAM}=${encodeValues(values)}`;
  const value = encodeState(values.length, state);
  if (value !== 0n) search += `&${STATE_PARAM}=${value.toString(36)}`;
  return search;
}
