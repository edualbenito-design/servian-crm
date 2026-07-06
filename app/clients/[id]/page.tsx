import { notFound } from "next/navigation";
import { getClient } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth";
import { ClientDetail } from "./ClientDetail";

export default async function ClientDetailPage(
  props: PageProps<"/clients/[id]">
) {
  const { id } = await props.params;
  const client = await getClient(id);
  if (!client) notFound();

  // Non-managers can only open their own clients.
  const profile = await getCurrentProfile();
  if (profile && !profile.isManager && client.assignedTo !== profile.name) {
    notFound();
  }

  return (
    <ClientDetail
      initialClient={client}
      isManager={profile?.isManager ?? false}
      currentUserName={profile?.name ?? ""}
    />
  );
}
