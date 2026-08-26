import './styles.css';
import { Game, DIFFICULTY_PRESETS } from './game/Game.js';
import { RitualInterface } from './game/RitualInterface.js';
import {
  ABILITY_TEMPLATES,
  ENEMY_AFFIXES,
  ENEMY_ARCHETYPES,
  OATHBOUND_ORIGINS,
  UPGRADE_CATALOG
} from './game/catalog.js';
import { BELL_ENCOUNTERS } from './game/director.js';
import { GRAVE_LAWS } from './game/laws.js';

const stage=document.querySelector('#stage');
const accessibleStatus=document.querySelector('#accessible-status');
const accessibleControls=document.querySelector('#accessible-controls');
const encounterAnnouncer=document.querySelector('#encounter-announcer');
const feedAnnouncer=document.querySelector('#feed-announcer');
const stripMarkup=(value='')=>String(value).replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const pad=(value)=>String(value).padStart(2,'0');
const formatTime=(seconds)=>{const value=Math.max(0,Math.ceil(seconds));return `${pad(Math.floor(value/60))}:${pad(value%60)}`};

let game;
let hud;
let view='intro';
let returnFromArchive=null;
let latestSnapshot=null;
let difficultyLevel=4;
let upgradeChoices=[];
let upgradeUnitId=null;
let orderUnitId=null;
let outcome=null;
let soundEnabled=true;
let debugEnabled=false;
let archiveTab='graveborn';
let feed=[];
let encounter=null;
let a11ySignature='';

const catalogs={
  abilities:ABILITY_TEMPLATES,
  enemies:ENEMY_ARCHETYPES,
  affixes:ENEMY_AFFIXES,
  encounters:BELL_ENCOUNTERS,
  laws:GRAVE_LAWS,
  origins:OATHBOUND_ORIGINS,
  upgrades:UPGRADE_CATALOG
};

function selectedUnit(snapshot=latestSnapshot){
  return snapshot?.units?.find((unit)=>unit.id===snapshot.selectedId)
    ||snapshot?.units?.find((unit)=>unit.alive)
    ||null;
}

function buildUiState(snapshot=latestSnapshot||game.snapshot()){
  latestSnapshot=snapshot;
  return{
    view,
    snapshot,
    difficultyPresets:DIFFICULTY_PRESETS,
    difficultyLevel,
    upgradeChoices,
    upgradeUnitId,
    orderUnitId,
    outcome,
    soundEnabled,
    paused:snapshot.paused,
    debugEnabled,
    archiveTab,
    feed,
    encounter,
    archiveData:snapshot.chronicle,
    catalogs,
    camera:game.getCameraDebug?.()||null
  };
}

function sync(snapshot=latestSnapshot||game.snapshot()){
  const state=buildUiState(snapshot);
  hud.setView?.(view);
  hud.update(state);
  syncAccessibility(state);
}

function setView(next,snapshot=latestSnapshot||game.snapshot()){
  view=next;
  sync(snapshot);
}

function announceFeed(message){
  feedAnnouncer.textContent='';
  requestAnimationFrame(()=>{feedAnnouncer.textContent=message});
}

function addFeed(message,important=false){
  const text=stripMarkup(message);
  if(!text)return;
  feed=[{text,important,time:performance.now()},...feed].slice(0,7);
  hud?.pushFeed?.(text,important);
  announceFeed(text);
  if(hud)sync(latestSnapshot||game.snapshot());
}

function showEncounter(next){
  encounter={...next,shownAt:performance.now()};
  encounterAnnouncer.textContent=`${next.title}. ${next.omen}`;
  hud?.showEncounter?.(encounter);
  if(hud)sync(latestSnapshot||game.snapshot());
}

function openArchive(){
  if(view==='archive')return;
  returnFromArchive={view,modalPaused:game.modalPaused};
  game.setModalPaused(true);
  game.playUi();
  setView('archive');
}

