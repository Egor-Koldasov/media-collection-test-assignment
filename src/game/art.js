import * as THREE from 'three';

const flat=(color,opacity=1,options={})=>new THREE.MeshBasicMaterial({color,transparent:opacity<1||options.transparent===true,opacity,depthWrite:opacity===1&&options.transparent!==true,side:THREE.DoubleSide,...options});
const plane=(width,height,material)=>new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);
const circle=(radius,material,segments=32)=>new THREE.Mesh(new THREE.CircleGeometry(radius,segments),material);
const ellipse=(rx,ry,material,segments=32)=>{const mesh=circle(1,material,segments);mesh.scale.set(rx,ry,1);return mesh};

function softEllipse(rx,ry,color,opacity=.12){
  const material=new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color(color)},uOpacity:{value:opacity}},transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`varying vec2 vUv;uniform vec3 uColor;uniform float uOpacity;void main(){vec2 p=(vUv-.5)*2.;float d=dot(p,p);float falloff=pow(max(0.,1.-smoothstep(.04,1.,d)),1.45);if(falloff<.008)discard;gl_FragColor=vec4(uColor,falloff*uOpacity);}`});
  const mesh=plane(rx*2,ry*2,material);mesh.userData.radialUniforms=material.uniforms;return mesh;
}

function line(points,color,opacity=1,width=1){
  const geometry=new THREE.BufferGeometry().setFromPoints(points.map(([x,y,z=0])=>new THREE.Vector3(x,y,z)));
  return new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity,linewidth:width}));
}

function ellipseLoop(rx,ry,color,opacity=.3,segments=96){
  const points=[];for(let i=0;i<=segments;i+=1){const angle=i/segments*Math.PI*2;points.push([Math.cos(angle)*rx,Math.sin(angle)*ry,0])}
  return line(points,color,opacity);
}

function polygon(points,color,opacity=1){const shape=new THREE.Shape();shape.moveTo(points[0][0],points[0][1]);points.slice(1).forEach(([x,y])=>shape.lineTo(x,y));shape.closePath();return new THREE.Mesh(new THREE.ShapeGeometry(shape),flat(color,opacity));}

function disposeObject(object){object?.traverse?.((child)=>{child.geometry?.dispose?.();if(child.material){const materials=Array.isArray(child.material)?child.material:[child.material];materials.forEach((material)=>{material.userData.disposed=true;material.map?.dispose?.();material.dispose?.()})}})}

const atlasTextureCache=new Map();
const enemyArtOrder=['thrall','hound','pikeman','bowman','harvester','graveguard','cantor','standard','wraith','bishop','ossuary','giant'];
const enemyFacingProfiles={
  thrall:{native:-1},
  hound:{native:-1},
  pikeman:{native:-1},
  bowman:{native:1},
  harvester:{native:-1},
  graveguard:{native:-1},
  cantor:{native:1},
  standard:{native:-1},
  wraith:{native:1},
  bishop:{native:1},
  ossuary:{native:-1},
  giant:{native:-1}
};
const enemyVisualGrades={
  thrall:{color:0xd3c2a4,amount:.1,lift:.018},
  hound:{color:0xc4a987,amount:.12,lift:.018},
  pikeman:{color:0xaab8c8,amount:.19,lift:.027},
  bowman:{color:0x93aac3,amount:.22,lift:.03},
  harvester:{color:0xc1a47d,amount:.15,lift:.024},
  graveguard:{color:0xa99b87,amount:.13,lift:.022},
  cantor:{color:0xae8db7,amount:.23,lift:.032},
  standard:{color:0xb7785d,amount:.24,lift:.027},
  wraith:{color:0x9db8d7,amount:.31,lift:.045},
  bishop:{color:0xbd98c7,amount:.26,lift:.038},
  ossuary:{color:0xb59d75,amount:.19,lift:.027},
  giant:{color:0xd0a467,amount:.24,lift:.035}
};

function atlasTexture(path){
  if(typeof window==='undefined')return null;
  if(atlasTextureCache.has(path))return atlasTextureCache.get(path);
  let texture;texture=new THREE.TextureLoader().load(path,()=>{texture.userData.atlasReady=true;texture.userData.atlasReadyCallbacks.splice(0).forEach((callback)=>callback(texture))});texture.userData.atlasReady=false;texture.userData.atlasReadyCallbacks=[];texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.anisotropy=8;atlasTextureCache.set(path,texture);return texture;
}

function animatedAtlasPlane(path,columns,rows,frameCell,opacity=1,grade=null){
  const resolveCell=typeof frameCell==='function'?frameCell:()=>[frameCell%columns,Math.floor(frameCell/columns)],[column,row]=resolveCell(0),uniforms={uMap:{value:atlasTexture(path)},uAtlas:{value:new THREE.Vector2(columns,rows)},uCell:{value:new THREE.Vector2(column,rows-row-1)},uTime:{value:0},uMotion:{value:0},uAction:{value:0},uStride:{value:0},uLean:{value:0},uPhase:{value:Math.random()*9},uOpacity:{value:opacity},uGradeColor:{value:grade?.color?.isColor?grade.color:new THREE.Color(grade?.color??0xffffff)},uGradeAmount:{value:grade?.amount||0},uGradeLift:{value:grade?.lift||0}};
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:`
    varying vec2 vUv;
    uniform float uTime;
    uniform float uMotion;
    uniform float uAction;
    uniform float uStride;
    uniform float uLean;
    uniform float uPhase;
    void main(){
      vUv=uv;vec3 p=position;float body=sin(uv.y*3.14159265);float hem=1.0-smoothstep(.08,.42,uv.y);float shoulders=smoothstep(.48,.9,uv.y);
      p.x+=sin(uTime*2.05+uPhase+uv.y*5.8)*body*(.008+.016*uMotion);
      p.x+=hem*uStride*sign(uv.x-.5)*uMotion*.025;
      p.x+=uLean*(uv.y-.18)*(.055+.025*shoulders);
      p.y+=sin(uTime*1.62+uPhase)*.007+abs(uStride)*uMotion*hem*.012;
      p.x+=uAction*shoulders*.052;p.y+=uAction*body*.018;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
    }`,fragmentShader:`
    varying vec2 vUv;
    uniform sampler2D uMap;
    uniform vec2 uAtlas;
    uniform vec2 uCell;
    uniform float uAction;
    uniform float uOpacity;
    uniform vec3 uGradeColor;
    uniform float uGradeAmount;
    uniform float uGradeLift;
    void main(){
      vec4 painted=texture2D(uMap,(vUv+uCell)/uAtlas);if(painted.a<.025)discard;
      const vec3 luma=vec3(.2126,.7152,.0722);float luminance=dot(painted.rgb,luma),gradeLuminance=max(.08,dot(uGradeColor,luma)),gradeMask=smoothstep(.06,.58,luminance);vec3 normalizedTint=uGradeColor/gradeLuminance;
      painted.rgb=mix(painted.rgb,painted.rgb*normalizedTint,uGradeAmount*gradeMask)+uGradeColor*uGradeLift*(.45+.55*gradeMask);
      painted.rgb=clamp(painted.rgb+vec3(.24,.065,.035)*uAction*(.35+.65*vUv.y),0.,1.);
      gl_FragColor=vec4(painted.rgb,painted.a*uOpacity);
    }`});
  const sprite=new THREE.Mesh(new THREE.PlaneGeometry(1,1,12,18),material);sprite.userData.spriteUniforms=uniforms;sprite.userData.animationFrame=-1;sprite.userData.setAnimationFrame=(frame)=>{if(sprite.userData.animationFrame===frame)return;const [nextColumn,nextRow]=resolveCell(frame);uniforms.uCell.value.set(nextColumn,rows-nextRow-1);sprite.userData.animationFrame=frame};sprite.userData.setAnimationFrame(0);return sprite;
}

function rigidAtlasPlane(path,columns,rows){
  const uniforms={uMap:{value:atlasTexture(path)},uAtlas:{value:new THREE.Vector2(columns,rows)},uCell:{value:new THREE.Vector2(0,rows-1)},uTint:{value:new THREE.Color(0xffffff)},uLift:{value:0},uOpacity:{value:1}};
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`varying vec2 vUv;uniform sampler2D uMap;uniform vec2 uAtlas;uniform vec2 uCell;uniform vec3 uTint;uniform float uLift;uniform float uOpacity;void main(){vec4 painted=texture2D(uMap,(vUv+uCell)/uAtlas);if(painted.a<.025)discard;vec3 lifted=clamp(painted.rgb*uTint+vec3(uLift),0.,1.);gl_FragColor=vec4(lifted,painted.a*uOpacity);}`});
  const sprite=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);sprite.userData.animationFrame=-1;sprite.userData.setAnimationFrame=(frame)=>{const next=Math.max(0,Math.min(columns*rows-1,frame));if(sprite.userData.animationFrame===next)return;uniforms.uCell.value.set(next%columns,rows-Math.floor(next/columns)-1);sprite.userData.animationFrame=next};sprite.userData.setOpacity=(opacity)=>{uniforms.uOpacity.value=opacity};sprite.userData.setAnimationFrame(0);return sprite;
}

function prepareDepthSortedVisual(group){
  const layers=[];group.traverse((object)=>{layers.push(object);if(!object.material)return;const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach((material)=>{material.transparent=true;material.depthWrite=false;material.needsUpdate=true})});group.userData.depthLayers=layers;return group;
}

function setVisualDepth(group,order){(group?.userData?.depthLayers||[group]).forEach((object)=>{if(object)object.renderOrder=order})}

function makeRune(radius,angle,color=0x8e7056){
  const group=new THREE.Group();const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius*.76;const mark=line([[-.12,0,0],[0,.22,0],[.12,0,0],[0,-.22,0],[-.12,0,0]],color,0);mark.position.set(x,y,-.88);mark.rotation.z=angle;group.add(mark);group.userData.mark=mark;return group;
}

