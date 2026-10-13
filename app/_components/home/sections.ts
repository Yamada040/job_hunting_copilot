/** ホームのセクションの並び。ページ内リンクの飛び先（id）と、ヘッダー・左の印に出す名前。 */
export const HOME_SECTIONS = [
  { id: "top", label: "Top" },
  { id: "about", label: "About" },
  { id: "why", label: "Why" },
  { id: "features", label: "Features" },
  { id: "steps", label: "How it works" },
  { id: "start", label: "Get started" },
] as const;

export type HomeSectionId = (typeof HOME_SECTIONS)[number]["id"];

/** セクションまでスクロールする。奥行きの見せ方では、途中のセクションが順に迫る様子を見せるため滑らかに動かす。 */
export function scrollToSection(id: HomeSectionId) {
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  // トップはヘッダーごと見せたいので、トップのセクションではなくページの先頭へ戻す
  if (id === "top") window.scrollTo({ top: 0, behavior });
  else document.getElementById(id)?.scrollIntoView({ behavior });
}
