import './styles.css';
import { Game } from './game/Game.js';
import { ABILITY_TEMPLATES, ENEMY_AFFIXES, ENEMY_ARCHETYPES, OATHBOUND_ORIGINS, UPGRADE_CATALOG } from './game/catalog.js';
import { BELL_ENCOUNTERS } from './game/director.js';
import { GRAVE_LAWS } from './game/laws.js';

const $ = (selector) => document.querySelector(selector);
const stage = $('#stage');
const shell = $('.shell');
const modal = $('#modal');
const modalBackdrop = $('#modal-backdrop');
const modalContent = $('#modal-content');
const roster = $('#roster');
const sequence = $('#sequence');
const abilityInspector = $('#ability-inspector');
const feed = $('#combat-feed');
const pausedSeal = $('#paused-seal');
const archive = $('#grave-archive');
const encounterBanner = $('#encounter-banner');
let latestSnapshot = null;
let upgradeUnitId = null;
let orderEditorOpen = false;
let archivePreviousModalPause = false;
let encounterTimer = 0;
let inspectedAbilityIndex = null;
let inspectedUnitId = null;

const abilityArtIndexes=new Map(ABILITY_TEMPLATES.map((ability,index)=>[ability.id,index]));
const enemyArtIndexes=new Map(Object.keys(ENEMY_ARCHETYPES).map((id,index)=>[id,index]));
const originArtIndexes=new Map(OATHBOUND_ORIGINS.map((origin,index)=>[origin.id,index]));
const atlasPosition=(index,columns,rows)=>{const column=index%columns,row=Math.floor(index/columns);return `--art-x:${columns===1?0:column/(columns-1)*100}%;--art-y:${rows===1?0:row/(rows-1)*100}%`};
const abilityArtStyle=(ability)=>atlasPosition(ability.artIndex??abilityArtIndexes.get(ability.id)??0,6,4);
const enemyArtStyle=(id)=>atlasPosition(enemyArtIndexes.get(id)??0,4,3);
const originArtStyle=(id)=>atlasPosition(originArtIndexes.get(id)??0,4,3);
const abilityArt=(ability,className='ability-art')=>`<span class="${className}" style="${abilityArtStyle(ability)}" role="img" aria-label="${ability.name}"></span>`;
const upgradeArtStyle=(upgrade)=>{const firstAtlas=upgrade.artIndex<25,localIndex=firstAtlas?upgrade.artIndex:upgrade.artIndex-25;return `${atlasPosition(localIndex,5,firstAtlas?5:4)};--rite-tier:${upgrade.rarity};--rite-inflection:${upgrade.inflectionIndex}`};
const upgradeArtClass=(upgrade)=>`upgrade-illustration upgrade-atlas-${upgrade.artIndex<25?'a':'b'} inflection-${upgrade.inflectionId} tier-${upgrade.rarity}`;
const enemyTactics={
  thrall:'A cheap rushing body.',hound:'Flanks isolated backliners.',pikeman:'Threatens through the front line.',bowman:'Retreats to maintain firing range.',harvester:'Sweeps several oathbound at once.',graveguard:'An armored anchor for the dead.',cantor:'Restores nearby graveborn.',standard:'Hastens the procession around it.',wraith:'Phases across unsafe ground.',bishop:'Wards the strongest nearby dead.',ossuary:'Breaks into fresh thralls.',giant:'A slow cleaving catastrophe.'
};

const pips = $('#threat-pips');
for (let i=0;i<7;i+=1) pips.insertAdjacentHTML('beforeend','<i></i>');

const pad = (number) => String(number).padStart(2,'0');
function formatTime(seconds) {
  const value=Math.max(0,Math.ceil(seconds));
  return `${pad(Math.floor(value/60))}:${pad(value%60)}`;
}

function bellName(bell) {
  if (bell <= 3) return 'THE WAKING';
  if (bell <= 7) return 'THE MUSTER';
  if (bell <= 11) return 'THE PRESS';
  if (bell <= 15) return 'THE DARKENING';
  if (bell <= 19) return 'THE LAST VIGIL';
  return 'THE TWENTIETH BELL';
}

