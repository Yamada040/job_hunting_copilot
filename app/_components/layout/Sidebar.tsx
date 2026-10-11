"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  LightBulbIcon,
  ChartBarSquareIcon,
} from "@heroicons/react/24/outline";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useMe } from "@/lib/api/me";
import { ROUTES } from "@/lib/constants/routes";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description?: string;
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-2 py-2 text-xs font-bold transition hover:text-sky-500",
        isActive ? "text-sky-600" : "text-foreground",
      )}
    >
      <span aria-hidden className="shrink-0 text-[0.7rem] transition-transform group-hover:translate-x-1">
        ▶
      </span>
      <item.icon className="h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs">{item.label}</div>
        {item.description && (
          <div className="mt-0.5 truncate text-[0.65rem] font-normal text-muted-foreground">{item.description}</div>
        )}
      </div>
    </Link>
  );
}

const navigationItems: NavItem[] = [
  {
    label: "ダッシュボード",
    href: "/dashboard",
    icon: HomeIcon,
    description: "全体の概要を確認",
  },
  {
    label: "ES管理",
    href: "/es",
    icon: DocumentTextIcon,
    description: "エントリーシートを整理",
  },
  {
    label: "企業管理",
    href: "/companies",
    icon: BuildingOfficeIcon,
    description: "企業カードと進捗を記録",
  },
  {
    label: "適性チェック",
    href: "/aptitude",
    icon: LightBulbIcon,
    description: "業界・職種の向き不向きを診断",
  },
  {
    label: "自己分析",
    href: "/self-analysis",
    icon: ClipboardDocumentCheckIcon,
    description: "強み・価値観を整理",
  },
  {
    label: "面接ログ",
    href: "/interviews",
    icon: ChatBubbleLeftRightIcon,
    description: "面接の質問・回答を記録",
  },
  {
    label: "Webテスト対策",
    href: "/webtests",
    icon: AcademicCapIcon,
    description: "演習用の問題を管理",
  },
  {
    label: "プロフィール",
    href: "/profile",
    icon: UserIcon,
    description: "ユーザー設定とアバター",
  },
  {
    label: "お問い合わせ",
    href: ROUTES.CONTACT,
    icon: ChatBubbleLeftRightIcon,
    description: "運営への連絡フォーム",
  },
];

const developerItem: NavItem = {
  label: "開発者ダッシュボード",
  href: ROUTES.DEVELOPER,
  icon: ChartBarSquareIcon,
  description: "利用状況の分析",
};

/** 開発者のときだけ、開発者ダッシュボードへのリンクを表示する。 */
function DeveloperNavLink({ pathname }: { pathname: string }) {
  const { data } = useMe();
  if (!data?.isDeveloper) return null;

  return (
    <NavLink
      item={developerItem}
      isActive={pathname === developerItem.href || pathname.startsWith(developerItem.href + "/")}
    />
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="fixed left-0 top-20 z-40 h-[calc(100vh-5rem)] w-60 border-r border-slate-400/20 bg-[#f8fcff]/98 backdrop-blur">
      <div className="flex h-full flex-col gap-6 overflow-y-auto px-5 py-7">
        <nav className="flex-1">
          <div className="space-y-3">
            {navigationItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
              />
            ))}
          </div>
        </nav>

        <div>
          <Separator className="mb-5" />
          <div className="space-y-2">
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="group flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-xs font-bold text-foreground transition hover:text-sky-500"
              >
                <span
                  aria-hidden={true}
                  className="shrink-0 text-[0.7rem] transition-transform group-hover:translate-x-1"
                >
                  ▶
                </span>
                <ArrowRightOnRectangleIcon className="h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-xs">ログアウト</div>
                </div>
              </button>
            </form>
            <DeveloperNavLink pathname={pathname} />
          </div>
        </div>
      </div>
    </div>
  );
}
