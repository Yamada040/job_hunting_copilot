import type { components } from "@/lib/api/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AiUsage = components["schemas"]["AiUsage"];

const featureLabels: Record<AiUsage["feature"], string> = {
  es_review: "AI添削（ES）",
  interview_review: "AI振り返り（面接ログ）",
  company_analysis: "AI企業分析",
  aptitude_diagnosis: "AI適性診断",
  self_analysis: "AI自己分析",
};

const nf = new Intl.NumberFormat("ja-JP");

const average = (total: number, calls: number) => (calls > 0 ? nf.format(Math.round(total / calls)) : "—");

/** AIの機能ごとのトークン数。結果を上書きする機能・1回だけの機能は、最新の1回分だけが数えられている。 */
export function AiUsageTable({ usage }: { usage: AiUsage[] }) {
  return (
    <Card className="gap-4 py-6">
      <CardHeader className="px-6">
        <CardTitle>
          <h2 className="text-base font-semibold">AIのトークン数</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 text-left font-normal">機能</th>
                <th className="py-2 text-right font-normal">回数</th>
                <th className="py-2 text-right font-normal">平均 入力</th>
                <th className="py-2 text-right font-normal">平均 出力</th>
                <th className="py-2 text-right font-normal">合計 入力</th>
                <th className="py-2 text-right font-normal">合計 出力</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((row) => (
                <tr key={row.feature} className="border-b border-border">
                  <td className="py-2">{featureLabels[row.feature]}</td>
                  <td className="py-2 text-right">{nf.format(row.calls)}</td>
                  <td className="py-2 text-right">{average(row.inputTokens, row.calls)}</td>
                  <td className="py-2 text-right">{average(row.outputTokens, row.calls)}</td>
                  <td className="py-2 text-right">{nf.format(row.inputTokens)}</td>
                  <td className="py-2 text-right">{nf.format(row.outputTokens)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pt-3 text-[11px] text-muted-foreground">
          出力には思考・推論の分を含みます。AI振り返り・AI企業分析・AI適性診断・AI自己分析は結果を上書きするか1回だけなので、最新の1回分だけを数えています。
        </p>
      </CardContent>
    </Card>
  );
}
