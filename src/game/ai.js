const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const normalize = (x,y) => { const length=Math.hypot(x,y)||1; return {x:x/length,y:y/length,length}; };
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));

export const MELEE_KINDS = new Set(['strike','cleave','dash','bash','reap','riposte','pounce','orbit']);
export const SUPPORT_KINDS = new Set(['heal','ward','transfusion','sanctuary']);
export const ZONE_KINDS = new Set(['sanctuary','vortex','trap','delayed','nova','pulse']);

export function abilityTacticalRange(unit,ability) {
  if (!ability) return unit.idealRange || 3;
  if (ability.kind === 'riposte' || ability.kind === 'orbit' || ability.kind === 'trap' || ability.kind === 'sanctuary') return 0;
  return Math.max(.65,(ability.range || unit.idealRange || 3) + (unit.mods?.range || 0));
}

export function chooseHeroTarget(unit,enemies,allies,ability) {
  const living=enemies.filter((enemy)=>enemy.alive);
  if (!living.length) return null;
  if (ability?.id === 'red-thread') return living.sort((a,b)=>distance(unit,b)-distance(unit,a))[0];
  if (ability?.kind === 'delayed' || ability?.kind === 'vortex' || ability?.kind === 'nova') {
    return living.map((enemy)=>({enemy,score:living.reduce((score,other)=>score+(distance(enemy,other)<2.8?1:0),0)})).sort((a,b)=>b.score-a.score)[0]?.enemy;
  }
  if (unit.role === 'vanguard') {
    return living.sort((a,b)=>{
      const armorA=(a.template.armored?3:0)+(a.elite?2:0),armorB=(b.template.armored?3:0)+(b.elite?2:0);
      const pressureA=allies.reduce((score,ally)=>score+(distance(a,ally)<2.2?2:0),0);
      const pressureB=allies.reduce((score,ally)=>score+(distance(b,ally)<2.2?2:0),0);
      return (distance(unit,a)-armorA-pressureA)-(distance(unit,b)-armorB-pressureB);
    })[0];
  }
  if (unit.role === 'guardian') {
    const ward=allies.filter((ally)=>ally.alive).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0]||unit;
    return living.sort((a,b)=>distance(ward,a)-distance(ward,b))[0];
  }
  if (unit.role === 'artillery') {
    return living.map((enemy)=>({enemy,score:living.reduce((score,other)=>score+(distance(enemy,other)<2.5?1:0),0)+(enemy.template.aura?2:0)+(enemy.elite?2:0)})).sort((a,b)=>b.score-a.score)[0]?.enemy;
  }
  if (unit.role === 'skirmisher') {
    return living.map((enemy)=>({enemy,score:(enemy.template.ranged?5:0)+(enemy.template.aura?4:0)+(enemy.elite?2:0)-living.reduce((count,other)=>count+(other!==enemy&&distance(enemy,other)<2?1:0),0)-distance(unit,enemy)*.15})).sort((a,b)=>b.score-a.score)[0]?.enemy;
  }
  return living.sort((a,b)=>distance(unit,a)-distance(unit,b))[0];
}

export function chooseSupportTarget(unit,allies) {
  const living=allies.filter((ally)=>ally.alive);
  return living.sort((a,b)=>{
    const urgencyA=(1-a.hp/a.maxHp)*2+(a.shield<=0?.15:0)+nearbyThreat(a,unit._aiEnemies||[])*.08;
    const urgencyB=(1-b.hp/b.maxHp)*2+(b.shield<=0?.15:0)+nearbyThreat(b,unit._aiEnemies||[])*.08;
    return urgencyB-urgencyA;
  })[0]||unit;
}

function nearbyThreat(entity,enemies) {
  return enemies.reduce((score,enemy)=>score+(enemy.alive&&distance(entity,enemy)<3.2?1:0),0);
}

export function beginHeroLunge(unit,target,kind) {
  if (!target) return;
  const direction=normalize(target.x-unit.x,target.y-unit.y);
  const stay=kind==='dash'||kind==='pounce';
  const overshoot=kind==='dash'?.65:kind==='pounce'?.45:-.38;
  const endDistance=stay?overshoot:Math.max(.55,Math.min(1.0,direction.length*.72));
  const endX=stay?target.x+direction.x*overshoot:unit.x+direction.x*endDistance;
  const endY=stay?target.y+direction.y*overshoot:unit.y+direction.y*endDistance;
  unit.actionMotion={kind,startX:unit.x,startY:unit.y,endX,endY,age:0,duration:stay?.26:.2,stay};
  unit.aiState=kind==='pounce'?'Pouncing':kind==='dash'?'Passing through':'Committing';
}