function makeTombstone(x,y,scaleValue=1,variant=0){
  const group=new THREE.Group();const dark=variant%3===0?0x26282c:0x1e2126;const shaft=plane(.24*scaleValue,(.62+(variant%4)*.08)*scaleValue,flat(dark));shaft.position.y=.04;
  const cap=variant%2?polygon([[-.16,0],[0,.2],[.16,0]],0x2d2e31):ellipse(.16,.12,flat(0x2d2e31));cap.scale.multiplyScalar(scaleValue);cap.position.y=(.37+(variant%4)*.04)*scaleValue;
  const scratch=line([[-.06,.08,0],[.06,.08,0],[0,.08,0],[0,.22,0]],0x7d7568,.28);scratch.scale.setScalar(scaleValue);scratch.position.z=.03;group.add(shaft,cap,scratch);group.position.set(x,y,-.68);group.rotation.z=(Math.random()-.5)*.16;return group;
}

function makeDeadTree(x,y,scaleValue=1){
  const group=new THREE.Group();const trunk=line([[0,-.55,0],[.03,.15,0],[-.07,.68,0]],0x151518,.95);const left=line([[0,.18,0],[-.32,.48,0],[-.46,.43,0]],0x151518,.95);const right=line([[-.03,.38,0],[.28,.63,0],[.38,.58,0]],0x151518,.95);group.add(trunk,left,right);group.position.set(x,y,-.62);group.scale.setScalar(scaleValue);return group;
}

function makeArch(x,y,scaleValue=1){
  const group=new THREE.Group();const left=plane(.18,1.4,flat(0x222329));left.position.x=-.55;const right=left.clone();right.position.x=.55;const topPoints=[];for(let i=0;i<=16;i+=1){const a=Math.PI-i/16*Math.PI;topPoints.push([Math.cos(a)*.55,Math.sin(a)*.55+.68,0])}const top=line(topPoints,0x33343a,.85);const inner=line(topPoints.map(([px,py])=>[px*.78,(py-.68)*.78+.68,0]),0x111216,1);group.add(left,right,top,inner);group.position.set(x,y,-.58);group.scale.setScalar(scaleValue);return group;
}

function makeGraveSpecter(angle,index){
  const group=new THREE.Group();const cloak=polygon([[-.24,.14],[.24,.14],[.38,-.52],[0,-.7],[-.38,-.52]],index%4===0?0x6f5268:0x596175,0);const head=ellipse(.13,.16,flat(0x9b91a6,0),18);head.position.set(0,.25,.02);const eyes=[circle(.012,flat(0xb14a58,0),6),circle(.012,flat(0xb14a58,0),6)];eyes[0].position.set(-.045,.27,.04);eyes[1].position.set(.045,.27,.04);group.add(cloak,head,...eyes);group.rotation.z=angle-Math.PI/2;group.userData={angle,index,materials:[cloak.material,head.material,...eyes.map((eye)=>eye.material)]};return group;
}

export function buildArena(scene){
  scene.background=new THREE.Color(0x06080b);const groundTexture=new THREE.TextureLoader().load('/assets/graveyard-arena.png');groundTexture.colorSpace=THREE.SRGBColorSpace;groundTexture.minFilter=THREE.LinearMipmapLinearFilter;groundTexture.magFilter=THREE.LinearFilter;groundTexture.anisotropy=8;const under=plane(36,20.25,new THREE.MeshBasicMaterial({map:groundTexture,color:0xffffff}));under.position.z=-2;scene.add(under);
  const moonWash=ellipse(13,8.6,flat(0x31384d,.025),96);moonWash.position.set(-2.5,1,-1.82);scene.add(moonWash);
  const arena=ellipse(9.5,7.15,flat(0x20232a,.045),128);arena.position.z=-1.48;scene.add(arena);const rim=ellipseLoop(9.5,7.15,0x9a8064,.11,160);rim.position.z=-1.38;scene.add(rim);
  const innerStain=ellipse(5.6,4.2,flat(0x10131a,.035),96);innerStain.position.z=-1.36;scene.add(innerStain);const lawWash=ellipse(9.1,6.82,flat(0x5d4153,0),96);lawWash.position.z=-1.34;scene.add(lawWash);
  const phaseAura=ellipseLoop(8.72,6.56,0x8b6b52,0,128);phaseAura.position.z=-1.3;phaseAura.visible=false;scene.add(phaseAura);const phaseIris=ellipseLoop(6.15,4.62,0x8b6b52,0,96);phaseIris.position.z=-1.27;phaseIris.visible=false;scene.add(phaseIris);const phaseWave=ellipseLoop(1.12,.84,0x8b6b52,0,128),phaseVeil=softEllipse(7.8,5.7,0x8b6b52,0);phaseWave.position.z=-1.16;phaseVeil.position.z=-1.7;phaseWave.visible=phaseVeil.visible=false;scene.add(phaseVeil,phaseWave);

  const rings=[];[1.55,2.05,3.55,5.3,7.05,8.9].forEach((radius,index)=>{const points=[];for(let i=0;i<=160;i+=1){const angle=i/160*Math.PI*2;const wobble=1+Math.sin(i*7.31+index)*.006;points.push([Math.cos(angle)*radius*wobble,Math.sin(angle)*radius*.76*wobble,-1.2])}const ring=line(points,index===2?0x89634d:0x4b4d56,index===2?.11:.045);scene.add(ring);rings.push(ring)});
  const runeGroup=new THREE.Group();runeGroup.visible=false;scene.add(runeGroup);
  for(let index=0;index<12;index+=1)runeGroup.add(makeRune(7.7,index/12*Math.PI*2+.13,index%3===0?0xa87862:0x786b65));
  const sigil=new THREE.Group(),sigilGlow=ellipse(1.6,1.2,flat(0xa63c42,.035),64);sigilGlow.position.z=-.9;sigil.add(sigilGlow);sigil.visible=false;scene.add(sigil);

  const debris=new THREE.Group();scene.add(debris);

  const eclipseHalo=ellipse(1.25,.95,flat(0xa43d4b,.025),64);eclipseHalo.position.set(-7.4,4.65,-.77);const eclipse=ellipse(.72,.55,flat(0x090a0e,.96),64);eclipse.position.set(-7.4,4.65,-.73);const eclipseRim=ellipseLoop(.78,.6,0x9f5963,.08,64);eclipseRim.position.set(-7.4,4.65,-.72);eclipseHalo.visible=eclipse.visible=eclipseRim.visible=false;scene.add(eclipseHalo,eclipse,eclipseRim);
  const cracks=[];for(let index=0;index<10;index+=1){const angle=index/10*Math.PI*2+.24,radius=4.7+(index%3)*.65,spread=.34+(index%2)*.13,crack=line([[Math.cos(angle)*radius,Math.sin(angle)*radius*.76,-1.05],[Math.cos(angle+spread*.2)*(radius+.48),Math.sin(angle+spread*.2)*(radius+.48)*.76,-1.05],[Math.cos(angle-spread*.18)*(radius+.86),Math.sin(angle-spread*.18)*(radius+.86)*.76,-1.05]],index%3===0?0x8c4847:0x6d5960,0);crack.visible=false;scene.add(crack);cracks.push(crack)}
  const procession=[];for(let index=0;index<14;index+=1){const angle=index/14*Math.PI*2+.08,specter=makeGraveSpecter(angle,index),scaleValue=.72+(index%4)*.08;specter.position.set(Math.cos(angle)*8.55,Math.sin(angle)*6.35,-.82);specter.scale.setScalar(scaleValue);specter.visible=false;specter.userData.baseY=specter.position.y;specter.userData.baseScale=scaleValue;scene.add(specter);procession.push(specter)}

  const bonePiles=new THREE.Group();scene.add(bonePiles);

  const fog=[];for(let i=0;i<58;i+=1){const mote=ellipse(.45+Math.random()*1.25,.18+Math.random()*.38,flat(i%7===0?0x725766:0x58627b,.025+Math.random()*.04),28);mote.position.set((Math.random()-.5)*29,(Math.random()-.5)*16,-.5+Math.random()*.2);mote.userData={speed:.035+Math.random()*.095,phase:Math.random()*Math.PI*2,baseOpacity:mote.material.opacity};scene.add(mote);fog.push(mote)}
  const embers=[];for(let i=0;i<34;i+=1){const ember=circle(.012+Math.random()*.022,flat(i%3?0xda9d51:0xb23d42,.55+Math.random()*.3),8);ember.position.set((Math.random()-.5)*20,(Math.random()-.5)*12,-.05);ember.userData={phase:Math.random()*9,speed:.08+Math.random()*.12};scene.add(ember);embers.push(ember)}

  const candleGroup=new THREE.Group();scene.add(candleGroup);

  const lawSeals=new THREE.Group();scene.add(lawSeals);let pulseIntensity=0,activeLawColors=[],bellPhase=0,phaseFlash=0,phaseWaveAge=1,lastArenaTime=null;const phaseColors=[0x8b6b52,0x8b6b52,0x675775,0x8f3440,0xc17953].map((color)=>new THREE.Color(color));scene.traverse((object)=>{object.renderOrder=-30000});
  return{
    pulse(){pulseIntensity=1},
    setBell(bell){const next=bell>=18?4:bell>=15?3:bell>=10?2:bell>=5?1:0;if(next!==bellPhase){bellPhase=next;phaseFlash=1;phaseWaveAge=0;phaseAura.material.color.copy(phaseColors[bellPhase]);phaseIris.material.color.copy(phaseColors[bellPhase]);phaseWave.material.color.copy(phaseColors[bellPhase]);phaseVeil.userData.radialUniforms.uColor.value.copy(phaseColors[bellPhase]);sigilGlow.material.color.copy(phaseColors[bellPhase]);phaseAura.visible=phaseIris.visible=phaseVeil.visible=runeGroup.visible=bellPhase>=1;phaseWave.visible=bellPhase>=1;cracks.forEach((crack)=>crack.visible=bellPhase>=2);sigil.visible=bellPhase>=2;procession.forEach((specter)=>specter.visible=bellPhase>=3);eclipseHalo.visible=eclipse.visible=eclipseRim.visible=bellPhase>=3;pulseIntensity=1}},
    applyLaws(laws=[]){
      lawSeals.children.forEach(disposeObject);lawSeals.clear();activeLawColors=laws.map((law)=>new THREE.Color(law.color));
      if(activeLawColors.length){const blended=activeLawColors.reduce((color,current)=>color.add(current),new THREE.Color(0,0,0)).multiplyScalar(1/activeLawColors.length);lawWash.material.color.copy(blended);lawWash.material.opacity=.045;moonWash.material.color.copy(blended).lerp(new THREE.Color(0x31384d),.55)}
      laws.forEach((law,index)=>{const seal=new THREE.Group(),outer=ellipseLoop(.72,.54,law.color,.42,48),inner=ellipseLoop(.46,.34,law.color,.2,36);seal.add(outer,inner);const hash=[...law.id].reduce((value,char)=>value+char.charCodeAt(0),0);for(let mark=0;mark<7;mark+=1){const a=mark/7*Math.PI*2+hash*.01,b=((mark+(hash%4)+2)%7)/7*Math.PI*2;seal.add(line([[Math.cos(a)*.39,Math.sin(a)*.3,0],[Math.cos(b)*.39,Math.sin(b)*.3,0]],law.color,.48))}const position=index===0?[-6.7,-4.45]:[6.75,4.35];seal.position.set(position[0],position[1],-.55);seal.rotation.z=(index?1:-1)*.18;seal.userData={outer,inner,phase:index*Math.PI+.7,speed:index?-.00022:.00018};lawSeals.add(seal)});
      fog.forEach((mote,index)=>{if(index%6===0&&activeLawColors.length)mote.material.color.copy(activeLawColors[index%activeLawColors.length])});embers.forEach((ember,index)=>{if(index%5===0&&activeLawColors.length)ember.material.color.copy(activeLawColors[index%activeLawColors.length])});
    },
    update(time,progress=0){
      const arenaDt=lastArenaTime==null?0:Math.max(0,Math.min(.05,(time-lastArenaTime)/1000));lastArenaTime=time;
      fog.forEach((mote)=>{mote.position.x+=mote.userData.speed*.006;if(mote.position.x>15)mote.position.x=-15;mote.material.opacity=mote.userData.baseOpacity+Math.sin(time*.00035+mote.userData.phase)*.012});
      embers.forEach((ember)=>{ember.position.y+=ember.userData.speed*.006;ember.position.x+=Math.sin(time*.001+ember.userData.phase)*.0015;if(ember.position.y>7)ember.position.y=-7;ember.material.opacity=.3+Math.sin(time*.003+ember.userData.phase)*.28});
      candleGroup.children.filter((_,index)=>index%2===1).forEach((flame)=>{flame.scale.x=flame.userData.baseX*(.72+Math.sin(time*.012+flame.userData.phase)*.24);flame.scale.y=flame.userData.baseY*(.9+Math.cos(time*.017+flame.userData.phase)*.22)});
      sigil.rotation.z=Math.sin(time*.00011)*.035;sigilGlow.material.opacity=.025+progress*.07+pulseIntensity*.2;pulseIntensity*=Math.pow(.96,arenaDt*60);rings[2].material.opacity=.065+Math.sin(time*.0012)*.025+progress*.035;
      phaseFlash*=Math.pow(.955,arenaDt*60);phaseWaveAge=Math.min(1,phaseWaveAge+arenaDt/1.4);if(phaseWaveAge>=1)phaseWave.visible=false;const waveEase=1-Math.pow(1-phaseWaveAge,3),waveFade=Math.sin(phaseWaveAge*Math.PI);phaseWave.scale.setScalar(.85+waveEase*8.2);phaseWave.material.opacity=bellPhase?waveFade*(.2+bellPhase*.045):0;phaseVeil.userData.radialUniforms.uOpacity.value=bellPhase*.009+phaseFlash*.09;innerStain.material.color.lerp(phaseColors[bellPhase],bellPhase?.004:0);phaseAura.material.opacity=bellPhase ? .025+bellPhase*.014+phaseFlash*.24 : 0;phaseIris.material.opacity=bellPhase ? .018+bellPhase*.012+phaseFlash*.16 : 0;phaseAura.rotation.z=time*(bellPhase%2?-.000035:.00004);phaseIris.rotation.z=time*.00007;const phaseBreath=1+Math.sin(time*.0008)*(.006+bellPhase*.002)+phaseFlash*.045;phaseAura.scale.set(phaseBreath,phaseBreath,1);phaseIris.scale.set(2-phaseBreath,2-phaseBreath,1);runeGroup.rotation.z=Math.sin(time*.00008)*.008+bellPhase*time*.0000025;runeGroup.children.forEach((rune,index)=>{rune.userData.mark.material.opacity=bellPhase?Math.min(.28,.1+bellPhase*.035+Math.sin(time*.0011+index)*.035):0});
      eclipseHalo.material.opacity=.02+progress*.12+pulseIntensity*.08;eclipseHalo.scale.setScalar(1+Math.sin(time*.0009)*.06+progress*.3);eclipseRim.material.opacity=.06+progress*.32;eclipseRim.rotation.z=time*.00008;
      cracks.forEach((crack,index)=>{const awakening=bellPhase>=2?Math.min(.23,.075+(bellPhase-2)*.045+Math.sin(time*.001+index)*.025):0;crack.material.opacity=Math.max(0,awakening)});
      procession.forEach((specter,index)=>{const awakening=bellPhase>=3?Math.max(0,.065+(bellPhase-3)*.055-index*.0025+phaseFlash*.08):0;specter.userData.materials.forEach((material,part)=>material.opacity=part>1?awakening*2.5:awakening);specter.position.y=specter.userData.baseY+Math.sin(time*.0008+index)*.08;specter.scale.y=specter.userData.baseScale*(1+Math.sin(time*.0012+index)*.035)});
      lawSeals.children.forEach((seal)=>{seal.rotation.z+=seal.userData.speed;const breath=.94+Math.sin(time*.0014+seal.userData.phase)*.08;seal.scale.setScalar(breath);seal.userData.outer.material.opacity=.28+progress*.16+Math.sin(time*.0018+seal.userData.phase)*.1;seal.userData.inner.rotation.z=-time*.00016});lawWash.material.opacity=activeLawColors.length ? .035+progress*.035 : 0;
    }
  };
}

