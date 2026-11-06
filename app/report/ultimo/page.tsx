import { redirect } from "next/navigation";
import { getLatestDocument } from "../../../lib/report-documents/store";
export const dynamic="force-dynamic";
export default async function Latest(){const doc=await getLatestDocument();redirect(doc?`/report/documento/${doc.id}`:"/report");}
