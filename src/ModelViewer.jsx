import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RotateCcw,Scan,Grid2X2,Maximize,Box,Pause,Play,Layers } from 'lucide-react';

export default function ModelViewer({file,files=[]}) {
  const host=useRef(null),engine=useRef(null);
  const [state,setState]=useState('loading'),[message,setMessage]=useState(''),[rotate,setRotate]=useState(false),[wire,setWire]=useState(false),[grid,setGrid]=useState(true),[info,setInfo]=useState(null),[playing,setPlaying]=useState(true);
  useEffect(()=>{
    let alive=true,renderer,controls,model,environment,observer,mixer,frame,gridHelper;const disposables=[];const el=host.current;
    setState('loading');setMessage('');setInfo(null);setRotate(false);setWire(false);setGrid(true);setPlaying(true);
    const disposeObject=object=>object?.traverse(child=>{child.geometry?.dispose();for(const material of (Array.isArray(child.material)?child.material:[child.material]))if(material){for(const value of Object.values(material))if(value?.isTexture)value.dispose();material.dispose();}});
    const init=async()=>{
      try{
        renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setClearColor('#202224');renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;el.appendChild(renderer.domElement);
        const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(38,1,.01,1000);
        controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.autoRotateSpeed=1.5;controls.minDistance=.05;
        const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
        scene.add(new THREE.HemisphereLight(0xffffff,0x525465,2));const light=new THREE.DirectionalLight(0xffefdc,3);light.position.set(4,6,5);scene.add(light);
        const manager=new THREE.LoadingManager();let missing=0;
        const {TGALoader}=await import('three/addons/loaders/TGALoader.js');manager.addHandler(/\.tga$/i,new TGALoader(manager));
        manager.setURLModifier(resource=>{
          if(resource.startsWith('blob:')||resource.startsWith('data:')||resource===file.url)return resource;
          const clean=decodeURIComponent(resource.split('?')[0]).replace(/\\/g,'/');
          const exact=files.find(f=>f.relative&&clean.endsWith('/'+f.relative));
          const matches=files.filter(f=>f.name===clean.split('/').at(-1));const found=exact||(matches.length===1?matches[0]:null);
          if(found)return found.preview||found.url;
          // A model cannot request arbitrary internet or local filesystem resources.
          missing++;return 'data:application/octet-stream;base64,';
        });
        const response=await fetch(file.url);if(!response.ok)throw Error('Le fichier n’est plus accessible. Actualisez les liens du projet.');const buffer=await response.arrayBuffer();
        const extension=file.name.split('.').at(-1).toLowerCase();
        if(extension==='fbx'){const {FBXLoader}=await import('three/addons/loaders/FBXLoader.js');model=new FBXLoader(manager).parse(buffer,'');}
        else if(extension==='glb'||extension==='gltf'){const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');const {MeshoptDecoder}=await import('three/addons/libs/meshopt_decoder.module.js');const loader=new GLTFLoader(manager);loader.setMeshoptDecoder(MeshoptDecoder);const result=await loader.parseAsync(extension==='gltf'?new TextDecoder().decode(buffer):buffer,'');model=result.scene;model.animations=result.animations;}
        else if(extension==='obj'){const {OBJLoader}=await import('three/addons/loaders/OBJLoader.js');model=new OBJLoader(manager).parse(new TextDecoder().decode(buffer));}
        else if(extension==='stl'){const {STLLoader}=await import('three/addons/loaders/STLLoader.js');model=new THREE.Mesh(new STLLoader(manager).parse(buffer),new THREE.MeshStandardMaterial({color:0xcbb17c,metalness:.75,roughness:.3}));}
        else if(extension==='ply'){const {PLYLoader}=await import('three/addons/loaders/PLYLoader.js');const geometry=new PLYLoader(manager).parse(buffer);geometry.computeVertexNormals();model=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xcbb17c,metalness:.6,roughness:.3,vertexColors:geometry.hasAttribute('color')}));}
        else throw Error('Ce format ne peut pas être prévisualisé.');
        if(!alive){disposeObject(model);return;}
        model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model);if(box.isEmpty())throw Error('Aucune géométrie visible dans ce fichier.');const size=box.getSize(new THREE.Vector3());const center=box.getCenter(new THREE.Vector3());const extent=Math.max(size.x,size.y,size.z);if(!Number.isFinite(extent)||extent<=0)throw Error('Dimensions du modèle invalides.');
        const holder=new THREE.Group();holder.add(model);model.position.sub(center);holder.scale.setScalar(3/extent);scene.add(holder);
        let triangles=0,meshes=0;model.traverse(child=>{if(child.isMesh){meshes++;const geometry=child.geometry;triangles+=(geometry.index?.count||geometry.attributes.position?.count||0)/3;for(const material of(Array.isArray(child.material)?child.material:[child.material]))if(material){material.side=THREE.DoubleSide;material.needsUpdate=true;}}});
        if(!meshes)throw Error('Aucun maillage dans ce fichier.');
        gridHelper=new THREE.GridHelper(12,24,0x48433b,0x323437);gridHelper.position.y=-(size.y/extent)*1.5-.01;scene.add(gridHelper);
        if(model.animations?.length){mixer=new THREE.AnimationMixer(model);mixer.clipAction(model.animations[0]).play();}
        const fit=()=>{const aspect=Math.max(el.clientWidth,1)/Math.max(el.clientHeight,1);const distance=1.5/Math.tan(THREE.MathUtils.degToRad(19))/Math.min(aspect,1)*1.3;camera.position.set(distance*.65,distance*.4,distance*.85);controls.target.set(0,0,0);controls.update();};
        observer=new ResizeObserver(()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});observer.observe(el);fit();
        engine.current={controls,model,gridHelper,fit,mixer,playing:true};setInfo({meshes,triangles:Math.round(triangles),animations:model.animations?.length||0});setState('ready');if(missing)setMessage('Certaines textures liées ne sont pas incluses dans ce projet.');
        let last=performance.now();const render=(time)=>{if(!alive)return;const delta=Math.min((time-last)/1000,.1);last=time;if(engine.current?.playing)mixer?.update(delta);controls.update(delta);renderer.render(scene,camera);frame=requestAnimationFrame(render);};frame=requestAnimationFrame(render);
      }catch(error){if(alive){setState('error');setMessage(error.message||'Impossible de lire ce modèle.');}}
    };init();
    return()=>{alive=false;cancelAnimationFrame(frame);observer?.disconnect();controls?.dispose();mixer?.stopAllAction();disposeObject(model);environment?.dispose();gridHelper?.geometry.dispose();gridHelper?.material.dispose();renderer?.dispose();renderer?.domElement.remove();engine.current=null;disposables.forEach(d=>d.dispose());};
  },[file.url,file.name,files]);
  function toggleWire(){const next=!wire;setWire(next);engine.current?.model.traverse(child=>{for(const m of(Array.isArray(child.material)?child.material:[child.material]))if(m&&'wireframe'in m)m.wireframe=next;});}
  return <div className="model-viewer"><div className="model-canvas" ref={host} aria-label={`Modèle 3D interactif : ${file.name}`}/>{state==='loading'&&<div className="canvas-message" role="status"><span className="spinner"/><p>Ouverture du modèle 3D…</p></div>}{state==='error'&&<div className="canvas-message" role="alert"><Box size={38}/><h3>Modèle indisponible</h3><p>{message}</p><a className="button" href={file.url} download={file.name}>Télécharger le fichier</a></div>}{state==='ready'&&<><div className="canvas-label"><Box size={14}/>{file.name.split('.').at(-1).toUpperCase()}<span>{info?.triangles.toLocaleString('fr-FR')} triangles</span></div><div className="viewer-tools"><button aria-label="Recentrer le modèle" title="Recentrer" onClick={()=>engine.current?.fit()}><Scan size={18}/></button><button aria-label="Rotation automatique" aria-pressed={rotate} title="Rotation automatique" onClick={()=>{setRotate(!rotate);engine.current.controls.autoRotate=!rotate;}}><RotateCcw size={18}/></button><button aria-label="Mode filaire" aria-pressed={wire} title="Filaire" onClick={toggleWire}><Layers size={18}/></button><button aria-label="Afficher la grille" aria-pressed={grid} title="Grille" onClick={()=>{setGrid(!grid);engine.current.gridHelper.visible=!grid;}}><Grid2X2 size={18}/></button>{info?.animations>0&&<button aria-label={playing?'Mettre en pause':'Lire l’animation'} onClick={()=>{setPlaying(!playing);engine.current.playing=!playing;}}>{playing?<Pause size={18}/>:<Play size={18}/>}</button>}<button aria-label="Plein écran 3D" title="Plein écran" onClick={()=>host.current.parentElement.requestFullscreen?.()}><Maximize size={18}/></button></div><div className="canvas-help">Glisser pour tourner <span>·</span> Molette pour zoomer <span>·</span> Clic droit pour déplacer</div>{message&&<div className="viewer-warning">{message}</div>}</>}</div>;
}
