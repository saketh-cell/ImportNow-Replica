/* "How it works" — scroll-driven container ship voyage, Shanghai → Chennai
   Realistic water (three.js Water), physical sky (Sky), shaped hull, working STS cranes. */
import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';

const section=document.getElementById('journey');
if(section){
const canvas=document.getElementById('sea'), host=canvas.parentElement;
const steps=[...document.querySelectorAll('#jsteps .j-step')];
const fill=document.getElementById('jfill'), boat=document.getElementById('jboat'), dayEl=document.getElementById('jday'), loadingEl=document.getElementById('jloading');
const mobile=matchMedia('(max-width:820px)').matches;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), lerp=(a,b,t)=>a+(b-a)*t, smooth=t=>t*t*(3-2*t);
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

/* ---------- renderer / scene ---------- */
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.25:1.5));
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.5;
renderer.shadowMap.enabled=!mobile;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
scene.fog=new THREE.Fog(0xc6d4e2,200,1700);
const camera=new THREE.PerspectiveCamera(42,1,.5,20000);

const manager=THREE.DefaultLoadingManager;
manager.onLoad=()=>loadingEl&&loadingEl.classList.add('gone');

/* sun: low-ish morning sun ahead of the ship, behind the camera's far side for sea glitter */
const sun=new THREE.Vector3().setFromSphericalCoords(1,THREE.MathUtils.degToRad(90-13),THREE.MathUtils.degToRad(122));

const sky=new Sky();sky.scale.setScalar(10000);
const su=sky.material.uniforms;su.turbidity.value=5;su.rayleigh.value=1.4;su.mieCoefficient.value=.004;su.mieDirectionalG.value=.82;su.sunPosition.value.copy(sun);
const pmrem=new THREE.PMREMGenerator(renderer);
const envScene=new THREE.Scene();envScene.add(sky);
scene.environment=pmrem.fromScene(envScene).texture;
scene.add(sky);

const waterNormals=new THREE.TextureLoader().load('https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/waternormals.jpg');
waterNormals.wrapS=waterNormals.wrapT=THREE.RepeatWrapping;
const water=new Water(new THREE.PlaneGeometry(10000,10000),{
  textureWidth:mobile?256:512,textureHeight:mobile?256:512,waterNormals,
  sunDirection:sun.clone(),sunColor:0xfff4e0,waterColor:0x0b3a55,distortionScale:2.4,fog:true});
water.rotation.x=-Math.PI/2;water.material.uniforms.size.value=2.6;
scene.add(water);

scene.add(new THREE.HemisphereLight(0xdde8ff,0x50606c,.35));
const sunL=new THREE.DirectionalLight(0xfff0dc,2.6);
sunL.castShadow=!mobile;sunL.shadow.mapSize.set(2048,2048);
Object.assign(sunL.shadow.camera,{left:-75,right:75,top:75,bottom:-75,near:1,far:500});
sunL.shadow.bias=-.0004;sunL.shadow.normalBias=.03;
scene.add(sunL);scene.add(sunL.target);

/* ---------- helpers ---------- */
const M=(c,r=.6,m=.1,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m,...o});
function box(w,h,d,mat,x=0,y=0,z=0,parent=scene,shadow=true){const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);b.position.set(x,y,z);if(shadow){b.castShadow=true;b.receiveShadow=true}parent.add(b);return b}
const UP=new THREE.Vector3(0,1,0);
function strut(a,b,r,mat,parent){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,A.distanceTo(B),8),mat);m.position.copy(A).add(B).multiplyScalar(.5);m.quaternion.setFromUnitVectors(UP,B.clone().sub(A).normalize());m.castShadow=true;parent.add(m);return m}
function ctex(w,h,draw,srgb=true){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t}
function noise(g,w,h,n,col){for(let i=0;i<n;i++){g.fillStyle=col(Math.random());g.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*3,1+Math.random()*3)}}

/* ---------- ship dimensions ---------- */
const L=46,B=7.6,D=4.6,T=2.0,DECK=D-T; // deck at y=2.6, keel at y=-2, waterline y=0
const yMin=-T,yMax=DECK+1.3;

