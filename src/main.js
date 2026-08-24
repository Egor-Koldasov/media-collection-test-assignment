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
const feed = $('#combat-feed');
const pausedSeal = $('#paused-seal');
const archive = $('#grave-archive');
const encounterBanner = $('#encounter-banner');
let latestSnapshot = null;
let pendingUpgrade = null;
let upgradeUnitId = null;
let archivePreviousModalPause = false;
let encounterTimer = 0;

const abilityArtIndexes=new Map(ABILITY_TEMPLATES.map((ability,index)=>[ability.id,index]));
const enemyArtIndexes=new Map(Object.keys(ENEMY_ARCHETYPES).map((id,index)=>[id,index]));
const atlasPosition=(index,columns,rows)=>{const column=index%columns,row=Math.floor(index/columns);return `--art-x:${columns===1?0:column/(columns-1)*100}%;--art-y:${rows===1?0:row/(rows-1)*100}%`};
const abilityArtStyle=(ability)=>atlasPosition(ability.artIndex??abilityArtIndexes.get(ability.id)??0,6,4);
const enemyArtStyle=(id)=>atlasPosition(enemyArtIndexes.get(id)??0,4,3);
const abilityArt=(ability,className='ability-art')=>`<span class="${className}" style="${abilityArtStyle(ability)}" role="img" aria-label="${ability.name}"></span>`;
const enemyTactics={
  thrall:'A cheap rushing body.',hound:'Flanks isolated backliners.',pikeman:'Threatens through the front line.',bowman:'Retreats to maintain firing range.',harvester:'Sweeps several oathbound at once.',graveguard:'An armored anchor for the dead.',cantor:'Restores nearby graveborn.',standard:'Hastens the procession around it.',wraith:'Phases across unsafe ground.',bishop:'Wards the strongest nearby dead.',ossuary:'Breaks into fresh thralls.',giant:'A slow cleaving catastrophe.'
};

const pips = $('#threat-pips');
for (let i=0;i<7;i+=1) pips.insertAdjacentHTML('beforeend','<i></i>');
const intentMetrics={melee:'meleeIntents',ranged:'rangedIntents',support:'supportCount',elite:'eliteCount'};

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
  Object.entries(intentMetrics).forEach(([intent,key])=>{const value=snapshot[key]||0,cell=$(`[data-intent="${intent}"]`);$(`#intent-${intent}`).textContent=value;cell.classList.toggle('is-active',value>0)});
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
  roster.innerHTML=units.map((unit)=>{
    const hp=Math.max(0,unit.hp/unit.maxHp*100);const ap=Math.max(0,unit.ap/unit.maxAp*100);
    return `<button class="unit-card ${unit.id===snapshot.selectedId?'is-selected':''} ${unit.alive?'':'is-dead'}" data-unit-id="${unit.id}" type="button" ${unit.alive?'':'disabled'}>
      <span class="portrait" style="--unit-color:${unit.color};--portrait-position:${unit.portrait*25}%"></span>
      <span class="unit-copy"><span class="unit-name"><strong>${unit.name}</strong><small>${unit.archetype}</small></span><span class="unit-doctrine">${unit.alive?(unit.aiState||'Reading the field'):'Fallen'}</span><span class="bar-pair"><span class="mini-bar hp"><i style="width:${hp}%"></i></span><span class="mini-bar ap"><i style="width:${ap}%"></i></span></span></span>
      <span class="unit-level">${unit.level}<span>RANK</span></span>
    </button>`;
  }).join('');
  roster.querySelectorAll('[data-unit-id]').forEach((button)=>button.addEventListener('click',()=>game.selectUnit(Number(button.dataset.unitId))));
  const selected=units.find((unit)=>unit.id===snapshot.selectedId)||units.find((unit)=>unit.alive);
  renderSequence(selected);
  renderDossier(selected);
}

function renderSequence(unit) {
  if(!unit){sequence.innerHTML='<span class="fine-print">The litany is silent.</span>';return}
  sequence.style.gridTemplateColumns=`repeat(${unit.abilities.length},1fr)`;
  sequence.innerHTML=unit.abilities.map((ability,index)=>`<div class="ability-glyph ${index===unit.abilityCursor?'is-current':''}" title="${ability.name}: ${ability.detail}">${abilityArt(ability)}<span class="ability-shade"></span><span class="order">${roman(index+1)}</span><span class="category">${ability.category||ability.kind}</span><small>${Math.round(ability.cost*unit.mods.cost)} AP</small></div>`).join('');
}

function renderDossier(unit) {
  if(!unit)return;
  const dossier=$('#selected-dossier');dossier.style.setProperty('--unit-color',unit.color);
  $('#dossier-art').style.setProperty('--portrait-position',`${unit.portrait*25}%`);
  $('#dossier-role').textContent=`${unit.role} · ${unit.origin} · ${unit.moveSpeed.toFixed(1)} stride`;
  $('#dossier-state').textContent=unit.alive?(unit.aiState||'Reading the field'):'The doctrine is silent';
  $('#dossier-doctrine').textContent=unit.doctrine;
  const traits=unit.traits.slice(-2);$('#dossier-traits').innerHTML=`<span class="origin-trait" title="${unit.originDetail}">${unit.originSigil} ${unit.origin}</span>${traits.map((trait)=>`<span title="${trait}">${trait}</span>`).join('')}`;
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
  shell.inert=true;
  modal.inert=false;
  modal.removeAttribute('aria-hidden');
  modal.classList.add('is-visible');
  queueMicrotask(()=>modalContent.querySelector('button:not([disabled])')?.focus({preventScroll:true}));
}
function hideModal() {
  modal.classList.remove('is-visible');
  shell.inert=false;
  if(modal.contains(document.activeElement))$('#pause-button').focus({preventScroll:true});
  modal.inert=true;
  modal.setAttribute('aria-hidden','true');
}

