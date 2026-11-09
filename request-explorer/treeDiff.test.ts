import { describe, expect, test } from 'bun:test';
import { diffTrees } from './treeDiff';

const keys = (m: Map<string, unknown>) =>
  Object.fromEntries([...m].map(([k, v]) => [k.replaceAll('\u0001', '.'), v]));

describe('diffTrees', () => {
  test('identical values have no marks', () => {
    const d = diffTrees({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] });
    expect(d.a.marks.size + d.b.marks.size).toBe(0);
  });

  test('changed, added and removed object keys', () => {
    const d = diffTrees(
      { q: 'a', gone: 1, same: 1 },
      { q: 'b', new: 1, same: 1 },
    );
    expect(keys(d.a.marks)).toEqual({ q: 'changed', gone: 'only' });
    expect(keys(d.b.marks)).toEqual({ q: 'changed', new: 'only' });
  });

  test('counts bubble up to ancestors', () => {
    const d = diffTrees(
      { r: { x: { y: 1, z: 1 } } },
      { r: { x: { y: 2, z: 2 } } },
    );
    expect(keys(d.a.counts)).toEqual({
      '': 2,
      r: 2,
      'r.x': 2,
      'r.x.y': 1,
      'r.x.z': 1,
    });
  });

  test('an inserted array item does not shift the others', () => {
    const d = diffTrees({ l: [1, 2, 3] }, { l: [1, 9, 2, 3] });
    expect(keys(d.a.marks)).toEqual({});
    expect(keys(d.b.marks)).toEqual({ 'l.1': 'only' });
  });

  test("changed array item uses each side's own index", () => {
    const d = diffTrees({ l: ['x', 'a', 'b'] }, { l: ['a', 'b', 'y'] });
    expect(keys(d.a.marks)).toEqual({ 'l.0': 'only' });
    expect(keys(d.b.marks)).toEqual({ 'l.2': 'only' });
    const e = diffTrees(
      { l: [{ q: 1 }, 'keep'] },
      { l: ['new', { q: 2 }, 'keep'] },
    );
    expect(keys(e.a.marks)).toEqual({ 'l.0': 'changed' });
    expect(keys(e.b.marks)).toEqual({ 'l.0': 'changed', 'l.1': 'only' });
  });

  test('type mismatches are changed', () => {
    const d = diffTrees({ a: [1] }, { a: { 0: 1 } });
    expect(keys(d.a.marks)).toEqual({ a: 'changed' });
  });
});

test('pathKey matches the marks for react-json-tree keyPaths', async () => {
  const { pathKey } = await import('./treeDiff');
  const d = diffTrees({ r: [{ q: 1 }] }, { r: [{ q: 2 }] });
  // leaf first, as react-json-tree passes it (hideRoot: no `root` entry)
  expect(d.a.marks.get(pathKey(['q', 0, 'r']))).toBe('changed');
  expect(d.a.counts.get(pathKey(['r']))).toBe(1);
  expect(d.a.counts.get(pathKey([]))).toBe(1);
});

describe('marksByRef', () => {
  test('requests are compared among each other, separately from results', async () => {
    const { marksByRef } = await import('./treeDiff');
    const out = marksByRef({
      '0': { q: 1 },
      '1': { q: 2 },
      '0.results': { hits: 1 },
      '1.results': { hits: 2 },
      '0.agent': ['a'],
    });
    expect(Object.keys(out).sort()).toEqual([
      '0',
      '0.results',
      '1',
      '1.results',
    ]);
    expect(out['0'].side.marks.get('q')).toBe('changed');
    expect(out['0.results'].side.marks.get('hits')).toBe('changed');
    // a request is never compared with a response
    expect(out['0'].side.marks.has('hits')).toBe(false);
  });

  test('one tree of a kind has nothing to compare with', async () => {
    const { marksByRef } = await import('./treeDiff');
    expect(marksByRef({ '0': { q: 1 }, '0.results': {} })).toEqual({});
  });

  test('the first tree is the baseline, and counts in how many others differ', async () => {
    const { marksByRef } = await import('./treeDiff');
    const out = marksByRef({
      '0': { q: 'a', x: 1 },
      '1': { q: 'b', x: 1 },
      '2': { q: 'c', y: 1, x: 1 },
    });
    expect(out['0'].of).toBe(2);
    expect(out['0'].only).toBe('removed');
    expect(out['0'].side.marks.get('q')).toBe('changed');
    expect(out['0'].side.counts.get('q')).toBe(2);
    expect(out['0'].side.counts.get('')).toBe(2);
    expect(out['0'].side.marks.has('x')).toBe(false);
    expect(out['1'].side.marks.get('q')).toBe('changed');
    expect(out['2'].side.marks.get('y')).toBe('only');
    expect(out['2'].only).toBe('added');
  });

  test('the order is by decoder index, not insertion order', async () => {
    const { marksByRef } = await import('./treeDiff');
    const out = marksByRef({ '10': { q: 2 }, '2': { q: 1 } });
    expect(out['2'].only).toBe('removed');
    expect(out['10'].only).toBe('added');
  });
});
