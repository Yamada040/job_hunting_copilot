// 背景でまたたく光の粒の位置（%）と、またたき始めるまでの時間（秒）。描画のたびに変わらないよう固定する
const SPARKLES = [
  [8, 18, 0],
  [18, 62, 1.2],
  [27, 30, 0.4],
  [36, 78, 2.1],
  [44, 12, 1.6],
  [52, 52, 0.8],
  [61, 24, 2.6],
  [69, 70, 0.2],
  [77, 38, 1.9],
  [85, 16, 1.1],
  [92, 58, 2.3],
  [14, 86, 0.6],
  [58, 88, 1.4],
  [88, 84, 0.9],
] as const;

/** カルーセルの背景。正面のカードの後ろのスポットライト、またたく光の粒、カードが乗る床の光。 */
export function MenuBackdrop() {
  return (
    <>
      <div className="pointer-events-none absolute -top-4 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-radial from-ring/30 to-transparent to-70%" />
      {SPARKLES.map(([x, y, delay]) => (
        <span
          key={`${x}-${y}`}
          className="pointer-events-none absolute h-1 w-1 rounded-full bg-ring/70 motion-safe:animate-pulse"
          style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s`, animationDuration: "2.8s" }}
        />
      ))}
      <div className="pointer-events-none absolute bottom-4 left-1/2 h-20 w-[min(680px,92%)] -translate-x-1/2 rounded-[50%] bg-radial from-ring/35 to-transparent to-70%" />
    </>
  );
}