function renderUpgradeChoices(choices,snapshot) {
  latestSnapshot=snapshot;pendingUpgrade=null;modalBackdrop.classList.remove('concept-backdrop');
  modalContent.className='modal-content choice-view';
  modalContent.innerHTML=`<p class="chapter">BELL ${roman(snapshot.bell)} · THE BLOOD BOOK OPENS</p><h2>Choose one truth to make real.</h2><p>Then name the oathbound who must carry it. Binding also rekindles some health, ward, and AP.</p><div class="upgrade-grid">${choices.map((upgrade,index)=>`<button class="upgrade-card" type="button" data-upgrade="${index}" data-rune="${upgrade.rune}"><span class="card-top"><span>${upgrade.family}</span><span class="rarity-pips">${'◆'.repeat(upgrade.rarity)}${'◇'.repeat(4-upgrade.rarity)}</span></span><span class="card-sigil"><span>${upgrade.sigil}</span></span><h3>${upgrade.name}</h3><p>${upgrade.description}</p><footer>Bind this rite <span>→</span></footer></button>`).join('')}</div>`;
  modalContent.querySelectorAll('[data-upgrade]').forEach((button)=>button.addEventListener('click',()=>{pendingUpgrade=choices[Number(button.dataset.upgrade)];renderUnitChoice(snapshot)}));
  showModal();
}

function renderUnitChoice(snapshot) {
  const living=snapshot.units.filter((unit)=>unit.alive);
  modalContent.innerHTML=`<p class="chapter">${pendingUpgrade.family} · ${'◆'.repeat(pendingUpgrade.rarity)}</p><h2>Who bears “${pendingUpgrade.shortName}”?</h2><p>The rite belongs to one body. Choose the sequence only after the binding.</p><div class="unit-choice-grid">${living.map((unit)=>`<button class="unit-choice" type="button" data-bind-unit="${unit.id}"><div class="choice-portrait" style="--portrait-position:${unit.portrait*25}%"></div><strong>${unit.name}</strong><span>${unit.archetype} · rank ${unit.level}</span><span class="choice-stats">${unit.originSigil} ${unit.origin}<br>${unit.aiState}<br>${Math.ceil(unit.hp)}/${Math.ceil(unit.maxHp)} health · ${Math.floor(unit.ap)}/${Math.floor(unit.maxAp)} AP</span><span class="choice-litany">${unit.abilities.map((ability)=>abilityArt(ability,'mini-ability-art')).join('<i>→</i>')}</span>${unit.traits.length?`<span class="choice-traits"><em>${unit.traits.slice(-2).join(' · ')}</em></span>`:''}</button>`).join('')}</div>`;
  modalContent.querySelectorAll('[data-bind-unit]').forEach((button)=>button.addEventListener('click',()=>{
    upgradeUnitId=Number(button.dataset.bindUnit);const unit=game.applyUpgrade(pendingUpgrade,upgradeUnitId);renderOrderChoice(unit);
  }));
}

function renderOrderChoice(unit) {
  modalContent.innerHTML=`<p class="chapter">THE RITE IS BOUND</p><h2>Rewrite ${unit.name}’s litany.</h2><p class="order-hint">Position matters. The current ability also changes where the unit moves: melee closes, ranged kites, support seeks allies, and zones choose ground.</p><div class="order-list">${unit.abilities.map((ability,index)=>`<div class="order-row"><span class="slot">${roman(index+1)}</span>${abilityArt(ability,'ability-icon ability-art')}<span><strong>${ability.name}</strong><small>${(ability.category||ability.kind).toUpperCase()} · ${Math.round(ability.cost*unit.mods.cost)} AP · ${ability.detail}</small></span><span class="move-buttons"><button type="button" data-move="${index},${index-1}" ${index===0?'disabled':''} aria-label="Move ${ability.name} earlier">↑</button><button type="button" data-move="${index},${index+1}" ${index===unit.abilities.length-1?'disabled':''} aria-label="Move ${ability.name} later">↓</button></span></div>`).join('')}</div><button id="seal-order" class="primary-button" type="button"><span>Seal this order</span><i>→</i></button>`;
  modalContent.querySelectorAll('[data-move]').forEach((button)=>button.addEventListener('click',()=>{const [from,to]=button.dataset.move.split(',').map(Number);game.reorderAbility(upgradeUnitId,from,to);const refreshed=game.units.find((item)=>item.id===upgradeUnitId);renderOrderChoice(refreshed)}));
  $('#seal-order').addEventListener('click',()=>{hideModal();game.resumeAfterUpgrade()});
}

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
  onPause:(paused)=>{pausedSeal.hidden=!paused;$('#pause-button').textContent=paused?'▶':'Ⅱ'},
  onEnd:renderOutcome
});

$('#start-button').addEventListener('click',()=>game.start());
$('#archive-button').addEventListener('click',openArchive);
$('#archive-close').addEventListener('click',closeArchive);
archive.querySelector('.archive-scrim').addEventListener('click',closeArchive);
$('#pause-button').addEventListener('click',()=>game.togglePause());
$('#sound-button').addEventListener('click',(event)=>{const enabled=game.toggleSound();event.currentTarget.textContent=enabled?'♪':'×';event.currentTarget.title=enabled?'Mute sound':'Enable sound'});
window.addEventListener('keydown',(event)=>{if(event.key!=='Escape')return;if(archive.classList.contains('is-visible'))closeArchive();else game.togglePause()});

$('#codex-count').textContent=`${UPGRADE_CATALOG.length} rites remain unwritten`;
window.__TWENTIETH_BELL__=game;
renderArchive(game.snapshot());
renderGraveLaws(game.snapshot());
