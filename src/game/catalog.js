const pick = (items) => items[Math.floor(Math.random() * items.length)];
const between = (min, max) => min + Math.random() * (max - min);

export const ABILITY_TEMPLATES = [
  { id:'sunder', name:'Sunder', glyph:'⚔', kind:'strike', category:'melee', cost:18, power:24, cooldown:.62, range:1.3, color:0xd8b171, detail:'Commit to a heavy close cut that fractures armor.' },
  { id:'red-thread', name:'Red Thread', glyph:'⌁', kind:'bolt', category:'ranged', cost:15, power:17, cooldown:.48, range:7.2, color:0xb64148, detail:'A blood-bright needle fired at the farthest threat.' },
  { id:'bell-cleave', name:'Bell Cleave', glyph:'◒', kind:'cleave', category:'melee', cost:25, power:18, cooldown:.85, range:1.55, radius:2.15, color:0xe0a75d, detail:'A close circular cut that rings through a cluster.' },
  { id:'grave-lantern', name:'Grave Lantern', glyph:'✦', kind:'nova', cost:32, power:14, cooldown:1.05, range:8, radius:3.4, color:0xd65a52, detail:'A close nova of scarlet witchfire.' },
  { id:'pale-mercy', name:'Pale Mercy', glyph:'✚', kind:'heal', category:'support', cost:24, power:20, cooldown:.9, range:7, color:0xe5d8ae, detail:'Mends the most wounded oathbound within reach.' },
  { id:'iron-psalm', name:'Iron Psalm', glyph:'⬡', kind:'ward', category:'support', cost:21, power:24, cooldown:.78, range:7, color:0x8290c2, detail:'A temporary ward for the frailest nearby ally.' },
  { id:'raven-mark', name:'Raven Mark', glyph:'⌁', kind:'pierce', category:'ranged', cost:20, power:19, cooldown:.6, range:8.5, color:0x9a83ba, detail:'A piercing curse that chains through a line.' },
  { id:'gallows-step', name:'Gallows Step', glyph:'⟡', kind:'dash', category:'melee', cost:17, power:17, cooldown:.45, range:5.2, color:0xcbd0db, detail:'Blink behind a distant foe and cut through it.' },
  { id:'ash-chant', name:'Ash Chant', glyph:'♨', kind:'burn', category:'ranged', cost:23, power:12, cooldown:.72, range:6.4, color:0xc56b42, detail:'Kindles a wound that continues to burn.' },
  { id:'winter-tithe', name:'Winter Tithe', glyph:'❄', kind:'frost', category:'ranged', cost:22, power:14, cooldown:.68, range:6.2, color:0x8faac3, detail:'Damage and a grave-cold slowing hex; brittle foes shatter.' },
  { id:'bone-hook', name:'Bone Hook', glyph:'⤸', kind:'hook', category:'control', cost:16, power:13, cooldown:.5, range:6.7, color:0xcfc5b0, detail:'Hooks a distant enemy into the company’s reach.' },
  { id:'last-vigil', name:'Last Vigil', glyph:'☼', kind:'pulse', category:'support', cost:29, power:12, cooldown:.92, range:8, radius:4.2, color:0xe2cb88, detail:'A holy pulse that wounds enemies and mends allies.' },
  { id:'shield-bash', name:'Sepulchral Bash', glyph:'▰', kind:'bash', category:'melee', cost:17, power:15, cooldown:.55, range:1.25, color:0xc1a26d, detail:'A shield blow that stuns and hurls the target backward.' },
  { id:'reaping-arc', name:'Reaping Arc', glyph:'☾', kind:'reap', category:'melee', cost:28, power:21, cooldown:.88, range:1.65, radius:2.35, color:0xb03c42, detail:'A committed scything sweep that opens bleeding wounds.' },
  { id:'blood-riposte', name:'Blood Riposte', glyph:'♱', kind:'riposte', category:'melee', cost:14, power:28, cooldown:.52, range:0, color:0xd14a4c, detail:'Assume a guard; the next close attacker is parried and struck.' },
  { id:'grave-pounce', name:'Grave Pounce', glyph:'⤫', kind:'pounce', category:'melee', cost:26, power:27, cooldown:.82, range:6.2, color:0xaab2ad, detail:'Leap onto the most isolated ranged foe and maul it.' },
  { id:'sanctuary', name:'Sanctuary of Salt', glyph:'◎', kind:'sanctuary', category:'zone', cost:34, power:9, cooldown:1.1, range:0, radius:3.1, duration:5.5, color:0xe7d59d, detail:'Consecrate moving ground that heals allies and sears undead.' },
  { id:'transfusion', name:'Crimson Transfusion', glyph:'⇌', kind:'transfusion', category:'support', cost:20, power:31, cooldown:.74, range:7.5, color:0xbd3f48, detail:'Spend a measure of health to rescue the weakest ally.' },
  { id:'moth-swarm', name:'Moths of Mourning', glyph:'❧', kind:'curse', category:'ranged', cost:24, power:11, cooldown:.73, range:7.1, color:0x8f72a1, detail:'A death-curse that erupts and spreads when its bearer falls.' },
  { id:'black-bell', name:'The Black Bell', glyph:'◉', kind:'delayed', category:'ranged', cost:35, power:38, cooldown:1.2, range:7.5, radius:2.75, color:0xc8514f, detail:'Inscribe a delayed bell beneath the densest enemy cluster.' },
  { id:'ravenous-gate', name:'Ravenous Gate', glyph:'◌', kind:'vortex', category:'zone', cost:38, power:10, cooldown:1.3, range:6.5, radius:3.2, duration:4.5, color:0x8b4770, detail:'Open a hungry sigil that drags and abrades the dead.' },
  { id:'bone-orbit', name:'Orbit of Knives', glyph:'✣', kind:'orbit', category:'melee', cost:25, power:13, cooldown:.8, range:0, duration:6, color:0xd8c8ad, detail:'Conjure three knives that seek nearby enemies while moving.' },
  { id:'salt-caltrops', name:'Widow’s Caltrops', glyph:'⌖', kind:'trap', category:'zone', cost:21, power:7, cooldown:.65, range:0, radius:2.4, duration:6.5, color:0x9c9a89, detail:'Scatter a retreating field that slows and bleeds pursuers.' },
  { id:'sunless-beam', name:'Sunless Beam', glyph:'┃', kind:'beam', category:'ranged', cost:28, power:26, cooldown:.86, range:9, color:0xd9c77e, detail:'Channel a straight lance through every skeleton in its path.' }
];

