/* META — Dimensiones: cada letra es un portal. Al interactuar un rato, el portal se
   convierte en una ventana; las ventanas se comunican y al completar las 4 se fusionan. */
const NEED = 7, TAU = Math.PI * 2;
const clamp = (x,a,b)=>Math.min(b,Math.max(a,x)), lerp = (a,b,k)=>a+(b-a)*k;
const ease = x=>{ x=clamp(x,0,1); return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2; };
const rr = (a,b)=>a+Math.random()*(b-a);
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const TH = [
  {title:'Fotos',      col:'#1877F2'},   // M
  {title:'Expresión',  col:'#D946A6'},   // E
  {title:'Conexiones', col:'#25D366'},   // T
  {title:'Espacios',   col:'#7566FF'}    // A
];
const SLOT = [[0,0],[1,0],[0,1],[1,1]];  // esquinas: M arriba-izq, E arriba-der, T abajo-izq, A abajo-der
const rect = (g,x,y,w,h,r)=>{ g.beginPath(); g.roundRect ? g.roundRect(x,y,w,h,r) : g.rect(x,y,w,h); };

/* ───────────── M · Fotos: collage de personas y lugares ───────────── */
function paint(i){
  const c=document.createElement('canvas'); c.width=200; c.height=250; const g=c.getContext('2d'), R=rng(40+i*7);
  const sk=[['#9fc7ff','#ffe2c7'],['#ffb88a','#6b4a8a'],['#bfe3ff','#eaf6ff'],['#2b3a67','#ff9a7a'],['#cfe9d6','#f6e7c9'],['#ffd6e6','#a9b8ff']][i%6];
  const gr=g.createLinearGradient(0,0,0,250); gr.addColorStop(0,sk[0]); gr.addColorStop(1,sk[1]); g.fillStyle=gr; g.fillRect(0,0,200,250);
  g.fillStyle='rgba(255,246,210,.9)'; g.beginPath(); g.arc(40+R()*120,50+R()*40,16+R()*10,0,TAU); g.fill();
  const k=i%5;
  if(k===0||k===2){ for(let j=0;j<3;j++){ g.fillStyle=['#5b7aa8','#3f5d86','#2a4066'][j]; g.beginPath(); g.moveTo(0,250); g.lineTo(0,150+j*25);
      for(let x=0;x<200;){ x+=30+R()*30; g.lineTo(x,120+j*28-R()*40); } g.lineTo(200,250); g.fill(); } }
  else if(k===1){ for(let x=0;x<200;x+=22){ const bh=70+R()*120; g.fillStyle=['#26335f','#33426f','#1d2a4d'][(x/22)%3|0]; g.fillRect(x,250-bh,20,bh);
      g.fillStyle='#ffd88a'; for(let y=250-bh+8;y<244;y+=14) if(R()>.5){ g.fillRect(x+5,y,4,6); g.fillRect(x+12,y,4,6); } } }
  else { g.fillStyle=k===3?'#7a5a4a':'#5f9a8a'; g.fillRect(0,205,200,45);
    for(let j=0;j<3;j++){ const x=45+j*55, col=['#e58d6f','#7f8cff','#f2c27a'][j]; g.fillStyle=col; g.beginPath(); g.arc(x,150-j%2*8,15,0,TAU); g.fill();
      g.beginPath(); g.moveTo(x-28,230); g.quadraticCurveTo(x-28,172,x,172); g.quadraticCurveTo(x+28,172,x+28,230); g.fill(); } }
  return c;
}
function photosSim(){
  const imgs=[...Array(10)].map((_,i)=>paint(i)), tiles=[];
  const add=(x,y)=>{ tiles.push({x,y,s:rr(.2,.3),r:rr(-.25,.25),img:imgs[(Math.random()*10)|0],b:0,h:0,z:rr(.3,1),px:0,py:0,tw:1}); if(tiles.length>30) tiles.shift(); };
  const R=rng(3); for(let i=0;i<16;i++) add(.08+R()*.84,.1+R()*.8);
  return {
    draw(g,w,h,t,dt,m){
      const gr=g.createLinearGradient(0,0,w,h); gr.addColorStop(0,'#eef4ff'); gr.addColorStop(1,'#fdf1f7'); g.fillStyle=gr; g.fillRect(0,0,w,h);
      const u=Math.min(w,h); let hov=null;
      for(const o of tiles){ o.px=o.x*w+(m.x-.5)*o.z*u*.08+Math.sin(t*.4+o.z*9)*u*.012; o.py=o.y*h+(m.y-.5)*o.z*u*.08+Math.cos(t*.35+o.z*7)*u*.012; o.tw=o.s*u*1.15;
        if(m.in && Math.abs(m.x*w-o.px)<o.tw/2 && Math.abs(m.y*h-o.py)<o.tw*.625) hov=o; }
      const order=hov?[...tiles.filter(o=>o!==hov),hov]:tiles;
      for(const o of order){ o.b=Math.min(1,o.b+dt*2.5); o.h+=((o===hov?1:0)-o.h)*Math.min(1,dt*10);
        const sc=(1-Math.pow(1-o.b,3))*(1+.28*o.h), tw=o.tw, pad=tw*.05, ph=tw*1.25-pad-tw*.12, pw=tw-pad*2;
        g.save(); g.translate(o.px,o.py); g.rotate(o.r*(1-o.h)); g.scale(sc,sc);
        g.shadowColor='rgba(20,40,90,.3)'; g.shadowBlur=14; g.shadowOffsetY=4; g.fillStyle='#fff'; rect(g,-tw/2,-tw*.625,tw,tw*1.25,3); g.fill(); g.shadowColor='transparent';
        g.drawImage(o.img,0,0,200,Math.min(250,200*ph/pw),-tw/2+pad,-tw*.625+pad,pw,ph); g.restore(); }
    },
    click(m){ add(m.x,m.y); },
    react(){ add(rr(.1,.9),rr(.1,.9)); }
  };
}