function renderHud(snapshot) {
  latestSnapshot=snapshot;
  $('#clock').textContent=formatTime(snapshot.remaining);
  $('#clock-progress').style.width=`${snapshot.progress*100}%`;
  $('#clock-label').textContent=`BELL ${roman(snapshot.bell)} · ${bellName(snapshot.bell)}`;
  $('#kill-count').textContent=snapshot.kills;
  $('#unit-count').textContent=snapshot.units.filter((unit)=>unit.alive).length;
  $('#codex-count').textContent=`${snapshot.codexSize} rites · ${snapshot.upgradeCount} inscribed`;
  renderArchiveBadge(snapshot);
  [...pips.children].forEach((pip,index)=>pip.classList.toggle('is-lit',index<snapshot.threat));
  const livingCount=snapshot.units.filter((unit)=>unit.alive).length;$('#wave-inscription').textContent=snapshot.currentEncounter?.title||(snapshot.eliteCount>4?'THE CORRUPTED DEAD CONVENE':snapshot.elapsed>120&&livingCount<3?'THE LAST COMPANY QUICKENS':snapshot.zoneCount>2?'THE GROUND REMEMBERS EVERY RITE':snapshot.enemyCount>28?'THE GROUND CANNOT BE SEEN':snapshot.enemyCount>16?'THE OSSUARY OPENS':snapshot.enemyCount>6?'BONE ANSWERS BONE':'THE EARTH IS LISTENING');
  renderRoster(snapshot);
}

function renderArchiveBadge(snapshot){
  const chronicle=snapshot.chronicle;const known=(chronicle?.discoveredEnemies?.length||0)+(chronicle?.discoveredAffixes?.length||0)+(chronicle?.encounters?.length||0)+(chronicle?.discoveredLaws?.length||0)+(chronicle?.discoveredOrigins?.length||0);$('#archive-count').textContent=`${known}/${snapshot.enemyArchetypes+snapshot.enemyAffixes+BELL_ENCOUNTERS.length+GRAVE_LAWS.length+OATHBOUND_ORIGINS.length}`;
}

function renderGraveLaws(snapshot){
  if(!snapshot?.graveLaws)return;
  const lawColor=(law)=>`#${law.color.toString(16).padStart(6,'0')}`;
  $('#intro-laws').innerHTML=snapshot.graveLaws.map((law)=>`<article class="intro-law" style="--law-color:${lawColor(law)}"><span>${law.sigil}</span><div><strong>${law.name}</strong><p>${law.text}</p></div></article>`).join('');
  const pairKey=snapshot.graveLaws.map((law)=>law.id).sort().join('|'),record=snapshot.chronicle?.lawPairRecords?.[pairKey];$('#intro-law-record').textContent=record?`THIS PAIRING: ${record.runs} ${record.runs===1?'RITE':'RITES'} · ${record.wins} DAWNS · DEEPEST BELL ${roman(record.bestBell)}`:'THIS PAIRING HAS NOT YET BEEN ENDURED';
  $('#grave-law-strip').innerHTML=snapshot.graveLaws.map((law)=>`<div class="grave-law-chip" style="--law-color:${lawColor(law)}" title="${law.text}"><span>${law.sigil}</span><div><small>GRAVE LAW</small><strong>${law.shortName}</strong></div></div>`).join('');
}

