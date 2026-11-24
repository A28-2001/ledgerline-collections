import { MorningView } from "@/components/today/morning-view";
import { results } from "@/lib/data";

export default function TodayPage() {
  return (
    <MorningView
      data={{ invoices: results.invoices, summary: results.summary, meta: results.meta, morningSummary: results.morningSummary }}
    />
  );
}
