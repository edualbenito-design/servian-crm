import { getFollowUpAgenda } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth";
import { CalendarView } from "./CalendarView";

export default async function CalendarPage() {
  const profile = await getCurrentProfile();
  const agenda = await getFollowUpAgenda(
    profile?.isManager ? undefined : profile?.name
  );

  // Pending tasks show on their due day; done ones on the day they were done.
  const pending = agenda
    .filter((f) => f.status === "pending")
    .map((f) => ({
      followUpId: f.followUpId,
      clientId: f.clientId,
      name: f.name,
      location: f.location,
      phone: f.phone,
      assignedTo: f.assignedTo,
      projectName: f.projectName,
      dueDate: f.dueDate,
      note: f.note,
    }));

  const done = agenda
    .filter((f) => f.status === "done" && f.doneAt)
    .map((f) => ({
      followUpId: f.followUpId,
      clientId: f.clientId,
      name: f.name,
      location: f.location,
      phone: f.phone,
      assignedTo: f.assignedTo,
      projectName: f.projectName,
      doneDate: f.doneAt!.slice(0, 10),
      dueDate: f.dueDate,
      note: f.note,
      doneBy: f.doneBy ?? "",
      doneNote: f.doneNote ?? "",
    }));

  return (
    <CalendarView
      pending={pending}
      done={done}
      isManager={profile?.isManager ?? false}
      currentUserName={profile?.name ?? ""}
    />
  );
}