function makeBar(width,color){
  const uniforms={uFill:{value:1},uFillColor:{value:new THREE.Color(color)},uBgColor:{value:new THREE.Color(0x16171b)}},material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,toneMapped:false,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`
    varying vec2 vUv;uniform float uFill;uniform vec3 uFillColor;uniform vec3 uBgColor;
    void main(){
      vec3 color=vec3(.019,.022,.03);float alpha=.84;float aaX=max(fwidth(vUv.x)*.72,.002),aaY=max(fwidth(vUv.y)*.72,.002);
      float frameInner=smoothstep(.035,.035+aaX,vUv.x)*smoothstep(.035,.035+aaX,1.-vUv.x)*smoothstep(.1,.1+aaY,vUv.y)*smoothstep(.1,.1+aaY,1.-vUv.y),frame=1.-frameInner;
      color=mix(color,vec3(.604,.545,.463),frame*.28);
      float innerX=smoothstep(.045,.045+aaX,vUv.x)*smoothstep(.045,.045+aaX,1.-vUv.x),innerY=smoothstep(.2,.2+aaY,vUv.y)*smoothstep(.2,.2+aaY,1.-vUv.y),inside=innerX*innerY;
      color=mix(color,uBgColor,inside);alpha=mix(alpha,.92,inside);
      float fillEdge=.045+uFill*.91,filled=inside*(1.-smoothstep(fillEdge-aaX,fillEdge+aaX,vUv.x))*step(.0001,uFill);
      color=mix(color,uFillColor,filled);alpha=mix(alpha,1.,filled);
      float gleam=filled*smoothstep(.61,.61+aaY,vUv.y)*smoothstep(.31,.31+aaY,1.-vUv.y);
      color=mix(color,vec3(.937,.894,.82),gleam*.16);
      gl_FragColor=vec4(color,alpha);
    }`});
  const bar=plane(width+.09,.094,material);bar.userData.barUniforms=uniforms;return bar;
}

function setBarValue(bar,value){if(bar?.userData?.barUniforms)bar.userData.barUniforms.uFill.value=THREE.MathUtils.clamp(value,0,1)}
function setBarColors(bar,fillColor,bgColor){const uniforms=bar?.userData?.barUniforms;if(!uniforms)return;uniforms.uFillColor.value.set(fillColor);uniforms.uBgColor.value.set(bgColor)}

function createOrbitKnife(frame){const sprite=rigidAtlasPlane('/assets/orbit-knives-atlas.png',4,1);sprite.userData.setAnimationFrame(frame%4);sprite.material.uniforms.uTint.value.setRGB(1.5,1.44,1.34);sprite.material.uniforms.uLift.value=.26;sprite.scale.set(1.42,1.9,1);sprite.position.z=.5;return sprite}

