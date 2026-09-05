import { competitionReplay } from '../app/competitionEngine.js';
const passage = 'clear practice helps build steady rhythm '.repeat(100).slice(0,4000);
const events = [];
for (const character of passage) {
  for (let retry=0;retry<2;retry++) {
    events.push({type:'input',text:'X',at:events.length*5});
    events.push({type:'backspace',at:events.length*5});
  }
  events.push({type:'input',text:character,at:events.length*5});
}
const recording=JSON.stringify(events);
const rules={version:'competition-1',finish:'passage',correction:'required',autoIndent:false};
const samples=[];
for(let run=0;run<60;run++) {
  const start=performance.now(); competitionReplay(passage,rules,JSON.parse(recording));
  if(run>=10) samples.push(performance.now()-start);
}
samples.sort((a,b)=>a-b);
console.log(JSON.stringify({environment:'Local Node, not production Workers',characters:passage.length,events:events.length,bytes:Buffer.byteLength(recording),samples:samples.length,medianMs:Number(samples[25].toFixed(2)),p95Ms:Number(samples[47].toFixed(2))},null,2));