export function updateHeroMovement(unit,dt,context) {
  const {enemies,allies,time}=context;
  unit._aiEnemies=enemies;
  if (unit.actionMotion) {
    const motion=unit.actionMotion;motion.age+=dt;const t=Math.min(1,motion.age/motion.duration);
    const travel=motion.stay?t:Math.sin(t*Math.PI);
    unit.x=motion.startX+(motion.endX-motion.startX)*travel;
    unit.y=motion.startY+(motion.endY-motion.startY)*travel;
    unit.vx=(motion.endX-motion.startX)/motion.duration;unit.vy=(motion.endY-motion.startY)/motion.duration;
    if(t>=1)unit.actionMotion=null;
    return;
  }

  unit.thinkCooldown=(unit.thinkCooldown||0)-dt;
  const ability=unit.abilities[unit.abilityCursor];
  if(unit.thinkCooldown<=0||!enemies.some((enemy)=>enemy.id===unit.targetId&&enemy.alive)){
    const target=chooseHeroTarget(unit,enemies,allies,ability);unit.targetId=target?.id||null;unit.thinkCooldown=.16+Math.random()*.16;
  }
  const target=enemies.find((enemy)=>enemy.id===unit.targetId&&enemy.alive);
  const weakAlly=allies.filter((ally)=>ally.alive).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0]||unit;
  let desiredX=unit.x,desiredY=unit.y,state='Holding';
  const tacticalRange=abilityTacticalRange(unit,ability);

  if(!target){
    const angle=(unit.id%7)/7*Math.PI*2;desiredX=Math.cos(angle)*1.4;desiredY=Math.sin(angle)*1.05;state='Regrouping';
  } else {
    const toTarget=normalize(target.x-unit.x,target.y-unit.y);
    const dist=toTarget.length;
    if(unit.role==='guardian'){
      const toThreat=normalize(target.x-weakAlly.x,target.y-weakAlly.y);
      desiredX=weakAlly.x+toThreat.x*.9;desiredY=weakAlly.y+toThreat.y*.9;
      state=weakAlly===unit?'Anchoring':'Guarding '+weakAlly.name.split(' ')[0];
    } else if(unit.role==='support'){
      const away=threatVector(unit,enemies);const team=centerOf(allies.filter((ally)=>ally.alive));
      desiredX=team.x-away.x*2.1;desiredY=team.y-away.y*1.6;
      if(distance(unit,weakAlly)>4.2){desiredX=(desiredX+weakAlly.x)/2;desiredY=(desiredY+weakAlly.y)/2}
      state=weakAlly.hp/weakAlly.maxHp<.55?'Reaching the wounded':'Keeping sanctuary';
    } else if(unit.role==='artillery'){
      if(dist<3.5){desiredX=unit.x-toTarget.x*2.8;desiredY=unit.y-toTarget.y*2.8;state='Kiting'}
      else if(dist>Math.max(5.4,tacticalRange*.82)){desiredX=unit.x+toTarget.x*2.4;desiredY=unit.y+toTarget.y*2.4;state='Seeking a firing line'}
      else {const side=(unit.id%2?1:-1);desiredX=unit.x-toTarget.y*side*1.8;desiredY=unit.y+toTarget.x*side*1.8;state='Circling the cluster'}
    } else if(unit.role==='skirmisher'){
      const side=unit.id%2?1:-1;const orbitAngle=time*.0012*side+unit.id;
      desiredX=target.x-Math.cos(orbitAngle)*Math.max(1.4,unit.idealRange);desiredY=target.y-Math.sin(orbitAngle)*Math.max(1.1,unit.idealRange*.7);
      state=target.template.ranged?'Hunting the backline':'Finding the seam';
    } else {
      if(dist>Math.max(.8,tacticalRange*.8)){desiredX=target.x-toTarget.x*.78;desiredY=target.y-toTarget.y*.78;state='Intercepting'}
      else {desiredX=unit.x-toTarget.y*.55;desiredY=unit.y+toTarget.x*.55;state='Pressing the line'}
    }
  }

  const danger=threatVector(unit,enemies);
  if((unit.role==='support'||unit.role==='artillery')&&danger.strength>1.2){desiredX-=danger.x*2.6;desiredY-=danger.y*2.3;state='Evading pressure'}
  const warning=enemies.find((enemy)=>enemy.alive&&enemy.attackWindup>0&&(enemy.pendingTargetId===unit.id||enemy.template.cleave&&distance(enemy,unit)<enemy.range+1.1));
  if(warning){const away=normalize(unit.x-warning.x,unit.y-warning.y);if(unit.role==='guardian'&&unit.shield>unit.maxHp*.06){desiredX=unit.x;desiredY=unit.y;state='Bracing for '+warning.template.name}else{const side=unit.id%2?1:-1;desiredX=unit.x+away.x*3-away.y*side*.7;desiredY=unit.y+away.y*2.5+away.x*side*.7;state='Reading the '+(warning.template.ranged?'shot':'tell')}}

  const separation=separationVector(unit,allies,.9);desiredX+=separation.x;desiredY+=separation.y;
  const enemySeparation=separationVector(unit,enemies,unit.role==='vanguard'?.45:.75);desiredX+=enemySeparation.x*(unit.role==='vanguard'?.15:.7);desiredY+=enemySeparation.y*(unit.role==='vanguard'?.15:.7);

  const roleBound=unit.role==='vanguard'||unit.role==='skirmisher'?6.9:6.2;
  const verticalBound=unit.role==='vanguard'||unit.role==='skirmisher'?4.9:4.45;
  const ellipse=Math.hypot(desiredX/roleBound,desiredY/verticalBound);
  if(ellipse>1){desiredX/=ellipse;desiredY/=ellipse;state='Defending the ritual edge'}

  const move=normalize(desiredX-unit.x,desiredY-unit.y);const shouldMove=move.length>.12;const speed=unit.moveSpeed*(unit.status?.slow>0?.65:1);
  const desiredVx=shouldMove?move.x*speed:0,desiredVy=shouldMove?move.y*speed:0;const smoothing=1-Math.exp(-dt*8);
  unit.vx=(unit.vx||0)+(desiredVx-(unit.vx||0))*smoothing;unit.vy=(unit.vy||0)+(desiredVy-(unit.vy||0))*smoothing;
  unit.x+=unit.vx*dt;unit.y+=unit.vy*dt;unit.aiState=state;unit.isMoving=Math.hypot(unit.vx,unit.vy)>.18;
  unit.momentumTime=unit.isMoving?Math.min(3,(unit.momentumTime||0)+dt):Math.max(0,(unit.momentumTime||0)-dt*1.5);
  if(unit.isMoving&&unit.mods.movingAp)unit.ap=Math.min(unit.maxAp,unit.ap+unit.mods.movingAp*dt);
  unit.stillTime=unit.isMoving?0:Math.min(4,(unit.stillTime||0)+dt);
  if(unit.mods.stationaryWard&&unit.stillTime>1.2)unit.shield=Math.min(unit.shield+unit.mods.stationaryWard*dt*.12,unit.mods.stationaryWard);
}

