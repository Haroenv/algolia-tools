import { deflateSync, inflateSync } from 'fflate';
import { CURRENT_DICTIONARY_PARAM, DICTIONARIES } from './dictionary';

// Share-link encoding. No server, so everything lives in the URL.
//
// Current:  `?<p>=<base64url(deflate-raw(JSON.stringify(values), dictionary))>`
//           where the param name <p> says which dictionary was used (`d` = V1,
//           a future `d2` = V2, …; see DICTIONARIES in dictionary.ts)
// Legacy:   `?0=<value>&1=<value>…`
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
  param = CURRENT_DICTIONARY_PARAM
): string {
  const json = new TextEncoder().encode(JSON.stringify(values));
  return toBase64Url(
    deflateSync(json, { level: 9, dictionary: DICTIONARIES[param] })
  );
}

export function decodeValues(
  payload: string,
  param = CURRENT_DICTIONARY_PARAM
): string[] {
  return parseValues(
    inflateSync(fromBase64Url(payload), { dictionary: DICTIONARIES[param] })
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
  return [...params.values()];
}

export function searchFromValues(values: string[]): string {
  return `?${CURRENT_DICTIONARY_PARAM}=${encodeValues(values)}`;
}
