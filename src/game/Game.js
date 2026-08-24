import * as THREE from 'three';
import { ENEMY_AFFIXES, ENEMY_ARCHETYPES, chooseEnemyType, generateOathbound, getUpgradeChoices, rollEnemyAffixes, UPGRADE_CATALOG } from './catalog.js';
import { MELEE_KINDS, SUPPORT_KINDS, ZONE_KINDS, abilityTacticalRange, beginHeroLunge, chooseHeroTarget, chooseSupportTarget, pointToSegmentDistance, updateEnemyMovement, updateHeroMovement } from './ai.js';
import { chooseSpawnPack, createFormationPositions, getBellEncounter } from './director.js';
import { discoverEncounter, discoverEnemy, discoverLaw, discoverOrigin, discoverRite, loadChronicle, recordRun } from './chronicle.js';
import { GRAVE_LAWS, applyGraveLawsToHero, lawProduct, lawSum, rollGraveLaws } from './laws.js';
import {
  buildArena, createAfterimage, createBeam, createBurst, createCorpseDecal, createFloatingText,
  createEnemyIntent, createHeroVisual, createHitSpark, createParticleBurst, createProjectile, createSkeletonVisual,
  createSlashArc, createTelegraph, createZoneVisual, updateEntityVisual
} from './art.js';

const TOTAL_TIME = 20 * 60;
const FORMATION = [[0,0],[-1.45,-.85],[1.45,-.85],[-1.75,1.05],[1.75,1.05],[0,1.75]];
const SELF_CAST_KINDS = new Set(['riposte','orbit','trap','sanctuary']);
const BELL_BENEDICTIONS = {
  5:{title:'THE COMPANY MUSTERS',sigil:'✦',omen:'The fifth bell finds more names than the first.',shield:.04,heal:.04,ap:.1},
  10:{title:'BLACK NOON',sigil:'◐',omen:'At the middle bell, the living seize one breath from the dead.',shield:.1,heal:.08,ap:.25},
  15:{title:'THE LAST VIGIL',sigil:'☼',omen:'Every surviving oath burns against the darkening.',shield:.18,heal:.14,ap:.35},
  17:{title:'THE HOUR WITHOUT HANDS',sigil:'◴',omen:'Time miscounts the living, and the company steals the difference.',shield:.15,heal:.12,ap:.25},
  18:{title:'FINAL DEFIANCE',sigil:'◆',omen:'The last company spends tomorrow before it arrives.',shield:.22,heal:.18,ap:.5},
  19:{title:'THE PENULTIMATE OATH',sigil:'✦',omen:'One minute remains. Every unwritten dawn is wagered now.',shield:.2,heal:.16,ap:.5}
};
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);

class RitualAudio {
  constructor(){this.context=null;this.master=null;this.enabled=true;this.drone=null}
  start(){
    if(this.context)return;
    const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;
    this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=.15;this.master.connect(this.context.destination);
    const low=this.context.createOscillator();const lowGain=this.context.createGain();low.type='sine';low.frequency.value=43.65;lowGain.gain.value=.03;low.connect(lowGain).connect(this.master);low.start();
    const high=this.context.createOscillator();const highGain=this.context.createGain();high.type='triangle';high.frequency.value=65.4;highGain.gain.value=.012;high.connect(highGain).connect(this.master);high.start();this.drone=[low,high];
  }
  tone(frequency=180,duration=.08,volume=.08,type='triangle',endRatio=.62){
    if(!this.enabled||!this.context)return;const now=this.context.currentTime;const osc=this.context.createOscillator();const gain=this.context.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,now);osc.frequency.exponentialRampToValueAtTime(Math.max(30,frequency*endRatio),now+duration);gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);osc.connect(gain).connect(this.master);osc.start(now);osc.stop(now+duration+.02);
  }
  bell(index=1){if(!this.enabled||!this.context)return;[1,1.49,2.14,2.71].forEach((ratio,i)=>this.tone(82*ratio+index*2,1.4,.11/(i+1),'sine',.9))}
  blade(){this.tone(220,.11,.045,'sawtooth',1.8)}
  ward(){this.tone(420,.34,.035,'sine',.72)}
  toggle(){this.enabled=!this.enabled;if(this.master)this.master.gain.value=this.enabled?.15:0;return this.enabled}
}

