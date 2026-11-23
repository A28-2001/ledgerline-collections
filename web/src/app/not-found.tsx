import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-xl font-semibold tracking-tight">That page isn&apos;t here</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        It may be a customer that isn&apos;t in this run. Today&apos;s list has everything that&apos;s overdue.
      </p>
      <Button asChild className="mt-2">
        <Link href="/">Back to today</Link>
      </Button>
    </div>
  );
}
