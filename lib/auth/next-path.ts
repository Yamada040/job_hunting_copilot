// origin を比べるためだけの仮の origin。実際のホスト名に依存させない
const PLACEHOLDER_ORIGIN = "https://placeholder.invalid";

// URL の仕様では、ブラウザが \ を / と読み替え、タブや改行を取り除く。
// "//" だけを弾いても "/\evil.com" や "/\t/evil.com" は外部の "//evil.com" になるため、それらを含む値は通さない
const UNSAFE_CHARACTERS = /[\\\u0000-\u001f\u007f]/;

/**
 * ログインの後に戻る先（?next=）として、このサイトの中のパスだけを返す。外部へ飛ぶ値なら undefined。
 */
export function safeNextPath(next: string | null | undefined): string | undefined {
  if (!next?.startsWith("/") || UNSAFE_CHARACTERS.test(next)) return undefined;
  try {
    if (new URL(next, PLACEHOLDER_ORIGIN).origin !== PLACEHOLDER_ORIGIN) return undefined;
  } catch {
    return undefined;
  }
  return next;
}