/* ───────────── E · Expresión: arte, burbujas, trazos ───────────── */
function artSim(){
  const cols=['#D946A6','#7566FF','#FF8A45','#ff5fa2','#a78bfa','#ffb36b'], B=[], S=[], Tr=[]; let lx=-1, ly=-1;
  const nb=(x,y,r)=>({x,y,r:r||rr(.025,.09),vx:rr(-.012,.012),vy:-rr(.015,.05),c:cols[(Math.random()*cols.length)|0]});
  for(let i=0;i<36;i++) B.push(nb(Math.random(),Math.random()));
  const pop=b=>{ for(let k=0;k<14;k++){ const a=rr(0,TAU), s=rr(.1,.5); S.push({x:b.x,y:b.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:rr(.004,.014)*(1+b.r*10),c:b.c,l:1}); } };
  return {
    draw(g,w,h,t,dt,m){
      g.fillStyle='#fff7fc'; g.fillRect(0,0,w,h); const u=Math.min(w,h);
      for(let i=0;i<3;i++){ const x=w*(.5+.4*Math.sin(t*.3+i*2)), y=h*(.5+.4*Math.cos(t*.25+i*3)), q=g.createRadialGradient(x,y,0,x,y,Math.max(w,h)*.5);
        q.addColorStop(0,cols[i]+'55'); q.addColorStop(1,cols[i]+'00'); g.fillStyle=q; g.fillRect(0,0,w,h); }
      if(m.in && Math.hypot(m.x-lx,m.y-ly)>.002){ Tr.push({x:m.x,y:m.y,t}); lx=m.x; ly=m.y; }
      while(Tr.length && t-Tr[0].t>1.2) Tr.shift();
      g.lineCap='round'; const hues=[322,262,24];
      for(let i=1;i<Tr.length;i++){ const k=i/Tr.length; g.strokeStyle=`hsl(${hues[(i>>3)%3]},85%,60%)`; g.globalAlpha=k*.75; g.lineWidth=u*.04*k+1;
        g.beginPath(); g.moveTo(Tr[i-1].x*w,Tr[i-1].y*h); g.lineTo(Tr[i].x*w,Tr[i].y*h); g.stroke(); }
      g.globalAlpha=1;
      for(const b of B){ b.x+=b.vx*dt; b.y+=b.vy*dt; b.vy+=(-.03-b.vy)*dt*.5; b.vx*=Math.exp(-dt*.8);
        if(b.y<-.12){ b.y=1.12; b.x=Math.random(); }
        if(m.in){ const dx=(b.x-m.x)*w, dy=(b.y-m.y)*h, d=Math.hypot(dx,dy)+1e-3, R=u*.25; if(d<R){ const f=1-d/R; b.vx+=dx/d*f*dt*.8; b.vy+=dy/d*f*dt*.8; } }
        const x=b.x*w, y=b.y*h, r=b.r*u*1.3, q=g.createRadialGradient(x-r*.3,y-r*.3,0,x,y,r);
        q.addColorStop(0,'rgba(255,255,255,.9)'); q.addColorStop(.35,b.c+'88'); q.addColorStop(1,b.c+'33'); g.fillStyle=q; g.beginPath(); g.arc(x,y,r,0,TAU); g.fill();
        g.strokeStyle='rgba(255,255,255,.7)'; g.lineWidth=1.5; g.stroke(); }
      for(let i=S.length-1;i>=0;i--){ const s=S[i]; s.x+=s.vx*dt; s.y+=s.vy*dt; s.l-=dt*.8; if(s.l<=0){ S.splice(i,1); continue; }
        g.globalAlpha=s.l; g.fillStyle=s.c; g.beginPath(); g.arc(s.x*w,s.y*h,s.r*u*1.4,0,TAU); g.fill(); }
      g.globalAlpha=1;
    },
    click(m){ let best=null,bd=1e9; for(const b of B){ const d=Math.hypot(b.x-m.x,b.y-m.y); if(d<bd){bd=d;best=b;} }
      for(const b of B) if(Math.hypot(b.x-m.x,b.y-m.y)<.12){ pop(b); b.y=1.15; b.x=Math.random(); }
      if(best&&bd>=.12){ pop(best); best.y=1.15; } B.push(nb(m.x,m.y,rr(.08,.14))); if(B.length>60) B.shift(); },
    react(){ for(let i=0;i<3;i++){ const b=B[(Math.random()*B.length)|0]; pop(b); b.y=1.15; b.x=Math.random(); } }
  };
}