function closeArchive(){
  if(view!=='archive')return;
  const previous=returnFromArchive||{view:game.running?'play':'intro',modalPaused:false};
  returnFromArchive=null;
  game.setModalPaused(previous.modalPaused);
  game.playUi();
  setView(previous.view);
}

function openOrderEditor(){
  const unit=selectedUnit();
  if(!unit?.alive||unit.abilities.length<2)return;
  orderUnitId=unit.id;
  game.setModalPaused(true);
  game.playUi();
  setView('order');
}

function closeOrderEditor(){
  if(view!=='order')return;
  orderUnitId=null;
  game.setModalPaused(false);
  game.playUi();
  setView('play');
}

function chooseUpgrade(index){
  const upgrade=typeof index==='object'?index:upgradeChoices[Number(index)];
  const unit=game.applyUpgrade(upgrade,upgradeUnitId);
  if(!unit)return;
  upgradeChoices=[];
  upgradeUnitId=null;
  game.resumeAfterUpgrade();
  game.playUi();
  setView('play',game.snapshot());
}

function claimNearestTreasure(){
  const waiting=game.treasures
    .filter((treasure)=>treasure.state==='waiting')
    .sort((a,b)=>Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y))[0];
  if(waiting)game.beginTreasurePickup(waiting);
}

function toggleDebug(force){
  debugEnabled=typeof force==='boolean'?force:!debugEnabled;
  hud.toggleDebug?.(debugEnabled);
  sync(latestSnapshot||game.snapshot());
  return debugEnabled;
}

const actions={
  start(){
    game.setDifficulty(difficultyLevel);
    game.playUi();
    game.start();
  },
  setDifficulty(level){
    difficultyLevel=clamp(Math.round(Number(level)||4),1,5);
    game.setDifficulty(difficultyLevel);
    game.playUi();
    sync(game.snapshot());
  },
  togglePause(){game.playUi();game.togglePause()},
  toggleSound(){
    soundEnabled=game.toggleSound();
    hud.setSound?.(soundEnabled);
    sync(latestSnapshot||game.snapshot());
    return soundEnabled;
  },
  toggleArchive(){view==='archive'?closeArchive():openArchive()},
  closeArchive,
  toggleDebug,
  selectUnit(id){game.selectUnit(Number(id));sync(game.snapshot())},
  inspectAbility(index){hud.setInspectedAbility?.(Number(index))},
  reorder:openOrderEditor,
  openOrder:openOrderEditor,
  chooseUpgrade,
  chooseUpgradeUnit(id){
    const unit=game.units.find((item)=>item.id===Number(id)&&item.alive);
    if(!unit)return;
    upgradeUnitId=unit.id;
    game.selectUnit(unit.id);
    game.playUi();
    sync(game.snapshot());
  },
  moveAbility(from,to){
    const unit=game.reorderAbility(orderUnitId,Number(from),Number(to));
    if(unit){game.playUi();sync(game.snapshot())}
  },
  closeModal(){
    if(view==='archive')closeArchive();
    else if(view==='order')closeOrderEditor();
  },
  restart(){window.location.reload()},
  fitCamera(){game.fitCamera?.();sync(latestSnapshot||game.snapshot())},
  resetCamera(){game.resetCamera?.();sync(latestSnapshot||game.snapshot())},
  toggleFollow(){game.toggleFollowSelected?.();sync(latestSnapshot||game.snapshot())},
  claimTreasure:claimNearestTreasure,
  setArchiveTab(next){archiveTab=String(next||'graveborn');sync(latestSnapshot||game.snapshot())}
};