function renderArchive(snapshot){
  if(!snapshot?.chronicle)return;const chronicle=snapshot.chronicle;renderArchiveBadge(snapshot);
  const stats=[['RUNS',chronicle.runs],['VICTORIES',chronicle.victories],['DEFEATS',chronicle.defeats],['DEEPEST BELL',roman(chronicle.bestBell)],['BEST TALLY',chronicle.bestTally]];
  $('#archive-run-stats').innerHTML=stats.map(([label,value])=>`<div class="archive-stat"><strong>${value}</strong><span>${label}</span></div>`).join('');
  const enemies=Object.entries(ENEMY_ARCHETYPES);$('#enemy-discovery-count').textContent=`${chronicle.discoveredEnemies.length} / ${enemies.length}`;
  $('#archive-enemies').innerHTML=enemies.map(([id,enemy])=>{const known=chronicle.discoveredEnemies.includes(id);return `<div class="archive-enemy ${known?'is-discovered':'is-locked'}"><span class="archive-glyph ${known?'enemy-art':''}" style="${known?enemyArtStyle(id):''}">${known?'':'?'}</span><div><strong>${known?enemy.name:'Unrecorded grave'}</strong><small>${known?enemyTactics[id]:'No surviving witness.'}</small></div></div>`}).join('');
  $('#encounter-discovery-count').textContent=`${chronicle.encounters.length} / ${BELL_ENCOUNTERS.length}`;
  $('#archive-encounters').innerHTML=BELL_ENCOUNTERS.map((encounter)=>{const known=chronicle.encounters.includes(`minute-${encounter.minute}`);return `<div class="archive-encounter ${known?'is-discovered':'is-locked'}"><span>${known?encounter.sigil:'?'}</span><div><small>BELL ${roman(encounter.minute)}</small><strong>${known?encounter.title:'An unheard procession'}</strong><p>${known?encounter.omen:'The ledger has no name for what comes.'}</p></div></div>`}).join('');
  $('#affix-discovery-count').textContent=`${chronicle.discoveredAffixes.length} / ${ENEMY_AFFIXES.length}`;
  $('#archive-affixes').innerHTML=ENEMY_AFFIXES.map((affix)=>{const known=chronicle.discoveredAffixes.includes(affix.id);return `<div class="archive-affix ${known?'':'is-locked'}" style="--affix-color:#${affix.color.toString(16).padStart(6,'0')}"><span>${known?affix.glyph:'?'}</span><strong>${known?affix.name:'Unwritten lineage'}</strong><p>${known?affix.detail:'Its corruption has not yet entered the ledger.'}</p></div>`}).join('');
  $('#law-discovery-count').textContent=`${chronicle.discoveredLaws.length} / ${GRAVE_LAWS.length}`;
  $('#archive-laws').innerHTML=GRAVE_LAWS.map((law)=>{const known=chronicle.discoveredLaws.includes(law.id),record=chronicle.lawRecords[law.id];return `<div class="archive-law ${known?'is-discovered':'is-locked'}" style="--law-color:#${law.color.toString(16).padStart(6,'0')}"><span>${known?law.sigil:'?'}</span><div><small>${known?'WORLD CONDITION':'UNREAD CLAUSE'}</small><strong>${known?law.name:'A law not yet suffered'}</strong><p>${known?law.text:'The archive cannot record a night it has not survived.'}</p>${known?`<em>${record?`${record.runs} rites · ${record.wins} dawns · bell ${roman(record.bestBell)}`:'Observed; no company yet concluded'}</em>`:''}</div></div>`}).join('');
  const pairRecords=Object.values(chronicle.lawPairRecords),pairDawns=pairRecords.filter((record)=>record.wins>0).length,pairPercent=Math.min(100,pairRecords.length/45*100);$('#archive-pair-progress').innerHTML=`<span>PAIRINGS ENDURED</span><strong>${pairRecords.length} / 45</strong><div><i style="width:${pairPercent}%"></i></div><small>${pairDawns} pairings survived until dawn</small>`;
  $('#origin-discovery-count').textContent=`${chronicle.discoveredOrigins.length} / ${OATHBOUND_ORIGINS.length}`;
  $('#archive-origins').innerHTML=OATHBOUND_ORIGINS.map((origin)=>{const known=chronicle.discoveredOrigins.includes(origin.id);return `<div class="archive-origin ${known?'is-discovered':'is-locked'}" style="--origin-color:#${origin.color.toString(16).padStart(6,'0')}"><span>${known?origin.sigil:'?'}</span><div><strong>${known?origin.name:'An untraced bloodline'}</strong><p>${known?origin.detail:'No oathbound of this provenance has joined the company.'}</p></div></div>`}).join('');
  const rites=chronicle.discoveredRites.length,percent=Math.min(100,rites/UPGRADE_CATALOG.length*100);$('#archive-rite-progress').innerHTML=`<span>RITES WITNESSED ACROSS ALL COMPANIES</span><div class="archive-progress-track"><i style="width:${percent}%"></i></div><strong>${rites} / ${UPGRADE_CATALOG.length}</strong>`;
}

