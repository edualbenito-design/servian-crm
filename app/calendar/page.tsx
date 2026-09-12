import { getFollowUpAgenda, getAdvanceAlerts, getCollections } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth";
import { icalFeedUrl } from "@/lib/ical";
import { CalendarView } from "./CalendarView";

export default async function CalendarPage() {
  const profile = await getCurrentProfile();
  const scope = profile?.isManager ? undefined : profile?.name;
  // Independent reads → parallel.
  const [agenda, alerts, collections] = await Promise.all([
    getFollowUpAgenda(scope),
    getAdvanceAlerts(scope),
    getCollections(scope),
  ]);
  const { expectedPayments } = collections;

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

  const feedUrl = profile?.name ? icalFeedUrl(profile.name) : "";

  const expected = expectedPayments.map((e) => ({
    clientId: e.clientId,
    clientName: e.clientName,
    projectName: e.projectName,
    label: e.label,
    date: e.date,
    amount: e.amount,
  }));

  return (
    <CalendarView
      pending={pending}
      done={done}
      alerts={alerts}
      expected={expected}
      isManager={profile?.isManager ?? false}
      currentUserName={profile?.name ?? ""}
      feedUrl={feedUrl}
    />
  );
}
