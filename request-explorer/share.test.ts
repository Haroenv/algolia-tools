import { describe, expect, test } from 'bun:test';
import {
  searchedFromSearch,
  searchFromValues,
  valuesFromSearch,
} from './share';

describe('share links', () => {
  test('values round-trip', async () => {
    const values = ['{"requests":[]}', '', 'curl x'];
    expect(await valuesFromSearch(searchFromValues(values))).toEqual(values);
  });

  test('searched decoders round-trip through `s`', async () => {
    const values = Array.from({ length: 12 }, (_, i) => `v${i}`);
    const search = searchFromValues(values, [0, 3, 11]);
    expect(searchedFromSearch(search, values.length)).toEqual([0, 3, 11]);
    expect(await valuesFromSearch(search)).toEqual(values);
  });

  test('no `s` when nothing was searched', () => {
    expect(searchFromValues(['x', 'y'])).not.toContain('&s=');
    expect(searchFromValues(['x', 'y'], [])).not.toContain('&s=');
  });

  test('indexes outside the decoders are ignored', () => {
    expect(searchedFromSearch(searchFromValues(['x'], [0, 5, -1]), 1)).toEqual([
      0,
    ]);
  });

  test('links with the old A/B compare bits still give the searched bitmap', () => {
    // n = 2: the old layout was ((B * (1 + 3n) + A) << n) | searched,
    // here A = decoder 0's request (1), B = decoder 1's results (1 + 3 + 2 = 6)
    const old = (((6n * 7n + 1n) << 2n) | 0b10n).toString(36);
    expect(searchedFromSearch(`?d=x&s=${old}`, 2)).toEqual([1]);
  });

  test('junk in `s` is ignored', () => {
    expect(searchedFromSearch('?s=!!', 2)).toEqual([]);
    expect(searchedFromSearch('?0=a', 1)).toEqual([]);
  });

  test('legacy links still read their values, ignoring other params', async () => {
    expect(await valuesFromSearch('?1=b&0=a&s=5')).toEqual(['a', 'b']);
  });
});
