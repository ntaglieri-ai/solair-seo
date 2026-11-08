import { NextRequest, NextResponse } from "next/server";
import { requireSeoApi } from "../../../../../lib/crm-auth";
import { crmServicesRequest } from "../../../../../lib/crm-services";
const headers = { "Cache-Control": "no-store" };
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireSeoApi(request, true);
  if (denied) return denied;
  const body = await request.text();
  if (body.length > 7000) return NextResponse.json({ error: "Richiesta troppo grande." }, { status: 400, headers });
  let input;
  try {
    input = JSON.parse(body);
    if (!input || !["email", "nextcloud"].includes(input.action) || typeof input.operationId !== "string" || !Array.isArray(input.recipients)) throw new Error();
  } catch { return NextResponse.json({ error: "Richiesta non valida." }, { status: 400, headers }); }
  const { id } = await params;
  try { return NextResponse.json(await crmServicesRequest("POST", { reportId: id, action: input.action, operationId: input.operationId, recipients: input.recipients }), { headers }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Operazione non riuscita." }, { status: 503, headers }); }
}
