/** AIの結果のMarkdownの記号（見出し・太字・箇条書き）を、画面でそのまま読める形に整える。 */
export const sanitizeMarkdown = (text: string): string =>
  text
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*・]\s?/gm, "・")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .trim();
