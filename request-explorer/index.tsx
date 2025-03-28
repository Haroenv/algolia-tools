import { useState, useEffect } from 'react';
import * as ReactDOM from 'react-dom/client';
import { JSONTree } from 'react-json-tree';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { testData } from './testData';

import './styles.css';
import { decode } from './decode';

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

function Decoder({ defaultValue = '' }) {
  const [demoIndex, setDemoIndex] = useState(0);
  const [data, setData] = useState(defaultValue);
  const [results, setResults] = useState<Record<string, any>>();
  let json: { requests?: Array<Record<string, any>> } = {};
  let appId: string | undefined = undefined;
  let apiKey: string | undefined = undefined;
  let algoliaAgent: string[] = [];
  let error: Error | undefined = undefined;

  try {
    ({ json, appId, apiKey, algoliaAgent } = decode(data));
  } catch (e) {
    error = e as Error;
  }

  return (
    <div className="decoder">
      <div className="group">
        <input
          onChange={(e) => {
            setData(e.target.value);
            setResults(undefined);
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
            <JSONTree
              data={json}
              invertTheme
              shouldExpandNodeInitially={shouldExpandNode}
              theme={brightTheme}
              hideRoot
            />
            <label>
              decoded: <input readOnly value={JSON.stringify(json)} />
            </label>
            {Boolean(algoliaAgent.length) && (
              <details>
                <summary>algolia agent</summary>
                <JSONTree
                  data={algoliaAgent}
                  invertTheme
                  theme={brightTheme}
                  hideRoot
                />
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
                      json.requests
                    )})`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      algoliasearch(appId, apiKey)
                        .search(json.requests as any)
                        .then((res) => setResults(res))
                        .catch((e) => setResults(e))
                    }
                  >
                    search
                  </button>
                </div>
              </>
            )}
            {Boolean(results) && (
              <JSONTree
                data={results}
                invertTheme
                shouldExpandNodeInitially={shouldExpandNode}
                theme={brightTheme}
                hideRoot
              />
            )}
          </>
        )
      ) : null}
    </div>
  );
}

const searchParams = new URLSearchParams(window.location.search);
searchParams.sort();
const defaultValues = [...searchParams.values()];

function App() {
  const [num, setNum] = useState(searchParams.size || 1);
  const [link, setLink] = useState('');

  useEffect(() => {
    (window as any).algoliasearch = algoliasearch;
    console.log('window.algoliasearch is available to the console');
  }, []);

  return (
    <>
      <h1>Raw Algolia request parser</h1>
      <div className="decoderList">
        {Array.from({ length: num }).map((_, i) => (
          <Decoder key={i} defaultValue={defaultValues[i]} />
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
              (i) => i.value
            );
            console.log(values);
            const sp = new URLSearchParams();
            values.forEach((v, i) => {
              sp.set(i.toString(), v);
            });

            const url = '?' + sp.toString();
            setLink(url);

            window.history.pushState({}, document.title, url);
          }}
        >
          create shareable link
        </button>{' '}
        {link && <a href={link}>shareable link</a>}
      </p>
    </>
  );
}

const rootDiv = document.getElementById('root') as HTMLElement;
const root = ReactDOM.createRoot(rootDiv);
root.render(<App />);