export function createHeroVisual(unit){
  const group=new THREE.Group(),oathColor=new THREE.Color(unit.color||'#d5a25c').lerp(new THREE.Color(0xd5a25c),.55),oathLight=softEllipse(1.22,.74,oathColor,.06);oathLight.position.set(0,-.31,-.16);const shadow=ellipse(.52,.18,flat(0x000000,.43),28);shadow.position.set(0,-.67,-.1);
  const selectedSigil=new THREE.Group(),sigilOuter=ellipseLoop(.74,.52,oathColor,.0,64),sigilInner=ellipseLoop(.49,.34,0xd8c6a6,0,48);selectedSigil.add(sigilOuter,sigilInner);for(let index=0;index<8;index+=1){const angle=index/8*Math.PI*2,inner=.57,outer=.69,tick=line([[Math.cos(angle)*inner,Math.sin(angle)*inner*.7,0],[Math.cos(angle)*outer,Math.sin(angle)*outer*.7,0]],index%2?oathColor:0xd8c6a6,0);tick.position.z=.01;selectedSigil.add(tick)}selectedSigil.position.set(0,-.28,-.12);selectedSigil.visible=false;
  const body=new THREE.Group(),sprite=animatedAtlasPlane('/assets/oathbound-animation-v2.png',5,4,(frame)=>[unit.portrait,frame]);sprite.scale.set(.82,1.95,1);sprite.position.set(0,.12,.14);body.add(sprite);group.add(shadow,body);const hp=makeBar(.92,0x4f9d67);hp.position.set(0,-.79,.33);const ap=makeBar(.92,0x7e89bd);ap.position.set(0,-.89,.33);const shield=ellipseLoop(.61,.44,0x8b96c5,0,48);shield.position.set(0,-.18,.31);const selectedWash=plane(1.08,.205,flat(0xd5a25c,0));selectedWash.position.set(0,-.85,.315);const selectedBracket=line([[-.48,.095,0],[-.55,.095,0],[-.55,-.095,0],[-.48,-.095,0],[.48,-.095,0],[.55,-.095,0],[.55,.095,0],[.48,.095,0]],0xd5a25c,0);selectedBracket.position.set(0,-.85,.35);group.add(selectedWash,hp,ap,selectedBracket,shield);
  const riteHalo=new THREE.Group();[0xd5a25c,0xd6504f,0x7f8dbb,0xc49b67,0x9d6ca5,0xd9c77e].forEach((color,index)=>{const mark=polygon([[0,.09],[.065,0],[0,-.09],[-.065,0]],color,.76);mark.position.z=.42;mark.visible=false;mark.userData={phase:index/6*Math.PI*2};riteHalo.add(mark)});group.add(riteHalo);
  const orbitKnives=new THREE.Group();for(let index=0;index<7;index+=1){const knife=createOrbitKnife(index);knife.visible=false;orbitKnives.add(knife)}group.add(orbitKnives);
  group.add(oathLight,selectedSigil);group.userData={hp,ap,shield,selectedWash,selectedBracket,oathLight,selectedSigil,sigilOuter,sigilInner,riteHalo,orbitKnives,body,sprite,phase:Math.random()*9,castPulse:0,facing:1};prepareDepthSortedVisual(group);return group;
}

function createHoundBody(enemy,bone){
  const body=new THREE.Group(),ribcage=ellipseLoop(.36,.22,bone,.9,28);ribcage.position.z=.09;const ribs=new THREE.Group();[-.23,-.11,.02,.15,.26].forEach((x,index)=>{const half=.1+Math.sin((index+1)/6*Math.PI)*.1,rib=line([[x,-half,0],[x,half,0]],bone,.68);rib.position.z=.1;ribs.add(rib)});const skull=polygon([[-.24,.12],[.18,.16],[.34,0],[.13,-.12],[-.2,-.1]],bone);skull.scale.set(.65,.65,1);skull.position.set(.46,.1,.12);const eye=ellipse(.025,.02,flat(enemy.elite?enemy.affixColor:0x321416),8);eye.position.set(.55,.12,.2);const spine=line([[-.42,.16,0],[.28,.13,0]],bone,.85);spine.position.z=.11;const tail=line([[-.34,.1,0],[-.62,.26,0],[-.72,.18,0]],bone,.8);tail.position.z=.1;const legs=[[-.24,-.1,-.43,-.39],[-.05,-.1,-.1,-.42],[.2,-.08,.34,-.39],[.35,-.04,.5,-.32]].map(([x,y,x2,y2])=>line([[x,y,0],[x2,y2,0]],bone,.9));body.add(ribcage,ribs,skull,eye,spine,tail,...legs);return{body,skull,legs};
}

function createHumanoidSkeleton(enemy,bone){
  const body=new THREE.Group();const skull=ellipse(.2,.22,flat(bone),20);skull.position.set(0,.35,.16);const jaw=plane(.23,.09,flat(0x9e9586));jaw.position.set(0,.19,.17);const eyeColor=enemy.elite?enemy.affixColor:enemy.template.aura||enemy.template.bishop?0xb25ac7:enemy.template.phase?0x6f86c7:0x211817;const eyes=[ellipse(.035,.025,flat(eyeColor),10),ellipse(.035,.025,flat(eyeColor),10)];eyes[0].position.set(-.07,.37,.2);eyes[1].position.set(.07,.37,.2);const spine=plane(.055,.57,flat(bone));spine.position.set(0,-.1,.08);const sternum=line([[0,.12,0],[0,-.31,0]],0x817b6f,.75);sternum.position.z=.14;const ribs=new THREE.Group();for(let i=0;i<4;i+=1){const y=.07-i*.11;const rib=line([[-.21,y,0],[0,y-.05,0],[.21,y,0]],bone,.9);rib.position.z=.12;ribs.add(rib)}const arms=[line([[0,.08,0],[-.36,-.18,0],[-.28,-.5,0]],bone,.95),line([[0,.08,0],[.34,-.15,0],[.29,-.47,0]],bone,.95)];arms.forEach((arm)=>arm.position.z=.1);const legs=[line([[-.05,-.36,0],[-.2,-.78,0]],bone,.95),line([[.05,-.36,0],[.2,-.78,0]],bone,.95)];legs.forEach((leg)=>leg.position.z=.09);const joints=[[-.36,-.18],[.34,-.15],[-.05,-.36],[.05,-.36]].map(([x,y])=>{const joint=circle(.035,flat(bone,.9),10);joint.position.set(x,y,.13);return joint});body.add(spine,sternum,ribs,...arms,...legs,...joints,skull,jaw,...eyes);
  if(enemy.id%3===0){const crack=line([[-.04,.51,0],[.01,.43,0],[-.035,.37,0]],0x514a42,.8);crack.position.z=.22;body.add(crack)}
  if(enemy.type==='thrall'&&enemy.id%3===1){arms[enemy.id%2].visible=false;const stump=circle(.045,flat(bone,.82),10);stump.position.set(enemy.id%2?.3:-.3,-.12,.13);body.add(stump)}
  if(enemy.type==='pikeman'){
    const helm=polygon([[-.24,.42],[0,.74],[.24,.42],[.16,.29],[-.16,.29]],0x57534d,.84),crest=line([[0,.7,0],[0,.9,0]],0x9a5047,.75);helm.position.z=.18;crest.position.z=.19;body.add(helm,crest);
  }
  if(enemy.type==='bowman'){
    const quiver=polygon([[-.09,.18],[.09,.18],[.13,-.38],[-.13,-.38]],0x57483a,.8);quiver.position.set(-.34,-.02,.07);const arrows=[-.05,.03,.11].map((offset)=>{const arrow=line([[-.35+offset,.05,0],[-.48+offset,.63,0]],0xafa082,.72);arrow.position.z=.08;return arrow});body.add(quiver,...arrows);
  }
  if(enemy.type==='harvester'){
    const cowl=polygon([[-.35,.28],[-.22,.7],[0,.82],[.22,.7],[.35,.28],[.27,.02],[-.27,.02]],0x302a29,.78),tatterA=line([[-.24,.02,0],[-.37,-.54,0]],0x5f4c43,.6),tatterB=line([[.22,.02,0],[.36,-.47,0]],0x5f4c43,.6);cowl.position.z=.1;tatterA.position.z=tatterB.position.z=.09;body.add(cowl,tatterA,tatterB);
  }
  if(enemy.type==='cantor'){
    const throat=ellipseLoop(.11,.08,enemy.elite?enemy.affixColor:0xa56db2,.72,24);throat.position.set(0,.16,.22);body.add(throat);[-1,0,1].forEach((offset)=>{const note=line([[offset*.11,.58,0],[offset*.14,.74+(offset===0?.08:0),0]],0xa98ab3,.54);note.position.z=.18;body.add(note)});
  }
  if(enemy.type==='graveguard'){
    const leftPlate=polygon([[-.42,.16],[-.16,.28],[-.08,.02],[-.35,-.08]],0x45433f,.9),rightPlate=polygon([[.42,.16],[.16,.28],[.08,.02],[.35,-.08]],0x45433f,.9);leftPlate.position.z=rightPlate.position.z=.15;body.add(leftPlate,rightPlate);
  }
  if(enemy.template.phase){const shroud=polygon([[-.34,.06],[.34,.06],[.5,-.72],[0,-.9],[-.5,-.72]],0x4c526d,.35);shroud.position.z=.06;body.add(shroud)}
  if(enemy.template.armored){const armor=polygon([[-.3,.14],[.3,.14],[.34,-.28],[0,-.4],[-.34,-.28]],0x3d3c3a);armor.position.z=.14;body.add(armor)}
  if(enemy.template.bishop){const mitre=polygon([[-.21,.47],[0,.86],[.21,.47],[0,.58]],0x4a384d);mitre.position.z=.18;body.add(mitre)}
  if(enemy.template.standard){const pole=line([[.36,-.48,0],[.36,.95,0]],0x806b4f,.95);pole.position.z=.17;const banner=polygon([[.36,.9],[.95,.78],[.8,.3],[.36,.42]],0x6e242c,.85),bannerMark=line([[.48,.68,0],[.79,.47,0],[.56,.4,0],[.78,.72,0]],0xd0aa73,.72);banner.position.z=.16;bannerMark.position.z=.18;body.add(pole,banner,bannerMark)}
  let weapon;
  if(enemy.template.bow){const points=[];for(let i=0;i<=10;i+=1){const a=-Math.PI/2+i/10*Math.PI;points.push([.32+Math.cos(a)*.28,Math.sin(a)*.45,0])}weapon=line(points,0x927c5d,.9);const string=line([[.32,-.45,0],[.32,.45,0]],0xc1b5a0,.6);weapon.position.z=string.position.z=.18;body.add(string)}
  else if(enemy.template.scythe){weapon=line([[.28,-.5,0],[.52,.62,0],[.2,.82,0]],0xa8977d,.95);weapon.position.z=.18}
  else if(enemy.template.polearm){weapon=line([[.3,-.5,0],[.62,.85,0]],0xa8977d,.95);weapon.position.z=.18}
  else if(enemy.template.staff||enemy.template.bishop){weapon=line([[.3,-.5,0],[.48,.72,0]],enemy.template.bishop?0x9a72aa:0x9a8468,.95);weapon.position.z=.18}
  else{weapon=line([[.3,-.42,0],[.58,.38,0]],enemy.template.armored?0x927451:0x8c8171,.9);weapon.position.z=.18}
  body.add(weapon);if(enemy.type==='giant'){const horns=line([[-.17,.47,0],[-.36,.75,0],[-.27,.65,0],[.17,.47,0],[.36,.75,0]],0x9e8d72,.9),bell=polygon([[-.26,.1],[.26,.1],[.34,-.34],[-.34,-.34]],0x6e5942,.82),clapper=circle(.055,flat(0xc3995f,.86),10);horns.position.z=.2;bell.position.set(0,-.07,.16);clapper.position.set(0,-.47,.18);body.add(horns,bell,clapper)}
  if(enemy.type==='ossuary'){const cage=ellipseLoop(.42,.46,0x8a7b68,.75,36),bars=new THREE.Group();[-.28,-.14,0,.14,.28].forEach((x,index)=>{const half=.3+Math.sin((index+1)/6*Math.PI)*.14,rib=line([[x,-half,0],[x,half,0]],0x8a7b68,.62);bars.add(rib)});cage.position.set(0,-.1,.15);bars.position.set(0,-.1,.16);const captiveSkulls=[[-.18,.02],[.17,-.14],[.08,.18]].map(([x,y])=>{const captive=circle(.07,flat(0xa79a88,.78),12);captive.position.set(x,y,.18);return captive});body.add(cage,bars,...captiveSkulls)}
  return{body,skull,weapon,legs};
}

