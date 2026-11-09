import { deflateSync, inflateSync } from 'fflate';
import { CURRENT_DICTIONARY_PARAM, DICTIONARIES } from './dictionary';

// Share-link encoding. No server, so everything lives in the URL.
//
// Current:  `?<p>=<base64url(deflate-raw(JSON.stringify(values), dictionary))>`
//           where the param name <p> says which dictionary was used (`d` = V1,
//           a future `d2` = V2, …; see DICTIONARIES in dictionary.ts)
// Legacy:   `?0=<value>&1=<value>…`
//
// Optional UI state (which decoders ran a search) lives in a separate `s`
// param. Those searches are re-run on load. It's purely additive: older clients
// ignore it, and it never changes `d`. Everything that is compared is
// recomputed from the inputs, so none of that is stored.
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

// `s` is a base-36 number: a bitmap with `n` bits, where `n` is the number of
// decoders (known from the `d` payload) and bit i means decoder i ran a search.
//
// Links made by an earlier version also have the A/B compare picks in the bits
// above the bitmap. Those are ignored now, so they must stay unused: don't give
// the high bits a new meaning, use a new param instead.

const STATE_PARAM = 's';

function encodeSearched(n: number, searched: number[]): bigint {
  let mask = 0n;
  for (const i of searched) if (i >= 0 && i < n) mask |= 1n << BigInt(i);
  return mask;
}

function decodeSearched(n: number, value: bigint): number[] {
  const mask = value & ((1n << BigInt(n)) - 1n);
  return Array.from({ length: n }, (_, i) => i).filter(
    (i) => (mask >> BigInt(i)) & 1n,
  );
}

function parseBase36(str: string): bigint {
  let value = 0n;
  for (const c of str) value = value * 36n + BigInt(parseInt(c, 36));
  return value;
}

/** Reads `?s=…` for a page with `n` decoders: which ran a search. */
export function searchedFromSearch(search: string, n: number): number[] {
  const raw = new URLSearchParams(search).get(STATE_PARAM);
  if (!raw || !/^[0-9a-z]+$/.test(raw)) return [];
  return decodeSearched(n, parseBase36(raw));
}

export function searchFromValues(values: string[], searched: number[] = []) {
  let search = `?${CURRENT_DICTIONARY_PARAM}=${encodeValues(values)}`;
  const value = encodeSearched(values.length, searched);
  if (value !== 0n) search += `&${STATE_PARAM}=${value.toString(36)}`;
  return search;
}
