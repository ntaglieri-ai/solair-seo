import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import http from "node:http";
import https from "node:https";
import * as cheerio from "cheerio";

const blocked = new BlockList();
for (const [ip, prefix] of [["0.0.0.0",8],["10.0.0.0",8],["100.64.0.0",10],["127.0.0.0",8],["169.254.0.0",16],["172.16.0.0",12],["192.0.0.0",24],["192.0.2.0",24],["192.168.0.0",16],["198.18.0.0",15],["198.51.100.0",24],["203.0.113.0",24],["224.0.0.0",4],["240.0.0.0",4]] as const) blocked.addSubnet(ip,prefix,"ipv4");
const publicV6 = new BlockList(); publicV6.addSubnet("2000::",3,"ipv6");
const blockedV6 = new BlockList(); blockedV6.addSubnet("2001:db8::",32,"ipv6"); blockedV6.addSubnet("2002::",16,"ipv6");
export function publicSourceAddress(address: string) {
  return isIP(address) === 4 ? !blocked.check(address,"ipv4") : isIP(address) === 6 && publicV6.check(address,"ipv6") && !blockedV6.check(address,"ipv6");
}
export function sourceUrl(raw: string): URL {
  const url = new URL(raw);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.port || isIP(url.hostname.replace(/^\[|\]$/g,"")) || !url.hostname.includes(".") || /(?:^|\.)(localhost|local|internal|test|invalid)$/.test(url.hostname)) throw Error("blocked");
  return url;
}
export type SourceCheck = { verification: "reachable" | "unreachable" | "blocked"; finalUrl: string; httpStatus: number | null; pageTitle: string; excerpt: string; checkedAt: string };
/** Download limitato, DNS verificato e fissato alla connessione, nessun cookie o JS. */
export async function checkSource(raw: string): Promise<SourceCheck> {
  const checkedAt = new Date().toISOString();
  let current = raw, status: number | null = null;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(Error("timeout")); }, 10000); });
  try {
    return await Promise.race([timeout, (async () => {
      for (let hop=0; hop<6; hop++) {
        if (controller.signal.aborted) throw Error("timeout");
        const url = sourceUrl(current);
        const addresses = await lookup(url.hostname,{all:true});
        if (!addresses.length || addresses.some(entry => !publicSourceAddress(entry.address))) throw Error("blocked");
        if (controller.signal.aborted) throw Error("timeout");
        const address = addresses[0];
        const response = await new Promise<{status:number;location:string|undefined;html:string}>((resolve,reject) => {
          const request = (url.protocol === "https:" ? https : http).get(url, {
            signal: controller.signal, agent:false, family:address.family,
            lookup: (_hostname,_options,callback) => callback(null,address.address,address.family),
            headers:{"User-Agent":"SolairSEO-SourceCheck/1.0","Accept":"text/html,application/xhtml+xml","Accept-Encoding":"identity"},
          }, incoming => {
            const status = incoming.statusCode ?? 0;
            if ([301,302,303,307,308].includes(status)) { incoming.resume();resolve({status,location:incoming.headers.location,html:""});return; }
            if (!String(incoming.headers["content-type"]).includes("html")) { incoming.resume();resolve({status,location:undefined,html:""});return; }
            const buffers:Buffer[]=[];let bytes=0;
            incoming.on("data", chunk => {
              bytes+=chunk.length;
              if(bytes>512000){incoming.destroy();resolve({status,location:undefined,html:Buffer.concat(buffers).toString("utf8")});}
              else buffers.push(chunk);
            });
            incoming.on("end",()=>resolve({status,location:undefined,html:Buffer.concat(buffers).toString("utf8")}));
            incoming.on("error",reject);
          });request.on("error",reject);
        });
        status=response.status;
        if(response.location){current=new URL(response.location,url).href;continue;}
        const $=cheerio.load(response.html);const title=$("title").first().text().trim();
        $("script,style,nav,footer,header,noscript,svg").remove();
        const root=$("main").length?$("main").first():$("body");
        return {verification:status>=200&&status<300?"reachable" as const:"unreachable" as const,finalUrl:url.href,httpStatus:status,
          pageTitle:title,excerpt:root.text().replace(/\s+/g," ").trim().slice(0,12000),checkedAt};
      }
      throw Error("redirect_limit");
    })()]);
  } catch(error) {
    return {verification:error instanceof Error && error.message === "blocked" ? "blocked" : "unreachable",finalUrl:current,httpStatus:status,pageTitle:"",excerpt:"",checkedAt};
  } finally { if(timer)clearTimeout(timer);controller.abort(); }
}
