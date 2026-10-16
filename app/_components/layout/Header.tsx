"use client";

import { BrandLogo } from "./BrandLogo";

interface HeaderProps {
  title?: string;
  description?: string;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  showBrand?: boolean;
}

export function Header({ title, description, leftContent, rightContent, showBrand }: HeaderProps) {
  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-ring/45 bg-card/94 px-3 py-2 backdrop-blur sm:px-6 sm:py-4">
      <div className="flex flex-col gap-3">
        <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            {showBrand ? <BrandLogo className="w-20 shrink-0 sm:w-60" logoClassName="h-8 sm:h-14" /> : null}
            {leftContent ? <div className="min-w-0 flex-1">{leftContent}</div> : null}
          </div>
          <div className="flex-1 min-w-0">
            {title && <h1 className="truncate text-2xl font-semibold">{title}</h1>}
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {rightContent ? <div className="shrink-0">{rightContent}</div> : null}
        </div>
      </div>
    </header>
  );
}
