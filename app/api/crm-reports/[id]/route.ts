import { NextRequest } from "next/server";
import { validSettingsSignature } from "../../../../lib/crm-settings-signature";
import { getDocumentFileName, getReportDocument } from "../../../../lib/report-documents/store";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id) || !validSettingsSignature(request.headers, "GET", "", process.env.SOLAIR_SEO_SETTINGS_SECRET, Date.now(), `/api/crm-reports/${id}`)) return new Response("Accesso negato", { status: 403, headers });
  try {
    const document = await getReportDocument(id, true);
    if (!document?.pdf) return new Response("Report non disponibile", { status: 404, headers });
    return new Response(new Uint8Array(document.pdf), { headers: { ...headers, "Content-Type": "application/pdf", "Content-Length": String(document.pdf.length), "x-report-filename": await getDocumentFileName(document) } });
  } catch { return new Response("Report non disponibile", { status: 503, headers }); }
}
