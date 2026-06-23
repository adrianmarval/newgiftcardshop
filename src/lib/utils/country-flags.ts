const COUNTRY_FLAGS: Record<string, string> = {
  US: '\u{1F1FA}\u{1F1F8}',
  CA: '\u{1F1E8}\u{1F1E6}',
  GB: '\u{1F1EC}\u{1F1E7}',
  MX: '\u{1F1F2}\u{1F1FD}',
  DE: '\u{1F1E9}\u{1F1EA}',
  FR: '\u{1F1EB}\u{1F1F7}',
  ES: '\u{1F1EA}\u{1F1F8}',
  IT: '\u{1F1EE}\u{1F1F9}',
  BR: '\u{1F1E7}\u{1F1F7}',
  AR: '\u{1F1E6}\u{1F1F7}',
  JP: '\u{1F1EF}\u{1F1F5}',
  CN: '\u{1F1E8}\u{1F1F3}',
  KR: '\u{1F1F0}\u{1F1F7}',
  AU: '\u{1F1E6}\u{1F1FA}',
  IN: '\u{1F1EE}\u{1F1F3}',
  NL: '\u{1F1F3}\u{1F1F1}',
  SE: '\u{1F1F8}\u{1F1EA}',
  PT: '\u{1F1F5}\u{1F1F9}',
  CO: '\u{1F1E8}\u{1F1F4}',
  CL: '\u{1F1E8}\u{1F1F1}',
  PE: '\u{1F1F5}\u{1F1EA}',
};

export function getCountryFlag(code: string): string {
  return COUNTRY_FLAGS[code.toUpperCase()] ?? '';
}
