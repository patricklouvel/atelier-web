import {test} from 'node:test';
import assert from 'node:assert/strict';
import {productionOf,castingReady,newOperation,newControl,validateOperation,validateControl} from '../src/workshop/production-model.js';
test('old pieces acquire production fields without modifying their existing data',()=>{
 const old={name:'Rivages',files:[{id:'keep'}]};const p=productionOf(old);assert.equal(p.header.revision,'A');assert.equal(p.metal.theoreticalWeight,'');assert.deepEqual(p.operations,[]);assert.equal(old.production,undefined);assert.equal(old.files[0].id,'keep');
 const partial=productionOf({production:{header:{revision:'C'},metal:{lot:'METAL-44'},stones:[{id:'stone-1',type:'Diamant'}]}});
 assert.equal(partial.header.revision,'C');assert.equal(partial.header.quantity,'1');assert.equal(partial.metal.lot,'METAL-44');assert.equal(partial.stones[0].type,'Diamant');
});
test('casting validation is tied to the exact STL version and becomes stale',()=>{
 const p=productionOf({});const files=[{id:'stl',name:'RIV-001.stl',version:'V2'}];
 p.casting={fileId:'stl',fileVersion:'V2',treeIntegrated:true,approvedBy:'Fondeur',approvedAt:'2026-11-06'};
 assert(castingReady(p,files));assert(!castingReady(p,[{...files[0],version:'V3'}]));assert(!castingReady(p,[]));assert(!castingReady(p,[{...files[0],name:'render.png'}]));
 p.casting.treeIntegrated=false;assert(!castingReady(p,files));
});
test('operation and QC approvals require traceable operator and date',()=>{
 const op=newOperation('Fonte');assert.throws(()=>validateOperation(op,'Admin'));
 op.operator='Atelier A';op.date='2026-11-06';op.weightIn='3.8';op.weightOut='3.6';const valid=validateOperation(op,'Fondeur');assert.equal(valid.status,'Validée');assert.equal(valid.weightIn,'3.8');assert.equal(valid.validatedBy,'Fondeur');assert(valid.validatedAt);assert.equal(op.status,'À faire');
 const qc=newControl('Poids final');assert.throws(()=>validateControl(qc,'Admin'));qc.operator='Contrôleur';qc.date='2026-11-06';assert.equal(validateControl(qc,'Admin').result,'Conforme');
});