export function createSkeletonVisual(enemy){
  const group=new THREE.Group();const shadow=ellipse(.62,.22,flat(0x000000,.4),24);shadow.position.set(0,-.72,-.1);const body=new THREE.Group(),artIndex=Math.max(0,enemyArtOrder.indexOf(enemy.type)),baseColumn=artIndex%4*2,baseRow=Math.floor(artIndex/4)*2,frameOffsets=[[0,0],[1,0],[0,1],[1,1]],baseGrade=enemyVisualGrades[enemy.type]||enemyVisualGrades.thrall,gradeColor=new THREE.Color(baseGrade.color);if(enemy.elite)gradeColor.lerp(new THREE.Color(enemy.affixColor),.16);const sprite=animatedAtlasPlane('/assets/undead-animation-v2.png',8,6,(frame)=>[baseColumn+frameOffsets[frame][0],baseRow+frameOffsets[frame][1]],enemy.template.phase?.72:1,{color:gradeColor,amount:baseGrade.amount+(enemy.elite?.025:0),lift:baseGrade.lift+(enemy.elite?.006:0)});sprite.scale.set(1.84,2.45,1);sprite.position.set(0,0,.14);body.add(sprite);group.add(shadow,body);
  const hp=makeBar(.88,0x9e2d33);hp.position.set(0,-1.18,.3);hp.visible=enemy.elite||enemy.type!=='thrall'&&enemy.type!=='hound';const ap=makeBar(.88,0x737eaa);ap.position.set(0,-1.28,.3);ap.visible=enemy.elite||enemy.template.ranged||enemy.template.aura||enemy.template.bishop||enemy.template.giant;const statusRing=ellipseLoop(.62,.44,0x8faac3,0,40);statusRing.position.set(0,-.27,.25);const shieldRing=ellipseLoop(.68,.49,0x91a7c8,0,44);shieldRing.position.set(0,-.27,.27);const eliteRing=ellipseLoop(.76,.54,enemy.affixColor,enemy.elite?.48:0,48);eliteRing.position.set(0,-.27,.23);const crown=new THREE.Group();
  if(enemy.elite){enemy.affixes.forEach((affix,index)=>{const mark=polygon([[0,.11],[.08,0],[0,-.11],[-.08,0]],affix.color,.92);mark.position.set((index-(enemy.affixes.length-1)/2)*.19,enemy.template.beast?.55:.88,.32);crown.add(mark)})}
  const baseScale=enemy.template.scale*(enemy.elite?1.04+enemy.affixes.length*.035:1);group.add(hp,ap,statusRing,shieldRing,eliteRing,crown);group.scale.setScalar(baseScale);
  const facingProfile=enemyFacingProfiles[enemy.type]||enemyFacingProfiles.thrall,inwardDirection=enemy.x>0?-1:1;
  group.userData={hp,ap,statusRing,shieldRing,eliteRing,crown,shadow,body,sprite,phase:Math.random()*8,baseScale,baseOpacity:enemy.template.phase?.72:1,facing:inwardDirection*facingProfile.native};prepareDepthSortedVisual(group);return group;
}

