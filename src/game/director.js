const pick=(items)=>items[Math.floor(Math.random()*items.length)];

const PACK_RECIPES=[
  { id:'scrape', name:'The first scraping', min:0, weight:8, size:[1,2], pool:['thrall','thrall','hound'], formation:'cluster', tags:['rush'] },
  { id:'spearpoint', name:'A spearpoint rises', min:.07, weight:5, size:[2,3], anchor:'pikeman', pool:['thrall','hound','pikeman'], formation:'wedge', tags:['melee'] },
  { id:'hollow-volley', name:'The hollow volley', min:.16, weight:4, size:[2,3], anchor:'bowman', pool:['bowman','thrall','pikeman'], formation:'line', tags:['ranged'] },
  { id:'raven-fork', name:'The raven fork', min:.22, weight:3.6, size:[3,4], anchor:'bowman', pool:['bowman','hound','thrall'], formation:'pincer', tags:['flank','ranged'] },
  { id:'grave-file', name:'The grave file', min:.27, weight:4, size:[2,4], anchor:'graveguard', pool:['graveguard','pikeman','hound','harvester'], formation:'wedge', tags:['armor','melee'] },
  { id:'hooked-wing', name:'The hooked wing', min:.31, weight:3.2, size:[3,4], anchor:'harvester', pool:['hound','pikeman','harvester'], formation:'arc', tags:['flank','cleave'] },
  { id:'marrow-choir', name:'The marrow choir', min:.36, weight:3.4, size:[3,4], anchor:'cantor', pool:['cantor','thrall','graveguard','bowman'], formation:'arc', tags:['support'] },
  { id:'reliquary-breakers', name:'The reliquary breakers', min:.42, weight:2.9, size:[3,5], anchor:'harvester', pool:['harvester','graveguard','pikeman'], formation:'column', tags:['armor','cleave'] },
  { id:'dust-standard', name:'The standard of dust', min:.48, weight:3, size:[3,5], anchor:'standard', pool:['standard','graveguard','pikeman','bowman'], formation:'line', tags:['support','ranged'] },
  { id:'unquiet-veil', name:'The unquiet veil', min:.56, weight:2.6, size:[2,4], anchor:'wraith', pool:['wraith','hound','bowman'], formation:'arc', tags:['flank'] },
  { id:'pale-hunt', name:'The pale hunt', min:.61, weight:2.35, size:[3,5], anchor:'wraith', pool:['wraith','hound','hound','bowman'], formation:'pincer', tags:['flank','rush'] },
  { id:'black-clergy', name:'The black clergy', min:.66, weight:2.2, size:[3,5], anchor:'bishop', pool:['bishop','cantor','graveguard','wraith'], formation:'wedge', tags:['support','ranged'] },
  { id:'episcopal-wall', name:'The episcopal wall', min:.71, weight:1.9, size:[4,5], anchor:'bishop', pool:['graveguard','graveguard','cantor','pikeman'], formation:'line', tags:['support','armor'] },
  { id:'walking-crypt', name:'A walking crypt', min:.75, weight:1.8, size:[3,5], anchor:'ossuary', pool:['ossuary','graveguard','standard','cantor'], formation:'cluster', tags:['siege'] },
  { id:'shattered-nave', name:'The shattered nave', min:.81, weight:1.55, size:[4,5], anchor:'ossuary', pool:['wraith','hound','graveguard','cantor'], formation:'pincer', tags:['siege','flank'] },
  { id:'bell-court', name:'The court of the bell', min:.86, weight:1.25, size:[3,5], anchor:'giant', pool:['giant','bishop','standard','wraith'], formation:'arc', tags:['catastrophe','support'] }
];

