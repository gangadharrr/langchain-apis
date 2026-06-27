export function extractThinking(
  raw: string,
): { clean: string; thinking: string | undefined } {
  const startTag = '<mm:think>';
  const endTag = '</mm:think>';

  const startIdx = raw.indexOf(startTag);
  if (startIdx === -1) {
    return { clean: raw, thinking: undefined };
  }

  const endIdx = raw.indexOf(endTag, startIdx + startTag.length);
  if (endIdx === -1) {
    return { clean: raw, thinking: undefined };
  }

  const thinking = raw.slice(startIdx + startTag.length, endIdx);
  const clean = raw.slice(0, startIdx) + raw.slice(endIdx + endTag.length).replace(/^\n+/, '');

  return { clean, thinking };
}
