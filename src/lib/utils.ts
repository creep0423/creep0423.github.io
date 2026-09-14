/** Average Latin reading speed, in words per minute. */
const WORDS_PER_MINUTE = 200;
/** Average CJK reading speed, in characters per minute. */
const CJK_PER_MINUTE = 350;

const CJK_PATTERN = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/g;
const FENCED_CODE_PATTERN = /```[\s\S]*?```/g;
const INLINE_CODE_PATTERN = /`[^`\n]*`/g;

/**
 * Estimates reading time in whole minutes.
 *
 * CJK characters and Latin words are counted separately because their reading
 * speeds differ by roughly an order of magnitude. Code blocks are ignored so
 * that a long snippet does not inflate the estimate.
 */
export function getReadingTimeMinutes(markdown: string | undefined): number {
  const text = (markdown ?? '')
    .replace(FENCED_CODE_PATTERN, ' ')
    .replace(INLINE_CODE_PATTERN, ' ')
    .replace(/https?:\/\/\S+/g, ' ');

  const cjkCharacters = text.match(CJK_PATTERN)?.length ?? 0;
  const latinWords = text.replace(CJK_PATTERN, ' ').split(/\s+/).filter(Boolean).length;
  const minutes = cjkCharacters / CJK_PER_MINUTE + latinWords / WORDS_PER_MINUTE;

  return Math.max(1, Math.round(minutes));
}

/**
 * Formats a date in the given locale.
 *
 * `timeZone: 'UTC'` keeps the rendered day stable: frontmatter dates such as
 * `2025-01-15` are parsed as UTC midnight and would otherwise shift backwards
 * for readers west of UTC.
 */
export function formatDate(date: Date, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** Machine-readable date for `<time datetime>` and structured metadata. */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
