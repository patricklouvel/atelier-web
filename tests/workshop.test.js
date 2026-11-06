import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed,STAGES,visiblePieces,visibleFiles,changeStage} from '../src/workshop/model.js';
test('piece visibility follows assignment and client publication independently',()=>{
 const data=seed();assert.equal(visiblePieces(data,'admin').length,2);
 assert.deepEqual(visiblePieces(data,'team','founder').map(p=>p.id),['rivage-ring']);
 assert.deepEqual(visiblePieces(data,'team','workshop'),[]);
 assert.deepEqual(visiblePieces(data,'client').map(p=>p.id),['onde-ring']);
});
test('private files are excluded from both external views',()=>{
 const p=seed().pieces[0];assert.equal(visibleFiles(p,'admin').length,2);
 assert.deepEqual(visibleFiles(p,'team').map(f=>f.id),['ring']);assert.deepEqual(visibleFiles(p,'client'),[]);
});
test('stage changes preserve the piece and append attributable history',()=>{
 const p=seed().pieces[0];const changed=changeStage(p,'Prototype','Fondeur');
 assert.equal(p.status,'Modélisation');assert.equal(changed.status,'Prototype');
 assert.equal(changed.history[0].author,'Fondeur');assert.equal(changed.files,p.files);
 assert.equal(changeStage(changed,'Prototype'),changed);assert.throws(()=>changeStage(p,'invalid'));assert.equal(STAGES.length,7);
});
