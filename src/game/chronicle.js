const STORAGE_KEY='twentieth-bell-grave-archive-v1';

const defaults=()=>({
  runs:0,victories:0,defeats:0,bestBell:1,bestTally:0,
  discoveredEnemies:[],discoveredAffixes:[],discoveredRites:[],encounters:[],discoveredLaws:[],discoveredOrigins:[],lawRecords:{},lawPairRecords:{}
});

function persist(chronicle){
  try{if(typeof window!=='undefined'&&window.localStorage)window.localStorage.setItem(STORAGE_KEY,JSON.stringify(chronicle))}catch{/* The grave archive is optional when storage is forbidden. */}
}

export function loadChronicle(){
  try{
    if(typeof window==='undefined'||!window.localStorage)return defaults();
    const stored=JSON.parse(window.localStorage.getItem(STORAGE_KEY)||'null');if(!stored)return defaults();
    const base=defaults();return{...base,...stored,
      discoveredEnemies:Array.isArray(stored.discoveredEnemies)?stored.discoveredEnemies:[],
      discoveredAffixes:Array.isArray(stored.discoveredAffixes)?stored.discoveredAffixes:[],
      discoveredRites:Array.isArray(stored.discoveredRites)?stored.discoveredRites:[],
      encounters:Array.isArray(stored.encounters)?stored.encounters:[],
      discoveredLaws:Array.isArray(stored.discoveredLaws)?stored.discoveredLaws:[],
      discoveredOrigins:Array.isArray(stored.discoveredOrigins)?stored.discoveredOrigins:[],
      lawRecords:stored.lawRecords&&typeof stored.lawRecords==='object'&&!Array.isArray(stored.lawRecords)?stored.lawRecords:{},
      lawPairRecords:stored.lawPairRecords&&typeof stored.lawPairRecords==='object'&&!Array.isArray(stored.lawPairRecords)?stored.lawPairRecords:{}
    };
  }catch{return defaults()}
}

export function discoverEnemy(chronicle,type,affixIds=[]){
  let changed=false;if(!chronicle.discoveredEnemies.includes(type)){chronicle.discoveredEnemies.push(type);changed=true}
  affixIds.forEach((id)=>{if(!chronicle.discoveredAffixes.includes(id)){chronicle.discoveredAffixes.push(id);changed=true}});
  if(changed)persist(chronicle);return changed;
}

export function discoverRite(chronicle,id){
  if(chronicle.discoveredRites.includes(id))return false;chronicle.discoveredRites.push(id);persist(chronicle);return true;
}

export function discoverEncounter(chronicle,id){
  if(chronicle.encounters.includes(id))return false;chronicle.encounters.push(id);persist(chronicle);return true;
}

export function discoverLaw(chronicle,id){
  if(chronicle.discoveredLaws.includes(id))return false;chronicle.discoveredLaws.push(id);persist(chronicle);return true;
}

export function discoverOrigin(chronicle,id){
  if(chronicle.discoveredOrigins.includes(id))return false;chronicle.discoveredOrigins.push(id);persist(chronicle);return true;
}

export function recordRun(chronicle,{victory,kills,elapsed,lawIds=[]}){
  const bell=Math.min(20,Math.floor(elapsed/60)+1),updateRecord=(records,key)=>{const record=records[key]||{runs:0,wins:0,bestBell:1,bestTally:0};record.runs+=1;record.wins+=victory?1:0;record.bestBell=Math.max(record.bestBell,bell);record.bestTally=Math.max(record.bestTally,kills);records[key]=record};
  chronicle.runs+=1;chronicle.victories+=victory?1:0;chronicle.defeats+=victory?0:1;chronicle.bestBell=Math.max(chronicle.bestBell,bell);chronicle.bestTally=Math.max(chronicle.bestTally,kills);lawIds.forEach((id)=>updateRecord(chronicle.lawRecords,id));if(lawIds.length>1)updateRecord(chronicle.lawPairRecords,[...lawIds].sort().join('|'));persist(chronicle);
}