/* hull paint: antifouling red, black boot-top, navy topsides */
const hullTex=ctex(512,1024,(g,w,h)=>{
  for(let row=0;row<h;row++){const y=yMin+(1-row/h)*(yMax-yMin);
    g.fillStyle=y<-.05?'#8f2a1f':y<.42?'#16181d':'#111214';g.fillRect(0,row,w,1)}
  g.globalAlpha=.07;for(let x=0;x<w;x+=32){g.fillStyle='#000';g.fillRect(x,0,1,h)}
  g.globalAlpha=1;noise(g,w,h,2500,r=>`rgba(${r>.5?255:0},${r>.5?255:0},${r>.5?255:0},.035)`);
  // rust streaks
  for(let i=0;i<40;i++){const x=Math.random()*w,y0=h*(.08+Math.random()*.25);const gr=g.createLinearGradient(0,y0,0,y0+60+Math.random()*80);gr.addColorStop(0,'rgba(120,60,30,.18)');gr.addColorStop(1,'rgba(120,60,30,0)');g.fillStyle=gr;g.fillRect(x,y0,1.5,140)}
});
function hullGeometry(){
  const NS=84,pos=[],uv=[],idx=[],deckP=[];let NP=0;const st0=[];
  for(let s=0;s<=NS;s++){
    const u=s/NS,x0=-L/2+u*L;
    let top=B/2,bot=B/2,keel=-T,vb=0,rake=0,sheer=0;
    if(u>.7){const k=(u-.7)/.3;top=B/2*(1-Math.pow(k,2.6));bot=B/2*(1-Math.pow(k,1.3));vb=Math.pow(k,1.1)*.9}
    if(u>.8){const k=(u-.8)/.2;sheer=k*k*1.2}
    if(u>.9){const k=(u-.9)/.1;keel=-T+Math.pow(k,1.7)*T*1.2;rake=k*3}
    if(u<.12){const k=(.12-u)/.12;top=B/2*(1-.07*k);bot=B/2*(1-.5*k);vb=Math.max(vb,.2*k)}
    if(u<.05){const k=(.05-u)/.05;keel=-T+Math.pow(k,1.3)*T*.7}
    top=Math.max(top,.015);bot=Math.max(Math.min(bot,top),.01);
    const dk=DECK+sheer;if(keel>dk-.3)keel=dk-.3;
    const r=Math.max(.01,Math.min(1.1,bot*.8,(dk-keel)*.45));
    const U=[];
    for(let i=0;i<10;i++){const t=i/10;U.push([lerp(top,bot,t),lerp(dk,keel+r,t)])}
    for(let i=0;i<=6;i++){const a=i/6*Math.PI/2;U.push([bot-r+Math.cos(a)*r,keel+r-Math.sin(a)*r])}
    for(let i=1;i<=4;i++)U.push([(bot-r)*(1-i/4),keel]);
    const n=U.length;
    const half=U.map((p,i)=>{const f=i/(n-1);return [lerp(p[0],top*(1-f),vb),lerp(p[1],lerp(dk,keel,f),vb)]});
    const full=half.concat(half.slice(0,-1).reverse().map(p=>[-p[0],p[1]]));NP=full.length;
    const ring=[];
    for(const [z,y] of full){const x=x0+rake*((y-keel)/(dk-keel));pos.push(x,y,z);uv.push(u,(y-yMin)/(yMax-yMin));ring.push([x,y,z])}
    if(s===0)st0.push(...ring);
    deckP.push({x:x0+rake,y:dk,w:top});
  }
  for(let s=0;s<NS;s++)for(let j=0;j<NP-1;j++){const a=s*NP+j,b=a+1,c=a+NP,d=c+1;idx.push(a,c,b,b,c,d)}
  // transom (own vertices so its edge stays crisp)
  const base=pos.length/3;let cy=0;st0.forEach(p=>cy+=p[1]);cy/=st0.length;
  st0.forEach(p=>{pos.push(p[0],p[1],p[2]);uv.push(0,(p[1]-yMin)/(yMax-yMin))});
  pos.push(-L/2,cy,0);uv.push(0,(cy-yMin)/(yMax-yMin));
  for(let j=0;j<NP-1;j++)idx.push(base+NP,base+j+1,base+j);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  // deck surface
  const dp=[],di=[];deckP.forEach((d,i)=>{dp.push(d.x,d.y,d.w,d.x,d.y,-d.w);if(i<deckP.length-1){const a=i*2;di.push(a,a+2,a+1,a+1,a+2,a+3)}});
  const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.Float32BufferAttribute(dp,3));dg.setIndex(di);dg.computeVertexNormals();
  // bow bulwark + rail line points
  const bw=[],bi=[];const fwd=deckP.filter((d,i)=>i/NS>.86);
  fwd.forEach((d,i)=>{for(const sg of [1,-1]){bw.push(d.x,d.y,d.w*sg,d.x+.05,d.y+1.1,(d.w*1.03+.02)*sg)}if(i<fwd.length-1){for(const o of [0,2]){const a=i*4+o;bi.push(a,a+4,a+1,a+1,a+4,a+5)}}});
  const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.Float32BufferAttribute(bw,3));bg.setIndex(bi);bg.computeVertexNormals();
  return {hull:g,deck:dg,bulwark:bg,deckP};
}
const HG=hullGeometry();

