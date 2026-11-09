import {
  useState,
  useEffect,
  useCallback,
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

function Tree({ data, compareRef }: { data: object; compareRef?: string }) {
  return (
    <>
      <Comparable item={data} compareRef={compareRef} />
      <JSONTree
        data={data}
        invertTheme
        shouldExpandNodeInitially={shouldExpandNode}
        theme={brightTheme}
        hideRoot
      />
    </>
  );
}

function Decoder({
  index,
  defaultValue = '',
  autoSearch = false,
  onSearched,
}: {
  index: number;
  defaultValue?: string;
  autoSearch?: boolean;
  onSearched: (index: number, searched: boolean) => void;
}) {
  const { setToDiff } = useContext(DiffContext)!;
  const [demoIndex, setDemoIndex] = useState(0);
  const [data, setData] = useState(defaultValue);
  const [results, setResults] = useState<Record<string, any>>();
  let json: ReturnType<typeof decode>['json'] = {};
  let appId: string | undefined = undefined;
  let apiKey: string | undefined = undefined;
  let algoliaAgent: string[] = [];
  let error: Error | undefined = undefined;

  try {
    ({ json, appId, apiKey, algoliaAgent } = decode(data));
  } catch (e) {
    error = e as Error;
  }

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
            setResults(undefined);
            onSearched(index, false);
          }}
          value={data}
          className="data-input"
        />
        <button
          onClick={() => {
            setData(testData[demoIndex % testData.length]);
            setDemoIndex(demoIndex + 1);
          }}
        >
          demo
        </button>
      </div>
      {data ? (
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
}

const differ = new Differ({
  detectCircular: true,
  maxDepth: Infinity,
  showModifications: true,
  arrayDiffMethod: 'lcs',
});

// `item` is missing while a restored `.results` pick waits for its search
type Picked = { item?: object; ref?: string };
type ToDiff = { a?: Picked; b?: Picked };

const DiffContext = createContext<{
  toDiff: ToDiff;
  setToDiff: React.Dispatch<React.SetStateAction<ToDiff>>;
} | null>(null);

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
  const { toDiff, setToDiff } = useContext(DiffContext)!;

  return (
    <div className="compare-group">
      <button
        type="button"
        className={
          JSON.stringify(toDiff.a?.item) === JSON.stringify(item)
            ? 'active'
            : ''
        }
        onClick={() => {
          setToDiff((prev) => ({ ...prev, a: { item, ref: compareRef } }));
        }}
      >
        Compare: A
      </button>
      <button
        type="button"
        className={
          JSON.stringify(toDiff.b?.item) === JSON.stringify(item)
            ? 'active'
            : ''
        }
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
  const { toDiff } = useContext(DiffContext)!;
  if (toDiff.a?.item === undefined || toDiff.b?.item === undefined) {
    return null;
  }

  const diff = differ.diff(toDiff.a.item, toDiff.b.item);

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
  const [link, setLink] = useState('');
  const [toDiff, setToDiff] = useState<ToDiff>(() => ({
    a: resolveRef(defaultCompare.a, defaultValues),
    b: resolveRef(defaultCompare.b, defaultValues),
  }));

  useEffect(() => {
    (window as any).algoliasearch = algoliasearch;
    console.log('window.algoliasearch is available to the console');
  }, []);

  return (
    <DiffContext.Provider value={{ toDiff, setToDiff }}>
      <h1>Raw Algolia request parser</h1>
      <div className="decoderList">
        {Array.from({ length: num }).map((_, i) => (
          <Decoder
            key={i}
            index={i}
            defaultValue={defaultValues[i]}
            autoSearch={defaultSearched.includes(i)}
            onSearched={onSearched}
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
      <p>
        <button
          type="button"
          onClick={() => {
            const values = Array.from(
              document.querySelectorAll<HTMLInputElement>('.data-input'),
              (i) => i.value,
            );
            const url = searchFromValues(values, {
              compare: { a: toDiff.a?.ref, b: toDiff.b?.ref },
              searched: searched.filter((i) => i < num).sort((a, b) => a - b),
            });
            setLink(url);

            window.history.pushState({}, document.title, url);
          }}
        >
          create shareable link
        </button>{' '}
        {link && <a href={link}>shareable link</a>}
      </p>
      <DiffViewer />
    </DiffContext.Provider>
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
