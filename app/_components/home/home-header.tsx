"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { BrandLogo } from "../layout/BrandLogo";
import { HOME_SECTIONS, scrollToSection } from "./sections";
import { useCurrentSection } from "./use-current-section";

// ヘッダーに並べるセクション。トップはロゴ、最後の「はじめる」はログインのボタンが兼ねる
const NAV_SECTIONS = HOME_SECTIONS.filter((section) => section.id !== "top" && section.id !== "start");

/** ホームのヘッダー。ロゴでトップへ戻り、各セクションへ移れる。狭い画面ではセクションのリンクを出さない。 */
export function HomeHeader() {
  const current = HOME_SECTIONS[useCurrentSection()]?.id;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex items-center justify-between gap-4 rounded-full border bg-card/80 py-3 pr-3 pl-7 shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--color-primary)_35%,transparent)] backdrop-blur"
    >
      <a
        href="#top"
        aria-label="トップへ戻る"
        onClick={(e) => {
          e.preventDefault();
          scrollToSection("top");
        }}
      >
        <BrandLogo logoClassName="h-12" />
      </a>
      <nav aria-label="セクション" className="hidden md:block">
        <ul className="flex items-center gap-1">
          {NAV_SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(section.id);
                }}
                className={cn(
                  "rounded-full px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:px-5 lg:text-base",
                  // 今いるセクションは depth の画面でだけ分かる（縦に並べる画面ではスクロール量から決められない）
                  section.id === current && "depth:bg-secondary depth:text-foreground",
                )}
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <Button asChild variant="default" size="lg" className="h-11 rounded-full px-6 text-base">
        <Link href={ROUTES.LOGIN}>ログイン</Link>
      </Button>
    </motion.header>
  );
}
