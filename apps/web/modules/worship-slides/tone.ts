const MARKS: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'], e: ['ē', 'é', 'ě', 'è'], i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'], u: ['ū', 'ú', 'ǔ', 'ù'], ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
}

/** "zhao2" → "zháo", "lv4" → "lǜ". Anything already marked, or without a tone digit, comes back as typed. */
export function withToneMark(input: string): string {
  const m = input.trim().toLowerCase().replace(/v/g, 'ü').match(/^([a-zü]+)([0-5])$/)
  if (!m) return input.trim()
  const [, syl, d] = m as unknown as [string, string, string]
  const tone = Number(d)
  if (tone === 0 || tone === 5) return syl
  // a or e takes the mark; in "ou" the o does; otherwise the last vowel
  const at = /[ae]/.test(syl) ? syl.search(/[ae]/) : syl.includes('ou') ? syl.indexOf('o') : Math.max(...[...'iouü'].map((v) => syl.lastIndexOf(v)))
  if (at < 0) return syl
  return syl.slice(0, at) + MARKS[syl[at]!]![tone - 1] + syl.slice(at + 1)
}

/** The character a spot override (`line|index`, see spotKey) is for; null for a whole-song character key. */
export function spotChar(key: string): string | null {
  const bar = key.lastIndexOf('|')
  if (bar < 0) return null
  return [...key.slice(0, bar)][Number(key.slice(bar + 1))] ?? null
}