export function makeAbility(template) {
  const base = typeof template === 'string' ? ABILITY_TEMPLATES.find((item) => item.id === template) : template;
  return { ...base, artIndex:ABILITY_TEMPLATES.findIndex((item)=>item.id===base.id), cooldownLeft: between(0, .8) };
}

const firstNames = ['Alda','Bram','Cairn','Damar','Edda','Fenn','Gault','Hester','Iven','Jora','Kest','Lorn','Maude','Nox','Orra','Pell','Quill','Rook','Sable','Tarn','Ulla','Vey','Wren','Ysra'];
const epithets = ['the Unshriven','of No Parish','Bell-Widow','Gravesalt','the Foxed','Ashmouth','Candle-Eater','the Ninth Scar','Hollowhand','of the Red Mere','Last-Born','Black Vesper','the Unburied','Moth-Sworn'];
const archetypes = [
  { name:'Hexblade', color:'#9e3d43', role:'vanguard', portrait:0, moveSpeed:2.25, idealRange:1.15, doctrine:'Intercepts dense packs, commits to melee, and hunts armored prey.', hp:[96,114], ap:[48,58], regen:[7.4,8.8], pool:['sunder','bell-cleave','reaping-arc','blood-riposte','ash-chant','grave-pounce'] },
  { name:'Reliquary', color:'#b98d58', role:'guardian', portrait:1, moveSpeed:1.72, idealRange:1.35, doctrine:'Shadows the most wounded ally, body-blocks attackers, and controls the front.', hp:[118,142], ap:[44,54], regen:[6.5,7.8], pool:['shield-bash','iron-psalm','bell-cleave','last-vigil','bone-hook','sanctuary'] },
  { name:'Pale cantor', color:'#727fa7', role:'support', portrait:2, moveSpeed:1.92, idealRange:5.2, doctrine:'Maintains a safe healing angle, rescues the wounded, and avoids encirclement.', hp:[84,102], ap:[56,68], regen:[7.8,9.4], pool:['pale-mercy','iron-psalm','winter-tithe','last-vigil','transfusion','sanctuary','sunless-beam'] },
  { name:'Gloam witch', color:'#755c8f', role:'artillery', portrait:3, moveSpeed:1.84, idealRange:5.8, doctrine:'Kites toward open ground and targets the densest cluster with delayed rites.', hp:[80,98], ap:[60,72], regen:[8.2,9.8], pool:['grave-lantern','raven-mark','ash-chant','winter-tithe','moth-swarm','black-bell','ravenous-gate'] },
  { name:'Gallows rogue', color:'#67716d', role:'skirmisher', portrait:4, moveSpeed:2.72, idealRange:2.6, doctrine:'Orbits the battle, isolates ranged enemies, then escapes through the seam.', hp:[86,104], ap:[52,64], regen:[8.2,9.7], pool:['gallows-step','grave-pounce','bone-hook','sunder','salt-caltrops','bone-orbit','blood-riposte'] }
];

