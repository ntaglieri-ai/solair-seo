import { NextRequest, NextResponse } from "next/server";
import { authorizedEngine } from "../../../../lib/engine/auth";
import { collectAiChecks } from "../../../../lib/ai-collection";
export const dynamic = "force-dynamic";
export const maxDuration = 180;
export async function GET(request: NextRequest) {
  if (!authorizedEngine(request)) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  try {
    const result = await collectAiChecks("solairgroup.it", "cron");
    return NextResponse.json(result, { status: result.status === "failed" || result.status === "partial" ? 503 : 200, headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Raccolta AI non disponibile." }, { status: 503 }); }
}
