export const dynamic = "force-dynamic";
import { WorkspaceProvider } from "@/features/workspace/provider";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getAppMode } from "@/lib/env";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider mode={getAppMode()}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}
