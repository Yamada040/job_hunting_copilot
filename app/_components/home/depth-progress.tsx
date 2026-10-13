"use client";

import { cn } from "@/lib/utils";
import { HOME_SECTIONS, scrollToSection } from "./sections";
import { useCurrentSection } from "./use-current-section";

/**
 * depth の画面の左に縦に並べる、いま何番目のセクションを見ているかの印。押すとそのセクションまで進む。
 * カードと重ならない余白がある、横幅の広い画面（xl）でだけ出す。
 */
export function DepthProgress() {
  const current = useCurrentSection();

  return (
    <nav aria-label="セクションの位置" className="fixed top-1/2 left-8 z-20 hidden -translate-y-1/2 depth:xl:block">
      <ol className="relative flex flex-col gap-6">
        <span aria-hidden className="absolute inset-y-1 left-[7px] w-px bg-border" />
        {HOME_SECTIONS.map((section, i) => (
          <li key={section.id}>
            <button
              type="button"
              aria-label={section.label}
              aria-current={i === current ? "location" : undefined}
              onClick={() => scrollToSection(section.id)}
              className="group relative flex items-center gap-3"
            >
              <span
                className={cn(
                  "h-[15px] w-[15px] rounded-full border-2 border-border bg-card transition-all duration-300",
                  i === current && "scale-125 border-foreground bg-foreground",
                )}
              />
              <span
                className={cn(
                  "text-xs font-bold whitespace-nowrap text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100",
                  i === current && "text-foreground",
                )}
              >
                {section.label}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