function showEncounter(encounter){
  clearTimeout(encounterTimer);encounterBanner.removeAttribute('aria-hidden');$('#encounter-sigil').textContent=encounter.sigil;$('#encounter-title').textContent=encounter.title;$('#encounter-omen').textContent=encounter.omen;encounterBanner.classList.remove('is-visible');void encounterBanner.offsetWidth;encounterBanner.classList.add('is-visible');encounterTimer=setTimeout(()=>{encounterBanner.classList.remove('is-visible');encounterBanner.setAttribute('aria-hidden','true')},7000);
}

function openArchive(){
  archivePreviousModalPause=game.modalPaused;game.setModalPaused(true);renderArchive(game.snapshot());shell.inert=true;archive.inert=false;archive.removeAttribute('aria-hidden');archive.classList.add('is-visible');queueMicrotask(()=>$('#archive-close').focus({preventScroll:true}));
}

function closeArchive(){
  archive.classList.remove('is-visible');const modalVisible=modal.classList.contains('is-visible');shell.inert=modalVisible;const returnTarget=modalVisible?modalContent.querySelector('button:not([disabled])'):$('#archive-button');returnTarget?.focus({preventScroll:true});archive.inert=true;archive.setAttribute('aria-hidden','true');game.setModalPaused(archivePreviousModalPause);
}

function renderRoster(snapshot) {
  const units=snapshot.units;
  const existing=new Map([...roster.querySelectorAll('[data-unit-id]')].map((button)=>[Number(button.dataset.unitId),button]));
  units.forEach((unit)=>{
    let button=existing.get(unit.id);
    if(!button){
      button=document.createElement('button');button.type='button';button.dataset.unitId=unit.id;button.innerHTML='<span class="portrait" data-roster-portrait></span><span class="unit-copy"><span class="unit-name"><strong data-roster-name></strong><small data-roster-archetype></small></span><span class="unit-doctrine" data-roster-doctrine></span><span class="unit-vitals"><span><small>HP</small><b data-roster-hp-value></b></span><span><small>AP</small><b data-roster-ap-value></b></span></span><span class="bar-pair"><span class="mini-bar hp"><i data-roster-hp></i></span><span class="mini-bar ap"><i data-roster-ap></i></span></span></span><span class="unit-level"><strong data-roster-level></strong><span>RANK</span></span>';
      roster.append(button);
    }
    existing.delete(unit.id);const hp=Math.max(0,unit.hp/unit.maxHp*100),ap=Math.max(0,unit.ap/unit.maxAp*100),portrait=button.querySelector('[data-roster-portrait]');
    button.className=`unit-card ${unit.id===snapshot.selectedId?'is-selected':''} ${unit.alive?'':'is-dead'}`;button.disabled=!unit.alive;portrait.style.setProperty('--unit-color',unit.color);portrait.style.setProperty('--portrait-position',`${unit.portrait*25}%`);button.querySelector('[data-roster-name]').textContent=unit.name;button.querySelector('[data-roster-archetype]').textContent=unit.archetype;button.querySelector('[data-roster-doctrine]').textContent=unit.alive?(unit.aiState||'Reading the field'):'Fallen';button.querySelector('[data-roster-hp-value]').textContent=`${Math.ceil(Math.max(0,unit.hp))}/${Math.ceil(unit.maxHp)}`;button.querySelector('[data-roster-ap-value]').textContent=`${Math.floor(Math.max(0,unit.ap))}/${Math.floor(unit.maxAp)}`;button.querySelector('[data-roster-hp]').style.width=`${hp}%`;button.querySelector('[data-roster-ap]').style.width=`${ap}%`;button.querySelector('[data-roster-level]').textContent=unit.level;
  });
  existing.forEach((button)=>button.remove());
  const selected=units.find((unit)=>unit.id===snapshot.selectedId)||units.find((unit)=>unit.alive);
  renderSequence(selected);
  renderDossier(selected);
}

