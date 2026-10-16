import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createDimensions } from './dimensions.js';

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   META â€” Everything Is Connected
   TipografÃ­a generativa: la palabra es el nÃºcleo de un grafo fÃ­sico.
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const RAPIER_URL = 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.12.0/rapier.es.js';
// Opcional: URLs de fotografÃ­as propias (se usan en vez de las ilustraciones generadas).
const PHOTO_URLS = [];
const UNIVERSE = {
  clickThreshold: 4,
  clickInterval: 1.35,
  idleTimeout: 12,
  transitionDuration: 2.2,
  palettes: [
    {background:'#f4f7ff', ink:'#102d63', accent:'#1877F2'},
    {background:'#fff7fc', ink:'#321442', accent:'#D946A6'},
    {background:'#f2fbf7', ink:'#123e32', accent:'#25D366'},
    {background:'#f5f3ff', ink:'#17133f', accent:'#7566FF'}
  ]
};

const WORD = 'Meta', WORD_W = 7, STEP = 1 / 60;
const PAL = { ink:'#111111', blue:'#1877F2', green:'#25D366', pink:'#D946A6', violet:'#7566FF', orange:'#FF8A45' };
const clamp = (x,a,b)=>Math.min(b,Math.max(a,x));
const smooth = (a,b,x)=>{ x = clamp((x-a)/(b-a),0,1); return x*x*(3-2*x); };
const rnd = (a=1,b)=> b===undefined ? Math.random()*a : a+Math.random()*(b-a);
const easeBack = x => { x = clamp(x,0,1); const c=1.70158; return 1 + (c+1)*Math.pow(x-1,3) + c*Math.pow(x-1,2); };
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const C = k => new THREE.Color(PAL[k]);
const cBlue=C('blue'), cGreen=C('green'), cPink=C('pink'), cViolet=C('violet'), cOrange=C('orange');
const KIND_COL = [cBlue, cPink, cGreen, cViolet];           // M, E, T, A
const SPEED = [3.6, 4.4, 6.6, 4.0];                         // velocidad de seÃ±al por tipo
const ATT   = [0.80, 0.80, 0.90, 0.80];                     // atenuaciÃ³n por salto

function gradE(u,o){ // rosa â†’ violeta â†’ naranja
  let a,b,k; if(u<.5){a=cPink;b=cViolet;k=u*2}else{a=cViolet;b=cOrange;k=(u-.5)*2}
  o[0]=a.r+(b.r-a.r)*k; o[1]=a.g+(b.g-a.g)*k; o[2]=a.b+(b.b-a.b)*k;
}

