// Preset deflate dictionary for share links. Seeds the compressor with strings
// that recur across Algolia requests, whatever format they are shared in
// (curl from Chrome/Safari/Firefox, fetch snippets, bare bodies, URLs).
//
// What goes in, and why it is not tuned to any particular request:
//  - Browser/curl boilerplate (headers, user agents, curl flags): identical in
//    every "copy as cURL", independent of the search being shared.
//  - Hosts, endpoints and Algolia client agent strings.
//  - Search parameter NAMES, generated from the types in @algolia/client-search
//    (SearchParamsQuery, BaseSearchParamsWithoutQuery,
//    IndexSettingsAsSearchParams). Values are deliberately left out: they
//    depend on the shared search state and do not repeat. Parameters that
//    InstantSearch widgets send routinely come last (cheapest to reference).
//  - Recommend/Composition request keys and model names.
// Segments were kept only if removing them made links longer (ablation).
//
// !! FROZEN once released: links already shared are decoded with it, so never
// edit V1 after it has shipped. To change it, add DICTIONARY_V2 and a `d2`
// param in share.ts (see DICTIONARIES below).
//
// Deflate matches nearby text more cheaply, so the most valuable segments
// (browser headers, user agents, agent strings, curl flags) go last.
export const DICTIONARY_V1 = new TextEncoder().encode(
  [
    // hosts & endpoints
    `https://-dsn.algolia.net https://.algolia.net https://.algolianet.com https://latency-dsn.algolia.net https://dashboard.algolia.com http://localhost:3000 http://localhost:8000 http://localhost:8080 /1/indexes/*/queries /1/indexes/*/objects /1/indexes/*/query /1/indexes/*/facets/ /1/indexes/ /1/compositions/ /simulate /run /1/answers/ /1/dictionaries/ /1/rules/ /1/synonyms/ /1/recommendations /1/indexes/*/recommendations`,
    // Chrome DevTools "Copy as fetch" shape
    `fetch("https://", {
  "headers": {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/x-www-form-urlencoded",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\\"macOS\\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site"
  },
  "referrer": "https://",
  "body": "{\\"requests\\":[{\\"indexName\\":\\"\\",\\"params\\":\\"\\"}]}",
  "method": "POST",
  "mode": "cors",
  "credentials": "omit"
});`,
    // Recommend / Composition API vocabulary
    `"model":"trending-items" "related-products" "bought-together" "looking-similar" "trending-facets" "threshold": "maxRecommendations": "queryParameters": "fallbackParameters": "facetName": "objectID": "composition": "compositionID": "mainInjectedItem": "injectedItems": "requests":[{"indexName": "strategy":"none"`,
    // search params from client-search types, JSON form (rarely used first)
    `{"requests":[{"indexName":"","params":"","similarQuery":,"sumOrFiltersScores":,"restrictSearchableAttributes":,"facetingAfterDistinct":,"offset":,"length":,"aroundLatLngViaIP":,"aroundRadius":,"aroundPrecision":,"minimumAroundRadius":,"insidePolygon":,"naturalLanguages":,"personalizationImpact":,"synonyms":,"percentileComputation":,"enableABTest":,"ranking":,"relevancyStrictness":,"snippetEllipsisText":,"restrictHighlightAndSnippetArrays":,"minWordSizefor1Typo":,"minWordSizefor2Typos":,"typoTolerance":,"allowTyposOnNumericTokens":,"disableTypoToleranceOnAttributes":,"ignorePlurals":,"removeStopWords":,"queryLanguages":,"decompoundQuery":,"queryType":,"removeWordsIfNoResults":,"mode":,"semanticSearch":,"advancedSyntax":,"optionalWords":,"disableExactOnAttributes":,"exactOnSingleWordQuery":,"alternativesAsExact":,"advancedSyntaxFeatures":,"replaceSynonymsInHighlight":,"minProximity":,"sortFacetValuesBy":,"attributeCriteriaComputedByMinProximity":,"renderingContent":,"enableReRanking":,"reRankingApplyFilter":}]}`,
    // search params from client-search types, URL-encoded form (rarely used first)
    `similarQuery=&sumOrFiltersScores=&restrictSearchableAttributes=&facetingAfterDistinct=&offset=&length=&aroundLatLngViaIP=&aroundRadius=&aroundPrecision=&minimumAroundRadius=&insidePolygon=&naturalLanguages=&personalizationImpact=&synonyms=&percentileComputation=&enableABTest=&ranking=&relevancyStrictness=&snippetEllipsisText=&restrictHighlightAndSnippetArrays=&minWordSizefor1Typo=&minWordSizefor2Typos=&typoTolerance=&allowTyposOnNumericTokens=&disableTypoToleranceOnAttributes=&ignorePlurals=&removeStopWords=&queryLanguages=&decompoundQuery=&queryType=&removeWordsIfNoResults=&mode=&semanticSearch=&advancedSyntax=&optionalWords=&disableExactOnAttributes=&exactOnSingleWordQuery=&alternativesAsExact=&advancedSyntaxFeatures=&replaceSynonymsInHighlight=&minProximity=&sortFacetValuesBy=&attributeCriteriaComputedByMinProximity=&renderingContent=&enableReRanking=&reRankingApplyFilter=`,
    // params InstantSearch widgets send routinely, JSON form
    `"query":,"page":,"hitsPerPage":,"facets":,"maxValuesPerFacet":,"highlightPreTag":,"highlightPostTag":,"tagFilters":,"analytics":,"clickAnalytics":,"attributesToRetrieve":,"attributesToHighlight":,"attributesToSnippet":,"userToken":,"facetFilters":,"filters":,"numericFilters":,"ruleContexts":,"getRankingInfo":,"responseFields":,"enablePersonalization":,"enableRules":,"analyticsTags":,"optionalFilters":,"aroundLatLng":,"insideBoundingBox":,"distinct":"highlightPreTag":"__ais-highlight__","highlightPostTag":"__/ais-highlight__","facets":["*"],"attributesToRetrieve":["*"],"analytics":false,"clickAnalytics":true`,
    // params InstantSearch widgets send routinely, URL-encoded form
    `query=&page=&hitsPerPage=&facets=&maxValuesPerFacet=&highlightPreTag=&highlightPostTag=&tagFilters=&analytics=&clickAnalytics=&attributesToRetrieve=&attributesToHighlight=&attributesToSnippet=&userToken=&facetFilters=&filters=&numericFilters=&ruleContexts=&getRankingInfo=&responseFields=&enablePersonalization=&enableRules=&analyticsTags=&optionalFilters=&aroundLatLng=&insideBoundingBox=&distinct=&highlightPreTag=%3Cais-highlight-0000000000%3E&highlightPostTag=%3C%2Fais-highlight-0000000000%3E&facets=%5B%22*%22%5D&facetFilters=%5B%5B%22%22%5D%5D&attributesToRetrieve=%5B%22*%22%5D&analyticsTags=%5B%22%22%5D`,
    // user agents
    `-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0' -H 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36' -H 'user-agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' -H 'sec-ch-ua: "Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"' -H 'sec-ch-ua: "Not-A.Brand";v="99", "Google Chrome";v="142", "Chromium";v="142"' -H 'sec-ch-ua-platform: "Windows"' -H 'sec-ch-ua-platform: "Linux"'`,
    // algolia agent strings
    `x-algolia-agent=Algolia%20for%20JavaScript%20(5.13.0)%3B%20Search%20(5.13.0)%3B%20Lite%20(5.13.0)%3B%20Browser%3B%20Algolia%20Dashboard%3B%20instantsearch.js%20(4.75.7)%3B%20react%20(18.3.1)%3B%20react-instantsearch%20(7.13.10)%3B%20react-instantsearch-core%20(7.13.10)%3B%20vue-instantsearch%3B%20JS%20Helper%20(3.22.6)%3B%20Algolia%20for%20JavaScript%20(4.24.0)%3B%20Browser%20(lite)%3B%20Node.js Algolia for Python Algolia for PHP Algolia for Ruby Algolia for Java Algolia for Go`,
    // curl flags & auth headers
    `curl -X 'POST' -XPOST -X POST --compressed --url \\\n  -H 'x-algolia-api-key: ' -H 'x-algolia-application-id: ' -H 'X-Algolia-API-Key: ' -H 'X-Algolia-Application-Id: ' &x-algolia-api-key= &x-algolia-application-id= --data-raw $' --data-raw ' --data '`,
    // browser headers (last = closest = cheapest)
    `-H 'Content-Type: application/x-www-form-urlencoded' -H 'Content-Type: text/plain' -H 'Content-Type: application/json' -H 'content-type: text/plain' -H 'content-type: application/x-www-form-urlencoded' -H 'Accept: application/json' -H 'accept: application/json' -H 'Accept: */*' -H 'accept: */*' -H 'Accept-Language: en-GB,en;q=0.9' -H 'Accept-Language: en-GB,en-US;q=0.9,en;q=0.8' -H 'Accept-Language: en-US,en;q=0.5' -H 'Accept-Language: en-US,en;q=0.9' -H 'accept-language: en-US,en;q=0.9' -H 'Accept-Encoding: gzip, deflate, br' -H 'Accept-Encoding: gzip, deflate, br, zstd' -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' -H 'Connection: keep-alive' -H 'DNT: 1' -H 'Content-Length: ' -H 'Origin: https://' -H 'Referer: https://' -H 'origin: https://' -H 'referer: https://' -H 'Priority: u=3, i' -H 'Priority: u=4' -H 'priority: u=1, i' -H 'TE: trailers' -H 'Sec-Fetch-Dest: empty' -H 'Sec-Fetch-Mode: cors' -H 'Sec-Fetch-Site: cross-site' -H 'sec-fetch-dest: empty' -H 'sec-fetch-mode: cors' -H 'sec-fetch-site: cross-site' -H 'sec-fetch-site: same-site' -H 'sec-ch-ua-mobile: ?0' -H 'Sec-Fetch-Site: same-site'`,
  ].join(' ')
);

/**
 * Every dictionary ever released, keyed by the URL param that marks links made
 * with it. APPEND-ONLY: never edit or remove an entry, or links already shared
 * stop decoding (dictionary.test.ts enforces this).
 *
 * To improve the dictionary:
 *   1. Add `DICTIONARY_V2` (e.g. `concat(DICTIONARY_V1, extra)` so it only
 *      costs the delta in bundle size; new text at the end matches cheapest).
 *   2. Register it below under a new param, e.g. `d2: DICTIONARY_V2`.
 *   3. Point CURRENT_DICTIONARY_PARAM at it.
 *   4. Add its hash to dictionary.test.ts.
 */
export const DICTIONARIES: Record<string, Uint8Array> = {
  d: DICTIONARY_V1,
};

/** Param used for newly created links: always the newest entry above. */
export const CURRENT_DICTIONARY_PARAM = 'd';
