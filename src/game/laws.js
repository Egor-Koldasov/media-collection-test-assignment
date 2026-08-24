export const GRAVE_LAWS=[
  {
    id:'red-tithe',name:'The Law of the Red Tithe',shortName:'RED TITHE',sigil:'◆',color:0xb84249,
    text:'Graveborn rise well-fed, but every broken skeleton mends the weakest living oath.',
    enemy:{health:1.08},run:{onKillHeal:.018}
  },
  {
    id:'hollow-hours',name:'The Law of Hollow Hours',shortName:'HOLLOW HOURS',sigil:'◴',color:0x7583b1,
    text:'AP quickens on both sides. Litanies and dead hands keep a less merciful rhythm.',
    hero:{apRegen:1.16},enemy:{regen:1.15}
  },
  {
    id:'iron-vespers',name:'The Law of Iron Vespers',shortName:'IRON VESPERS',sigil:'▰',color:0xb18a5d,
    text:'Each bell plates the company in warding, while every new graveborn rises behind bone-glass.',
    enemy:{startingShield:.07},run:{bellShield:.07}
  },
  {
    id:'salt-memory',name:'The Law of Salt Memory',shortName:'SALT MEMORY',sigil:'◎',color:0xc9b87c,
    text:'Ritual ground remembers more fiercely; the dead answer by knitting thicker bodies.',
    hero:{zonePower:1.18},enemy:{health:1.07}
  },
  {
    id:'crooked-roads',name:'The Law of Crooked Roads',shortName:'CROOKED ROADS',sigil:'↝',color:0x7f8e7e,
    text:'All paths shorten. Oathbound reposition faster and the procession learns to run.',
    hero:{moveSpeed:1.12},enemy:{speed:1.13}
  },
  {
    id:'black-mirrors',name:'The Law of Black Mirrors',shortName:'BLACK MIRRORS',sigil:'◇',color:0x91a7c8,
    text:'The company finds fatal reflections; struck graveborn grow a thin answering ward.',
    hero:{critChance:.045},enemy:{wardOnHit:.018}
  },
  {
    id:'last-lantern',name:'The Law of the Last Lantern',shortName:'LAST LANTERN',sigil:'◉',color:0xd4a259,
    text:'Near death, oathbound burn violently bright. The dark beyond the lantern strikes harder.',
    hero:{lowHpDamage:1.28},enemy:{damage:1.08}
  },
  {
    id:'bone-weather',name:'The Law of Bone Weather',shortName:'BONE WEATHER',sigil:'☷',color:0xa69b8a,
    text:'The dead arrive faster and more brittle; every oathbound damaging rite cuts deeper.',
    hero:{damage:1.08},enemy:{health:.94},run:{spawnInterval:.88}
  },
  {
    id:'moth-sabbath',name:'The Law of the Moth Sabbath',shortName:'MOTH SABBATH',sigil:'❧',color:0x9a6dad,
    text:'Afflictions bloom lavishly, while corpse-moths teach the procession small evasions.',
    hero:{statusPower:1.2},enemy:{dodge:.035,speed:1.04}
  },
  {
    id:'echoing-dark',name:'The Law of the Echoing Dark',shortName:'ECHOING DARK',sigil:'Ⅱ',color:0xa75e70,
    text:'Some litanies repeat without AP. The dark repeats its injuries with greater force.',
    hero:{echoChance:.045},enemy:{damage:1.09}
  }
];

export function rollGraveLaws(count=2,forcedIds=null){
  if(Array.isArray(forcedIds))return forcedIds.map((id)=>GRAVE_LAWS.find((law)=>law.id===id)).filter(Boolean).slice(0,count);
  const pool=[...GRAVE_LAWS],result=[];while(result.length<count&&pool.length){result.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0])}return result;
}

export function lawProduct(laws,side,key){return laws.reduce((value,law)=>value*(law[side]?.[key]??1),1)}
export function lawSum(laws,side,key){return laws.reduce((value,law)=>value+(law[side]?.[key]??0),0)}

export function applyGraveLawsToHero(laws,unit){
  const health=lawProduct(laws,'hero','health');if(health!==1){unit.maxHp*=health;unit.hp*=health}
  unit.apRegen*=lawProduct(laws,'hero','apRegen');unit.moveSpeed*=lawProduct(laws,'hero','moveSpeed');unit.mods.damage*=lawProduct(laws,'hero','damage');unit.mods.healing*=lawProduct(laws,'hero','healing');unit.mods.zonePower*=lawProduct(laws,'hero','zonePower');unit.mods.statusPower*=lawProduct(laws,'hero','statusPower');unit.mods.lowHpDamage*=lawProduct(laws,'hero','lowHpDamage');unit.mods.critChance+=lawSum(laws,'hero','critChance');unit.mods.echoChance+=lawSum(laws,'hero','echoChance');
  return unit;
}