export const OATHBOUND_ORIGINS=[
  {id:'bone-orchard',name:'Child of the Bone Orchard',sigil:'♁',color:0xa69b82,detail:'Hardier, but moves with the patience of buried roots.',apply:(u)=>{u.maxHp*=1.08;u.hp=u.maxHp;u.moveSpeed*=.96}},
  {id:'bell-orphan',name:'Bell Orphan',sigil:'◉',color:0xd1a15c,detail:'Carries a deeper AP vessel, though its rhythm recovers more slowly.',apply:(u)=>{u.maxAp*=1.1;u.ap=u.maxAp*.68;u.apRegen*=.96}},
  {id:'red-parish',name:'Last of the Red Parish',sigil:'◆',color:0xc34a50,detail:'Finds fatal openings more often, at the cost of a little flesh.',apply:(u)=>{u.maxHp*=.96;u.hp=u.maxHp;u.mods.critChance+=.04}},
  {id:'moth-witness',name:'Witness of the Moth Vigil',sigil:'❧',color:0x9a6dad,detail:'Afflictions linger more fiercely; direct violence is slightly dulled.',apply:(u)=>{u.mods.statusPower*=1.15;u.mods.damage*=.97}},
  {id:'salt-pilgrim',name:'Salt-Road Pilgrim',sigil:'◎',color:0xc9b87c,detail:'Ritual ground answers readily and a thin ward follows every arrival.',apply:(u)=>{u.mods.zonePower*=1.12;u.shield+=u.maxHp*.06}},
  {id:'last-courier',name:'Courier of the Last Road',sigil:'➤',color:0x7f8e7e,detail:'Moves with desperate speed, carrying less flesh to the destination.',apply:(u)=>{u.moveSpeed*=1.09;u.maxHp*=.96;u.hp=u.maxHp}},
  {id:'choir-exile',name:'Exile of the Unbroken Choir',sigil:'⌘',color:0x8f769f,detail:'Strengthens nearby oaths, but keeps an uneven private cadence.',apply:(u)=>{u.mods.auraDamage+=.018;u.apRegen*=.96}},
  {id:'grave-gardener',name:'Gardener of Quiet Graves',sigil:'✚',color:0x95a27d,detail:'Each broken skeleton returns a small measure of health.',apply:(u)=>{u.mods.killHeal+=.8;u.mods.healing*=1.05}},
  {id:'iron-votary',name:'Votary of Iron Vespers',sigil:'▰',color:0xb18a5d,detail:'Arrives warded and suffers close violence with greater discipline.',apply:(u)=>{u.shield+=u.maxHp*.05;u.mods.closeGuard+=.04}},
  {id:'black-star',name:'Born Beneath the Black Star',sigil:'⋆',color:0x7583b1,detail:'Distant rites strike harder; close violence feels less certain.',apply:(u)=>{u.mods.rangedDamage*=1.1;u.mods.meleeDamage*=.95}},
  {id:'wolf-gate',name:'Wolf of the Crooked Gate',sigil:'⋔',color:0x899287,detail:'Close rites bite harder and the body occasionally slips a blow.',apply:(u)=>{u.mods.meleeDamage*=1.09;u.mods.dodgeChance+=.015}},
  {id:'candle-child',name:'Candle-Child of No Parish',sigil:'☼',color:0xd9c77e,detail:'Mercy and AP come easily; pure damage burns a little dimmer.',apply:(u)=>{u.mods.healing*=1.1;u.apRegen*=1.05;u.mods.damage*=.96}}
];

export function generateOathbound(existingNames = [], arrival = 0, existingArchetypes = []) {
  const missingArchetypes=archetypes.filter((candidate)=>!existingArchetypes.includes(candidate.name));
  const archetype = pick(missingArchetypes.length?missingArchetypes:archetypes);
  let name = `${pick(firstNames)} ${pick(epithets)}`;
  while (existingNames.includes(name)) name = `${pick(firstNames)} ${pick(epithets)}`;
  const abilityCount = Math.random() < .12 ? 2 : 1;
  const shuffled = [...archetype.pool].sort(() => Math.random() - .5).slice(0, abilityCount);const passiveKinds=new Set(['heal','ward','transfusion']);const isOffensive=(id)=>!passiveKinds.has(ABILITY_TEMPLATES.find((ability)=>ability.id===id)?.kind);
  while(shuffled.filter(isOffensive).length<1){const replacement=archetype.pool.filter((id)=>isOffensive(id)&&!shuffled.includes(id))[0],passiveIndex=shuffled.findIndex((id)=>!isOffensive(id));if(!replacement||passiveIndex<0)break;shuffled[passiveIndex]=replacement}
  const growth = 1 + arrival * .06;
  const starterGrace = arrival === 0 ? 1.24 : 1;
  const maxHp = Math.round(between(...archetype.hp) * growth * starterGrace * 1.15);
  const maxAp = Math.round(between(...archetype.ap) * (1 + arrival * .035));
  const unit={
    name, archetype:archetype.name, color:archetype.color, role:archetype.role, portrait:archetype.portrait,
    doctrine:archetype.doctrine, moveSpeed:archetype.moveSpeed, idealRange:archetype.idealRange, level:1,
    maxHp, hp:maxHp, maxAp, ap:maxAp * .68, apRegen:between(...archetype.regen) * (arrival === 0 ? 1.18 : 1) * 1.08,
    abilities:shuffled.map(makeAbility), abilityCursor:0, alive:true, shield:0,
    traits:[], casts:0, kills:0, alternating:false,
    mods:createUnitMods()
  };
  const origin=pick(OATHBOUND_ORIGINS);origin.apply(unit);unit.origin=origin.name;unit.originId=origin.id;unit.originSigil=origin.sigil;unit.originColor=origin.color;unit.originDetail=origin.detail;return unit;
}

