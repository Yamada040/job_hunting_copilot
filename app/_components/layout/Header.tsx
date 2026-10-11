"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon, HomeIcon } from "@heroicons/react/24/outline";
import { BrandLogo } from "./BrandLogo";

export interface BreadcrumbItem {
  label: string;
  href: string;
}

interface HeaderProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  leftContent?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actionsPlacement?: "left" | "right";
  showBrand?: boolean;
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  if (pathname !== "/dashboard") {
    breadcrumbs.push({ label: "ダッシュボード", href: "/dashboard" });
  }

  let currentPath = "";
  segments.forEach((segment) => {
    currentPath += `/${segment}`;

    let label = segment;
    switch (segment) {
      case "dashboard":
        label = "ダッシュボード";
        break;
      case "es":
        label = "ES管理";
        break;
      case "companies":
        label = "企業管理";
        break;
      case "aptitude":
        label = "適性チェック";
        break;
      case "self-analysis":
        label = "自己分析";
        break;
      case "interviews":
        label = "面接ログ";
        break;
      case "webtests":
        label = "Webテスト対策";
        break;
      case "profile":
        label = "プロフィール";
        break;
      case "contact":
        label = "お問い合わせ";
        break;
      case "new":
        label = "新規作成";
        break;
      default:
        if (segment.length > 20) {
          label = "詳細";
        }
    }

    breadcrumbs.push({ label, href: currentPath });
  });

  return breadcrumbs;
}

export function Header({
  title,
  description,
  actions,
  leftContent,
  actionsPlacement = "left",
  showBrand,
}: HeaderProps) {
  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-sky-300/45 bg-white/94 px-6 py-4 backdrop-blur">
      <div className="flex flex-col gap-3">
        {actionsPlacement === "left" ? (
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              {showBrand ? <BrandLogo className="w-60 pl-16" logoClassName="h-14" /> : null}
              {leftContent ? <div className="flex-shrink-0">{leftContent}</div> : null}
            </div>
            <div className="flex-1 min-w-0">
              {title && <h1 className="truncate text-2xl font-semibold">{title}</h1>}
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            {actions ? <div className="flex flex-shrink-0 items-center gap-2">{actions}</div> : null}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              {title && <h1 className="truncate text-2xl font-semibold">{title}</h1>}
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>

            <div className="ml-4 flex items-center gap-2">{actions}</div>
          </div>
        )}
      </div>
    </header>
  );
}

export function Breadcrumbs({ breadcrumbs }: { breadcrumbs?: BreadcrumbItem[] }) {
  const pathname = usePathname();
  const generatedBreadcrumbs = breadcrumbs || generateBreadcrumbs(pathname);

  if (generatedBreadcrumbs.length <= 1) return null;

  return (
    <nav className="mt-4 flex items-center space-x-1 text-xs font-bold text-muted-foreground">
      <HomeIcon className="h-4 w-4" />
      <ChevronRightIcon className="h-4 w-4 opacity-60" />

      {generatedBreadcrumbs.map((item, index) => (
        <div key={item.href} className="flex items-center space-x-1">
          {index === generatedBreadcrumbs.length - 1 ? (
            <span className="text-foreground">{item.label}</span>
          ) : (
            <>
              <Link href={item.href} className="transition-colors hover:text-sky-500">
                {item.label}
              </Link>
              <ChevronRightIcon className="h-4 w-4 opacity-60" />
            </>
          )}
        </div>
      ))}
    </nav>
  );
}
