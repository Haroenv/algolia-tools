import {
  useState,
  useEffect,
  useCallback,
  useDeferredValue,
  useMemo,
  memo,
  createContext,
  useContext,
} from 'react';
import { createRoot } from 'react-dom/client';
import { JSONTree } from 'react-json-tree';
import { Differ, Viewer } from 'json-diff-kit';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { testData } from './testData';

import 'json-diff-kit/dist/viewer.css';
import './styles.css';
import { decode } from './decode';
import {
  stateFromSearch,
  type ShareState,
  searchFromValues,
  valuesFromSearch,
} from './share';

const brightTheme = {
  scheme: 'bright',
  author: 'chris kempson (http://chriskempson.com)',
  base00: '#000000',
  base01: '#303030',
  base02: '#505050',
  base03: '#b0b0b0',
  base04: '#d0d0d0',
  base05: '#e0e0e0',
  base06: '#f5f5f5',
  base07: '#ffffff',
  base08: '#fb0120',
  base09: '#fc6d24',
  base0A: '#fda331',
  base0B: '#a1c659',
  base0C: '#76c7b7',
  base0D: '#ffffff',
  base0E: '#d381c3',
  base0F: '#be643c',
};

function shouldExpandNode(name: unknown, data: unknown, level: number) {
  return level < 5;
}

const MemoJSONTree = memo(JSONTree);

const Tree = memo(function Tree({
  data,
  compareRef,
}: {
  data: object;
  compareRef?: string;
}) {
  return (
    <>
      <Comparable item={data} compareRef={compareRef} />
      <MemoJSONTree
        data={data}
        invertTheme
        shouldExpandNodeInitially={shouldExpandNode}
        theme={brightTheme}
        hideRoot
      />
    </>
  );
});

const Decoder = memo(function Decoder({
  index,
  defaultValue = '',
  autoSearch = false,
  onSearched,
  onValueChange,
}: {
  index: number;
  defaultValue?: string;
  autoSearch?: boolean;
  onSearched: (index: number, searched: boolean) => void;
  onValueChange: (index: number, value: string) => void;
}) {
  const setToDiff = useContext(SetDiffContext);
  const [demoIndex, setDemoIndex] = useState(0);
  const [data, setData] = useState(defaultValue);
  const [results, setResults] = useState<Record<string, any>>();
  // decoding + rendering the trees can lag behind typing
  const deferredData = useDeferredValue(data);
  const { json, appId, apiKey, algoliaAgent, error } = useMemo(() => {
    try {
      return { ...decode(deferredData), error: undefined as Error | undefined };
    } catch (e) {
      return {
        json: {} as ReturnType<typeof decode>['json'],
        appId: undefined as string | undefined,
        apiKey: undefined as string | undefined,
        algoliaAgent: [] as string[],
        error: e as Error,
      };
    }
  }, [deferredData]);

  const runSearch = () => {
    if (!appId || !apiKey || !json.requests) return;
    onSearched(index, true);
    algoliasearch(appId, apiKey)
      .search(json.requests as any)
      .then((res) => setResults(res))
      .catch((e) => setResults(e));
  };

  // re-run the search when the shared link says it had been run
  useEffect(() => {
    if (autoSearch) runSearch();
  }, []);

  // fill in a compare pick that was restored from the URL, waiting on results
  useEffect(() => {
    if (!results) return;
    const ref = `${index}.results`;
    setToDiff((prev) => ({
      a: prev.a?.ref === ref && !prev.a.item ? { ref, item: results } : prev.a,
      b: prev.b?.ref === ref && !prev.b.item ? { ref, item: results } : prev.b,
    }));
  }, [results]);

  return (
    <div className="decoder">
      <div className="group">
        <input
          onChange={(e) => {
            setData(e.target.value);
            onValueChange(index, e.target.value);
            setResults(undefined);
            onSearched(index, false);
          }}
          value={data}
          className="data-input"
        />
        <button
          onClick={() => {
            const demo = testData[demoIndex % testData.length];
            setData(demo);
            onValueChange(index, demo);
            setDemoIndex(demoIndex + 1);
          }}
        >
          demo
        </button>
      </div>
      {deferredData ? (
        error ? (
          <div className="error">{error.message}</div>
        ) : (
          <>
            <Tree data={json} compareRef={`${index}`} />
            <label>
              decoded: <input readOnly value={JSON.stringify(json)} />
            </label>
            {Boolean(algoliaAgent.length) && (
              <details>
                <summary>algolia agent</summary>
                <Tree data={algoliaAgent} compareRef={`${index}.agent`} />
              </details>
            )}
            {apiKey && appId && json.requests && (
              <>
                <label htmlFor="searchFunction">search: </label>
                <div className="group">
                  <input
                    id="searchFunction"
                    readOnly
                    value={`window.algoliasearch("${appId}","${apiKey}").search(${JSON.stringify(
                      json.requests,
                    )})`}
                  />
                  <button type="button" onClick={runSearch}>
                    search
                  </button>
                </div>
              </>
            )}
            {Boolean(results) && (
              <Tree data={results!} compareRef={`${index}.results`} />
            )}
          </>
        )
      ) : null}
    </div>
  );
});