export function createUnitMods() {
  return {
    damage:1.75, healing:1, ward:1, cost:1, cooldown:1, range:0, critChance:.05, critPower:1.75,
    echoChance:0, echoPower:.4, killAp:0, killHeal:0, lifesteal:0, thorns:0, opener:1,
    closer:1, alternating:1, everyThird:1, chainChance:0, chainPower:.42, slow:0,
    barrierPerCast:0, execute:0, healEvery:0, healEveryPower:0, lowHpDamage:1,
    fullHpDamage:1, afterSupport:1, afterSupportReady:false, auraDamage:0, startShield:0,
    meleeDamage:1, rangedDamage:1, zonePower:1, statusPower:1, dodgeChance:0, movingAp:0,
    closeGuard:0, stationaryWard:0, overhealWard:0, wardBreakNova:0, momentumDamage:0,
    aimDamage:0, plagueSpread:0, weaveDamage:0, lowHpAp:0, critBleed:0, zoneWard:0
  };
}

const tierNames = ['Whispered','Inscribed','Graven','Sovereign'];
const tierPower = [1,1.45,1.95,2.55];
const inflections = [
  { id:'ash', label:'Ash', glyph:'△', text:'also raises maximum health', apply:(u,p)=>{const gain=Math.round(u.maxHp*(.025+.006*p));u.maxHp+=gain;u.hp+=gain;} },
  { id:'blood', label:'Blood', glyph:'◇', text:'also restores AP on a kill', apply:(u,p)=>{u.mods.killAp+=.55+.2*p;} },
  { id:'moon', label:'Moon', glyph:'○', text:'also hastens AP recovery', apply:(u,p)=>{u.apRegen*=1.012+.006*p;} }
];

