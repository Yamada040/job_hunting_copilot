/** AIの結果のMarkdownの記号（見出し・太字・箇条書き）を、画面でそのまま読める形に整える。 */
export const sanitizeMarkdown = (text: string): string =>
  text
    .replace(/^#{1,6}\s*/gm, "")
    // 太字で始まる行の「*」を箇条書きと取り違えないよう、太字を先に外す
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^\s*[-*・]\s?/gm, "・")
    .trim();
