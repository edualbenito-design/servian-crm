import { getClients } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth";
import { CalendarView } from "./CalendarView";

export default async function CalendarPage() {
  const profile = await getCurrentProfile();
  const clients = await getClients(
    profile?.isManager ? undefined : profile?.name
  );

  // Only the fields the calendar needs (keeps the client payload small).
  const items = clients
    .filter((c) => c.nextFollowUp)
    .map((c) => ({
      id: c.id,
      name: c.name,
      location: c.location,
      phone: c.phone,
      assignedTo: c.assignedTo,
      nextFollowUp: c.nextFollowUp!,
    }));

  return <CalendarView items={items} isManager={profile?.isManager ?? false} />;
}