export const BELL_ENCOUNTERS=[
  { minute:3, title:'THE HOUND MOON', sigil:'☾', omen:'Ribcages learn the shape of hunger.', types:['hound','hound','hound','hound','thrall'], formation:'arc', elites:{2:['frenzied']} },
  { minute:6, title:'THE PROCESSION OF SPEARS', sigil:'↟', omen:'The eastern graves rise in military order.', types:['pikeman','pikeman','pikeman','graveguard','bowman'], formation:'line', elites:{3:['bulwark']} },
  { minute:9, title:'THE CHOIR BENEATH', sigil:'⌘', omen:'A hymn arrives before its singers.', types:['cantor','thrall','thrall','graveguard','bowman','bowman'], formation:'wedge', elites:{0:['miasma']} },
  { minute:12, title:'THE VEIL WITHOUT WIND', sigil:'◐', omen:'Some of the dead decline to remain in one place.', types:['wraith','wraith','wraith','bishop'], formation:'arc', elites:{0:['hollowstep'],3:['choirbound']} },
  { minute:15, title:'THE WALKING OSSUARY', sigil:'⬢', omen:'A chapel tears up its roots and walks.', types:['ossuary','graveguard','graveguard','cantor','standard'], formation:'wedge', elites:{0:['bulwark','mirror'],4:['choirbound']} },
  { minute:18, title:'THE BELL-BONE CORONATION', sigil:'◉', omen:'The last king has brought his own bell.', types:['giant','bishop','standard','wraith','wraith'], formation:'arc', elites:{0:['bloodbound','volatile'],1:['miasma'],2:['choirbound']} }
];

function weightedPick(items){
  const total=items.reduce((sum,item)=>sum+item.weight,0);let roll=Math.random()*total;
  for(const item of items){roll-=item.weight;if(roll<=0)return item}
  return items[items.length-1];
}

export function chooseSpawnPack(progress,context={}){
  const weighted=PACK_RECIPES.filter((item)=>progress>=item.min).map((item)=>{let weight=item.weight;const tags=item.tags||[];if(context.backlineShare>.45&&tags.includes('flank'))weight*=1.75;if(context.zoneCount>1&&tags.includes('ranged'))weight*=1.5;if(context.enemyCount>26&&item.size[1]>=5)weight*=.62;if(context.averageHealth<.42&&tags.includes('catastrophe'))weight*=.5;if(context.livingCount<=2&&(tags.includes('rush')||tags.includes('cleave')))weight*=.72;return{...item,weight}});
  const recipe=weightedPick(weighted);
  const [minimum,maximum]=recipe.size;const size=minimum+Math.floor(Math.random()*(maximum-minimum+1));const types=[];
  if(recipe.anchor)types.push(recipe.anchor);
  while(types.length<size)types.push(pick(recipe.pool));
  return{id:recipe.id,name:recipe.name,types,formation:recipe.formation};
}

export function getBellEncounter(minute){return BELL_ENCOUNTERS.find((event)=>event.minute===minute)||null}

export function createFormationPositions(count,cameraRight,formation='cluster',angle=Math.random()*Math.PI*2){
  const radiusX=Math.max(10.7,Math.abs(cameraRight)*.9),radiusY=7.15;const positions=[];
  for(let i=0;i<count;i+=1){
    const centered=i-(count-1)/2;let localAngle=angle,depth=0,tangent=centered*.64;
    if(formation==='arc')localAngle=angle+centered*.075;
    if(formation==='wedge'){depth=Math.abs(centered)*.42;tangent=centered*.55}
    if(formation==='cluster'){depth=(i%3)*.24;tangent=centered*.38+(Math.random()-.5)*.32}
    if(formation==='column'){depth=i*.42;tangent=(i%2?1:-1)*.18}
    if(formation==='pincer'){localAngle=angle+(i%2?Math.PI*.5:-Math.PI*.5);depth=Math.floor(i/2)*.28;tangent=centered*.16}
    const nx=Math.cos(localAngle),ny=Math.sin(localAngle),tx=-ny,ty=nx;
    positions.push({x:nx*(radiusX+depth)+tx*tangent,y:ny*(radiusY+depth*.55)+ty*tangent*.72});
  }
  return positions;
}
