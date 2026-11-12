import { validCrmReportSignature } from "../../../../lib/crm-report-signature";
import { getDocumentFileName, getReportDocument } from "../../../../lib/report-documents/store";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!validCrmReportSignature(request)) return new Response("Accesso negato.", { status: 403, headers });
  try {
    const { id } = await params;
    const document = await getReportDocument(id, true);
    if (!document?.pdf) return new Response("Report non disponibile.", { status: 404, headers });
    return new Response(new Uint8Array(document.pdf), { headers: {
      ...headers, "Content-Type": "application/pdf", "Content-Length": String(document.pdf.length),
      "X-Report-Filename": await getDocumentFileName(document), "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    console.error("[crm-reports/pdf]", error);
    return new Response("PDF non disponibile.", { status: 503, headers });
  }
}