const differ = new Differ({
  detectCircular: true,
  maxDepth: Infinity,
  showModifications: true,
  arrayDiffMethod: 'lcs',
});

// `item` is missing while a restored `.results` pick waits for its search
type Picked = { item?: object; ref?: string };
type ToDiff = { a?: Picked; b?: Picked };

// the setter is stable, so it lives in its own context: components that only
// write (every Decoder) don't re-render when a pick changes
const DiffContext = createContext<ToDiff>({});
const SetDiffContext = createContext<
  React.Dispatch<React.SetStateAction<ToDiff>>
>(() => {});

function resolveRef(ref: string | undefined, values: string[]) {
  if (!ref) return undefined;
  const [index, kind] = ref.split('.');
  try {
    if (kind === 'results') return { ref };
    const { json, algoliaAgent } = decode(values[Number(index)] ?? '');
    const item = kind === 'agent' ? algoliaAgent : json;
    return item ? { item: item as object, ref } : undefined;
  } catch {
    return undefined;
  }
}

function Comparable({
  item,
  compareRef,
}: {
  item: object;
  compareRef?: string;
}) {
  const toDiff = useContext(DiffContext);
  const setToDiff = useContext(SetDiffContext);

  // a pick follows its source: when the tree changes (the input was edited, or
  // it was restored from the URL) the picked item is replaced by the new one
  useEffect(() => {
    if (!compareRef) return;
    setToDiff((prev) => {
      const a =
        prev.a?.ref === compareRef && prev.a.item !== item
          ? { ref: compareRef, item }
          : prev.a;
      const b =
        prev.b?.ref === compareRef && prev.b.item !== item
          ? { ref: compareRef, item }
          : prev.b;
      return a === prev.a && b === prev.b ? prev : { a, b };
    });
  }, [item, compareRef, setToDiff]);

  return (
    <div className="compare-group">
      <button
        type="button"
        className={compareRef && toDiff.a?.ref === compareRef ? 'active' : ''}
        onClick={() => {
          setToDiff((prev) => ({ ...prev, a: { item, ref: compareRef } }));
        }}
      >
        Compare: A
      </button>
      <button
        type="button"
        className={compareRef && toDiff.b?.ref === compareRef ? 'active' : ''}
        onClick={() => {
          setToDiff((prev) => ({ ...prev, b: { item, ref: compareRef } }));
        }}
      >
        Compare: B
      </button>
    </div>
  );
}

