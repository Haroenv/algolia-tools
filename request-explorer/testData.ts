export const testData = [
  '{"requests":[{"indexName":"npm-search","params":"query=yarn&hitsPerPage=5&maxValuesPerFacet=10&page=0&analyticsTags=%5B%22yarnpkg.com%22%5D&attributesToRetrieve=%5B%22deprecated%22%2C%22description%22%2C%22downloadsLast30Days%22%2C%22repository%22%2C%22homepage%22%2C%22humanDownloadsLast30Days%22%2C%22keywords%22%2C%22license%22%2C%22modified%22%2C%22name%22%2C%22owner%22%2C%22version%22%5D&attributesToHighlight=%5B%22name%22%2C%22description%22%2C%22keywords%22%5D&highlightPreTag=%3Cais-highlight-0000000000%3E&highlightPostTag=%3C%2Fais-highlight-0000000000%3E&facets=%5B%22keywords%22%2C%22keywords%22%2C%22owner.name%22%5D&tagFilters="}]}',
  `curl 'https://ofcncog2cu-dsn.algolia.net/1/indexes/*/queries?x-algolia-agent=Algolia%20for%20JavaScript%20(4.0.0-beta.14)%3B%20Browser%20(lite)%3B%20JS%20Helper%20(3.1.0)%3B%20react%20(16.8.4)%3B%20react-instantsearch%20(6.2.0)&x-algolia-api-key=f54e21fa3a2a0160595bb058179bfb1e&x-algolia-application-id=OFCNCOG2CU' \
-XPOST \
-H 'Content-Type: application/x-www-form-urlencoded' \
-H 'Pragma: no-cache' \
-H 'Accept: */*' \
-H 'Accept-Language: en-us' \
-H 'Accept-Encoding: gzip, deflate, br' \
-H 'Cache-Control: no-cache' \
-H 'Host: ofcncog2cu-dsn.algolia.net' \
-H 'Origin: http://localhost:8000' \
-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Safari/605.1.15' \
-H 'Connection: keep-alive' \
-H 'Referer: http://localhost:8000/' \
-H 'Content-Length: 663' \
--data '{"requests":[{"indexName":"npm-search","params":"highlightPreTag=%3Cais-highlight-0000000000%3E&highlightPostTag=%3C%2Fais-highlight-0000000000%3E&hitsPerPage=5&analyticsTags=%5B%22yarnpkg.com%22%5D&attributesToRetrieve=%5B%22deprecated%22%2C%22description%22%2C%22downloadsLast30Days%22%2C%22homepage%22%2C%22humanDownloadsLast30Days%22%2C%22keywords%22%2C%22license%22%2C%22modified%22%2C%22name%22%2C%22owner%22%2C%22repository%22%2C%22types%22%2C%22version%22%5D&attributesToHighlight=%5B%22name%22%2C%22description%22%2C%22keywords%22%5D&query=algoliasearch&maxValuesPerFacet=10&facets=%5B%22keywords%22%2C%22keywords%22%2C%22owner.name%22%5D&tagFilters="}]}'`,
  `curl 'https://ofcncog2cu.algolia.net/1/indexes/*/queries?x-algolia-agent=Algolia%20for%20JavaScript%20(5.13.0)%3B%20Search%20(5.13.0)%3B%20Browser%3B%20Algolia%20Dashboard%3B%20instantsearch.js%20(4.75.7)%3B%20react%20(18.3.1)%3B%20react-instantsearch%20(7.13.10)%3B%20react-instantsearch-core%20(7.13.10)%3B%20JS%20Helper%20(3.22.6)' \
-H 'Accept-Language: en-GB,en-US;q=0.9,en;q=0.8' \
-H 'Connection: keep-alive' \
-H 'DNT: 1' \
-H 'Origin: http://localhost:8181' \
-H 'Referer: http://localhost:8181/' \
-H 'Sec-Fetch-Dest: empty' \
-H 'Sec-Fetch-Mode: cors' \
-H 'Sec-Fetch-Site: cross-site' \
-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' \
-H 'accept: application/json' \
-H 'content-type: text/plain' \
-H 'sec-ch-ua: "Chromium";v="131", "Not_A Brand";v="24"' \
-H 'sec-ch-ua-mobile: ?0' \
-H 'sec-ch-ua-platform: "macOS"' \
-H 'x-algolia-api-key: f54e21fa3a2a0160595bb058179bfb1e' \
-H 'x-algolia-application-id: OFCNCOG2CU' \
--data-raw '{"requests":[{"indexName":"npm-search","analytics":false,"clickAnalytics":false,"query":""},{"indexName":"npm-search","analytics":false,"clickAnalytics":false,"filters":"","highlightPostTag":"__/ais-highlight__","highlightPreTag":"__ais-highlight__","query":""}]}'`,
];
