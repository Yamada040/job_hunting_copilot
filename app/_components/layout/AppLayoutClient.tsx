"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { Breadcrumbs, Header } from "./Header";
import { XpBadge } from "../xp-badge";

export interface AppLayoutProps {
  children: React.ReactNode;
  headerTitle?: string;
  headerDescription?: string;
  headerLeftContent?: React.ReactNode;
  showHeader?: boolean;
  showSidebar?: boolean;
  className?: string;
}

export function AppLayoutClient({
  children,
  headerTitle,
  headerDescription,
  headerLeftContent,
  showHeader = true,
  showSidebar = true,
  className,
}: AppLayoutProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem("sidebar-open");
    return stored !== null ? stored === "true" : true;
  });

  useEffect(() => {
    if (!showSidebar) return;
    window.localStorage.setItem("sidebar-open", String(isSidebarOpen));
  }, [isSidebarOpen, showSidebar]);

  // ログインとホームは素の表示
  if (pathname === "/login" || pathname === "/") {
    return <>{children}</>;
  }

  const leftContent = headerLeftContent ?? <XpBadge />;
  const shouldShowSidebar = showSidebar && isSidebarOpen;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {shouldShowSidebar && <Sidebar />}
      {showSidebar ? (
        <button
          type="button"
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          className="fixed left-6 top-6 z-[60] flex h-10 w-10 items-center justify-center text-primary transition-colors hover:text-sky-500"
          aria-label={isSidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
        >
          <span className="flex h-4 w-4 flex-col items-center justify-between">
            <span className="h-[2px] w-full bg-current" />
            <span className="h-[2px] w-full bg-current" />
            <span className="h-[2px] w-full bg-current" />
          </span>
        </button>
      ) : null}

      <div
        className={cn("min-h-screen transition-[margin] duration-300", {
          "ml-60": shouldShowSidebar,
          "ml-0": !shouldShowSidebar,
        })}
      >
        {showHeader && <Header leftContent={leftContent} showBrand />}

        <main className={cn("mx-auto max-w-7xl px-6 pb-8 pt-24 sm:px-10 sm:pb-12", className)}>
          <Breadcrumbs />
          {(headerTitle || headerDescription) && (
            <div className="mt-4">
              {headerTitle && <h1 className="text-lg font-semibold">{headerTitle}</h1>}
              {headerDescription && <p className="mt-1 text-sm text-muted-foreground">{headerDescription}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
