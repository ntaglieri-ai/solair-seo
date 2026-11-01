import test from 'node:test';
import assert from 'node:assert/strict';
import {keywordRows,normalizeQuery,parseCsv,backlinkRows,backlinkChanges,validateObservation,publicUrl,validDate} from '../lib/free-research.ts';
test('keyword totals use query-only Google rows, never the sum of query/page impressions',()=>{
  const row={keys:['Solair Group'],clicks:12,impressions:100,position:4,ctr:.12};
  const evidence={gsc:{current:{queries:[row],queryPages:[{...row,keys:['Solair Group','https://solairgroup.it/']},{...row,keys:['Solair Group','https://solairgroup.it/faq']}]},previous:{queries:[]}}};
  const result=keywordRows(evidence,['solair group','fotovoltaico con accumulo']);
  assert.equal(result.find(r=>r.query==='solair group').current.impressions,100);
  assert.equal(result.find(r=>r.query==='solair group').pages.length,2);
  assert.equal(result.find(r=>r.query==='fotovoltaico con accumulo').current,null);
  assert.equal(result.find(r=>r.query==='solair group').previous,null);
  assert.equal(normalizeQuery('  Solair   GROUP '),'solair group');
});
test('CSV supports BOM, semicolon, quoted multiline values, escaped quotes and deduplication',()=>{
  assert.deepEqual(parseCsv('a,b\r\n"x,y","two\nlines"\r\n"a""b",c'),[['a','b'],['x,y','two\nlines'],['a"b','c']]);
  const links=backlinkRows('\uFEFFPagina con link;Pagina di destinazione\nhttps://example.com/page#fragment;https://solairgroup.it/\nhttps://example.com/page;https://solairgroup.it/');
  assert.equal(links.length,1);assert.equal(links[0].domain,'example.com');
  assert.equal(backlinkRows('Linking page,Last crawled\nhttps://example.com/a,2026-10-01')[0].target,null);
});
test('CSV rejects wrong reports, unsafe URLs, internal links, off-site targets, malformed input and excessive size',()=>{
  for(const csv of ['Domain,Links\nexample.com,2','source_url\njavascript:alert(1)','source_url\nhttps://solairgroup.it/','source_url,target_url\nhttps://example.com/,https://other.com/','source_url\n"https://example.com/','source_url,target_url\nhttps://example.com/'])assert.throws(()=>backlinkRows(csv));
  assert.throws(()=>parseCsv('x'.repeat(1_000_001)));
  assert.throws(()=>backlinkRows('source_url\n'+Array(5001).fill('https://example.com/').join('\n')));
  for(const url of ['file:///etc/passwd','http://127.0.0.1','https://user:pass@example.com/','https://example.com:444/','https://host.local/'])assert.throws(()=>publicUrl(url));
});
test('export differences describe samples and require compatible target availability',()=>{
  const a=backlinkRows('source_url\nhttps://example.com/a'),b=backlinkRows('source_url\nhttps://example.com/b');
  const d=backlinkChanges(a,b);assert.equal(d.comparable,true);assert.equal(d.added.length,1);assert.equal(d.missing.length,1);
  assert.equal(backlinkChanges(a,null).comparable,false);
  assert.equal(backlinkChanges(a,[{...b[0],target:'https://solairgroup.it/'}]).comparable,false);
});
test('AI observations require a dated actual response; brand mention and declared site source are distinct',()=>{
  const observation={engine:'ChatGPT',date:'2026-11-01',question:'Quali aziende installano fotovoltaico in Italia?',context:'Italia · nuova conversazione',answer:'Non conosco Solair Group; non posso raccomandare un installatore senza verifiche.',sources:'',evidenceUrl:''};
  const a=validateObservation(observation,'2026-11-01');assert.equal(a.mentionsBrand,true);assert.equal(a.citesSite,false);
  assert.equal(validateObservation({...observation,answer:'È utile confrontare più installatori con un preventivo dettagliato.',sources:'https://solairgroup.it/'},'2026-11-01').citesSite,true);
  for(const patch of [{engine:'invented'},{date:'2027-01-01'},{date:'2026-02-30'},{question:''},{answer:''},{context:''},{sources:'javascript:bad'}])assert.throws(()=>validateObservation({...observation,...patch},'2026-11-01'));
  assert.equal(validDate('2026-02-30','2026-11-01'),false);
});
