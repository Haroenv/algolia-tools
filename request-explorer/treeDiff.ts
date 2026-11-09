// Structural diff between two JSON values, expressed as marks per path so the
// trees themselves can highlight what differs (instead of a separate diff box).
//
// - objects are compared by key
// - arrays are aligned with an LCS on the serialized items, so an inserted item
//   doesn't make every following item look changed
// - a path is `changed` when both sides have it but differ, `only` when just
//   this side has it

export type Mark = 'changed' | 'only';

export type SideMarks = {
  /** marks on the leaves/nodes that differ themselves */
  marks: Map<string, Mark>;
  /** number of differing descendants (or itself) per path, for badges */
  counts: Map<string, number>;
};

export type TreeDiff = { a: SideMarks; b: SideMarks };

const SEP = '\u0001';

/** Path key from a react-json-tree keyPath (leaf first; `hideRoot` trees have no `root` entry). */
export function pathKey(keyPath: readonly (string | number)[]): string {
  return [...keyPath].reverse().join(SEP);
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

// LCS table is O(n*m); above this fall back to aligning by position
const MAX_LCS_CELLS = 250_000;

function align(a: string[], b: string[]): [number, number][] {
  if (a.length * b.length > MAX_LCS_CELLS) {
    return a
      .slice(0, Math.min(a.length, b.length))
      .flatMap((x, i) => (x === b[i] ? [[i, i] as [number, number]] : []));
  }
  const n = a.length;
  const m = b.length;
  const t: Uint32Array[] = Array.from(
    { length: n + 1 },
    () => new Uint32Array(m + 1),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      t[i][j] =
        a[i] === b[j]
          ? t[i + 1][j + 1] + 1
          : Math.max(t[i + 1][j], t[i][j + 1]);
    }
  }
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pairs.push([i++, j++]);
    } else if (t[i + 1][j] >= t[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
}

export function diffTrees(a: unknown, b: unknown): TreeDiff {
  const out: TreeDiff = {
    a: { marks: new Map(), counts: new Map() },
    b: { marks: new Map(), counts: new Map() },
  };

  const mark = (side: SideMarks, path: string[], kind: Mark) => {
    side.marks.set(path.join(SEP), kind);
    for (let i = path.length; i >= 0; i--) {
      const key = path.slice(0, i).join(SEP);
      side.counts.set(key, (side.counts.get(key) ?? 0) + 1);
    }
  };

  // `pa` / `pb`: the path on each side, they differ once array items shift
  const walk = (x: unknown, y: unknown, pa: string[], pb: string[]) => {
    if (isObject(x) && isObject(y)) {
      for (const key of new Set([...Object.keys(x), ...Object.keys(y)])) {
        const inX = key in x;
        const inY = key in y;
        if (inX && inY) walk(x[key], y[key], [...pa, key], [...pb, key]);
        else if (inX) mark(out.a, [...pa, key], 'only');
        else mark(out.b, [...pb, key], 'only');
      }
    } else if (Array.isArray(x) && Array.isArray(y)) {
      const pairs = align(
        x.map((v) => JSON.stringify(v)),
        y.map((v) => JSON.stringify(v)),
      );
      // in the gaps between identical anchors, pair items up by position
      let i = 0;
      let j = 0;
      const gap = (endI: number, endJ: number) => {
        while (i < endI && j < endJ) {
          walk(x[i], y[j], [...pa, String(i)], [...pb, String(j)]);
          i++;
          j++;
        }
        for (; i < endI; i++) mark(out.a, [...pa, String(i)], 'only');
        for (; j < endJ; j++) mark(out.b, [...pb, String(j)], 'only');
      };
      for (const [pi, pj] of pairs) {
        gap(pi, pj);
        i = pi + 1;
        j = pj + 1;
      }
      gap(x.length, y.length);
    } else if (JSON.stringify(x) !== JSON.stringify(y)) {
      mark(out.a, pa, 'changed');
      mark(out.b, pb, 'changed');
    }
  };

  walk(a, b, [], []);
  return out;
}

/** What a tree needs to highlight itself against the others of its kind. */
export type TreeMarks = {
  side: SideMarks;
  /** how to show keys only this tree has: `removed` for the baseline */
  only: 'removed' | 'added';
  /** for a baseline compared with several others: how many others there are,
   * its counts then say in how many of them a path differs */
  of?: number;
};

const pairCache = new WeakMap<object, WeakMap<object, TreeDiff>>();

// diffs are cached per pair, so editing one request only redoes its own diff
function cachedDiff(base: object, other: object): TreeDiff {
  let perBase = pairCache.get(base);
  if (!perBase) pairCache.set(base, (perBase = new WeakMap()));
  let diff = perBase.get(other);
  if (!diff) perBase.set(other, (diff = diffTrees(base, other)));
  return diff;
}

/**
 * Compare a group of trees of the same kind against the first one (the
 * baseline). The others show how they differ from it. The baseline shows the
 * union of what differs in any of them, counting in how many.
 */
export function marksForGroup(items: object[]): TreeMarks[] {
  if (items.length < 2) return [];
  const [base, ...others] = items;
  const diffs = others.map((other) => cachedDiff(base, other));

  if (diffs.length === 1) {
    return [
      { side: diffs[0].a, only: 'removed' },
      { side: diffs[0].b, only: 'added' },
    ];
  }

  const marks = new Map<string, Mark>();
  const counts = new Map<string, number>();
  for (const { a } of diffs) {
    for (const [path, mark] of a.marks) {
      if (mark === 'changed' || !marks.has(path)) marks.set(path, mark);
    }
    for (const path of a.counts.keys()) {
      counts.set(path, (counts.get(path) ?? 0) + 1);
    }
  }
  return [
    { side: { marks, counts }, only: 'removed', of: others.length },
    ...diffs.map(({ b }): TreeMarks => ({ side: b, only: 'added' })),
  ];
}

/**
 * Trees are keyed by `<decoder index>` (the request), `<index>.agent` or
 * `<index>.results`. Each kind is compared among itself, never across kinds,
 * with the lowest decoder index as the baseline.
 */
export function marksByRef(trees: Record<string, object>) {
  const groups = new Map<
    string,
    { index: number; ref: string; item: object }[]
  >();
  for (const [ref, item] of Object.entries(trees)) {
    const [index, kind = 'request'] = ref.split('.');
    const group = groups.get(kind) ?? [];
    group.push({ index: Number(index), ref, item });
    groups.set(kind, group);
  }

  const out: Record<string, TreeMarks> = {};
  for (const group of groups.values()) {
    group.sort((x, y) => x.index - y.index);
    const marks = marksForGroup(group.map((g) => g.item));
    marks.forEach((m, i) => (out[group[i].ref] = m));
  }
  return out;
}