/* ───────────── T · Conexiones: personas, chats, señales ───────────── */
function chatSim(){
  const cols=['#25D366','#1877F2','#7566FF','#D946A6','#FF8A45','#0fb5a8'], R=rng(11), nodes=[], P=[], M=[], has=new Set();
  for(let i=0;i<16;i++) nodes.push({x:.08+R()*.84,y:.14+R()*.72,ph:R()*6.3,c:cols[i%6],nb:[],hl:0,px:0,py:0});
  nodes.forEach((a,i)=>nodes.map((b,j)=>[j,Math.hypot(a.x-b.x,a.y-b.y)]).filter(d=>d[0]!==i).sort((p,q)=>p[1]-q[1]).slice(0,2).forEach(([j])=>{
    const k=i<j?i+'-'+j:j+'-'+i; if(has.has(k)) return; has.add(k); a.nb.push(j); nodes[j].nb.push(i); }));
  const say=n=>{ if(M.length<14) M.push({n,w:rr(.5,1),l2:rr(.3,.8),a:0}); };
  const send=(a,d)=>{ for(const j of nodes[a].nb) if(P.length<120) P.push({a,b:j,u:0,d,c:nodes[a].c}); nodes[a].hl=1; };
  return {
    draw(g,w,h,t,dt,m){
      const gr=g.createLinearGradient(0,0,w,h); gr.addColorStop(0,'#f2fbf7'); gr.addColorStop(1,'#e6f1ff'); g.fillStyle=gr; g.fillRect(0,0,w,h);
      const u=Math.min(w,h), rad=clamp(u*.036,10,26); let hov=-1,hd=u*.09;
      nodes.forEach((n,i)=>{ n.px=n.x*w+Math.sin(t*.5+n.ph)*u*.012; n.py=n.y*h+Math.cos(t*.45+n.ph*1.3)*u*.012; n.hl*=Math.exp(-dt*2);
        if(m.in){ const d=Math.hypot(m.x*w-n.px,m.y*h-n.py); if(d<hd){hd=d;hov=i;} } });
      g.lineWidth=1.5; g.strokeStyle='rgba(37,150,100,.3)';
      nodes.forEach((a,i)=>a.nb.forEach(j=>{ if(j>i||!nodes[j].nb.includes(i)){ g.beginPath(); g.moveTo(a.px,a.py); g.lineTo(nodes[j].px,nodes[j].py); g.stroke(); } }));
      if(hov>=0){ g.setLineDash([5,6]); g.strokeStyle='rgba(37,211,102,.7)'; g.beginPath(); g.moveTo(nodes[hov].px,nodes[hov].py); g.lineTo(m.x*w,m.y*h); g.stroke(); g.setLineDash([]); nodes[hov].hl=Math.max(nodes[hov].hl,.6); }
      for(let i=P.length-1;i>=0;i--){ const p=P[i]; p.u+=dt*.9; const A=nodes[p.a],Bn=nodes[p.b];
        if(p.u>=1){ P.splice(i,1); Bn.hl=1; say(p.b); if(p.d>0) for(const k of Bn.nb) if(k!==p.a&&P.length<120) P.push({a:p.b,b:k,u:0,d:p.d-1,c:p.c}); continue; }
        const x=lerp(A.px,Bn.px,p.u), y=lerp(A.py,Bn.py,p.u), q=g.createRadialGradient(x,y,0,x,y,rad*.7); q.addColorStop(0,p.c); q.addColorStop(1,p.c+'00'); g.fillStyle=q; g.beginPath(); g.arc(x,y,rad*.7,0,TAU); g.fill(); }
      for(const n of nodes){ const r=rad*(1+.25*n.hl); g.fillStyle=n.c; g.shadowColor=n.c; g.shadowBlur=n.hl*18; g.beginPath(); g.arc(n.px,n.py,r,0,TAU); g.fill(); g.shadowBlur=0;
        g.lineWidth=2.5; g.strokeStyle='#fff'; g.stroke(); g.fillStyle='#fff'; g.beginPath(); g.arc(n.px,n.py-r*.22,r*.3,0,TAU); g.fill(); g.beginPath(); g.arc(n.px,n.py+r*.62,r*.5,Math.PI,0); g.fill(); }
      const fs=clamp(u*.034,9,15);
      if(Math.random()<dt*1.4) say((Math.random()*nodes.length)|0);
      for(let i=M.length-1;i>=0;i--){ const b=M[i]; b.a+=dt; if(b.a>3.2){ M.splice(i,1); continue; }
        const n=nodes[b.n], al=Math.min(1,b.a*5)*clamp((3.2-b.a)/.6,0,1), tw=fs*5, bh=fs*2.1, x=clamp(n.px-tw/2,3,w-tw-3), y=Math.max(3,n.py-rad*1.4-bh-b.a*4);
        g.globalAlpha=al; g.fillStyle='#fff'; g.shadowColor='rgba(0,0,0,.15)'; g.shadowBlur=8; rect(g,x,y,tw,bh,bh/2); g.fill(); g.shadowBlur=0;
        if(b.a<.9){ g.fillStyle=n.c; for(let k=0;k<3;k++){ g.beginPath(); g.arc(x+tw/2+(k-1)*fs*.9,y+bh/2+Math.sin(b.a*10+k)*fs*.25,fs*.28,0,TAU); g.fill(); } }
        else { g.fillStyle=n.c; rect(g,x+fs*.8,y+bh*.3,(tw-fs*1.6)*b.w,bh*.14,2); g.fill(); g.fillStyle='#c9d3ea'; rect(g,x+fs*.8,y+bh*.58,(tw-fs*1.6)*b.l2,bh*.14,2); g.fill(); }
        g.globalAlpha=1; }
    },
    click(m){ let best=0,bd=1e9; nodes.forEach((n,i)=>{ const d=Math.hypot(n.x-m.x,n.y-m.y); if(d<bd){bd=d;best=i;} }); send(best,3); say(best); },
    react(){ send((Math.random()*nodes.length)|0,3); }
  };
}

