export const explain = (character: string) =>
  [...character]
    .map((s) =>
      Array.from({ length: s.length }, (_, i) => ({
        byte: `U+${s
          .charCodeAt(i)
          .toString(16)
          .toUpperCase()
          .padStart(4, '0')}`,
        binary: s
          .charCodeAt(i)
          .toString(2)
          .match(/.{1,8}/g)!
          .map((s) => s.padStart(8, '0')),
        decimal: s.charCodeAt(i),
        char: String.fromCharCode(s.charCodeAt(i)),
      }))
    )
    .flat();
