import { spawn } from 'node:child_process';
import { once, EventEmitter } from 'node:events';
// Minimal Engine.IO / Socket.IO test peer; uses Node's built-in WebSocket,
// so transport checks do not need another test dependency or a browser.
export class Peer extends EventEmitter {
  constructor(url) {
    super(); this.socket = new WebSocket(url.replace('http','ws') + '/socket.io/?EIO=4&transport=websocket'); this.pending = new Map(); this.sequence = 0;
    this.ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Connection timed out')), 5000);
      this.socket.addEventListener('error', reject);
      this.socket.addEventListener('message', event => {
        const message = String(event.data);
        if (message.startsWith('0')) this.socket.send('40');
        else if (message === '2') this.socket.send('3');
        else if (message.startsWith('40')) { clearTimeout(timer); resolve(); }
        else if (message.startsWith('42')) {
          const [name, payload] = JSON.parse(message.slice(2));
          if (name === 'state') { this.state = payload; this.emit('state',payload); }
          else this.emit(name, payload);
        } else if (message.startsWith('43')) {
          const bracket = message.indexOf('['), id = Number(message.slice(2,bracket));
          const finish = this.pending.get(id); if (finish) { this.pending.delete(id); finish(JSON.parse(message.slice(bracket))[0]); }
        }
      });
    });
  }
  async command(action,data={}) {
    await this.ready;
    return new Promise((resolve,reject) => {
      const id=++this.sequence, timer=setTimeout(()=>reject(new Error(`No reply to ${action}`)),5000);
      this.pending.set(id,result=>{clearTimeout(timer);resolve(result);});
      this.socket.send(`42${id}${JSON.stringify(['command',{action,data}])}`);
    });
  }
  async wait(predicate, timeout=5000) {
    if (this.state&&predicate(this.state)) return this.state;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.off('state',listener);reject(new Error('State transition timed out'));},timeout);
      const listener=state=>{if(predicate(state)){clearTimeout(timer);this.off('state',listener);resolve(state);}};
      this.on('state',listener);
    });
  }
  close(){this.socket.close();}
}
export async function boot(file, extraEnv={}) {
  const child=spawn(process.execPath,['server/index.js'],{cwd:process.cwd(),env:{...process.env,PORT:'0',DATA_FILE:file,DATABASE_URL:'',NODE_ENV:'test',...extraEnv},stdio:['ignore','pipe','pipe']});
  const url=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Server did not start')),5000);
    child.stdout.on('data',data=>{const match=String(data).match(/http:\/\/localhost:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});
    child.on('error',reject); child.stderr.on('data',data=>{ if(String(data).includes('Error')) reject(new Error(String(data))); });
  });
  return { url, async stop(){child.kill('SIGTERM');await once(child,'exit');} };
}