/* ───────────── A · Espacios: túnel 3D y figuras ───────────── */
const GEO={
  cube:{v:[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],f:[[0,1,2,3],[4,5,6,7],[0,1,5,4],[2,3,7,6],[1,2,6,5],[0,3,7,4]]},
  octa:{v:[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],f:[[0,2,4],[2,1,4],[1,3,4],[3,0,4],[0,2,5],[2,1,5],[1,3,5],[3,0,5]]},
  tetra:{v:[[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]],f:[[0,1,2],[0,1,3],[0,2,3],[1,2,3]]},
  prism:{v:[[-1,-1,-1],[1,-1,-1],[0,1,-1],[-1,-1,1],[1,-1,1],[0,1,1]],f:[[0,1,2],[3,4,5],[0,1,4,3],[1,2,5,4],[0,2,5,3]]}
};
const GK=Object.keys(GEO);
function rot(p,yw,pt){ let [x,y,z]=p, c=Math.cos(yw), s=Math.sin(yw); [x,z]=[x*c+z*s,-x*s+z*c]; c=Math.cos(pt); s=Math.sin(pt); [y,z]=[y*c-z*s,y*s+z*c]; return [x,y,z]; }
function spaceSim(){
  const sh=[]; let yaw=0, pit=0;
  const add=()=>{ sh.push({g:GEO[GK[(Math.random()*4)|0]],x:rr(-1.6,1.6),y:rr(-1.5,1.5),z:rr(2,9),s:rr(.25,.5),rx:rr(0,6),ry:rr(0,6),vx:rr(-.8,.8),vy:rr(-.8,.8),hue:[255,200,300,170,330][(Math.random()*5)|0],b:0,ph:rr(0,6)}); if(sh.length>22) sh.shift(); };
  for(let i=0;i<10;i++) add();
  return {
    draw(g,w,h,t,dt,m){
      const gr=g.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#f5f3ff'); gr.addColorStop(1,'#d9d4ff'); g.fillStyle=gr; g.fillRect(0,0,w,h);
      const tx=m.in?(m.x-.5)*1.1:Math.sin(t*.3)*.3, ty=m.in?(m.y-.5)*.7:Math.cos(t*.25)*.15, k=Math.min(1,dt*3); yaw+=(tx-yaw)*k; pit+=(ty-pit)*k;
      const f=Math.min(w,h)*.9, cx=w/2, cy=h/2;
      const cam=p=>{ const q=rot([p[0],p[1],p[2]-5],yaw,pit); q[2]+=5; return q; };
      const pr=q=>q[2]<.3?null:[cx+q[0]*f/q[2],cy+q[1]*f/q[2]];
      g.lineWidth=1.6;
      for(let i=0;i<12;i++){ const z=((i+t*.9)%12)+.5, pts=[[-2.4,-2.4],[2.4,-2.4],[2.4,2.4],[-2.4,2.4]].map(c=>pr(cam([c[0],c[1],z]))); if(pts.some(p=>!p)) continue;
        g.strokeStyle=`hsla(${255+z*8},70%,50%,${clamp(1-(z-.5)/12,.05,1)*.8})`; g.beginPath(); pts.forEach((p,j)=>j?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])); g.closePath(); g.stroke(); }
      g.strokeStyle='rgba(117,102,255,.35)';
      for(const c of [[-2.4,-2.4],[2.4,-2.4],[2.4,2.4],[-2.4,2.4],[0,2.4],[0,-2.4],[-2.4,0],[2.4,0]]){ const a=pr(cam([c[0],c[1],.6])), b=pr(cam([c[0],c[1],12.4])); if(a&&b){ g.beginPath(); g.moveTo(a[0],a[1]); g.lineTo(b[0],b[1]); g.stroke(); } }
      const polys=[]; let hov=null,hd=Math.min(w,h)*.12;
      for(const o of sh){ o.b=Math.min(1,o.b+dt*2); o.rx+=o.vx*dt; o.ry+=o.vy*dt;
        const c=pr(cam([o.x,o.y,o.z])); if(m.in&&c){ const d=Math.hypot(m.x*w-c[0],m.y*h-c[1]); if(d<hd){hd=d;hov=o;} } }
      for(const o of sh){ if(o===hov){ o.rx+=dt*2; o.ry+=dt*2; }
        const s=o.s*(1-Math.pow(1-o.b,3))*(o===hov?1.2:1), by=Math.sin(t+o.ph)*.12;
        const V=o.g.v.map(v=>{ const q=rot([v[0]*s,v[1]*s,v[2]*s],o.ry,o.rx); return cam([q[0]+o.x,q[1]+o.y+by,q[2]+o.z]); }), P=V.map(pr);
        o.g.f.forEach((fc,i)=>{ const ps=fc.map(j=>P[j]); if(ps.some(p=>!p)) return; polys.push({z:fc.reduce((a,j)=>a+V[j][2],0)/fc.length,ps,c:`hsla(${o.hue},75%,${50+(i*7)%20}%,.9)`}); }); }
      polys.sort((a,b)=>b.z-a.z); g.strokeStyle='rgba(255,255,255,.8)'; g.lineWidth=1.2;
      for(const p of polys){ g.fillStyle=p.c; g.beginPath(); p.ps.forEach((q,j)=>j?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1])); g.closePath(); g.fill(); g.stroke(); }
    },
    click(){ add(); add(); },
    react(){ add(); }
  };
}
const MAKE=[photosSim,artSim,chatSim,spaceSim];

