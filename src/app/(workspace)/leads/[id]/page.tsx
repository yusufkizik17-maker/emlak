import { LeadDetails } from "@/features/workspace/leads";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LeadDetails id={id} />;
}