function renderSequence(unit) {
  const reorderButton=$('#reorder-button');
  if(!unit){sequence.innerHTML='<span class="fine-print">The litany is silent.</span>';sequence.dataset.signature='';sequence.style.gridTemplateColumns='';reorderButton.disabled=true;reorderButton.title='No living litany remains';hideAbilityInspector();return}
  reorderButton.disabled=!unit.alive||unit.abilities.length<2;reorderButton.title=unit.abilities.length<2?'This oathbound knows only one rite':'Rewrite this litany at any time';
  sequence.style.gridTemplateColumns=unit.abilities.length===1?'72px':`repeat(${unit.abilities.length},1fr)`;
  const signature=`${unit.id}:${unit.abilities.map((ability)=>ability.id).join('|')}`;
  if(sequence.dataset.signature!==signature){
    sequence.dataset.signature=signature;
    sequence.innerHTML=unit.abilities.map((ability,index)=>`<div class="ability-glyph" tabindex="0" data-ability-index="${index}" aria-label="Inspect ${ability.name}">${abilityArt(ability)}<span class="ability-shade"></span><span class="order">${roman(index+1)}</span><span class="category">${ability.category||ability.kind}</span><small></small></div>`).join('');
    sequence.querySelectorAll('[data-ability-index]').forEach((glyph)=>{
      const show=()=>{inspectedAbilityIndex=Number(glyph.dataset.abilityIndex);inspectedUnitId=unit.id;showAbilityInspector(unit,inspectedAbilityIndex)};
      const hide=()=>{if(inspectedUnitId===unit.id&&inspectedAbilityIndex===Number(glyph.dataset.abilityIndex)){inspectedAbilityIndex=null;inspectedUnitId=null;hideAbilityInspector()}};
      glyph.addEventListener('pointerenter',show);glyph.addEventListener('pointerleave',hide);glyph.addEventListener('focus',show);glyph.addEventListener('blur',hide);
    });
  }
  sequence.querySelectorAll('[data-ability-index]').forEach((glyph)=>{const index=Number(glyph.dataset.abilityIndex),ability=unit.abilities[index];glyph.classList.toggle('is-current',index===unit.abilityCursor);glyph.querySelector('small').textContent=`${Math.round(ability.cost*unit.mods.cost)} AP`});
  if(inspectedUnitId===unit.id&&inspectedAbilityIndex!==null)showAbilityInspector(unit,inspectedAbilityIndex);
}

function showAbilityInspector(unit,index){
  const ability=unit?.abilities[index];if(!ability)return;
  const category=(ability.category||ability.kind).toUpperCase(),cost=Math.round(ability.cost*unit.mods.cost),cooldown=(ability.cooldown*unit.mods.cooldown).toFixed(2),range=ability.range>0?(ability.range+unit.mods.range).toFixed(1):'SELF';
  abilityInspector.innerHTML=`<div class="inspector-art">${abilityArt(ability,'ability-inspector-art')}<span>${roman(index+1)}</span></div><div class="inspector-copy"><small>${category} · NEXT IN THE LITANY</small><h3>${ability.name}</h3><p>${ability.detail}</p><div class="inspector-stats"><span><b>${cost}</b> AP</span><span><b>${Math.round(ability.power||0)}</b> POWER</span><span><b>${range}</b> REACH</span><span><b>${cooldown}s</b> RECOVERY</span></div></div>`;
  abilityInspector.removeAttribute('aria-hidden');abilityInspector.classList.add('is-visible');
}

function hideAbilityInspector(){abilityInspector.classList.remove('is-visible');abilityInspector.setAttribute('aria-hidden','true')}

function renderDossier(unit) {
  if(!unit)return;
  const dossier=$('#selected-dossier');dossier.style.setProperty('--unit-color',unit.color);
  $('#dossier-art').style.setProperty('--portrait-position',`${unit.portrait*25}%`);
  $('#dossier-role').textContent=`${unit.role} · ${unit.moveSpeed.toFixed(1)} stride`;
  $('#dossier-state').textContent=unit.alive?(unit.aiState||'Reading the field'):'The doctrine is silent';
  $('#dossier-doctrine').textContent=unit.doctrine;
  const originColor=`#${Number(unit.originColor||0xd2a65e).toString(16).padStart(6,'0')}`,originArt=$('#dossier-origin-art');originArt.setAttribute('style',`${originArtStyle(unit.originId)};--origin-color:${originColor}`);originArt.setAttribute('aria-label',unit.origin);$('#dossier-origin').style.setProperty('--origin-color',originColor);$('#dossier-origin-name').textContent=unit.origin;$('#dossier-origin-tooltip-name').textContent=`${unit.originSigil} ${unit.origin}`;$('#dossier-origin-detail').textContent=unit.originDetail;
  const traits=unit.traits.slice(-2);$('#dossier-traits').innerHTML=traits.length?traits.map((trait)=>`<span title="${trait}">${trait}</span>`).join(''):'<span>NO INSCRIBED TRAITS</span>';
}

