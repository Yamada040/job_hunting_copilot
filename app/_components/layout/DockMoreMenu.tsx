"use client";

import Link from "next/link";
import { EllipsisHorizontalCircleIcon } from "@heroicons/react/24/outline";
import type { MotionValue } from "framer-motion";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DockIcon, isActive, type DockItem } from "./DockIcon";

/** たまに使う画面を上に開くメニュー。そのどれかを開いているときは「その他」に今いる印を付ける。 */
export function MoreMenu({
  items,
  mouseX,
  pathname,
}: {
  items: DockItem[];
  mouseX: MotionValue<number>;
  pathname: string;
}) {
  const active = items.some((item) => isActive(item, pathname));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="その他のメニュー" className="group outline-none">
        <DockIcon icon={EllipsisHorizontalCircleIcon} shortLabel="その他" mouseX={mouseX} active={active} />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" sideOffset={12} className="min-w-52 rounded-2xl p-1.5">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.href}
            asChild
            className={cn("gap-3 rounded-xl px-3 py-2.5", isActive(item, pathname) && "bg-accent text-primary")}
          >
            <Link href={item.href} aria-current={isActive(item, pathname) ? "page" : undefined}>
              <item.icon className="h-5 w-5" aria-hidden />
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
