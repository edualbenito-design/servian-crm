import { getCollections } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth";
import { CollectionsView } from "./CollectionsView";

export default async function CollectionsPage() {
  const profile = await getCurrentProfile();
  const isManager = profile?.isManager ?? false;
  // Managers see everyone; commercials see only their own clients' money.
  const { receivables, collectedThisMonth, collectedByMonth } =
    await getCollections(isManager ? undefined : profile?.name);

  return (
    <CollectionsView
      receivables={receivables}
      collectedThisMonth={collectedThisMonth}
      collectedByMonth={collectedByMonth}
      isManager={isManager}
    />
  );
}
