import { readFileSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";
import { formatDate, formatDateTime, formatDecimal, formatInt, formatPercent } from "../format";
import { formatPeriod } from "../comparison-periods";
import { reportReading, reportText, STABLE_CLICKS_BAND } from "../report-presentation";
import { summarizeScan, citationHost, SOURCE_CHECKS } from "../geo/summary";
import type { GeoAnswer } from "../geo/answer";
import { documentStatus, type ReportPayload } from "./model";

const SITE_URL = "https://solairgroup.it", SITE_LABEL = "solairgroup.it";
const C = {
  forest: "#16264A", green: "#2A6F66", mint: "#E6F1EF", pale: "#F3F7F6", ink: "#111C2A", muted: "#5B6878", line: "#DCE3EB",
  amber: "#E8A93B", amberDark: "#8F6410", amberTint: "#FFF5E1", blueTint: "#EAF1F8", blue: "#2F5F8F", white: "#FFFFFF", grey: "#EEF1EF",
};
let coverImage: Buffer | null | undefined;
/** Foto dell'hero di solairgroup.it; senza file il PDF usa un fondo pieno. */
const loadCover = () => { if (coverImage === undefined) { try { coverImage = readFileSync(join(process.cwd(), "lib/report-documents/assets/cover.jpg")); } catch { coverImage = null; } } return coverImage; };
const F = { r: "Helvetica", b: "Helvetica-Bold", i: "Helvetica-Oblique" } as const;
const PW = 595.28, PH = 841.89, M = 46, W = PW - 2 * M, FOOT = PH - 64;
const clean = (value: unknown) => String(value ?? "").replace(/[‐-―−]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/→/g, " -> ").replace(/•/g, "-").replace(/ /g, " ");
const pct = (a: number, b: number) => (b ? (a - b) / b : null);
const signed = (n: number, digits = 1) => `${n > 0 ? "+" : n < 0 ? "-" : ""}${Math.abs(n).toLocaleString("it-IT", { maximumFractionDigits: digits })}`;
type Tone = "up" | "down" | "flat";
const TONE: Record<Tone, string> = { up: C.green, down: C.amberDark, flat: C.muted };
const safeUrl = (url: string) => { try { const u = new URL(url); return ["http:", "https:"].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; } };

/** Variazione relativa con fascia di stabilità: sotto ±5% non si parla di crescita o calo. */
function relDelta(cur: number, prev: number): { text: string; tone: Tone } {
  const r = pct(cur, prev);
  if (r === null) return { text: cur === prev ? "Invariato" : "Base nulla", tone: "flat" };
  const flat = Math.abs(r) < STABLE_CLICKS_BAND;
  return { text: `${signed(r * 100)}%${flat ? " · stabile" : ""}`, tone: flat ? "flat" : r > 0 ? "up" : "down" };
}

/** Documento vettoriale generato sul server, senza browser né servizi esterni. */
export function renderReportPdf(payload: ReportPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true, info: { Title: "Report SEO/GEO - Solair Group", Author: "SolairSEO", Subject: "Risultati, interpretazione e proposte di miglioramento", CreationDate: new Date(payload.generatedAt) } });
    const chunks: Buffer[] = [];
    doc.on("data", chunk => chunks.push(Buffer.from(chunk))); doc.on("error", reject); doc.on("end", () => resolve(Buffer.concat(chunks)));
    let y = 0;

    // --- primitive -----------------------------------------------------------------
    const hOf = (s: unknown, size: number, font: string, w: number, gap = 2.5) => { doc.font(font).fontSize(size); return doc.heightOfString(clean(s), { width: w, lineGap: gap }); };
    const put = (s: unknown, x: number, yy: number, w: number, size: number, font: string, color: string, opts: Record<string, unknown> = {}) => {
      doc.font(font).fontSize(size).fillColor(color).text(clean(s), x, yy, { width: w, lineGap: 2.5, ...opts });
    };
    const caps = (s: string, x: number, yy: number, w: number, color = C.muted, size = 7.5) => put(s.toUpperCase(), x, yy, w, size, F.b, color, { characterSpacing: 0.7, lineBreak: false });
    const ensure = (h: number) => { if (y + h > FOOT) newPage(); };
    const wordmark = (x: number, yy: number, size: number, color: string) => {
      doc.roundedRect(x, yy + 1, size * 0.62, size * 0.62, 2).fill(C.amber);
      put("SolairSEO", x + size * 0.62 + 6, yy - 1, 160, size, F.b, color, { lineBreak: false });
    };
    function newPage() {
      doc.addPage();
      wordmark(M, 30, 11, C.green);
      put(`Solair Group  |  ${SITE_LABEL}`, M + 160, 31, W - 160, 8.5, F.r, C.muted, { align: "right", lineBreak: false });
      doc.moveTo(M, 52).lineTo(M + W, 52).lineWidth(0.6).strokeColor(C.line).stroke();
      y = 78;
    }
    function link(label: string, url: string, x = M, w = W, size = 9, color = C.green) {
      const href = safeUrl(url); const h = hOf(label, size, F.r, w);
      ensure(h + 6);
      if (href) put(label, x, y, w, size, F.r, color, { link: href, underline: true }); else put(label, x, y, w, size, F.r, C.muted);
      y += h + 6;
    }
    function para(s: unknown, size = 10.5, font: string = F.r, color = C.ink, gap = 9, x = M, w = W) {
      const h = hOf(s, size, font, w, 3); ensure(h + gap);
      put(s, x, y, w, size, font, color, { lineGap: 3 }); y += h + gap;
    }
    function chapter(number: string, title: string, subtitle?: string) {
      ensure(110);
      caps(number, M, y, W, C.amberDark, 8.5); y += 16;
      put(title, M, y, W, 25, F.b, C.ink); y += hOf(title, 25, F.b, W) + 8;
      doc.roundedRect(M, y, 34, 3, 1.5).fill(C.amber); y += 14;
      if (subtitle) para(subtitle, 10.5, F.r, C.muted, 16);
    }
    function sub(title: string, gap = 10) { ensure(40); put(title, M, y, W, 13, F.b, C.ink); y += hOf(title, 13, F.b, W) + gap; }
    function pill(x: number, yy: number, label: string, fg: string, bg: string) {
      doc.font(F.b).fontSize(7.2); const w = doc.widthOfString(clean(label.toUpperCase()), { characterSpacing: 0.5 }) + 14;
      doc.roundedRect(x, yy, w, 15, 7.5).fill(bg); put(label.toUpperCase(), x + 7, yy + 4.2, w, 7.2, F.b, fg, { characterSpacing: 0.5, lineBreak: false }); return w;
    }
    function tile(x: number, yy: number, w: number, h: number, label: string, value: string, note?: string, tone: Tone = "flat", dark = false) {
      doc.roundedRect(x, yy, w, h, 9).fill(dark ? C.forest : C.pale);
      if (!dark) doc.roundedRect(x, yy, w, h, 9).lineWidth(0.6).strokeColor(C.line).stroke();
      caps(label, x + 12, yy + 12, w - 24, dark ? "#B7C6D8" : C.muted, 7);
      put(value, x + 12, yy + 27, w - 24, 25, F.b, dark ? C.white : C.ink, { lineBreak: false });
      if (note) put(note, x + 12, yy + 59, w - 24, 8.2, F.b, dark ? C.amber : TONE[tone], { lineGap: 2 });
    }
    function tileRow(items: { label: string; value: string; note?: string; tone?: Tone; dark?: boolean }[], h = 86) {
      ensure(h + 14); const gap = 10, w = (W - gap * (items.length - 1)) / items.length;
      items.forEach((it, i) => tile(M + i * (w + gap), y, w, h, it.label, it.value, it.note, it.tone, it.dark)); y += h + 16;
    }
    /** Scheda con barra colorata, etichetta e contenuto misurato prima del disegno. */
    function card(opts: { tint: string; bar: string; tag?: { label: string; fg: string; bg: string }[]; title: string; blocks: { label?: string; text: string; link?: boolean }[]; footer?: string[] }) {
      const pad = 16, inner = W - pad * 2 - 6, labeled = opts.blocks.some(b => b.label), labelW = labeled ? 74 : 0, bodyW = inner - labelW;
      const titleH = hOf(opts.title, 13, F.b, inner, 2);
      const blockH = opts.blocks.map(b => hOf(b.text, 9.6, F.r, bodyW, 2.8) + 8);
      const footH = (opts.footer ?? []).map(f => hOf(f, 8.6, F.r, inner, 2.5) + 4);
      const h = pad + (opts.tag?.length ? 23 : 0) + titleH + 10 + blockH.reduce((a, b) => a + b, 0) + footH.reduce((a, b) => a + b, 0) + pad - 2;
      ensure(h + 14); const top = y;
      doc.roundedRect(M, top, W, h, 10).fill(opts.tint); doc.roundedRect(M, top, 5, h, 2.5).fill(opts.bar);
      const tx = M + pad + 6; let cy = top + pad;
      if (opts.tag?.length) { let px = tx; opts.tag.forEach(t => { px += pill(px, cy, t.label, t.fg, t.bg) + 6; }); cy += 23; }
      put(opts.title, tx, cy, inner, 13, F.b, C.ink, { lineGap: 2 }); cy += titleH + 10;
      opts.blocks.forEach((b, i) => {
        if (b.label) { caps(b.label, tx, cy + 1.5, labelW - 6, C.muted, 6.8); }
        const href = b.link ? safeUrl(b.text) : null;
        put(b.text, tx + labelW, cy, bodyW, 9.6, F.r, href ? C.green : C.ink, { lineGap: 2.8, ...(href ? { link: href, underline: true } : {}) });
        cy += blockH[i];
      });
      (opts.footer ?? []).forEach((f, i) => { put(f, tx, cy, inner, 8.6, F.i, C.muted, { lineGap: 2.5 }); cy += footH[i]; });
      y = top + h + 14;
    }
    function tableHeader(cols: { w: number; label: string; align?: "left" | "right" | "center" }[]) {
      ensure(30); doc.rect(M, y, W, 22).fill(C.pale);
      let x = M; cols.forEach(c => { caps(c.label, x + 8, y + 7.5, c.w - 16, C.muted, 7); x += c.w; });
      y += 22;
    }
    function tableRow(cols: number[], cells: ((x: number, yy: number, w: number) => void)[], height: number) {
      ensure(height); let x = M; cells.forEach((draw, i) => { draw(x + 8, y + 8, cols[i] - 16); x += cols[i]; });
      doc.moveTo(M, y + height).lineTo(M + W, y + height).lineWidth(0.5).strokeColor(C.line).stroke(); y += height;
    }
    const yes = (x: number, yy: number, label: string, tone: "yes" | "no" | "na") => {
      const style = tone === "yes" ? { fg: C.green, bg: C.mint } : tone === "no" ? { fg: C.amberDark, bg: C.amberTint } : { fg: C.muted, bg: C.grey };
      pill(x, yy, label, style.fg, style.bg);
    };

    try {
      const report = payload.report, data = report.data, windows = data.windows, summary = data.summary;
      const measured = report.status !== "blocked" && !!summary && !!windows;
      const answers = (payload.geo?.answers ?? []) as GeoAnswer[];
      const geo = payload.geo ? summarizeScan(answers, payload.geo.planned) : null;
      const complete = documentStatus(payload) === "complete";

      // ===== Copertina ========================================================
      doc.rect(0, 0, PW, 306).fill(C.forest);
      const photo = loadCover();
      doc.save(); doc.rect(0, 0, PW, 306).clip();
      if (photo) doc.image(photo, 0, 0, { width: PW, height: 306 });
      doc.rect(0, 0, PW, 306).fill(doc.linearGradient(0, 0, 0, 306).stop(0, C.forest, 0.72).stop(0.45, C.forest, 0.42).stop(1, C.forest, 0.92));
      doc.rect(0, 0, PW, 306).fill(doc.linearGradient(0, 0, PW * 0.75, 0).stop(0, C.forest, 0.55).stop(1, C.forest, 0));
      doc.restore();
      doc.rect(0, 303, PW, 3).fill(C.amber);
      wordmark(M, 40, 15, C.white);
      caps("Report SEO / GEO", M, 118, 320, C.amber, 9);
      put("Solair Group", M, 136, 330, 44, F.b, C.white, { lineBreak: false });
      put("Risultati, presenza su Gemini\ne prossimi interventi", M, 192, 320, 15, F.r, "#E3ECF5", { lineGap: 4 });
      put(SITE_LABEL, M, 244, 220, 12.5, F.b, C.amber, { link: SITE_URL, underline: true, lineBreak: false });
      put(`Documento generato il ${formatDateTime(new Date(payload.generatedAt))}`, M, 274, 320, 8.5, F.r, "#B7C6D8", { lineBreak: false });
      pill(PW - M - 108, 271, complete ? "Rilevazione completa" : "Rilevazione parziale", complete ? C.forest : C.amberDark, complete ? C.amber : C.amberTint);
      y = 330;

      if (payload.sourceRefreshFailed) { para("Aggiornamento delle fonti Google parziale: questo documento conserva le evidenze archiviate e ne indica il periodo effettivo.", 9.5, F.b, C.amberDark, 10); }
      if (windows) {
        const cols = [["Periodo analizzato", formatPeriod(windows.current)], ["Periodo di confronto", formatPeriod(windows.previous)], ["Analisi SEO archiviata", formatDateTime(new Date(report.createdAt))]];
        const cw = W / 3; cols.forEach(([label, value], i) => { caps(label, M + i * cw, y, cw - 8, C.muted, 7); put(value, M + i * cw, y + 12, cw - 10, 9.8, F.b, C.ink, { lineGap: 2 }); });
        y += 40; doc.moveTo(M, y - 6).lineTo(M + W, y - 6).lineWidth(0.6).strokeColor(C.line).stroke();
      }
      if (measured && summary) {
        const cur = summary.current, prev = summary.previous;
        const dClicks = relDelta(cur.clicks, prev.clicks), dImp = relDelta(cur.impressions, prev.impressions);
        const ctrPP = (cur.ctr - prev.ctr) * 100, posDiff = cur.position - prev.position;
        tileRow([
          { label: "Clic al sito", value: formatInt(cur.clicks), note: `${dClicks.text}\nprima ${formatInt(prev.clicks)}`, tone: dClicks.tone },
          { label: "Impressioni", value: formatInt(cur.impressions), note: `${dImp.text}\nprima ${formatInt(prev.impressions)}`, tone: dImp.tone },
          { label: "CTR", value: formatPercent(cur.ctr), note: `${signed(ctrPP)} p.p.${Math.abs(ctrPP) < 0.5 ? " · stabile" : ""}`, tone: Math.abs(ctrPP) < 0.5 ? "flat" : ctrPP > 0 ? "up" : "down" },
          { label: "Posizione media", value: formatDecimal(cur.position), note: `${Math.abs(posDiff) < 0.5 ? "stabile" : posDiff < 0 ? "migliora" : "peggiora"}\nprima ${formatDecimal(prev.position)}`, tone: Math.abs(posDiff) < 0.5 ? "flat" : posDiff < 0 ? "up" : "down" },
        ]);
        if (payload.baseline) {
          const b = payload.baseline, d = relDelta(cur.clicks, b.clicks), h = 46;
          ensure(h + 14); doc.roundedRect(M, y, W, h, 9).fill(C.amberTint);
          caps("Dall'avvio del servizio", M + 14, y + 11, 200, C.amberDark, 7);
          put(`Clic organici: ${formatInt(b.clicks)} nel periodo di partenza (${formatDate(b.from)} - ${formatDate(b.to)}), ${formatInt(cur.clicks)} oggi (${d.text.replace(" · stabile", "")}). Periodi di 28 giorni non sovrapposti.`, M + 14, y + 23, W - 28, 9.2, F.r, C.ink, { lineGap: 2.2 });
          y += h + 14;
        }
        const reading = reportReading(cur, prev);
        card({ tint: C.mint, bar: C.green, tag: [{ label: "Sintesi dei risultati", fg: C.green, bg: C.white }], title: reading.title, blocks: [{ text: reading.text }] });
      } else {
        card({ tint: C.amberTint, bar: C.amber, title: "Risultati Google non misurabili", blocks: [{ text: "Le fonti non consentono un confronto attendibile. I valori mancanti non vengono sostituiti con zero o con stime." }] });
      }
      if (geo) {
        ensure(78); doc.roundedRect(M, y, W, 66, 10).fill(C.forest);
        put(`${geo.nonBrandMentioned}/${geo.nonBrandComplete}`, M + 18, y + 16, 90, 30, F.b, C.amber, { lineBreak: false });
        caps("Presenza su Gemini", M + 112, y + 15, 300, "#B7C6D8", 7);
        put(`risposte senza nome aziendale che nominano Solair. Sulle domande dedicate al marchio: ${geo.brandMentioned}/${geo.brandComplete}.`, M + 112, y + 28, W - 130, 9.6, F.r, C.white, { lineGap: 2.5 });
        y += 66 + 14;
      }
      para("Le pagine successive distinguono riscontri misurati, interpretazione e opportunità da verificare. Le date delle fonti possono essere diverse da quella di generazione del PDF.", 8.6, F.r, C.muted, 0);

      // ===== 02 Presenza nelle risposte AI ===============================================
      newPage();
      chapter("02 / Presenza nelle risposte AI", "Come Gemini presenta Solair", payload.geo ? `Rilevazione del ${formatDateTime(new Date(payload.geo.startedAt))}  |  modello ${payload.geo.model ?? "non disponibile"}` : "Nessuna rilevazione Gemini disponibile per questo report.");
      if (payload.geo && geo) {
        tileRow([
          { label: "Spontanee", value: `${geo.nonBrandMentioned}/${geo.nonBrandComplete}`, note: "nominano Solair", tone: geo.nonBrandMentioned ? "up" : "down", dark: true },
          { label: "Sul marchio", value: `${geo.brandMentioned}/${geo.brandComplete}`, note: "la menzionano", tone: "up" },
          { label: "Sito citato", value: `${geo.nonBrandOwnCitations}/${geo.nonBrandComplete}`, note: "nelle spontanee", tone: geo.nonBrandOwnCitations ? "up" : "down" },
          { label: "Complete", value: `${geo.complete}/${geo.planned}`, note: geo.complete === geo.planned ? "campione completo" : "campione parziale", tone: geo.complete === geo.planned ? "up" : "down" },
        ]);
        const cols = [W - 238, 74, 78, 86];
        tableHeader([{ w: cols[0], label: "Domanda eseguita" }, { w: cols[1], label: "Tipo" }, { w: cols[2], label: "Menzione" }, { w: cols[3], label: "Fonte Solair" }]);
        answers.forEach(a => {
          const h = Math.max(hOf(a.question, 8.8, F.r, cols[0] - 16, 2.2), 12) + 12;
          tableRow(cols, [
            (x, yy, w) => put(a.question, x, yy, w, 8.8, F.r, C.ink, { lineGap: 2.2 }),
            (x, yy, w) => put(a.intent === "brand" ? "Marchio" : "Spontanea", x, yy + 1, w, 8, F.r, C.muted, { lineBreak: false }),
            (x, yy) => yes(x, yy - 1, !a.complete ? "N/D" : a.mentioned ? "Sì" : "No", !a.complete ? "na" : a.mentioned ? "yes" : "no"),
            (x, yy) => yes(x, yy - 1, !a.complete ? "N/D" : a.citedSolair ? "Riconosciuta" : "Non rilevata", !a.complete ? "na" : a.citedSolair ? "yes" : "no"),
          ], h);
        });
        y += 14;
        if (geo.complete < geo.planned) para(`${geo.planned - geo.complete} domande non misurate: non sono conteggiate come assenze di Solair.`, 9.5, F.b, C.muted, 8);
        if (geo.competitors.length) para(`Aziende seguite menzionate nel campione senza nome Solair: ${geo.competitors.map(c => `${c.name} (${c.prompts} ${c.prompts === 1 ? "risposta" : "risposte"})`).join(", ")}. Non è una rilevazione dell'intero mercato.`, 9, F.r, C.muted, 8);
      }
      if (payload.geoRefreshFailed) card({ tint: C.amberTint, bar: C.amber, title: "Aggiornamento Gemini non completato", blocks: [{ text: "Questo PDF conserva soltanto le rilevazioni archiviate e ne indica la data. L'ultimo avvio non ha completato l'aggiornamento AI." }] });
      para("Misura: presenza nelle risposte Gemini tramite API con ricerca web. Non replica l'app Gemini e non rappresenta ChatGPT, AI Overviews o tutti i motori AI. Le risposte possono variare; una menzione non equivale a una raccomandazione.", 8.6, F.r, C.muted, 6);

      // ===== Fonti citate al posto di Solair =============================================
      const gaps = answers.filter(a => a.complete && a.intent === "non-brand" && !a.mentioned && !a.citedSolair);
      const byHost = new Map<string, { prompts: Set<string>; url: string }>();
      gaps.forEach(a => a.citations.forEach(c => {
        const host = citationHost(c); if (!host || host === "solairgroup.it" || host.endsWith(".solairgroup.it")) return;
        const entry = byHost.get(host) ?? { prompts: new Set<string>(), url: c.finalUrl ?? `https://${host}` }; entry.prompts.add(a.promptId); byHost.set(host, entry);
      }));
      const ranked = [...byHost].sort((a, b) => b[1].prompts.size - a[1].prompts.size || a[0].localeCompare(b[0])).slice(0, 10);
      if (gaps.length && ranked.length) {
        newPage();
        chapter("Dove si decide la visibilità", "Le fonti che Gemini cita al posto di Solair", `Siti citati nelle ${gaps.length} risposte spontanee in cui Solair non compare. Sono i luoghi in cui costruire presenza e prove pubbliche.`);
        const cols = [W - 212, 212 - 0];
        tableHeader([{ w: cols[0], label: "Sito citato" }, { w: cols[1], label: `Risposte in cui compare (su ${gaps.length})` }]);
        const max = Math.max(...ranked.map(r => r[1].prompts.size));
        ranked.forEach(([host, info], rank) => {
          const repeated = info.prompts.size >= 2 && rank < 3;
          tableRow(cols, [
            (x, yy, w) => put(host, x, yy, w, 9.6, repeated ? F.b : F.r, C.green, { link: safeUrl(info.url) ?? undefined, underline: true, lineBreak: false }),
            (x, yy, w) => { const bw = Math.max(10, ((w - 150) * info.prompts.size) / max); doc.roundedRect(x, yy + 1, bw, 9, 4.5).fill(repeated ? C.amber : "#B9D6C6"); put(String(info.prompts.size), x + bw + 8, yy, 40, 9.6, F.b, C.ink, { lineBreak: false }); if (repeated) put("da verificare per prima", x + bw + 22, yy + 1.5, 130, 7.4, F.i, C.amberDark, { lineBreak: false }); },
          ], 26);
        });
        y += 16;
        card({ tint: C.amberTint, bar: C.amber, tag: [{ label: "Prima di intervenire", fg: C.amberDark, bg: C.white }], title: "Un'assenza o una fonte citata non bastano da sole a motivare un intervento",
          blocks: SOURCE_CHECKS.map((text, i) => ({ label: `Verifica ${i + 1}`, text })), footer: ["Le citazioni sono quelle native del motore, con destinazione verificata. Le risposte possono cambiare da una raccolta all'altra."] });
      }

      // ===== 03 Piano di miglioramento ==================================================
      newPage();
      chapter("03 / Piano di miglioramento", "Gli interventi sostenuti dai dati", "Priorità sulle pagine e sui contenuti del sito. Nessuna modifica viene applicata automaticamente.");
      const brandQuery = (query: unknown) => typeof query === "string" && /solair/i.test(query);
      const actions = (data.opportunities ?? []).filter(a => typeof a.action === "string" && typeof a.page === "string")
        .map((a, index) => ({ a, index, rank: /lavora-con-noi/i.test(a.page) ? 2 : brandQuery(a.query) ? 1 : 0 }))
        .sort((x, y2) => x.rank - y2.rank || x.index - y2.index).map(item => item.a);
      if (!actions.length) para("Le evidenze disponibili non sostengono interventi prioritari in questa rilevazione. Questo non dimostra l'assenza di opportunità nel sito.");
      actions.forEach((a, index) => {
        const editorial = a.evidence?.basis === "opportunità";
        const high = a.priority === "high";
        const tags = [editorial ? { label: "Opportunità editoriale · da validare", fg: C.amberDark, bg: C.white } : high ? { label: "Priorità alta", fg: C.white, bg: C.green } : { label: "Priorità media", fg: C.blue, bg: C.white }];
        if (brandQuery(a.query)) tags.push({ label: "Ricerca sul marchio", fg: C.muted, bg: C.white });
        const facts = typeof a.evidence?.impressions === "number" ? `${formatInt(a.evidence.impressions)} impressioni, ${formatInt(Number(a.evidence.clicks ?? 0))} clic${a.query ? `; ricerca: ${a.query}` : ""}` : null;
        const sources = Array.isArray(a.evidence?.publicSources) ? (a.evidence.publicSources as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 4) : [];
        const blocks: { label?: string; text: string; link?: boolean }[] = [{ label: "Pagina", text: a.page }, { label: "Perché", text: reportText(a.interpretation) }];
        if (facts) blocks.push({ label: "Dati", text: facts });
        sources.forEach((s, i) => {
          const cut = s.indexOf(": "); const url = cut > 0 && /^https?:\/\//.test(s) ? s.slice(0, cut) : null;
          if (url) { blocks.push({ label: i === 0 ? "Riscontri" : undefined, text: url, link: true }); blocks.push({ text: s.slice(cut + 2).slice(0, 300) }); } else blocks.push({ label: i === 0 ? "Riscontri" : undefined, text: s.slice(0, 300) });
        });
        blocks.push({ label: "Intervento", text: reportText(a.action) }, { label: "Valore atteso", text: reportText(a.expectedOutcome) });
        card({ tint: editorial ? C.amberTint : index % 2 ? C.blueTint : C.pale, bar: editorial ? C.amber : high ? C.green : C.blue, tag: tags, title: `${index + 1}. ${a.title}`, blocks });
      });
      para("Per verificare l'esito degli interventi occorrono nuove rilevazioni con periodi e criteri comparabili. Non sono stimati incrementi garantiti di traffico, posizioni, richieste o citazioni AI.", 8.6, F.r, C.muted, 6);

      // ===== 04 Fonti e metodo ===========================================================
      newPage();
      chapter("04 / Fonti e metodo", "Come leggere questo report");
      sub("Search Console", 6);
      para(windows ? `Proprietà ${SITE_LABEL}. Dati dal ${formatPeriod(windows.current)}, confrontati con ${formatPeriod(windows.previous)}. I totali provengono dalle evidenze archiviate dell'analisi SEO indicata.` : "Periodo Google non disponibile.", 9.8);
      sub("Gemini e citazioni", 6);
      para(payload.geo ? `Campione di ${payload.geo.planned} domande. Sono contate soltanto risposte complete e citazioni native. I collegamenti non raggiunti o non risolti non confermano né smentiscono il contenuto della risposta. Le domande con nome Solair sono separate dalla scoperta spontanea.` : "Non sono presenti risposte Gemini nel documento. La presenza AI resta non misurata.", 9.8);
      const all = new Map<string, { prompts: Set<string>; url: string }>();
      answers.forEach(a => a.citations.forEach(c => { const host = citationHost(c); if (!host) return; const e = all.get(host) ?? { prompts: new Set<string>(), url: c.finalUrl ?? `https://${host}` }; e.prompts.add(a.promptId); all.set(host, e); }));
      if (all.size) {
        sub("Siti citati dal motore", 6);
        [...all].sort((a, b) => b[1].prompts.size - a[1].prompts.size || a[0].localeCompare(b[0])).slice(0, 10)
          .forEach(([host, e]) => link(`${host}${host === "solairgroup.it" || host.endsWith(".solairgroup.it") ? " (sito ufficiale)" : ""}  -  citato in ${e.prompts.size} ${e.prompts.size === 1 ? "risposta" : "risposte"}`, e.url, M, W, 9));
        y += 4;
      }
      link("Apri l'analisi SEO archiviata nell'app", `https://solair-seo.vercel.app/analisi?id=${report.id}`);
      link("Consulta risposte integrali e storico Gemini nell'app", "https://solair-seo.vercel.app/visibilita-ai");
      y += 4; sub("Limiti delle fonti", 6);
      (data.limitations ?? []).forEach(note => para(`-  ${note}`, 8.8, F.r, C.muted, 4));
      para("Le soglie editoriali o tecniche del servizio non sono requisiti imposti da Google. Nessun punteggio globale nuovo viene dedotto automaticamente dai soli risultati di questo documento.", 8.6, F.r, C.muted, 0);

      // ===== Piè di pagina ===============================================================
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.moveTo(M, PH - 50).lineTo(M + W, PH - 50).lineWidth(0.6).strokeColor(C.line).stroke();
        put(`Solair Group  |  ${SITE_LABEL}  |  ${formatDate(new Date(payload.generatedAt))}`, M, PH - 38, W - 70, 8, F.r, C.muted, { lineBreak: false });
        put(`${i + 1} / ${range.count}`, PW - M - 54, PH - 38, 54, 8, F.r, C.muted, { align: "right", lineBreak: false });
      }
      doc.end();
    } catch (error) { doc.destroy(); reject(error); }
  });
}
