import { requireSeoPage } from "../../../lib/crm-auth";
import { redirect } from "next/navigation";
function Page(){ redirect("/visibilita-ai"); }

export default async function AuthorizedPage(...args: Parameters<typeof Page>) {
  await requireSeoPage();
  return Page(...args);
}