function DiffViewer() {
  const toDiff = useContext(DiffContext);
  // the diff (lcs on big results) is slow, don't block clicks on it
  const a = useDeferredValue(toDiff.a?.item);
  const b = useDeferredValue(toDiff.b?.item);
  const diff = useMemo(
    () => (a === undefined || b === undefined ? undefined : differ.diff(a, b)),
    [a, b],
  );
  if (!diff) return null;

  return (
    <div>
      <Viewer
        diff={diff}
        highlightInlineDiff
        inlineDiffOptions={{
          mode: 'word',
        }}
        hideUnchangedLines
        syntaxHighlight={false}
      />
    </div>
  );
}

function App({
  defaultValues,
  defaultState,
}: {
  defaultValues: string[];
  defaultState: Required<ShareState>;
}) {
  const { compare: defaultCompare, searched: defaultSearched } = defaultState;
  const [searched, setSearched] = useState(defaultSearched);
  const onSearched = useCallback((index: number, isSearched: boolean) => {
    setSearched((prev) => [
      ...prev.filter((i) => i !== index),
      ...(isSearched ? [index] : []),
    ]);
  }, []);
  const [num, setNum] = useState(defaultValues.length || 1);
  const [values, setValues] = useState(defaultValues);
  const onValueChange = useCallback((index: number, value: string) => {
    setValues((prev) => {
      const next = [...prev];
      for (let i = 0; i < index; i++) next[i] ??= '';
      next[index] = value;
      return next;
    });
  }, []);
  const [toDiff, setToDiff] = useState<ToDiff>(() => ({
    a: resolveRef(defaultCompare.a, defaultValues),
    b: resolveRef(defaultCompare.b, defaultValues),
  }));

  // keep the URL in sync with the state, so it can always be copied. Writing
  // it (compressing + history call) is debounced and done when idle, so typing
  // doesn't do that work on every keystroke.
  useEffect(() => {
    const write = () => {
      const current = Array.from({ length: num }, (_, i) => values[i] ?? '');
      const state = {
        compare: { a: toDiff.a?.ref, b: toDiff.b?.ref },
        searched: searched.filter((i) => i < num),
      };
      const pristine =
        current.every((v) => !v) && !state.compare.a && !state.compare.b;
      window.history.replaceState(
        {},
        document.title,
        pristine ? window.location.pathname : searchFromValues(current, state),
      );
    };

    let idle: number | undefined;
    const timeout = window.setTimeout(() => {
      if ('requestIdleCallback' in window) {
        idle = window.requestIdleCallback(write, { timeout: 1000 });
      } else {
        write();
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      if (idle !== undefined) window.cancelIdleCallback(idle);
    };
  }, [values, num, toDiff, searched]);

  useEffect(() => {
    (window as any).algoliasearch = algoliasearch;
    console.log('window.algoliasearch is available to the console');
  }, []);

  return (
    <SetDiffContext.Provider value={setToDiff}>
      <DiffContext.Provider value={toDiff}>
        <h1>Raw Algolia request parser</h1>
        <div className="decoderList">
          {Array.from({ length: num }).map((_, i) => (
            <Decoder
              key={i}
              index={i}
              defaultValue={defaultValues[i]}
              autoSearch={defaultSearched.includes(i)}
              onSearched={onSearched}
              onValueChange={onValueChange}
            />
          ))}
        </div>
        <p>
          <button
            type="button"
            disabled={num === 1}
            onClick={() => setNum(num - 1)}
          >
            -
          </button>{' '}
          <button type="button" onClick={() => setNum(num + 1)}>
            +
          </button>
        </p>
        <DiffViewer />
      </DiffContext.Provider>
    </SetDiffContext.Provider>
  );
}

valuesFromSearch(window.location.search).then((defaultValues) => {
  createRoot(document.getElementById('root')!).render(
    <App
      defaultValues={defaultValues}
      defaultState={stateFromSearch(
        window.location.search,
        defaultValues.length || 1,
      )}
    />,
  );
});
