import { getClients } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth";
import { ClientsTable } from "./ClientsTable";
import { NewClientButton } from "./NewClientModal";

export default async function ClientsPage() {
  const profile = await getCurrentProfile();
  const clients = await getClients(
    profile?.isManager ? undefined : profile?.name
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary) tracking-tight">
            Clients
          </h1>
          <p className="mt-1 text-sm text-(--text-secondary)">
            Manage your client relationships and projects
          </p>
        </div>
        <NewClientButton />
      </div>

      <ClientsTable clients={clients} />
    </div>
  );
}