/* textures for superstructure + containers */
const winTex=ctex(256
,64,(g,w,h)=>{g.fillStyle='#eef1f4';g.fillRect(0,0,w,h);for(let i=0;i<9;i++){const x=10+i*27;const gr=g.createLinearGradient(0,18,0,42);gr.addColorStop(0,'#3e5672');gr.addColorStop(1,'#1b2838');g.fillStyle=gr;g.fillRect(x,20,17,22)}g.fillStyle='rgba(0,0,0,.08)';g.fillRect(0,h-3,w,3)}});
const bridgeTex=ctex(256,64,(g,w,h)=>{g.fillStyle='#eef1f4';g.fillRect(0,0,w,h);const gr=g.createLinearGradient(0,12,0,44);gr.addColorStop(0,'#5b7896');gr.addColorStop(1,'#14202e');g.fillStyle=gr;g.fillRect(0,14,w,28);g.fillStyle='#eef1f4';for(let x=0;x<w;x+=21)g.fillRect(x,14,2,28)}});
const white=M(0xeef1f4,.55,.1),winMat=new THREE.MeshStandardMaterial({map:winTex,roughness:.45,metalness:.1}),bridgeMat=new THREE.MeshStandardMaterial({map:bridgeTex,roughness:.3,metalness:.2});
const corrugated=(base,label)=>ctex(512,256,(g,w,h)=>{
  g.fillStyle=base;g.fillRect(0,0,w,h);
  for(let x=10;x<w-10;x+=14){g.fillStyle='rgba(255,255,255,.28)';g.fillRect(x,14,4,h-28);g.fillStyle='rgba(0,0,0,.2)';g.fillRect(x+6,14,5,h-28)}
  g.fillStyle='rgba(0,0,0,.38)';g.fillRect(0,0,w,13);g.fillRect(0,h-13,w,13);g.fillRect(0,0,10,h);g.fillRect(w-10,0,10,h);
  noise(g,w,h,900,r=>`rgba(${90+r*40|0},${55+r*20|0},30,${.05+r*.08})`);
  if(label){g.fillStyle='#fff';g.font='800 64px Sora, Arial Black, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('IMPORTNOW',w/2,h/2+4);g.font='600 22px Inter, Arial, sans-serif';g.fillText('importnow.in',w/2,h/2+50)}
});
const contMat=new THREE.MeshStandardMaterial({map:corrugated('#ffffff'),roughness:.55,metalness:.3});
const brandMat=new THREE.MeshStandardMaterial({map:corrugated('#101010',true),roughness:.5,metalness:.3});
const CW=3.05,CH=1.3,CD=1.52;
const PALETTE=[0xb5362b,0x2b5d8f,0x3f7a4c,0xd98a2b,0x8a9097,0x6b2e2e,0xe1c04a,0xe9ecef,0x1f6f8b,0xb5362b,0x2b5d8f,0x8a9097];
const contGeo=new THREE.BoxGeometry(CW,CH,CD);

/* ---------- ship builder ---------- */
const HATCH=DECK+.38;
const slotsFor=(withTop)=>{const s=[];for(let l=0;l<3;l++)for(let c=0;c<9;c++)for(let r=0;r<4;r++)s.push({c,r,l});if(withTop)for(let c=1;c<=6;c++)for(let r=0;r<4;r++)s.push({c,r,l:3,top:true});
  s.forEach(o=>{o.x=-12.4+o.c*3.18;o.y=HATCH+CH/2+o.l*(CH+.03);o.z=-2.4+o.r*1.6;o.brand=((o.c*7+o.r*3+o.l*5)%9===0);o.col=PALETTE[(o.c*5+o.r*7+o.l*3)%PALETTE.length]});return s};
function shipBody(){
  const g=new THREE.Group();
  const hull=new THREE.Mesh(HG.hull,new THREE.MeshStandardMaterial({map:hullTex,roughness:.5,metalness:.35,side:THREE.DoubleSide}));hull.castShadow=hull.receiveShadow=true;g.add(hull);
  const deck=new THREE.Mesh(HG.deck,M(0x6a3f33,.85,.1,{side:THREE.DoubleSide}));deck.receiveShadow=true;g.add(deck);
  const bw=new THREE.Mesh(HG.bulwark,new THREE.MeshStandardMaterial({color:0x111214,roughness:.5,metalness:.35,side:THREE.DoubleSide}));bw.castShadow=true;g.add(bw);
  // rails
  const rp=[];HG.deckP.forEach((d,i)=>{const u=i/(HG.deckP.length-1);if(u<.03||u>.86)return;for(const s of [1,-1]){const z=(d.w-.08)*s;if(i%2===0)rp.push(d.x,d.y,z,d.x,d.y+.7,z);const n=HG.deckP[i+1];if(n&&(i+1)/(HG.deckP.length-1)<=.86)rp.push(d.x,d.y+.7,z,n.x,n.y+.7,(n.w-.08)*s)}});
  const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.Float32BufferAttribute(rp,3));g.add(new THREE.LineSegments(rg,new THREE.LineBasicMaterial({color:0xcfd5dc})));
  // hatch covers
  const hatch=M(0x4b5560,.7,.3);for(let c=0;c<9;c++)box(3.05,.36,B-1.2,hatch,-12.4+c*3.18,DECK+.18,0,g);
  // lashing bridges
  const lash=M(0xb9c0c8,.6,.4);for(let c=0;c<8;c++)box(.18,2.6,B-1,lash,-12.4+c*3.18+1.59,HATCH+1.3,0,g);
  // accommodation block (5 decks) + bridge with wings
  const ax=-17.6,mats=[winMat,winMat,white,white,winMat,winMat];
  for(let i=0;i<5;i++)box(5.4-i*.12,1.25,B-.9,mats,ax,DECK+.625+i*1.25,0,g);
  const by=DECK+5*1.25+.7;
  box(4.6,1.4,B+2.6,[bridgeMat,bridgeMat,white,white,bridgeMat,bridgeMat],ax+.3,by,0,g);
  box(4.9,.16,B+2.9,white,ax+.3,by+.78,0,g);
  const mast=M(0xdfe3e8,.5,.4);box(.18,3.2,.18,mast,ax-.6,by+2.4,0,g);box(.12,.12,2.2,mast,ax-.6,by+3.2,0,g);
  const radar=box(1.8,.1,.28,M(0x2b2f36,.4,.5),ax+.6,by+2.1,0,g);radar.name='radar';
  // funnel
  const fun=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.2,4.6,28),M(0x111214,.45,.3));fun.scale.z=.72;fun.position.set(-21.4,DECK+6.6,0);fun.castShadow=true;g.add(fun);
  const band=new THREE.Mesh(new THREE.CylinderGeometry(1.08,1.12,.9,28),M(0xc8352a,.5,.2));band.scale.z=.72;band.position.set(-21.4,DECK+7.4,0);g.add(band);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(1.06,1.06,.4,28),M(0x111316,.6,.3));cap.scale.z=.72;cap.position.set(-21.4,DECK+8.95,0);g.add(cap);
  // lifeboats
  const lb=M(0xff6a1a,.45,.1);for(const s of [1,-1]){const b=new THREE.Mesh(new THREE.CapsuleGeometry(.42,1.9,6,14),lb);b.rotation.z=Math.PI/2;b.position.set(ax+.2,DECK+2.7,s*(B/2+.35));b.castShadow=true;g.add(b);box(.12,1.2,.6,mast,ax-.9,DECK+2.9,s*(B/2+.1),g);box(.12,1.2,.6,mast,ax+1.3,DECK+2.9,s*(B/2+.1),g)}
  // foremast + bow gear
  box(.22,4.2,.22,mast,18.4,DECK+1.2+2.1,0,g);
  const win=M(0x3b4450,.6,.5);box(1,.6,1.2,win,20.2,DECK+1.2+.3,1.2,g);box(1,.6,1.2,win,20.2,DECK+1.2+.3,-1.2,g);box(1.2,.6,1.4,win,-21.8,DECK+.3,2,g);box(1.2,.6,1.4,win,-21.8,DECK+.3,-2,g);
  return g;
}

