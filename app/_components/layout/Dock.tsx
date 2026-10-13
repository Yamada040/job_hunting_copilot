"use client";

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
import { useMotionValue, type MotionValue } from "framer-motion";

import { useMe } from "@/lib/api/me";
import { ROUTES } from "@/lib/constants/routes";
import { QuickAdd } from "../quick-add/quick-add";
import { DockIcon, isActive, type DockItem } from "./DockIcon";
import { MoreMenu } from "./DockMoreMenu";

// 毎日のように使う画面。「＋」の左に3つ、右に2つ並べ、右の端に「その他」を置く
const mainItems: DockItem[] = [
  { label: "ダッシュボード", shortLabel: "ホーム", href: ROUTES.DASHBOARD, icon: HomeIcon },
  { label: "ES管理", shortLabel: "ES", href: ROUTES.ES, icon: DocumentTextIcon },
  { label: "企業管理", shortLabel: "企業", href: ROUTES.COMPANIES, icon: BuildingOfficeIcon },
  { label: "カレンダー", shortLabel: "予定", href: ROUTES.CALENDAR, icon: CalendarDaysIcon },
  { label: "面接ログ", shortLabel: "面接", href: ROUTES.INTERVIEWS, icon: ChatBubbleLeftRightIcon },
];

// たまに使う画面。全部を並べるとスマホで横にスクロールが要るので、「その他」のメニューにまとめる
const moreItems: DockItem[] = [
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

// 「＋」の左に並べるアイコンの数（ホーム・ES・企業）
const LEFT_COUNT = 3;

/**
 * 画面下のアイコンの帯。よく使う画面へはどの画面からも1回で、ほかの画面へは「その他」から2回で移れる。マウスを近づけたアイコンが手前に大きくせり出し
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
  const visibleMoreItems = me?.isDeveloper ? [...moreItems, developerItem] : moreItems;

  return (
    <nav
      aria-label="メインメニュー"
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]"
    >
      <div
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="grid grid-cols-[1fr_auto_1fr] items-end gap-0.5 rounded-3xl border bg-card/90 px-2 pt-2 pb-1.5 sm:gap-1 sm:px-3 shadow-window backdrop-blur"
      >
        {/* 「＋」が真ん中に来るよう、左右のアイコンを同じ幅の列（1fr）に入れる。アイコンの数が左右で違っても真ん中にそろう */}
        <div className="flex justify-end gap-1">
          {mainItems.slice(0, LEFT_COUNT).map((item) => (
            <DockLink key={item.href} item={item} mouseX={mouseX} pathname={pathname} />
          ))}
        </div>
        <QuickAdd />
        <div className="flex justify-start gap-1">
          {mainItems.slice(LEFT_COUNT).map((item) => (
            <DockLink key={item.href} item={item} mouseX={mouseX} pathname={pathname} />
          ))}
          <MoreMenu items={visibleMoreItems} mouseX={mouseX} pathname={pathname} />
        </div>
      </div>
    </nav>
  );
}

function DockLink({ item, mouseX, pathname }: { item: DockItem; mouseX: MotionValue<number>; pathname: string }) {
  const active = isActive(item, pathname);
  return (
    <Link href={item.href} aria-label={item.label} aria-current={active ? "page" : undefined} className="group">
      <DockIcon icon={item.icon} shortLabel={item.shortLabel} mouseX={mouseX} active={active} />
    </Link>
  );
}