function centerOf(entities){if(!entities.length)return{x:0,y:0};return{x:entities.reduce((s,e)=>s+e.x,0)/entities.length,y:entities.reduce((s,e)=>s+e.y,0)/entities.length}}

function threatVector(unit,enemies){
  let x=0,y=0,strength=0;
  enemies.forEach((enemy)=>{if(!enemy.alive)return;const dx=enemy.x-unit.x,dy=enemy.y-unit.y;const d=Math.max(.3,Math.hypot(dx,dy));if(d>4.5)return;const weight=(enemy.damage||5)/(d*d*8);x+=dx/d*weight;y+=dy/d*weight;strength+=weight});
  const norm=normalize(x,y);return{x:norm.x,y:norm.y,strength};
}

function separationVector(unit,entities,radius){
  let x=0,y=0;
  entities.forEach((other)=>{if(other===unit||!other.alive)return;const dx=unit.x-other.x,dy=unit.y-other.y;const d=Math.hypot(dx,dy);if(d>0&&d<radius){const force=(radius-d)/radius;x+=dx/d*force;y+=dy/d*force}});
  return{x:x*.9,y:y*.9};
}

function clusteredHeroTarget(enemy,living,radius=2.4){
  return living.map((unit)=>({
    unit,
    score:living.reduce((sum,other)=>sum+(distance(unit,other)<radius?1:0),0)*3+(1-unit.hp/unit.maxHp)-distance(enemy,unit)*.08
  })).sort((a,b)=>b.score-a.score)[0]?.unit;
}