const pct = (value) => `${Math.round(value * 100)}%`;
const blueprints = [
  { id:'tempered-edge', name:'Temper of the Red Edge', sigil:'†', family:'Violence', describe:p=>`All damaging abilities deal ${pct(.055*p)} more damage.`, apply:(u,p)=>u.mods.damage*=1+.055*p },
  { id:'deep-well', name:'The Unbottomed Vessel', sigil:'∪', family:'Economy', describe:p=>`Maximum AP rises by ${Math.round(4.5*p)} and current AP is filled.`, apply:(u,p)=>{u.maxAp+=4.5*p;u.ap=u.maxAp;} },
  { id:'quickening', name:'Quickening Script', sigil:'ϟ', family:'Economy', describe:p=>`AP regenerates ${pct(.045*p)} faster.`, apply:(u,p)=>u.apRegen*=1+.045*p },
  { id:'red-echo', name:'The Red Echo', sigil:'Ⅱ', family:'Sequence', describe:p=>`${pct(.035*p)} chance for an ability to echo at no AP cost.`, apply:(u,p)=>{u.mods.echoChance+=.035*p;u.mods.echoPower+=.018*p} },
  { id:'grave-interest', name:'Interest of the Grave', sigil:'¤', family:'Harvest', describe:p=>`Killing a skeleton restores ${(.8*p).toFixed(1)} AP.`, apply:(u,p)=>u.mods.killAp+=.8*p },
  { id:'thorn-psalm', name:'Psalm of Returning Thorns', sigil:'♢', family:'Defense', describe:p=>`Attackers suffer ${pct(.055*p)} of damage dealt to this unit.`, apply:(u,p)=>u.mods.thorns+=.055*p },
  { id:'carrion-draught', name:'Carrion Draught', sigil:'∿', family:'Sustain', describe:p=>`Damaging abilities heal for ${pct(.018*p)} of damage dealt.`, apply:(u,p)=>u.mods.lifesteal+=.018*p },
  { id:'first-verse', name:'First Verse, Drawn Steel', sigil:'Ⅰ', family:'Order', describe:p=>`The first ability in the litany deals ${pct(.12*p)} more damage.`, apply:(u,p)=>u.mods.opener*=1+.12*p },
  { id:'last-word', name:'The Litany’s Last Word', sigil:'Ⅳ', family:'Order', describe:p=>`The final ability in the litany deals ${pct(.15*p)} more damage.`, apply:(u,p)=>u.mods.closer*=1+.15*p },
  { id:'alternating-sigil', name:'Alternating Sigil', sigil:'↯', family:'Order', describe:p=>`Every other damaging cast deals ${pct(.13*p)} more damage.`, apply:(u,p)=>u.mods.alternating*=1+.13*p },
  { id:'clockwork-cadence', name:'Clockwork Cadence', sigil:'Ⅲ', family:'Sequence', describe:p=>`Every third cast deals ${pct(.17*p)} more damage or healing.`, apply:(u,p)=>u.mods.everyThird*=1+.17*p },
  { id:'chain-names', name:'Chain of Seven Names', sigil:'⌁', family:'Propagation', describe:p=>`${pct(.035*p)} chance for damage to leap to another enemy.`, apply:(u,p)=>{u.mods.chainChance+=.035*p;u.mods.chainPower+=.015*p} },
  { id:'salt-circle', name:'Salt in the Wound', sigil:'⊙', family:'Control', describe:p=>`Damaging casts slow their victims by ${pct(.04*p)}.`, apply:(u,p)=>u.mods.slow+=.04*p },
  { id:'candle-ward', name:'A Candle Against Midnight', sigil:'□', family:'Defense', describe:p=>`Every cast grants ${(.8*p).toFixed(1)} barrier.`, apply:(u,p)=>u.mods.barrierPerCast+=.8*p },
  { id:'executioner', name:'Mercy of the Headsman', sigil:'⌄', family:'Violence', describe:p=>`Damage executes graveborn below ${pct(.013*p)} health.`, apply:(u,p)=>u.mods.execute+=.013*p },
  { id:'mercy-ash', name:'Mercy Hidden in Ash', sigil:'✚', family:'Sustain', describe:p=>`Every ${Math.max(3,7-Math.floor(p))} casts restores ${pct(.012*p)} maximum health.`, apply:(u,p)=>{u.mods.healEvery=Math.max(3,7-Math.floor(p));u.mods.healEveryPower+=.012*p} },
  { id:'frugal-rune', name:'The Frugal Rune', sigil:'−', family:'Economy', describe:p=>`All ability AP costs fall by ${pct(.024*p)}.`, apply:(u,p)=>u.mods.cost*=1-.024*p },
  { id:'violence-order', name:'Violence After Kindness', sigil:'✣', family:'Order', describe:p=>`After a heal or ward, the next attack deals ${pct(.18*p)} more damage.`, apply:(u,p)=>u.mods.afterSupport*=1+.18*p },
  { id:'sanctuary', name:'Sanctuary Without Walls', sigil:'⬡', family:'Devotion', describe:p=>`Healing and barriers are ${pct(.065*p)} stronger.`, apply:(u,p)=>{u.mods.healing*=1+.065*p;u.mods.ward*=1+.065*p} },
  { id:'blood-book', name:'A Page from the Blood Book', sigil:'✧', family:'Violence', describe:p=>`Critical chance rises by ${pct(.018*p)}.`, apply:(u,p)=>u.mods.critChance+=.018*p },
  { id:'martyr-glass', name:'The Martyr’s Glass', sigil:'◊', family:'Desperation', describe:p=>`Below 35% health, damage rises by ${pct(.15*p)}.`, apply:(u,p)=>u.mods.lowHpDamage*=1+.15*p },
  { id:'ferryman', name:'Ferryman’s Long Reach', sigil:'↠', family:'Reach', describe:p=>`Ability reach increases by ${(0.22*p).toFixed(1)} measures.`, apply:(u,p)=>u.mods.range+=.22*p },
  { id:'black-harvest', name:'The Black Harvest', sigil:'♁', family:'Harvest', describe:p=>`Each kill restores ${(.55*p).toFixed(1)} health.`, apply:(u,p)=>u.mods.killHeal+=.55*p },
  { id:'twin-chime', name:'Chime Before the Chime', sigil:'◉', family:'Tempo', describe:p=>`Ability recovery is ${pct(.026*p)} faster.`, apply:(u,p)=>u.mods.cooldown*=1-.026*p },
  { id:'grave-sight', name:'Grave-Sight Unclouded', sigil:'◐', family:'Violence', describe:p=>`Enemies above 80% health suffer ${pct(.11*p)} more damage.`, apply:(u,p)=>u.mods.fullHpDamage*=1+.11*p },
  { id:'shroud', name:'Shroud of the Patient', sigil:'▽', family:'Body', describe:p=>`Maximum health rises ${pct(.065*p)} and the same amount is restored.`, apply:(u,p)=>{const gain=u.maxHp*.065*p;u.maxHp+=gain;u.hp+=gain} },
  { id:'chorus', name:'The Unbroken Chorus', sigil:'⌘', family:'Company', describe:p=>`All living allies gain ${pct(.012*p)} damage through this unit’s presence.`, apply:(u,p)=>u.mods.auraDamage+=.012*p },
  { id:'reliquary', name:'Reliquary of One Breath', sigil:'⬢', family:'Defense', describe:p=>`Gain ${Math.round(6*p)} barrier now and at each new bell.`, apply:(u,p)=>{u.mods.startShield+=6*p;u.shield+=6*p} },
  { id:'hunter-gait', name:'The Hunter’s Crooked Gait', sigil:'➶', family:'Motion', describe:p=>`Movement speed rises ${pct(.045*p)} and AP returns slowly while moving.`, apply:(u,p)=>{u.moveSpeed*=1+.045*p;u.mods.movingAp+=.12*p} },
  { id:'close-communion', name:'Close Communion', sigil:'⚔', family:'Melee', describe:p=>`Melee abilities deal ${pct(.085*p)} more damage and grant brief close guard.`, apply:(u,p)=>{u.mods.meleeDamage*=1+.085*p;u.mods.closeGuard+=.018*p} },
  { id:'distant-star', name:'The Distant Red Star', sigil:'⋆', family:'Ranged', describe:p=>`Ranged abilities deal ${pct(.075*p)} more damage.`, apply:(u,p)=>u.mods.rangedDamage*=1+.075*p },
  { id:'ritual-ground', name:'Ground That Remembers', sigil:'◎', family:'Zones', describe:p=>`Persistent zones are ${pct(.09*p)} stronger and wider.`, apply:(u,p)=>u.mods.zonePower*=1+.09*p },
  { id:'venomous-letter', name:'The Venomous Letter', sigil:'☵', family:'Affliction', describe:p=>`Burn, bleed, frost, and curse effects are ${pct(.1*p)} stronger.`, apply:(u,p)=>u.mods.statusPower*=1+.1*p },
  { id:'moth-step', name:'Moth-Step Evasion', sigil:'⟡', family:'Motion', describe:p=>`${pct(.012*p)} chance to evade incoming damage completely.`, apply:(u,p)=>u.mods.dodgeChance+=.012*p },
  { id:'still-candle', name:'The Candle That Does Not Sway', sigil:'┃', family:'Posture', describe:p=>`Standing nearly still builds up to ${Math.round(3.5*p)} barrier.`, apply:(u,p)=>u.mods.stationaryWard+=3.5*p },
  { id:'wolves-at-heel', name:'Wolves at the Heel', sigil:'⋔', family:'Melee', describe:p=>`Enemies within close reach suffer ${pct(.035*p)} more damage from every source.`, apply:(u,p)=>u.mods.closeGuard+=.035*p },
  { id:'mercy-beyond-flesh', name:'Mercy Beyond Flesh', sigil:'♙', family:'Sustain', describe:p=>`${pct(.12*p)} of excess healing becomes barrier.`, apply:(u,p)=>u.mods.overhealWard+=.12*p },
  { id:'shattering-aegis', name:'The Shattering Aegis', sigil:'◈', family:'Defense', describe:p=>`When this unit’s barrier breaks, nearby enemies suffer ${pct(.018*p)} of its maximum health.`, apply:(u,p)=>u.mods.wardBreakNova+=.018*p },
  { id:'pilgrim-momentum', name:'Pilgrim’s Violent Momentum', sigil:'➤', family:'Motion', describe:p=>`After moving for a full measure, the next melee cast deals ${pct(.075*p)} more damage.`, apply:(u,p)=>u.mods.momentumDamage+=.075*p },
  { id:'patient-crosshair', name:'The Patient Crosshair', sigil:'⌖', family:'Posture', describe:p=>`Standing still focuses ranged and zone damage by up to ${pct(.07*p)}.`, apply:(u,p)=>u.mods.aimDamage+=.07*p },
  { id:'epidemic-psalm', name:'The Epidemic Psalm', sigil:'☷', family:'Affliction', describe:p=>`Afflictions on a slain enemy spread at ${pct(.18*p)} strength to nearby graveborn.`, apply:(u,p)=>u.mods.plagueSpread+=.18*p },
  { id:'braided-litany', name:'The Braided Litany', sigil:'⧖', family:'Order', describe:p=>`Changing ability category between casts adds ${pct(.07*p)} damage.`, apply:(u,p)=>u.mods.weaveDamage+=.07*p },
  { id:'starving-heart', name:'The Starving Heart Quickens', sigil:'♥', family:'Desperation', describe:p=>`Below 35% health, AP recovery rises ${pct(.1*p)}.`, apply:(u,p)=>u.mods.lowHpAp+=.1*p },
  { id:'sawtooth-blood', name:'Sawtooth Blood', sigil:'≋', family:'Affliction', describe:p=>`Critical hits also bleed for ${pct(.14*p)} of their damage.`, apply:(u,p)=>u.mods.critBleed+=.14*p },
  { id:'circle-keeper', name:'The Circle Keeps Its Keeper', sigil:'⊚', family:'Zones', describe:p=>`Allies standing in this unit’s ritual zones accumulate barrier.`, apply:(u,p)=>u.mods.zoneWard+=.045*p }
];

