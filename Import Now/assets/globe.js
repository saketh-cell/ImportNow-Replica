/* Hero — realistic Earth with China → India trade routes */
import * as THREE from 'three';

const canvas=document.getElementById('globe');
if(canvas){
const labelsEl=document.getElementById('glabels'), host=canvas.parentElement;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(35,1,.1,200);camera.position.set(0,0,9);

const R=2;
const outer=new THREE.Group();scene.add(outer);
const globe=new THREE.Group();outer.add(globe);
const ll=(lat,lon,r=R)=>{const phi=(90-lat)*Math.PI/180,th=(lon+180)*Math.PI/180;
  return new THREE.Vector3(-r*Math.sin(phi)*Math.cos(th),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(th))};

// textures (three.js example planet maps, MIT)
const base='https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/';
const loader=new THREE.TextureLoader();
const aniso=renderer.capabilities.getMaxAnisotropy();
const tex=(f,srgb=true)=>{const t=loader.load(base+f);if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=aniso;return t};

// sun from upper-left-front: China/India in daylight, night falls on the right limb
const SUN=new THREE.Vector3(-.62,.32,.72).normalize();

const earthMat=new THREE.MeshPhongMaterial({
  map:tex('earth_atmos_2048.jpg'),
  normalMap:tex('earth_normal_2048.jpg',false),normalScale:new THREE.Vector2(.85,-.85),
  specularMap:tex('earth_specular_2048.jpg',false),specular:new THREE.Color(0x5a76a0),shininess:28,
  emissiveMap:tex('earth_lights_2048.png'),emissive:new THREE.Color(0xffc27a),emissiveIntensity:1.6
});
earthMat.onBeforeCompile=sh=>{
  sh.uniforms.uSun={value:SUN};
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWN;')
    .replace('#include <begin_vertex>','#include <begin_vertex>\nvWN=normalize(mat3(modelMatrix)*normal);');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWN;\nuniform vec3 uSun;')
    .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance*=smoothstep(.05,-.28,dot(normalize(vWN),uSun));');
};
const earth=new THREE.Mesh(new THREE.SphereGeometry(R,128,128),earthMat);
globe.add(earth);

// clouds
const clouds=new THREE.Mesh(new THREE.SphereGeometry(R*1.012,96,96),new THREE.MeshPhongMaterial({map:tex('earth_clouds_1024.png'),transparent:true,opacity:.75,depthWrite:false,shininess:4}));
globe.add(clouds);

// atmosphere: thin rim on the planet + soft halo around it (normal blending, reads on a light page)
const rim=new THREE.Mesh(new THREE.SphereGeometry(R*1.02,96,96),new THREE.ShaderMaterial({transparent:true,depthWrite:false,
  uniforms:{uSun:{value:SUN}},
  vertexShader:`varying vec3 vN;varying vec3 vV;varying vec3 vWN;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vWN=normalize(mat3(modelMatrix)*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`uniform vec3 uSun;varying vec3 vN;varying vec3 vV;varying vec3 vWN;void main(){float f=pow(1.-max(dot(vN,vV),0.),3.2);float day=smoothstep(-.35,.4,dot(vWN,uSun));gl_FragColor=vec4(mix(vec3(.25,.45,.9),vec3(.45,.72,1.),day),f*(.35+.65*day));}`}));
outer.add(rim);
const halo=new THREE.Mesh(new THREE.SphereGeometry(R*1.11,96,96),new THREE.ShaderMaterial({side:THREE.BackSide,transparent:true,depthWrite:false,
  vertexShader:`varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec3 vN;void main(){float i=pow(max(.58-dot(vN,vec3(0.,0.,1.)),0.),2.4);gl_FragColor=vec4(.42,.66,1.,i*1.05);}`}));
outer.add(halo);

// cities
const cities={
  shanghai:{n:'Shanghai',lat:31.23,lon:121.47,c:'cn',side:'r'},
  yiwu:{n:'Yiwu',lat:29.31,lon:120.08,c:'cn',side:'l'},
  guangzhou:{n:'Guangzhou',lat:23.13,lon:113.26,c:'cn',side:'r'},
  shenzhen:{n:'Shenzhen',lat:22.54,lon:114.06,c:'cn'},
  mumbai:{n:'Nhava Sheva',lat:18.95,lon:72.95,c:'in',side:'l'},
  chennai:{n:'Chennai',lat:13.08,lon:80.27,c:'in',side:'r'},
  hyderabad:{n:'Hyderabad',lat:17.39,lon:78.49,c:'in',side:'r'},
  vizag:{n:'Vizag',lat:17.69,lon:83.22,c:'in'},
};
function glowTex(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');const gr=g.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.22,'rgba(255,190,120,.95)');gr.addColorStop(.5,'rgba(255,110,60,.35)');gr.addColorStop(1,'rgba(255,90,40,0)');
  g.fillStyle=gr;g.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
const glow=glowTex();
const LABEL_ORDER=['hyderabad','shanghai','guangzhou','mumbai','chennai','yiwu'];
const markers=[];
for(const k in cities){
  const c=cities[k];const pos=ll(c.lat,c.lon,R*1.004);c.pos=pos;
  const col=c.c==='cn'?0xe3241b:0xffffff;
  const dot=new THREE.Mesh(new THREE.SphereGeometry(.02,16,16),new THREE.MeshBasicMaterial({color:col}));dot.position.copy(pos);globe.add(dot);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.028,.04,40),new THREE.MeshBasicMaterial({color:col,transparent:true,side:THREE.DoubleSide,depthWrite:false}));
  ring.position.copy(pos);ring.lookAt(pos.clone().multiplyScalar(2));globe.add(ring);
  markers.push({ring,phase:Math.random()});
  if(c.side){const el=document.createElement('div');el.className='glabel';el.innerHTML=`<svg class="flag"><use href="#flag-${c.c}"/></svg>${c.n}`;labelsEl.appendChild(el);c.el=el}
}

// routes: sea lanes (red/orange) + air (blue)
const routes=[['shanghai','chennai',0xe3241b,0],['yiwu','mumbai',0xff3b30,.33],['guangzhou','vizag',0xffffff,.66],['shenzhen','hyderabad',0xffffff,.15],['shanghai','hyderabad',0xe3241b,.5],['guangzhou','chennai',0xff3b30,.82]];
const arcs=[];
for(const [a,b,color,off] of routes){
  const A=cities[a].pos,B=cities[b].pos,d=A.distanceTo(B);
  const curve=new THREE.QuadraticBezierCurve3(A,A.clone().add(B).normalize().multiplyScalar(R+d*.5),B);
  const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
    uniforms:{uT:{value:0},uC:{value:new THREE.Color(color)},uO:{value:off}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float uT;uniform vec3 uC;uniform float uO;varying vec2 vUv;void main(){float h=fract(uT*.15+uO);float d=h-vUv.x;float tr=(d>0.&&d<.4)?pow(1.-d/.4,1.6):0.;float a=.35+tr*.65;a*=smoothstep(0.,.03,vUv.x)*smoothstep(1.,.97,vUv.x);gl_FragColor=vec4(mix(uC,vec3(1.,.95,.85),tr*tr*.6),a);}`});
  globe.add(new THREE.Mesh(new THREE.TubeGeometry(curve,96,.0065,8,false),mat));
  const head=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  head.scale.setScalar(.15);globe.add(head);
  arcs.push({curve,mat,head,off});
}

// light
scene.add(new THREE.AmbientLight(0x9fb4d8,.12));
const sunL=new THREE.DirectionalLight(0xffffff,2.6);sunL.position.copy(SUN).multiplyScalar(10);scene.add(sunL);

// face China–India toward the camera
const focus=ll(22,96,1);
const baseY=-Math.atan2(focus.x,focus.z), baseX=Math.asin(focus.y);
outer.rotation.x=baseX;globe.rotation.y=baseY;

let scale=1,yawOff=0;
function resize(){
  const w=host.clientWidth,h=host.clientHeight,asp=w/h;
  renderer.setSize(w,h,false);camera.aspect=asp;camera.updateProjectionMatrix();
  if(w>820){ // place the globe (with its glow) to the right of wherever the hero text ends
    const hh=camera.position.z*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),hw=hh*asp;
    const txt=document.querySelector('.hero-content'),hr=host.getBoundingClientRect();
    const tr=txt?Math.min(txt.getBoundingClientRect().right-hr.left,w*.62):w*.5;
    const trw=(tr/w-.5)*2*hw,avail=hw-trw;
    const r=Math.min(hh*.8,Math.max(avail*.78,hh*.5));
    outer.position.set(trw+.18+r*1.12,-.15,0);scale=r/R;
    const bleed=(outer.position.x+r)-hw;yawOff=bleed>0?-Math.asin(Math.min(1,bleed/r))*.75:0; // turn China back into view
  }
  else{yawOff=0; // phones/tablets: the hero can be taller than the screen, so place the globe in the top of the *visible* screen
    const hh=camera.position.z*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),k=2*hh/h;
    const vh=Math.min(innerHeight,h),rPx=Math.min(vh*.2,w*.42),cyPx=Math.max(vh*.27,rPx+84);
    outer.position.set(0,hh-cyPx*k,0);scale=rPx*k/R;
  }
}
addEventListener('resize',resize);resize();