export function chooseEnemyTarget(enemy,units,enemies=[]){
  const living=units.filter((unit)=>unit.alive);if(!living.length)return null;
  if(enemy.apDrain>0||enemy.deathBurst>0||enemy.template.cleave)return clusteredHeroTarget(enemy,living,enemy.template.giant?3:2.45);
  if(enemy.lifeSteal>0)return living.sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  if(enemy.template.ai==='flank'||enemy.template.ai==='phase')return living.sort((a,b)=>((a.role==='support'||a.role==='artillery')?-4:0)+a.hp/a.maxHp-(((b.role==='support'||b.role==='artillery')?-4:0)+b.hp/b.maxHp))[0];
  if(enemy.template.ai==='kite'||enemy.template.ai==='bishop')return living.sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  if(enemy.template.ai==='guard'){
    const ward=enemies.filter((other)=>other.alive&&other!==enemy&&(other.elite||other.template.aura||other.template.bishop||other.template.standard)).sort((a,b)=>distance(enemy,a)-distance(enemy,b))[0];
    if(ward)return living.sort((a,b)=>distance(ward,a)-distance(ward,b))[0];
  }
  return living.sort((a,b)=>distance(enemy,a)-distance(enemy,b))[0];
}

export function updateEnemyMovement(enemy,dt,context){
  const {units,enemies,time}=context;
  if(enemy.status.stun>0){enemy.status.stun-=dt;enemy.vx*=.82;enemy.vy*=.82;enemy.x+=enemy.vx*dt;enemy.y+=enemy.vy*dt;enemy.aiState='Stunned';return null}
  enemy.thinkCooldown=(enemy.thinkCooldown||0)-dt;
  if(enemy.thinkCooldown<=0||!units.some((unit)=>unit.id===enemy.targetId&&unit.alive)){const chosen=chooseEnemyTarget(enemy,units,enemies);enemy.targetId=chosen?.id||null;enemy.thinkCooldown=.22+Math.random()*.2}
  const target=units.find((unit)=>unit.id===enemy.targetId&&unit.alive);if(!target)return null;
  enemy.processionFury=Math.max(0,(enemy.processionFury||0)-dt);const cohortLeader=enemy.cohortLeaderId?enemies.find((other)=>other.alive&&other.id===enemy.cohortLeaderId):null;
  if(enemy.cohortLeaderId&&enemy.cohortLeaderId!==enemy.id&&!cohortLeader&&!enemy.cohortBroken){enemy.cohortBroken=true;enemy.processionFury=4;enemy.ap=Math.min(enemy.maxAp,enemy.ap+enemy.maxAp*.16);enemy.justBrokeCohort=true}
  const toTarget=normalize(target.x-enemy.x,target.y-enemy.y);const dist=toTarget.length;let desiredX=target.x,desiredY=target.y;
  const ai=enemy.template.ai;
  if(ai==='kite'||ai==='support'||ai==='bishop'||ai==='standard'){
    const preferred=ai==='standard'?5:enemy.range*.82;
    if(dist<preferred*.72){desiredX=enemy.x-toTarget.x*2;desiredY=enemy.y-toTarget.y*2;enemy.aiState='Withdrawing'}
    else if(dist>preferred){desiredX=target.x-toTarget.x*preferred;desiredY=target.y-toTarget.y*preferred;enemy.aiState='Taking range'}
    else {desiredX=enemy.x-toTarget.y*(enemy.id%2?1:-1);desiredY=enemy.y+toTarget.x*(enemy.id%2?1:-1);enemy.aiState='Tracking'}
  } else if(ai==='flank'){
    const side=enemy.id%2?1:-1;desiredX=target.x-toTarget.x*.4-toTarget.y*side*1.1;desiredY=target.y-toTarget.y*.4+toTarget.x*side*1.1;enemy.aiState='Flanking';
  } else if(ai==='phase'){
    enemy.phaseCooldown=(enemy.phaseCooldown||2.8)-dt;
    if(enemy.phaseCooldown<=0&&dist>2.2){enemy.x+=toTarget.x*Math.min(2.8,dist-1);enemy.y+=toTarget.y*Math.min(2.8,dist-1);enemy.phaseCooldown=4+Math.random()*2;enemy.justPhased=true}
    enemy.aiState='Phasing';
  } else if(ai==='guard'){
    const ward=enemies.filter((other)=>other.alive&&other!==enemy&&(other.elite||other.template.aura||other.template.bishop||other.template.standard)).sort((a,b)=>distance(enemy,a)-distance(enemy,b))[0];
    if(ward&&distance(enemy,ward)>1.7){const threat=normalize(target.x-ward.x,target.y-ward.y);desiredX=ward.x+threat.x*.92;desiredY=ward.y+threat.y*.92;enemy.aiState=`Guarding ${ward.template.name}`}
    else{desiredX=target.x-toTarget.x*.5;desiredY=target.y-toTarget.y*.5;enemy.aiState='Holding the dead line'}
  } else {desiredX=target.x-toTarget.x*Math.max(.25,enemy.range*.72);desiredY=target.y-toTarget.y*Math.max(.25,enemy.range*.72);enemy.aiState=enemy.deathBurst>0?'Seeking the pyre':enemy.template.cleave?'Gathering the living':'Closing'}

  if(cohortLeader&&cohortLeader!==enemy&&enemy.cohortFormation!=='pincer'&&ai!=='flank'&&ai!=='phase'&&dist>2.1){
    const advance=normalize(target.x-cohortLeader.x,target.y-cohortLeader.y),rank=Math.ceil((enemy.cohortSlot||1)/2),side=(enemy.cohortSlot||1)%2?1:-1,slotX=cohortLeader.x-advance.x*rank*.34-advance.y*side*rank*.54,slotY=cohortLeader.y-advance.y*rank*.34+advance.x*side*rank*.54,slotDistance=Math.hypot(enemy.x-slotX,enemy.y-slotY);if(slotDistance>1.05){desiredX=desiredX*.6+slotX*.4;desiredY=desiredY*.6+slotY*.4;enemy.aiState=`Keeping the ${enemy.cohortFormation}`}
  }

  if(enemy.linkedGuard>0){
    const cantor=enemies.filter((other)=>other.alive&&other!==enemy&&other.linkedGuard>0).sort((a,b)=>distance(enemy,a)-distance(enemy,b))[0];
    if(cantor&&distance(enemy,cantor)>(enemy.affixAuraRadius||3.5)*.82){desiredX=(desiredX+cantor.x*1.7)/2.7;desiredY=(desiredY+cantor.y*1.7)/2.7;enemy.aiState='Rejoining the choir'}
  }

  const separate=separationVector(enemy,enemies,.58*enemy.template.scale);desiredX+=separate.x*.45;desiredY+=separate.y*.45;
  const move=normalize(desiredX-enemy.x,desiredY-enemy.y);const slow=enemy.status.slow>0?1-(enemy.status.slowPower||.3):1;let auraSpeed=1;
  if(enemies.some((other)=>other.alive&&other.template.standard&&distance(enemy,other)<4.2))auraSpeed=1.16;
  const fury=enemy.processionFury>0?1.12:1;if(enemy.processionFury>0)enemy.aiState='Avenging the broken file';const speed=enemy.speed*slow*auraSpeed*fury;const desiredVx=move.length>.08?move.x*speed:0,desiredVy=move.length>.08?move.y*speed:0;const smoothing=1-Math.exp(-dt*7);
  enemy.vx=(enemy.vx||0)+(desiredVx-(enemy.vx||0))*smoothing;enemy.vy=(enemy.vy||0)+(desiredVy-(enemy.vy||0))*smoothing;
  if(enemy.status.knockback>0){enemy.status.knockback-=dt;enemy.vx+=(enemy.status.knockbackX||0)*dt*14;enemy.vy+=(enemy.status.knockbackY||0)*dt*14}
  enemy.x+=enemy.vx*dt;enemy.y+=enemy.vy*dt;
  return {target,dist:distance(enemy,target),time};
}

export function pointToSegmentDistance(point,start,end){
  const dx=end.x-start.x,dy=end.y-start.y;const lengthSq=dx*dx+dy*dy||1;const t=clamp(((point.x-start.x)*dx+(point.y-start.y)*dy)/lengthSq,0,1);const x=start.x+t*dx,y=start.y+t*dy;return Math.hypot(point.x-x,point.y-y);
}
