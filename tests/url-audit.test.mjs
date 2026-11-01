import test from 'node:test';
import assert from 'node:assert/strict';
import {extractSiteContent} from '../lib/site-content.ts';
import {analyzePublicUrl} from '../lib/url-audit.ts';

function page(path,text,h1='Fotovoltaico per privati e aziende in tutta Italia',links=[]){return {url:'https://solairgroup.it'+path,status:200,score:90,title:h1,description:'',canonical:'',noindex:false,issues:[],content:{h1:[h1],words:100,internalLinks:links.length,schemaTypes:[]},profile:{text,links,headings:[{level:1,text:h1}],questions:[],ids:[],forms:0,frames:[]}};}
test('public content extraction reads content, links and real visible questions rather than navigation or scripts',()=>{
  const data=extractSiteContent('<html><body><nav>ignore menu</nav><main><h1>Fotovoltaico</h1><p>Risposta reale.</p><div>Quanto costa?</div><a href="/contatti">Consulenza</a><script type="application/ld+json">{"@type":"Question","name":"Quanto costa?"}</script><script>privateScript()</script></main><footer>ignore footer</footer></body></html>','https://solairgroup.it/');
  assert.match(data.text,/Risposta reale/);assert.doesNotMatch(data.text,/ignore|privateScript/);
  assert.deepEqual(data.questions,['Quanto costa?']);assert.equal(data.links[0].url,'https://solairgroup.it/contatti');
});
test('site-wide findings are supported by cross-page evidence and do not assert which financial claim is correct',()=>{
  const home=page('/','La nostra comunità CER condivide energia a 9,6 cent/kWh.',undefined,[{label:'Entra nella nostra CER',url:'https://solairgroup.it/contatti'}]);
  const faq=page('/faq','Come funziona la CER? Energia condivisa a 5 cent/kWh.','FAQ');
  const missing={...page('/contatti',''),status:404,score:null};
  const result=analyzePublicUrl({pages:[home,faq,missing],complete:true,sitemapFound:true,gsc:{clicks:999999}});
  assert.ok(result.findings.some(item=>item.id==='contact:/contatti'&&item.evidence[0].url===home.url));
  const consistency=result.findings.find(item=>item.id==='cer-consistency');assert.equal(consistency.evidence.length,2);assert.match(consistency.observation,/non consente.*stabilire/);
  assert.ok(result.findings.some(item=>item.id==='audience-content'&&item.basis==='opportunità'));
  assert.equal(result.areas.length,5);assert.doesNotMatch(JSON.stringify(result),/999999/);
});
test('duplicate statements on one page do not become a cross-page inconsistency; dedicated service content removes the audience gap',()=>{
  const result=analyzePublicUrl({pages:[page('/','CER 5 cent/kWh. CER 5 cent/kWh.'),page('/impianti-aziende','Impianti per imprese','Fotovoltaico per aziende')],complete:false,sitemapFound:true});
  assert.equal(result.findings.some(item=>item.id==='cer-consistency'),false);
  assert.equal(result.findings.some(item=>item.id==='audience-content'),false);assert.equal(result.scope.complete,false);
});
test('failed or legacy HTML never becomes a fabricated overall assessment',()=>{
  const result=analyzePublicUrl({pages:[{...page('/',''),status:503,profile:undefined}],complete:false,sitemapFound:false});
  assert.equal(result.scope.readable,0);assert.match(result.headline,/non consente/);assert.equal(result.findings.length,0);
});
