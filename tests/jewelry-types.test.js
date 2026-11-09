import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JEWELRY_TYPES,jewelryTypeOf,dimensionFields} from '../src/workshop/jewelry-types.js';
import {productionOf} from '../src/workshop/production-model.js';
import {safeProduction,validateProject} from '../lib/workshop-policy.js';
import {emptyPresentation} from '../src/publication/model.js';

test('existing pieces remain unclassified unless an explicit type or ring size is available',()=>{
 assert.equal(jewelryTypeOf({name:'Bague test'}),'');
 const piece={production:{dimensions:{ringSize:'54',length:'40'},header:{revision:'C'}}};
 const before=JSON.stringify(piece);
 assert.equal(jewelryTypeOf(piece),'ring');
 const production=safeProduction(productionOf(piece));
 assert.equal(production.dimensions.ringSize,'54');assert.equal(production.dimensions.length,'40');
 assert.equal(production.header.revision,'C');assert.equal(JSON.stringify(piece),before);
});

test('all jewelry types survive server validation and prefill the matching public category',()=>{
 for(const type of JEWELRY_TYPES){
  const production=productionOf({});production.header.jewelryType=type.id;
  Object.keys(production.dimensions).forEach(key=>production.dimensions[key]='saved '+key);
  const saved=safeProduction(production);
  assert.deepEqual(saved,production);
  assert.equal(emptyPresentation({id:'example',name:'Test',production:saved}).category,type.category);
  assert.equal(dimensionFields(type.id).some(([key])=>key==='ringSize'),type.id==='ring');
 }
 const production=productionOf({});production.header.jewelryType='invalid';assert.throws(()=>safeProduction(production));
 assert.equal(emptyPresentation({id:'example',name:'Test'}).category,'');
});

test('fabrication participants cannot change jewelry type or design measurements',()=>{
 const production=productionOf({});production.header.jewelryType='bracelet';production.dimensions.circumference='170';
 const old={payload:{name:'Bracelet test',status:'Recherche',production},collection_id:'00000000-0000-4000-8000-000000000001',assignees:[],client_emails:[],published:false};
 const changed=structuredClone(production);changed.header.jewelryType='ring';changed.dimensions.circumference='190';changed.metal.actualWeight='8';
 const result=validateProject({status:'Recherche',production:changed},old,{role:'participant'});
 assert.equal(result.payload.production.header.jewelryType,'bracelet');
 assert.equal(result.payload.production.dimensions.circumference,'170');
 assert.equal(result.payload.production.metal.actualWeight,'8');
});
