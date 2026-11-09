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
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { testData } from './testData';
import { marksByRef, pathKey, type TreeMarks } from './treeDiff';

import './styles.css';
import { decode } from './decode';
import {
  searchedFromSearch,
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

// How every tree differs from the others of its kind (requests among each
// other, responses among each other), keyed by tree ref. The trees highlight
// it themselves.
const MarksContext = createContext<Record<string, TreeMarks>>({});

// Trees register themselves, so the app knows what there is to compare
const RegisterContext = createContext<{
  register: (ref: string, item: object) => void;
  unregister: (ref: string) => void;
}>({ register: () => {}, unregister: () => {} });

function useTreeRenderers(marks: TreeMarks | undefined) {
  return useMemo(() => {
    if (!marks) return undefined;
    const { side, only, of } = marks;
    const classFor = (keyPath: readonly (string | number)[]) => {
      const mark = side.marks.get(pathKey(keyPath));
      return mark === 'changed' ? 'diff-changed' : mark ? `diff-${only}` : '';
    };
    return {
      labelRenderer: (keyPath: readonly (string | number)[]) => (
        <span className={classFor(keyPath)}>{keyPath[0]}:</span>
      ),
      valueRenderer: (
        valueAsString: unknown,
        _value: unknown,
        ...keyPath: (string | number)[]
      ) => <span className={classFor(keyPath)}>{String(valueAsString)}</span>,
      getItemString: (
        _type: string,
        _data: unknown,
        itemType: React.ReactNode,
        itemString: string,
        keyPath: readonly (string | number)[],
      ) => {
        const count = side.counts.get(pathKey(keyPath)) ?? 0;
        return (
          <span>
            {itemType} {itemString}
            {count > 0 && (
              <span className="diff-badge">
                {of
                  ? count === of
                    ? 'differs from all others'
                    : `differs from ${count} of ${of} others`
                  : `${count} diff`}
              </span>
            )}
          </span>
        );
      },
      shouldExpandNodeInitially: (
        keyPath: readonly (string | number)[],
        _data: unknown,
        level: number,
      ) => level < 5 || (side.counts.get(pathKey(keyPath)) ?? 0) > 0,
    };
  }, [marks?.side, marks?.only, marks?.of]);
}

const MemoJSONTree = memo(JSONTree);

/**
 * `treeRef` is `<decoder index>` for a request, `<index>.agent` or
 * `<index>.results`: it decides what the tree is compared with.
 */
const Tree = memo(function Tree({
  data,
  treeRef,
}: {
  data: object;
  treeRef: string;
}) {
  const { register, unregister } = useContext(RegisterContext);
  useEffect(() => register(treeRef, data), [treeRef, data, register]);
  useEffect(() => () => unregister(treeRef), [treeRef, unregister]);

  const renderers = useTreeRenderers(useContext(MarksContext)[treeRef]);

  return (
    <MemoJSONTree
      // remount when highlighting starts/stops, to expand to the changes
      key={renderers ? 'diff' : 'plain'}
      data={data}
      invertTheme
      shouldExpandNodeInitially={shouldExpandNode}
      theme={brightTheme}
      hideRoot
      {...renderers}
    />
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
            <Tree data={json} treeRef={`${index}`} />
            <label>
              decoded: <input readOnly value={JSON.stringify(json)} />
            </label>
            {Boolean(algoliaAgent.length) && (
              <details>
                <summary>algolia agent</summary>
                <Tree data={algoliaAgent} treeRef={`${index}.agent`} />
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
              <Tree data={results!} treeRef={`${index}.results`} />
            )}
          </>
        )
      ) : null}
    </div>
  );
});

function App({
  defaultValues,
  defaultSearched,
}: {
  defaultValues: string[];
  defaultSearched: number[];
}) {
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

  // every tree that is shown, to compare them. The comparing can be slow (lcs
  // on big results), so it's deferred to keep typing and clicking responsive.
  const [trees, setTrees] = useState<Record<string, object>>({});
  const register = useMemo(
    () => ({
      register: (ref: string, item: object) =>
        setTrees((prev) =>
          prev[ref] === item ? prev : { ...prev, [ref]: item },
        ),
      unregister: (ref: string) =>
        setTrees((prev) => {
          const { [ref]: _, ...rest } = prev;
          return ref in prev ? rest : prev;
        }),
    }),
    [],
  );
  const deferredTrees = useDeferredValue(trees);
  const marks = useMemo(() => marksByRef(deferredTrees), [deferredTrees]);

  // keep the URL in sync with the state, so it can always be copied. Writing
  // it (compressing + history call) is debounced and done when idle, so typing
  // doesn't do that work on every keystroke.
  useEffect(() => {
    const write = () => {
      const current = Array.from({ length: num }, (_, i) => values[i] ?? '');
      window.history.replaceState(
        {},
        document.title,
        current.every((v) => !v)
          ? window.location.pathname
          : searchFromValues(
              current,
              searched.filter((i) => i < num),
            ),
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
  }, [values, num, searched]);

  useEffect(() => {
    (window as any).algoliasearch = algoliasearch;
    console.log('window.algoliasearch is available to the console');
  }, []);

  return (
    <RegisterContext.Provider value={register}>
      <MarksContext.Provider value={marks}>
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
      </MarksContext.Provider>
    </RegisterContext.Provider>
  );
}

valuesFromSearch(window.location.search).then((defaultValues) => {
  createRoot(document.getElementById('root')!).render(
    <App
      defaultValues={defaultValues}
      defaultSearched={searchedFromSearch(
        window.location.search,
        defaultValues.length || 1,
      )}
    />,
  );
});