function addFeed(message,important=false) {
  const item=document.createElement('div');item.className=`feed-item ${important?'important':''}`;item.innerHTML=message;feed.prepend(item);
  while(feed.children.length>7)feed.lastElementChild.remove();
}

function roman(number) {
  const values=['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];
  return values[number]||String(number);
}

function showModal() {
  inspectedAbilityIndex=null;inspectedUnitId=null;hideAbilityInspector();
  shell.inert=true;
  modal.inert=false;
  modal.removeAttribute('aria-hidden');
  modal.classList.add('is-visible');
  queueMicrotask(()=>modalContent.querySelector('button:not([disabled])')?.focus({preventScroll:true}));
}
function hideModal() {
  modal.classList.remove('is-visible');
  shell.inert=false;
  if(modal.contains(document.activeElement)){document.activeElement.blur();game?.renderer?.domElement?.focus({preventScroll:true})}
  modal.inert=true;
  modal.setAttribute('aria-hidden','true');
}

function decisionAbilityMarkup(unit,ability,index){
  const category=(ability.category||ability.kind).toUpperCase(),cost=Math.round(ability.cost*unit.mods.cost),range=ability.range>0?(ability.range+unit.mods.range).toFixed(1):'SELF';
  return `<div class="decision-ability">${abilityArt(ability,'decision-ability-art ability-art')}<span class="decision-slot">${roman(index+1)}</span><span><strong>${ability.name}</strong><small>${category} · ${cost} AP · ${range} REACH</small><p>${ability.detail}</p></span></div>`;
}

function renderUpgradeCompanyReadout(snapshot){
  const readout=$('#upgrade-company-readout');if(!readout)return;const living=snapshot.units.filter((unit)=>unit.alive);if(!living.length)return;
  const selected=living.find((unit)=>unit.id===upgradeUnitId)||living.find((unit)=>unit.id===snapshot.selectedId)||living[0];upgradeUnitId=selected.id;
  readout.innerHTML=`<div class="upgrade-readout-heading"><span>SELECTED BEARER</span><strong>${selected.name}</strong><p>Choosing another oathbound below both inspects and selects them.</p></div><div class="upgrade-unit-tabs">${living.map((unit)=>`<button type="button" class="upgrade-unit-tab ${unit.id===selected.id?'is-active':''}" data-select-upgrade-unit="${unit.id}" aria-pressed="${unit.id===selected.id}"><span class="choice-portrait-mini" style="--portrait-position:${unit.portrait*25}%"></span><span><strong>${unit.name}</strong><small>${unit.archetype} · ${unit.abilities.length} ${unit.abilities.length===1?'RITE':'RITES'}</small></span><i>${unit.id===selected.id?'SELECTED':'SELECT'}</i></button>`).join('')}</div><div class="upgrade-ability-ledger"><div class="upgrade-bearer-meta"><span>${selected.originSigil} ${selected.origin}</span><small>${Math.ceil(selected.hp)}/${Math.ceil(selected.maxHp)} HEALTH · ${Math.floor(selected.ap)}/${Math.floor(selected.maxAp)} AP</small></div>${selected.abilities.map((ability,index)=>decisionAbilityMarkup(selected,ability,index)).join('')}</div>`;
  modalContent.querySelectorAll('[data-upgrade-bearer]').forEach((label)=>label.textContent=selected.name);readout.querySelectorAll('[data-select-upgrade-unit]').forEach((button)=>button.addEventListener('click',()=>{upgradeUnitId=Number(button.dataset.selectUpgradeUnit);game.selectUnit(upgradeUnitId);renderUpgradeCompanyReadout(snapshot)}));
}

function renderUpgradeChoices(choices,snapshot) {
  latestSnapshot=snapshot;upgradeUnitId=snapshot.units.find((unit)=>unit.id===snapshot.selectedId&&unit.alive)?.id||snapshot.units.find((unit)=>unit.alive)?.id||null;orderEditorOpen=false;modalBackdrop.classList.remove('concept-backdrop');
  modalContent.className='modal-content choice-view';
  modalContent.innerHTML=`<p class="chapter">BELL ${roman(snapshot.bell)} · RELIQUARY CLAIMED</p><h2>Choose one truth to make real.</h2><p>The selected oathbound at left receives whichever rite you choose. Select another to inspect and change the bearer.</p><div class="upgrade-decision-layout"><aside id="upgrade-company-readout" class="upgrade-company-readout"></aside><div class="upgrade-grid">${choices.map((upgrade,index)=>`<button class="upgrade-card tier-${upgrade.rarity} inflection-${upgrade.inflectionId}" type="button" data-upgrade="${index}" data-rune="${upgrade.rune}"><span class="card-top"><span>${upgrade.family} · ${upgrade.inflectionLabel}</span><span class="rarity-pips">${'◆'.repeat(upgrade.rarity)}${'◇'.repeat(4-upgrade.rarity)}</span></span><span class="${upgradeArtClass(upgrade)}" style="${upgradeArtStyle(upgrade)}" role="img" aria-label="Illustration for ${upgrade.shortName}"><i>${upgrade.sigil}</i><b>${upgrade.rune}</b></span><h3>${upgrade.name}</h3><p>${upgrade.description}</p><footer>Bind to <b data-upgrade-bearer></b> <span>→</span></footer></button>`).join('')}</div></div>`;
  renderUpgradeCompanyReadout(snapshot);
  modalContent.querySelectorAll('[data-upgrade]').forEach((button)=>button.addEventListener('click',()=>{const upgrade=choices[Number(button.dataset.upgrade)],unit=game.applyUpgrade(upgrade,upgradeUnitId);if(!unit)return;hideModal();game.resumeAfterUpgrade()}));
  showModal();
}

function renderOrderChoice(unit) {
  orderEditorOpen=true;upgradeUnitId=unit.id;modalContent.className='modal-content order-view';modalContent.innerHTML=`<p class="chapter">THE LITANY REMAINS YOURS</p><h2>Rewrite ${unit.name}’s order.</h2><p class="order-hint">Position matters. The current ability also changes where the unit moves: melee closes, ranged kites, support seeks allies, and zones choose ground.</p><div class="order-list">${unit.abilities.map((ability,index)=>`<div class="order-row"><span class="slot">${roman(index+1)}</span>${abilityArt(ability,'ability-icon ability-art')}<span><strong>${ability.name}</strong><small>${(ability.category||ability.kind).toUpperCase()} · ${Math.round(ability.cost*unit.mods.cost)} AP · ${ability.detail}</small></span><span class="move-buttons"><button type="button" data-move="${index},${index-1}" ${index===0?'disabled':''} aria-label="Move ${ability.name} earlier">↑</button><button type="button" data-move="${index},${index+1}" ${index===unit.abilities.length-1?'disabled':''} aria-label="Move ${ability.name} later">↓</button></span></div>`).join('')}</div><button id="seal-order" class="primary-button" type="button"><span>Return to the battle</span><i>→</i></button>`;
  modalContent.querySelectorAll('[data-move]').forEach((button)=>button.addEventListener('click',()=>{const [from,to]=button.dataset.move.split(',').map(Number);game.reorderAbility(upgradeUnitId,from,to);const refreshed=game.units.find((item)=>item.id===upgradeUnitId);renderOrderChoice(refreshed)}));
  $('#seal-order').addEventListener('click',closeOrderEditor);
}

function openOrderEditor(){const unit=game.units.find((item)=>item.id===game.selectedId&&item.alive);if(!unit||unit.abilities.length<2)return;game.setModalPaused(true);modalBackdrop.classList.remove('concept-backdrop');renderOrderChoice(unit);showModal()}
function closeOrderEditor(){if(!orderEditorOpen)return;orderEditorOpen=false;hideModal();game.setModalPaused(false)}

function renderOutcome(result) {
  if(result.victory){$('#clock').textContent='00:00';$('#clock-progress').style.width='100%';$('#clock-label').textContent='BELL XX · THE TWENTIETH BELL'}
  modalBackdrop.classList.remove('concept-backdrop');modalContent.className='modal-content outcome-card';
  const laws=(result.lawIds||[]).map((id)=>GRAVE_LAWS.find((law)=>law.id===id)).filter(Boolean);modalContent.innerHTML=`<div class="result-glyph">${result.victory?'✦':'☠'}</div><p class="chapter">${result.victory?'THE TWENTIETH BELL SOUNDS':'THE RITUAL IS BROKEN'}</p><h2>${result.victory?'Dawn remembers you.':'The circle is empty.'}</h2><p>${result.victory?'For one night, the grave has learned restraint. It will forget by tomorrow.':'Every oathbound has fallen. The dead, being dead, have nowhere else to be.'}</p><div class="result-laws">${laws.map((law)=>`<span style="--law-color:#${law.color.toString(16).padStart(6,'0')}">${law.sigil} ${law.shortName}</span>`).join('')}</div><div class="result-stats"><div><strong>${result.kills}</strong><span>remains</span></div><div><strong>${result.upgrades}</strong><span>rites bound</span></div><div><strong>${result.units}</strong><span>survivors</span></div></div><button id="restart-button" class="primary-button" type="button"><span>Begin another company</span><i>↻</i></button>`;
  $('#restart-button').addEventListener('click',()=>window.location.reload());showModal();
}

const game=new Game(stage,{
  onStart:()=>{hideModal();modalBackdrop.classList.remove('concept-backdrop');renderArchive(game.snapshot())},
  onHud:renderHud,
  onRoster:renderRoster,
  onFeed:addFeed,
  onEncounter:showEncounter,
  onMilestone:showEncounter,
  onDiscovery:renderArchive,
  onUpgrade:renderUpgradeChoices,
  onArchive:openArchive,
  onOrder:openOrderEditor,
  onPause:(paused)=>{pausedSeal.hidden=!paused;$('#pause-button').textContent=paused?'▶':'Ⅱ'},
  onEnd:renderOutcome
});

const difficultySlider=$('#difficulty-slider');
function renderDifficulty(){const preset=game.setDifficulty(Number(difficultySlider.value));$('#difficulty-roman').textContent=preset.roman;$('#difficulty-name').textContent=preset.name.toUpperCase();$('#difficulty-detail').textContent=preset.detail;difficultySlider.setAttribute('aria-valuetext',`${preset.name}, level ${preset.level} of 5`)}
difficultySlider.addEventListener('input',renderDifficulty);renderDifficulty();
$('#start-button').addEventListener('click',()=>{game.setDifficulty(Number(difficultySlider.value));game.start()});
$('#archive-button').addEventListener('click',openArchive);
$('#archive-close').addEventListener('click',closeArchive);
archive.querySelector('.archive-scrim').addEventListener('click',closeArchive);
roster.addEventListener('click',(event)=>{const button=event.target.closest('[data-unit-id]');if(button&&!button.disabled)game.selectUnit(Number(button.dataset.unitId))});
$('#reorder-button').addEventListener('click',openOrderEditor);
$('#pause-button').addEventListener('click',()=>game.togglePause());
$('#sound-button').addEventListener('click',(event)=>{const enabled=game.toggleSound();event.currentTarget.textContent=enabled?'♪':'×';event.currentTarget.title=enabled?'Mute sound':'Enable sound'});
document.addEventListener('click',(event)=>{if(event.target.closest('button'))game.playUi()},{capture:true});
window.addEventListener('keydown',(event)=>{if(event.key!=='Escape')return;if(archive.classList.contains('is-visible'))closeArchive();else if(orderEditorOpen)closeOrderEditor();else game.togglePause()});

$('#codex-count').textContent=`${UPGRADE_CATALOG.length} rites remain unwritten`;
window.__TWENTIETH_BELL__=game;
renderArchive(game.snapshot());
renderGraveLaws(game.snapshot());