game=new Game(stage,{
  onStart(){
    view='play';
    encounter=null;
    sync(game.snapshot());
  },
  onHud(snapshot){sync(snapshot)},
  onRoster(snapshot){sync(snapshot)},
  onFeed:addFeed,
  onEncounter:showEncounter,
  onMilestone:showEncounter,
  onDiscovery(snapshot){sync(snapshot)},
  onUpgrade(choices,snapshot){
    upgradeChoices=choices;
    upgradeUnitId=snapshot.units.find((unit)=>unit.id===snapshot.selectedId&&unit.alive)?.id
      ||snapshot.units.find((unit)=>unit.alive)?.id
      ||null;
    orderUnitId=null;
    setView('upgrade',snapshot);
  },
  onPause(paused){
    hud?.setPaused?.(paused);
    sync(game.snapshot());
  },
  onCamera(camera){
    if(hud)hud.update({camera});
  },
  onEnd(result){
    outcome=result;
    setView('outcome',game.snapshot());
  }
},{difficulty:difficultyLevel});

hud=new RitualInterface(game.renderer,{actions});
hud.setActions?.(actions);
game.setInterfaceLayer?.(hud);
latestSnapshot=game.snapshot();

function makeButton(label,action,value=null,disabled=false){
  const button=document.createElement('button');
  button.type='button';
  button.textContent=label;
  button.dataset.action=action;
  if(value!==null)button.dataset.value=String(value);
  button.disabled=disabled;
  return button;
}

function syncAccessibility(state){
  const {snapshot}=state;
  const living=snapshot.units.filter((unit)=>unit.alive);
  accessibleStatus.textContent=view==='intro'
    ?`The ritual is waiting. Difficulty ${difficultyLevel} of 5. Two grave laws are in force.`
    :view==='outcome'
      ?`${outcome?.victory?'Victory. Dawn remembers the company.':'Defeat. Every oathbound has fallen.'} ${snapshot.kills} remains broken.`
      :`${formatTime(snapshot.remaining)} remaining. Bell ${snapshot.bell}. ${living.length} oathbound alive, ${snapshot.enemyCount} graveborn present, ${snapshot.kills} remains broken.`;

  const selected=selectedUnit(snapshot);
  const signature=JSON.stringify({
    view,
    difficultyLevel,
    soundEnabled,
    paused:snapshot.paused,
    selected:snapshot.selectedId,
    units:snapshot.units.map((unit)=>[unit.id,unit.alive,unit.name,unit.abilities.map((ability)=>ability.id)]),
    upgrades:upgradeChoices.map((upgrade)=>upgrade.id),
    upgradeUnitId,
    orderUnitId,
    treasures:snapshot.treasureCount,
    outcome:outcome?.victory
  });
  if(signature===a11ySignature)return;
  a11ySignature=signature;
  accessibleControls.replaceChildren();

  if(view==='intro'){
    const label=document.createElement('label');
    label.textContent='Grave pressure difficulty';
    const input=document.createElement('input');
    input.type='range';
    input.min='1';
    input.max='5';
    input.step='1';
    input.value=String(difficultyLevel);
    input.dataset.action='setDifficulty';
    label.append(input);
    accessibleControls.append(label,makeButton('Strike the first bell','start'));
  }else if(view==='upgrade'){
    living.forEach((unit)=>accessibleControls.append(makeButton(`Select ${unit.name} as upgrade bearer`,'chooseUpgradeUnit',unit.id)));
    upgradeChoices.forEach((upgrade,index)=>accessibleControls.append(makeButton(`Bind ${upgrade.name}. ${upgrade.description}`,'chooseUpgrade',index)));
  }else if(view==='order'){
    const unit=game.units.find((item)=>item.id===orderUnitId);
    unit?.abilities.forEach((ability,index)=>{
      accessibleControls.append(
        makeButton(`Move ${ability.name} earlier`,'moveAbility',`${index},${index-1}`,index===0),
        makeButton(`Move ${ability.name} later`,'moveAbility',`${index},${index+1}`,index===unit.abilities.length-1)
      );
    });
    accessibleControls.append(makeButton('Return to the battle','closeModal'));
  }else if(view==='archive'){
    accessibleControls.append(makeButton('Close the Grave Archive','closeArchive'));
  }else if(view==='outcome'){
    accessibleControls.append(makeButton('Begin another company','restart'));
  }else{
    accessibleControls.append(
      makeButton(snapshot.paused?'Resume ritual':'Pause ritual','togglePause'),
      makeButton(soundEnabled?'Mute sound':'Enable sound','toggleSound'),
      makeButton('Open the Grave Archive','toggleArchive'),
      makeButton(debugEnabled?'Close field diagnostics':'Open field diagnostics','toggleDebug'),
      makeButton('Fit the entire arena in view','fitCamera'),
      makeButton('Reset the action camera','resetCamera')
    );
    living.forEach((unit)=>accessibleControls.append(makeButton(
      `Inspect ${unit.name}. Health ${Math.ceil(unit.hp)} of ${Math.ceil(unit.maxHp)}. AP ${Math.floor(unit.ap)} of ${Math.floor(unit.maxAp)}.`,
      'selectUnit',
      unit.id
    )));
    if(selected?.abilities.length>1)accessibleControls.append(makeButton(`Rewrite ${selected.name}'s ability order`,'reorder'));
    if(snapshot.treasureCount>0)accessibleControls.append(makeButton('Claim the nearest open reliquary','claimTreasure'));
  }
}