export class Game {
  constructor(stage,events={},options={}){
    this.stage=stage;this.events=events;this.headless=options.headless===true;this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-14,14,8,-8,.1,100);this.camera.position.z=20;
    if(this.headless){this.renderer={dispose(){},render(){}};this.arena={pulse(){},setBell(){},applyLaws(){},update(){}}}
    else{this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.stage.appendChild(this.renderer.domElement);this.arena=buildArena(this.scene)}
    this.audio=new RitualAudio();this.clock=new THREE.Clock(false);this.elapsed=0;this.running=false;this.paused=false;this.modalPaused=false;this.ended=false;
    this.units=[];this.enemies=[];this.effects=[];this.zones=[];this.deferred=[];this.selectedId=null;this.nextEntityId=1;this.nextCohortId=1;this.killCount=0;this.spawnWait=2.2;this.nextUpgrade=60;this.arrivalIndex=0;this.arrivalTimes=[55,140,250,400,600];this.lastHud=0;this.lastOmen=0;this.lastBell=0;this.appliedUpgradeIds=new Set();this.animationFrame=0;this.cameraShake=0;this.maxEnemies=118;this.currentEncounter=null;this.chronicle=loadChronicle();this.graveLaws=rollGraveLaws(2,options.lawIds);this.arena.applyLaws?.(this.graveLaws);
    this.boundResize=()=>this.resize();if(!this.headless){window.addEventListener('resize',this.boundResize);this.resize();this.render(0)}
  }

  start(){if(this.running)return;if(!this.headless)this.audio.start();this.running=true;this.clock.start();let newLaw=false;this.graveLaws.forEach((law)=>{newLaw=discoverLaw(this.chronicle,law.id)||newLaw});this.addUnit(generateOathbound([],0),true);this.feed('The first oathbound answers.',true);this.graveLaws.forEach((law)=>this.feed(`<strong>${law.name}</strong> — ${law.text}`,true));if(newLaw)this.events.onDiscovery?.(this.snapshot());this.events.onStart?.();if(!this.headless)this.loop()}
  destroy(){if(!this.headless){cancelAnimationFrame(this.animationFrame);window.removeEventListener('resize',this.boundResize)}this.renderer.dispose()}
  resize(){if(this.headless)return;const width=Math.max(1,this.stage.clientWidth);const height=Math.max(1,this.stage.clientHeight);this.renderer.setSize(width,height,false);const aspect=width/height;const vertical=18.4;this.camera.top=vertical/2;this.camera.bottom=-vertical/2;this.camera.left=-vertical*aspect/2;this.camera.right=vertical*aspect/2;this.camera.updateProjectionMatrix()}
  togglePause(force){if(!this.running||this.ended||this.modalPaused)return this.paused;this.paused=typeof force==='boolean'?force:!this.paused;this.events.onPause?.(this.paused);return this.paused}
  setModalPaused(value){this.modalPaused=value}
  toggleSound(){return this.audio.toggle()}
  selectUnit(id){if(this.units.some((unit)=>unit.id===id)){this.selectedId=id;this.events.onRoster?.(this.snapshot())}}

  addUnit(data,initial=false){
    const slot=FORMATION[this.units.length]||[0,0];const unit={...data,id:this.nextEntityId++,kind:'hero',x:slot[0],y:slot[1],homeX:slot[0],homeY:slot[1],vx:0,vy:0,visualPhase:Math.random()*9,status:{slow:0,riposte:0,haste:0},lastAbilityKind:null,aiState:'Reading the field',targetId:null,thinkCooldown:0,orbitCharges:0,orbitTimer:0};
    applyGraveLawsToHero(this.graveLaws,unit);
    unit.shield+=unit.maxHp*(initial?.18:.12);
    unit.mesh=createHeroVisual(unit);this.scene.add(unit.mesh);this.units.push(unit);if(!this.selectedId)this.selectedId=unit.id;const newOrigin=discoverOrigin(this.chronicle,unit.originId);this.events.onRoster?.(this.snapshot());if(newOrigin)this.events.onDiscovery?.(this.snapshot());
    if(!initial){this.audio.bell(this.units.length);this.feed(`<strong>${unit.name}</strong>, ${unit.archetype}, arrives unbidden.`,true);this.effects.push(createParticleBurst(this.scene,unit.x,unit.y,0xd5a25c,18,1.4));this.effects.push(createBurst(this.scene,unit.x,unit.y,0xd5a25c,1.2))}
    return unit;
  }

  spawnEnemy(type=chooseEnemyType(this.elapsed/TOTAL_TIME),position=null,forcedAffixes=null){
    let template={...ENEMY_ARCHETYPES[type]};if(!template)return null;const progress=this.elapsed/TOTAL_TIME;const affixes=rollEnemyAffixes(progress,forcedAffixes);if(affixes.some((affix)=>affix.phaseStep))template={...template,phase:true,ai:'phase'};
    const strength=.72+progress*.75+Math.pow(progress,2)*1.75;const damageCurve=.28+progress*.22+Math.pow(progress,2)*.75;const angle=Math.random()*Math.PI*2;const radiusX=Math.max(11.5,Math.abs(this.camera.right)*.92);const radiusY=7.7;
    const multiply=(key)=>affixes.reduce((value,affix)=>value*(affix[key]||1),1);const sum=(key)=>affixes.reduce((value,affix)=>value+(affix[key]||0),0);const maximum=(key)=>affixes.reduce((value,affix)=>Math.max(value,affix[key]||0),0);
    const maxHp=template.hp*strength*multiply('health')*lawProduct(this.graveLaws,'enemy','health');const enemy={id:this.nextEntityId++,kind:'enemy',type,template,affixes,elite:affixes.length>0,affixColor:affixes[0]?.color||template.color,name:`${affixes.map((affix)=>affix.name).join(' ')}${affixes.length?' ':''}${template.name}`,maxHp,hp:maxHp,shield:maxHp*(sum('startingShield')+lawSum(this.graveLaws,'enemy','startingShield')),damage:template.damage*damageCurve*multiply('damage')*lawProduct(this.graveLaws,'enemy','damage'),speed:template.speed*(1+progress*.16)*multiply('speed')*lawProduct(this.graveLaws,'enemy','speed'),maxAp:template.maxAp,ap:Math.random()*template.maxAp*.6,apRegen:template.regen*(1+progress*.25)*multiply('regen')*lawProduct(this.graveLaws,'enemy','regen'),attackCost:template.attackCost*multiply('attackCost'),range:template.range,x:position?.x??Math.cos(angle)*radiusX,y:position?.y??Math.sin(angle)*radiusY,vx:0,vy:0,alive:true,aiState:'Rising',targetId:null,attackWindup:0,pendingTargetId:null,pendingTargetX:0,pendingTargetY:0,intentEffect:null,status:{burn:0,burnDps:0,bleed:0,bleedDps:0,slow:0,slowPower:0,stun:0,brittle:0,armorBreak:0,knockback:0},auraTimer:1.5+Math.random()*3,specialTimer:1+Math.random()*2,lifeSteal:sum('lifesteal'),deathBurst:maximum('deathBurst'),apDrain:sum('apDrain'),affixAuraRadius:maximum('auraRadius'),wardOnHit:sum('wardOnHit')+lawSum(this.graveLaws,'enemy','wardOnHit'),linkedGuard:maximum('linkedGuard'),dodge:sum('dodge')+lawSum(this.graveLaws,'enemy','dodge'),wardHitCooldown:0};
    enemy.mesh=createSkeletonVisual(enemy);this.scene.add(enemy.mesh);this.enemies.push(enemy);this.effects.push(createParticleBurst(this.scene,enemy.x,enemy.y,enemy.affixColor,enemy.elite?11:5,enemy.elite?.9:.5));const discovered=discoverEnemy(this.chronicle,type,affixes.map((affix)=>affix.id));if(discovered){if(enemy.elite)this.feed(`<strong>${enemy.name}</strong> enters the archive.`,true);this.events.onDiscovery?.(this.snapshot())}return enemy;
  }

  spawnPack(pack,forced=false){
    const positions=createFormationPositions(pack.types.length,this.camera.right,pack.formation),cohortId=this.nextCohortId++,spawned=pack.types.map((type,index)=>this.spawnEnemy(type,positions[index],forced?(pack.elites?.[index]||[]):null)).filter(Boolean),leader=spawned[0];spawned.forEach((enemy,index)=>{enemy.cohortId=cohortId;enemy.cohortSlot=index;enemy.cohortSize=spawned.length;enemy.cohortLeaderId=leader?.id||null;enemy.cohortFormation=pack.formation||'cluster';enemy.processionFury=0;enemy.cohortBroken=false});return spawned;
  }

  triggerEncounter(encounter){
    if(!encounter||this.enemies.length+encounter.types.length>this.maxEnemies)return;const spawned=this.spawnPack(encounter,true);this.spawnWait=Math.max(this.spawnWait,5.5);this.currentEncounter={id:`minute-${encounter.minute}`,title:encounter.title,sigil:encounter.sigil,omen:encounter.omen,time:8};discoverEncounter(this.chronicle,this.currentEncounter.id);this.feed(`<strong>${encounter.title}</strong> — ${encounter.omen}`,true);this.events.onEncounter?.(this.currentEncounter,spawned);this.events.onDiscovery?.(this.snapshot());this.cameraShake=Math.max(this.cameraShake,.24);this.audio.bell(encounter.minute+4);
  }

  loop(){this.animationFrame=requestAnimationFrame(()=>this.loop());const dt=Math.min(.05,this.clock.getDelta());if(this.running&&!this.paused&&!this.modalPaused&&!this.ended)this.update(dt);this.render(performance.now())}

  update(dt){
    this.elapsed+=dt;const progress=this.elapsed/TOTAL_TIME;if(this.elapsed>=TOTAL_TIME){this.end(true);return}
    this.spawnWait-=dt;if(this.currentEncounter){this.currentEncounter.time-=dt;if(this.currentEncounter.time<=0)this.currentEncounter=null}
    if(this.spawnWait<=0&&this.enemies.length<this.maxEnemies){const living=this.units.filter((unit)=>unit.alive),backliners=living.filter((unit)=>unit.role==='support'||unit.role==='artillery').length,averageHealth=living.length?living.reduce((total,unit)=>total+unit.hp/unit.maxHp,0)/living.length:0;this.spawnPack(chooseSpawnPack(progress,{livingCount:living.length,backlineShare:living.length?backliners/living.length:0,averageHealth,zoneCount:this.zones.length,enemyCount:this.enemies.length}));const companyStrain=living.length<=2?1.4:averageHealth<.45?1.2:1;this.spawnWait=Math.max(2,6.75-progress*2.95)*(Math.random()*.28+.88)*companyStrain*lawProduct(this.graveLaws,'run','spawnInterval')}
    if(this.arrivalIndex<this.arrivalTimes.length&&this.elapsed>=this.arrivalTimes[this.arrivalIndex]){this.addUnit(generateOathbound(this.units.map((unit)=>unit.name),this.arrivalIndex+1,this.units.map((unit)=>unit.archetype)));this.arrivalIndex+=1}
    const bell=Math.floor(this.elapsed/60);
    if(bell>this.lastBell){
      this.lastBell=bell;const benediction=BELL_BENEDICTIONS[bell];
      this.units.filter((unit)=>unit.alive).forEach((unit)=>{
        unit.shield+=unit.mods.startShield+unit.maxHp*(.03+(benediction?.shield||0)+lawSum(this.graveLaws,'run','bellShield'));
        unit.hp=Math.min(unit.maxHp,unit.hp+unit.maxHp*(.2+(benediction?.heal||0))*lawProduct(this.graveLaws,'run','bellHeal'));
        unit.ap=Math.min(unit.maxAp,unit.ap+unit.maxAp*(.3+(benediction?.ap||0)));
        this.effects.push(createBurst(this.scene,unit.x,unit.y,benediction?0xe0b45c:0xd5a25c,benediction ? .6 : .42));
      });
      this.audio.bell(bell);this.arena.pulse?.(bell);this.arena.setBell?.(bell);this.feed(benediction?`<strong>${benediction.title}</strong> — ${benediction.omen}`:'The bell rekindles every unbroken oath.',!!benediction);this.triggerEncounter(getBellEncounter(bell));if(benediction)this.events.onMilestone?.(benediction,this.snapshot());
    }
    if(this.elapsed>=this.nextUpgrade&&this.nextUpgrade<TOTAL_TIME){this.nextUpgrade+=60;this.openUpgrade();return}
    this.updateDeferred(dt);this.updateZones(dt);this.updateHeroes(dt);this.updateEnemies(dt);this.updateEffects(dt);this.cleanup();
    if(!this.units.some((unit)=>unit.alive)){this.end(false);return}
    if(this.elapsed-this.lastHud>.1){this.lastHud=this.elapsed;this.events.onHud?.(this.snapshot())}
    if(this.elapsed-this.lastOmen>22){this.lastOmen=this.elapsed;const omens=['Iron tastes sweet in the fog.','Something vast shifts below the stones.','The candles bend toward the east.','No bell rope moves, yet bronze is singing.','The dead have learned the company’s names.','A ribcage runs where no dog remains.','The ink on the Blood Book is still wet.','A second moon appears in a shield’s reflection.'];this.feed(omens[Math.floor(Math.random()*omens.length)])}
  }

  updateHeroes(dt){
    const livingEnemies=this.enemies.filter((enemy)=>enemy.alive);const livingUnits=this.units.filter((unit)=>unit.alive);const now=performance.now();
    for(const unit of livingUnits){
      unit.status.slow=Math.max(0,(unit.status.slow||0)-dt);unit.status.riposte=Math.max(0,(unit.status.riposte||0)-dt);unit.status.haste=Math.max(0,(unit.status.haste||0)-dt);
      const haste=unit.status.haste>0?1.22:1;const desperation=unit.hp/unit.maxHp<.35?1+unit.mods.lowHpAp:1;const companyResolve=1+Math.max(0,3-livingUnits.length)*.1;unit.ap=Math.min(unit.maxAp,unit.ap+unit.apRegen*haste*desperation*companyResolve*dt);unit.abilities.forEach((ability)=>ability.cooldownLeft=Math.max(0,ability.cooldownLeft-dt));
      updateHeroMovement(unit,dt,{enemies:livingEnemies,allies:livingUnits,time:now});this.updateOrbit(unit,dt,livingEnemies);
      const ability=unit.abilities[unit.abilityCursor];if(!ability)continue;const cost=ability.cost*unit.mods.cost;if(unit.ap+1e-6<cost||ability.cooldownLeft>0)continue;
      if(!this.canCast(unit,ability,livingEnemies,livingUnits))continue;
      const slot=unit.abilityCursor;const casted=this.cast(unit,ability,slot,1,false);if(!casted)continue;
      unit.ap-=cost;ability.cooldownLeft=ability.cooldown*unit.mods.cooldown;unit.abilityCursor=(unit.abilityCursor+1)%unit.abilities.length;unit.casts+=1;unit.lastAbilityKind=ability.kind;unit.lastAbilityCategory=ability.category||ability.kind;unit.mesh.userData.castPulse=1;
      if(unit.mods.barrierPerCast>0)unit.shield+=unit.mods.barrierPerCast;if(unit.mods.healEvery&&unit.casts%unit.mods.healEvery===0)this.heal(unit,unit.maxHp*unit.mods.healEveryPower,false);
      if(Math.random()<unit.mods.echoChance)this.deferred.push({timer:.12,type:'echo',unitId:unit.id,ability,slot,power:unit.mods.echoPower});
      this.audio.tone(SUPPORT_KINDS.has(ability.kind)?330:MELEE_KINDS.has(ability.kind)?155:215,.1,.05,SUPPORT_KINDS.has(ability.kind)?'sine':'triangle',MELEE_KINDS.has(ability.kind)?1.5:.65);
    }
  }

  canCast(unit,ability,enemies,allies){
    if(SELF_CAST_KINDS.has(ability.kind)||ability.kind==='pulse'||ability.kind==='nova')return true;
    if(SUPPORT_KINDS.has(ability.kind)){const target=chooseSupportTarget(unit,allies);return !!target&&distance(unit,target)<=abilityTacticalRange(unit,ability)}
    const target=chooseHeroTarget(unit,enemies,allies,ability);return !!target&&distance(unit,target)<=abilityTacticalRange(unit,ability);
  }

  cast(unit,ability,slot,powerScale=1,isEcho=false){
    const living=this.enemies.filter((enemy)=>enemy.alive);const allies=this.units.filter((ally)=>ally.alive);let target=null;
    const partyAura=allies.reduce((sum,ally)=>sum+ally.mods.auraDamage,0);let castMultiplier=unit.mods.damage*powerScale*(1+partyAura);
    if(slot===0)castMultiplier*=unit.mods.opener;if(slot===unit.abilities.length-1)castMultiplier*=unit.mods.closer;unit.alternating=!unit.alternating;if(unit.alternating)castMultiplier*=unit.mods.alternating;if((unit.casts+1)%3===0)castMultiplier*=unit.mods.everyThird;if(unit.hp/unit.maxHp<.35)castMultiplier*=unit.mods.lowHpDamage;
    if(unit.mods.afterSupportReady&&!SUPPORT_KINDS.has(ability.kind)){castMultiplier*=unit.mods.afterSupport;unit.mods.afterSupportReady=false}
    const abilityCategory=ability.category||ability.kind;if(unit.lastAbilityCategory&&abilityCategory!==unit.lastAbilityCategory)castMultiplier*=1+unit.mods.weaveDamage;
    if(MELEE_KINDS.has(ability.kind)&&unit.momentumTime>1){castMultiplier*=1+unit.mods.momentumDamage;unit.momentumTime=0}
    if((abilityCategory==='ranged'||ZONE_KINDS.has(ability.kind))&&unit.stillTime>1.15)castMultiplier*=1+unit.mods.aimDamage*Math.min(1,unit.stillTime/3);
    if(MELEE_KINDS.has(ability.kind))castMultiplier*=unit.mods.meleeDamage;else if(!SUPPORT_KINDS.has(ability.kind)&&!ZONE_KINDS.has(ability.kind))castMultiplier*=unit.mods.rangedDamage;if(ZONE_KINDS.has(ability.kind))castMultiplier*=unit.mods.zonePower;

    if(ability.kind==='heal'||ability.kind==='ward'||ability.kind==='transfusion'){
      const ally=chooseSupportTarget(unit,allies);if(!ally||distance(unit,ally)>abilityTacticalRange(unit,ability))return false;
      if(ability.kind==='heal'){this.heal(ally,ability.power*unit.mods.healing*powerScale,true);this.effects.push(createParticleBurst(this.scene,ally.x,ally.y,ability.color,10,.75))}
      if(ability.kind==='ward'){const amount=ability.power*unit.mods.ward*powerScale;ally.shield+=amount;this.effects.push(createBurst(this.scene,ally.x,ally.y,ability.color,.7));this.effects.push(createFloatingText(this.scene,`+${Math.round(amount)} WARD`,ally.x,ally.y,'#8f9bcc'));this.audio.ward()}
      if(ability.kind==='transfusion'){const payment=Math.min(unit.hp-1,Math.max(3,unit.maxHp*.055));unit.hp-=Math.max(0,payment);this.heal(ally,ability.power*unit.mods.healing*powerScale+payment*.8,true);ally.status.haste=Math.max(ally.status.haste||0,2.8);this.effects.push(createBeam(this.scene,unit,ally,ability.color,.4))}
      unit.mods.afterSupportReady=true;return true;
    }
    if(ability.kind==='riposte'){unit.status.riposte=4.2;unit.status.ripostePower=ability.power*castMultiplier;unit.shield+=ability.power*.18;this.effects.push(createSlashArc(this.scene,unit.x,unit.y,ability.color,1.1,Math.PI*2));return true}
    if(ability.kind==='orbit'){unit.orbitCharges=Math.min(7,(unit.orbitCharges||0)+3);unit.orbitPower=ability.power*castMultiplier;unit.orbitDuration=ability.duration;this.effects.push(createBurst(this.scene,unit.x,unit.y,ability.color,1));return true}
    if(ability.kind==='sanctuary'){this.addZone({kind:'sanctuary',x:unit.x,y:unit.y,radius:ability.radius*(1+(unit.mods.zonePower-1)*.35),duration:ability.duration,power:ability.power*castMultiplier,sourceId:unit.id,followOwnerId:unit.id,color:ability.color});return true}
    if(ability.kind==='trap'){this.addZone({kind:'trap',x:unit.x,y:unit.y,radius:ability.radius*(1+(unit.mods.zonePower-1)*.35),duration:ability.duration,power:ability.power*castMultiplier,sourceId:unit.id,color:ability.color});return true}

    const tacticalRange=abilityTacticalRange(unit,ability);const inRange=living.filter((enemy)=>distance(unit,enemy)<=tacticalRange);target=chooseHeroTarget(unit,inRange,allies,ability);if(!target&&ability.kind!=='nova'&&ability.kind!=='pulse')return false;
    if(MELEE_KINDS.has(ability.kind)&&target)beginHeroLunge(unit,target,ability.kind);
    const hit=(victim,scale=1,flags={})=>{
      if(!victim?.alive)return;let multiplier=castMultiplier*scale;if(victim.hp/victim.maxHp>.8)multiplier*=unit.mods.fullHpDamage;if(victim.status.brittle>0&&ability.kind==='frost')multiplier*=1.55;
      const critical=Math.random()<unit.mods.critChance;if(critical)multiplier*=unit.mods.critPower;const amount=ability.power*multiplier;this.damageEnemy(victim,amount,unit,critical,flags);
      if(unit.mods.slow>0){victim.status.slow=Math.max(victim.status.slow,1.2*unit.mods.statusPower);victim.status.slowPower=Math.min(.65,unit.mods.slow)}
      if(ability.kind==='burn'){victim.status.burn=3.2*unit.mods.statusPower;victim.status.burnDps=Math.max(victim.status.burnDps,amount*.18*unit.mods.statusPower);victim.status.burnSourceId=unit.id}
      if(ability.kind==='frost'){if(victim.status.brittle>0)this.effects.push(createParticleBurst(this.scene,victim.x,victim.y,0xaec9dd,15,1));victim.status.slow=2.3*unit.mods.statusPower;victim.status.slowPower=Math.max(victim.status.slowPower||0,.4);victim.status.brittle=4.5*unit.mods.statusPower}
      if(ability.kind==='curse'){victim.status.curse=8*unit.mods.statusPower;victim.status.cursePower=amount*.85;victim.status.curseSourceId=unit.id}
      if(critical&&unit.mods.critBleed>0){victim.status.bleed=Math.max(victim.status.bleed,3);victim.status.bleedDps=Math.max(victim.status.bleedDps,amount*unit.mods.critBleed/3);victim.status.bleedSourceId=unit.id}
      if(ability.kind==='strike')victim.status.armorBreak=Math.max(victim.status.armorBreak,4.5);
      this.effects.push(createHitSpark(this.scene,victim.x,victim.y,ability.color,critical?1.4:1));
    };

    if(ability.kind==='cleave'||ability.kind==='reap'||ability.kind==='nova'||ability.kind==='pulse'){
      const center=ability.kind==='cleave'||ability.kind==='reap'?unit:unit;const radius=(ability.radius||2.2)*(1+(unit.mods.zonePower-1)*.18);living.filter((enemy)=>distance(enemy,center)<=radius).forEach((enemy)=>{hit(enemy,1);if(ability.kind==='reap'){enemy.status.bleed=4.2*unit.mods.statusPower;enemy.status.bleedDps=Math.max(enemy.status.bleedDps,ability.power*.16*castMultiplier*unit.mods.statusPower);enemy.status.bleedSourceId=unit.id}});this.effects.push(createSlashArc(this.scene,center.x,center.y,ability.color,radius,ability.kind==='cleave'?Math.PI*1.45:Math.PI*1.85));
      if(ability.kind==='pulse')allies.filter((ally)=>distance(ally,unit)<=radius).forEach((ally)=>this.heal(ally,ability.power*.42*unit.mods.healing*powerScale,false));
    } else if(ability.kind==='bash'){
      hit(target);const away={x:target.x-unit.x,y:target.y-unit.y};const len=Math.hypot(away.x,away.y)||1;target.status.stun=Math.max(target.status.stun,1.15*unit.mods.statusPower);target.status.knockback=.28;target.status.knockbackX=away.x/len*1.8;target.status.knockbackY=away.y/len*1.8;this.effects.push(createSlashArc(this.scene,target.x,target.y,ability.color,1.1,Math.PI*.7));
    } else if(ability.kind==='pierce'){
      hit(target);living.filter((enemy)=>enemy!==target&&pointToSegmentDistance(enemy,unit,target)<.42&&distance(unit,enemy)<=ability.range).forEach((enemy)=>hit(enemy,.62));this.effects.push(createBeam(this.scene,unit,target,ability.color,.22));
    } else if(ability.kind==='beam'){
      living.filter((enemy)=>pointToSegmentDistance(enemy,unit,target)<.48&&distance(unit,enemy)<=ability.range).forEach((enemy)=>hit(enemy));this.effects.push(createBeam(this.scene,unit,target,ability.color,.46));
    } else if(ability.kind==='delayed'){
      const telegraph=createTelegraph(this.scene,target.x,target.y,ability.color,ability.radius);this.deferred.push({timer:1.15,type:'blast',x:target.x,y:target.y,radius:ability.radius*(1+(unit.mods.zonePower-1)*.3),power:ability.power*castMultiplier,unitId:unit.id,color:ability.color,telegraph});
    } else if(ability.kind==='vortex'){
      this.addZone({kind:'vortex',x:target.x,y:target.y,radius:ability.radius*(1+(unit.mods.zonePower-1)*.35),duration:ability.duration,power:ability.power*castMultiplier,sourceId:unit.id,color:ability.color});
    } else {
      hit(target);if(ability.kind==='hook'){const dx=unit.x-target.x,dy=unit.y-target.y,len=Math.hypot(dx,dy)||1;target.x+=dx/len*1.5;target.y+=dy/len*1.5;target.status.stun=Math.max(target.status.stun,.35)}
      if(ability.kind==='dash'||ability.kind==='pounce')this.effects.push(createAfterimage(this.scene,unit.x,unit.y,unit.color));
      if(MELEE_KINDS.has(ability.kind))this.effects.push(createSlashArc(this.scene,target.x,target.y,ability.color,1,Math.PI*.9));else this.effects.push(createProjectile(this.scene,unit,target,ability.color,ability.kind==='grave-lantern'?.13:.075));
    }
    if(target&&Math.random()<unit.mods.chainChance){const chain=living.filter((enemy)=>enemy!==target&&enemy.alive).sort((a,b)=>distance(target,a)-distance(target,b))[0];if(chain)hit(chain,unit.mods.chainPower)}
    if(isEcho)this.effects.push(createFloatingText(this.scene,'ECHO',unit.x,unit.y,'#d6504f'));
    return true;
  }

  addZone(data){const zone={...data,id:this.nextEntityId++,tick:0,visual:null};zone.visual=createZoneVisual(this.scene,zone);this.zones.push(zone);return zone}

  updateZones(dt){
    for(const zone of this.zones){zone.duration-=dt;zone.tick-=dt;const source=this.units.find((unit)=>unit.id===zone.sourceId);if(zone.followOwnerId&&source?.alive){zone.x=source.x;zone.y=source.y}zone.visual?.update(dt,zone);
      if(zone.tick>0)continue;zone.tick=zone.kind==='vortex'?.18:.38;
      if(zone.kind==='sanctuary'){this.units.filter((unit)=>unit.alive&&distance(unit,zone)<=zone.radius).forEach((unit)=>this.heal(unit,zone.power*.055,false));this.enemies.filter((enemy)=>enemy.alive&&distance(enemy,zone)<=zone.radius).forEach((enemy)=>this.damageEnemy(enemy,zone.power*.075,source,false,{quiet:true}))}
      if(zone.kind==='vortex'){this.enemies.filter((enemy)=>enemy.alive&&distance(enemy,zone)<=zone.radius).forEach((enemy)=>{const dx=zone.x-enemy.x,dy=zone.y-enemy.y,len=Math.hypot(dx,dy)||1;enemy.x+=dx/len*.13;enemy.y+=dy/len*.13;this.damageEnemy(enemy,zone.power*.045,source,false,{quiet:true})})}
      if(zone.kind==='trap'){this.enemies.filter((enemy)=>enemy.alive&&distance(enemy,zone)<=zone.radius).forEach((enemy)=>{enemy.status.slow=Math.max(enemy.status.slow,.8);enemy.status.slowPower=Math.max(enemy.status.slowPower,.45);enemy.status.bleed=Math.max(enemy.status.bleed,2);enemy.status.bleedDps=Math.max(enemy.status.bleedDps,zone.power*.18);enemy.status.bleedSourceId=source?.id})}
      if(source?.alive&&source.mods.zoneWard>0)this.units.filter((unit)=>unit.alive&&distance(unit,zone)<=zone.radius).forEach((unit)=>{unit.shield+=zone.power*source.mods.zoneWard*(zone.kind==='vortex'?.018:.035)});
    }
    this.zones=this.zones.filter((zone)=>{if(zone.duration>0)return true;zone.visual?.destroy();return false});
  }

  updateDeferred(dt){
    for(const action of this.deferred){action.timer-=dt;action.telegraph?.update?.(dt,action)}
    const ready=this.deferred.filter((action)=>action.timer<=0);this.deferred=this.deferred.filter((action)=>action.timer>0);
    ready.forEach((action)=>{const unit=this.units.find((item)=>item.id===action.unitId&&item.alive);if(action.type==='echo'&&unit)this.cast(unit,action.ability,action.slot,action.power,true);if(action.type==='blast'){action.telegraph?.destroy?.();this.enemies.filter((enemy)=>enemy.alive&&distance(enemy,action)<=action.radius).forEach((enemy)=>this.damageEnemy(enemy,action.power,unit,Math.random()<.08));this.effects.push(createParticleBurst(this.scene,action.x,action.y,action.color,28,action.radius));this.effects.push(createBurst(this.scene,action.x,action.y,action.color,action.radius/2));this.cameraShake=Math.max(this.cameraShake,.22);this.audio.bell(3)}});
  }

  updateOrbit(unit,dt,enemies){
    if(!unit.orbitCharges)return;unit.orbitDuration-=dt;unit.orbitTimer-=dt;if(unit.orbitDuration<=0){unit.orbitCharges=0;return}if(unit.orbitTimer>0)return;unit.orbitTimer=.42;
    const target=enemies.filter((enemy)=>enemy.alive&&distance(unit,enemy)<3).sort((a,b)=>distance(unit,a)-distance(unit,b))[0];if(!target)return;unit.orbitCharges-=1;this.damageEnemy(target,unit.orbitPower,unit,false);this.effects.push(createProjectile(this.scene,unit,target,0xd8c8ad,.09));
  }

  damageEnemy(enemy,amount,source,critical=false,flags={}){
    if(!enemy?.alive||amount<=0)return 0;if(enemy.dodge>0&&Math.random()<enemy.dodge){if(!flags.quiet){this.effects.push(createFloatingText(this.scene,'HOLLOW',enemy.x,enemy.y,'#8e9dc9'));this.effects.push(createAfterimage(this.scene,enemy.x,enemy.y,'#707faa'))}return 0}
    const armorFactor=enemy.template.armored&&enemy.status.armorBreak<=0?.86:1;amount*=armorFactor;const linked=enemy.linkedGuard>0&&this.enemies.some((other)=>other!==enemy&&other.alive&&other.linkedGuard>0&&distance(enemy,other)<(enemy.affixAuraRadius||3.5));if(linked)amount*=1-enemy.linkedGuard;const cohortLeader=enemy.cohortLeaderId&&enemy.cohortLeaderId!==enemy.id?this.enemies.find((other)=>other.alive&&other.id===enemy.cohortLeaderId&&distance(enemy,other)<3.4):null;if(cohortLeader)amount*=.93;const closeExposure=source&&distance(source,enemy)<1.8?source.mods.closeGuard:0;amount*=1+closeExposure;
    let remaining=amount;if(enemy.shield>0){const absorbed=Math.min(enemy.shield,remaining);enemy.shield-=absorbed;remaining-=absorbed}enemy.hp-=remaining;if(enemy.wardOnHit>0&&enemy.alive&&enemy.wardHitCooldown<=0){enemy.shield+=enemy.maxHp*enemy.wardOnHit;enemy.wardHitCooldown=.72}
    if(source?.mods?.lifesteal)this.heal(source,remaining*source.mods.lifesteal,false);if(!flags.quiet)this.effects.push(createFloatingText(this.scene,`${critical?'✧ ':''}${Math.round(remaining)}`,enemy.x,enemy.y,critical?'#f0b85f':'#dfd4bf'));
    if(source&&enemy.hp/enemy.maxHp<=source.mods.execute)enemy.hp=0;if(enemy.hp<=0)this.killEnemy(enemy,source);
    return remaining;
  }

  killEnemy(enemy,source){
    if(!enemy.alive)return;enemy.alive=false;enemy.intentEffect?.cancel?.();enemy.intentEffect=null;if(source){source.kills+=1;source.ap=Math.min(source.maxAp,source.ap+source.mods.killAp);this.heal(source,source.mods.killHeal,false)}this.killCount+=enemy.template.score*(1+enemy.affixes.length);
    const tithe=lawSum(this.graveLaws,'run','onKillHeal');if(tithe>0){const weakest=this.units.filter((unit)=>unit.alive).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(weakest)this.heal(weakest,weakest.maxHp*tithe,false)}
    if(source?.mods?.plagueSpread>0&&(enemy.status.burn>0||enemy.status.bleed>0||enemy.status.brittle>0)){const spread=source.mods.plagueSpread;this.enemies.filter((other)=>other.alive&&other!==enemy&&distance(enemy,other)<2.4).forEach((other)=>{if(enemy.status.burn>0){other.status.burn=Math.max(other.status.burn,enemy.status.burn*.55);other.status.burnDps=Math.max(other.status.burnDps,enemy.status.burnDps*spread);other.status.burnSourceId=source.id}if(enemy.status.bleed>0){other.status.bleed=Math.max(other.status.bleed,enemy.status.bleed*.55);other.status.bleedDps=Math.max(other.status.bleedDps,enemy.status.bleedDps*spread);other.status.bleedSourceId=source.id}if(enemy.status.brittle>0)other.status.brittle=Math.max(other.status.brittle,enemy.status.brittle*.55)});this.effects.push(createParticleBurst(this.scene,enemy.x,enemy.y,0x8c775f,11,1.25))}
    if(enemy.status.curse>0){const curseSource=this.units.find((unit)=>unit.id===enemy.status.curseSourceId&&unit.alive)||source;this.enemies.filter((other)=>other.alive&&other!==enemy&&distance(enemy,other)<2.3).forEach((other)=>{this.damageEnemy(other,enemy.status.cursePower,curseSource,false);other.status.curse=Math.max(other.status.curse,4);other.status.cursePower=enemy.status.cursePower*.65;other.status.curseSourceId=curseSource?.id});this.effects.push(createParticleBurst(this.scene,enemy.x,enemy.y,0x9a66a7,16,1.7))}
    if(enemy.deathBurst>0){const blast=enemy.maxHp*enemy.deathBurst;this.units.filter((unit)=>unit.alive&&distance(enemy,unit)<2.75).forEach((unit)=>this.damageHero(unit,blast,enemy));this.effects.push(createParticleBurst(this.scene,enemy.x,enemy.y,enemy.affixColor,26,2.25));this.effects.push(createBurst(this.scene,enemy.x,enemy.y,enemy.affixColor,2));this.cameraShake=Math.max(this.cameraShake,.18)}
    if(enemy.template.splits){for(let i=0;i<enemy.template.splits;i+=1){const angle=i/enemy.template.splits*Math.PI*2;this.spawnEnemy('thrall',{x:enemy.x+Math.cos(angle)*.45,y:enemy.y+Math.sin(angle)*.45},[])}}
    if(enemy.elite)this.feed(`<strong>${enemy.name}</strong> is broken.`,true);
    this.effects.push(createParticleBurst(this.scene,enemy.x,enemy.y,0xb8aa95,8,.8));this.effects.push(createBurst(this.scene,enemy.x,enemy.y,0xb74147,.9));this.effects.push(createCorpseDecal(this.scene,enemy.x,enemy.y,enemy.type));this.audio.tone(72,.12,.055,'sawtooth');
  }

  heal(unit,amount,show=true){if(!unit?.alive||amount<=0)return;const missing=Math.max(0,unit.maxHp-unit.hp);const actual=Math.min(amount,missing);const overflow=Math.max(0,amount-actual);unit.hp=Math.min(unit.maxHp,unit.hp+amount);if(overflow>0&&unit.mods.overhealWard>0)unit.shield+=overflow*unit.mods.overhealWard;if(show&&actual>.2)this.effects.push(createFloatingText(this.scene,`+${Math.round(actual)}`,unit.x,unit.y,'#e3d89f'))}

  updateEnemies(dt){
    const livingUnits=this.units.filter((unit)=>unit.alive);if(!livingUnits.length)return;const now=performance.now();
    for(const enemy of this.enemies){
      if(!enemy.alive)continue;this.tickEnemyStatuses(enemy,dt);if(!enemy.alive)continue;
      enemy.wardHitCooldown=Math.max(0,enemy.wardHitCooldown-dt);const standardBoost=this.enemies.some((other)=>other.alive&&other.template.standard&&distance(enemy,other)<4.2)?1.16:1;enemy.ap=Math.min(enemy.maxAp,enemy.ap+enemy.apRegen*standardBoost*dt);enemy.auraTimer-=dt;enemy.specialTimer-=dt;
      if(enemy.attackWindup>0){if(enemy.status.stun>0){enemy.attackWindup=0;enemy.pendingTargetId=null;enemy.intentEffect?.cancel?.();enemy.intentEffect=null;this.effects.push(createFloatingText(this.scene,'INTERRUPTED',enemy.x,enemy.y,'#d7c88f'));this.effects.push(createBurst(this.scene,enemy.x,enemy.y,0xd7c88f,.55));continue}enemy.attackWindup-=dt;enemy.vx*=.72;enemy.vy*=.72;enemy.x+=enemy.vx*dt;enemy.y+=enemy.vy*dt;enemy.aiState=enemy.template.ranged?'Drawing the shot':enemy.template.cleave?'Gathering a sweep':'Raising the blade';if(enemy.attackWindup<=0){const intended=livingUnits.find((unit)=>unit.id===enemy.pendingTargetId&&unit.alive),inReach=intended&&distance(enemy,intended)<=enemy.range+(enemy.template.ranged?1.1:.45),moved=intended?Math.hypot(intended.x-enemy.pendingTargetX,intended.y-enemy.pendingTargetY):Infinity;if(inReach&&(!enemy.template.ranged||moved<.82))this.enemyAttack(enemy,intended);else if(intended){this.effects.push(createFloatingText(this.scene,'OUTREAD',intended.x,intended.y,'#aeb8c9'));this.effects.push(createAfterimage(this.scene,intended.x,intended.y,intended.color))}enemy.pendingTargetId=null;enemy.intentEffect=null}continue}
      if(enemy.apDrain>0){livingUnits.filter((unit)=>distance(enemy,unit)<enemy.affixAuraRadius).forEach((unit)=>{unit.ap=Math.max(0,unit.ap-enemy.apDrain*dt)});if(enemy.specialTimer<=0){this.effects.push(createParticleBurst(this.scene,enemy.x,enemy.y,enemy.affixColor,8,enemy.affixAuraRadius*.48));enemy.specialTimer=1.25}}
      const intent=updateEnemyMovement(enemy,dt,{units:livingUnits,enemies:this.enemies,time:now});if(enemy.justPhased){enemy.justPhased=false;this.effects.push(createAfterimage(this.scene,enemy.x,enemy.y,'#70799d'));this.effects.push(createBurst(this.scene,enemy.x,enemy.y,0x7f88aa,.75))}if(enemy.justBrokeCohort){enemy.justBrokeCohort=false;this.effects.push(createParticleBurst(this.scene,enemy.x,enemy.y,0xc75b4d,7,.72));if(enemy.cohortSlot===1)this.effects.push(createFloatingText(this.scene,'FILE BROKEN',enemy.x,enemy.y,'#d9a06b'))}if(!intent)continue;
      if((enemy.template.aura||enemy.template.bishop)&&enemy.auraTimer<=0&&enemy.ap>=enemy.attackCost){this.enemySupportCast(enemy);continue}
      const {target,dist}=intent;if(dist<=enemy.range&&enemy.ap>=enemy.attackCost){enemy.ap-=enemy.attackCost;const duration=enemy.template.giant?.92:enemy.template.cleave?.62:enemy.template.ranged?.48:.3;enemy.attackWindup=duration;enemy.pendingTargetId=target.id;enemy.pendingTargetX=target.x;enemy.pendingTargetY=target.y;enemy.intentEffect=createEnemyIntent(this.scene,enemy,{x:target.x,y:target.y},enemy.elite?enemy.affixColor:enemy.template.ranged?0x8b91b8:0xc4594f,duration);this.effects.push(enemy.intentEffect);}
    }
  }

  tickEnemyStatuses(enemy,dt){
    enemy.status.slow=Math.max(0,enemy.status.slow-dt);enemy.status.brittle=Math.max(0,enemy.status.brittle-dt);enemy.status.armorBreak=Math.max(0,enemy.status.armorBreak-dt);
    if(enemy.status.burn>0){enemy.status.burn-=dt;const source=this.units.find((unit)=>unit.id===enemy.status.burnSourceId);enemy.hp-=enemy.status.burnDps*dt;if(enemy.hp<=0)this.killEnemy(enemy,source)}
    if(enemy.alive&&enemy.status.bleed>0){enemy.status.bleed-=dt;const source=this.units.find((unit)=>unit.id===enemy.status.bleedSourceId);enemy.hp-=enemy.status.bleedDps*dt;if(enemy.hp<=0)this.killEnemy(enemy,source)}
    if(enemy.status.curse>0)enemy.status.curse-=dt;
  }

  enemySupportCast(enemy){
    enemy.ap-=enemy.attackCost;enemy.auraTimer=4.2+Math.random()*1.2;
    const nearby=this.enemies.filter((other)=>other.alive&&distance(enemy,other)<4);
    if(enemy.template.bishop){nearby.sort((a,b)=>a.shield-b.shield).slice(0,3).forEach((other)=>other.shield+=other.maxHp*.13);this.effects.push(createBurst(this.scene,enemy.x,enemy.y,0x9d72b2,1.8))}
    else {nearby.forEach((other)=>other.hp=Math.min(other.maxHp,other.hp+other.maxHp*.075));this.effects.push(createParticleBurst(this.scene,enemy.x,enemy.y,0x9d5cad,12,1.4))}
  }

  enemyAttack(enemy,target){
    let victims=1;if(enemy.template.cleave){const struck=this.units.filter((unit)=>unit.alive&&distance(enemy,unit)<enemy.range+1);victims=struck.length;struck.forEach((unit)=>this.damageHero(unit,enemy.damage,enemy));this.effects.push(createSlashArc(this.scene,enemy.x,enemy.y,0xb09a7d,2,Math.PI*1.5));this.cameraShake=Math.max(this.cameraShake,.12)}
    else {this.damageHero(target,enemy.damage,enemy);if(enemy.template.ranged){if(enemy.template.bishop)this.effects.push(createBeam(this.scene,enemy,target,0xa77ab2,.35));else this.effects.push(createProjectile(this.scene,enemy,target,0xbdb2a0,.07))}else this.effects.push(createSlashArc(this.scene,target.x,target.y,0x9e2d33,.75,Math.PI*.7))}
    if(enemy.lifeSteal>0)enemy.hp=Math.min(enemy.maxHp,enemy.hp+enemy.damage*enemy.lifeSteal*Math.max(1,victims*.7));
    this.audio.tone(enemy.template.giant?62:86,.08,enemy.template.giant?.05:.026,'square');
  }

  damageHero(unit,amount,source){
    if(!unit.alive)return;
    if(Math.random()<unit.mods.dodgeChance){this.effects.push(createFloatingText(this.scene,'EVADE',unit.x,unit.y,'#b8c5c1'));this.effects.push(createAfterimage(this.scene,unit.x,unit.y,unit.color));return}
    if(unit.status.riposte>0&&source?.alive&&distance(unit,source)<2){unit.status.riposte=0;amount*=.35;this.damageEnemy(source,unit.status.ripostePower||18,unit,true);this.effects.push(createSlashArc(this.scene,unit.x,unit.y,0xe45c5d,1.35,Math.PI*1.2));this.audio.blade()}
    if(distance(unit,source)<1.9&&unit.mods.closeGuard)amount*=Math.max(.7,1-unit.mods.closeGuard);
    const shieldBefore=unit.shield;let remaining=amount;
    if(unit.shield>0){const absorbed=Math.min(unit.shield,remaining);unit.shield-=absorbed;remaining-=absorbed}
    unit.hp-=remaining;
    if(shieldBefore>0&&unit.shield<=0&&unit.mods.wardBreakNova>0){const retaliation=unit.maxHp*unit.mods.wardBreakNova;this.enemies.filter((enemy)=>enemy.alive&&distance(unit,enemy)<2.4).forEach((enemy)=>this.damageEnemy(enemy,retaliation,unit,false));this.effects.push(createBurst(this.scene,unit.x,unit.y,0x8d95b5,1.6))}
    if(unit.mods.thorns>0&&source.alive){source.hp-=amount*unit.mods.thorns;if(source.hp<=0)this.killEnemy(source,unit)}
    this.effects.push(createFloatingText(this.scene,`−${Math.round(amount)}`,unit.x,unit.y,'#df5555'));this.effects.push(createHitSpark(this.scene,unit.x,unit.y,0xd94a4e,1));this.cameraShake=Math.max(this.cameraShake,.045);
    if(unit.hp<=0){unit.alive=false;unit.hp=0;unit.mesh.visible=false;this.feed(`<strong>${unit.name}</strong> is taken by the grave.`,true);this.effects.push(createParticleBurst(this.scene,unit.x,unit.y,0x8f2b35,20,1.5));const survivors=this.units.filter((ally)=>ally.alive);survivors.forEach((ally)=>{ally.shield+=ally.maxHp*.07;ally.ap=Math.min(ally.maxAp,ally.ap+ally.maxAp*.18);this.effects.push(createBurst(this.scene,ally.x,ally.y,0xd5a25c,.55))});if(survivors.length)this.feed('The remaining oaths tighten around the empty name.');this.events.onRoster?.(this.snapshot());const next=survivors[0];if(next)this.selectedId=next.id}
  }

  updateEffects(dt){this.effects=this.effects.filter((effect)=>{if(effect.update(dt)){effect.destroy();return false}return true})}
  cleanup(){this.enemies=this.enemies.filter((enemy)=>{if(enemy.alive)return true;this.scene.remove(enemy.mesh);enemy.mesh.traverse((child)=>{child.geometry?.dispose?.();if(child.material){if(Array.isArray(child.material))child.material.forEach((material)=>material.dispose());else child.material.dispose()}});return false})}

  openUpgrade(){this.modalPaused=true;const minimum=this.elapsed>900?1:0;const choices=getUpgradeChoices(3,minimum);this.events.onUpgrade?.(choices,this.snapshot());this.feed('A page tears itself from the Blood Book.',true)}
  applyUpgrade(upgrade,unitId){const unit=this.units.find((item)=>item.id===unitId&&item.alive);if(!unit)return null;upgrade.apply(unit);unit.hp=Math.min(unit.maxHp,unit.hp+unit.maxHp*.1);unit.shield+=unit.maxHp*.04;unit.ap=Math.min(unit.maxAp,unit.ap+unit.maxAp*.25);this.appliedUpgradeIds.add(upgrade.id);discoverRite(this.chronicle,upgrade.id);this.selectedId=unit.id;this.audio.bell(upgrade.rarity+2);this.effects.push(createParticleBurst(this.scene,unit.x,unit.y,0xd6504f,20,1.5));this.feed(`<strong>${unit.name}</strong> receives ${upgrade.shortName}; the binding rekindles flesh, ward, and will.`,true);const snapshot=this.snapshot();this.events.onRoster?.(snapshot);this.events.onHud?.(snapshot);this.events.onDiscovery?.(snapshot);return unit}
  reorderAbility(unitId,from,to){const unit=this.units.find((item)=>item.id===unitId);if(!unit||to<0||to>=unit.abilities.length)return;const [ability]=unit.abilities.splice(from,1);unit.abilities.splice(to,0,ability);unit.abilityCursor=0;this.events.onRoster?.(this.snapshot())}
  resumeAfterUpgrade(){this.modalPaused=false}
  feed(message,important=false){this.events.onFeed?.(message,important)}
  end(victory){if(this.ended)return;this.ended=true;this.running=false;this.audio.bell(victory?12:0);const result={victory,kills:this.killCount,upgrades:this.appliedUpgradeIds.size,units:this.units.filter((unit)=>unit.alive).length,elapsed:this.elapsed,lawIds:this.graveLaws.map((law)=>law.id)};recordRun(this.chronicle,result);this.events.onDiscovery?.(this.snapshot());this.events.onEnd?.({...result,chronicle:this.chronicle})}
  snapshot(){
    const progress=clamp(this.elapsed/TOTAL_TIME,0,1),livingEnemies=this.enemies.filter((enemy)=>enemy.alive),windups=livingEnemies.filter((enemy)=>enemy.attackWindup>0);
    return{elapsed:this.elapsed,remaining:Math.max(0,TOTAL_TIME-this.elapsed),progress,bell:Math.min(20,Math.floor(this.elapsed/60)+1),kills:this.killCount,selectedId:this.selectedId,paused:this.paused,upgradeCount:this.appliedUpgradeIds.size,codexSize:UPGRADE_CATALOG.length,abilityCount:24,originCount:12,enemyArchetypes:Object.keys(ENEMY_ARCHETYPES).length,enemyAffixes:ENEMY_AFFIXES.length,graveLawCount:GRAVE_LAWS.length,graveLaws:this.graveLaws,threat:Math.min(7,Math.floor(progress*7)+1),enemyCount:livingEnemies.length,eliteCount:livingEnemies.filter((enemy)=>enemy.elite).length,meleeIntents:windups.filter((enemy)=>!enemy.template.ranged).length,rangedIntents:windups.filter((enemy)=>enemy.template.ranged).length,supportCount:livingEnemies.filter((enemy)=>enemy.template.aura||enemy.template.bishop||enemy.template.standard).length,zoneCount:this.zones.length,currentEncounter:this.currentEncounter,chronicle:this.chronicle,units:this.units}
  }
  render(time){if(this.headless)return;this.arena.update(time,this.elapsed/TOTAL_TIME);this.units.forEach((unit)=>{if(unit.alive)updateEntityVisual(unit,unit.id===this.selectedId,time)});this.enemies.forEach((enemy)=>{if(enemy.alive)updateEntityVisual(enemy,false,time)});if(this.cameraShake>0){this.cameraShake=Math.max(0,this.cameraShake-.018);this.camera.position.x=(Math.random()-.5)*this.cameraShake;this.camera.position.y=(Math.random()-.5)*this.cameraShake}else{this.camera.position.x=0;this.camera.position.y=0}this.renderer.render(this.scene,this.camera)}
}
