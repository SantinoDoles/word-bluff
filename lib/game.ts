export type Player = { id: string; token: string; name: string; score: number; ready: boolean };
export type Choice = { id: string; text: string; owner: string | null; real: boolean };
export type Room = { code: string; host: string; players: Player[]; phase: 'lobby'|'write'|'guess'|'reveal'|'over'; round: number; deck: number[]; deadline: number; bluffs: Record<string,string>; votes: Record<string,string>; choices: Choice[]; gains: Record<string,number>; expires: number };
export const words = [
 ['Petrichor','The pleasant smell that follows rain on dry ground.'],
 ['Apricity','The warmth of the sun in winter.'],
 ['Borborygmus','A rumbling or gurgling noise in the intestines.'],
 ['Callipygian','Having shapely buttocks.'],
 ['Defenestration','The act of throwing someone or something out of a window.'],
 ['Ultracrepidarian','Someone who gives opinions beyond their knowledge.'],
 ['Agelast','A person who never laughs.'],
 ['Nudiustertian','Relating to the day before yesterday.'],
 ['Absquatulate','To leave abruptly or run away.'],
 ['Liripipe','The long tail of a medieval hood.'],
 ['Quincunx','An arrangement of five things with four at the corners and one in the middle.'],
 ['Widdershins','In a counterclockwise direction.'],
 ['Tittle','A small mark, such as the dot over a lowercase i.'],
 ['Snollygoster','A shrewd, unprincipled person, especially a politician.'],
 ['Sternutation','The act of sneezing.'],
 ['Fugacious','Lasting for only a short time.'],
 ['Crepuscular','Active or occurring at twilight.'],
 ['Dipsomania','An uncontrollable craving for alcohol.'],
 ['Lacuna','A gap or missing part.'],
 ['Mumpsimus','A mistaken practice stubbornly kept despite correction.'],
 ['Opsimath','A person who begins learning late in life.'],
 ['Eructation','The act of belching.'],
 ['Crapulous','Sick from excessive eating or drinking.'],
 ['Floccinaucinihilipilification','The act of treating something as worthless.'],
];
const decoys = ['A small ceremonial bell rung at the end of a meal.','The habit of collecting objects with no practical use.','A narrow passage between two old buildings.','An unexpectedly clever reply made too late.','A moment of silence before an important announcement.','A knot used to fasten a sail in heavy wind.','A sudden urge to rearrange furniture.','The faint glow seen just before sunrise.'];
export function shuffle<T>(arr:T[]):T[] { const a=[...arr]; for(let i=a.length-1;i>0;i--){const bytes=new Uint32Array(1);crypto.getRandomValues(bytes); const j=bytes[0]%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a; }
export function nextRound(r:Room,now:number){r.round++;r.phase='write';r.deadline=now+45000;r.bluffs={};r.votes={};r.choices=[];r.gains={};r.players.forEach(p=>p.ready=false);}
export function advance(r:Room,now:number){
 if(r.phase==='write' && now>=r.deadline){r.phase='guess';r.deadline=r.deadline+25000;r.choices=shuffle([{id:crypto.randomUUID(),text:words[r.deck[r.round-1]][1],owner:null,real:true},...Object.entries(r.bluffs).map(([owner,text])=>({id:crypto.randomUUID(),text,owner,real:false})),...(r.players.length===2?shuffle(decoys).slice(0,2).map(text=>({id:crypto.randomUUID(),text,owner:null,real:false})):[])]);}
 if(r.phase==='guess' && now>=r.deadline){r.phase='reveal';r.deadline=0;r.gains=Object.fromEntries(r.players.map(p=>[p.id,0])); for(const [voter,id] of Object.entries(r.votes)){const c=r.choices.find(c=>c.id===id);if(c?.real)r.gains[voter]+=2;else if(c?.owner)r.gains[c.owner]+=1;}r.players.forEach(p=>{p.score+=r.gains[p.id]||0;p.ready=false;});}
}
export function view(r:Room,p:Player){return {code:r.code,host:r.host,me:p.id,phase:r.phase,round:r.round,deadline:r.deadline,serverNow:Date.now(),word:r.round?words[r.deck[r.round-1]][0]:null,players:r.players.map(x=>({id:x.id,name:x.name,score:x.score,ready:x.ready,submitted:!!r.bluffs[x.id],voted:!!r.votes[x.id]})),myBluff:r.bluffs[p.id]||'',myVote:r.votes[p.id]||null,gains:r.gains,choices:r.phase==='guess'?r.choices.map(c=>({id:c.id,text:c.text,mine:c.owner===p.id})):r.phase==='reveal'||r.phase==='over'?r.choices.map(c=>({...c,voters:Object.entries(r.votes).filter(([,v])=>v===c.id).map(([id])=>id)})):[]};}
