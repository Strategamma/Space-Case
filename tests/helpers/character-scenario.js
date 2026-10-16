import {createRoom,addPlayer,act,tick} from '../../server/game.js';

export function scenario(roles,day=2) {
  const room=createRoom('Crew 0');
  while(room.players.length<roles.length) addPlayer(room,'Crew '+room.players.length);
  roles.forEach((role,i)=>Object.assign(room.players[i],{role,revealed:true,acknowledged:true}));
  room.phase='aftermath';room.day=day-1;
  let now=Date.now()+5000;
  const command=(index,action,data={})=>act(room,room.players[index].id,action,data,now);
  command(0,'night');
  const use=(index,targets=[],mode)=>command(index,'ability',{targets:targets.map(i=>room.players[i].id),...(mode?{mode}:{})});
  const pass=index=>command(index,'ability',{pass:true});
  const hunt=(index,target)=>command(index,'hunt',{targets:[room.players[target].id]});
  const dawn=()=>{now=room.deadline;tick(room,now);};
  const next=()=>{room.phase='aftermath';command(0,'night');};
  const texts=index=>room.players[index].reports.map(r=>r.text).join('\n');
  return {room,p:room.players,command,use,pass,hunt,dawn,next,texts,now:()=>now};
}
