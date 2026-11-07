import { requireSeoPage } from "../../../lib/crm-auth";
import { redirect } from "next/navigation";
import { getLatestDocument } from "../../../lib/report-documents/store";
export const dynamic="force-dynamic";
async function Latest(){const doc=await getLatestDocument();redirect(doc?`/report/documento/${doc.id}`:"/report");}

export default async function AuthorizedPage(...args: Parameters<typeof Latest>) {
  await requireSeoPage();
  return Latest(...args);
}
