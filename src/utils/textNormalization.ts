const CHAR_EQUIVALENTS: Record<string, string> = {
  '\u2018': "'",
  '\u2019': "'",
  '\u201B': "'",
  '\u2032': "'",
  '\u0060': "'",
  '\u00B4': "'",
  '\u201C': '"',
  '\u201D': '"',
  '\u201F': '"',
  '\u2033': '"',
  '\uFF02': '"',
  '\uFF07': "'",
};

export function normalizeTypingChar(char: string): string {
  return CHAR_EQUIVALENTS[char] ?? char;
}

export function normalizeTypingText(text: string): string {
  return Array.from(text, normalizeTypingChar).join('');
}

export function isTypingCharMatch(inputChar: string, targetChar: string): boolean {
  return normalizeTypingChar(inputChar).toLowerCase() === normalizeTypingChar(targetChar).toLowerCase();
}
