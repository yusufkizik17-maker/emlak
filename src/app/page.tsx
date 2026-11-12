export const dynamic = "force-dynamic";
import { Landing } from "@/components/landing";
import { getAppMode } from "@/lib/env";
export default function Home() {
  return <Landing mode={getAppMode()} />;
}
