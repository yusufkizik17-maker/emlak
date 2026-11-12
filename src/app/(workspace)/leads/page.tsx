import { Suspense } from "react";
import { Leads } from "@/features/workspace/leads";
export default function Page() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <Leads />
    </Suspense>
  );
}