function lemni(){ let d=''; for(let i=0;i<=120;i++){ const a=i/120*TAU, den=1+Math.sin(a)**2, x=100*Math.cos(a)/den, y=1.5*100*Math.sin(a)*Math.cos(a)/den; d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1); } return d+'Z'; }
export const _sims = MAKE;

/* ───────────── Anfitrión: portales → ventanas → fusión ───────────── */
export function createDimensions({state, beginReturn, getWord}){
  const dpr=Math.min(devicePixelRatio||1,1.5), $=(tag,id,cls)=>{ const e=document.createElement(tag); if(id) e.id=id; if(cls) e.className=cls; return e; };
  const links=$('canvas','dimLinks'), root=$('div','dims'), scrim=$('div','dimScrim'), logo=$('div','dimLogo'), mission=$('div','dimMission');
mission.textContent='Creamos el futuro de las conexiones humanas';
  logo.innerHTML=`<svg viewBox="-120 -70 240 140"><defs><linearGradient id="mgrad" x1="0" x2="1"><stop offset="0" stop-color="#0064E0"/><stop offset=".55" stop-color="#1877F2"/><stop offset="1" stop-color="#0082FB"/></linearGradient></defs><path d="${lemni()}" pathLength="1" fill="none" stroke="url(#mgrad)" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  document.body.append(links,root,scrim,logo,mission);
  const L=links.getContext('2d');
  const full=()=>({x:0,y:0,w:innerWidth,h:innerHeight});
  const SH=[ // x,y,w,h (fracción de pantalla), inclinación, radios [rx×4, ry×4]
    {x:.025,y:.05,w:.2,h:.44,rot:-3,rad:(w,h)=>[w/2,w/2,18,18,w/2,w/2,18,18]},                            // M · arco
    {x:.755,y:.06,w:.215,h:.4,rot:3,rad:(w,h)=>[w*.62,w*.38,w*.55,w*.45,h*.5,h*.58,h*.42,h*.52]},          // E · gota
    {x:.03,y:.58,w:.22,h:.37,rot:2,rad:(w,h)=>[w*.5,20,w*.5,20,h*.5,20,h*.5,20]},                          // T · hoja
    {x:.76,y:.55,w:.2,h:.4,rot:-4,rad:(w,h)=>[24,w*.5,24,w*.5,24,h*.35,24,h*.35]}];                        // A · pétalo
  const slot=i=>{ const s=SH[i], w=innerWidth*s.w, h=innerHeight*s.h; return {x:innerWidth*s.x,y:innerHeight*s.y,w,h,rot:s.rot,rad:s.rad(w,h)}; };
  const D=TH.map((m,i)=>{ const el=$('div',null,'dim'), cv=$('canvas'); el.style.setProperty('--c',m.col); el.append(cv); root.append(el);
    return {i,m,el,cv,g:cv.getContext('2d'),sim:MAKE[i](),mode:'idle',a:0,vis:0,inter:0,energy:0,lastClick:-9,hover:false,cool:0,r:full(),lm:{x:.5,y:.5,in:false}}; });
  const P={x:-1,y:-1,t:-9,has:false}, clicks=[], pulses=[]; let t=0, last=performance.now(), allT=0, autoT=2, burst=-9, fusing=false, fused=false;
  const now=()=>performance.now()/1000;
  addEventListener('mousemove',e=>{ P.x=e.clientX; P.y=e.clientY; P.t=now(); P.has=true; });
  addEventListener('mousedown',e=>{ if(e.button===0) clicks.push([e.clientX,e.clientY]); });
  document.documentElement.addEventListener('mouseleave',()=>{ P.has=false; });
  addEventListener('keydown',e=>{ if(e.key==='r'||e.key==='R') reset(); });
  addEventListener('resize',layoutLogo);

  function layoutLogo(){ const w=Math.min(innerWidth*.2,280), h=w*140/240, wh=getWord().h, cy=innerHeight/2;
    logo.style.width=w+'px'; logo.style.height=h+'px'; logo.style.top=(cy-wh/2-h-innerHeight*.03)+'px'; mission.style.top=(cy+wh/2+innerHeight*.035)+'px'; }
  function reset(){ for(const d of D){ d.mode='idle'; d.el.style.display='none'; d.inter=0; } pulses.length=0; fusing=fused=false; burst=-9; allT=0;
    logo.classList.remove('on'); mission.classList.remove('on'); }
  function canOpen(i){ return D[i].mode==='idle' && !fusing && !fused; }
  function open(i){ if(!canOpen(i)) return false; const d=D[i]; d.mode='full'; d.vis=0; d.inter=0; d.a=0; d.el.style.display='block'; d.el.style.zIndex=3; return true; }
  function dock(d){ d.mode='docking'; d.a=0; d.el.style.zIndex=1; beginReturn(); }
  function signal(d){ if(d.cool>0) return; d.cool=1.4; for(const o of D) if(o!==d&&o.mode==='docked') pulses.push({i:d.i,j:o.i,u:0}); }
  const inside=(d,x,y)=>{ const r=d.r; return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h; };

  function place(d,dt,sway){
    const F=full(), S=slot(d.i); let r={x:S.x,y:S.y,w:S.w,h:S.h}, op=1, rad=S.rad, deg=S.rot, sc=1;
    if(d.mode==='full'||d.mode==='closing'){ d.vis=d.mode==='full'?Math.min(1,d.vis+dt*2.2):d.vis-dt*2.2; r=F; op=Math.max(0,d.vis); rad=S.rad.map(()=>0); deg=0;
      if(d.vis<=0&&d.mode==='closing'){ d.mode='idle'; d.el.style.display='none'; } }
    else if(d.mode==='docking'){ d.a=Math.min(1,d.a+dt/1.1); const k=ease(d.a); r={x:lerp(F.x,S.x,k),y:lerp(F.y,S.y,k),w:lerp(F.w,S.w,k),h:lerp(F.h,S.h,k)}; rad=S.rad.map(v=>v*k); deg=S.rot*k;
      if(d.a>=1){ d.mode='docked'; d.energy=1; for(const o of D) if(o!==d&&o.mode==='docked'){ o.energy=1; pulses.push({i:d.i,j:o.i,u:0}); pulses.push({i:o.i,j:d.i,u:0}); } } }
    else if(d.mode==='docked'){ const sw=sway[d.i]; r.x+=sw[0]; r.y+=sw[1]; deg+=Math.sin(t*.6+d.i*1.9)*1.3; sc=1+(d.hover?.04:0); }
    else if(d.mode==='fusing'){ d.a=Math.min(1,d.a+dt/1.5); const k=ease(d.a), c=60, C={x:innerWidth/2-c/2,y:innerHeight/2-c/2,w:c,h:c};
      r={x:lerp(S.x,C.x,k),y:lerp(S.y,C.y,k),w:lerp(S.w,C.w,k),h:lerp(S.h,C.h,k)}; op=1-k*k; rad=S.rad.map(v=>lerp(v,30,k)); deg=S.rot*(1-k); }
    const s=d.el.style; s.left=r.x+'px'; s.top=r.y+'px'; s.width=r.w+'px'; s.height=r.h+'px'; s.opacity=op;
    s.borderRadius=`${rad[0]}px ${rad[1]}px ${rad[2]}px ${rad[3]}px / ${rad[4]}px ${rad[5]}px ${rad[6]}px ${rad[7]}px`; s.transform=(deg||sc!==1)?`rotate(${deg}deg) scale(${sc})`:'none';
    d.r=r;
  }
  function drawLinks(dt){
    const W=innerWidth, H=innerHeight; if(links.width!==Math.round(W*dpr)||links.height!==Math.round(H*dpr)){ links.width=Math.round(W*dpr); links.height=Math.round(H*dpr); }
    L.setTransform(dpr,0,0,dpr,0,0); L.clearRect(0,0,W,H);
    const act=D.filter(d=>d.mode==='docked'||d.mode==='fusing'), cen={x:W/2,y:H/2};
    const ctr=d=>({x:d.r.x+d.r.w/2,y:d.r.y+d.r.h/2});
    const curve=(a,b)=>{ const A=ctr(a), B=ctr(b), mx=(A.x+B.x)/2, my=(A.y+B.y)/2, dx=B.x-A.x, dy=B.y-A.y, len=Math.hypot(dx,dy)+1e-3, nx=-dy/len, ny=dx/len;
      const diag=a.i+b.i===3; let s=diag?(a.i<b.i&&a.i===0?1:-1)*.3:((mx-cen.x)*nx+(my-cen.y)*ny>=0?.12:-.12); return {A,B,C:{x:mx+nx*len*s,y:my+ny*len*s}}; };
    const pt=(c,u)=>({x:(1-u)*(1-u)*c.A.x+2*(1-u)*u*c.C.x+u*u*c.B.x, y:(1-u)*(1-u)*c.A.y+2*(1-u)*u*c.C.y+u*u*c.B.y});
    const fade=fusing?Math.max(0,1-Math.min(...act.map(d=>d.a))*2):1;
    for(let a=0;a<act.length;a++) for(let b=a+1;b<act.length;b++){ const c=curve(act[a],act[b]), g=L.createLinearGradient(c.A.x,c.A.y,c.B.x,c.B.y);
      g.addColorStop(0,act[a].m.col); g.addColorStop(1,act[b].m.col); L.strokeStyle=g; L.globalAlpha=.55*fade; L.lineWidth=2.2; L.setLineDash([7,9]); L.lineDashOffset=-t*34;
      L.beginPath(); L.moveTo(c.A.x,c.A.y); L.quadraticCurveTo(c.C.x,c.C.y,c.B.x,c.B.y); L.stroke(); }
    L.setLineDash([]); L.globalAlpha=1;
    for(let i=pulses.length-1;i>=0;i--){ const p=pulses[i], a=D[p.i], b=D[p.j]; p.u+=dt*.8;
      if(p.u>=1||a.mode!=='docked'||b.mode!=='docked'){ if(p.u>=1&&b.mode==='docked'){ b.energy=1; b.sim.react(); } pulses.splice(i,1); continue; }
      const q=pt(curve(a,b),ease(p.u)), g=L.createRadialGradient(q.x,q.y,0,q.x,q.y,14); g.addColorStop(0,'#fff'); g.addColorStop(.3,a.m.col); g.addColorStop(1,a.m.col+'00');
      L.fillStyle=g; L.beginPath(); L.arc(q.x,q.y,14,0,TAU); L.fill(); }
    const bt=t-burst; if(bt>=0&&bt<1.6) D.forEach((d,i)=>{ L.strokeStyle=d.m.col; L.globalAlpha=1-bt/1.6; L.lineWidth=5*(1-bt/1.6)+1; L.beginPath(); L.arc(cen.x,cen.y,bt*(380+i*110),0,TAU); L.stroke(); }); L.globalAlpha=1;
  }
  function update(dt){
    t+=dt; const nowT=now(), docked=D.filter(d=>d.mode==='docked'||d.mode==='docking').length, busy=D.some(d=>d.mode!=='idle')||t-burst<1.7;
    links.style.display=busy?'block':'none'; if(!busy){ scrim.classList.remove('on'); return; }
    // balanceo: cada ventana se inclina hacia sus vecinas
    const dk=D.filter(d=>d.mode==='docked'), sway=D.map(d=>{ const o=dk.filter(q=>q!==d); if(!o.length||d.mode!=='docked') return [0,0];
      const S=slot(d.i), cx=o.reduce((a,q)=>a+slot(q.i).x,0)/o.length-S.x, cy=o.reduce((a,q)=>a+slot(q.i).y,0)/o.length-S.y, l=Math.hypot(cx,cy)+1e-3, k=8*(.5+.5*Math.sin(t*.9+d.i*1.7));
      return [cx/l*k+Math.sin(t*.7+d.i)*3, cy/l*k+Math.cos(t*.6+d.i)*3]; });
    let fd=null;
    for(const d of D){ if(d.mode==='idle') continue; place(d,dt,sway); const el=d.el, w=el.clientWidth, h=el.clientHeight; if(w<2||h<2) continue;
      const cw=Math.round(w*dpr), ch=Math.round(h*dpr); if(d.cv.width!==cw||d.cv.height!==ch){ d.cv.width=cw; d.cv.height=ch; }
      const lm=d.lm, fl=d.mode==='full'; lm.x=(P.x-d.r.x)/d.r.w; lm.y=(P.y-d.r.y)/d.r.h; lm.in=P.has&&(fl||inside(d,P.x,P.y)); if(fl){ lm.x=P.x/innerWidth; lm.y=P.y/innerHeight; }
      d.cool=Math.max(0,d.cool-dt); const hv=lm.in&&d.mode==='docked'; if(hv&&!d.hover) signal(d); d.hover=hv;
      const g=d.g; g.setTransform(dpr,0,0,dpr,0,0); g.globalAlpha=1; d.sim.draw(g,w,h,t,dt,lm);
      if(fl&&P.has){ const k=Math.min(1,d.inter/NEED), cx=lm.x*w, cy=lm.y*h; g.lineWidth=5; g.lineCap='round'; g.strokeStyle='rgba(20,30,70,.15)'; g.beginPath(); g.arc(cx,cy,30,0,TAU); g.stroke();
        g.strokeStyle=d.m.col; g.beginPath(); g.arc(cx,cy,30,-Math.PI/2,-Math.PI/2+TAU*Math.max(k,.001)); g.stroke(); }
      if(d.energy>.02){ g.globalAlpha=d.energy; g.strokeStyle=d.m.col; g.lineWidth=4; g.beginPath(); g.arc(w/2,h/2,(1-d.energy)*Math.max(w,h)*.7,0,TAU); g.stroke(); g.globalAlpha=1; d.energy*=Math.exp(-dt*1.8); }
      el.style.boxShadow=d.mode==='full'?`inset 0 0 ${20+Math.min(1,d.inter/NEED)*160}px ${Math.min(1,d.inter/NEED)*40}px ${d.m.col}`:`0 12px 34px rgba(20,30,70,.18), 0 0 ${d.energy*40}px ${d.m.col}`;
      if(fl){ fd=d; if(state.target===0||state.active!==d.i){ d.mode='closing'; }
        else { if(((nowT-P.t<.4)||(nowT-d.lastClick<.6))&&state.progress>.5) d.inter+=dt; if(d.inter>=NEED) dock(d); } } }
    for(const [x,y] of clicks.splice(0)) for(const d of D){ if(d.mode!=='full'&&d.mode!=='docked') continue; if(d.mode==='full'||inside(d,x,y)){
      const m={x:(x-d.r.x)/d.r.w,y:(y-d.r.y)/d.r.h,in:true}; d.sim.click(m); d.lastClick=nowT; if(d.mode==='docked'){ d.energy=Math.max(d.energy,.7); signal(d); } } }
    // vida propia entre ventanas + fusión cuando están las 4
    if(dk.length>=2){ autoT-=dt; if(autoT<=0){ autoT=rr(2,3.6); const a=dk[(Math.random()*dk.length)|0], b=dk.filter(q=>q!==a)[(Math.random()*(dk.length-1))|0]; pulses.push({i:a.i,j:b.i,u:0}); } }
    if(dk.length===4&&!fusing){ allT+=dt; if(allT>3.8){ fusing=true; for(const d of D){ d.mode='fusing'; d.a=0; } } } else if(!fusing) allT=0;
    if(fusing&&!fused&&D.every(d=>d.a>=1)){ fused=true; fusing=false; for(const d of D){ d.mode='idle'; d.el.style.display='none'; } burst=t; layoutLogo(); logo.classList.add('on'); mission.classList.add('on'); }
    scrim.classList.toggle('on',!!fd&&fd.vis>.3);
    drawLinks(dt);
  }
  (function loop(ms){ requestAnimationFrame(loop); const dt=Math.min(.05,(ms-last)/1000); last=ms; update(dt); })(last);
  layoutLogo();
  return {open, canOpen, reset};
}