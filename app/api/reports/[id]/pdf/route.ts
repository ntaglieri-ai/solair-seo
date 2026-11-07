import { getDocumentFileName, getReportDocument } from "../../../../../lib/report-documents/store";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params,document=await getReportDocument(id,true);
    if(!document?.pdf)return new Response("Report PDF non disponibile",{status:404,headers:{"Cache-Control":"no-store"}});
    return new Response(new Uint8Array(document.pdf),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${await getDocumentFileName(document)}"`,"Content-Length":String(document.pdf.length),"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","ETag":`"${document.sha256}"`}});
  }catch{return new Response("PDF temporaneamente non disponibile",{status:503,headers:{"Cache-Control":"no-store"}});}
}