export const UPGRADE_CATALOG = blueprints.flatMap((blueprint, artIndex) =>
  tierPower.flatMap((power, tier) => inflections.map((inflection, inflectionIndex) => ({
    id:`${blueprint.id}-${tier}-${inflection.id}`,
    name:`${tierNames[tier]} ${blueprint.name}`,
    shortName:blueprint.name,
    family:blueprint.family,
    sigil:blueprint.sigil,
    rune:inflection.glyph,
    artIndex,
    tier,
    tierName:tierNames[tier],
    inflectionId:inflection.id,
    inflectionIndex,
    inflectionLabel:inflection.label,
    rarity:tier + 1,
    description:`${blueprint.describe(power)} The ${inflection.label} inflection ${inflection.text}.`,
    apply(unit) {
      blueprint.apply(unit, power);
      inflection.apply(unit, power);
      unit.level += 1;
      unit.traits.push(`${blueprint.name} · ${inflection.label}`);
    }
  })))
);

export function getUpgradeRarityProfile(progress = 0) {
  const value=Math.max(0,Math.min(1,progress));
  if(value<.2)return {label:'Whispered',weights:{1:1}};
  if(value<.45)return {label:'Inscribed',weights:{1:.18,2:.82}};
  if(value<.7)return {label:'Graven',weights:{2:.22,3:.78}};
  if(value<.88)return {label:'Deep Graven',weights:{3:.35,4:.65}};
  return {label:'Sovereign',weights:{4:1}};
}

