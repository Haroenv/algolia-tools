const listFormat = (list: string[]) => {
  if ('ListFormat' in Intl) {
    return new Intl.ListFormat('en-GB', {
      style: 'long',
      type: 'disjunction',
    }).format(list);
  }
  return list.join(', ');
};

const isFakeArray = (val: string) => val.startsWith('[') && val.endsWith(']');

const isFakeNumber = (val: string) =>
  typeof val === 'string' && val.length > 0 && !Number.isNaN(Number(val));

function safeParse(value: string) {
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
}

/**
 * make escaped JSON into non-escaped JSON
 * @param {string} data escaped JSON: "{\"key\": \"val\"}" or {\"\key": \"val\"}
 * @returns {string} unescaped data: {"key": "val"}
 */
function removeEscapes(data: string): string {
  let decoded = data;
  if (decoded[0] === '"') {
    decoded = data.substr(1, data.length - 2);
  }
  if (decoded[1] === '\\') {
    decoded = decoded.replace(/\\"/g, '"');
  }
  return decoded;
}

function removeCurl(data = '') {
  let stripped = data;
  if (data.startsWith('curl')) {
    stripped = stripped.replace(/\s+\\\s+--compressed/gm, '');

    const options = [' --data-raw ', ' --data ', ' -d ', ' --data-binary '];

    const possibleData = options
      .map((option) => [stripped.indexOf(option), option.length])
      .find(([index]) => index !== -1);

    if (!possibleData) {
      throw new Error(
        `curl detected, but no ${listFormat(
          options.map((element) => `"${element.trim()}"`)
        )} option found`
      );
    }

    const [start, offset] = possibleData;

    return stripped.slice(start + offset);
  }

  return stripped;
}

function removeWrappingQuotes(data = '') {
  if (
    (data.startsWith("'") && data.endsWith("'")) ||
    (data.startsWith('"') && data.endsWith('"'))
  ) {
    return data.slice(1, data.length - 1);
  }
  return data;
}

function getCredentials(
  searchParams: URLSearchParams,
  headers: Record<string, string>
) {
  const rawAgent =
    searchParams.get('x-algolia-agent') || headers['x-algolia-agent'];
  return {
    appId:
      searchParams.get('x-algolia-application-id') ||
      headers['x-algolia-application-id'] ||
      undefined,
    apiKey:
      searchParams.get('x-algolia-api-key') ||
      headers['x-algolia-api-key'] ||
      undefined,
    algoliaAgent: rawAgent ? rawAgent.split(';').map((s) => s.trim()) : [],
  };
}

function getURL(data: string): URL {
  const match = data.match(/curl ['"](?<url>[^ '"]*)['"]? /);

  if (!match) {
    return new URL('https://example.org');
  }

  const { url } = match.groups as { url: string };
  return new URL(url, 'https://example.org');
}

function getHeaders(data: string) {
  const headers: Record<string, string> = {};

  const matches = data.match(/-H ['"](?<header>[^'"]*)['"]/g);

  if (matches) {
    matches.forEach((match) => {
      const { header } = match.match(/-H ['"](?<header>[^'"]*)['"]/)
        ?.groups || {
        header: '',
      };

      const [key, value] = header.split(/:\s*/);

      headers[key] = value;
    });
  }

  return headers;
}

export function decode(data: string) {
  const cleanedJSON = removeWrappingQuotes(removeCurl(removeEscapes(data)));

  const json: { requests: Array<Record<string, any>> } = JSON.parse(
    cleanedJSON,
    (key, val) => {
      if (key === 'params') {
        return Object.fromEntries(
          [...new URLSearchParams(decodeURIComponent(val))].map(([k, v]) => {
            if (isFakeArray(v)) {
              return [k, safeParse(v)];
            }
            if (isFakeNumber(v)) {
              return [k, parseFloat(v)];
            }
            return [k, v];
          })
        );
      }
      return val;
    }
  );

  const { appId, apiKey, algoliaAgent } = getCredentials(
    getURL(data).searchParams,
    getHeaders(data)
  );

  return { json, appId, apiKey, algoliaAgent };
}
