import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
const extract=name=>{const a=source.indexOf(`function ${name}(`),b=source.indexOf('\nfunction ',a+1);return source.slice(source.lastIndexOf('async ',a-1)===a-6?a-6:a,b);};

test('client retains credentials on transient resume errors and lost acknowledgements; invalidates terminal errors only',async()=>{
  const pass={code:'ABC123',token:'a'.repeat(64)},other={code:'DEF456',token:'b'.repeat(64)};
  const stored={[pass.code]:pass,[other.code]:other}, timers=[];
  let reply={ok:false,code:'RETRY',error:'save temporarily unavailable'};
  const context=vm.createContext({session:pass,state:null,resumePending:false,resumeTimer:null,resumeAttempts:0,sessionMoved:false,
    save(){},clearTimeout(){},setTimeout(fn){timers.push(fn)},toast(){},render(){},
    retainPass(value){context.session=value},discardPass(code){delete stored[code]},
    socket:{connected:true,timeout(){return this},emit(event,data,callback){callback(null,reply)}}});
  vm.runInContext(extract('resumeVoyage'),context);
  assert.equal(await context.resumeVoyage(),false);assert.equal(stored[pass.code],pass);assert.equal(timers.length,1);
  reply={ok:true,session:pass};assert.equal(await context.resumeVoyage(),true);assert.equal(context.resumeAttempts,0);
  reply={ok:false,code:'PASS_INVALID',error:'expired'};assert.equal(await context.resumeVoyage(),false);
  assert.equal(stored[pass.code],undefined);assert.equal(stored[other.code],other);
  stored[pass.code]=pass;
  context.socket.emit=(event,data,callback)=>{context.state={phase:'night'};callback(new Error('ack lost'));};
  assert.equal(await context.resumeVoyage(),true);assert.equal(stored[pass.code],pass);
});

test('light cycle orders put reports before guidance; dark cycle puts actions first; initial briefing teaches power first',()=>{
  const state={phase:'discussion',me:{alive:true,role:'cadet'},pause:null};
  const context=vm.createContext({state,socket:{connected:true},newcomerBriefing:()=>'<guidance>',privateReports:()=>'<reports>',
    esc:String,canHunt:()=>false,actionCard:()=>'<action>',ROLES:{cadet:{}}});
  vm.runInContext(extract('ordersBody'),context);
  const role={description:'POWER',timing:'TIMING'},caps={ability:{active:false},hunt:{},restrictions:{}};
  const light=context.ordersBody(role,false,caps);assert.ok(light.indexOf('<reports>')<light.indexOf('<guidance>'));
  state.phase='night';const dark=context.ordersBody(role,false,caps);assert.ok(dark.indexOf('<action>')<dark.indexOf('<reports>'));
  state.phase='orders';const initial=context.ordersBody(role,false,caps);assert.ok(initial.indexOf('POWER')<initial.indexOf('<reports>'));
});

test('opening orders only marks visible reports, preserving unseen and collapsed history as unread',()=>{
  let saved;
  const cards=[{dataset:{reportId:'visible'},getBoundingClientRect:()=>({top:10,bottom:100,height:90})},
    {dataset:{reportId:'below-fold'},getBoundingClientRect:()=>({top:600,bottom:700,height:100})},
    {dataset:{reportId:'collapsed'},getBoundingClientRect:()=>({top:0,bottom:0,height:0})}];
  const state={me:{reports:cards.map(c=>({id:c.dataset.reportId}))}};
  const context=vm.createContext({state,modal:{open:true,classList:{contains:()=>true},getBoundingClientRect:()=>({top:0,bottom:500}),querySelectorAll:()=>cards},
    ordersReadKey:()=> 'room:seat:match',read:()=>null,save:(key,value)=>saved=value,reportId:r=>r.id,
    document:{querySelectorAll(){throw new Error('Unread badge must remain')}}});
  vm.runInContext(extract('markOrdersRead').split("modal.addEventListener")[0],context);context.markOrdersRead();
  assert.deepEqual([...saved.reports],['visible']);
});

test('production service worker activates a waiting update only on the explicit update message',async()=>{
  const worker=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
  const listeners={};let activations=0;
  const self={location:{hostname:'game.example'},addEventListener:(name,fn)=>listeners[name]=fn,skipWaiting:async()=>{activations++;}};
  vm.runInNewContext(worker,{self});
  listeners.message({data:{type:'unrelated'},waitUntil(){throw new Error('Unexpected activation')}});assert.equal(activations,0);
  await new Promise(resolve=>listeners.message({data:{type:'ACTIVATE_UPDATE'},waitUntil:promise=>promise.then(resolve)}));
  assert.equal(activations,1);
});

test('nomination portraits enforce living/unused seats, preserve valid choices and allow self-nomination',()=>{
  const people=[{id:'a',name:'Casey',playing:true,alive:true,avatar:0},{id:'b',name:'Nova',playing:true,alive:true,avatar:1},{id:'c',name:'Fallen',playing:true,alive:false,avatar:2},{id:'d',name:'Observer',playing:false,alive:true,avatar:3}];
  const context=vm.createContext({state:{players:people,nominations:[],me:{id:'a'}},nominationChoice:{from:'',to:''},esc:String,avatar:i=>`portrait-${i}`,button:()=>'',icon:()=>''});
  vm.runInContext(extract('nominationPicker'),context);
  const first=context.nominationPicker();assert.match(first,/Who is nominating/);assert.match(first,/data-id="a"/);assert.doesNotMatch(first,/data-id="c"|data-id="d"|<select/);
  context.nominationChoice={from:'a',to:''};assert.match(context.nominationPicker(),/Self-nomination allowed/);
  context.nominationChoice={from:'a',to:'a'};const self=context.nominationPicker();assert.match(self,/Casey nominates Casey/);assert.match(self,/Open secret ballot/);
  context.state.nominations=[{from:'a',to:'b'}];context.nominationPicker();assert.equal(context.nominationChoice.from,'');
  context.nominationChoice={from:'b',to:'b'};const restricted=context.nominationPicker();assert.equal(context.nominationChoice.to,'');assert.match(restricted,/data-id="b" disabled/);
});

test('game setup and nominations contain no native dropdown controls',()=>{
  assert.doesNotMatch(source,/<select\b|<option\b/);
  assert.match(source,/type="radio" name="discussion"/);assert.match(source,/type="radio" name="night"/);
});
