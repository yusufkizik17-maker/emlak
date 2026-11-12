"use client";
import { Button } from "@/components/ui/button";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <section role="alert" className="rounded-xl border p-6">
      <h2>Bir hata oluştu / Something went wrong</h2>
      <Button className="mt-5" onClick={reset}>
        Tekrar dene / Retry
      </Button>
    </section>
  );
}
