import { getClients } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth";
import { CalendarView } from "./CalendarView";

export default async function CalendarPage() {
  const profile = await getCurrentProfile();
  const clients = await getClients(
    profile?.isManager ? undefined : profile?.name
  );

  // One calendar item per PENDING follow-up task (client-level + per project).
  // getClients already attaches only pending follow-ups.
  const items = clients.flatMap((c) => {
    const all = [...c.followUps, ...c.projects.flatMap((p) => p.followUps)];
    return all
      .filter((f) => f.status === "pending")
      .map((f) => ({
        followUpId: f.id,
        clientId: c.id,
        name: c.name,
        location: c.location,
        phone: c.phone,
        assignedTo: c.assignedTo,
        projectName: f.projectId
          ? c.projects.find((p) => p.id === f.projectId)?.name ?? null
          : null,
        dueDate: f.dueDate,
        note: f.note ?? "",
      }));
  });

  return <CalendarView items={items} isManager={profile?.isManager ?? false} />;
}