export function createTreasureVisual(){
  const group=new THREE.Group(),shadow=ellipse(.115,.033,flat(0x000000,.26),32),sprite=rigidAtlasPlane('/assets/reliquary-shine-atlas.png',2,2),pickTarget=plane(.76,.56,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
  shadow.position.set(0,-.085,-.12);sprite.scale.set(.425,.31875,1);sprite.position.set(0,.005,.42);pickTarget.position.set(0,.005,.76);group.add(shadow,sprite,pickTarget);group.userData={shadow,sprite,pickTarget};return group;
}

export function updateTreasureVisual(treasure,time=0){
  const group=treasure?.mesh;if(!group?.userData?.sprite)return;const state=group.userData,sequence=[0,1,2,3,2,1],frame=sequence[Math.floor(time*.0032+treasure.id*.83)%sequence.length],registration=[[-.024,.004],[.024,.004],[-.023,-.004],[.023,-.004]][frame];group.position.set(treasure.x,treasure.y,.3);group.scale.setScalar(1);group.renderOrder=-12000-Math.round(treasure.y*100);state.sprite.userData.setAnimationFrame(frame);state.sprite.position.set(registration[0],.005+registration[1],.42);state.sprite.material.uniforms.uTint.value.set(treasure.hovered?0xffe8c2:treasure.state==='claimed'?0xffd7a0:0xffffff);state.shadow.material.opacity=treasure.hovered?.34:.24;
}

export function disposeTreasureVisual(group){
  group?.traverse?.((child)=>{child.geometry?.dispose?.();if(child.material){const materials=Array.isArray(child.material)?child.material:[child.material];materials.forEach((material)=>material.dispose?.())}});
}

export function updateEntityVisual(entity,selected=false,time=0){
  if(!entity.mesh)return;entity.mesh.position.set(entity.x,entity.y,entity.kind==='hero'?.12:.08);setVisualDepth(entity.mesh,-10000-Math.round(entity.y*100));const ratio=Math.max(0,entity.hp/entity.maxHp);const hpBar=entity.mesh.userData.hp;setBarValue(hpBar,ratio);
  const speed=Math.hypot(entity.vx||0,entity.vy||0),motion=Math.min(1,speed/1.6),sprite=entity.mesh.userData.sprite,spriteUniforms=sprite?.userData?.spriteUniforms,phase=entity.visualPhase??entity.mesh.userData.phase??0,cadence=time*(entity.kind==='hero'?.0092:.0076)+phase,stride=Math.sin(cadence*Math.PI/2),previousVx=entity.mesh.userData.previousVx??entity.vx??0,acceleration=(entity.vx||0)-previousVx;entity.mesh.userData.previousVx=entity.vx||0;const facingProfile=entity.kind==='hero'?null:enemyFacingProfiles[entity.type]||enemyFacingProfiles.thrall,targetFacingX=entity.pendingTargetId!=null&&Number.isFinite(entity.pendingTargetX)?entity.pendingTargetX-entity.x:entity.visualTargetX,committedFacing=entity.kind==='enemy'&&entity.attackWindup>0&&Math.abs(targetFacingX||0)>.04,facingX=committedFacing?targetFacingX:Math.abs(entity.vx||0)>.04?entity.vx:targetFacingX;if(Math.abs(facingX||0)>.04){const direction=facingX<0?-1:1;entity.mesh.userData.facing=entity.kind==='hero'?direction:direction*facingProfile.native}const facing=entity.mesh.userData.facing??(entity.kind==='hero'?1:facingProfile.native),lean=Math.max(-1,Math.min(1,(entity.vx||0)*.28+acceleration*1.7));
  const action=entity.kind==='hero'?entity.mesh.userData.castPulse||0:entity.attackWindup>0?Math.min(1,.42+entity.attackWindup):0,gaitFrames=[1,0,2,0],frame=action>.16?3:motion>.075?gaitFrames[Math.floor(cadence)%gaitFrames.length]:0;sprite?.userData?.setAnimationFrame?.(frame);
  if(spriteUniforms){spriteUniforms.uTime.value=time*.001;spriteUniforms.uMotion.value=motion;spriteUniforms.uAction.value=action;spriteUniforms.uStride.value=stride;spriteUniforms.uLean.value=lean}
  if(entity.kind==='hero'){
    const apRatio=Math.max(0,entity.ap/entity.maxAp),apBar=entity.mesh.userData.ap,body=entity.mesh.userData.body;setBarValue(apBar,apRatio);hpBar.position.y=selected?-.78:-.78;apBar.position.y=selected?-.92:-.9;hpBar.scale.set(selected?1.04:1,selected?1.08:1,1);apBar.scale.set(selected?1.04:1,selected?1.08:1,1);setBarColors(hpBar,selected?0x6bb57f:0x4f9d67,selected?0x1d1711:0x050609);setBarColors(apBar,selected?0x98a3d2:0x7e89bd,selected?0x1d1711:0x050609);entity.mesh.userData.selectedWash.material.opacity=selected?.13:0;entity.mesh.userData.selectedBracket.material.opacity=selected?.78+Math.sin(time*.004+phase)*.1:0;body.scale.x=facing*(1+motion*Math.cos(cadence*Math.PI/2)*.018);body.scale.y=1+action*.028-motion*Math.abs(stride)*.012;body.rotation.z=-lean*facing*.028+stride*motion*.008;
    entity.mesh.position.y+=Math.sin(time*.0022+phase)*.012+Math.abs(stride)*motion*.026;entity.mesh.position.x+=Math.cos(cadence*Math.PI/2)*motion*.006;entity.mesh.userData.castPulse*=.91;entity.mesh.userData.shield.material.opacity=entity.shield>0?.18+Math.sin(time*.004)*.07:0;entity.mesh.userData.shield.rotation.z+=.006;const oathLight=entity.mesh.userData.oathLight,selectedSigil=entity.mesh.userData.selectedSigil,sigilOuter=entity.mesh.userData.sigilOuter,sigilInner=entity.mesh.userData.sigilInner,selectionBreath=.5+.5*Math.sin(time*.0028+phase);if(oathLight){oathLight.userData.radialUniforms.uOpacity.value=selected?.17+selectionBreath*.045:.05+Math.min(.03,action*.07);const lightScale=1+action*.18+selectionBreath*(selected?.045:.012);oathLight.scale.set(lightScale,lightScale,1)}if(selectedSigil){selectedSigil.visible=selected;if(selected){selectedSigil.rotation.z=time*.0002+Math.sin(time*.0007+phase)*.045;sigilOuter.material.opacity=.48+selectionBreath*.2;sigilInner.material.opacity=.2+selectionBreath*.12;selectedSigil.children.slice(2).forEach((tick,index)=>{tick.material.opacity=(index%2?.38:.65)+selectionBreath*.14})}}
    const riteHalo=entity.mesh.userData.riteHalo;if(riteHalo){const visible=Math.min(riteHalo.children.length,entity.traits?.length||0),radius=.58+Math.min(.18,visible*.022);riteHalo.children.forEach((mark,index)=>{mark.visible=index<visible;if(!mark.visible)return;const angle=time*.00072+mark.userData.phase;mark.position.x=Math.cos(angle)*radius;mark.position.y=Math.sin(angle)*radius*.72-.04;mark.rotation.z=-angle+Math.PI/4;mark.material.opacity=.48+Math.sin(time*.003+index)*.22});riteHalo.rotation.z=Math.sin(time*.0004+phase)*.08}const orbitKnives=entity.mesh.userData.orbitKnives,knifeCount=Math.min(orbitKnives.children.length,Math.max(0,entity.orbitCharges||0));orbitKnives.children.forEach((knife,index)=>{knife.visible=index<knifeCount;if(!knife.visible)return;const angle=time*.0028+phase+index/knifeCount*Math.PI*2,radius=1.2+Math.min(.18,knifeCount*.02);knife.position.x=Math.cos(angle)*radius;knife.position.y=Math.sin(angle)*radius*.7-.04;knife.position.z=.46+Math.sin(angle)*.08;knife.rotation.z=angle+Math.PI/2;knife.userData.setOpacity(.92+Math.sin(time*.005+index)*.07)});
  }else{
    const birthDuration=entity.visualBirthDuration??.68,birthAge=entity.visualBirthAge??birthDuration,birthT=Math.min(1,birthAge/birthDuration),reveal=1-Math.pow(1-birthT,3),baseScale=entity.mesh.userData.baseScale||1;entity.mesh.scale.setScalar(baseScale*(.7+reveal*.3));if(spriteUniforms)spriteUniforms.uOpacity.value=(entity.mesh.userData.baseOpacity||1)*(.08+reveal*.92);entity.mesh.userData.body.position.y=-(1-reveal)*.28;
    const winding=entity.attackWindup>0,body=entity.mesh.userData.body;body.scale.x=facing*(1+motion*Math.cos(cadence*Math.PI/2)*.014);body.scale.y=1+(winding?.025:0)-motion*Math.abs(stride)*.01;body.rotation.z=-lean*facing*.022+stride*motion*.006;entity.mesh.position.y+=Math.abs(stride)*Math.min(.034,speed*.024);entity.mesh.position.x+=Math.cos(cadence*Math.PI/2)*motion*.004;const apBar=entity.mesh.userData.ap;if(apBar){const apRatio=Math.max(0,entity.ap/entity.maxAp);setBarValue(apBar,apRatio);setBarColors(apBar,winding?0xd05b52:0x737eaa,0x16171b)}
    const status=entity.status;const ring=entity.mesh.userData.statusRing;if(status.burn>0){ring.material.color.set(0xc75c3e);ring.material.opacity=.42}else if(status.brittle>0){ring.material.color.set(0x8faac3);ring.material.opacity=.38}else if(status.curse>0){ring.material.color.set(0x9a5ca7);ring.material.opacity=.4}else ring.material.opacity=0;ring.rotation.z+=.01;const eliteRing=entity.mesh.userData.eliteRing;if(eliteRing){eliteRing.rotation.z+=.008;eliteRing.material.opacity=entity.elite?.34+Math.sin(time*.004+entity.mesh.userData.phase)*.14:0}const shieldRing=entity.mesh.userData.shieldRing;if(shieldRing){shieldRing.material.opacity=entity.shield>0?.2+Math.sin(time*.006)*.1:0;shieldRing.rotation.z-=.012}if(entity.mesh.userData.crown)entity.mesh.userData.crown.position.y=Math.sin(time*.004+entity.mesh.userData.phase)*.035;
  }
}

const clampOpacity=(value)=>Math.max(.12,Math.min(1,value));

const effectCells={slash:[0,0],impact:[4,0],projectile:[0,1],heal:[4,1],curse:[0,2],shockwave:[4,2],ritual:[0,3],beam:[4,3]};

function animatedEffect(kind='impact',color=0xffffff,opacity=1){
  const [baseColumn,row]=effectCells[kind]||effectCells.impact,source=atlasTexture('/assets/ability-effects-frames.png'),texture=source?new THREE.Texture():null;
  const material=new THREE.MeshBasicMaterial({map:null,color:0xffffff,transparent:true,opacity,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide});
  if(texture){texture.repeat.set(1/8,1/4);texture.offset.set(baseColumn/8,(3-row)/4);texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;const awaken=(loaded)=>{if(material.userData.disposed){texture.dispose();return}texture.image=loaded.image;texture.colorSpace=loaded.colorSpace;texture.minFilter=loaded.minFilter;texture.magFilter=loaded.magFilter;texture.anisotropy=loaded.anisotropy;texture.needsUpdate=true;material.map=texture;material.needsUpdate=true};if(source.userData.atlasReady)awaken(source);else source.userData.atlasReadyCallbacks.push(awaken)}
  const mesh=plane(1,1,material);mesh.userData.effectState={texture,material,baseColumn,row,tint:new THREE.Color(color)};mesh.renderOrder=5;return mesh;
}

function animateEffect(mesh,progress,opacity=1){const state=mesh?.userData?.effectState;if(!state)return;const frame=Math.min(3,Math.floor(Math.max(0,Math.min(.999,progress))*4));if(state.texture)state.texture.offset.x=(state.baseColumn+frame)/8;state.material.opacity=Math.max(0,opacity)}

export function createProjectile(scene,from,to,color,size=.09){
  const group=new THREE.Group(),core=polygon([[size*1.35,0],[0,size*.75],[-size*1.35,0],[0,-size*.75]],color,.98),glow=ellipse(size*2.9,size*1.55,flat(color,.14),18),trail=plane(size*5,size*.28,flat(color,.28)),vfx=animatedEffect('projectile',color,.9);trail.position.x=-size*2.6;vfx.scale.set(size*14,size*10,1);vfx.position.z=.04;vfx.rotation.z=-.2;group.add(glow,trail,vfx,core);group.position.set(from.x,from.y,.65);const start=new THREE.Vector2(from.x,from.y),end=new THREE.Vector2(to.x,to.y),angle=Math.atan2(to.y-from.y,to.x-from.x);group.rotation.z=angle;scene.add(group);return{mesh:group,age:0,duration:.2,update(dt){this.age+=dt;const t=Math.min(1,this.age/this.duration);group.position.x=THREE.MathUtils.lerp(start.x,end.x,t);group.position.y=THREE.MathUtils.lerp(start.y,end.y,t)+Math.sin(t*Math.PI)*.22;const swell=1+Math.sin(t*Math.PI)*1.15;group.scale.set(swell,swell,1);glow.material.opacity=.14*(1-t*.5);trail.material.opacity=.28*(1-t);animateEffect(vfx,t,.92-t*.25);return t>=1},destroy(){scene.remove(group);disposeObject(group)}};
}

export function createKnifeProjectile(scene,from,to,variant=0){
  const group=new THREE.Group(),knife=createOrbitKnife(variant),trail=plane(.9,.04,flat(0xc8c0b3,.25)),glint=plane(.34,.02,flat(0xf0e9db,.56));knife.scale.set(1.34,1.8,1);knife.position.z=.06;trail.position.set(-.72,0,.01);glint.position.set(.44,.015,.08);group.add(trail,knife,glint);group.position.set(from.x,from.y,.72);const start=new THREE.Vector2(from.x,from.y),end=new THREE.Vector2(to.x,to.y),angle=Math.atan2(to.y-from.y,to.x-from.x);group.rotation.z=angle;scene.add(group);return{mesh:group,age:0,duration:.19,update(dt){this.age+=dt;const t=Math.min(1,this.age/this.duration),arc=Math.sin(t*Math.PI);group.position.x=THREE.MathUtils.lerp(start.x,end.x,t);group.position.y=THREE.MathUtils.lerp(start.y,end.y,t)+arc*.12;group.scale.setScalar(1+arc*.16);knife.userData.setOpacity(1-t*.08);trail.scale.x=1+arc*.45;trail.material.opacity=.25*(1-t);glint.material.opacity=.56*(1-t);return t>=1},destroy(){scene.remove(group);disposeObject(group)}};
}

export function createBurst(scene,x,y,color,radius=1,style='impact'){const outer=ellipseLoop(.24,.18,color,.7,40);const inner=ellipseLoop(.16,.12,0xe8deca,.35,32);const group=new THREE.Group(),vfx=animatedEffect(style,color,.82);vfx.position.z=.04;group.add(vfx,outer,inner);group.position.set(x,y,.5);scene.add(group);return{mesh:group,age:0,duration:.42,update(dt){this.age+=dt;const t=Math.min(1,this.age/this.duration);outer.scale.setScalar(radius*t*4);inner.scale.setScalar(radius*t*2.8);vfx.scale.set(radius*(.55+t*1.7),radius*(.55+t*1.7),1);outer.material.opacity=.7*(1-t);inner.material.opacity=.35*(1-t);animateEffect(vfx,t,.82*(1-t*.55));group.rotation.z+=dt*1.5;return t>=1},destroy(){scene.remove(group);disposeObject(group)}}}

export function createSlashArc(scene,x,y,color,radius=1,arc=Math.PI){const geometry=new THREE.RingGeometry(radius*.52,radius*.66,48,1,-arc/2,arc);const material=flat(color,.82,{blending:THREE.AdditiveBlending}),arcMesh=new THREE.Mesh(geometry,material),vfx=animatedEffect('slash',color,.95),group=new THREE.Group();arcMesh.scale.y=.72;vfx.scale.set(radius*2.1,radius*1.55,1);vfx.position.z=.04;group.add(vfx,arcMesh);group.position.set(x,y,.72);group.rotation.z=Math.random()*Math.PI*2;scene.add(group);return{mesh:group,age:0,duration:.3,update(dt){this.age+=dt;const t=Math.min(1,this.age/this.duration);arcMesh.scale.x=.7+t*.65;arcMesh.scale.y=(.7+t*.65)*.72;vfx.scale.set(radius*(1.45+t*.8),radius*(1.08+t*.58),1);group.rotation.z+=dt*2.3;material.opacity=.82*(1-t);animateEffect(vfx,t,.96*(1-t*.45));return t>=1},destroy(){scene.remove(group);disposeObject(group)}}}

export function createParticleBurst(scene,x,y,color,count=12,radius=1,style='impact'){const group=new THREE.Group(),vfx=animatedEffect(style,color,.62);const particles=[];vfx.position.z=.74;vfx.scale.set(radius*1.65,radius*1.3,1);group.add(vfx);for(let i=0;i<count;i+=1){const particle=polygon([[0,.05],[.035,0],[0,-.05],[-.035,0]],color,.65+Math.random()*.3);const angle=Math.random()*Math.PI*2,speed=(.45+Math.random()*1.35)*radius;particle.position.z=.8;particle.userData={vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,vz:.3+Math.random()*.6,spin:(Math.random()-.5)*8};group.add(particle);particles.push(particle)}group.position.set(x,y,0);scene.add(group);return{age:0,duration:.65+.2*radius,update(dt){this.age+=dt;const t=Math.min(1,this.age/this.duration);animateEffect(vfx,t,.62*(1-t*.72));vfx.scale.multiplyScalar(1+dt*.4);particles.forEach((particle)=>{particle.position.x+=particle.userData.vx*dt;particle.position.y+=particle.userData.vy*dt;particle.position.z+=particle.userData.vz*dt;particle.userData.vy-=dt*.25;particle.rotation.z+=particle.userData.spin*dt;particle.material.opacity*=.95});return this.age>=this.duration},destroy(){scene.remove(group);disposeObject(group)}}}

export function createHitSpark(scene,x,y,color,scaleValue=1){const group=new THREE.Group(),vfx=animatedEffect('impact',color,.94);vfx.scale.setScalar(1.25*scaleValue);group.add(vfx);for(let i=0;i<5;i+=1){const angle=i/5*Math.PI*2;const ray=line([[0,0,0],[Math.cos(angle)*.45*scaleValue,Math.sin(angle)*.45*scaleValue,0]],color,.95);group.add(ray)}group.position.set(x,y,.9);scene.add(group);return{age:0,duration:.22,update(dt){this.age+=dt;const t=this.age/this.duration;group.scale.setScalar(1+t*.65);group.children.filter((child)=>child!==vfx).forEach((child)=>child.material.opacity=1-t);animateEffect(vfx,t,.94*(1-t*.5));return t>=1},destroy(){scene.remove(group);disposeObject(group)}}}

export function createBeam(scene,from,to,color,width=.3){const group=new THREE.Group();const dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy);const beam=plane(length,.055+width*.12,flat(color,.88,{blending:THREE.AdditiveBlending}));beam.position.x=length/2;const glow=plane(length,.22+width*.25,flat(color,.12,{blending:THREE.AdditiveBlending}));glow.position.x=length/2;const vfx=animatedEffect('beam',color,.82);vfx.rotation.z=-Math.PI/2;vfx.scale.set(.5+width*1.2,length,1);vfx.position.set(length/2,0,.04);group.add(glow,vfx,beam);group.position.set(from.x,from.y,.72);group.rotation.z=Math.atan2(dy,dx);scene.add(group);return{age:0,duration:.34+width*.2,update(dt){this.age+=dt;const t=this.age/this.duration;beam.material.opacity=.88*(1-t);glow.material.opacity=.12*(1-t);group.scale.y=1+Math.sin(t*Math.PI)*.7;animateEffect(vfx,t,.82*(1-t*.35));return t>=1},destroy(){scene.remove(group);disposeObject(group)}}}

