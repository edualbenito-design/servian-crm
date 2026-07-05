import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getDocuments } from "@/lib/db";
import { DocumentsClient } from "./DocumentsClient";

export default async function DocumentsPage() {
  const profile = await getCurrentProfile();
  if (profile && !profile.isManager) redirect("/");

  const documents = await getDocuments();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-(--text-primary) tracking-tight">
          Documents
        </h1>
        <p className="mt-1 text-sm text-(--text-secondary)">
          Company licenses, papers and files the team uses day to day
        </p>
      </div>
      <DocumentsClient documents={documents} />
    </div>
  );
}