let mx=0,my=0;addEventListener('pointermove',e=>{mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5},{passive:true});
let visible=true;new IntersectionObserver(([e])=>visible=e.isIntersecting).observe(host);
const tmp=new THREE.Vector3(),camDir=new THREE.Vector3(),center=new THREE.Vector3(),nrm=new THREE.Vector3();
const clock=new THREE.Clock();let intro=0;
(function frame(){
  requestAnimationFrame(frame);
  if(!visible)return;
  const t=reduceMotion?3:clock.getElapsedTime();
  intro=Math.min(1,intro+.012);const ei=ease(intro);
  const sway=reduceMotion?0:Math.sin(t*.22)*.16;
  globe.rotation.y+=((baseY+yawOff+sway+mx*.3-(1-ei)*1.3)-globe.rotation.y)*.05;
  outer.rotation.x+=((baseX+my*.12)-outer.rotation.x)*.05;
  outer.scale.setScalar(scale*(.82+.18*ei));
  clouds.rotation.y=t*.012;
  for(const a of arcs){a.mat.uniforms.uT.value=t;const h=(t*.15+a.off)%1;a.head.position.copy(a.curve.getPoint(h));a.head.material.opacity=Math.sin(h*Math.PI)}
  for(const m of markers){const k=(t*.6+m.phase)%1;m.ring.scale.setScalar(1+k*2.2);m.ring.material.opacity=(1-k)*.9}
  renderer.render(scene,camera);
  const w=host.clientWidth,h=host.clientHeight;outer.getWorldPosition(center);
  // labels: keep on screen and never on top of each other (priority order, nudge up/down, else hide)
  const placed=[];
  for(const k of LABEL_ORDER){const c=cities[k];
    tmp.copy(c.pos);globe.localToWorld(tmp);
    camDir.copy(camera.position).sub(tmp).normalize();nrm.copy(tmp).sub(center).normalize();
    const facing=nrm.dot(camDir);tmp.project(camera);
    const x=(tmp.x*.5+.5)*w,y=(-tmp.y*.5+.5)*h;
    const lw=c.el.offsetWidth,lh=c.el.offsetHeight;
    let lx=c.side==='l'?x-10-lw:x+10;lx=Math.max(6,Math.min(w-lw-6,lx));
    let ly=y-lh/2,ok=false;
    if(facing>.15&&ei>.9)for(const dy of [0,-(lh+3),lh+3,-(lh+3)*2]){const r=[lx-2,ly+dy-2,lx+lw+2,ly+dy+lh+2];
      if(r[1]>4&&r[3]<h-4&&!placed.some(p=>r[0]<p[2]&&r[2]>p[0]&&r[1]<p[3]&&r[3]>p[1])){ly+=dy;placed.push(r);ok=true;break}}
    c.el.style.transform=`translate(${lx}px,${ly}px)`;
    c.el.style.opacity=ok?1:0;
  }
})();
}
