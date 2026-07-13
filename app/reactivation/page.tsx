import { getClientValues } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth";
import { ReactivationView } from "./ReactivationView";

export default async function ReactivationPage() {
  const profile = await getCurrentProfile();
  const isManager = profile?.isManager ?? false;
  // Managers see everyone; commercials see only their own clients.
  const clients = await getClientValues(isManager ? undefined : profile?.name);

  return <ReactivationView clients={clients} isManager={isManager} />;
}
