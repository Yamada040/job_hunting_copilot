"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { XP_PER_LEVEL } from "@/lib/xp/compute-level";
import { XP_RULES } from "@/lib/xp/rules";

/** ヘッダーのレベル・XPの表示を押すと開く、XPのもらい方の説明。children が押せる部分になる。 */
export function XpRulesDialog({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="XPのもらい方を見る"
          className="rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {children}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>XPのもらい方</DialogTitle>
          <DialogDescription>
            就活の記録をするとXPがもらえ、{XP_PER_LEVEL}XPごとにレベルが1つ上がります。
          </DialogDescription>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>操作</TableHead>
              <TableHead className="text-right">XP</TableHead>
              <TableHead>制限</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {XP_RULES.map((rule) => (
              <TableRow key={rule.action}>
                <TableCell className="whitespace-normal">{rule.action}</TableCell>
                <TableCell className="text-right font-bold text-primary">+{rule.xp}</TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">{rule.limit}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground">1日の区切りは日本時間の0時です。</p>
      </DialogContent>
    </Dialog>
  );
}
