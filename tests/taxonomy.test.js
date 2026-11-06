import {test} from 'node:test';
import assert from 'node:assert/strict';
import {categories,classifyProducts} from '../src/showroom/taxonomy.js';
test('jewellery categories stay independent from collection',()=>{
 const products=[{id:'r',universe:'rivages',category:'Bagues'},{id:'e',universe:'horizon',category:'Bracelets'},{id:'g',universe:'galets',category:'Bracelets'}];
 assert.equal(categories.length,4);assert(categories.some(c=>c.name==='Colliers & pendentifs'));assert(!categories.some(c=>c.name==='Joncs'));
 assert.deepEqual(classifyProducts(products,{type:'Bracelets'}).map(p=>p.id),['e','g']);
 assert.deepEqual(classifyProducts(products,{collection:'galets',type:'Bracelets'}).map(p=>p.id),['g']);
 assert.deepEqual(classifyProducts(products,{collection:'rivages',type:'Bracelets'}),[]);
});
