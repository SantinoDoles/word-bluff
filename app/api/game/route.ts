import { database } from '@/lib/store';
import { advance,nextRound,shuffle,view,words,type Room } from '@/lib/game';
export const dynamic='force-dynamic';
const answer=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
class GameError extends Error{constructor(message:string,public status=400){super(message);}}
export async function POST(request:Request){try{
 const b=await request.json() as Record<string,unknown>;const db=database();const now=Date.now();
 if(b.action==='create'){
  const name=cleanName(b.name);const id=crypto.randomUUID(),token=crypto.randomUUID();
  for(let i=0;i<5;i++){const code=shuffle('ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.split('')).slice(0,5).join('');const r:Room={code,host:id,players:[{id,token,name,score:0,ready:false}],phase:'lobby',round:0,deck:shuffle(words.map((_,i)=>i)).slice(0,6),deadline:0,bluffs:{},votes:{},choices:[],gains:{},expires:now+4*3600000};const result=await db.prepare('INSERT OR IGNORE INTO rooms (code,data,version,expires) VALUES (?,?,0,?)').bind(code,JSON.stringify(r),r.expires).run();if(result.meta.changes){return answer({token,room:view(r,r.players[0])});}}
  throw new GameError('Could not create a room. Try again.',503);
 }
 const code=String(b.code||'').trim().toUpperCase();if(!/^[A-Z2-9]{5}$/.test(code))throw new GameError('Enter a five-character room code.');
 for(let retry=0;retry<8;retry++){
  const row=await db.prepare('SELECT data,version FROM rooms WHERE code=? AND expires>?').bind(code,now).first<{data:string;version:number}>();if(!row)throw new GameError('Room not found or expired. Check the code.',404);
  const r:Room=JSON.parse(row.data);const before=JSON.stringify(r);advance(r,now);let token=String(b.token||'');let p=r.players.find(p=>p.token===token);
  if(b.action==='join'){
   if(!p){if(r.phase!=='lobby')throw new GameError('This game has started. Join the next game.');if(r.players.length>=8)throw new GameError('This room is full (8 players).');const name=cleanName(b.name);if(r.players.some(p=>p.name.toLowerCase()===name.toLowerCase()))throw new GameError('That name is taken. Pick another.');token=crypto.randomUUID();p={id:crypto.randomUUID(),token,name,score:0,ready:false};r.players.push(p);}
  }else if(!p)throw new GameError('Your seat could not be restored. Join the room again.',401);
  if(!p)throw new GameError('Join the room first.',401);
  switch(b.action){
   case 'join':case 'sync':break;
   case 'start':if(p.id!==r.host)throw new GameError('Only the host can start.');if(r.phase!=='lobby')throw new GameError('The game has already started.');if(r.players.length<2)throw new GameError('At least two players are needed.');nextRound(r,now);break;
   case 'bluff':if(r.phase!=='write')throw new GameError('Writing time is over.');if(r.bluffs[p.id])throw new GameError('Your definition is already locked in.');{const text=String(b.text||'').trim().replace(/\s+/g,' ');if(text.length<3||text.length>180)throw new GameError('Write a definition between 3 and 180 characters.');r.bluffs[p.id]=text;}break;
   case 'vote':if(r.phase!=='guess')throw new GameError('Guessing time is over.');if(r.votes[p.id])throw new GameError('Your guess is already locked in.');{const c=r.choices.find(c=>c.id===b.choice);if(!c||c.owner===p.id)throw new GameError('Choose a definition other than your own.');r.votes[p.id]=c.id;}break;
   case 'ready':if(r.phase!=='reveal')throw new GameError('Wait for the reveal.');p.ready=true;break;
   case 'next':if(p.id!==r.host)throw new GameError('Only the host can advance.');if(r.phase!=='reveal'||!r.players.every(p=>p.ready))throw new GameError('Wait until everyone is ready.');if(r.round===6)r.phase='over';else nextRound(r,now);break;
   case 'restart':if(p.id!==r.host||r.phase!=='over')throw new GameError('Only the host can start a new game after the final results.');r.phase='lobby';r.round=0;r.deck=shuffle(words.map((_,i)=>i)).slice(0,6);r.players.forEach(p=>{p.score=0;p.ready=false;});r.bluffs={};r.votes={};r.choices=[];r.gains={};break;
   case 'leave':if(r.phase!=='lobby')throw new GameError('You can leave your seat in the lobby.');r.players=r.players.filter(x=>x.id!==p!.id);if(r.host===p.id)r.host=r.players[0]?.id||'';break;
   default:throw new GameError('Unknown action.');
  }
  if(JSON.stringify(r)!==before){const result=await db.prepare('UPDATE rooms SET data=?,version=version+1 WHERE code=? AND version=?').bind(JSON.stringify(r),code,row.version).run();if(!result.meta.changes)continue;}
  return answer({token,room:b.action==='leave'?null:view(r,p)});
 }
 throw new GameError('The room is busy. Please try again.',409);
 }catch(error){if(error instanceof GameError)return answer({error:error.message},error.status);console.error('Game request failed',error);return answer({error:'The room service is unavailable. Your input is saved on this screen; please try again.'},503);}}
function cleanName(value:unknown){const name=String(value||'').trim().replace(/\s+/g,' ');if(name.length<1||name.length>18)throw new GameError('Use a name between 1 and 18 characters.');return name;}


