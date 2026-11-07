import * as THREE from 'three';
import {toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';

export function smoothStudioStl(geometry) {
 geometry.computeBoundingBox();
 const size=geometry.boundingBox.getSize(new THREE.Vector3()),extent=Math.max(size.x,size.y,size.z);
 if(!Number.isFinite(extent)||extent<=0)return geometry;
 // Normal calculation uses a fixed positional tolerance. Work at a consistent
 // scale, then restore the exact authored vertices (STL units are unspecified).
 const positions=geometry.getAttribute('position'),scaled=positions.clone();
 for(let i=0;i<scaled.array.length;i++)scaled.array[i]*=1000/extent;
 geometry.setAttribute('position',scaled);
 try{toCreasedNormals(geometry,Math.PI/4);}
 finally{geometry.setAttribute('position',positions);}
 return geometry;
}

// Large luminous cards give polished metal readable highlights and dark edges.
// This environment is generated locally; it needs no external HDRI download.
export function createStudioEnvironment(renderer) {
 const studio=new THREE.Scene();
 studio.background=new THREE.Color('#555954');
 const geometry=new THREE.PlaneGeometry(1,1),materials=[];
 const card=(position,width,height,intensity,tint='#ffffff')=>{
  const material=new THREE.MeshBasicMaterial({color:new THREE.Color(tint).multiplyScalar(intensity),side:THREE.DoubleSide});
  const light=new THREE.Mesh(geometry,material);
  light.position.set(...position);light.scale.set(width,height,1);light.lookAt(0,0,0);
  studio.add(light);materials.push(material);
 };
 card([-5,4,3],4,7,5.5,'#fff8eb');
 card([5,2,-2],2,6,4,'#f3f6ff');
 card([0,7,0],5,4,4.5);
 card([0,1,-6],3,5,2.5);
 const pmrem=new THREE.PMREMGenerator(renderer);
 try{return pmrem.fromScene(studio,.035,.1,30);}
 finally{geometry.dispose();materials.forEach(material=>material.dispose());pmrem.dispose();}
}

export function addStudioLighting(scene) {
 scene.environmentIntensity=1;
 scene.add(new THREE.HemisphereLight(0xfffaf0,0x858b91,.6));
 const key=new THREE.DirectionalLight(0xfff7e8,2.2);
 key.position.set(-3,9,5);key.castShadow=true;
 key.shadow.mapSize.set(1024,1024);
 Object.assign(key.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.1,far:20});
 key.shadow.normalBias=.025;key.shadow.bias=-.0002;key.shadow.radius=5;
 const rim=new THREE.DirectionalLight(0xe7efff,.9);rim.position.set(4,3,-5);
 scene.add(key,rim);
 return ()=>key.shadow.dispose();
}

export function createStudioGround(size) {
 const extent=Math.max(size.x,size.y,size.z),floor=-size.y/extent*1.5-.04;
 const ground=new THREE.Group();
 const receiver=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({color:0x41382c,opacity:.08,depthWrite:false}));
 receiver.rotation.x=-Math.PI/2;receiver.position.y=floor;receiver.receiveShadow=true;ground.add(receiver);
 // A faint contact shadow keeps fine, open jewellery grounded on the backdrop.
 const resolution=96,data=new Uint8Array(resolution*resolution*4);
 for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++){
  const i=(y*resolution+x)*4,distance=((x/(resolution-1)-.5)**2+(y/(resolution-1)-.5)**2)*4;
  data[i]=70;data[i+1]=57;data[i+2]=41;data[i+3]=Math.round(Math.max(0,Math.exp(-distance*5)-Math.exp(-5))*90);
 }
 const texture=new THREE.DataTexture(data,resolution,resolution);texture.needsUpdate=true;
 const contact=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(size.x/extent*3,1.5)*1.7,Math.max(size.z/extent*3,1)*1.7),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}));
 contact.rotation.x=-Math.PI/2;contact.position.y=floor+.002;ground.add(contact);
 return ground;
}

// A camera-facing backdrop is also visible through GLB transmission materials.
// A CSS background alone would leave transparent stones without this light field.
export function createStudioBackdrop(camera) {
 const resolution=128,data=new Uint8Array(resolution*resolution*4);
 const colors=[[255,253,249],[244,239,229],[231,223,209]];
 for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++){
  const radius=Math.min(1,Math.hypot((x/(resolution-1)-.48)*1.6,(y/(resolution-1)-.64)*1.6));
  const segment=radius<.53?0:1,t=segment===0?radius/.53:(radius-.53)/.47,i=(y*resolution+x)*4;
  for(let c=0;c<3;c++)data[i+c]=Math.round(colors[segment][c]*(1-t)+colors[segment+1][c]*t);
  data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,resolution,resolution);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;
 const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));
 backdrop.position.z=-100;backdrop.frustumCulled=false;camera.add(backdrop);
 return backdrop;
}

// Fit the normalized model through a full turn, including on narrow screens.
// The bottom margin also leaves the toolbar clear of the piece.
export function frameStudioCamera(camera,controls,size,aspect) {
 const half=size.clone().multiplyScalar(1.5/Math.max(size.x,size.y,size.z));
 const direction=new THREE.Vector3(.8,.36,1).normalize();
 const right=new THREE.Vector3().crossVectors(camera.up,direction).normalize();
 const up=new THREE.Vector3().crossVectors(direction,right);
 const tanY=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanX=tanY*aspect;
 let distance=0;
 for(let angle=0;angle<Math.PI*2;angle+=Math.PI/12){
  for(const x of [-half.x,half.x])for(const y of [-half.y,half.y])for(const z of [-half.z,half.z]){
   const corner=new THREE.Vector3(x*Math.cos(angle)+z*Math.sin(angle),y,-x*Math.sin(angle)+z*Math.cos(angle));
   distance=Math.max(distance,corner.dot(direction)+1.3*Math.max(Math.abs(corner.dot(right))/tanX,Math.abs(corner.dot(up))/tanY));
  }
 }
 camera.aspect=aspect;camera.setViewOffset(aspect,1,0,.075,aspect,1);camera.position.copy(direction.multiplyScalar(distance));
 controls.target.set(0,0,0);controls.minDistance=half.length()*.85;controls.maxDistance=distance*2.5;
 camera.updateProjectionMatrix();controls.update();
 return distance;
}
