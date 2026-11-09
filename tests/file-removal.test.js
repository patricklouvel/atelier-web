import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withoutFile,presentationUsesFile} from '../src/workshop/file-removal.js';
import {productionDefaults} from '../src/workshop/production-model.js';

test('file deletion clears its cover, casting and QC references without changing other files',()=>{
 const production=productionDefaults();production.casting={fileId:'remove',fileVersion:'V2',approvedBy:'Founder',approvedAt:'date',treeIntegrated:true};
 production.modelApprovedBy='Admin';production.modelApprovedAt='date';
 production.controls=[{id:'qc',photoId:'remove',result:'Conforme',validatedAt:'date',validatedBy:'Admin'},{id:'keep',photoId:'photo',result:'Conforme'}];
 const piece={files:[{id:'remove',image:true,approved:true},{id:'photo',image:true},{id:'model'}],cover:'remove',production};
 const before=JSON.stringify(piece),clean=withoutFile(piece,'remove');
 assert.deepEqual(clean.files.map(f=>f.id),['photo','model']);assert.equal(clean.cover,'photo');
 assert.equal(clean.production.casting.fileId,'');assert.equal(clean.production.casting.approvedAt,'');
 assert.equal(clean.production.controls[0].photoId,'');assert.equal(clean.production.controls[0].result,'À contrôler');
 assert.equal(clean.production.controls[1].photoId,'photo');assert.equal(clean.production.modelApprovedAt,'');
 assert.equal(JSON.stringify(piece),before);
 assert.equal(withoutFile({files:[{id:'only',image:true}],cover:'only'},'only').cover,'');
});
test('both saved draft and published gallery/model references protect a file from deletion',()=>{
 assert(presentationUsesFile({draft:{gallery:[{fileId:'photo'}]}},'photo'));
 assert(presentationUsesFile({live:{modelId:'model'}},'model'));
 assert(!presentationUsesFile(null,'file'));assert(!presentationUsesFile({draft:{gallery:[{fileId:'other'}]}},'file'));
});