accessibleControls.addEventListener('input',(event)=>{
  if(event.target.dataset.action==='setDifficulty')actions.setDifficulty(event.target.value);
});

accessibleControls.addEventListener('click',(event)=>{
  const control=event.target.closest('[data-action]');
  if(!control)return;
  const action=actions[control.dataset.action];
  if(!action)return;
  if(control.dataset.action==='moveAbility'){
    const [from,to]=control.dataset.value.split(',').map(Number);
    action(from,to);
  }else if(control.dataset.value!==undefined)action(control.dataset.value);
  else action();
});

const canvas=game.renderer.domElement;
const blockingView=()=>view!=='play';
function routePointer(method,event){
  const consumed=Boolean(hud[method]?.(event));
  if(consumed||blockingView()){
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

canvas.addEventListener('pointermove',(event)=>routePointer('handlePointerMove',event),{capture:true});
canvas.addEventListener('pointerdown',(event)=>routePointer('handlePointerDown',event),{capture:true});
canvas.addEventListener('pointerup',(event)=>routePointer('handlePointerUp',event),{capture:true});
canvas.addEventListener('pointercancel',(event)=>routePointer('handlePointerCancel',event),{capture:true});
canvas.addEventListener('click',(event)=>routePointer('handleClick',event),{capture:true});
canvas.addEventListener('pointerleave',(event)=>hud.handlePointerMove?.(event),{capture:true});
canvas.addEventListener('wheel',(event)=>routePointer('handleWheel',event),{capture:true,passive:false});

window.addEventListener('keydown',(event)=>{
  const key=event.key.toLowerCase();
  if(event.key==='F3'||event.code==='Backquote'){
    event.preventDefault();
    event.stopImmediatePropagation();
    toggleDebug();
    return;
  }
  if(event.key==='Escape'){
    if(view==='archive')closeArchive();
    else if(view==='order')closeOrderEditor();
    else if(view==='play')game.togglePause();
    else return;
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  if(accessibleControls.contains(event.target))return;
  if(view==='play'&&key==='c'&&latestSnapshot?.treasureCount){
    claimNearestTreasure();
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  const consumed=Boolean(hud.handleKey?.(event));
  if(consumed||blockingView()){
    event.preventDefault();
    event.stopImmediatePropagation();
  }
},{capture:true});

window.addEventListener('beforeunload',()=>game.destroy(),{once:true});
window.__TWENTIETH_BELL__=game;
window.__TWENTIETH_BELL_UI__=hud;
window.__TWENTIETH_BELL_VIEW__=()=>buildUiState();
sync(latestSnapshot);
