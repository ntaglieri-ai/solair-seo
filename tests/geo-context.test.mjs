import test from 'node:test';
import assert from 'node:assert/strict';
import { relatedGeoGaps } from '../lib/geo/seo-context.ts';
const action={title:'Valorizzare il configuratore',page:'/configuratore',query:'preventivo fotovoltaico'};
const answer={promptId:'configurator',question:'Quali configuratori?',intent:'non-brand',complete:true,mentioned:false,citedSolair:false,citations:[{verification:'reachable'}]};
test('topic links use evidence only and never infer a cause or include incomplete responses',()=>{
 assert.deepEqual(relatedGeoGaps(action,[answer]),['Quali configuratori?']);
 for(const patch of [{complete:false},{mentioned:true},{citedSolair:true},{intent:'brand'},{citations:[{verification:'not_verified'}]}])assert.deepEqual(relatedGeoGaps(action,[{...answer,...patch}]),[]);
 assert.deepEqual(relatedGeoGaps({...action,page:'/lavora-con-noi',title:'Lavoro',query:'posizioni aperte'},[answer]),[]);
});
