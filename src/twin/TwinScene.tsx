import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Device, Layout, Simulation } from './model';

type Props={layout:Layout;simulation:Simulation;selected:string;editing:boolean;running:boolean;view:'iso'|'top';onSelect:(id:string)=>void;onMove:(id:string,x:number,z:number)=>void};
type World={scene:THREE.Scene;camera:THREE.PerspectiveCamera;controls:OrbitControls;objects:THREE.Group;links:THREE.Group;renderer:THREE.WebGLRenderer};
function dispose(root:THREE.Object3D){root.traverse(o=>{const mesh=o as THREE.Mesh;if(mesh.geometry)mesh.geometry.dispose();if(mesh.material)for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material]){const material=m as THREE.MeshStandardMaterial;material.map?.dispose();material.dispose();}});}
export default function TwinScene(props:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef(props),world=useRef<World|null>(null);latest.current=props;
 const [error,setError]=useState('');
 useEffect(()=>{
  const element=host.current!;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});}catch{setError('이 환경에서는 3D 렌더링을 사용할 수 없습니다. 아래 장비 목록과 좌표 입력으로 공정을 편집·실행할 수 있습니다.');return;}
  const css=getComputedStyle(element);const color=(name:string)=>css.getPropertyValue(name).trim();
  const scene=new THREE.Scene();scene.background=new THREE.Color(color('--color-canvas'));
  const camera=new THREE.PerspectiveCamera(42,1,0.1,160);camera.position.set(16,19,21);
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label','장비 블록을 선택하고 배치하는 3D 공정');renderer.domElement.setAttribute('role','img');element.append(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,0);controls.enableDamping=true;controls.minDistance=9;controls.maxDistance=65;controls.maxPolarAngle=Math.PI/2.1;
  scene.add(new THREE.HemisphereLight(color('--color-surface'),color('--color-sidebar'),3));
  const sun=new THREE.DirectionalLight(color('--color-surface'),3);sun.position.set(5,20,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-18;sun.shadow.camera.right=18;sun.shadow.camera.top=18;sun.shadow.camera.bottom=-18;scene.add(sun);
  const floor=new THREE.Mesh(new THREE.BoxGeometry(24,0.15,24),new THREE.MeshStandardMaterial({color:color('--color-surface-muted'),roughness:0.95}));floor.position.y=-0.13;floor.receiveShadow=true;scene.add(floor);
  const grid=new THREE.GridHelper(24,24,color('--color-border-accent'),color('--color-border'));grid.position.y=-0.04;scene.add(grid);
  const objects=new THREE.Group(),links=new THREE.Group();scene.add(objects,links);world.current={scene,camera,controls,objects,links,renderer};
  const resize=new ResizeObserver(()=>{const {width,height}=element.getBoundingClientRect();if(width&&height){renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();}});resize.observe(element);
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  let drag:{id:string;startX:number;startY:number;x:number;z:number}|null=null;
  const point=(e:PointerEvent)=>{const r=element.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);};
  const down=(e:PointerEvent)=>{if(e.button!==0)return;point(e);let hit:THREE.Object3D|undefined=ray.intersectObjects(objects.children,true)[0]?.object;while(hit&&!hit.userData.deviceId)hit=hit.parent||undefined;
   if(hit){latest.current.onSelect(hit.userData.deviceId);if(latest.current.editing){const d=latest.current.layout.devices.find(d=>d.id===hit!.userData.deviceId)!;drag={id:d.id,startX:e.clientX,startY:e.clientY,x:d.x,z:d.z};controls.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);}}
  };
  const move=(e:PointerEvent)=>{if(!drag)return;point(e);const p=ray.ray.intersectPlane(plane,new THREE.Vector3());if(p){drag.x=Math.max(-10,Math.min(10,Math.round(p.x)));drag.z=Math.max(-10,Math.min(10,Math.round(p.z)));const group=objects.children.find(g=>g.userData.deviceId===drag!.id);group?.position.set(drag.x,0,drag.z);}};
  const up=(e:PointerEvent)=>{if(!drag)return;const d=drag;drag=null;controls.enabled=true;if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);
   const original=latest.current.layout.devices.find(x=>x.id===d.id);objects.children.find(g=>g.userData.deviceId===d.id)?.position.set(original?.x??0,0,original?.z??0);
   if(e.type!=='pointercancel'&&Math.hypot(e.clientX-d.startX,e.clientY-d.startY)>4)latest.current.onMove(d.id,d.x,d.z);
  };
  // Capture selection before OrbitControls starts a camera gesture.
  renderer.domElement.addEventListener('pointerdown',down,true);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);
  const lost=(e:Event)=>{e.preventDefault();setError('3D 연결이 끊겼습니다. 페이지를 새로고침하거나 아래 장비 목록을 사용하세요.');};renderer.domElement.addEventListener('webglcontextlost',lost);
  let frame=0;const animate=()=>{frame=requestAnimationFrame(animate);controls.update();const {simulation,selected,running}=latest.current;
   objects.children.forEach(g=>{const m=simulation.machines[g.userData.deviceId];const status=m?.status||'idle';const lamp=g.getObjectByName('status-lamp') as THREE.Mesh;
    const tint=color(status==='alarm'?'--color-danger-ink':status==='offline'?'--color-neutral-ink':status==='blocked'?'--color-warning-ink':status==='running'?'--color-brand':'--color-sidebar-muted');
    if(lamp)(lamp.material as THREE.MeshStandardMaterial).color.set(tint);
    const pad=g.getObjectByName('selection-pad') as THREE.Mesh;if(pad)(pad.material as THREE.MeshStandardMaterial).color.set(color(g.userData.deviceId===selected?'--color-sidebar-accent':'--color-border-strong'));
   });
   for(const marker of links.children.filter(g=>g.userData.route)){const {from,to}=marker.userData.route;const a=latest.current.layout.devices.find(d=>d.id===from),b=latest.current.layout.devices.find(d=>d.id===to);if(!a||!b)continue;marker.visible=running&&simulation.machines[from]?.status==='running';const t=(performance.now()%2200)/2200;marker.position.set(a.x+(b.x-a.x)*t,0.42,a.z+(b.z-a.z)*t);}
   renderer.render(scene,camera);
  };animate();
  return()=>{cancelAnimationFrame(frame);resize.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerdown',down,true);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',up);renderer.domElement.removeEventListener('webglcontextlost',lost);dispose(scene);renderer.dispose();renderer.domElement.remove();world.current=null;};
 },[]);
 useEffect(()=>{const w=world.current;if(!w)return;const css=getComputedStyle(host.current!);const color=(name:string)=>css.getPropertyValue(name).trim();
  dispose(w.objects);w.objects.clear();dispose(w.links);w.links.clear();
  function makeDevice(d:Device){const group=new THREE.Group();group.userData.deviceId=d.id;group.position.set(d.x,0,d.z);group.rotation.y=d.rotation*Math.PI/180;
   const box=(width:number,height:number,depth:number,x:number,y:number,z:number,token='--color-surface',name='')=>{const m=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),new THREE.MeshStandardMaterial({color:color(token),roughness:0.55,metalness:0.12}));m.position.set(x,y,z);m.name=name;m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
   box(1.85,0.14,1.85,0,0.07,0,'--color-border-strong','selection-pad');
   // Interlocking studs communicate that these are editable, schematic blocks.
   for(const x of [-0.62,0.62])for(const z of [-0.62,0.62]){const stud=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.1,12),new THREE.MeshStandardMaterial({color:color('--color-sidebar-muted')}));stud.position.set(x,0.18,z);group.add(stud);}
   if(d.kind==='cycler'){box(1.3,2.2,1.2,0,1.3,0);for(let i=0;i<4;i++){box(1.13,0.34,0.06,0,0.55+i*0.47,0.64,'--color-sidebar');box(0.55,0.12,0.08,-0.15,0.55+i*0.47,0.69,'--color-focus');}}
   else if(d.kind==='welder'){box(1.35,0.8,1.2,0,0.6,0);box(0.35,1.65,0.35,0,1.9,-0.4,'--color-brand');box(0.4,0.25,1,0,2.6,-0.04,'--color-brand');box(0.13,0.6,0.13,0,2.22,0.35,'--color-warning-ink');}
   else if(d.kind==='scanner'){box(1.4,0.7,1.1,0,0.55,0,'--color-sidebar-muted');box(0.1,1.25,0.1,0.55,1.45,-0.4,'--color-sidebar');box(0.55,0.4,0.4,0.45,2.1,-0.25,'--color-warning-ink');box(0.28,0.23,0.05,0.45,2.1,-0.02,'--color-sidebar');}
   else{for(const x of [-0.5,0.5])box(0.12,0.85,1,x,0.55,0,'--color-sidebar-muted');box(1.5,0.18,1.3,0,1,0,'--color-sidebar');
    if(d.kind==='meter'||d.kind==='inspection'){box(1.1,0.55,0.7,0,1.4,-0.15);box(0.58,0.25,0.05,-0.16,1.45,0.22,'--color-brand');box(0.14,0.14,0.05,0.35,1.43,0.22,'--color-warning-ink');}
    else for(let i=0;i<8;i++)box(0.21,0.38,0.25,-0.43+(i%4)*0.28,1.28,-0.2+Math.floor(i/4)*0.35,'--color-brand');
   }
   box(0.15,0.2,0.15,0.6,d.kind==='cycler'?2.53:1.95,0.45,'--color-sidebar-muted','status-lamp');
   const c=document.createElement('canvas');c.width=256;c.height=104;const ctx=c.getContext('2d')!;ctx.fillStyle=color('--color-sidebar');ctx.fillRect(0,0,256,104);ctx.fillStyle=color('--color-sidebar-ink');ctx.font=`600 26px ${css.getPropertyValue('--font-body')}`;ctx.textAlign='center';ctx.fillText(d.id.slice(0,14),128,36);ctx.font=`400 24px ${css.getPropertyValue('--font-body')}`;ctx.fillText(d.name.slice(0,10),128,77);const texture=new THREE.CanvasTexture(c);const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));label.scale.set(3.4,1.38,1);label.position.set(0,3.4,0);group.add(label);return group;
  }
  props.layout.devices.forEach(d=>w.objects.add(makeDevice(d)));
  props.layout.links.forEach(edge=>{const a=props.layout.devices.find(d=>d.id===edge.from)!,b=props.layout.devices.find(d=>d.id===edge.to)!;const from=new THREE.Vector3(a.x,0.24,a.z),to=new THREE.Vector3(b.x,0.24,b.z),dir=to.clone().sub(from);const arrow=new THREE.ArrowHelper(dir.clone().normalize(),from,dir.length(),color('--color-brand'),0.6,0.35);w.links.add(arrow);const dot=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.24,0.24),new THREE.MeshStandardMaterial({color:color('--color-warning-ink')}));dot.userData.route=edge;w.links.add(dot);});
 },[props.layout]);
 useEffect(()=>{const w=world.current;if(!w)return;w.camera.position.set(...(props.view==='top'?[0,30,0.1]:[16,19,21]) as [number,number,number]);w.controls.target.set(0,0,0);w.controls.update();},[props.view]);
 return <div className="twin-viewport" ref={host}>{error&&<p className="twin-render-error" role="status">{error}</p>}</div>;
}
