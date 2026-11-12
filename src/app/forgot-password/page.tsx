import { AuthForm } from "@/components/auth-form";
import { getAppMode } from "@/lib/env";
export const dynamic = "force-dynamic";
export default function Page() {
  return <AuthForm kind="forgot" mode={getAppMode()} />;
}
