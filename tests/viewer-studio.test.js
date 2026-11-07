import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {frameStudioCamera,smoothStudioStl} from '../src/viewer/studio.js';

test('studio framing keeps broad, tall and deep pieces visible through a full turn, including portrait fullscreen',()=>{
 for(const dimensions of [[20,20,4],[80,5,2],[3,60,4],[5,8,70],[.002,.001,.0001]])for(const aspect of [1,390/844,1440/900]){
  const size=new THREE.Vector3(...dimensions),half=size.clone().multiplyScalar(1.5/Math.max(...dimensions));
  const camera=new THREE.PerspectiveCamera(32,1,.01,1000);
  const controls={target:new THREE.Vector3(),update(){camera.lookAt(this.target);camera.updateMatrixWorld();}};
  const distance=frameStudioCamera(camera,controls,size,aspect);
  assert(distance>controls.minDistance&&distance<controls.maxDistance);
  // Check projected vertices at many angles, rather than repeating the fit calculation.
  for(let angle=0;angle<Math.PI*2;angle+=.07)for(const x of [-half.x,half.x])for(const y of [-half.y,half.y])for(const z of [-half.z,half.z]){
   const ndc=new THREE.Vector3(x,y,z).applyAxisAngle(new THREE.Vector3(0,1,0),angle).project(camera);
   assert(Math.abs(ndc.x)<.82&&ndc.y<.97&&ndc.y>-.67&&ndc.z>-1&&ndc.z<1,`Clipped ${dimensions} at aspect ${aspect}`);
  }
 }
});

test('STL smoothing preserves exact vertices and sharp edges at millimetre and metre scales',()=>{
 for(const scale of [1,.00001,1000]){
  const geometry=new THREE.BoxGeometry(2,1,1).toNonIndexed();geometry.scale(scale,scale,scale);
  const positions=geometry.getAttribute('position'),before=positions.array.slice(),normals=geometry.getAttribute('normal').array.slice();
  smoothStudioStl(geometry);
  assert.equal(geometry.getAttribute('position'),positions);
  assert.deepEqual(positions.array,before);
  assert.deepEqual(geometry.getAttribute('normal').array,normals);
  geometry.dispose();
 }
});

test('STL curves receive smooth normals without rounding their geometry',()=>{
 const geometry=new THREE.TorusGeometry(10,2,16,64).toNonIndexed();
 const positions=geometry.getAttribute('position').array.slice();geometry.deleteAttribute('normal');
 smoothStudioStl(geometry);
 const normals=geometry.getAttribute('normal');
 assert.deepEqual(geometry.getAttribute('position').array,positions);
 for(let i=0;i<normals.count;i++)assert(Math.abs(new THREE.Vector3().fromBufferAttribute(normals,i).length()-1)<1e-5);
 // At least two normals within a triangle differ: the torus is shaded as a curve.
 assert(new THREE.Vector3().fromBufferAttribute(normals,0).distanceTo(new THREE.Vector3().fromBufferAttribute(normals,1))>.001);
 geometry.dispose();
});
