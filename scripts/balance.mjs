globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({font:'',textAlign:'',fillStyle:'',shadowColor:'',shadowBlur:0,fillText(){}})})};

const {Game,UPGRADE_DROP_TIMES}=await import('../src/game/Game.js');
const {getUpgradeRarityProfile}=await import('../src/game/catalog.js');

const rolePreferences={
  vanguard:['Melee','Violence','Defense','Body','Sustain'],
  guardian:['Defense','Company','Control','Devotion','Sustain'],
  support:['Devotion','Sustain','Economy','Company','Zones'],
  artillery:['Ranged','Zones','Affliction','Posture','Propagation'],
  skirmisher:['Motion','Melee','Harvest','Order','Desperation']
};
const runCount=Math.max(1,Number(process.argv[2])||10),difficulty=Math.min(5,Math.max(1,Number(process.argv[3])||4)),results=[];

for(let run=0;run<runCount;run+=1){
  let game,ended=null;
  game=new Game(null,{
    onUpgrade:(choices)=>{
      let best=null;
      for(const unit of game.units.filter((candidate)=>candidate.alive)){
        for(const choice of choices){
          const preferences=rolePreferences[unit.role]||[];
          const match=preferences.includes(choice.family)?6-preferences.indexOf(choice.family):0;
          const need=unit.hp/unit.maxHp<.48&&['Defense','Sustain','Body','Devotion'].includes(choice.family)?3:0;
          const score=choice.rarity*12+match+need+(1-unit.hp/unit.maxHp)*5+Math.max(0,5-unit.level)*.65;
          if(!best||score>best.score)best={unit,choice,score};
        }
      }
      if(best)game.applyUpgrade(best.choice,best.unit.id);
      game.resumeAfterUpgrade();
    },
    onEnd:(result)=>{ended=result}
  },{headless:true,difficulty});

  game.start();let steps=0,peakEnemies=0;
  while(!game.ended&&steps<25000){game.update(.05);steps+=1;peakEnemies=Math.max(peakEnemies,game.enemies.length)}
  results.push({
    run:run+1,victory:!!ended?.victory,elapsed:Number(game.elapsed.toFixed(1)),
    bell:Math.min(20,Math.floor(game.elapsed/60)+1),kills:game.killCount,
    heroes:game.units.filter((unit)=>unit.alive).length,upgrades:game.appliedUpgradeIds.size,
    peakEnemies,laws:game.graveLaws.map((law)=>law.shortName)
  });
  game.destroy();
}

const elapsed=results.map((run)=>run.elapsed).sort((a,b)=>a-b);
const report={
  summary:{
    difficulty,
    wins:results.filter((run)=>run.victory).length,total:results.length,
    medianSeconds:elapsed[Math.floor(elapsed.length/2)],minimumSeconds:elapsed[0],maximumSeconds:elapsed.at(-1),
    averageKills:Math.round(results.reduce((sum,run)=>sum+run.kills,0)/results.length)
  },
  upgradeProgression:{
    drops:UPGRADE_DROP_TIMES.length,
    atSeconds:UPGRADE_DROP_TIMES,
    intervals:UPGRADE_DROP_TIMES.map((time,index)=>time-(UPGRADE_DROP_TIMES[index-1]||0)),
    rarityStages:[0,.2,.45,.7,.88,1].map((progress)=>({progress,profile:getUpgradeRarityProfile(progress)}))
  },
  runs:results
};

console.log(JSON.stringify(report,null,2));