async function start(){
  const fontReady = Promise.race([document.fonts.load('600 120px Inter','Meta'), new Promise(r=>setTimeout(r,3000))]);
  const [mod] = await Promise.all([import(RAPIER_URL), fontReady]);
  const RAPIER = mod.default || mod;
  await RAPIER.init();

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Renderer / escena â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.setClearColor(0xffffff,0);
  Object.assign(renderer.domElement.style,{zIndex:5,pointerEvents:'none'});
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = null;
  const universeState = {
    active: -1,
    progress: 0,
    target: 0,
    idle: 0,
    lastInteraction: performance.now(),
    streakLetter: -1,
    streakCount: 0,
    lastClick: -Infinity
  };
  const initialBackground = new THREE.Color(0xffffff);
  const targetBackground = new THREE.Color(0xffffff);
  const bgCol = new THREE.Color(0xffffff);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const view = { d:15, halfW:7, halfH:4, ptScale:{value:1} };
  function layout(){
    const aspect = innerWidth/innerHeight, th = Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
    view.d = Math.max(11, (WORD_W/0.46)/(2*th*aspect));
    view.halfH = view.d*th; view.halfW = view.halfH*aspect;
    camera.aspect = aspect; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    view.ptScale.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y/(2*th);
  }
  function touchUniverse(){
    universeState.lastInteraction = performance.now();
    universeState.idle = 0;
    wake = true;
  }
  function resetClickStreak(){
    universeState.streakLetter = -1;
    universeState.streakCount = 0;
    universeState.lastClick = -Infinity;
  }
  function activateUniverse(index){
    if(universeState.active !== -1 || !dims.canOpen(index)) return;
    dims.open(index);
    universeState.active = index;
    universeState.target = 1;
    universeState.progress = 0;
    resetClickStreak();
    touchUniverse();
    const L = letters[index];
    L.heat = Math.max(L.heat, .9);
    L.energy = Math.max(L.energy, 1.1);
    for(const item of L.pools){
      if(!item.alive) spawn(item, L);
    }
    if(index === 2){
      for(let i=0;i<8;i++) fire(L, L.nodes[(Math.random()*L.nodes.length)|0], .8);
    }
  }
  function beginReturn(){
    if(universeState.active === -1 || universeState.target === 0) return;
    universeState.target = 0;
    resetClickStreak();
    touchUniverse();
  }
  function registerLetterClick(L){
    const now = performance.now()/1000;
    if(universeState.active !== -1){
      touchUniverse();
      return;
    }
    if(L.i !== universeState.streakLetter || now-universeState.lastClick > UNIVERSE.clickInterval){
      universeState.streakLetter = L.i;
      universeState.streakCount = 0;
    }
    universeState.streakCount++;
    universeState.lastClick = now;
    if(universeState.streakCount >= UNIVERSE.clickThreshold) activateUniverse(L.i);
  }
  layout();
  camera.position.set(0,0,view.d); camera.lookAt(0,0,0);

  scene.add(new THREE.HemisphereLight(0xffffff,0xdfe6ff,1.0));
  const key = new THREE.DirectionalLight(0xffffff,2.4); key.position.set(-3,5,9); key.castShadow = true;
  key.shadow.mapSize.set(1024,1024); key.shadow.bias = -0.0004;
  Object.assign(key.shadow.camera,{left:-14,right:14,top:9,bottom:-9,near:1,far:32});
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xcfd8ff,0.7); fill.position.set(6,-2,6); scene.add(fill);
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(60,40), new THREE.ShadowMaterial({opacity:0.1}));
  shadowPlane.position.z = -2.2; shadowPlane.receiveShadow = true; scene.add(shadowPlane);

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Letras: texturas, mÃ¡scaras, nodos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const F = 600, PAD = 36, MC = 6;
  const FONT = `600 ${F}px Inter, "Helvetica Neue", Arial, sans-serif`;
  const mctx = document.createElement('canvas').getContext('2d'); mctx.font = FONT;
  const total = mctx.measureText(WORD).width, S = WORD_W/total;
  const CH = Math.ceil(F*0.727 + PAD*2 + 16), baseY = PAD + F*0.727 + 6;
  const letters = [];
  for(let i=0;i<WORD.length;i++){
    const ch = WORD[i], adv = mctx.measureText(ch).width;
    const left = mctx.measureText(WORD.slice(0,i+1)).width - adv;
    const W = Math.ceil(adv + PAD*2);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = CH;
    const g = cv.getContext('2d'); g.font = FONT; g.fillStyle = PAL.ink; g.fillText(ch, PAD, baseY);
    const img = g.getImageData(0,0,W,CH).data;
    const mw = Math.ceil(W/MC), mh = Math.ceil(CH/MC), ink = new Uint8Array(mw*mh), hit = new Uint8Array(mw*mh);
    let minX=W,maxX=0,minY=CH,maxY=0;
    for(let y=0;y<CH;y++)for(let x=0;x<W;x++) if(img[(y*W+x)*4+3]>40){
      ink[((y/MC)|0)*mw+((x/MC)|0)]=1; if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y;
    }
    for(let y=0;y<mh;y++)for(let x=0;x<mw;x++) if(ink[y*mw+x])
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){ const nx=x+dx,ny=y+dy; if(nx>=0&&ny>=0&&nx<mw&&ny<mh) hit[ny*mw+nx]=1; }
    letters.push({ i, ch, W, H:CH, cv, img, mw, mh, ink, hit, bbox:[minX,maxX,minY,maxY],
      cx:(left+adv/2-total/2)*S, wW:W*S, wH:CH*S, kind:i,
      theme:KIND_COL[i], depthAmp:[0.12,0.3,0,1.0][i], zHover:[0.28,0.28,0.28,0.4][i], zHeat:[0.25,0.25,0.25,0.55][i],
      heat:0, energy:0, hover:0, clicks:0, nextSpawn:0, nextSig:0, lastRip:-9, ripIdx:0, nodes:[], pools:[], tintAmt:0 });
  }
  const inkAt = (L,x,y,m)=>{ const cx=(x/MC)|0, cy=(y/MC)|0; return (cx<0||cy<0||cx>=L.mw||cy>=L.mh)?0:m[cy*L.mw+cx]; };

  // Muestreo Poisson dentro de la tinta + kNN con comprobaciÃ³n de tinta
  const MIN_D = 0.21;
  const gNodes = [];            // {L, lx, ly, lz}
  const sEdges = [];            // [a,b] Ã­ndices globales
  for(const L of letters){
    const R = mulberry32(1337+L.i*97), minD = MIN_D/S, cand = [];
    for(let y=4;y<L.H;y+=7)for(let x=4;x<L.W;x+=7) if(L.img[(y*L.W+x)*4+3]>235) cand.push([x+R()*4-2,y+R()*4-2]);
    for(let i=cand.length-1;i>0;i--){ const j=(R()*(i+1))|0; [cand[i],cand[j]]=[cand[j],cand[i]]; }
    const pts = [];
    for(const c of cand){ let ok=true; for(const p of pts){ const dx=p[0]-c[0],dy=p[1]-c[1]; if(dx*dx+dy*dy<minD*minD){ok=false;break} } if(ok) pts.push(c); }
    const clear = (a,b)=>{ const n=Math.max(2,Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/8)); let inside=0;
      for(let k=0;k<=n;k++){ const u=k/n; if(inkAt(L,a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,L.hit)) inside++; } return inside/(n+1)>0.9; };
    const base = gNodes.length, set = new Set(), local = [], par = pts.map((_,i)=>i);
    const find = x=>{ while(par[x]!==x){par[x]=par[par[x]];x=par[x]} return x };
    const add = (i,j)=>{ const k=i<j?i*1000+j:j*1000+i; if(set.has(k))return; set.add(k); local.push([i,j]); par[find(i)]=find(j); };
    pts.forEach((p,i)=>{
      const ds = pts.map((q,j)=>[j,Math.hypot(p[0]-q[0],p[1]-q[1])]).filter(d=>d[0]!==i&&d[1]<minD*2.7).sort((a,b)=>a[1]-b[1]);
      let n=0; for(const d of ds){ if(n>=3)break; if(clear(p,pts[d[0]])){ add(i,d[0]); n++; } }
    });
    for(let guard=0;guard<30;guard++){ // conectar componentes
      let best=null; for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){ if(find(i)===find(j))continue;
        const d=Math.hypot(pts[i][0]-pts[j][0],pts[i][1]-pts[j][1]); if(!best||d<best[2])best=[i,j,d]; }
      if(!best)break; add(best[0],best[1]);
    }
    pts.forEach((p,i)=>{ gNodes.push({L, lx:(p[0]-L.W/2)*S, ly:(L.H/2-p[1])*S, lz:R()*2-1}); L.nodes.push(base+i); });
    local.forEach(e=>sEdges.push([base+e[0],base+e[1]]));
  }
  const NL = gNodes.length;
  // Enlaces entre letras (pares mÃ¡s cercanos, nodos distintos)
  const crossPairs = [[0,1,4],[1,2,4],[2,3,4],[0,2,2],[1,3,2],[0,3,1]];
  const wx = n=>letters[gNodes[n].L.i].cx + gNodes[n].lx;
  for(const [a,b,k] of crossPairs){
    const all=[]; for(const i of letters[a].nodes)for(const j of letters[b].nodes) all.push([i,j,Math.hypot(wx(i)-wx(j),gNodes[i].ly-gNodes[j].ly)]);
    all.sort((x,y)=>x[2]-y[2]); const ua=new Set(),ub=new Set(); let c=0;
    for(const p of all){ if(c>=k)break; if(ua.has(p[0])||ub.has(p[1]))continue; ua.add(p[0]);ub.add(p[1]); sEdges.push([p[0],p[1]]); c++; }
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Pool de objetos secundarios (definiciÃ³n) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const OBJ_SPEC = [];
  for(let i=0;i<6;i++) OBJ_SPEC.push({type:'frame',host:0});
  for(let i=0;i<4;i++) OBJ_SPEC.push({type:'tile',host:1});
  for(let i=0;i<3;i++) OBJ_SPEC.push({type:'blob',host:1});
  for(let i=0;i<8;i++) OBJ_SPEC.push({type:'solid',host:3});
  const NOBJ = OBJ_SPEC.length, NN = NL + NOBJ;
  const DYN_N = 110, NS = sEdges.length, NE = NS + DYN_N;

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Estado del grafo (typed arrays) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const px=new Float32Array(NN),py=new Float32Array(NN),pz=new Float32Array(NN);
  const vx=new Float32Array(NN),vy=new Float32Array(NN),vz=new Float32Array(NN);
  const lxA=new Float32Array(NN),lyA=new Float32Array(NN),lzA=new Float32Array(NN);
  const act=new Float32Array(NN),refr=new Float32Array(NN),nhash=new Float32Array(NN);
  const cr=new Float32Array(NN),cg=new Float32Array(NN),cb=new Float32Array(NN);
  const br=new Float32Array(NN),bg=new Float32Array(NN),bb=new Float32Array(NN);
  const nLet=new Int8Array(NN).fill(-1);
  const tmp=[0,0,0];
  gNodes.forEach((g,n)=>{
    nLet[n]=g.L.i; lxA[n]=g.lx; lyA[n]=g.ly; lzA[n]=g.lz; nhash[n]=Math.random();
    const L=g.L; let c;
    if(L.i===1){ gradE(clamp(0.5+g.lx/L.wW*0.9+g.ly*0.15,0,1),tmp); br[n]=tmp[0];bg[n]=tmp[1];bb[n]=tmp[2]; }
    else { c = L.theme; br[n]=c.r; bg[n]=c.g; bb[n]=c.b; }
    cr[n]=br[n]; cg[n]=bg[n]; cb[n]=bb[n];
    px[n]=L.cx+g.lx; py[n]=g.ly; pz[n]=0;
  });
  // Aristas
  const ea=new Int32Array(NE),eb=new Int32Array(NE),erest=new Float32Array(NE),ek=new Float32Array(NE);
  const eon=new Uint8Array(NE),edyn=new Uint8Array(NE),elife=new Float32Array(NE),eown=new Int16Array(NE).fill(-1);
  const adj = Array.from({length:NN},()=>[]);
  sEdges.forEach(([a,b],e)=>{ ea[e]=a;eb[e]=b;eon[e]=1;ek[e]=34;
    erest[e]=Math.hypot(px[a]-px[b],py[a]-py[b]); adj[a].push(e); adj[b].push(e); });
  const freeDyn=[]; for(let e=NE-1;e>=NS;e--){ freeDyn.push(e); edyn[e]=1; }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Meshes de letras â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const sharedLetterVert = `
    uniform vec3 uCursor; uniform float uBulge, uPull, uSigma, uTime; uniform vec4 uRip[3];
    varying vec2 vUv;
    void main(){
      vUv = uv;
      vec4 wp = modelMatrix*vec4(position,1.);
      vec2 d = uCursor.xy - wp.xy; float f = exp(-dot(d,d)/(2.*uSigma*uSigma));
      wp.z += uBulge*f; wp.xy += d*f*uPull;
      for(int i=0;i<3;i++){ vec4 r = uRip[i]; float tt = uTime - r.z;
        if(r.w>0. && tt>0. && tt<2.2){ vec2 q = wp.xy - r.xy; float dist = length(q);
          float w = exp(-pow((dist-tt*3.2)/0.38,2.)); float e = exp(-tt*1.6);
          wp.z += r.w*w*e; wp.xy += q/(dist+1e-3)*r.w*0.35*w*e; } }
      gl_Position = projectionMatrix*viewMatrix*wp;
    }`;
  const letterFrag = `
    uniform sampler2D uMap; uniform vec3 uColor, uTint; uniform float uTintAmt, uMode, uShadow; uniform vec2 uTexel;
    varying vec2 vUv;
    void main(){
      if(uMode<.5){ float a = texture2D(uMap,vUv).a; gl_FragColor = vec4(mix(uColor,uTint,uTintAmt),a); }
      else { float s=0.; for(int i=-2;i<=2;i++)for(int j=-2;j<=2;j++) s+=texture2D(uMap,vUv+vec2(float(i),float(j))*uTexel*7.).a;
             gl_FragColor = vec4(.06,.08,.14,s/25.*uShadow); }
      #include <colorspace_fragment>
    }`;
  const cursorU = {value:new THREE.Vector3(999,999,0)};
  const timeU = {value:0};
  const inkC = new THREE.Color(PAL.ink), inkTarget = new THREE.Color(PAL.ink);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  for(const L of letters){
    const tex = new THREE.CanvasTexture(L.cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8,maxAniso);
    tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
    const uni = { uMap:{value:tex}, uColor:{value:inkC}, uTint:{value:new THREE.Color(0x111111)}, uTintAmt:{value:0},
      uCursor:cursorU, uBulge:{value:0}, uPull:{value:0}, uSigma:{value:0.55}, uTime:timeU,
      uRip:{value:[new THREE.Vector4(),new THREE.Vector4(),new THREE.Vector4()]}, uMode:{value:0}, uShadow:{value:0}, uTexel:{value:new THREE.Vector2(1/L.W,1/L.H)} };
    const geo = new THREE.PlaneGeometry(L.wW,L.wH,40,40);
    const mat = new THREE.ShaderMaterial({uniforms:uni, vertexShader:sharedLetterVert, fragmentShader:letterFrag, transparent:true, depthWrite:false});
    const sUni = Object.assign({}, uni, {uMode:{value:1}, uShadow:{value:0}});
    const smat = new THREE.ShaderMaterial({uniforms:sUni, vertexShader:sharedLetterVert, fragmentShader:letterFrag, transparent:true, depthWrite:false});
    L.mesh = new THREE.Mesh(geo,mat); L.mesh.renderOrder = 2; L.mesh.position.set(L.cx,0,0);
    L.shadow = new THREE.Mesh(geo,smat); L.shadow.renderOrder = 1; L.shadow.visible = false;
    L.uni = uni; L.sUni = sUni;
    scene.add(L.shadow, L.mesh);
  }
  const letterMeshes = letters.map(l=>l.mesh);
  const dims = createDimensions({ state:universeState, beginReturn, getWord:()=>({ h:F*0.727*S/(2*view.halfH)*innerHeight }) });

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ FÃ­sica (Rapier) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const world = new RAPIER.World({x:0,y:0,z:0}); world.timestep = STEP;
  const G_LET=1, G_CUR=2, G_OBJ=4, grp=(m,f)=>((m&0xffff)<<16)|(f&0xffff);
  for(const L of letters){
    const [x0,x1,y0,y1] = L.bbox;
    L.ihx = (x1-x0)/2*S; L.ihy = (y1-y0)/2*S;
    L.body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(L.cx,0,0).lockRotations().setCanSleep(false).setGravityScale(0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(L.ihx,L.ihy,0.14).setTranslation(((x0+x1)/2-L.W/2)*S,(L.H/2-(y0+y1)/2)*S,0)
      .setDensity(1).setRestitution(0.2).setCollisionGroups(grp(G_LET,G_OBJ)), L.body);
    L.mass = L.body.mass();
  }
  function constrainLettersToView(){
    for(const L of letters){
      const p = L.body.translation();
      const limitX = Math.max(0, view.halfW - L.ihx - 0.2);
      const limitY = Math.max(0, view.halfH - L.ihy - 0.2);
      const x = clamp(p.x, -limitX, limitX);
      const y = clamp(p.y, -limitY, limitY);
      const z = clamp(p.z, -0.25, 1.1);
      if(x === p.x && y === p.y && z === p.z) continue;
      const v = L.body.linvel();
      L.body.setTranslation({x,y,z}, true);
      L.body.setLinvel({
        x: x === p.x ? v.x * 0.35 : 0,
        y: y === p.y ? v.y * 0.35 : 0,
        z: z === p.z ? v.z * 0.35 : 0
      }, true);
    }
  }
  const curBody = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(999,999,0));
  world.createCollider(RAPIER.ColliderDesc.ball(0.5).setCollisionGroups(grp(G_CUR,G_OBJ)), curBody);

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ImÃ¡genes procedurales (fotogramas y composiciones) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function person(g,x,y,s,col){ g.fillStyle=col; g.beginPath(); g.arc(x,y-70*s,16*s,0,7); g.fill();
    g.beginPath(); g.moveTo(x-30*s,y); g.quadraticCurveTo(x-30*s,y-54*s,x,y-54*s); g.quadraticCurveTo(x+30*s,y-54*s,x+30*s,y); g.fill(); }
  function finishPhoto(g,w,h,R){
    g.globalCompositeOperation='multiply'; g.fillStyle='#dfe9ff'; g.fillRect(0,0,w,h); g.globalCompositeOperation='source-over';
    for(let k=0;k<2200;k++){ g.fillStyle=`rgba(${R()<.5?0:255},${R()<.5?0:255},255,.05)`; g.fillRect(R()*w,R()*h,1.4,1.4); }
    const v=g.createRadialGradient(w/2,h/2,h*.35,w/2,h/2,h*.8); v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(1,'rgba(10,20,50,.35)');
    g.fillStyle=v; g.fillRect(0,0,w,h);
  }
  const scenes = [
    (g,w,h)=>{ const s=g.createRadialGradient(170,150,5,170,150,120); s.addColorStop(0,'#fff6dc'); s.addColorStop(1,'rgba(255,230,190,0)'); g.fillStyle=s; g.fillRect(0,0,w,h);
      g.fillStyle='#1d2a4d'; g.beginPath(); g.moveTo(0,260); g.quadraticCurveTo(120,230,w,270); g.lineTo(w,h); g.lineTo(0,h); g.fill(); person(g,100,262,1,'#101a38'); person(g,152,268,.88,'#101a38'); },
    (g,w,h)=>{ g.fillStyle='#2a2140'; g.fillRect(0,0,w,h); const s=g.createRadialGradient(128,70,5,128,70,150); s.addColorStop(0,'#ffcf8a'); s.addColorStop(1,'rgba(255,160,100,0)'); g.fillStyle=s; g.fillRect(0,0,w,h);
      person(g,58,250,1.1,'#e58d6f'); person(g,128,246,1.15,'#7f8cff'); person(g,198,250,1.1,'#f2c27a'); g.fillStyle='#3a2a2f'; g.fillRect(0,250,w,70);
      g.fillStyle='#f4efe6'; [70,128,186].forEach(x=>{ g.beginPath(); g.arc(x,262,8,0,7); g.fill(); }); },
    (g,w,h)=>{ g.fillStyle='#7fb98f'; g.beginPath(); g.ellipse(120,330,220,110,0,0,7); g.fill();
      g.strokeStyle='#fff'; g.lineWidth=1.2; g.beginPath(); g.moveTo(92,236); g.quadraticCurveTo(140,160,178,96); g.stroke();
      g.fillStyle='#ff8a45'; g.beginPath(); g.moveTo(180,50); g.lineTo(208,92); g.lineTo(180,138); g.lineTo(152,92); g.fill();
      g.strokeStyle='#d946a6'; g.lineWidth=2; g.beginPath(); g.moveTo(180,138); g.bezierCurveTo(160,170,200,190,176,226); g.stroke(); person(g,90,262,.9,'#1d2a4d'); },
    (g,w,h)=>{ g.fillStyle='#d8c0a0'; g.fillRect(0,0,w,h); g.fillStyle='#f7f3ec'; g.beginPath(); g.arc(128,170,78,0,7); g.fill();
      g.fillStyle='#fff'; g.beginPath(); g.arc(128,170,44,0,7); g.fill(); g.fillStyle='#4a2e22'; g.beginPath(); g.arc(128,170,34,0,7); g.fill();
      g.save(); g.translate(150,70); g.rotate(-.2); g.fillStyle='#f1ead9'; g.fillRect(-60,-28,120,56); g.fillStyle='#1877f2'; g.fillRect(-60,-28,10,56); g.restore(); },
    (g,w,h)=>{ g.fillStyle='rgba(255,255,255,.55)'; g.beginPath(); g.arc(70,120,52,0,7); g.fill(); const R=mulberry32(9);
      for(let x=0;x<w;x+=34){ const bh=90+R()*130; g.fillStyle=['#26335f','#33426f','#1d2a4d'][(x/34)%3|0]; g.fillRect(x,h-bh,32,bh);
        for(let y=h-bh+10;y<h-8;y+=16) if(R()>.5){ g.fillStyle='#ffd88a'; g.fillRect(x+6,y,5,7); g.fillRect(x+19,y,5,7); } } },
    (g,w,h)=>{ person(g,112,330,2.3,'#26335f'); person(g,160,330,2.1,'#7a4a63'); g.fillStyle='rgba(255,255,255,.35)'; g.beginPath(); g.arc(128,70,40,0,7); g.fill(); },
  ];
  const skyPair = [['#cfe3ff','#ffd9c2'],['#2b3a67','#7f4a6a'],['#a9d1ff','#e9f3ff'],['#f3e7d8','#d9c0a3'],['#9bb8ff','#ffe3d1'],['#ffd0b5','#8aa4ff']];
  const photoTex = [];
  for(let i=0;i<6;i++){
    const c=document.createElement('canvas'); c.width=256; c.height=320; const g=c.getContext('2d'), w=256, h=320, R=mulberry32(77+i*13);
    const gr=g.createLinearGradient(0,0,0,h); gr.addColorStop(0,skyPair[i][0]); gr.addColorStop(1,skyPair[i][1]); g.fillStyle=gr; g.fillRect(0,0,w,h);
    scenes[i](g,w,h); finishPhoto(g,w,h,R);
    const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4; photoTex.push(t);
  }
  PHOTO_URLS.slice(0,6).forEach((u,i)=>new THREE.TextureLoader().load(u,t=>{ t.colorSpace=THREE.SRGBColorSpace; photoTex[i].image=t.image; photoTex[i].needsUpdate=true; }));
  const tileTex = [];
  for(let i=0;i<4;i++){
    const c=document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d'), R=mulberry32(400+i*31);
    const cols=[PAL.pink,PAL.violet,PAL.orange]; const o=i%3;
    const gr=g.createLinearGradient(R()*256,0,R()*256,256); gr.addColorStop(0,cols[o]); gr.addColorStop(.55,cols[(o+1)%3]); gr.addColorStop(1,cols[(o+2)%3]); g.fillStyle=gr; g.fillRect(0,0,256,256);
    g.globalCompositeOperation='screen';
    for(let k=0;k<5;k++){ const x=R()*256,y=R()*256,r=50+R()*90; const rg=g.createRadialGradient(x,y,0,x,y,r); rg.addColorStop(0,cols[(R()*3)|0]+'cc'); rg.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=rg; g.fillRect(0,0,256,256); }
    g.globalCompositeOperation='source-over'; g.strokeStyle='rgba(255,255,255,.55)'; g.lineWidth=3;
    for(let k=0;k<3;k++){ g.beginPath(); g.arc(R()*256,R()*256,30+R()*70,R()*6,R()*6+2.2); g.stroke(); }
    g.fillStyle='rgba(255,255,255,.85)'; g.beginPath(); g.arc(60+R()*140,60+R()*140,12+R()*18,0,7); g.fill();
    const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4; tileTex.push(t);
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Objetos secundarios (pool reutilizable) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const solidGeos = [new THREE.IcosahedronGeometry(.34,0), new THREE.OctahedronGeometry(.38), new THREE.BoxGeometry(.46,.46,.46), new THREE.TorusGeometry(.3,.1,18,40),
    new THREE.TetrahedronGeometry(.42), new THREE.DodecahedronGeometry(.34), new THREE.ConeGeometry(.3,.6,5), new THREE.TorusKnotGeometry(.24,.075,80,12)];
  const solidEdges = solidGeos.map((g,i)=> (i===3||i===7)?null:new THREE.EdgesGeometry(g,20));
  const wireMat = new THREE.LineBasicMaterial({color:0x111111,transparent:true,opacity:.35});
  const solidColors = [PAL.violet,PAL.ink,'#f4f4f8',PAL.violet,'#f4f4f8',PAL.ink,PAL.blue,PAL.violet];
  const frameBox = new THREE.BoxGeometry(1,1.26,0.05), tileBox = new THREE.BoxGeometry(.9,.9,.04);
  const framePlane = new THREE.PlaneGeometry(.86,1.12), tilePlane = new THREE.PlaneGeometry(.82,.82);
  const blobGeo = new THREE.IcosahedronGeometry(.5,5);
  const blobVert = `uniform float uTime,uSeed; uniform vec3 uVel; varying vec3 vN,vP,vW;
    void main(){ vec3 p=position,n=normal;
      float d=sin(p.x*4.1+uTime*1.3+uSeed)*sin(p.y*3.7+uTime*1.1+uSeed*1.7)*sin(p.z*4.3+uTime*.9+uSeed*2.3); p+=n*d*.16;
      float s=length(uVel); if(s>.02){ vec3 dir=uVel/s; p+=dir*dot(p,dir)*clamp(s*.10,0.,.45); }
      vP=p; vN=normalize(normalMatrix*n); vec4 mv=modelViewMatrix*vec4(p,1.); vW=-mv.xyz; gl_Position=projectionMatrix*mv; }`;
  const blobFrag = `uniform vec3 uA,uB,uC,uGlow; uniform float uMix,uTime,uSeed; varying vec3 vN,vP,vW;
    void main(){ vec3 N=normalize(vN),V=normalize(vW);
      float g=.5+.5*sin(vP.y*2.2+vP.x*1.6+uTime*.5+uSeed);
      vec3 col=mix(mix(uA,uB,smoothstep(0.,.55,g)),uC,smoothstep(.45,1.,g));
      float fr=pow(1.-max(dot(N,V),0.),2.2); vec3 L=normalize(vec3(-.4,.7,.6));
      float sp=pow(max(dot(reflect(-L,N),V),0.),38.);
      col=mix(col,vec3(1.),fr*.38)+sp*.45; col=mix(col,uGlow,uMix*.55);
      gl_FragColor=vec4(col,.94);
      #include <colorspace_fragment>
    }`;
  const objs = [], objByNode = [];
  OBJ_SPEC.forEach((sp,k)=>{
    const o = { k, type:sp.type, host:sp.host, node:NL+k, alive:false, dying:false, life:0, age:0, decay:0, glow:0, gr:1,gg:1,gb:1,
      tx:0,ty:0,tz:0, ph:Math.random()*6.28, edges:[], relinkAt:0, spinX:rnd(-.8,.8), spinY:rnd(-.8,.8), rotT:0, mats:[] };
    const dBody = RAPIER.RigidBodyDesc.dynamic().setTranslation(0,0,-60).setLinearDamping(2.2).setAngularDamping(3).setGravityScale(0).setCanSleep(false);
    let cd, hw=.3, hh=.3;
    if(sp.type==='solid'){ o.gi = (k - 13) % solidGeos.length;
      const mat = new THREE.MeshPhysicalMaterial({color:solidColors[o.gi],roughness:.32,metalness:.15,clearcoat:.7,clearcoatRoughness:.35,envMapIntensity:.9});
      o.mats=[mat]; const mesh = new THREE.Mesh(solidGeos[o.gi],mat); mesh.castShadow=true;
      if(solidEdges[o.gi]) mesh.add(new THREE.LineSegments(solidEdges[o.gi],wireMat));
      o.mesh=mesh; cd=RAPIER.ColliderDesc.ball(.34);
    } else if(sp.type==='blob'){
      const u = {uTime:timeU,uSeed:{value:rnd(0,10)},uVel:{value:new THREE.Vector3()},uA:{value:cPink},uB:{value:cViolet},uC:{value:cOrange},uGlow:{value:new THREE.Color()},uMix:{value:0}};
      o.u=u; o.mesh=new THREE.Mesh(blobGeo,new THREE.ShaderMaterial({uniforms:u,vertexShader:blobVert,fragmentShader:blobFrag,transparent:true}));
      o.mesh.renderOrder=4; dBody.enabledRotations(false,false,false); cd=RAPIER.ColliderDesc.ball(.42);
    } else {
      const isF = sp.type==='frame', idx = isF? k%6 : (k-6)%4;
      const border = new THREE.MeshPhysicalMaterial({color:'#fbfbfd',roughness:.45,clearcoat:.3,envMapIntensity:.7});
      const imgMat = new THREE.MeshBasicMaterial({map:isF?photoTex[idx]:tileTex[idx],toneMapped:false});
      const grp3 = new THREE.Group(); const b = new THREE.Mesh(isF?frameBox:tileBox,border); b.castShadow=true;
      const pl = new THREE.Mesh(isF?framePlane:tilePlane,imgMat); pl.position.z = isF?.031:.022; grp3.add(b,pl);
      o.mesh=grp3; o.mats=[border]; hw=isF?.5:.45; hh=isF?.63:.45;
      dBody.enabledRotations(false,false,true); cd=RAPIER.ColliderDesc.cuboid(hw,hh,.05);
    }
    o.body = world.createRigidBody(dBody);
    world.createCollider(cd.setRestitution(.35).setFriction(0).setDensity(1).setCollisionGroups(grp(G_OBJ,G_LET|G_CUR|G_OBJ)), o.body);
    o.body.setEnabled(false); o.mass = o.body.mass(); o.inertia = o.mass*(hw*hw+hh*hh)/3;
    o.mesh.visible=false; scene.add(o.mesh);
    // color base del nodo-objeto
    const c = o.type==='frame'?cBlue : o.type==='solid'?cViolet : cPink;
    br[o.node]=cr[o.node]=c.r; bg[o.node]=cg[o.node]=c.g; bb[o.node]=cb[o.node]=c.b;
    objs.push(o); objByNode[k]=o; letters[sp.host].pools.push(o);
  });

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Render del grafo: aristas, nodos, pulsos, anillos, curvas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const dyn = THREE.DynamicDrawUsage;
  const lineMat = new THREE.ShaderMaterial({
    vertexShader:`attribute vec3 aCol; attribute float aAlpha; varying vec3 vC; varying float vA; void main(){ vC=aCol; vA=aAlpha; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`varying vec3 vC; varying float vA;
      void main(){ if(vA<.003) discard; gl_FragColor=vec4(vC,vA);
        #include <colorspace_fragment>
      }`,
    transparent:true, depthWrite:false });
  function lineSystem(nVerts, order){
    const geo = new THREE.BufferGeometry(), pos=new Float32Array(nVerts*3), col=new Float32Array(nVerts*3), al=new Float32Array(nVerts);
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(dyn));
    geo.setAttribute('aCol',new THREE.BufferAttribute(col,3).setUsage(dyn));
    geo.setAttribute('aAlpha',new THREE.BufferAttribute(al,1).setUsage(dyn));
    const m = new THREE.LineSegments(geo,lineMat); m.frustumCulled=false; m.renderOrder=order; scene.add(m);
    return {geo,pos,col,al};
  }
  const edgeSys = lineSystem(NE*2,3);
  const NC=12, CSEG=20, curveSys = lineSystem(NC*2*CSEG*2,3);

  const pointMat = type => new THREE.ShaderMaterial({
    uniforms:{uScale:view.ptScale,uType:{value:type}},
    vertexShader:`attribute vec3 aCol; attribute float aAlpha,aSize; uniform float uScale; varying vec3 vC; varying float vA;
      void main(){ vC=aCol; vA=aAlpha; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(aSize*uScale/(-mv.z),0.,160.); }`,
    fragmentShader:`uniform float uType; varying vec3 vC; varying float vA;
      void main(){ float d=length(gl_PointCoord-.5)*2.; float a;
        if(uType<.5){ float core=1.-smoothstep(.30,.38,d); float halo=(1.-smoothstep(.38,1.,d))*.18; a=max(core,halo); }
        else { a=smoothstep(.78,.9,d)*(1.-smoothstep(.94,1.,d)); }
        a*=vA; if(a<.004) discard; gl_FragColor=vec4(vC,a);
        #include <colorspace_fragment>
      }`,
    transparent:true, depthWrite:false });
  function pointSystem(n,type,order){
    const geo=new THREE.BufferGeometry(), pos=new Float32Array(n*3), col=new Float32Array(n*3), al=new Float32Array(n), sz=new Float32Array(n);
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(dyn));
    geo.setAttribute('aCol',new THREE.BufferAttribute(col,3).setUsage(dyn));
    geo.setAttribute('aAlpha',new THREE.BufferAttribute(al,1).setUsage(dyn));
    geo.setAttribute('aSize',new THREE.BufferAttribute(sz,1).setUsage(dyn));
    const p=new THREE.Points(geo,pointMat(type)); p.frustumCulled=false; p.renderOrder=order; scene.add(p);
    return {geo,pos,col,al,sz};
  }
  const nodeSys = pointSystem(NL,0,5);
  const NP=360, pulseSys = pointSystem(NP*2,0,6);
  const NR=70, ringSys = pointSystem(NR,1,7);
  const markAll = s=>{ for(const a of Object.values(s.geo.attributes)) a.needsUpdate=true; };

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Pulsos (seÃ±ales) y anillos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const pa=new Int32Array(NP),pb=new Int32Array(NP),pt0=new Float32Array(NP),pdur=new Float32Array(NP),ps=new Float32Array(NP);
  const pr=new Float32Array(NP),pg=new Float32Array(NP),pbl=new Float32Array(NP),pk=new Uint8Array(NP),pon=new Uint8Array(NP);
  let pNext=0, t=0;
  function addPulse(a,b,s,r,g,bl,kind,dur){
    for(let k=0;k<NP;k++){ const i=(pNext+k)%NP; if(pon[i])continue; pNext=i+1;
      pa[i]=a;pb[i]=b;pt0[i]=t;pdur[i]=dur;ps[i]=s;pr[i]=r;pg[i]=g;pbl[i]=bl;pk[i]=kind;pon[i]=1; return; }
  }
  const rx=new Float32Array(NR),ry=new Float32Array(NR),rz=new Float32Array(NR),rt0=new Float32Array(NR),rdur=new Float32Array(NR),rsz=new Float32Array(NR);
  const rr=new Float32Array(NR),rg=new Float32Array(NR),rb=new Float32Array(NR),ron=new Uint8Array(NR); let rNext=0;
  function addRing(x,y,z,size,dur,r,g,b,delay=0){
    for(let k=0;k<NR;k++){ const i=(rNext+k)%NR; if(ron[i])continue; rNext=i+1;
      rx[i]=x;ry[i]=y;rz[i]=z;rt0[i]=t+delay;rdur[i]=dur;rsz[i]=size;rr[i]=r;rg[i]=g;rb[i]=b;ron[i]=1; return; }
  }

  function ripple(L,n,s){ if(t-L.lastRip<0.12)return; L.lastRip=t; L.ripIdx=(L.ripIdx+1)%3;
    L.uni.uRip.value[L.ripIdx].set(px[n],py[n],t,Math.min(0.2,0.05+s*0.1)); }

  // Un nodo recibe una seÃ±al; si no estÃ¡ en periodo refractario, la reparte a sus vecinos.
  function arrive(n,s,r,g,b,from,kind){
    act[n]=Math.min(1.25,act[n]+s*0.9);
    const m=clamp(s*0.75,0,0.85); cr[n]+=(r-cr[n])*m; cg[n]+=(g-cg[n])*m; cb[n]+=(b-cb[n])*m;
    const kk=s*1.4; vx[n]+=rnd(-1,1)*kk; vy[n]+=rnd(-1,1)*kk; vz[n]+=(kind===3?1.6:0.4)*kk*rnd(.3,1);
    const oi=n-NL;
    if(oi>=0){ const o=objByNode[oi]; if(!o.alive) return;
      o.glow=Math.max(o.glow,s); o.gr+=(r-o.gr)*m; o.gg+=(g-o.gg)*m; o.gb+=(b-o.gb)*m;
      o.body.applyImpulse({x:rnd(-1,1)*o.mass*s*.8,y:rnd(-1,1)*o.mass*s*.8,z:rnd(0,1)*o.mass*s},true);
    } else { const L=letters[nLet[n]]; L.heat=Math.min(1.2,L.heat+s*0.04); ripple(L,n,s); }
    if(s>0.42 && Math.random()<0.5) addRing(px[n],py[n],pz[n],0.55,0.6,cr[n],cg[n],cb[n]);
    if(t<refr[n]) return; refr[n]=t+0.85;
    const sn=s*(ATT[kind]+Math.min(0.06,gEnergy*0.02)); if(sn<0.11) return;
    const list=adj[n];
    for(let k=0;k<list.length;k++){ const e=list[k]; if(!eon[e]||(edyn[e]&&elife[e]<.3)) continue;
      const m2=ea[e]===n?eb[e]:ea[e]; if(m2===from||Math.random()>0.88) continue;
      const len=Math.hypot(px[n]-px[m2],py[n]-py[m2],pz[n]-pz[m2]);
      addPulse(n,m2,sn*rnd(.94,1.04),r*.78+cr[n]*.22,g*.78+cg[n]*.22,bl2(b,cb[n]),kind,len/SPEED[kind]+0.05);
    }
  }
  const bl2=(b,c)=>b*.78+c*.22;
  function pulseColor(L,out){ if(L.i===1){ gradE(Math.random(),out); } else { const c=L.theme; out[0]=c.r;out[1]=c.g;out[2]=c.b; } }
  function fire(L,n,s){ pulseColor(L,tmp); arrive(n,s,tmp[0],tmp[1],tmp[2],-1,L.kind); }
  function nearest(L,x,y){ let bn=L.nodes[0],bd=1e9; for(const n of L.nodes){ const d=(px[n]-x)**2+(py[n]-y)**2; if(d<bd){bd=d;bn=n} } return [bn,bd]; }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Enlaces dinÃ¡micos (objeto â†” red) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function linkDyn(a,b,rest,k,o){
    const e=freeDyn.pop(); if(e===undefined) return -1;
    ea[e]=a;eb[e]=b;erest[e]=rest;ek[e]=k;eon[e]=1;elife[e]=0;eown[e]=o.k; adj[a].push(e); adj[b].push(e); o.edges.push(e); return e;
  }
  function unlinkDyn(e){ for(const n of [ea[e],eb[e]]){ const l=adj[n],i=l.indexOf(e); if(i>=0) l.splice(i,1); } eon[e]=0; eown[e]=-1; freeDyn.push(e); }
  function relink(o){
    const L=letters[o.host]; const cand=L.nodes.map(n=>[n,Math.hypot(px[n]-px[o.node],py[n]-py[o.node],pz[n]-pz[o.node])]).sort((a,b)=>a[1]-b[1]);
    const want=[cand[0],cand[1],cand[2]];
    const other=letters[(o.host+(Math.random()<.5?1:3))%4]; // letra vecina
    const oc=other.nodes.map(n=>[n,Math.hypot(px[n]-px[o.node],py[n]-py[o.node])]).sort((a,b)=>a[1]-b[1])[0]; want.push(oc);
    if(o.edges.length===0){ for(const w of want) linkDyn(w[0],o.node,w[1]*0.7,2.0,o); }
    else o.edges.forEach((e,i)=>{ const w=want[i]; if(!w||ea[e]===w[0]) return;
      const l=adj[ea[e]],j=l.indexOf(e); if(j>=0) l.splice(j,1); ea[e]=w[0]; adj[w[0]].push(e); erest[e]=w[1]*0.7; elife[e]=0; });
    // enlace entre objetos del mismo tipo (red de marcos / estructuras)
    if(o.edges.length<5){ const prev=objs.find(q=>q!==o&&q.alive&&!q.dying&&q.type===o.type);
      if(prev) linkDyn(prev.node,o.node,0,0,o); }
    o.relinkAt=t+0.8;
  }

  const VIEW_L=-WORD_W/2, VIEW_R=WORD_W/2;
  function pickTarget(o,L){
    const zr = {frame:[.2,.9],tile:[-.2,.5],blob:[-.3,.4],solid:[-.6,1.8]}[o.type];
    for(let k=0;k<14;k++){
      const th=rnd(6.283), x=L.cx+Math.cos(th)*rnd(1.6,3.0), y=Math.sin(th)*rnd(1.7,2.6);
      if(!(Math.abs(y)>1.45||x<VIEW_L-.6||x>VIEW_R+.6)) continue;
      if(Math.abs(x)>view.halfW-.9||Math.abs(y)>view.halfH-.9) continue;
      if(objs.some(q=>q!==o&&q.alive&&Math.hypot(q.tx-x,q.ty-y)<.95)) continue;
      o.tx=x;o.ty=y;o.tz=rnd(zr[0],zr[1]); return;
    }
    o.tx=clamp(L.cx+rnd(-1,1),-view.halfW+1,view.halfW-1); o.ty=(Math.random()<.5?1:-1)*rnd(1.7,2.2); o.tz=rnd(zr[0],zr[1]);
  }
  function spawn(o,L){
    o.alive=true;o.dying=false;o.life=0;o.age=0;o.decay=0;o.glow=0;o.gr=o.gg=o.gb=1; o.edges.length=0;
    pickTarget(o,L);
    const n=L.nodes[(Math.random()*L.nodes.length)|0];
    o.body.setEnabled(true); o.body.setTranslation({x:px[n],y:py[n],z:0.1},true);
    const dx=o.tx-px[n],dy=o.ty-py[n],dl=Math.hypot(dx,dy)+1e-3;
    o.body.setLinvel({x:dx/dl*3+rnd(-.5,.5),y:dy/dl*3+rnd(-.5,.5),z:rnd(0,1.5)},true);
    o.body.setAngvel({x:0,y:0,z:0},true);
    o.rotT=rnd(-.22,.22); const a=o.rotT*.5; if(o.type==='frame'||o.type==='tile') o.body.setRotation({x:0,y:0,z:Math.sin(a),w:Math.cos(a)},true);
    px[o.node]=px[n];py[o.node]=py[n];pz[o.node]=.1;
    if(o.u){ o.u.uSeed.value=rnd(0,10); }
    o.mesh.visible=true; relink(o);
    addRing(px[n],py[n],0,.9,.8,L.theme.r,L.theme.g,L.theme.b);
  }
  function despawn(o){
    o.alive=false;o.dying=false; o.body.setEnabled(false); o.mesh.visible=false;
    for(const e of o.edges.slice()) unlinkDyn(e); o.edges.length=0;
    px[o.node]=py[o.node]=0; act[o.node]=0;
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Curvas elÃ¡sticas (E) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const curves = Array.from({length:NC},()=>({on:false,a:0,b:0,life:0,age:0,ttl:0,bx:0,by:0,bz:0,vx:0,vy:0,vz:0,sign:1,dying:false}));
  function spawnCurve(){
    const c=curves.find(c=>!c.on); if(!c) return; const E=letters[1];
    const ea_=E.nodes.filter(n=>act[n]>.1); const a=(ea_.length?ea_:E.nodes)[(Math.random()*(ea_.length||E.nodes.length))|0];
    const other=letters[[0,2,3][(Math.random()*3)|0]]; const pool=other.nodes.filter(n=>act[n]>.08);
    const b=(pool.length?pool:other.nodes)[(Math.random()*(pool.length||other.nodes.length))|0];
    Object.assign(c,{on:true,a,b,life:0,age:0,ttl:rnd(3,6),bx:0,by:0,bz:0,vx:0,vy:0,vz:0,sign:Math.random()<.5?1:-1,dying:false});
  }
  const bz3=[0,0,0];
  function writeCurves(h){
    const {pos,col,al}=curveSys; let v=0;
    for(const c of curves){
      if(!c.on){ continue; }
      c.age+=h; if(c.age>c.ttl||letters[1].heat<.2) c.dying=true;
      c.life = c.dying ? c.life-h*1.1 : Math.min(1,c.life+h*1.8);
      if(c.life<=0&&c.dying){ c.on=false; continue; }
      const A=c.a,B=c.b, dx=px[B]-px[A],dy=py[B]-py[A],dz=pz[B]-pz[A], len=Math.hypot(dx,dy,dz)+1e-3;
      // resorte-amortiguador de la curvatura (elasticidad)
      const rest=[-dy/len*len*.28*c.sign, dx/len*len*.28*c.sign, len*.12];
      const kx=46, cx=3.4;
      c.vx+=((rest[0]-c.bx)*kx - c.vx*cx + (vx[A]+vx[B])*.9)*h; c.vy+=((rest[1]-c.by)*kx - c.vy*cx + (vy[A]+vy[B])*.9)*h; c.vz+=((rest[2]-c.bz)*kx - c.vz*cx)*h;
      c.bx+=c.vx*h; c.by+=c.vy*h; c.bz+=c.vz*h;
      // la curva tira de sus extremos: la expresiÃ³n modifica el entorno
      const f=1.1*c.life*Math.min(len,3)/len; vx[A]+=dx*f*h;vy[A]+=dy*f*h; vx[B]-=dx*f*h;vy[B]-=dy*f*h;
      act[A]=Math.max(act[A],.55*c.life); act[B]=Math.max(act[B],.55*c.life);
      for(let strand=0;strand<2;strand++){
        const bm=strand?-0.55:1, ox=(px[A]+px[B])/2+c.bx*bm*2, oy=(py[A]+py[B])/2+c.by*bm*2, oz=(pz[A]+pz[B])/2+c.bz*bm*2;
        let prev=null;
        for(let s=0;s<=CSEG;s++){
          const u=s/CSEG,w=1-u; const X=w*w*px[A]+2*w*u*ox+u*u*px[B], Y=w*w*py[A]+2*w*u*oy+u*u*py[B], Z=w*w*pz[A]+2*w*u*oz+u*u*pz[B];
          if(prev){ for(let q=0;q<2;q++){ const P=q?[X,Y,Z]:prev, uu=q?u:(s-1)/CSEG, i3=v*3;
              pos[i3]=P[0];pos[i3+1]=P[1];pos[i3+2]=P[2]; gradE(uu,tmp);
              const mx=cr[A]+(cr[B]-cr[A])*uu, my=cg[A]+(cg[B]-cg[A])*uu, mz=cb[A]+(cb[B]-cb[A])*uu;
              col[i3]=tmp[0]*.68+mx*.32; col[i3+1]=tmp[1]*.68+my*.32; col[i3+2]=tmp[2]*.68+mz*.32;
              al[v]=c.life*(strand?.4:.78)*Math.sin(Math.PI*Math.min(1,.15+uu*.85))*.9+.02*c.life; v++; } }
          prev=[X,Y,Z];
        }
      }
    }
    for(;v<curveSys.al.length;v++) al[v]=0; markAll(curveSys);
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Cursor, entrada de mouse (solo mouse) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const ptr={x:0,y:0,active:false,dirty:false,click:false,seen:false};
  const cur={x:999,y:999,vx:0,vy:0,speed:0,active:false};
  let wake=true;
  addEventListener('mousemove',e=>{ ptr.x=e.clientX/innerWidth*2-1; ptr.y=-(e.clientY/innerHeight*2-1); ptr.active=true; ptr.dirty=true; ptr.seen=true; if(universeState.active!==-1) touchUniverse(); wake=true; });
  addEventListener('mousedown',e=>{ if(e.button===0){ ptr.click=true; if(universeState.active!==-1) touchUniverse(); wake=true; } });
  document.documentElement.addEventListener('mouseleave',()=>{ ptr.active=false; wake=true; });
  addEventListener('blur',()=>{ ptr.active=false; wake=true; });
  addEventListener('resize',()=>{ layout(); wake=true; sleeping=false; });
  const raycaster=new THREE.Raycaster(), plane0=new THREE.Plane(new THREE.Vector3(0,0,1),0), hitV=new THREE.Vector3(), ndc=new THREE.Vector2();
  let gEnergy=0, gHeat=0;

  function castCursor(){
    if(!ptr.active){ cur.active=false; return; }
    ndc.set(ptr.x,ptr.y); raycaster.setFromCamera(ndc,camera);
    if(raycaster.ray.intersectPlane(plane0,hitV)){ cur.x=clamp(hitV.x,-30,30); cur.y=clamp(hitV.y,-30,30); cur.active=true; }
  }
  function pickLetter(){
    ndc.set(ptr.x,ptr.y); raycaster.setFromCamera(ndc,camera);
    for(const h of raycaster.intersectObjects(letterMeshes,false)){
      const L=letters[letterMeshes.indexOf(h.object)];
      if(inkAt(L,h.uv.x*L.W,(1-h.uv.y)*L.H,L.hit)) return L;
    }
    let best=null; for(const L of letters) if(L.hover>.55&&(!best||L.hover>best.hover)) best=L; return best;
  }
  function clickLetter(L){
    registerLetterClick(L);
    touchUniverse();
    L.clicks++; L.heat=Math.min(1.6,L.heat+.95); L.energy=Math.min(2.5,L.energy+.35); L.nextSpawn=t;
    const [n0]=nearest(L,cur.x,cur.y);
    for(const n of L.nodes){ const dx=px[n]-cur.x,dy=py[n]-cur.y,f=Math.exp(-(dx*dx+dy*dy)/(2*.7*.7)), d=Math.hypot(dx,dy)+1e-3;
      vx[n]+=dx/d*5*f; vy[n]+=dy/d*5*f; vz[n]+=(L.i===3?3.2:1.4)*f; act[n]=Math.max(act[n],f*.9); }
    const p=L.body.translation(), dx=p.x-cur.x, dy=p.y-cur.y, dl=Math.hypot(dx,dy)+1e-3;
    L.body.applyImpulse({x:dx/dl*L.mass*.7,y:dy/dl*L.mass*.7,z:L.mass*.9},true);
    const c=L.theme; addRing(cur.x,cur.y,.1,1.9,.95,c.r,c.g,c.b); addRing(cur.x,cur.y,.1,1.2,.7,c.r,c.g,c.b,.12);
    const s0=1+Math.min(.35,L.energy*.15);
    fire(L,n0,s0);
    if(L.i===2) for(let k=0;k<2;k++) fire(L,L.nodes[(Math.random()*L.nodes.length)|0],s0*.9);
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ SimulaciÃ³n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const camT=new THREE.Vector3();
  function simulate(h){
    t+=h; timeU.value=t;
    if(universeState.active !== -1 && universeState.target === 1){
      universeState.idle = (performance.now()-universeState.lastInteraction)/1000;
      if(universeState.idle >= UNIVERSE.idleTimeout) beginReturn();
    }
    const transitionStep = h/UNIVERSE.transitionDuration;
    universeState.progress += (universeState.target-universeState.progress) * Math.min(1, transitionStep*3);
    if(universeState.target === 0 && universeState.active !== -1 && universeState.progress < .01){
      // retorno suave: nada se borra de golpe, los objetos, pulsos y calor se apagan solos
      universeState.progress = 0;
      universeState.active = -1;
    }
    if(universeState.active !== -1){
      const palette = UNIVERSE.palettes[universeState.active];
      targetBackground.set(palette.background);
    } else targetBackground.copy(initialBackground);
    bgCol.lerp(targetBackground, Math.min(1, h*2.5)); document.body.style.background = '#'+bgCol.getHexString();
    if(ptr.dirty){ ptr.dirty=false; }
    castCursor();
    const rawVx=cur.active?(cur.x-(simulate.px??cur.x))/h:0, rawVy=cur.active?(cur.y-(simulate.py??cur.y))/h:0;
    simulate.px=cur.active?cur.x:undefined; simulate.py=cur.active?cur.y:undefined;
    cur.vx+=(clamp(rawVx,-25,25)-cur.vx)*.25; cur.vy+=(clamp(rawVy,-25,25)-cur.vy)*.25; cur.speed=Math.hypot(cur.vx,cur.vy);
    curBody.setNextKinematicTranslation(cur.active?{x:cur.x,y:cur.y,z:.35}:{x:999,y:999,z:0});
    cursorU.value.set(cur.active?cur.x:999,cur.active?cur.y:999,0);
    if(ptr.special){ ptr.special=false; const L=pickLetter(); if(L) activateUniverse(L.i); }
    if(ptr.click){ ptr.click=false; const L=pickLetter(); if(L) clickLetter(L); }

    gEnergy=0; gHeat=0;
    for(const L of letters){
      // proximidad
      let dmin=1e9; if(cur.active) for(const n of L.nodes){ const dx=px[n]-cur.x,dy=py[n]-cur.y,d=dx*dx+dy*dy; if(d<dmin)dmin=d; }
      const raw=cur.active?Math.exp(-dmin/(2*.55*.55)):0;
      L.hover+=(raw-L.hover)*(1-Math.exp(-h*6));
      const cap=.5+.28*Math.min(1,L.energy);
      if(L.heat<cap) L.heat=Math.min(cap,L.heat+h*L.hover*(.35+.16*Math.min(cur.speed,7)));
      L.energy=Math.min(2.5,L.energy+h*L.hover*cur.speed*.012);
      L.heat*=Math.exp(-h/1.7); L.energy*=Math.exp(-h/9);
      if(L.heat<.004) L.heat=0; if(L.energy<.004) L.energy=0;
      if(universeState.active !== -1){
        const isPortal = L.i === universeState.active;
        L.heat = Math.max(L.heat, isPortal ? .72*universeState.progress : .08*universeState.progress);
        L.energy = Math.max(L.energy, isPortal ? .8*universeState.progress : 0);
      }
      gEnergy=Math.max(gEnergy,L.energy); gHeat=Math.max(gHeat,L.heat);
      // fuerzas sobre el cuerpo de la letra (resorte amortiguado hacia su posiciÃ³n + respuesta al cursor)
      const p=L.body.translation(), v=L.body.linvel(), m=L.mass;
      let tx=L.cx,ty=0; const dx=cur.x-p.x,dy=cur.y-p.y,dn=Math.hypot(dx,dy)+1e-3;
      if(cur.active && universeState.active === -1){ const a=.14*L.hover*Math.min(1,dn/1.5); tx+=dx/dn*a; ty+=dy/dn*a; }
      if(universeState.active !== -1) {
        tx = L.cx + (L.i === universeState.active ? Math.sin(t*.8)*.04 : 0);
        ty = L.i === universeState.active ? Math.cos(t*.7)*.04 : 0;
      }
      const tz=L.hover*L.zHover+Math.min(L.heat,1.3)*L.zHeat, K=70, Cd=8.4;
      let ax=K*(tx-p.x)-Cd*v.x+.6*cur.vx*L.hover, ay=K*(ty-p.y)-Cd*v.y+.6*cur.vy*L.hover, az=K*(tz-p.z)-Cd*v.z;
      L.body.applyImpulse({x:ax*m*h,y:ay*m*h,z:az*m*h},true);
      const sp=Math.hypot(v.x,v.y,v.z); if(sp>3) L.body.setLinvel({x:v.x/sp*3,y:v.y/sp*3,z:v.z/sp*3},true);
      // seÃ±al espontÃ¡nea al explorar
      if(L.heat>.42&&L.hover>.45&&cur.speed>1.5&&t>L.nextSig){ const [n]=nearest(L,cur.x,cur.y); fire(L,n,.5+.15*Math.min(1,L.energy)); L.nextSig=t+.9; }
      // apariciÃ³n de elementos secundarios
      if(L.pools.length&&L.heat*(1+.35*L.energy)>.58&&t>L.nextSpawn){
        const free=L.pools.filter(o=>!o.alive); if(free.length) spawn(free[(Math.random()*free.length)|0],L);
        L.nextSpawn=t+.22+Math.random()*.35;
      }
      if(L.i===1&&L.heat>.45&&Math.random()<h*3) spawnCurve();
    }

    // objetos
    for(const o of objs){ if(!o.alive) continue; const L=letters[o.host];
      if(!o.dying){ o.life=Math.min(1,o.life+h*1.6); o.age+=h; if(L.heat<.24)o.decay+=h; else o.decay=Math.max(0,o.decay-h*.7); if(o.decay>1.2)o.dying=true; }
      else { o.life-=h*1.8; if(o.life<=0){ despawn(o); continue; } }
      const tx=o.tx+Math.sin(t*.55+o.ph)*.22, ty=o.ty+Math.cos(t*.47+o.ph*1.3)*.18, tz=o.tz+Math.sin(t*.4+o.ph*2)*.2;
      const p=o.body.translation(), m=o.mass, k=7;
      o.body.applyImpulse({x:(tx-p.x)*k*m*h,y:(ty-p.y)*k*m*h,z:(tz-p.z)*k*m*h},true);
      if(o.type==='solid'){ const w=o.body.angvel(); o.body.setAngvel({x:w.x*.97+o.spinX*.03,y:w.y*.97+o.spinY*.03,z:w.z*.97},true); }
      else if(o.type!=='blob'){ const q=o.body.rotation(), th=2*Math.atan2(q.z,q.w), w=o.body.angvel().z;
        o.body.applyTorqueImpulse({x:0,y:0,z:o.inertia*((o.rotT-th)*30-w*2)*h},true); }
      if(t>o.relinkAt) relink(o);
      for(const e of o.edges) elife[e]=Math.min(1,elife[e]+h*3);
    }

    world.step();
    constrainLettersToView();

    for(const L of letters){ const p=L.body.translation(); L.px=p.x; L.py=p.y; L.pz=p.z; }
    for(const o of objs){ if(!o.alive) continue;
      const p=o.body.translation(), q=o.body.rotation(); let v=o.body.linvel(); const sp=Math.hypot(v.x,v.y,v.z);
      if(sp>8){ o.body.setLinvel({x:v.x/sp*8,y:v.y/sp*8,z:v.z/sp*8},true); v={x:v.x/sp*8,y:v.y/sp*8,z:v.z/sp*8}; }
      o.mesh.position.set(p.x,p.y,p.z); o.mesh.quaternion.set(q.x,q.y,q.z,q.w);
      o.mesh.scale.setScalar(Math.max(easeBack(o.life),.0001));
      px[o.node]=p.x;py[o.node]=p.y;pz[o.node]=p.z; vx[o.node]=v.x;vy[o.node]=v.y;vz[o.node]=v.z;
      o.glow*=Math.exp(-h*2);
      if(o.type==='blob'){ o.u.uVel.value.set(v.x,v.y,v.z); o.u.uGlow.value.setRGB(o.gr,o.gg,o.gb); o.u.uMix.value=o.glow; }
      else for(const m of o.mats){ m.emissive.setRGB(o.gr,o.gg,o.gb); m.emissiveIntensity=o.glow*.65; }
      if(o.glow<.01){ o.gr=o.gg=o.gb=1; }
    }

    // nodos (grafo): resortes a casa + aristas + cursor
    for(let n=0;n<NL;n++){ const L=letters[nLet[n]], b=L.body, hx=L.px+lxA[n], hy=L.py+lyA[n];
      const dz=L.depthAmp*smooth(.3,.9,L.heat), hz=L.pz+lzA[n]*dz;
      const bv=b.linvel();
      let fx=24*(hx-px[n])-4.5*(vx[n]-bv.x), fy=24*(hy-py[n])-4.5*(vy[n]-bv.y), fz=24*(hz-pz[n])-4.5*(vz[n]-bv.z);
      if(cur.active){ const dx=px[n]-cur.x,dy=py[n]-cur.y,r2=dx*dx+dy*dy; if(r2<9){ const f=Math.exp(-r2/(2*.5*.5)), d=Math.sqrt(r2)+1e-3, g=(.4+.6*Math.min(L.heat,1));
        fx+=dx/d*8*f*g+cur.vx*.5*f; fy+=dy/d*8*f*g+cur.vy*.5*f; fz+=6*f; } }
      vx[n]+=fx*h; vy[n]+=fy*h; vz[n]+=fz*h;
    }
    for(let e=0;e<NE;e++){ if(!eon[e]) continue; const a=ea[e],b=eb[e];
      const dx=px[b]-px[a],dy=py[b]-py[a],dz=pz[b]-pz[a],len=Math.hypot(dx,dy,dz)+1e-4, f=ek[e]*(len-erest[e])/len*h; if(!f) continue;
      if(a<NL){ vx[a]+=dx*f;vy[a]+=dy*f;vz[a]+=dz*f; }
      if(!edyn[e]&&b<NL){ vx[b]-=dx*f;vy[b]-=dy*f;vz[b]-=dz*f; }
    }
    const dec=Math.exp(-h/1.5), colK=Math.min(1,h*.7);
    for(const L of letters){ let sa=0,sr=0,sg=0,sb=0;
      const R=.7+1.6*Math.min(L.heat,1.2), base=Math.max(0,(L.heat-.5)*1.2);
      for(const n of L.nodes){
        const sp=Math.hypot(vx[n],vy[n],vz[n]); if(sp>7){ const k=7/sp; vx[n]*=k;vy[n]*=k;vz[n]*=k; }
        px[n]+=vx[n]*h; py[n]+=vy[n]*h; pz[n]+=vz[n]*h;
        let target=0;
        if(cur.active&&L.heat>.12){ const dx=px[n]-cur.x,dy=py[n]-cur.y; target=Math.min(1,(L.heat-.1)*1.6)*Math.exp(-(dx*dx+dy*dy)/(R*R)); }
        target=Math.max(target,base*(.55+.45*Math.sin(t*1.7+nhash[n]*6.28)));
        if(target>act[n]) act[n]+=(target-act[n])*Math.min(1,h*9); else act[n]*=dec;
        if(act[n]<.004) act[n]=0;
        cr[n]+=(br[n]-cr[n])*colK; cg[n]+=(bg[n]-cg[n])*colK; cb[n]+=(bb[n]-cb[n])*colK;
        const a=act[n]; sa+=a; sr+=a*cr[n]; sg+=a*cg[n]; sb+=a*cb[n];
      }
      if(sa>.01){ L.uni.uTint.value.setRGB(sr/sa,sg/sa,sb/sa); }
      L.tintAmt=clamp(sa/L.nodes.length*.9,0,.32);
    }
    // objetos y enlaces: mantener visible la red cercana
    for(const o of objs){ if(!o.alive) continue; for(const e of o.edges){ const a=ea[e]; if(a<NL) act[a]=Math.max(act[a],.4*Math.min(1,o.life)*elife[e]); } }

    // pulsos
    for(let i=0;i<NP;i++){ if(!pon[i]) continue; if(t-pt0[i]>=pdur[i]){ pon[i]=0; arrive(pb[i],ps[i],pr[i],pg[i],pbl[i],pa[i],pk[i]); } }
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Escritura de buffers y uniforms â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function writeBuffers(h){
    const ink = universeState.active === -1
      ? PAL.ink
      : UNIVERSE.palettes[universeState.active].ink;
    inkTarget.set(ink); inkC.lerp(inkTarget,.08);
    // letras
    for(const L of letters){
      L.mesh.position.set(L.px,L.py,L.pz);
      const hv=L.hover, tilt=cur.active?1:0;
      L.mesh.rotation.set(clamp(-(cur.y-L.py)*.01*hv*tilt,-.08,.08),clamp((cur.x-L.px)*.012*hv*tilt,-.08,.08),0);
      L.uni.uBulge.value=hv*.45; L.uni.uPull.value=.1*hv; L.uni.uSigma.value=.55+.25*Math.min(L.heat,1.2);
      L.uni.uTintAmt.value=L.tintAmt;
      const sh=clamp(L.pz*.6+L.heat*.12,0,.2); L.sUni.uShadow.value=sh; L.shadow.visible=sh>.004;
      L.shadow.position.set(L.px+.05,L.py-.09,L.pz-.04); L.shadow.rotation.copy(L.mesh.rotation);
    }
    // nodos
    { const {pos,col,al,sz}=nodeSys;
      for(let n=0;n<NL;n++){ const i3=n*3,a=act[n]; pos[i3]=px[n];pos[i3+1]=py[n];pos[i3+2]=pz[n];
        if(a>.012){ al[n]=Math.min(1,a*1.7)*.95; sz[n]=.2*(.4+.6*Math.min(1,a)); col[i3]=cr[n];col[i3+1]=cg[n];col[i3+2]=cb[n]; } else { al[n]=0; sz[n]=0; } }
      markAll(nodeSys); }
    // aristas
    { const {pos,col,al}=edgeSys;
      for(let e=0;e<NE;e++){ const v=e*2,i=v*3;
        if(!eon[e]){ al[v]=al[v+1]=0; continue; }
        const a=ea[e],b=eb[e];
        pos[i]=px[a];pos[i+1]=py[a];pos[i+2]=pz[a];pos[i+3]=px[b];pos[i+4]=py[b];pos[i+5]=pz[b];
        col[i]=cr[a];col[i+1]=cg[a];col[i+2]=cb[a];col[i+3]=cr[b];col[i+4]=cg[b];col[i+5]=cb[b];
        let alpha;
        if(edyn[e]){ const o=objs[eown[e]]; alpha=.5*elife[e]*clamp(o.life,0,1); }
        else { const len=Math.hypot(px[a]-px[b],py[a]-py[b],pz[a]-pz[b]), st=Math.abs(len/erest[e]-1);
          alpha=Math.min(.9,.72*smooth(.04,.5,Math.min(act[a],act[b]))*(1+Math.min(1,st*2.5)*.7)); }
        al[v]=al[v+1]=alpha; }
      markAll(edgeSys); }
    // pulsos (cabeza + estela)
    { const {pos,col,al,sz}=pulseSys;
      for(let i=0;i<NP;i++){ const h1=i*2,h2=h1+1;
        if(!pon[i]){ al[h1]=al[h2]=0; sz[h1]=sz[h2]=0; continue; }
        const u=clamp((t-pt0[i])/pdur[i],0,1), a=pa[i],b=pb[i];
        for(let k=0;k<2;k++){ const uu=k?Math.max(0,u-.18):u, j=h1+k, j3=j*3;
          pos[j3]=px[a]+(px[b]-px[a])*uu; pos[j3+1]=py[a]+(py[b]-py[a])*uu; pos[j3+2]=pz[a]+(pz[b]-pz[a])*uu;
          col[j3]=pr[i];col[j3+1]=pg[i];col[j3+2]=pbl[i]; al[j]=Math.min(1,ps[i]*1.2)*(k?.45:1); sz[j]=k?.12:.17; } }
      markAll(pulseSys); }
    // anillos
    { const {pos,col,al,sz}=ringSys;
      for(let i=0;i<NR;i++){ if(!ron[i]){ al[i]=0; sz[i]=0; continue; }
        const u=(t-rt0[i])/rdur[i]; if(u>=1){ ron[i]=0; al[i]=0; sz[i]=0; continue; } if(u<0){ al[i]=0; sz[i]=0; continue; }
        const i3=i*3; pos[i3]=rx[i];pos[i3+1]=ry[i];pos[i3+2]=rz[i]; col[i3]=rr[i];col[i3+1]=rg[i];col[i3+2]=rb[i];
        sz[i]=rsz[i]*(1-Math.pow(1-u,3))+.05; al[i]=Math.pow(1-u,1.5)*.7; }
      markAll(ringSys); }
    writeCurves(h);
  }

  function isQuiet(){
    if(gHeat>0||gEnergy>0) return false;
    if(inkC.getHex()!==inkTarget.getHex()) return false;
    for(let n=0;n<NL;n++) if(act[n]>0) return false;
    for(const o of objs) if(o.alive) return false;
    for(let i=0;i<NP;i++) if(pon[i]) return false;
    for(let i=0;i<NR;i++) if(ron[i]) return false;
    for(const c of curves) if(c.on) return false;
    for(const L of letters){ const v=L.body.linvel(); if(L.hover>.002||Math.abs(L.px-L.cx)>.0015||Math.abs(L.py)>.0015||Math.abs(L.pz)>.0015||Math.hypot(v.x,v.y,v.z)>.01) return false; }
    return true;
  }
  function snapToRest(){
    for(const L of letters){ L.body.setTranslation({x:L.cx,y:0,z:0},true); L.body.setLinvel({x:0,y:0,z:0},true);
      L.px=L.cx;L.py=0;L.pz=0; L.hover=0; L.tintAmt=0; L.uni.uRip.value.forEach(r=>r.w=0); L.uni.uBulge.value=0; L.uni.uPull.value=0; }
    for(let n=0;n<NL;n++){ px[n]=letters[nLet[n]].cx+lxA[n]; py[n]=lyA[n]; pz[n]=0; vx[n]=vy[n]=vz[n]=0; }
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Bucle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  let last=performance.now(), acc=0, quietT=0; var sleeping=false;
  const camPos=new THREE.Vector3(0,0,view.d);
  function frame(ms){
    requestAnimationFrame(frame);
    if(sleeping){ if(!wake) return; sleeping=false; last=ms; quietT=.5; }
    wake=false;
    const dt=Math.min(.05,(ms-last)/1000); last=ms; acc+=dt; let steps=0;
    while(acc>=STEP&&steps<3){ simulate(STEP); acc-=STEP; steps++; }
    if(steps===0) simulate.skip=true;
    // paralaje sutil de cÃ¡mara solo mientras hay actividad
    const g=clamp(gHeat*1.2,0,1);
    camT.set(ptr.x*.5*g*(ptr.active?1:0),ptr.y*.3*g*(ptr.active?1:0),view.d);
    camPos.lerp(camT,.06); if(Math.abs(camPos.x)<1e-4)camPos.x=0; if(Math.abs(camPos.y)<1e-4)camPos.y=0; camPos.z=view.d;
    camera.position.copy(camPos); camera.lookAt(0,0,0);
    writeBuffers(STEP);
    renderer.render(scene,camera);
    if(isQuiet()){ quietT+=dt; if(quietT>.6){ snapToRest(); writeBuffers(STEP); renderer.render(scene,camera); sleeping=true; wake=false; } } else quietT=0;
  }
  snapToRest(); writeBuffers(STEP); renderer.render(scene,camera);
  requestAnimationFrame(ms=>{ last=ms; requestAnimationFrame(frame); });
}

start().catch(err=>{ console.error(err); document.getElementById('fb').style.display='flex'; });