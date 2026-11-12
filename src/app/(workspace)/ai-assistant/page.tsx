import { Suspense } from "react";
import { Assistant } from "@/features/workspace/assistant";
export default function Page() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <Assistant />
    </Suspense>
  );
}
