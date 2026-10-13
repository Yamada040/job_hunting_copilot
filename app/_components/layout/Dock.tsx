"use client";

import { useRef, type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AcademicCapIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ChartBarSquareIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  HomeIcon,
  LightBulbIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "framer-motion";

import { useMe } from "@/lib/api/me";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { QuickAdd } from "../quick-add/quick-add";

type DockItem = {
  /** 読み上げとツールチップに使う正式な名前 */
  label: string;
  /** アイコンの下に出す短い名前 */
  shortLabel: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const items: DockItem[] = [
  { label: "ダッシュボード", shortLabel: "ホーム", href: ROUTES.DASHBOARD, icon: HomeIcon },
  { label: "ES管理", shortLabel: "ES", href: ROUTES.ES, icon: DocumentTextIcon },
  { label: "企業管理", shortLabel: "企業", href: ROUTES.COMPANIES, icon: BuildingOfficeIcon },
  { label: "カレンダー", shortLabel: "予定", href: ROUTES.CALENDAR, icon: CalendarDaysIcon },
  { label: "面接ログ", shortLabel: "面接", href: ROUTES.INTERVIEWS, icon: ChatBubbleLeftRightIcon },
  { label: "Webテスト対策", shortLabel: "Webテスト", href: ROUTES.WEBTESTS, icon: AcademicCapIcon },
  { label: "自己分析", shortLabel: "自己分析", href: ROUTES.SELF_ANALYSIS, icon: ClipboardDocumentCheckIcon },
  { label: "適性チェック", shortLabel: "適性", href: ROUTES.APTITUDE, icon: LightBulbIcon },
  { label: "プロフィール", shortLabel: "プロフィール", href: ROUTES.PROFILE, icon: UserIcon },
  { label: "お問い合わせ", shortLabel: "問い合わせ", href: ROUTES.CONTACT, icon: EnvelopeIcon },
];

const developerItem: DockItem = {
  label: "開発者ダッシュボード",
  shortLabel: "開発者",
  href: ROUTES.DEVELOPER,
  icon: ChartBarSquareIcon,
};

// 「＋」の左に並べるアイコンの数。ホーム・ES・企業・予定・面接の5つ（右も、開発者以外は5つ）
const LEFT_COUNT = 5;

// マウスからこの距離（px）以内のアイコンを大きくする
const MAGNIFY_RANGE = 120;

/**
 * 画面下のアイコンの帯。ゲームのメニューのように、どの画面からも1回で移れる。マウスを近づけたアイコンが手前に大きくせり出し
 * （https://motion-reference.takayustudio.jp/#motion=catalog-ui-spatial-perspective-dock）、今いる画面の印は移った先のアイコンへ滑って移る
 * （https://motion-reference.takayustudio.jp/#motion=catalog-ui-control-pill-indicator）。
 * 印を滑らせるため、各画面ではなくルートのレイアウトに置き、画面を移っても作り直さない。
 */
export function Dock() {
  const pathname = usePathname();
  // ログインとホームはログイン前の画面なので出さない
  if (pathname === ROUTES.HOME || pathname === ROUTES.LOGIN) return null;
  return <DockBar pathname={pathname} />;
}

function DockBar({ pathname }: { pathname: string }) {
  const { data: me } = useMe();
  const mouseX = useMotionValue(Infinity);
  const visibleItems = me?.isDeveloper ? [...items, developerItem] : items;

  return (
    <nav
      aria-label="メインメニュー"
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]"
    >
      <div
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="grid grid-cols-[1fr_auto_1fr] items-end gap-1 rounded-3xl border bg-card/90 px-3 pt-2 pb-1.5 shadow-window backdrop-blur"
      >
        {/* 「＋」が真ん中に来るよう、左右のアイコンを同じ幅の列（1fr）に入れる。アイコンの数が左右で違っても真ん中にそろう */}
        <div className="flex justify-end gap-1">
          {visibleItems.slice(0, LEFT_COUNT).map((item) => (
            <DockLink key={item.href} item={item} mouseX={mouseX} pathname={pathname} />
          ))}
        </div>
        <QuickAdd />
        <div className="flex justify-start gap-1">
          {visibleItems.slice(LEFT_COUNT).map((item) => (
            <DockLink key={item.href} item={item} mouseX={mouseX} pathname={pathname} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function DockLink({ item, mouseX, pathname }: { item: DockItem; mouseX: MotionValue<number>; pathname: string }) {
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <Link href={item.href} aria-label={item.label} aria-current={active ? "page" : undefined} className="group">
      <DockIcon icon={item.icon} shortLabel={item.shortLabel} mouseX={mouseX} active={active} />
    </Link>
  );
}

type DockIconProps = Pick<DockItem, "icon" | "shortLabel"> & { mouseX: MotionValue<number>; active: boolean };

function DockIcon({ icon: Icon, shortLabel, mouseX, active }: DockIconProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();
  const distance = useTransform(mouseX, (x) => {
    const rect = ref.current?.getBoundingClientRect();
    return rect ? x - (rect.left + rect.width / 2) : Infinity;
  });
  const size = useSpring(useTransform(distance, [-MAGNIFY_RANGE, 0, MAGNIFY_RANGE], [44, 64, 44]), {
    stiffness: 300,
    damping: 22,
  });
  const lift = useSpring(useTransform(distance, [-MAGNIFY_RANGE, 0, MAGNIFY_RANGE], [0, -10, 0]), {
    stiffness: 300,
    damping: 22,
  });
  return (
    <span className="flex w-16 flex-col items-center gap-0.5">
      <motion.span
        ref={ref}
        style={reduceMotion ? { width: 44, height: 44 } : { width: size, height: size, y: lift }}
        className={cn(
          "relative grid place-items-center rounded-2xl text-muted-foreground transition-colors group-hover:text-primary",
          active && "text-primary",
        )}
      >
        {active && (
          <motion.span
            layoutId="dock-active"
            className="absolute inset-0 rounded-2xl bg-accent"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <Icon className="relative h-1/2 w-1/2" aria-hidden />
      </motion.span>
      <span
        className={cn(
          "text-[10px] font-bold whitespace-nowrap text-muted-foreground group-hover:text-primary",
          active && "text-primary",
        )}
      >
        {shortLabel}
      </span>
    </span>
  );
}
