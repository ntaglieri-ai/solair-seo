import { requireSeoPage } from "../../lib/crm-auth";
import AuditClient from "./audit-client";
export const dynamic = "force-dynamic";
export default async function AuditPage() {
  await requireSeoPage();
  return <AuditClient />;
}
