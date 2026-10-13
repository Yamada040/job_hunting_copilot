import type { ComponentType, SVGProps } from "react";

import { TiltLayer } from "../tilt-card";

/** カードの左上の、大きな番号（01）と小さな英字のラベル。 */
export function CardNumber({ number, label }: { number: number; label: string }) {
  return (
    <TiltLayer depth={30} className="flex items-baseline gap-4">
      <span className="text-4xl leading-none font-black tracking-tighter text-foreground tabular-nums">
        {String(number).padStart(2, "0")}
      </span>
      <span className="text-[0.65rem] font-bold tracking-[0.25em] text-muted-foreground">{label}</span>
    </TiltLayer>
  );
}

/** カードの面から大きく浮かせ、ゆっくり上下させるアイコン。立体の小物のように見せる。 */
export function FloatingIcon({ icon: Icon }: { icon: ComponentType<SVGProps<SVGSVGElement>> }) {
  return (
    <TiltLayer depth={50}>
      <span className="inline-grid h-16 w-16 place-items-center rounded-2xl bg-linear-to-br from-ring to-primary text-primary-foreground shadow-[0_18px_30px_-10px_color-mix(in_oklab,var(--color-primary)_60%,transparent)] motion-safe:animate-float">
        <Icon className="h-8 w-8" aria-hidden />
      </span>
    </TiltLayer>
  );
}
