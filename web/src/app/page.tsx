import { TodayView } from "@/components/today/today-view";
import { results } from "@/lib/data";

export default function TodayPage() {
  return <TodayView data={{ invoices: results.invoices, summary: results.summary, meta: results.meta }} />;
}
