import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { act, addPlayer, connection, createRoom, ensureAvatars, project, tick, syncLobby } from './game.js';
import { openStore } from './store.js';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const store = await openStore(), rooms = new Map();
for (const room of await store.load()) {
  ensureAvatars(room);
  room.players.forEach(p => { p.online = false; });
  room.pause = { reason: 'captain', remaining: room.pause?.remaining ?? (room.deadline ? Math.max(0, room.deadline - room.updatedAt) : null) }; room.consent = [];
  if(room.phase==='voting'&&!room.nomination?.completedAt&&room.nomination?.startedAt!==undefined)room.nomination.pausedAt??=room.updatedAt;
  rooms.set(room.code, room);
}
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' ws: wss:; font-src 'self'; frame-ancestors 'none'; base-uri 'self'");
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, {Allow:'GET, HEAD'}); return res.end(); }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/health') {
      let ok=false;try {ok=!shuttingDown&&await store.healthy();}catch {}
      res.writeHead(ok?200:503, { 'Content-Type':'application/json', 'Cache-Control':'no-store' });
      return res.end(req.method==='HEAD'?undefined:JSON.stringify({ok}));
    }
    const path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) throw new Error('Invalid path');
    await stat(path); const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': ['.html', '.js', '.css', '.webmanifest'].includes(extname(path)) ? 'no-cache' : 'public, max-age=3600' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Station not found.'); }
});
const io = new Server(server, { maxHttpBufferSize: 8192, pingInterval: 15_000, pingTimeout: 20_000, allowRequest: (req, done) => {
  const origin = req.headers.origin;
  if (!origin) return done(null, true);
  try { done(null, new URL(origin).host === req.headers.host); } catch { done(null, false); }
} });
const availability = room => ({ code: room.code, phase: room.phase, taken: room.players.map(p => p.avatar) });
const emit = room => {
  for (const socket of io.sockets.sockets.values()) if (socket.data.inspectCode === room.code) socket.emit('availability', availability(room));
  for (const socket of io.sockets.sockets.values()) if (socket.data.code === room.code) {
    if (!room.players.some(p => p.id === socket.data.player)) { socket.data = {}; socket.emit('removed'); }
    else socket.emit('state', project(room, socket.data.player));
  }
};
const persist = async room => {
  room.updatedAt=Date.now();
  try {await store.save(rooms,room.code);}
  catch(error) {console.error('Snapshot failed:',error.message);throw new Error('The ship could not save this transmission. Try again in a moment.');}
};
let stateWork=Promise.resolve();
const rejectCommand = (message, code) => { throw Object.assign(new Error(message), {code}); };
const serial=work=>{const next=stateWork.then(work);stateWork=next.catch(()=>{});return next;};
io.on('connection', socket => {
  let requests = [], busy = false;
  socket.on('command', (message, reply = () => {}) => serial(async () => {
    if (typeof reply !== 'function') return;
    let changedRoom=null, previousRoom=null, takeover=[]; const previousSocket={...socket.data};
    try {
      const now = Date.now(); requests = requests.filter(t => now - t < 10_000); requests.push(now);
      if (requests.length > 60) throw new Error('Too many transmissions. Try again in a moment.');
      if (busy) throw new Error('Your last transmission is still being saved.');
      busy = true;
      if (!message || typeof message !== 'object') throw new Error('Invalid transmission.');
      const { action, data = {} } = message;
      if (action === 'inspect') {
        if (socket.data.code) throw new Error('You are already aboard.');
        const room = typeof data.code === 'string' ? rooms.get(data.code.trim().toUpperCase()) : null;
        if (!room) rejectCommand('That voyage was not found. Check the code; it may have expired. Ask the Captain to start a new voyage if it is no longer available.', 'ROOM_NOT_FOUND');
        if (room.phase !== 'lobby') throw new Error('This voyage has already launched.');
        socket.data.inspectCode = room.code;
        reply({ ok: true, availability: availability(room) });
      } else if (action === 'uninspect') {
        delete socket.data.inspectCode; reply({ ok: true });
      } else if (['create', 'join', 'resume'].includes(action)) {
        const requestedCode=typeof data.code==='string'?data.code.trim().toUpperCase():null;
        if (socket.data.code && !(action === 'resume' && socket.data.code === requestedCode && rooms.get(socket.data.code)?.players.some(p=>p.id===socket.data.player && p.token===data.token))) rejectCommand('Leave your current voyage first.', 'ALREADY_ABOARD');
        let room, me;
        if (action === 'create') {
          if (rooms.size >= 300) throw new Error('All docks are busy. Try again later.');
          room = createRoom(data.name, data.avatar); while (rooms.has(room.code)) room = createRoom(data.name, data.avatar); rooms.set(room.code, room); me = room.players[0]; changedRoom=room;
        } else {
          if (typeof data.code !== 'string') throw new Error('Enter a six-character boarding code.');
          room = rooms.get(data.code.trim().toUpperCase()); if (!room) rejectCommand('That voyage was not found. Check the code; it may have expired. Ask the Captain to start a new voyage if it is no longer available.', 'ROOM_NOT_FOUND');
          changedRoom=room; previousRoom=structuredClone(room);
          if (action === 'resume') {
            me = room.players.find(p => p.token === data.token); if (!me) rejectCommand('Your boarding pass has expired or this berth was released.', 'PASS_INVALID');
            takeover = [...io.sockets.sockets.values()].filter(other=>other.id !== socket.id && other.data.code === room.code && other.data.player === me.id);
            connection(room, me.id, true);
          } else {
            if (room.phase !== 'lobby') throw new Error('This voyage has launched. You can rejoin only with your saved boarding pass.');
            me = addPlayer(room, data.name, true, data.avatar);
          }
        }
        socket.data = { code: room.code, player: me.id }; await persist(room);
        for (const other of takeover) { other.emit('session-moved'); other.data = {}; other.disconnect(true); }
        reply({ ok: true, session: { code: room.code, token: me.token } }); emit(room);
      } else {
        const room = rooms.get(socket.data.code); if (!room) throw new Error('Board a ship first.');
        changedRoom=room; previousRoom=structuredClone(room);
        if (action === 'leave') {
          const me = room.players.find(p => p.id === socket.data.player);
          socket.data = {};
          if (room.phase === 'lobby' && room.players.length > 1) {
            room.players = room.players.filter(p => p.id !== me.id);
            if (room.host === me.id) { room.host = room.players[0].id; room.settings.playing = room.players[0].playing; }
            syncLobby(room);
          } else connection(room, me.id, false);
        } else act(room, socket.data.player, action, data);
        await persist(room); reply({ ok: true, retained: action === 'leave' && room.players.some(p=>p.id===previousSocket.player) }); emit(room);
      }
    } catch (error) {
      if(changedRoom) { if(previousRoom) { for(const key of Object.keys(changedRoom)) delete changedRoom[key]; Object.assign(changedRoom,previousRoom); } else rooms.delete(changedRoom.code); socket.data=previousSocket; }
      reply({ ok: false, error: error.message, code: error.code || 'RETRY' });
    }
    finally { busy = false; }
  }));
  socket.on('disconnect', () => serial(async () => {
    const room = rooms.get(socket.data.code); if (!room) return;
    connection(room, socket.data.player, false);
    try { await persist(room); emit(room); } catch (error) { console.error('Snapshot failed:', error.message); }
  }));
});
let clockBusy=false;
const timer = setInterval(() => {
  if(clockBusy) return; clockBusy=true;
  serial(async()=>{
    for(const room of rooms.values()) {
      const before=structuredClone(room);
      if(tick(room)) {
        try {await persist(room);emit(room);}
        catch(error) {for(const key of Object.keys(room))delete room[key];Object.assign(room,before);console.error('Snapshot failed:',error.message);}
      }
      if(room.updatedAt&&Date.now()-room.updatedAt>86_400_000&&!room.players.some(p=>p.online)) rooms.delete(room.code);
    }
  }).catch(error=>console.error('Clock failed:',error.message)).finally(()=>{clockBusy=false;});
},500);
const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => console.log(`Space Case listening on http://localhost:${server.address().port}`));
let shuttingDown=false;
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, async () => {
  if(shuttingDown) return; shuttingDown=true; clearInterval(timer);
  await new Promise(resolve=>io.close(resolve));
  server.close();
  try {await stateWork;await store.close();} finally {process.exit(0);}
});