function weightedRarity(weights) {
  const entries=Object.entries(weights),roll=Math.random()*entries.reduce((sum,[,weight])=>sum+weight,0);let cursor=0;
  for(const [rarity,weight] of entries){cursor+=weight;if(roll<=cursor)return Number(rarity)}
  return Number(entries.at(-1)[0]);
}

export function getUpgradeChoices(count = 3, progression = {progress:0}) {
  const legacyMinimum=typeof progression==='number'?progression:null,rarity=legacyMinimum===null?weightedRarity(getUpgradeRarityProfile(progression.progress).weights):null;
  const pool = UPGRADE_CATALOG.filter((upgrade) => legacyMinimum===null?upgrade.rarity===rarity:upgrade.rarity>=legacyMinimum);
  const result = [];
  while (result.length < count) {
    const unusedFamilies=pool.filter((upgrade)=>!result.some((item)=>item.family===upgrade.family));
    const choice = pick(unusedFamilies.length?unusedFamilies:pool);
    if (!result.some((item) => item.id === choice.id)) result.push(choice);
  }
  return result;
}

export const ENEMY_ARCHETYPES = {
  thrall:{ name:'Bone thrall', ai:'rush', hp:23, damage:5.2, speed:1.0, range:.65, attackCost:17, maxAp:24, regen:8.3, scale:.72, color:0xc9c0ad, score:1 },
  hound:{ name:'Ribcage hound', ai:'flank', hp:19, damage:4.8, speed:1.62, range:.55, attackCost:15, maxAp:23, regen:9.2, scale:.64, color:0xc6b49d, score:1, beast:true },
  pikeman:{ name:'Ossuary pikeman', ai:'reach', hp:40, damage:8, speed:.7, range:1.7, attackCost:21, maxAp:30, regen:7.5, scale:.88, color:0xd8ccb2, score:2, polearm:true },
  bowman:{ name:'Hollow bowman', ai:'kite', hp:30, damage:6.5, speed:.66, range:5.4, attackCost:23, maxAp:29, regen:7, scale:.8, color:0xa9aab2, score:2, ranged:true, bow:true },
  harvester:{ name:'Grave harvester', ai:'sweep', hp:68, damage:12, speed:.6, range:1.35, attackCost:28, maxAp:36, regen:7, scale:1.02, color:0xc1ad93, score:4, cleave:true, scythe:true },
  graveguard:{ name:'Graveguard', ai:'guard', hp:78, damage:11.5, speed:.47, range:.8, attackCost:27, maxAp:34, regen:6.8, scale:1.08, color:0xb9aa91, score:4, armored:true },
  cantor:{ name:'Marrow cantor', ai:'support', hp:52, damage:7.5, speed:.54, range:4.2, attackCost:29, maxAp:38, regen:7.2, scale:.95, color:0xb49bc0, score:4, ranged:true, aura:true, staff:true },
  standard:{ name:'Standard of Dust', ai:'standard', hp:72, damage:6, speed:.42, range:3.8, attackCost:31, maxAp:40, regen:6.8, scale:1.02, color:0xc09b83, score:5, ranged:true, standard:true, aura:true },
  wraith:{ name:'Wraithbone', ai:'phase', hp:46, damage:13, speed:.84, range:.75, attackCost:26, maxAp:35, regen:7.8, scale:.92, color:0x8d94b5, score:4, phase:true },
  bishop:{ name:'Ossuary bishop', ai:'bishop', hp:88, damage:12, speed:.38, range:6, attackCost:34, maxAp:46, regen:7, scale:1.08, color:0xb598bd, score:6, ranged:true, bishop:true, staff:true },
  ossuary:{ name:'Walking ossuary', ai:'summon', hp:135, damage:15, speed:.34, range:1, attackCost:32, maxAp:42, regen:6.4, scale:1.3, color:0xbcae99, score:7, armored:true, splits:3 },
  giant:{ name:'Bell-bone giant', ai:'giant', hp:180, damage:20, speed:.35, range:1.1, attackCost:34, maxAp:44, regen:6.2, scale:1.48, color:0xd2b889, score:9, armored:true, cleave:true }
};

