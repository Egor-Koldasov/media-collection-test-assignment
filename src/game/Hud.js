import * as THREE from 'three';
import { ABILITY_TEMPLATES, OATHBOUND_ORIGINS } from './catalog.js';

const abilityIndexes=new Map(ABILITY_TEMPLATES.map((ability,index)=>[ability.id,index]));
const originIndexes=new Map(OATHBOUND_ORIGINS.map((origin,index)=>[origin.id,index]));
const romanValues=['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const hex=(value,fallback='#d5a25c')=>Number.isFinite(Number(value))?`#${Number(value).toString(16).padStart(6,'0')}`:fallback;
const stripMarkup=(value='')=>String(value).replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').trim();
const formatTime=(seconds)=>{const value=Math.max(0,Math.ceil(seconds||0));return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`};
const roman=(value)=>romanValues[value]||String(value);
const bellName=(bell)=>bell<=3?'THE WAKING':bell<=7?'THE MUSTER':bell<=11?'THE PRESS':bell<=15?'THE DARKENING':bell<=19?'THE LAST VIGIL':'THE TWENTIETH BELL';

function imageAsset(path,onReady){
  const image=new Image();image.decoding='async';image.onload=onReady;image.src=path;return image;
}

function shardPath(ctx,x,y,width,height,cut=12){
  ctx.beginPath();ctx.moveTo(x+cut,y);ctx.lineTo(x+width-cut*.45,y);ctx.lineTo(x+width,y+cut*.7);ctx.lineTo(x+width,y+height-cut);ctx.lineTo(x+width-cut,y+height);ctx.lineTo(x+cut*.55,y+height);ctx.lineTo(x,y+height-cut*.65);ctx.lineTo(x,y+cut);ctx.closePath();
}

function ribbonPath(ctx,x,y,width,height,tail=11){
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+width-tail,y);ctx.lineTo(x+width,y+height/2);ctx.lineTo(x+width-tail,y+height);ctx.lineTo(x,y+height);ctx.lineTo(x+tail*.55,y+height/2);ctx.closePath();
}

function drawAtlasCell(ctx,image,index,columns,rows,x,y,width,height,fit='cover'){
  if(!image?.complete||!image.naturalWidth)return;
  const cellWidth=image.naturalWidth/columns,cellHeight=image.naturalHeight/rows,column=index%columns,row=Math.floor(index/columns),sourceAspect=cellWidth/cellHeight,targetAspect=width/height;
  let sx=column*cellWidth,sy=row*cellHeight,sw=cellWidth,sh=cellHeight;
  if(fit==='cover'){
    if(sourceAspect>targetAspect){sw=cellHeight*targetAspect;sx+=((cellWidth-sw)/2)}else{sh=cellWidth/targetAspect;sy+=((cellHeight-sh)/2)}
  }
  ctx.drawImage(image,sx,sy,sw,sh,x,y,width,height);
}

function fitText(ctx,text,maxWidth){
  const value=String(text||'');if(ctx.measureText(value).width<=maxWidth)return value;let end=value.length;while(end>1&&ctx.measureText(`${value.slice(0,end)}…`).width>maxWidth)end-=1;return `${value.slice(0,end)}…`;
}

function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines=2){
  const words=String(text||'').split(/\s+/);let line='',lineIndex=0;
  for(let index=0;index<words.length;index+=1){const test=line?`${line} ${words[index]}`:words[index];if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,x,y+lineIndex*lineHeight);lineIndex+=1;line=words[index];if(lineIndex>=maxLines){if(index<words.length-1)ctx.fillText(fitText(ctx,`${line} ${words.slice(index+1).join(' ')}`,maxWidth),x,y+lineIndex*lineHeight);return lineIndex+1}}else line=test}
  if(line&&lineIndex<maxLines)ctx.fillText(line,x,y+lineIndex*lineHeight);return lineIndex+1;
}

function drawBar(ctx,x,y,width,height,ratio,color,background='rgba(4,5,8,.82)'){
  ctx.fillStyle=background;ctx.fillRect(x,y,width,height);ctx.fillStyle=color;ctx.fillRect(x+1,y+1,Math.max(0,(width-2)*clamp(ratio,0,1)),Math.max(1,height-2));ctx.fillStyle='rgba(244,231,207,.34)';ctx.fillRect(x,y,width,1);
}

export class WebGLHud {
  constructor(renderer,canvas,onAction=()=>{}){
    this.renderer=renderer;this.canvas=canvas;this.onAction=onAction;this.width=1;this.height=1;this.pixelRatio=1;this.snapshot=null;this.feedItems=[];this.hitRegions=[];this.hovered=null;this.pressed=null;this.debug=false;this.dirty=true;this.lastDraw=0;this.fps=60;this.lastFrame=performance.now();this.banner=null;this.bannerUntil=0;
    this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-.5,.5,.5,-.5,0,2);this.camera.position.z=1;this.overlayCanvas=document.createElement('canvas');this.context=this.overlayCanvas.getContext('2d',{alpha:true});this.texture=this.createTexture();this.material=new THREE.MeshBasicMaterial({map:this.texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),this.material);this.mesh.frustumCulled=false;this.mesh.renderOrder=100000;this.scene.add(this.mesh);
    const awaken=()=>{this.dirty=true};this.images={roster:imageAsset('/assets/oathbound-roster.png',awaken),abilities:imageAsset('/assets/ability-codex-atlas.png',awaken),origins:imageAsset('/assets/origin-relic-atlas.png',awaken)};
    this.boundMove=(event)=>this.handlePointerMove(event);this.boundDown=(event)=>this.handlePointerDown(event);this.boundUp=(event)=>this.handlePointerUp(event);this.boundLeave=()=>this.handlePointerLeave();canvas.addEventListener('pointermove',this.boundMove);canvas.addEventListener('pointerdown',this.boundDown);canvas.addEventListener('pointerup',this.boundUp);canvas.addEventListener('pointerleave',this.boundLeave);
  }

  destroy(){this.canvas.removeEventListener('pointermove',this.boundMove);this.canvas.removeEventListener('pointerdown',this.boundDown);this.canvas.removeEventListener('pointerup',this.boundUp);this.canvas.removeEventListener('pointerleave',this.boundLeave);this.mesh.geometry.dispose();this.material.dispose();this.texture.dispose()}

  createTexture(){const texture=new THREE.CanvasTexture(this.overlayCanvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;return texture}

  resize(width,height,pixelRatio=1){
    this.width=Math.max(1,width);this.height=Math.max(1,height);this.pixelRatio=clamp(pixelRatio,1,2);const textureWidth=Math.round(this.width*this.pixelRatio),textureHeight=Math.round(this.height*this.pixelRatio);if(this.overlayCanvas.width!==textureWidth||this.overlayCanvas.height!==textureHeight){const previous=this.texture;this.overlayCanvas.width=textureWidth;this.overlayCanvas.height=textureHeight;this.texture=this.createTexture();if(this.material)this.material.map=this.texture;previous?.dispose()}this.dirty=true;
  }

  addFeed(message,important=false){const text=stripMarkup(message);if(!text)return;this.feedItems.unshift({text,important,created:performance.now()});this.feedItems=this.feedItems.slice(0,5);this.dirty=true}
  announce(entry,duration=7000){if(!entry)return;this.banner={sigil:entry.sigil||'◆',title:entry.title||entry.name||'THE BELL ANSWERS',omen:entry.omen||entry.text||''};this.bannerUntil=performance.now()+duration;this.dirty=true}
  toggleDebug(force){this.debug=typeof force==='boolean'?force:!this.debug;this.dirty=true;return this.debug}

  clientPoint(event){const rect=this.canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)/rect.width*this.width,y:(event.clientY-rect.top)/rect.height*this.height}}
  hitAt(x,y){for(let index=this.hitRegions.length-1;index>=0;index-=1){const hit=this.hitRegions[index];if(x>=hit.x&&x<=hit.x+hit.width&&y>=hit.y&&y<=hit.y+hit.height)return hit}return null}
  hasHitAtClient(clientX,clientY){const rect=this.canvas.getBoundingClientRect(),x=(clientX-rect.left)/rect.width*this.width,y=(clientY-rect.top)/rect.height*this.height;return Boolean(this.hitAt(x,y))}
  handlePointerMove(event){const point=this.clientPoint(event),hit=this.hitAt(point.x,point.y),key=hit?.key||null;if(key!==this.hovered?.key){this.hovered=hit;this.dirty=true}if(hit){this.canvas.style.cursor=hit.cursor||'pointer';event.stopImmediatePropagation()}else if(this.canvas.style.cursor==='pointer'||this.canvas.style.cursor==='help')this.canvas.style.cursor=''}
  handlePointerDown(event){const point=this.clientPoint(event),hit=this.hitAt(point.x,point.y);if(!hit)return;this.pressed={key:hit.key,x:point.x,y:point.y};event.preventDefault();event.stopImmediatePropagation()}
  handlePointerUp(event){if(!this.pressed)return;const point=this.clientPoint(event),hit=this.hitAt(point.x,point.y),travel=Math.hypot(point.x-this.pressed.x,point.y-this.pressed.y),matches=hit&&hit.key===this.pressed.key;this.pressed=null;if(matches&&travel<8){this.onAction(hit.action,hit.payload);this.dirty=true}event.preventDefault();event.stopImmediatePropagation()}
  handlePointerLeave(){this.hovered=null;this.pressed=null;this.dirty=true}
  addHit(key,action,payload,x,y,width,height,cursor='pointer'){this.hitRegions.push({key,action,payload,x,y,width,height,cursor})}

  render(snapshot,time,stats={}){
    this.snapshot=snapshot||this.snapshot;const now=performance.now(),frameDelta=Math.max(1,now-this.lastFrame);this.lastFrame=now;this.fps=this.fps*.9+(1000/frameDelta)*.1;
    if(!this.snapshot)return;const mustAnimate=this.snapshot.paused||this.bannerUntil>now||this.hovered||this.debug;if(this.dirty||now-this.lastDraw>(mustAnimate?45:90)){this.draw(time,stats);this.lastDraw=now;this.dirty=false;this.texture.needsUpdate=true}
    this.renderer.autoClear=false;this.renderer.clearDepth();this.renderer.render(this.scene,this.camera);this.renderer.autoClear=true;
  }

  draw(time,stats){
    const ctx=this.context,ratio=this.pixelRatio,width=this.width,height=this.height,snapshot=this.snapshot;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';this.hitRegions=[];
    this.drawAtmosphere(ctx,width,height);this.drawHeader(ctx,snapshot,width,height,time,stats);this.drawCompany(ctx,snapshot,width,height,time);this.drawLaws(ctx,snapshot,width,height);this.drawFeed(ctx,width,height);this.drawCameraControls(ctx,width,height,stats);if(this.bannerUntil>performance.now())this.drawBanner(ctx,width,height,time);if(snapshot.paused)this.drawPauseSeal(ctx,width,height,time);if(this.debug)this.drawDebug(ctx,snapshot,width,height,stats);if(this.hovered?.action==='ability')this.drawAbilityInspector(ctx,this.hovered.payload,width,height);this.drawHoverHint(ctx,width,height);
  }

  drawAtmosphere(ctx,width,height){
    const top=ctx.createLinearGradient(0,0,0,126);top.addColorStop(0,'rgba(3,4,7,.96)');top.addColorStop(.48,'rgba(3,4,7,.58)');top.addColorStop(1,'rgba(3,4,7,0)');ctx.fillStyle=top;ctx.fillRect(0,0,width,130);
    const bottom=ctx.createLinearGradient(0,height-190,0,height);bottom.addColorStop(0,'rgba(3,4,7,0)');bottom.addColorStop(.52,'rgba(3,4,7,.44)');bottom.addColorStop(1,'rgba(3,4,7,.94)');ctx.fillStyle=bottom;ctx.fillRect(0,height-190,width,190);
    const right=ctx.createLinearGradient(width-Math.min(420,width*.42),0,width,0);right.addColorStop(0,'rgba(3,4,7,0)');right.addColorStop(.28,'rgba(3,4,7,.2)');right.addColorStop(1,'rgba(3,4,7,.94)');ctx.fillStyle=right;ctx.fillRect(width-Math.min(430,width*.44),80,Math.min(430,width*.44),height-80);
    ctx.strokeStyle='rgba(214,166,95,.18)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(18,80);ctx.lineTo(width-18,80);ctx.stroke();ctx.fillStyle='rgba(195,59,66,.7)';ctx.fillRect(18,79,56,2);
  }

  drawHeader(ctx,snapshot,width,height,time,stats){
    const compact=width<960;
    ctx.save();ctx.fillStyle='#cf4e52';ctx.font='600 10px Georgia';ctx.letterSpacing='3px';ctx.fillText('A SURVIVAL RITUAL',26,25);ctx.fillStyle='#eee5d4';ctx.font=compact?'600 22px Georgia':'600 29px Georgia';ctx.letterSpacing='0px';ctx.fillText(compact?'TWENTIETH BELL':'The Twentieth Bell',26,compact?50:55);
    ctx.strokeStyle='rgba(213,162,92,.72)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(15,20);ctx.lineTo(21,31);ctx.lineTo(15,42);ctx.lineTo(9,31);ctx.closePath();ctx.stroke();ctx.fillStyle='rgba(213,162,92,.2)';ctx.fill();ctx.restore();
    const centerX=width/2,clockY=43,radius=compact?26:31,progress=clamp(snapshot.progress||0,0,1);ctx.save();ctx.lineWidth=1;ctx.strokeStyle='rgba(232,222,202,.17)';ctx.beginPath();ctx.arc(centerX,clockY,radius,0,Math.PI*2);ctx.stroke();ctx.lineWidth=2.5;ctx.strokeStyle='#d75253';ctx.beginPath();ctx.arc(centerX,clockY,radius,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);ctx.stroke();ctx.fillStyle='#f1e8d7';ctx.textAlign='center';ctx.font=`600 ${compact?21:25}px Georgia`;ctx.fillText(formatTime(snapshot.remaining),centerX,clockY+7);ctx.fillStyle='#b6a991';ctx.font='600 9px Georgia';ctx.letterSpacing='2px';ctx.fillText(`BELL ${roman(snapshot.bell)} · ${bellName(snapshot.bell)}`,centerX,clockY+radius+16);ctx.restore();
    const right=width-24,buttonSize=compact?31:36,gap=7,labels=[['archive','ARCHIVE','▧'],['sound','SOUND',stats.audioEnabled===false?'×':'♪'],['debug','DEBUG','δ'],['pause',snapshot.paused?'RESUME':'PAUSE',snapshot.paused?'▶':'Ⅱ']];let x=right-labels.length*(buttonSize+gap)+gap;
    labels.forEach(([action,label,sigil])=>{const hovered=this.hovered?.action===action;ctx.save();shardPath(ctx,x,17,buttonSize,buttonSize,7);ctx.fillStyle=hovered?'rgba(109,42,44,.86)':'rgba(10,11,15,.66)';ctx.fill();ctx.strokeStyle=hovered?'rgba(228,184,110,.8)':'rgba(232,222,202,.2)';ctx.stroke();ctx.fillStyle=hovered?'#f0d7aa':'#c7bead';ctx.textAlign='center';ctx.font=`${action==='debug'?'italic ':''}600 ${action==='archive'?17:15}px Georgia`;ctx.fillText(sigil,x+buttonSize/2,17+buttonSize/2+5);ctx.restore();this.addHit(`header-${action}`,action,null,x,17,buttonSize,buttonSize);x+=buttonSize+gap});
    ctx.fillStyle='#c7b99f';ctx.textAlign='right';ctx.font='600 10px Georgia';ctx.letterSpacing='1.8px';ctx.fillText(`${snapshot.kills} REMAINS`,right,69);ctx.letterSpacing='0px';
    ctx.fillStyle='#a99d88';ctx.textAlign='left';ctx.font='600 9px Georgia';ctx.letterSpacing='1.6px';ctx.fillText('GRAVE PRESSURE',26,75);for(let index=0;index<7;index+=1){const lit=index<snapshot.threat;ctx.fillStyle=lit?'#d54f54':'rgba(232,222,202,.13)';ctx.beginPath();ctx.moveTo(26+index*14,82);ctx.lineTo(35+index*14,82);ctx.lineTo(32+index*14,87);ctx.lineTo(23+index*14,87);ctx.closePath();ctx.fill()}
  }

  drawCompany(ctx,snapshot,width,height,time){
    const units=snapshot.units||[],living=units.filter((unit)=>unit.alive),selected=units.find((unit)=>unit.id===snapshot.selectedId)||living[0],compact=width<1100||height<700,panelWidth=compact?250:318,panelX=width-panelWidth-18,panelY=96,panelBottom=height-22,panelHeight=panelBottom-panelY;
    ctx.save();const wash=ctx.createLinearGradient(panelX,0,panelX+panelWidth,0);wash.addColorStop(0,'rgba(8,9,13,.05)');wash.addColorStop(.16,'rgba(8,9,13,.7)');wash.addColorStop(1,'rgba(7,8,11,.92)');ctx.fillStyle=wash;ctx.fillRect(panelX-30,panelY-12,panelWidth+48,panelHeight+20);ctx.strokeStyle='rgba(215,166,92,.22)';ctx.beginPath();ctx.moveTo(panelX+5,panelY);ctx.lineTo(panelX+panelWidth,panelY);ctx.moveTo(panelX+panelWidth,panelY);ctx.lineTo(panelX+panelWidth,panelBottom);ctx.stroke();
    ctx.fillStyle='#d34d52';ctx.font='600 9px Georgia';ctx.letterSpacing='3px';ctx.fillText('THE OATHBOUND',panelX+12,panelY+14);ctx.fillStyle='#efe4d1';ctx.font=`600 ${compact?19:23}px Georgia`;ctx.letterSpacing='0';ctx.fillText('Last Company',panelX+12,panelY+38);ctx.textAlign='right';ctx.fillStyle='rgba(211,73,78,.92)';ctx.font='600 13px Georgia';ctx.fillText(`${living.length}`,panelX+panelWidth-10,panelY+28);ctx.textAlign='left';
    let y=panelY+51,rowHeight=compact?47:56;units.slice(0,6).forEach((unit,index)=>{const isSelected=unit.id===snapshot.selectedId,hovered=this.hovered?.key===`unit-${unit.id}`,rowX=panelX+5,rowWidth=panelWidth-10;ctx.save();if(isSelected||hovered){ribbonPath(ctx,rowX,y,rowWidth,rowHeight,13);ctx.fillStyle=isSelected?'rgba(115,45,47,.4)':'rgba(213,162,92,.11)';ctx.fill();ctx.strokeStyle=isSelected?'rgba(225,173,96,.64)':'rgba(232,222,202,.2)';ctx.stroke()}if(!unit.alive)ctx.globalAlpha=.36;const portraitSize=rowHeight-8;ctx.save();shardPath(ctx,rowX+4,y+4,portraitSize,portraitSize,7);ctx.clip();drawAtlasCell(ctx,this.images.roster,unit.portrait||0,5,1,rowX+4,y+4,portraitSize,portraitSize,'cover');const portraitFade=ctx.createLinearGradient(0,y,0,y+rowHeight);portraitFade.addColorStop(.35,'rgba(0,0,0,0)');portraitFade.addColorStop(1,'rgba(0,0,0,.76)');ctx.fillStyle=portraitFade;ctx.fillRect(rowX+4,y+4,portraitSize,portraitSize);ctx.restore();ctx.fillStyle=unit.alive?'#e7ddcb':'#887e70';ctx.font=`600 ${compact?11:12}px Georgia`;ctx.fillText(fitText(ctx,unit.name,rowWidth-portraitSize-28),rowX+portraitSize+11,y+16);ctx.fillStyle='#a99b85';ctx.font='600 8px Georgia';ctx.letterSpacing='1.1px';ctx.fillText(String(unit.archetype||'OATHBOUND').toUpperCase(),rowX+portraitSize+11,y+29);ctx.letterSpacing='0';drawBar(ctx,rowX+portraitSize+11,y+35,rowWidth-portraitSize-24,4,unit.hp/unit.maxHp,'#589b6a');drawBar(ctx,rowX+portraitSize+11,y+42,rowWidth-portraitSize-24,3,unit.ap/unit.maxAp,'#7f8db8');if(isSelected){ctx.fillStyle='#e0ad64';ctx.beginPath();ctx.moveTo(rowX+1,y+rowHeight/2);ctx.lineTo(rowX-5,y+rowHeight/2-5);ctx.lineTo(rowX-5,y+rowHeight/2+5);ctx.closePath();ctx.fill()}ctx.restore();if(unit.alive)this.addHit(`unit-${unit.id}`,'selectUnit',unit.id,rowX,y,rowWidth,rowHeight);y+=rowHeight+4});
    if(selected){const dossierY=y+4,available=panelBottom-dossierY,abilityHeight=compact?61:78,dossierHeight=Math.max(60,Math.min(compact?82:110,available-abilityHeight-48));ctx.strokeStyle='rgba(213,162,92,.18)';ctx.beginPath();ctx.moveTo(panelX+10,dossierY);ctx.lineTo(panelX+panelWidth-6,dossierY);ctx.stroke();ctx.fillStyle=hex(selected.color);ctx.font='600 9px Georgia';ctx.letterSpacing='1.7px';ctx.fillText(`${String(selected.role||'OATHBOUND').toUpperCase()} · ${Number(selected.moveSpeed||0).toFixed(1)} STRIDE`,panelX+12,dossierY+16);ctx.fillStyle='#e0ad64';ctx.font='italic 600 13px Georgia';ctx.letterSpacing='0';ctx.fillText(fitText(ctx,selected.aiState||'Reading the field',panelWidth-30),panelX+12,dossierY+34);ctx.fillStyle='#a99d88';ctx.font='10px Georgia';wrapText(ctx,selected.doctrine||'',panelX+12,dossierY+49,panelWidth-28,12,compact?1:2);
      if(!compact){const originY=dossierY+dossierHeight-32,index=originIndexes.get(selected.originId)||0;ctx.save();ctx.globalAlpha=.92;drawAtlasCell(ctx,this.images.origins,index,4,3,panelX+12,originY,28,28,'contain');ctx.restore();ctx.fillStyle='#8f8270';ctx.font='600 8px Georgia';ctx.letterSpacing='1.3px';ctx.fillText('INHERITED ORIGIN',panelX+46,originY+10);ctx.fillStyle='#d0c4b1';ctx.font='11px Georgia';ctx.letterSpacing='0';ctx.fillText(fitText(ctx,selected.origin||'',panelWidth-68),panelX+46,originY+25)}
      const abilityY=dossierY+dossierHeight+8,abilities=selected.abilities||[],gap=6,cardWidth=Math.min(compact?58:72,(panelWidth-24-gap*Math.max(0,abilities.length-1))/Math.max(1,abilities.length)),cardHeight=abilityHeight;ctx.fillStyle='#a99d88';ctx.font='600 8px Georgia';ctx.letterSpacing='1.7px';ctx.fillText('AUTOMATIC LITANY',panelX+12,abilityY-7);abilities.forEach((ability,index)=>{const x=panelX+12+index*(cardWidth+gap),isCurrent=index===selected.abilityCursor,hovered=this.hovered?.key===`ability-${selected.id}-${index}`;ctx.save();shardPath(ctx,x,abilityY,cardWidth,cardHeight,8);ctx.fillStyle=isCurrent?'rgba(116,43,46,.5)':'rgba(7,8,11,.82)';ctx.fill();ctx.strokeStyle=hovered?'rgba(237,190,112,.85)':isCurrent?'rgba(213,162,92,.58)':'rgba(232,222,202,.16)';ctx.stroke();ctx.save();shardPath(ctx,x+2,abilityY+2,cardWidth-4,cardHeight-4,7);ctx.clip();drawAtlasCell(ctx,this.images.abilities,ability.artIndex??abilityIndexes.get(ability.id)??0,6,4,x+2,abilityY+2,cardWidth-4,cardHeight-4,'cover');const shade=ctx.createLinearGradient(0,abilityY+cardHeight*.3,0,abilityY+cardHeight);shade.addColorStop(0,'rgba(4,5,8,0)');shade.addColorStop(1,'rgba(4,5,8,.94)');ctx.fillStyle=shade;ctx.fillRect(x,abilityY,cardWidth,cardHeight);ctx.restore();ctx.fillStyle='#efe5d4';ctx.font='600 9px Georgia';ctx.fillText(roman(index+1),x+5,abilityY+12);ctx.textAlign='right';ctx.fillStyle='#e0ad64';ctx.font='600 8px Georgia';ctx.fillText(`${Math.round(ability.cost*(selected.mods?.cost||1))} AP`,x+cardWidth-4,abilityY+cardHeight-5);ctx.textAlign='left';ctx.restore();this.addHit(`ability-${selected.id}-${index}`,'ability',{unit:selected,ability,index},x,abilityY,cardWidth,cardHeight,'help')});
      if(abilities.length>1){const orderY=Math.min(panelBottom-22,abilityY+cardHeight+7);ctx.fillStyle=this.hovered?.action==='order'?'#e4b268':'#9d8e79';ctx.font='600 9px Georgia';ctx.letterSpacing='1.2px';ctx.fillText('↕ REWRITE ORDER',panelX+12,orderY+11);this.addHit('order','order',selected.id,panelX+8,orderY,panelWidth-20,18)}
    }
    ctx.restore();
  }

  drawLaws(ctx,snapshot,width,height){
    const laws=snapshot.graveLaws||[],x=24,baseY=height-126;ctx.fillStyle='#8f8270';ctx.font='600 8px Georgia';ctx.letterSpacing='1.8px';ctx.fillText('THE NIGHT OBSERVES',x,baseY-9);laws.slice(0,2).forEach((law,index)=>{const y=baseY+index*36,color=hex(law.color);ctx.save();ctx.strokeStyle=color;ctx.globalAlpha=.72;ctx.beginPath();ctx.arc(x+13,y+13,12,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(5,6,9,.74)';ctx.fill();ctx.globalAlpha=1;ctx.fillStyle=color;ctx.textAlign='center';ctx.font='600 12px Georgia';ctx.fillText(law.sigil,x+13,y+17);ctx.textAlign='left';ctx.fillStyle='#8f8270';ctx.font='600 7px Georgia';ctx.letterSpacing='1.2px';ctx.fillText('GRAVE LAW',x+32,y+9);ctx.fillStyle='#d8cdbb';ctx.font='600 10px Georgia';ctx.letterSpacing='.5px';ctx.fillText(String(law.shortName||law.name).toUpperCase(),x+32,y+23);ctx.restore()})
  }

  drawFeed(ctx,width,height){
    const rightInset=width<1100?280:360,maxWidth=Math.min(430,width-rightInset-260),x=Math.max(220,(width-rightInset-maxWidth)/2+100),baseY=height-30;ctx.textAlign='center';this.feedItems.slice(0,height<700?2:3).reverse().forEach((item,index)=>{const age=performance.now()-item.created,alpha=clamp(1-age/32000,.26,1),y=baseY-(this.feedItems.slice(0,3).length-1-index)*18;ctx.fillStyle=item.important?`rgba(229,176,96,${alpha})`:`rgba(214,204,187,${alpha*.82})`;ctx.font=item.important?'italic 600 10px Georgia':'italic 10px Georgia';ctx.fillText(fitText(ctx,item.text,maxWidth),x+maxWidth/2,y)});ctx.textAlign='left';
  }

  drawCameraControls(ctx,width,height,stats){
    const x=24,y=height-35,size=22,buttons=[['cameraZoomOut','−'],['cameraReset','⌖'],['cameraZoomIn','+']];buttons.forEach(([action,label],index)=>{const bx=x+index*(size+5),hovered=this.hovered?.action===action;ctx.save();ctx.strokeStyle=hovered?'rgba(230,181,105,.85)':'rgba(232,222,202,.22)';ctx.fillStyle=hovered?'rgba(94,37,40,.72)':'rgba(7,8,11,.64)';ctx.beginPath();ctx.arc(bx+size/2,y+size/2,size/2,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=hovered?'#eccb91':'#b6a991';ctx.textAlign='center';ctx.font='600 13px Georgia';ctx.fillText(label,bx+size/2,y+size/2+4);ctx.restore();this.addHit(`camera-${action}`,action,null,bx,y,size,size)});ctx.fillStyle='#786f63';ctx.font='600 7px Georgia';ctx.letterSpacing='1.2px';ctx.fillText(`CAMERA ${Number(stats.cameraZoom||1).toFixed(2)}×`,x+buttons.length*(size+5)+4,y+14);ctx.letterSpacing='0';
  }

  drawBanner(ctx,width,height,time){
    const banner=this.banner||this.snapshot.currentEncounter;if(!banner)return;const bannerWidth=Math.min(470,width*.46),x=(width-bannerWidth)/2,y=100,pulse=.5+Math.sin(time*.005)*.12;ctx.save();ribbonPath(ctx,x,y,bannerWidth,58,18);ctx.fillStyle='rgba(9,9,13,.88)';ctx.fill();ctx.strokeStyle=`rgba(213,78,82,${pulse})`;ctx.stroke();ctx.fillStyle='#d75155';ctx.textAlign='center';ctx.font='600 21px Georgia';ctx.fillText(banner.sigil||'◆',x+32,y+36);ctx.textAlign='left';ctx.fillStyle='#a89b86';ctx.font='600 8px Georgia';ctx.letterSpacing='2px';ctx.fillText('SPECIAL PROCESSION',x+58,y+17);ctx.fillStyle='#efe3ce';ctx.font='600 15px Georgia';ctx.letterSpacing='.7px';ctx.fillText(fitText(ctx,banner.title||'',bannerWidth-78),x+58,y+36);ctx.fillStyle='#9f927f';ctx.font='italic 9px Georgia';ctx.letterSpacing='0';ctx.fillText(fitText(ctx,banner.omen||'',bannerWidth-78),x+58,y+50);ctx.restore();
  }

  drawPauseSeal(ctx,width,height,time){
    const x=(width-(width<1100?250:318)-18)/2,y=height/2,radius=72+pulse(time,.003)*2;ctx.save();ctx.fillStyle='rgba(3,4,7,.38)';ctx.fillRect(0,80,width-(width<1100?250:318)-18,height-80);ctx.strokeStyle='rgba(208,78,82,.66)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(x,y,radius-9,0,Math.PI*2);ctx.strokeStyle='rgba(213,162,92,.28)';ctx.stroke();ctx.fillStyle='#efe3d1';ctx.textAlign='center';ctx.font='600 13px Georgia';ctx.letterSpacing='3px';ctx.fillText('RITUAL',x,y-4);ctx.fillText('SUSPENDED',x,y+17);ctx.restore();
  }

  drawDebug(ctx,snapshot,width,height,stats){
    const x=22,y=111,panelWidth=width<1000?230:270,panelHeight=height<700?260:330,selected=snapshot.units?.find((unit)=>unit.id===snapshot.selectedId);ctx.save();shardPath(ctx,x,y,panelWidth,panelHeight,14);ctx.fillStyle='rgba(4,7,9,.91)';ctx.fill();ctx.strokeStyle='rgba(107,151,153,.58)';ctx.stroke();ctx.fillStyle='#88b1b0';ctx.font='600 9px Georgia';ctx.letterSpacing='2.2px';ctx.fillText('OSSUARY DIAGNOSTIC · LIVE',x+14,y+20);ctx.fillStyle='#d9e4dc';ctx.font='600 21px Georgia';ctx.letterSpacing='0';ctx.fillText(`${Math.round(this.fps)} FPS`,x+14,y+48);const rows=[['DRAW CALLS',stats.calls??0],['TRIANGLES',stats.triangles??0],['ENEMIES',`${snapshot.enemyCount} / ${stats.maxEnemies??'—'}`],['ELITES',snapshot.eliteCount],['MELEE INTENTS',snapshot.meleeIntents],['RANGED INTENTS',snapshot.rangedIntents],['SUPPORT DEAD',snapshot.supportCount],['RITUAL ZONES',snapshot.zoneCount],['TREASURES',`${snapshot.treasureCount} +${snapshot.pendingTreasureDrops}`],['PRESSURE',`${Math.round(snapshot.pressureProgress*100)}%`],['CAMERA',`${Number(stats.cameraX||0).toFixed(1)}, ${Number(stats.cameraY||0).toFixed(1)} · ${Number(stats.cameraZoom||1).toFixed(2)}×`]];let rowY=y+70;ctx.font='600 9px Georgia';rows.forEach(([label,value])=>{ctx.fillStyle='#6f8f8e';ctx.fillText(label,x+14,rowY);ctx.fillStyle='#d3ddd6';ctx.textAlign='right';ctx.fillText(String(value),x+panelWidth-14,rowY);ctx.textAlign='left';rowY+=17});if(selected&&rowY<y+panelHeight-42){ctx.strokeStyle='rgba(107,151,153,.26)';ctx.beginPath();ctx.moveTo(x+14,rowY+2);ctx.lineTo(x+panelWidth-14,rowY+2);ctx.stroke();rowY+=18;ctx.fillStyle='#88b1b0';ctx.fillText('SELECTED OATH',x+14,rowY);rowY+=17;ctx.fillStyle='#e1e8e1';ctx.fillText(fitText(ctx,selected.name,panelWidth-28),x+14,rowY);rowY+=15;ctx.fillStyle='#9baba6';ctx.font='8px Georgia';wrapText(ctx,`${selected.aiState} · ${Math.ceil(selected.hp)}/${Math.ceil(selected.maxHp)} HP · ${Math.floor(selected.ap)}/${Math.floor(selected.maxAp)} AP · ${Math.round(selected.shield||0)} WARD`,x+14,rowY,panelWidth-28,12,2)}ctx.restore();
  }

  drawAbilityInspector(ctx,payload,width,height){
    const {unit,ability,index}=payload||{};if(!ability)return;const panelWidth=Math.min(360,width*.38),panelHeight=134,rightWidth=width<1100?250:318,x=width-rightWidth-panelWidth-36,y=Math.min(height-panelHeight-35,Math.max(112,this.hovered.y||height*.46));ctx.save();shardPath(ctx,x,y,panelWidth,panelHeight,13);ctx.fillStyle='rgba(10,9,12,.96)';ctx.fill();ctx.strokeStyle='rgba(216,164,92,.62)';ctx.stroke();const artSize=panelHeight-18;ctx.save();shardPath(ctx,x+9,y+9,artSize,artSize,9);ctx.clip();drawAtlasCell(ctx,this.images.abilities,ability.artIndex??abilityIndexes.get(ability.id)??0,6,4,x+9,y+9,artSize,artSize,'cover');ctx.restore();const copyX=x+artSize+20,copyWidth=panelWidth-artSize-30;ctx.fillStyle='#d65054';ctx.font='600 8px Georgia';ctx.letterSpacing='1.7px';ctx.fillText(`${String(ability.category||ability.kind).toUpperCase()} · SLOT ${roman(index+1)}`,copyX,y+20);ctx.fillStyle='#efe3d0';ctx.font='600 18px Georgia';ctx.letterSpacing='0';ctx.fillText(fitText(ctx,ability.name,copyWidth),copyX,y+43);ctx.fillStyle='#a99c88';ctx.font='10px Georgia';wrapText(ctx,ability.detail,copyX,y+60,copyWidth,13,3);ctx.fillStyle='#ddb16d';ctx.font='600 9px Georgia';ctx.fillText(`${Math.round(ability.cost*(unit.mods?.cost||1))} AP`,copyX,y+panelHeight-12);ctx.textAlign='right';ctx.fillText(`${Math.round(ability.power||0)} POWER`,x+panelWidth-12,y+panelHeight-12);ctx.restore();
  }

  drawHoverHint(ctx,width,height){
    if(!this.hovered||this.hovered.action==='ability')return;const labels={archive:'OPEN GRAVE ARCHIVE',sound:'TOGGLE SOUND',debug:this.debug?'CLOSE DIAGNOSTIC':'OPEN DIAGNOSTIC',pause:this.snapshot.paused?'RESUME RITUAL':'SUSPEND RITUAL',cameraZoomOut:'WIDEN THE VIEW',cameraReset:'RETURN TO THE BELL',cameraZoomIn:'DRAW THE CAMERA NEAR',order:'REWRITE THE SELECTED LITANY',selectUnit:'INSPECT OATHBOUND'};const label=labels[this.hovered.action];if(!label)return;ctx.save();ctx.font='600 8px Georgia';ctx.letterSpacing='1.3px';const measured=ctx.measureText(label).width+18,x=clamp(this.hovered.x+this.hovered.width/2-measured/2,12,width-measured-12),y=clamp(this.hovered.y+this.hovered.height+8,12,height-26);ribbonPath(ctx,x,y,measured,18,6);ctx.fillStyle='rgba(6,7,10,.9)';ctx.fill();ctx.fillStyle='#cbbda5';ctx.textAlign='center';ctx.fillText(label,x+measured/2,y+12);ctx.restore();
  }
}

function pulse(time,speed){return Math.sin(time*speed)}
