import { InboxWorkspace } from "@/features/inbox/workspace";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const { lead } = await searchParams;
  return <InboxWorkspace key={lead || "inbox"} initialLeadId={lead} />;
}
