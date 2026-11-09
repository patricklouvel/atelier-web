import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateFile,MAX_FILE_SIZE} from '../src/workshop/file-formats.js';
import {uploadMetadata} from '../lib/workshop-policy.js';

test('images, STL, Blender and 3MF files are accepted in both the interface and online workshop',()=>{
 for(const name of ['photo.JPG','rendu.png','image.webp','piece.STL','source.blend','impression.3MF','modele.glb']){
  const file={name,size:120};assert.doesNotThrow(()=>validateFile(file));
  const metadata=uploadMetadata(file,'admin');assert.equal(metadata.name,name);
  assert.equal(metadata.audience,'private');assert.equal(metadata.approved,false);
  assert.equal(metadata.image,/\.(jpg|png|webp)$/i.test(name));
 }
});
test('invalid and oversized attachments fail before transfer and on the server',()=>{
 for(const file of [{name:'script.html',size:10},{name:'piece.blend',size:MAX_FILE_SIZE+1},{name:'empty.3mf',size:0}]){
  assert.throws(()=>validateFile(file));assert.throws(()=>uploadMetadata(file,'admin'));
 }
});
