import * as cheerio from "cheerio";

export type SiteContent = {
  text: string;
  headings: { level: number; text: string }[];
  links: { url: string; label: string }[];
  questions: string[];
  ids: string[];
  forms: number;
  frames: string[];
};
const clean = (value: string) => value.replace(/\s+/g, " ").trim();

export function extractSiteContent(html: string, url: string): SiteContent {
  const $ = cheerio.load(html);
  const ids = [...new Set($("[id]").map((_, node) => $(node).attr("id") ?? "").get())].slice(0, 300);
  const frames = $("iframe[src]").map((_, node) => $(node).attr("src") ?? "").get().slice(0, 10);
  const forms = $("form").length;
  const declaredQuestions: string[] = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const pending: unknown[] = [JSON.parse($(element).text())];
      let visited = 0;
      while (pending.length && visited++ < 2000) {
        const item = pending.pop();
        if (!item || typeof item !== "object") continue;
        if (Array.isArray(item)) { pending.push(...item); continue; }
        const record = item as Record<string, unknown>;
        if ([record["@type"]].flat().includes("Question") && typeof record.name === "string") declaredQuestions.push(clean(record.name));
        pending.push(...Object.values(record));
      }
    } catch { /* Malformed structured data is not evidence of a question. */ }
  });
  $("script,style,noscript,template,svg,nav,footer,header,[hidden],[aria-hidden=true]").remove();
  const root = $("main").length ? $("main").first() : $("body");
  const headings = root.find("h1,h2,h3").map((_, node) => ({ level: Number(node.tagName.slice(1)), text: clean($(node).text()).slice(0, 220) })).get().filter(item => item.text);
  const links: SiteContent["links"] = [];
  root.find("a[href]").each((_, node) => {
    try {
      const target = new URL($(node).attr("href")!, url);
      if (!/^https?:$/.test(target.protocol) || target.username || target.password) return;
      const label = clean($(node).attr("aria-label") || $(node).text()).slice(0, 180);
      if (!links.some(item => item.url === target.href && item.label === label)) links.push({ url: target.href, label });
    } catch { /* Invalid public link: not followed. */ }
  });
  const text = clean(root.text()).slice(0, 24000);
  const questions = [...new Set([...root.find("button,summary,h2,h3,[role=button]").map((_, node) => clean($(node).text()).slice(0, 250)).get(), ...declaredQuestions.filter(question => text.includes(question))].filter(text => text.includes("?") && text.length < 230))].slice(0, 30);
  return { text, headings: headings.slice(0, 50), links: links.slice(0, 120), questions, ids, forms, frames };
}
