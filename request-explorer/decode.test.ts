import { expect, test } from 'bun:test';
import { decode } from './decode';
import { testData } from './testData';

test('test data', () => {
  expect(testData.length).toBe(3);
});

type TestCases = Array<{
  name: string;
  input: string;
  expected: ReturnType<typeof decode>;
}>;

const cases: TestCases = [
  {
    name: 'test data 1',
    input: testData[0],
    expected: {
      algoliaAgent: [],
      apiKey: undefined,
      appId: undefined,
      json: {
        requests: [
          {
            indexName: 'npm-search',
            params: {
              analyticsTags: ['yarnpkg.com'],
              attributesToHighlight: ['name', 'description', 'keywords'],
              attributesToRetrieve: [
                'deprecated',
                'description',
                'downloadsLast30Days',
                'repository',
                'homepage',
                'humanDownloadsLast30Days',
                'keywords',
                'license',
                'modified',
                'name',
                'owner',
                'version',
              ],
              facets: ['keywords', 'keywords', 'owner.name'],
              highlightPostTag: '</ais-highlight-0000000000>',
              highlightPreTag: '<ais-highlight-0000000000>',
              hitsPerPage: 5,
              maxValuesPerFacet: 10,
              page: 0,
              query: 'yarn',
              tagFilters: '',
            },
          },
        ],
      },
    },
  },
  {
    name: 'test data 2',
    input: testData[1],
    expected: {
      algoliaAgent: [
        'Algolia for JavaScript (4.0.0-beta.14)',
        'Browser (lite)',
        'JS Helper (3.1.0)',
        'react (16.8.4)',
        'react-instantsearch (6.2.0)',
      ],
      apiKey: 'f54e21fa3a2a0160595bb058179bfb1e',
      appId: 'OFCNCOG2CU',
      json: {
        requests: [
          {
            indexName: 'npm-search',
            params: {
              analyticsTags: ['yarnpkg.com'],
              attributesToHighlight: ['name', 'description', 'keywords'],
              attributesToRetrieve: [
                'deprecated',
                'description',
                'downloadsLast30Days',
                'homepage',
                'humanDownloadsLast30Days',
                'keywords',
                'license',
                'modified',
                'name',
                'owner',
                'repository',
                'types',
                'version',
              ],
              facets: ['keywords', 'keywords', 'owner.name'],
              highlightPostTag: '</ais-highlight-0000000000>',
              highlightPreTag: '<ais-highlight-0000000000>',
              hitsPerPage: 5,
              maxValuesPerFacet: 10,
              query: 'algoliasearch',
              tagFilters: '',
            },
          },
        ],
      },
    },
  },
  {
    name: 'test data 3',
    input: testData[2],
    expected: {
      algoliaAgent: [
        'Algolia for JavaScript (5.13.0)',
        'Search (5.13.0)',
        'Browser',
        'Algolia Dashboard',
        'instantsearch.js (4.75.7)',
        'react (18.3.1)',
        'react-instantsearch (7.13.10)',
        'react-instantsearch-core (7.13.10)',
        'JS Helper (3.22.6)',
      ],
      apiKey: 'f54e21fa3a2a0160595bb058179bfb1e',
      appId: 'OFCNCOG2CU',
      json: {
        requests: [
          {
            analytics: false,
            clickAnalytics: false,
            indexName: 'npm-search',
            query: '',
          },
          {
            analytics: false,
            clickAnalytics: false,
            filters: '',
            highlightPostTag: '__/ais-highlight__',
            highlightPreTag: '__ais-highlight__',
            indexName: 'npm-search',
            query: '',
          },
        ],
      },
    },
  },
  {
    name: 'composition api simulate',
    input: `curl 'https://9hilzg6ejk.algolia.net/1/compositions/comp1752587112840___products/simulate?x-algolia-agent=Algolia%20for%20JavaScript%20(1.16.0)%3B%20Composition%20(1.16.0)%3B%20Browser%3B%20Algolia%20Merchandising%20Studio%3B%20instantsearch.js%20(4.78.1)%3B%20react%20(18.3.1)%3B%20react-instantsearch%20(7.15.5)%3B%20react-instantsearch-core%20(7.15.5)%3B%20JS%20Helper%20(3.24.3)' \
-X 'POST' \
-H 'Content-Type: text/plain' \
-H 'Pragma: no-cache' \
-H 'Accept: application/json' \
-H 'Sec-Fetch-Site: cross-site' \
-H 'Accept-Language: en-GB,en;q=0.9' \
-H 'Cache-Control: no-cache' \
-H 'Sec-Fetch-Mode: cors' \
-H 'Origin: https://beta-dashboard.algolia.com' \
-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15' \
-H 'Content-Length: 299' \
-H 'Accept-Encoding: gzip, deflate, br' \
-H 'Connection: keep-alive' \
-H 'Sec-Fetch-Dest: empty' \
-H 'Priority: u=3, i' \
-H 'x-algolia-application-id: blablabla' \
-H 'x-algolia-api-key: blabla' \
--data-raw $'{"params":{"analytics":false,"attributesToRetrieve":["*"],"attributesToSnippet":["*:20"],"clickAnalytics":false,"enableABTest":false,"explain":true,"facets":["*"],"getRankingInfo":true,"hitsPerPage":50,"maxValuesPerFacet":100,"page":0,"query":" ","responseFields":["*"],"snippetEllipsisText":"\u2026"}}'`,
    expected: {
      algoliaAgent: [
        'Algolia for JavaScript (1.16.0)',
        'Composition (1.16.0)',
        'Browser',
        'Algolia Merchandising Studio',
        'instantsearch.js (4.78.1)',
        'react (18.3.1)',
        'react-instantsearch (7.15.5)',
        'react-instantsearch-core (7.15.5)',
        'JS Helper (3.24.3)',
      ],
      apiKey: 'blabla',
      appId: 'blablabla',
      json: {
        params: {
          analytics: false,
          attributesToRetrieve: ['*'],
          attributesToSnippet: ['*:20'],
          clickAnalytics: false,
          enableABTest: false,
          explain: true,
          facets: ['*'],
          getRankingInfo: true,
          hitsPerPage: 50,
          maxValuesPerFacet: 100,
          page: 0,
          query: ' ',
          responseFields: ['*'],
          snippetEllipsisText: '…',
        },
      },
    },
  },
];

test.each(cases)('decode $name request from curl ', ({ input, expected }) => {
  const decoded = decode(input);
  expect(decoded).toEqual(expected);
});