export const ENEMY_AFFIXES = [
  { id:'bloodbound', name:'Crimson-Bound', glyph:'◆', color:0xc23d4a, health:1.28, damage:1.12, lifesteal:.2, detail:'Drinks back a portion of every wound it inflicts.' },
  { id:'bulwark', name:'Iron-Caged', glyph:'▰', color:0xb08a5c, health:1.62, damage:.95, speed:.78, startingShield:.34, detail:'Rises inside a second ossuary of plated bone.' },
  { id:'frenzied', name:'Bell-Maddened', glyph:'ϟ', color:0xd87343, health:.92, damage:1.34, speed:1.42, regen:1.36, attackCost:.8, detail:'Moves and attacks with the rhythm of a broken bell.' },
  { id:'volatile', name:'Cinder-Sworn', glyph:'✹', color:0xd55d3d, health:1.14, deathBurst:.09, detail:'Detonates into grave-cinders when its bones part.' },
  { id:'miasma', name:'Moth-Rotted', glyph:'❧', color:0x9a6dad, health:1.2, apDrain:.9, auraRadius:2.85, detail:'A cloud of corpse moths starves nearby oathbound of AP.' },
  { id:'mirror', name:'Mirror-Bone', glyph:'◇', color:0x91a7c8, health:1.16, wardOnHit:.045, detail:'Each blow teaches its bones to grow a glassy ward.' },
  { id:'choirbound', name:'Choir-Bound', glyph:'⌘', color:0x8f769f, health:1.3, linkedGuard:.24, auraRadius:3.5, detail:'Shares a defensive hymn with other choir-bound dead.' },
  { id:'hollowstep', name:'Hollow-Step', glyph:'⟡', color:0x7484b3, health:1.06, dodge:.18, phaseStep:true, detail:'Occasionally steps between the frames of an attack.' }
];

export function rollEnemyAffixes(progress,forcedIds=null) {
  if(Array.isArray(forcedIds))return forcedIds.map((id)=>ENEMY_AFFIXES.find((affix)=>affix.id===id)).filter(Boolean);
  const chance=Math.max(0,(progress-.08)*.58);if(Math.random()>chance)return[];
  const count=progress>.72&&Math.random()<.16?2:1;const pool=[...ENEMY_AFFIXES];const result=[];
  while(result.length<count&&pool.length){const index=Math.floor(Math.random()*pool.length);result.push(pool.splice(index,1)[0])}
  return result;
}

export function chooseEnemyType(progress) {
  const roll = Math.random();
  if (progress > .78 && roll < .055) return 'giant';
  if (progress > .68 && roll < .12) return Math.random()<.5?'ossuary':'bishop';
  if (progress > .52 && roll < .23) return Math.random()<.5?'standard':'wraith';
  if (progress > .34 && roll < .36) return Math.random()<.5?'cantor':'harvester';
  if (progress > .18 && roll < .52) return Math.random() < .5 ? 'graveguard' : 'bowman';
  if (progress > .06 && roll < .7) return Math.random() < .5 ? 'hound' : 'pikeman';
  return Math.random()<.22?'hound':'thrall';
}
