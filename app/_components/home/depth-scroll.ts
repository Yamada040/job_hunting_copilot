// スクロールで奥からセクションが迫る見せ方（Z軸スクロール）の位置の計算。迫りながら、箱が縦に転がるように
// 次のセクションは下から起き上がり、読み終えたセクションは上へ倒れていく
// （https://motion-reference.takayustudio.jp/#motion=scroll-depth-zoom と #motion=fold-in）

// 1画面分のスクロールのうち、前後の端でセクションを止めておく割合。読んでいる間に動き続けないようにする
const HOLD = 0.2;
// まだ来ていないセクションを、1つごとに奥へ下げる距離（px）
const DEPTH_GAP = 1400;
// 通り過ぎたセクションが、消えるまでに手前へ迫る距離（px）
const PASS_DEPTH = 500;
const PERSPECTIVE = 1200;
// 1セクション分の転がりで傾ける角度（度）と、上下にずらす距離（px）
const ROLL_ANGLE = 70;
const ROLL_SHIFT = 320;
// 奥のセクションを、1つ分あたりぼかす量（px）
const BLUR_PER_SCENE = 6;

/** スクロール量（1画面を1とする）から、いま何番目のセクションを見ているかを返す。端の前後では止め、その間をなめらかに進める。 */
export function scenePosition(screens: number): number {
  const index = Math.floor(screens);
  const fraction = screens - index;
  const moving = Math.min(1, Math.max(0, (fraction - HOLD) / (1 - HOLD * 2)));
  const eased = moving * moving * (3 - 2 * moving);
  return index + eased;
}

export type SceneStyle = {
  transform: string;
  opacity: number;
  filter: string;
  /** 見えないセクションと、通り過ぎかけのセクションは押せないようにする */
  interactive: boolean;
};

/** 見ている位置から何セクション奥にあるか（offset）に応じた見せ方。通り過ぎたセクションは負になる。 */
export function sceneStyle(offset: number): SceneStyle {
  if (offset < 0) {
    return {
      transform: sceneTransform(offset * ROLL_SHIFT, -offset * PASS_DEPTH, offset * ROLL_ANGLE),
      // 手前へ迫りながら、半分ほど進んだところで消し切る
      opacity: clamp(1 + offset * 2),
      filter: "none",
      interactive: offset > -0.5,
    };
  }
  return {
    transform: sceneTransform(offset * ROLL_SHIFT, -offset * DEPTH_GAP, offset * ROLL_ANGLE),
    opacity: clamp(1 - offset),
    filter: offset === 0 ? "none" : `blur(${round(offset * BLUR_PER_SCENE)}px)`,
    interactive: offset < 0.5,
  };
}

// 回転（rotateX）は正の角度で上の辺が奥へ倒れる。下から来るセクションは上の辺を奥へ倒した状態から起き上がり、
// 上へ抜けるセクションは上の辺を手前へ倒していく
function sceneTransform(y: number, z: number, angle: number): string {
  return `perspective(${PERSPECTIVE}px) translate3d(0px, ${round(y)}px, ${round(z)}px) rotateX(${round(angle)}deg)`;
}

function clamp(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