export function createAfterimage(scene,x,y,color){const group=new THREE.Group(),ghost=polygon([[0,.55],[.42,-.48],[0,-.66],[-.42,-.48]],new THREE.Color(color),.28),vfx=animatedEffect('curse',color,.34);vfx.scale.set(1.25,1.25,1);group.add(vfx,ghost);group.position.set(x,y,.38);scene.add(group);return{age:0,duration:.42,update(dt){this.age+=dt;const t=this.age/this.duration;group.scale.setScalar(1+t*.35);ghost.material.opacity=.28*(1-t);animateEffect(vfx,t,.34*(1-t));return t>=1},destroy(){scene.remove(group);disposeObject(group)}}}

export function createGraveArrival(scene,x,y,color,scaleValue=1,elite=false){
  const group=new THREE.Group(),stain=ellipse(.74*scaleValue,.48*scaleValue,flat(0x050508,.42),48),outer=ellipseLoop(.72*scaleValue,.48*scaleValue,color,elite?.72:.48,64),inner=ellipseLoop(.46*scaleValue,.3*scaleValue,0xbcae99,elite?.42:.24,48),vfx=animatedEffect('curse',color,elite?.72:.5),splinters=[];stain.position.z=-.02;outer.position.z=inner.position.z=.02;vfx.scale.set(scaleValue*1.65,scaleValue*1.25,1);vfx.position.z=.04;[stain,outer,inner,vfx].forEach((object)=>object.renderOrder=-20000);group.add(stain,vfx,outer,inner);for(let index=0;index<8;index+=1){const angle=index/8*Math.PI*2+.2,mark=polygon([[0,.095],[.035,0],[0,-.095],[-.035,0]],index%3?0xbcae99:color,elite?.9:.68);mark.position.set(Math.cos(angle)*.42*scaleValue,Math.sin(angle)*.28*scaleValue,.08);mark.rotation.z=angle*.5;mark.renderOrder=6;mark.userData={angle,originX:mark.position.x,originY:mark.position.y,lift:.18+index%3*.055};group.add(mark);splinters.push(mark)}group.position.set(x,y,.16);scene.add(group);return{age:0,duration:elite?1.05:.82,update(dt){this.age+=dt;const t=Math.min(1,this.age/this.duration),arrival=1-Math.pow(1-t,3),fade=1-Math.max(0,(t-.48)/.52);stain.scale.setScalar(.62+arrival*.75);stain.material.opacity=.42*fade;outer.scale.setScalar(.58+arrival*.72);inner.scale.setScalar(.45+arrival*.86);outer.rotation.z+=dt*(elite?2.1:1.5);inner.rotation.z-=dt*2.6;outer.material.opacity=(elite?.72:.48)*fade;inner.material.opacity=(elite?.42:.24)*fade;animateEffect(vfx,t,(elite?.72:.5)*fade);vfx.scale.multiplyScalar(1+dt*.55);splinters.forEach((mark,index)=>{const drift=t*mark.userData.lift*scaleValue;mark.position.x=mark.userData.originX+Math.cos(mark.userData.angle)*drift;mark.position.y=mark.userData.originY+Math.sin(mark.userData.angle)*drift+t*.24*scaleValue;mark.rotation.z+=dt*(index%2?4.2:-3.4);mark.material.opacity=(elite?.9:.68)*fade});return t>=1},destroy(){scene.remove(group);disposeObject(group)}}
}

export function createZoneVisual(scene,zone){
  const group=new THREE.Group();const color=zone.color;const disc=ellipse(zone.radius,zone.radius*.76,flat(color,.045),64);const outer=ellipseLoop(zone.radius,zone.radius*.76,color,.45,72);const inner=ellipseLoop(zone.radius*.68,zone.radius*.52,color,.22,56),vfx=animatedEffect(zone.kind==='vortex'?'curse':'ritual',color,.26);vfx.scale.set(zone.radius*2.15,zone.radius*1.62,1);vfx.position.z=.025;group.add(disc,vfx,outer,inner);for(let i=0;i<8;i+=1){const a=i/8*Math.PI*2;const rune=line([[-.08,0,0],[0,.14,0],[.08,0,0]],color,.48);rune.position.set(Math.cos(a)*zone.radius*.82,Math.sin(a)*zone.radius*.62,.03);rune.rotation.z=a;group.add(rune)}group.position.set(zone.x,zone.y,-.02);group.traverse((object)=>{object.renderOrder=-20000});scene.add(group);let effectClock=0;return{update(dt,current){effectClock+=dt;group.position.set(current.x,current.y,-.02);group.rotation.z+=(current.kind==='vortex'?-.45:.12)*dt;outer.material.opacity=.28+Math.sin(performance.now()*.004)*.12;disc.material.opacity=current.kind==='sanctuary'?.055:current.kind==='vortex'?.07:.035;animateEffect(vfx,effectClock%1,.2+Math.sin(effectClock*3.2)*.065)},destroy(){scene.remove(group);disposeObject(group)}}
}

