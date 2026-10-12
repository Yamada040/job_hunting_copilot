// カバーフローの並べ方。正面のカードはまっすぐ向き、左右のカードは傾いて奥へ下がりながら横に並ぶ
// （https://motion-reference.takayustudio.jp/#motion=3d-coverflow）

// 正面のカードの中心から、隣のカードの中心までの距離（px）
const SIDE_GAP = 230;
// 2枚目より外側のカードどうしの間隔（px）。正面の隣より詰めて、奥へ重なって見せる
const STACK_GAP = 120;
// 隣のカードを奥へ下げる量と、さらに外側のカードを1枚ごとに下げる量（px）
const SIDE_DEPTH = 220;
const STACK_DEPTH = 80;
// 左右のカードの傾き（度）
const SIDE_ANGLE = 50;
// 左右に見せるカードの枚数。これより外側は消す
export const VISIBLE_SIDE_CARDS = 3;

export type CardLayout = {
  transform: string;
  /** 見せる枚数の外側へ出ていくカードを消すための不透明度。見せている間は1（半透明にすると奥のカードの文字が透けて重なるため） */
  opacity: number;
  /** 奥のカードほど薄く見せるために、カードの上に重ねる背景色の濃さ（0〜1） */
  fog: number;
  blurred: boolean;
  /** 正面に近いカードほど上に重ねる */
  zIndex: number;
};

/** 正面から少しずつずれたカードの並べ方。offset は正面から何枚ずれているか（左が負）。ドラッグ中は小数になる。 */
export function coverflowLayout(offset: number): CardLayout {
  const side = Math.sign(offset);
  const distance = Math.abs(offset);
  const near = Math.min(distance, 1);
  const beyond = Math.max(distance - 1, 0);
  const x = side * (near * SIDE_GAP + beyond * STACK_GAP);
  const z = -(near * SIDE_DEPTH + beyond * STACK_DEPTH);
  const angle = -side * near * SIDE_ANGLE;
  return {
    transform: `translateX(${x}px) translateZ(${z}px) rotateY(${angle}deg)`,
    // 見せる枚数の外側は、次の1枚分のあいだに消す
    opacity: Math.max(0, Math.min(1, VISIBLE_SIDE_CARDS + 1 - distance)),
    fog: Math.min(distance, VISIBLE_SIDE_CARDS) * 0.2,
    blurred: distance > 1.5,
    zIndex: 100 - Math.round(distance * 10),
  };
}

/** index のカードが、正面（facing）から何枚ずれているか。端から端へ回り込むので、近い向きの値を返す。 */
export function offsetFrom(index: number, facing: number, count: number): number {
  let offset = (((index - facing) % count) + count) % count;
  if (offset > count / 2) offset -= count;
  return offset;
}