/* main ship */
const ship=shipBody();scene.add(ship);
const radar=ship.getObjectByName('radar');
// hull name, both sides
const nameTex=ctex(1024,128,(g,w,h)=>{g.fillStyle='#fff';g.font='800 96px Sora, Arial Black, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('IMPORTNOW',w/2,h/2+6)});
const nameMat=new THREE.MeshStandardMaterial({map:nameTex,transparent:true,roughness:.5,metalness:.2,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
for(const s of [1,-1]){const p=new THREE.Mesh(new THREE.PlaneGeometry(15,1.9),nameMat);p.position.set(-2,1.45,s*(B/2+.03));if(s<0)p.rotation.y=Math.PI;ship.add(p)}

const slots=slotsFor(true);
const plainSlots=slots.filter(s=>!s.brand),brandSlots=slots.filter(s=>s.brand);
const plainIM=new THREE.InstancedMesh(contGeo,contMat,plainSlots.length),brandIM=new THREE.InstancedMesh(contGeo,brandMat,brandSlots.length);
[plainIM,brandIM].forEach(m=>{m.castShadow=m.receiveShadow=true;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);ship.add(m)});
plainSlots.forEach((s,i)=>{s.mesh=plainIM;s.i=i;plainIM.setColorAt(i,new THREE.Color(s.col))});
brandSlots.forEach((s,i)=>{s.mesh=brandIM;s.i=i;brandIM.setColorAt(i,new THREE.Color(0xffffff))});
const dummy=new THREE.Object3D();
function place(s,x,y,z,ry=0,vis=true){dummy.position.set(x,y,z);dummy.rotation.set(0,ry,0);dummy.scale.setScalar(vis?1:0);dummy.updateMatrix();s.mesh.setMatrixAt(s.i,dummy.matrix)}
slots.forEach(s=>place(s,s.x,s.y,s.z));

/* animated top tier: crane A bays 1-3, crane B bays 4-6 */
const animated=slots.filter(s=>s.top);
const qA=animated.filter(s=>s.c<=3),qB=animated.filter(s=>s.c>=4);
qA.forEach((s,k)=>{s.crane=0;s.k=k});qB.forEach((s,k)=>{s.crane=1;s.k=k});

/* distant ships for sense of scale */
const others=[];
function staticContainers(parent){const ss=slotsFor(false);const im=new THREE.InstancedMesh(contGeo,contMat,ss.length);ss.forEach((s,i)=>{dummy.position.set(s.x,s.y,s.z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();im.setMatrixAt(i,dummy.matrix);im.setColorAt(i,new THREE.Color(s.col))});parent.add(im)}
[[160,-330,-1,1.0],[300,260,1,.9],[-120,420,1,1.1]].forEach(([x,z,dir,sc])=>{const g=shipBody();staticContainers(g);g.position.set(x,0,z);g.rotation.y=dir<0?Math.PI:0;g.scale.setScalar(sc);g.traverse(o=>{o.castShadow=false});scene.add(g);others.push({g,x,dir})});

/* ---------- wake + foam ---------- */
const foamMat=()=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,
  uniforms:{uT:{value:0},uA:{value:0}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform float uT,uA;varying vec2 vUv;
    float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311
.7)))*43758.5453);}
    float ns(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y);}
    void main(){float x=vUv.x;float y=abs(vUv.y-.5)*2.;float w=mix(1.,.3,x);
    float e=smoothstep(w,w-.35,y)*(.45+.55*smoothstep(w-.3,w-.05,y));
    float n=ns(vec2(x*60.-uT*3.,vUv.y*16.))*.55+ns(vec2(x*140.-uT*6.,vUv.y*40.))*.45;
    float a=e*smoothstep(0.,.8,x)*smoothstep(1.,.96,x)*smoothstep(.35,.75,n)*uA;gl_FragColor=vec4(vec3(.96,.98,1.),a*.85);}`});
const wake=new THREE.Mesh(new THREE.PlaneGeometry(110,18).rotateX(-Math.PI/2),foamMat());wake.position.y=.06;scene.add(wake);
const sideFoam=[1,-1].map(s=>{
  const m=new THREE.Mesh(new THREE.PlaneGeometry(34,3.2).rotateX(-Math.PI/2),foamMat());
  m.position.set(0,.07,s*(B/2+.9));if(s>0)m.rotation.y=Math.PI;ship.add(m);return m
});

/* ---------- ports ---------- */
const flags=[];
const flagCN=ctex(150,100,g=>{
  g.fillStyle='#de2910';g.fillRect(0,0,150,100);
  g.fillStyle='#ffde00';
  const star=(cx,cy,r)=>{
    g.beginPath();
    for(let i=0;i<10;i++){
      const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.4:r;
      g.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr)
    }
    g.fill()
  };
  star(25,25,15);star(50,10,5);star(60,20,5);star(60,35,5);star(50,45,5)
});
const flagIN=ctex(150,100,g=>{
  g.fillStyle='#ff9933';g.fillRect(0,0,150,34);
  g.fillStyle='#fff';g.fillRect(0,33,150,34);
  g.fillStyle='#138808';g.fillRect(0,66,150,34);
  g.strokeStyle='#000080';g.lineWidth=3;
  g.beginPath();g.arc(75,50,13,0,7);g.stroke();
  for(let i=0;i<24;i++){
    const a=i*Math.PI/12;
    g.beginPath();g.moveTo(75,50);g.lineTo(75+Math.cos(a)*13,50+Math.sin(a)*13);
    g.lineWidth=1;g.stroke()
  }
});
const QUAY=2.5;
function crane(parent,cx,color){
  const c=new THREE.Group();c.position.x=cx;parent.add(c);
  const st=M(color,.5,.35),wh=M(0xf1f3f5,.5,.15),dk=M(0x2a2f36,.6,.5);
  const zs=-9.5,zl=-24,H=27;
  for(const lx of [-3.6,3.6])for(const lz of [zs,zl]){box(.9,H,.9,st,lx,QUAY+H/2,lz,c);box(1.6,1.1,2.4,dk,lx,QUAY+.55,lz,c)}
  for(const lx of [-3.6,3.6]){box(.8,.8,zs-zl,st,lx,QUAY+12,(zs+zl)/2,c);strut([lx,QUAY+1.5,zs],[lx,QUAY+12,zl],.22,st,c)}
  for(const lz of [zs,zl])box(8.1,.9,.9,st,0,QUAY+H-.4,lz,c);
  const gy=QUAY+H+.9;
  for(const lx of [-2.2,2.2])box(.8,1.6,58,st,lx,gy,-11,c);
  for(let z=-38;z<=16;z+=5)box(5.2,.25,.25,st,0,gy-.55,z,c);
  const ap=[0,gy+13,-17];
  for(const lx of [-2.2,2.2]){strut([lx,gy,zs],[lx*.55,ap[1],ap[2]],.32,st,c);strut([lx,gy,zl],[lx*.55,ap[1],ap[2]],.32,st,c);
    strut([lx*.55,ap[1],ap[2]],[lx,gy+.7,17],.08,dk,c);strut([lx*.55,ap[1],ap[2]],[lx,gy+.7,-39],.08,dk,c)}
  box(2.8,.9,1.1,st,0,ap[1],ap[2],c);
  box(6.6,3.8,8.5,wh,0,gy+2.7,-33,c);box(6.7,.5,8.6,st,0,gy+4.7,-33,c);
  const trolley=new THREE.Group();trolley.position.set(0,gy-1.2,4);c.add(trolley);
  box(4.6,1,3.2,wh,0,0,0,trolley);box(1.8,1.8,2,M(0x2a3b55,.15,.6),1.3,-1.4,0,trolley);
  const spreader=box(3.3,.42,1.75,M(0xf2c230,.5,.3),0,14,4,c);
  const cables=[[-1.3,-.6],[1.3,-.6],[-1.3,.6],[1.3,.6]].map(([ox,oz])=>({m:box(.05,1,.05,dk,0,0,0,c,false),ox,oz}));
  const cr={g:c,trolley,spreader,cables,gy,cx};setCrane(cr,4,14);return cr;
}
function setCrane(cr,z,y){cr.trolley.position.z=z;cr.spreader.position.set(0,y,z);const top=cr.gy-1.8,len=top-(y+.2);for(const cb of cr.cables){cb.m.position.set(cb.ox,(top+y+.2)/2,z+cb.oz);cb.m.scale.y=Math.max(.01,len)}}
function hash(n){return (Math.sin(n*127.1)*43758.5453)%1}
function port(x0,craneColor,flagTex,roof,skylineCol){
  const g=new THREE.Group();g.position.x=x0;scene.add(g);
  box(300,4,53,M(0xa8a49b,.92,0),0,.5,-33.5,g);
  box(300,4,260,M(0xb4afa4,.95,0),0,.45,-190,g);
  box(300,.3,.7,M(0xe2c046,.6,0),0,QUAY+.15,-7.35,g,false);
  const fender=M(0x16181b,.8,.1);for(let x=-140;x<=140;x+=9){const f=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,2.6,14),fender);f.position.set(x,1.1,-6.8);g.add(f)}
  const bol=M(0x2c3036,.6,.5);for(let x=-136;x<=136;x+=12){const b=new THREE.Mesh(new THREE.CylinderGeometry(.24,.3,.6,10),bol);b.position.set(x,QUAY+.3,-8.1);g.add(b)}
  for(const z of [-9.5,-24])box(300,.12,.35,M(0x3a3f46,.5,.7),0,QUAY+.06,z,g,false);
  const cranes=[crane(g,-6,craneColor),crane(g,4,craneColor)];
  // container yard
  const yard=[];for(let lane=0;lane<4;lane++)for(let col=0;col<56;col++){if(col%11===10)continue;const x=-92+col*3.35,h=1+Math.floor(Math.abs(hash(col*13+lane*71+x0))*4);for(let l=0;l<h;l++)yard.push([x,QUAY+CH/2+l*(CH+.02),-31-lane*4.4,PALETTE[(col*3+lane*5+l*7)%PALETTE.length]])}
  const ym=new THREE.InstancedMesh(contGeo,contMat,yard.length);yard.forEach(([x,y,z,c],i)=>{for(const r of [0,1]){}dummy.position.set(x,y,z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();ym.setMatrixAt(i,dummy.matrix);ym.setColorAt(i,new THREE.Color(c))});
  ym.castShadow=ym.receiveShadow=true;g.add(ym);
  const yard2=new THREE.InstancedMesh(contGeo,contMat,yard.length);yard.forEach(([x,y,z,c],i)=>{dummy.position.set(x,y,z-1.62);dummy.updateMatrix();yard2.setMatrixAt(i,dummy.matrix);yard2.setColorAt(i,new THREE.Color(PALETTE[(i*7)%PALETTE.length]))});yard2.castShadow=true;g.add(yard2);
  // warehouses + office
  const wall=M(0xd9dde2,.8,.05),rf=M(roof,.6,.3);
  for(const [x,w] of [[-70,44],[-12,36],[46,50]]){box(w,11,26,wall,x,QUAY+5.5,-74,g);const r=new THREE.Mesh(new THREE.CylinderGeometry(13.6,13.6,w+.4,24,1,false,0,Math.PI),rf);r.rotation.z=Math.PI/2;r.scale.set(1,1,.32);r.position.set(x,QUAY+11,-74);r.castShadow=true;g.add(r)}
  box(14,16,12,M(0x9fb7cf,.15,.6),104,QUAY+8,-40,g);box(14.4,.6,12.4,white,104,QUAY+16.3,-40,g);
  // light towers
  const pole=M(0x8c939c,.5,.6);for(const x of [-100,-50,0,50,100]){box(.5,24,.5,pole,x,QUAY+12,-28,g);box(2.4,.8,1,white,x,QUAY+24,-28,g)}
  // flag
  box(.22,16,.22,M(0xdddddd,.4,.6),-40,QUAY+8,-9,g);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(5.6,3.7,14,4),new THREE.MeshStandardMaterial({map:flagTex,side:THREE.DoubleSide,roughness:.8}));fl.position.set(-37.2,QUAY+14.1,-9);g.add(fl);flags.push(fl);
  // city skyline + hills on the horizon
  // distant skyline: towers with window bands, softened by haze
  const towerTex=ctex(64,256,(g2,w,h)=>{g2.fillStyle='#fff';g2.fillRect(0,0,w,h);g2.fillStyle='rgba(40,60,90,.35)';for(let y=6;y<h;y+=10)g2.fillRect(0,y,w,5)});
  const far=new THREE.Group();g.add(far); // hidden in open sea
  const sk=new THREE.MeshStandardMaterial({color:skylineCol,map:towerTex,roughness:.35,metalness:.4});
  for(let i=0;i<46;i++){const w=10+Math.abs(hash(i*3.1+x0))*20,h=18+Math.pow(Math.abs(hash(i*7.7+x0)),1.8)*75;box(w,h,w*.8,sk,-420+i*18+hash(i)*10,h/2,-950-Math.abs(hash(i*1.3))*150,far,false)}
  const hill=M(0x83937e,1,0,{flatShading:true});for(let i=0;i<10;i++){const r=90+Math.abs(hash(i*9+x0))*110;const m=new THREE.Mesh(new THREE.ConeGeometry(r,r*.42,9),hill);m.position.set(-420+i*95,0,-980-Math.abs(hash(i))*160);far.add(m)}
  return {g,x0,cranes,far};
}
const SAIL=520;
const CN=port(0,0xc8372d,flagCN,0xb5463a,0x8c9aab);
const IN=port(SAIL,0x2b2b2e,flagIN,0x2b2b2e,0x9aa3ad);

/* ---------- timeline ---------- */
const DOCK_OUT=.40,DOCK_IN=.84;
const shipX=p=>p<DOCK_OUT?0:p>DOCK_IN?SAIL:ease((p-DOCK_OUT)/(DOCK_IN-DOCK_OUT))*SAIL;
const LOAD0=.03,LOAD_STEP=.33/12,UNL0=.86,UNL_STEP=.125/12;
const HMAX=21;
function pathPoint(t,from,to){ // lift, traverse, lower
  if(t<.28){const k=smooth(t/.28);return [from[0],lerp(from[1],HMAX,k),from[2]]}
  if(t<.62){const k=smooth((t-.28)/.34);return [lerp(from[0],to[0],k),HMAX,lerp(from[2],to[2],k)]}
  const k=smooth((t-.62)/.38);return [to[0],lerp(HMAX,to[1],k),to[2]];
}
const KF=[
  {p:0,  o:[58,34,74],  l:[-2,10,-8]},
  {p:.13,o:[24,42,84],  l:[0,10,-10]},
  {p:.27,o:[-52,30,64], l:[0,8,-6]},
  {p:.40,o:[-74,16,42], l:[6,5,0]},
  {p:.52,o:[-50,10,40], l:[8,4,0]},
  {p:.64,o:[38,9,56],   l:[0,4,0]},
  {p:.76,o:[66,16,46],  l:[-4,4,0]},
  {p:.84,o:[44,32,76],  l:[0,9,-8]},
  {p:.92,o:[-22,42,88], l:[0,10,-10]},
  {p:1,  o:[-50,54,104],l:[4,7,-14]},
];
let camDist=1.15;
const vA=new THREE.Vector3(),vB=new THREE.Vector3();
function camAt(p,sx){
  let i=0;while(i
<KF.length-2&&p>KF[i+1].p)i++;
  const a=KF[i],b=KF[i+1],t=smooth(clamp((p-a.p)/(b.p-a.p),0,1));
  vA.set(lerp(a.o[0],b.o[0],t),lerp(a.o[1],b.o[1],t),lerp(a.o[2],b.o[2],t)).multiplyScalar(camDist);
  vB.set(lerp(a.l[0],b.l[0],t),lerp(a.l[1],b.l[1],t),lerp(a.l[2],b.l[2],t));
  camera.position.set(sx+vA.x,Math.max(3,vA.y),vA.z);camera.lookAt(sx+vB.x,vB.y,vB.z);
}
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<820?58:42;
  if(w>820)camera.setViewOffset(w,h,-w*.17,0,w,h);else camera.clearViewOffset();camDist=w<820?1.3:1.15;camera.updateProjectionMatrix()}
addEventListener('resize',resize);resize();

let target=0,prog=0,lastStep=-1,lastX=0,visible=false;
const snap=location.hash==='#snap';
new IntersectionObserver(([e])=>visible=e.isIntersecting,{rootMargin:'300px'}).observe(section);
function readScroll(){const r=section.getBoundingClientRect();target=clamp(-r.top/(r.height-innerHeight),0,1)}
addEventListener('scroll',readScroll,{passive:true});readScroll();prog=target;
const STEP_AT=[0,.12,.24,DOCK_OUT,DOCK_IN,.92];

const clock=new THREE.Clock();
(function frame(){
  requestAnimationFrame(frame);
  const dt=Math.min(clock.getDelta(),.05);
  if(!visible)return;
  const t=clock.elapsedTime;
  prog+=(target-prog)*(reduceMotion||snap?1:Math.min(1,dt*4));
  const p=prog;

  // ship motion
  const sx=shipX(p);const speed=Math.abs(sx-lastX)/Math.max(dt,.001);lastX=sx;
  const sail=Math.sin(Math.PI*clamp((p-DOCK_OUT)/(DOCK_IN-DOCK_OUT),0,1));const amp=.1+.9*sail;
  ship.position.set(sx,Math.sin(t*.8)*.14*amp-.04,0);
  ship.rotation.set(Math.sin(t*.6)*.014*amp,0,Math.sin(t*.45+1)*.007*amp);
  if(radar)radar.rotation.y=t*1.6;

  // containers + cranes
  const active=[null,null];
  for(const s of animated){
    let x=s.x,y=s.y,z=s.z,on=true;
    const lt=clamp((p-(LOAD0+s.k*LOAD_STEP))/(LOAD_STEP*.92),0,1);
    const ut=clamp((p-(UNL0+(11-s.k)*UNL_STEP))/(UNL_STEP*.92),0,1);
    if(p<DOCK_OUT){ // loading in Shanghai (ship at x=0)
      const quay=[s.x,QUAY+CH/2,-12.4-s.r*1.7],slot=[s.x,s.y+ship.position.y,s.z];
      const w=lt<=0?quay:lt>=1?slot:pathPoint(lt,quay,slot);
      x=w[0]-sx;y=w[1]-ship.position.y;z=w[2];
      if(lt>0&&lt<1)active[s.crane]={w,port:CN};
    }else if(p>DOCK_IN){ // unloading in Chennai
      const slot=[SAIL+s.x,s.y+ship.position.y,s.z],quay=[SAIL+s.x,QUAY+CH/2,-12.4-s.r*1.7];
      const w=ut<=0?slot:ut>=1?quay:pathPoint(ut,slot,quay);
      x=w[0]-sx;y=w[1]-ship.position.y;z=w[2];
      if(ut>0&&ut<1)active[s.crane]={w,port:IN};
    }
    place(s,x,y,z,0,on);
  }
  plainIM.instanceMatrix.needsUpdate=brandIM.instanceMatrix.needsUpdate=true;
  for(const P of [CN,IN])P.cranes.forEach((cr,ci)=>{const a=active[ci];
    if(a&&a.port===P){cr.g.position.x=a.w[0]-P.x0;setCrane(cr,a.w[2],a.w[1]+CH/2+.21)}
  });

  // sea + foam
  water.material.uniforms.time.value=t*.55;
  const wa=clamp(speed/24,0,1);
  wake.position.set(sx-L/2-55,.06,0);wake.material.uniforms.uT.value=t;wake.material.uniforms.uA.value+=(wa-wake.material.uniforms.uA.value)*.08;
  sideFoam.forEach(f=>{f.material.uniforms.uT.value=t;f.material.uniforms.uA.value=wake.material.uniforms.uA.value*.8});
  for(const o of others){o.g.position.x=o.x+o.dir*((t*2.2)%400);}
  for(const f of flags){const pa=f.geometry.attributes.position;for(let i=0;i<pa.count;i++){const x=pa.getX(i);pa.setZ(i,Math.sin(x*1.3-t*5)*.28*(x+2.8)/5.6)}pa.needsUpdate=true}

  // open sea: coastlines only near the ports
  CN.far.visible=sx<120;IN.far.visible=sx>SAIL-120;
  // light follows the action for crisp shadows
  sunL.target.position.set(sx,0,-8);sunL.position.copy(sunL.target.position).addScaledVector(sun,220);

  camAt(p,sx);
  renderer.render(scene,camera);

  // UI
  let si=0;for(let i=0;i<STEP_AT.length;i++)if(p>=STEP_AT[i])si=i;
  if(si!==lastStep){steps.forEach((el,i)=>{el.classList.toggle('on',i===si);el.classList.toggle('done',i<si)});lastStep=si}
  const rp=sx/SAIL;fill.style.width=(rp*100)+'%';boat.style.left=(rp*100)+'%';
  const day=p<DOCK_OUT?Math.round(p/DOCK_OUT*7):p<DOCK_IN?7+Math.round((p-DOCK_OUT)/(DOCK_IN-DOCK_OUT)*23):30+Math.round((p-DOCK_IN)/(1-DOCK_IN)*5);
  dayEl.textContent='Day '+day;
})();
}