export function createTelegraph(scene,x,y,color,radius){const group=new THREE.Group();const ring=ellipseLoop(radius,radius*.76,color,.65,72);const cross1=line([[-radius,0,0],[radius,0,0]],color,.35);const cross2=line([[0,-radius*.76,0],[0,radius*.76,0]],color,.35),vfx=animatedEffect('shockwave',color,.38);vfx.scale.set(radius*2.15,radius*1.65,1);vfx.position.z=.03;group.add(vfx,ring,cross1,cross2);group.position.set(x,y,.22);scene.add(group);return{update(dt,action){const t=Math.max(0,action.timer/1.15),progress=1-Math.min(1,t);ring.scale.setScalar(.78+progress*.22);ring.material.opacity=.3+progress*.5;animateEffect(vfx,progress,.22+progress*.38);group.rotation.z+=dt*1.4},destroy(){scene.remove(group);disposeObject(group)}}}

export function createEnemyIntent(scene,enemy,target,color,duration,kind='melee'){
  const group=new THREE.Group(),ranged=kind==='ranged',cleave=kind==='cleave';let beam=null,glow=null,sourceMark=null,targetMark=null,accent=null;
  if(ranged){beam=plane(1,.025,flat(color,.12));glow=plane(1,.11,flat(color,.025));sourceMark=ellipseLoop(.28,.21,color,.24,32);targetMark=ellipseLoop(.48,.36,color,.42,40);accent=line([[0,-.22,0],[0,.22,0],[-.18,0,0],[.18,0,0]],0xe5ddce,.18);targetMark.add(accent);group.add(glow,beam,sourceMark,targetMark)}
  else if(cleave){const strikeRadius=enemy.range+1;sourceMark=new THREE.Mesh(new THREE.RingGeometry(strikeRadius*.76,strikeRadius*.84,64,1,-.18,Math.PI*1.34),flat(color,.24));targetMark=new THREE.Mesh(new THREE.RingGeometry(strikeRadius*.95,strikeRadius,64,1,Math.PI*1.48,Math.PI*.36),flat(0xc9bda8,.14));accent=line([[-strikeRadius*.82,-strikeRadius*.11,0],[-strikeRadius*.64,-strikeRadius*.3,0],[-strikeRadius*.4,-strikeRadius*.38,0]],color,.2);group.add(sourceMark,targetMark,accent)}
  else{beam=plane(1,.012,flat(color,.055));sourceMark=new THREE.Mesh(new THREE.RingGeometry(.43,.54,40,1,-.72,Math.PI*1.42),flat(color,.26));targetMark=line([[.13,-.18,0],[0,-.18,0],[0,.18,0],[.13,.18,0]],0xd9cdbb,.16);accent=line([[-.06,.48,0],[.17,.32,0]],color,.22);group.add(beam,sourceMark,targetMark,accent)}
  group.position.z=.36;scene.add(group);let age=0,cancelled=false;return{cancel(){cancelled=true},update(dt){if(cancelled)return true;age+=dt;const dx=target.x-enemy.x,dy=target.y-enemy.y,length=Math.max(.1,Math.hypot(dx,dy)),t=Math.min(1,age/duration),finale=THREE.MathUtils.smoothstep(t,.78,1),pulse=.82+Math.sin(t*Math.PI*5)*.08*finale;group.position.x=enemy.x;group.position.y=enemy.y;group.rotation.z=Math.atan2(dy,dx);if(ranged){beam.scale.x=glow.scale.x=length;beam.position.x=glow.position.x=length/2;targetMark.position.x=length;targetMark.scale.setScalar((1.28-t*.58)*pulse);sourceMark.scale.setScalar(.85+t*.15);beam.material.opacity=.09+finale*.62;glow.material.opacity=.018+finale*.16;sourceMark.material.opacity=.16+finale*.55;targetMark.material.opacity=.27+finale*.66;accent.material.opacity=.12+finale*.74;targetMark.rotation.z-=dt*(1.1+finale*5)}else if(cleave){const gather=1.12-t*.12;sourceMark.scale.setScalar(gather);targetMark.scale.setScalar(gather);sourceMark.material.opacity=.18+finale*.68;targetMark.material.opacity=.1+finale*.52;accent.material.opacity=.14+finale*.7;sourceMark.rotation.z+=dt*(.35+finale*2.5);targetMark.rotation.z-=dt*(.25+finale*1.7)}else{const gather=1.08-t*.22;beam.scale.x=length;beam.position.x=length/2;targetMark.position.x=length;beam.material.opacity=.035+finale*.18;sourceMark.scale.setScalar(gather);sourceMark.material.opacity=.18+finale*.72;targetMark.material.opacity=.1+finale*.68;accent.material.opacity=.14+finale*.74;sourceMark.rotation.z+=dt*(.45+finale*3.6)}return age>=duration+.06},destroy(){scene.remove(group);disposeObject(group)}};
}

export function createCorpseDecal(scene,x,y,type){
  const group=new THREE.Group(),sprite=rigidAtlasPlane('/assets/undead-remains-atlas.png',4,3),index=Math.max(0,enemyArtOrder.indexOf(type)),large=type==='giant'||type==='ossuary',small=type==='hound',baseX=large?2.55:small?1.45:1.85,baseY=large?1.92:small?1.08:1.39,stain=ellipse((large?1.05:small?.58:.78),(large?.35:small?.18:.26),flat(0x050507,0),36),collapse=animatedEffect('impact',0xb8aa95,.38),dustGroup=new THREE.Group(),splinters=[],splinterCount=large?6:small?3:4;
  sprite.userData.setAnimationFrame(index);sprite.userData.setOpacity(0);sprite.scale.set(baseX*.82,baseY*.5,1);sprite.position.y=.14;stain.position.z=-.04;collapse.scale.set(large?2.15:small?1.1:1.55,large?1.45:small?.72:1.02,1);collapse.position.z=.06;stain.renderOrder=sprite.renderOrder=-20000;collapse.renderOrder=-9000;
  for(let shard=0;shard<splinterCount;shard+=1){const angle=shard/splinterCount*Math.PI*2+.18,mark=polygon([[0,.075],[.026,0],[0,-.075],[-.026,0]],shard%2?0xb8aa95:0x73695e,.66);mark.position.set(Math.cos(angle)*.18,Math.sin(angle)*.12,.1);mark.rotation.z=angle*.7;mark.renderOrder=-8999;mark.userData={angle,originX:mark.position.x,originY:mark.position.y};dustGroup.add(mark);splinters.push(mark)}
  group.add(stain,sprite,collapse,dustGroup);group.rotation.z=(Math.random()-.5)*.36;group.position.set(x,y,-.66);scene.add(group);
  return{age:0,duration:18,update(dt){this.age+=dt;const settle=Math.min(1,this.age/.32),ease=1-Math.pow(1-settle,3);sprite.userData.setOpacity(this.age<=14?ease:Math.max(0,1-(this.age-14)/4));sprite.scale.set(baseX*(.82+ease*.18),baseY*(.5+ease*.5),1);sprite.position.y=.14*(1-ease);stain.material.opacity=.1*ease*(this.age<=14?1:Math.max(0,1-(this.age-14)/4));stain.scale.setScalar(.7+ease*.3);if(this.age<.64){const dustT=Math.min(1,this.age/.62);animateEffect(collapse,Math.min(.999,this.age/.48),.38*(1-dustT));collapse.scale.multiplyScalar(1+dt*.42);splinters.forEach((mark,shard)=>{const travel=dustT*(large?.42:small?.2:.3);mark.position.x=mark.userData.originX+Math.cos(mark.userData.angle)*travel;mark.position.y=mark.userData.originY+Math.sin(mark.userData.angle)*travel+dustT*.16;mark.rotation.z+=dt*(shard%2?4.4:-3.8);mark.material.opacity=.66*(1-dustT)})}else if(collapse.visible){collapse.visible=false;dustGroup.visible=false}return this.age>=this.duration},destroy(){scene.remove(group);disposeObject(group)}}
}

const floatingTextStyles={
  damage:{canvas:[176,84],font:'700 38px Georgia',scaleY:.46,height:.3,duration:.46,drift:.7,swell:.08},
  critical:{canvas:[240,96],font:'700 43px Georgia',scaleY:.64,height:.42,duration:.68,drift:.78,swell:.2},
  wound:{canvas:[190,88],font:'700 39px Georgia',scaleY:.5,height:.33,duration:.58,drift:.68,swell:.12},
  heal:{canvas:[204,88],font:'700 37px Georgia',scaleY:.52,height:.38,duration:.66,drift:.62,swell:.1},
  ward:{canvas:[244,88],font:'700 34px Georgia',scaleY:.52,height:.34,duration:.6,drift:.58,swell:.08},
  system:{canvas:[360,112],font:'600 39px Georgia',scaleY:.76,height:.46,duration:.72,drift:.9,swell:.25}
};

export function createFloatingText(scene,text,x,y,color='#e8deca',kind='system',lane=0){
  const style=floatingTextStyles[kind]||floatingTextStyles.system,canvas=document.createElement('canvas');canvas.width=style.canvas[0];canvas.height=style.canvas[1];const ctx=canvas.getContext('2d'),centerX=canvas.width/2,baseline=canvas.height*.6;ctx.font=style.font;ctx.textAlign='center';ctx.lineJoin='round';ctx.lineWidth=kind==='system'?5:4;ctx.strokeStyle='rgba(3,4,7,.9)';ctx.shadowColor='rgba(0,0,0,.95)';ctx.shadowBlur=kind==='system'?9:6;ctx.strokeText?.(text,centerX,baseline);ctx.fillStyle=color;ctx.fillText(text,centerX,baseline);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}),sprite=new THREE.Sprite(material),baseScaleX=style.scaleY*canvas.width/canvas.height,baseX=x+lane*.13;sprite.scale.set(baseScaleX,style.scaleY,1);sprite.position.set(baseX,y+style.height,2);sprite.renderOrder=32000;scene.add(sprite);return{age:0,duration:style.duration,update(dt){this.age+=dt;const t=Math.min(1,this.age/this.duration),rise=1-Math.pow(1-t,2),fade=1-THREE.MathUtils.smoothstep(t,.38,1);sprite.position.y=y+style.height+rise*style.drift;sprite.position.x=baseX+lane*Math.sin(t*Math.PI)*.07;material.opacity=fade;sprite.scale.x=baseScaleX+Math.sin(t*Math.PI)*style.swell;return t>=1},destroy(){scene.remove(sprite);texture.dispose();material.dispose()}};
}
