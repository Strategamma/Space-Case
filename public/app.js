import { cycleText } from './cycles.js?v=1.0.0';
import { ROLES, isHollow, canHunt } from './roles.js?v=1.0.0';
import { CARD_LIMITS, factionLimits, poolError, poolSize, evilCount, randomPool, togglePoolRole, adjustPoolCopies } from './setup.js?v=1.0.0';
import { NIGHT_ORDER, scriptOrder } from './script.js?v=1.0.1-order';
import { ROLE_GUIDES } from './wiki.js?v=1.0.0';
import { AVATARS } from './avatars.js';

const $ = selector => document.querySelector(selector);
const app = $('#app'), modal = $('#modal');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let pendingOrders = false;
let orderDrafts={ability:null,hunt:null}, orderMode=null, resonanceArmed=false;
let scriptTab='characters', scriptFirst=true, scriptAll=false, watchCount=0;
let poolTeam = 'crew', libraryTeam = 'crew', publicTeam = 'crew';
let boarding = null, selectedAvatar = null, takenAvatars = [], boardingBusy = false;
const read = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private browsing can disable storage. */ } };
const forget = key => { try { localStorage.removeItem(key); } catch {} };
let name = read('spacecase.name') || '', session = read('spacecase.session'), state = null, panel = 'crew', targets = [], errorTimer, sound = read('spacecase.sound') || false, offset = 0;
let reduced = read('spacecase.motion') ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
const hash = new URLSearchParams(location.hash.slice(1));
if (hash.has('arcadeName')) {
  const hint = hash.get('arcadeName')?.trim(); if (!name && hint && hint.length <= 32) name = hint;
  hash.delete('arcadeName'); history.replaceState(null, '', location.pathname + location.search + (hash.size ? '#' + hash : ''));
}
const icons = {
  orbit: '<circle cx="12" cy="12" r="5"/><ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(-35 12 12)"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  crew: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-16a3 3 0 0 1 0 6m2 10v-3a6 6 0 0 0-2-4"/>',
  scan: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 12h18"/><circle cx="12" cy="12" r="4"/>',
  signal: '<path d="M3 16v5m6-11v11m6-17v17m6-12v12"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  link: '<path d="m9 15 6-6m-5-3 2-2a5 5 0 0 1 7 7l-3 3m-6-4-3 3a5 5 0 0 0 7 7l2-2"/>',
  beacon: '<path d="M12 11v10m-4 0h8M7 7a7 7 0 0 0 0 10m10-10a7 7 0 0 1 0 10M4 3a12 12 0 0 0 0 18M20 3a12 12 0 0 1 0 18"/><circle cx="12" cy="10" r="2"/>',
  eclipse: '<path d="M15 2a10 10 0 1 0 7 14A10 10 0 0 1 15 2Z"/>',
  lock: '<rect x="5" y="10" width="14" height="12" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v3"/>',
  axe: '<path d="m5 21 12-16m-5-2 9 7-6 5-6-5Z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  gear: '<circle cx="12" cy="12" r="4"/><path d="m12 2 2 3 4-1 1 4 3 2-2 3 1 4-4 1-2 3-3-2-4 1-1-4-3-2 2-3-1-4 4-1Z"/>',
  star: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
  log: '<path d="M5 3h14v18H5Zm4 5h6m-6 4h6m-6 4h4"/>',
  speaker: '<path d="m11 4-6 5H2v6h3l6 5Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  ship: '<path d="m12 2 6 8v8h-4l-2 4-2-4H6v-8Zm-6 8-4 8h4m12-8 4 8h-4"/><circle cx="12" cy="10" r="2"/>'
};
const icon = (key, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[key] || icons.orbit}</svg>`;
const button = (text, action, cls = '', extra = '') => `<button type="button" class="button ${cls}" data-action="${action}" ${extra}>${text}</button>`;
const avatar = (index, large = false) => `<span class="portrait ${large ? 'portrait-lg' : ''} portrait-${index ?? 0}" aria-hidden="true"></span>`;
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(errorTimer); errorTimer = setTimeout(() => $('#toast').classList.remove('visible'), 5000); }
function tone(victory = false) {
  if (!sound || (!victory&&state?.phase==='night')) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    (victory ? [261.6, 329.6, 392, 523.2] : [440]).forEach((freq, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * .13; o.type = 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.045, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + .3); o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + .35);
    }); setTimeout(() => ctx.close(), 1400);
  } catch {}
}
const socket = window.io ? window.io({ autoConnect: true }) : null;
async function command(action, data = {}) {
  if (!socket?.connected) { toast('Connection lost. Your boarding pass is saved; reconnecting…'); return false; }
  return new Promise(resolve => socket.timeout(10_000).emit('command', { action, data }, (err, result) => {
    if (err) { toast('Transmission delayed. Reconnecting will restore the latest saved state.'); resolve(false); }
    else if (!result?.ok) { toast(result?.error || 'Transmission failed.'); resolve(false); }
    else { if (result.session) { session = result.session; save('spacecase.session', session); } resolve(true); }
  }));
}
socket?.on('connect', async () => {
  if (session) {
    socket.timeout(10_000).emit('command', { action: 'resume', data: session }, (error, result) => {
      if (!error && !result?.ok) { session = null; state = null; forget('spacecase.session'); render(); toast(result.error); }
      else if (error) toast('Could not restore the voyage yet. Trying again…');
    });
  }
  renderConnection();
  if (boarding?.intent === 'join') {
    socket.timeout(10_000).emit('command', { action: 'inspect', data: { code: boarding.data.code } }, (error, result) => {
      if (error || !result?.ok || !boarding) return;
      takenAvatars = result.availability.taken;
      if (takenAvatars.includes(selectedAvatar)) selectedAvatar = null;
      avatarPicker();
    });
  }
});
socket?.on('disconnect', () => { renderConnection(); if(modal.open&&modal.classList.contains('orders-dialog')) refreshOrders(); });
socket?.on('removed', () => { session = null; state = null; forget('spacecase.session'); panel = 'crew'; modal.close(); render(); toast('The Captain released your berth. You can join another voyage.'); });
socket?.on('state', next => {
  const old = state;
  offset = next.serverNow - Date.now();
  if (old && JSON.stringify({ ...old, serverNow: 0 }) === JSON.stringify({ ...next, serverNow: 0 })) return;
  if (old?.phase !== next.phase || old?.day !== next.day) { targets=[]; orderDrafts={ability:null,hunt:null}; orderMode=null; resonanceArmed=false; }
  if(old?.phase==='night'&&next.phase!=='night') closeNightTerminal();
  if(next.phase==='night'&&next.me.alive&&canHunt(next.me.role)&&next.hollow?.lockedTarget&&(!old?.hollow?.lockedTarget||old?.day!==next.day)) closeNightTerminal();
  state = next;
  if(modal.open&&((old?.phase!==next.phase&&(!modal.classList.contains('orders-dialog')||['lobby','victory'].includes(next.phase)))||(modal.classList.contains('orders-dialog')&&(!next.me.role||!next.me.playing)))) modal.close();
  render();
  if (old && old.phase !== next.phase) window.scrollTo({ top: 0, behavior: 'instant' });
  if (pendingOrders && next.me.role) { pendingOrders = false; orders(); }
  const dawn=old?.phase==='night'&&next.phase!=='night'&&next.phase!=='lobby';
  if(dawn&&next.lastDeaths.length) showDawnDeaths();
  else if (old?.me.alive && !next.me.alive) showDeath();
  else if(dawn) toast('Light cycle transmission: nobody died.');
  const returned = old && next.phase!=='lobby' && next.players.filter(p=>p.alive && old.players.some(q=>q.id===p.id && !q.alive));
  if(returned?.length) toast(returned.map(p=>p.name).join(', ') + ' has returned.');
  if (next.phase === 'victory' && old?.phase !== 'victory') tone(true);
});
function renderConnection() {
  document.querySelectorAll('[data-connection]').forEach(el => { el.textContent = !navigator.onLine ? 'OFFLINE · INTERNET REQUIRED' : socket?.connected ? 'UPLINK CONNECTED' : 'RECONNECTING…'; el.classList.toggle('offline', !socket?.connected); });
  $('#connection-warning')?.classList.toggle('hidden', !!socket?.connected);
}
window.addEventListener('online', renderConnection); window.addEventListener('offline', renderConnection);
function header() {
  return `<header class="topbar"><a class="brand" href="/" aria-label="Space Case home"><img class="brand-emblem" src="/assets/space-case-logo.webp" width="64" height="52" alt=""><img class="brand-wordmark" src="/assets/space-case-wordmark.webp" width="120" height="54" alt="Space Case"></a><nav aria-label="Main navigation"><span class="connection" data-connection>ESTABLISHING UPLINK</span>${button(`${icon('star')}<span>Cards</span>`, 'library', 'quiet', 'aria-label="Card library"')}${button(`${icon('log')}<span>Field guide</span>`, 'guide', 'quiet', 'aria-label="Field guide"')}${button(icon('gear'), 'preferences', 'icon-button quiet', 'aria-label="Preferences"')}</nav></header>`;
}
function landing() {
  return `${header()}<main class="landing"><section class="hero"><div class="hero-art" aria-hidden="true"></div><img class="hero-emblem" src="/assets/space-case-logo.webp" alt="A Hollow stowaway clings to a ship escaping a crimson cosmic vortex" width="1254" height="1254" fetchpriority="high"><div class="hero-grain" aria-hidden="true"></div><div class="hero-copy"><div class="eyebrow"><span class="live-dot"></span> A SOCIAL DEDUCTION TRANSMISSION</div><h1 class="hero-wordmark"><img src="/assets/space-case-wordmark.webp" alt="Space Case" width="1774" height="887" fetchpriority="high"></h1><p class="tagline">Trust is a limited resource.</p><p class="hero-description">Something came aboard.<br>It looks like one of you.</p><a class="hero-board-link text-link" href="#boarding-form">Board the ship ${icon('arrow')}</a><div class="hero-stats"><span>${icon('crew')} 6–15 crew</span><span>${icon('orbit')} Play in person</span><span>${icon('signal')} Internet required</span></div></div><div class="coordinates" aria-hidden="true">SECTOR 07.26 <span>◈</span> ANOMALY DETECTED</div></section><section class="boarding-wrap"><div class="boarding-intro"><span class="eyebrow cyan">YOUR NEXT GAME DARK CYCLE, IN ORBIT</span><h2>All hands.<br>Eyes open.</h2><p>Your friends. One ship. A few very convincing impostors. Keep your orders close and your suspicions closer.</p><a class="text-link" href="#briefing">How the voyage works ${icon('arrow')}</a></div><div class="boarding panel"><div class="panel-eyebrow"><span>01 / BOARDING TERMINAL</span>${icon('ship')}</div><h2>Welcome aboard, cadet.</h2><p>First, tell the crew what to call you.</p><form id="boarding-form"><label for="callsign">YOUR CALLSIGN</label><div class="input-wrap">${icon('crew')}<input id="callsign" name="name" placeholder="e.g. Cosmic Casey" maxlength="32" autocomplete="nickname" value="${esc(name)}" required><span class="input-indicator"></span></div><button class="button primary full" name="intent" value="create" type="submit">${icon('ship')} Take command ${icon('arrow')}</button><div class="button-caption">HOST A NEW VOYAGE</div><div class="join-row"><input id="boarding-code" name="code" placeholder="6-CHAR CODE" maxlength="6" aria-label="Boarding code" autocomplete="off" autocapitalize="characters"><button class="button secondary" name="intent" value="join" type="submit">Join a crew ${icon('arrow')}</button></div><div class="button-caption">HAVE A BOARDING CODE? YOUR BERTH IS WAITING.</div></form><div class="terminal-foot"><span class="live-dot"></span> No accounts. Just a callsign and a little trust.</div></div></section><section id="briefing" class="briefing"><div class="section-title"><span class="eyebrow">THE MISSION BRIEF</span><h2>Same friends. New suspicions.</h2><p>The Captain has assembled a crew to carry the ship through Hollow space. But the enemy is already aboard, hidden behind familiar faces. The Captain cannot tell which trusted crewmate will strike when the lights go out. Work your station in the dark, compare stories in the light, and uncover the Hollow before they take command.</p></div><div class="briefing-grid"><article><span class="step-number">01</span>${icon('lock')}<h3>Open your orders.</h3><p>Everyone gets a secret character. Most serve the ship. The Hollow serve something else.</p></article><article><span class="step-number">02</span>${icon('scan')}<h3>Work the dark cycle.</h3><p>Attend to your private station. Gather clues. The Hollow secretly agree on their next victim.</p></article><article><span class="step-number">03</span>${icon('axe')}<h3>Trust. Accuse. Survive.</h3><p>Talk face to face, nominate suspects, and vote in secret. Find every Hollow before they take command.</p></article></div></section></main><footer><span>SPACE CASE <span class="muted">/ A DECADENCE ARCADE ORIGINAL</span></span><span>KEEP YOUR FRIENDS CLOSE. YOUR ORDERS CLOSER.</span></footer>`;
}
function ordersReadKey() { return `${state.code}:${state.me.id}:${state.matchId || state.log[0]?.id || 'boarding'}`; }
function ordersNotice() {
  if (!state.me.playing || state.phase === 'lobby') return '';
  const seen = read('spacecase.orders-read'), current = seen?.key === ordersReadKey() ? seen : null;
  const unread = !state.me.revealed || state.me.reports.some((report,i) => !current?.reports.includes(report.id || `${report.day}:${i}`));
  return unread ? '<span class="orders-notification" role="img" aria-label="New private information" title="New private information"></span>' : '';
}
function roleWiki(key) {
  return `<details class="role-wiki" data-wiki-role="${key}"><summary>Ship Intelligence · ${esc(ROLES[key].name)}</summary>${Object.entries(ROLE_GUIDES[key]).map(([heading,lines])=>`<h4>${esc(heading)}</h4><ul>${lines.map(line=>`<li>${esc(line)}</li>`).join('')}</ul>`).join('')}</details>`;
}
function cardTile(key, count) {
  const role = ROLES[key];
  return `<article class="duty-card ${role.team === 'hollow' ? 'hollow-card' : ''}"><span class="duty-icon">${icon(role.symbol)}</span><div><span class="card-faction ${role.team === 'hollow' ? 'red' : 'cyan'}">${role.team === 'hollow' ? 'EVIL / HOLLOW' : 'GOOD / CREW'}</span><h3>${esc(role.name)} ${count === undefined ? '' : `<span class="count">×${count} POSSIBLE</span>`}</h3><p>${esc(role.description)}</p><small>${esc(role.timing)}</small>${roleWiki(key)}</div></article>`;
}
function teamTabs(scope, team) {
  return `<div class="faction-tabs" aria-label="${scope} factions">${[['crew','Good · Crew'],['hollow','Evil · Hollow']].map(([value,label]) => `<button type="button" class="button ${team === value ? 'secondary' : 'quiet'}" data-action="faction" data-scope="${scope}" data-team="${value}" aria-pressed="${team === value}">${label}</button>`).join('')}</div>`;
}
function poolInputs(roles) { return Object.keys(CARD_LIMITS).map(key=>`<input type="hidden" name="${key}" value="${roles[key]||0}">`).join(''); }
function poolCards(roles) {
  return teamTabs('editor',poolTeam) + poolInputs(roles) + Object.keys(CARD_LIMITS).filter(key => ROLES[key].team === poolTeam).map(key => `<article class="pool-choice" data-role-card="${key}"><button type="button" class="pool-select" data-action="pool-toggle" data-role="${key}" aria-label="Select ${ROLES[key].name}" aria-pressed="false"><span class="card-faction">${icon(ROLES[key].symbol)} ${poolTeam === 'crew' ? 'CREW' : 'HOLLOW'}<b class="selection-check" aria-hidden="true">✓</b></span><strong>${esc(ROLES[key].name)}</strong><span class="pool-description">${esc(ROLES[key].description)}</span><small data-role-status></small></button>${CARD_LIMITS[key]>1?`<div class="pool-copies" hidden><button type="button" data-action="pool-less" data-role="${key}" aria-label="Fewer ${ROLES[key].name}">−</button><output data-role-count aria-label="${ROLES[key].name} copies"></output><button type="button" data-action="pool-more" data-role="${key}" aria-label="More ${ROLES[key].name}">+</button></div>`:''}</article>`).join('');
}
function library() {
  openModal(`<section class="card-library"><span class="eyebrow cyan">COMPLETE CARD LIBRARY</span><h2>Know your possible crew.</h2><p>Thirty playable characters. Cosmetics do not determine your character or allegiance. Open this library any time from Cards.</p>${teamTabs('library',libraryTeam)}${Object.keys(ROLES).filter(key => ROLES[key].team === libraryTeam).map(key => cardTile(key)).join('')}<p class="fine-print">Captain is a public command mode, alongside an optional secret character. It is not an extra role card.</p>${button('Return to the voyage', 'close', 'primary full')}</section>`, 'library-dialog');
}
function scriptPanel() {
  const roles=state.settings.roles, spare=state.settings.spareCards??3;
  const tabs=`<div class="script-tabs" role="tablist" aria-label="Script pages">${button('Character sheet','script-characters',scriptTab==='characters'?'secondary':'quiet',`role="tab" id="script-characters-tab" aria-controls="script-content" aria-selected="${scriptTab==='characters'}"`)}${button('Dark cycle order','script-night',scriptTab==='night'?'secondary':'quiet',`role="tab" id="script-night-tab" aria-controls="script-content" aria-selected="${scriptTab==='night'}"`)}</div>`;
  const sheet=['crew','hollow'].map(team=>`<section class="script-faction"><h3>${team==='crew'?'Crew characters':'Hollow characters'}</h3>${Object.entries(roles).filter(([key,n])=>n>0&&ROLES[key].team===team).map(([key,n])=>cardTile(key,n)).join('')||'<p>No possible cards selected.</p>'}</section>`).join('');
  const orderRoles=scriptAll?Object.fromEntries(Object.keys(ROLES).map(key=>[key,1])):roles;
  const order=`<div class="script-night-switch" aria-label="Reference scope">${button('Saved Script','script-saved',scriptAll?'quiet':'secondary',`aria-pressed="${!scriptAll}"`)}${button('All 30 characters','script-all',scriptAll?'secondary':'quiet',`aria-pressed="${scriptAll}"`)}</div><p>${scriptAll?'Full character reference; these cards are not necessarily in your voyage.':'Only saved candidate cards are listed; shared resolution steps always appear.'}</p><div class="script-night-switch" aria-label="Dark cycle reference">${button('First dark cycle','script-first',scriptFirst?'secondary':'quiet',`aria-pressed="${scriptFirst}"`)}${button('Later dark cycles','script-other',scriptFirst?'quiet':'secondary',`aria-pressed="${!scriptFirst}"`)}</div><p>Input is simultaneous. This is the server’s resolution order, not a schedule for visibly waking players. Listed powers may be unused, spent or inactive.</p>${scriptOrder(orderRoles,scriptFirst).map((stage,i)=>`<article class="night-step"><span class="night-step-number">${String(i+1).padStart(2,'0')}</span><div><h3>${esc(stage.title)}</h3><p>${esc(stage.text)}</p>${stage.cards.map(key=>`<div class="night-role ${isHollow(key)?'night-role-hollow':''}"><strong>${icon(ROLES[key].symbol)} ${esc(ROLES[key].name)}</strong><small>${NIGHT_ORDER[key][scriptFirst?'first':'other'].length===0?'No scheduled effect this cycle. ':''}${esc(NIGHT_ORDER[key].note)}</small></div>`).join('')}</div></article>`).join('')}<p class="fine-print">After resolution: deliver private reports, publish light cycle outcomes, then check victory. First dark cycle has no kills. Thrall registers Crew in allegiance investigations; Echo follows its copied power’s timing from the next dark cycle.</p>`;
  return `<section class="panel roster script-page"><span class="eyebrow cyan">PUBLIC VOYAGE SCRIPT</span><h2>Your crew’s field reference.</h2><p>${state.settings.playerCount} players · ${poolSize(roles)} possible cards · ${spare} backup cadets. This shows the saved candidate pool, not which cards were dealt. Save the Captain’s briefing to update it.</p>${tabs}<div id="script-content" role="tabpanel" aria-labelledby="${scriptTab==='characters'?'script-characters-tab':'script-night-tab'}">${scriptTab==='characters'?sheet:order}</div>${button('Browse all 30 characters','library','quiet full')}</section>`;
}
function nightWatch() {
  if(state.phase!=='night') return;
  openModal(`<section class="station-watch"><span class="eyebrow cyan">DARK CYCLE WATCH / EVERY STATION</span><h2>Keep the uplink steady.</h2><div class="orders-clock"><b data-clock>${state.pause?'PAUSED':'--:--'}</b><small>UNTIL LIGHT CYCLE</small></div><p>Everyone stays with their own terminal until the light cycle. This optional routine has no game effect and uses no ability.</p><div class="watch-orbit">${icon('orbit')}<strong data-watch-count>${String(watchCount).padStart(2,'0')}</strong></div>${button('Align the signal','watch-tap','secondary full')}${state.me.playing&&state.me.alive?button('Open my orders','orders','quiet full'):''}<p class="fine-print">Keep your phone close and tilted away from neighbours. Stay at your station even after submitting orders. No role-specific sounds play during the dark cycle.</p>${button('Conceal terminal','close','quiet full')}</section>`,'watch-dialog'); updateClock();
}
function roleList() {
  return teamTabs('public',publicTeam) + (Object.entries(state.settings.roles).filter(([key,n]) => n > 0 && ROLES[key].team === publicTeam).map(([key,n]) => cardTile(key,n)).join('') || '<p>No cards selected for this faction.</p>');
}
function poolFields(form) {
  return { playerCount: Number(form.elements.playerCount.value), spareCards:Number(form.elements.spareCards.value), roles: Object.fromEntries(Object.keys(CARD_LIMITS).map(key => [key,Number(form.elements[key].value)])) };
}
function activePoolForm() { return modal.open&&modal.classList.contains('script-editor-dialog')?$('#script-editor-form'):$('#settings-form'); }
function refreshPoolBudget(form=activePoolForm()) {
  if (!form) return;
  const { playerCount, spareCards, roles } = poolFields(form), error = poolError(playerCount,roles,form.elements.reveal.checked,spareCards), limits = factionLimits(playerCount);
  form.querySelector('[data-pool-budget]').textContent = `${poolSize(roles)} / ${playerCount + spareCards} cards · ${playerCount} dealt + ${spareCards} backup cadets`;
  form.querySelector('[data-pool-error]').textContent = error || `Valid pool. Allowed deal: 1–${limits.maxEvil} Hollow, at least ${limits.minGood} loyal Crew. Actual dealt counts stay secret.`;
  const evil=evilCount(roles), good=poolSize(roles)-evil, remaining=playerCount+spareCards-poolSize(roles);
  const minimums=form.querySelector('[data-pool-minimums]');
  if(minimums) minimums.textContent = `GOOD ${good} / minimum ${limits.minGood} · EVIL ${evil} / minimum 1. Dealt: 1–${limits.maxEvil} Hollow; ${spareCards} cards stay unused.`;
  form.querySelectorAll('[data-role-card]').forEach(card => {
    const key = card.dataset.roleCard, n = roles[key];
    card.classList.toggle('selected', n > 0);
    const toggle=card.querySelector('[data-action=pool-toggle]'), unavailable=['auditor','assistant'].includes(key)&&form.elements.reveal.checked;
    toggle.setAttribute('aria-pressed',String(n>0));
    toggle.setAttribute('aria-label',`${n?'Deselect':'Select'} ${ROLES[key].name}`);
    toggle.disabled=!n&&(unavailable||remaining<(key==='engineer'?2:1));
    card.querySelector('[data-role-status]').textContent=unavailable?'Requires death reveals off':key==='engineer'?(n?'2 minimum · tap to clear':'Adds 2 · then adjust'):'';
    const copies=card.querySelector('.pool-copies');
    if(copies){copies.hidden=!n;copies.querySelector('output').textContent=`×${n}`;copies.querySelector('[data-action=pool-less]').disabled=n<=(key==='engineer'?2:1);copies.querySelector('[data-action=pool-more]').disabled=n>=CARD_LIMITS[key]||remaining<1;}

  });
  form.querySelector('[type=submit]').disabled = !!error;
  if(form.id==='settings-form') {
    const saved=state.settings, dirty=playerCount!==saved.playerCount||spareCards!==(saved.spareCards??3)||Object.keys(CARD_LIMITS).some(key=>roles[key]!==(saved.roles[key]||0))||['playing','reveal'].some(key=>form.elements[key].checked!==saved[key])||['discussion','night'].some(key=>Number(form.elements[key].value)!==saved[key]);
    form.querySelector('[data-draft-notice]').textContent=dirty?'Unsaved changes · Save briefing to use this script.':'Saved script · Shared with the crew.';
    const launch=document.querySelector('[data-action="start"]'), members=state.players.filter(p=>p.playing);
    if(launch)launch.disabled=!!error||dirty||members.length<6||members.length!==saved.playerCount;
  }
}
function openScriptEditor() {
  if(state?.phase!=='lobby'||state.host!==state.me.id)return;
  const parent=$('#settings-form'), draft=poolFields(parent), reveal=parent.elements.reveal.checked;
  openModal(`<form id="script-editor-form"><header class="script-editor-header"><span class="eyebrow cyan">CAPTAIN’S SCRIPT BUILDER</span><h2>Assemble your voyage.</h2><p>The manifest is public. The deal stays secret. Tap a card to select or clear it. Backup cadets are unused character cards, not extra players.</p><div class="editor-setup"><label>Playing crew count<select name="playerCount" aria-label="Editor player count">${Array.from({length:10},(_,i)=>i+6).map(n=>`<option value="${n}" ${draft.playerCount===n?'selected':''}>${n} players</option>`).join('')}</select></label><label>Backup cadets<select name="spareCards" aria-label="Editor backup cadets">${[3,4,5].map(n=>`<option value="${n}" ${draft.spareCards===n?'selected':''}>+ ${n} backup cadets</option>`).join('')}</select></label></div><input type="checkbox" name="reveal" ${reveal?'checked':''} hidden><p class="pool-budget" data-pool-budget></p><p class="pool-minimums" data-pool-minimums></p><div class="editor-tools">${button(icon('orbit')+' Randomize script','randomize-pool','secondary')}${button('Fill Cadets','fill-cadets','quiet')}${button('Clear','clear-pool','quiet')}</div><p class="fine-print">${reveal?'Death reveals on · Auditor and Research Assistant unavailable.':'Death reveals off · Auditor and Research Assistant available.'}</p></header><div class="editor-card-list">${poolCards(draft.roles)}</div><footer class="script-editor-footer"><p class="pool-validation" data-pool-error role="status"></p><div>${button('Discard changes','close','quiet')}<button type="submit" class="button primary">Apply to briefing ${icon('check')}</button></div><small>Apply here, then save your briefing.</small></footer></form>`,'script-editor-dialog');
  modal.setAttribute('aria-label','Create voyage script');refreshPoolBudget();
}
function applyScriptEditor(event) {
  if(event.target.id!=='script-editor-form')return;
  event.preventDefault();
  if(state?.phase!=='lobby'||state.host!==state.me.id){modal.close();return;}
  const form=event.target,draft=poolFields(form),error=poolError(draft.playerCount,draft.roles,form.elements.reveal.checked,draft.spareCards);
  if(error){refreshPoolBudget(form);return;}
  const parent=$('#settings-form');parent.elements.playerCount.value=draft.playerCount;parent.elements.spareCards.value=draft.spareCards;
  for(const [key,n] of Object.entries(draft.roles))parent.elements[key].value=n;
  modal.close();refreshPoolBudget(parent);toast('Script applied to your draft. Save briefing to share it with the crew.');
}
modal.addEventListener('submit',applyScriptEditor);
function settingsForm() {
  const s = state.settings, count = s.playerCount || state.players.filter(p => p.playing).length;
  return `<form id="settings-form" class="settings-form"><h3>Captain’s briefing</h3>${button('Captain’s Handbook '+icon('log'),'captain-handbook','secondary full')}<p class="fine-print">Your checklist for preparing and guiding the voyage.</p><label class="switch-row"><span><strong>I’m playing too</strong><small>Your assignments and unused cards stay secret.</small></span><input type="checkbox" name="playing" ${s.playing ? 'checked' : ''}></label><label class="role-setting"><span>Playing crew count</span><select name="playerCount" aria-label="Playing crew count">${Array.from({length:10},(_,i)=>i+6).map(n=>`<option value="${n}" ${n===count?'selected':''}>${n}</option>`).join('')}</select></label><label class="role-setting"><span>Backup cadets</span><select name="spareCards" aria-label="Backup cadets">${[3,4,5].map(n=>`<option value="${n}" ${(s.spareCards??3)===n?'selected':''}>Player count + ${n}</option>`).join('')}</select></label><p class="fine-print">Count includes a playing Captain. A non-playing Captain needs a separate berth.</p><label class="switch-row"><span><strong>Reveal characters on death</strong><small>Everyone sees the fallen player’s card. Tribunal Auditor and Research Assistant are unavailable while enabled.</small></span><input type="checkbox" name="reveal" ${s.reveal ? 'checked' : ''}></label><div class="timer-settings"><label>DISCUSSION<select name="discussion">${[120,180,300,420,600].map(v=>`<option value="${v}" ${s.discussion===v?'selected':''}>${v/60} minutes</option>`).join('')}</select></label><label>DARK CYCLE<select name="night">${[30,45,60,90].map(v=>`<option value="${v}" ${s.night===v?'selected':''}>${v} seconds</option>`).join('')}</select></label></div><section class="pool-summary"><div class="pool-heading"><strong>Voyage script</strong>${icon('log')}</div>${poolInputs(s.roles)}<p class="pool-budget" data-pool-budget></p><p class="fine-print">Build the possible crew in a dedicated editor. Add characters yourself or randomize a pool for your player count.</p>${button('Create / edit script '+icon('arrow'),'open-script-editor','primary full')}<p class="pool-validation" data-pool-error role="status"></p><p class="fine-print" data-draft-notice></p></section><button class="button secondary full" type="submit">Save briefing ${icon('check')}</button></form>`;
}
const phaseNames = { lobby: 'Boarding', orders: 'Sealed orders', night: 'Dark cycle', discussion: 'Light cycle', nominations: 'Light cycle · Tribunal', voting: 'Light cycle · Ballot', aftermath: 'Light cycle · Aftermath', victory: 'Voyage complete' };
function phaseHelp() {
  const s = state;
  if(s.phase==='victory')return 'All secrets are out. Celebrate your side, then get the crew together for another voyage.';
  if (!s.me.playing) return s.phase === 'lobby' ? 'You are overseeing this voyage. The crew needs 6–15 players, excluding you.' : 'You are the non-playing Captain. Keep the voyage moving; do not share private information.';
  if (!s.me.alive) return 'Your signal is lost. Follow the voyage silently; you cannot speak, nominate, vote, or use abilities.';
  return { lobby: 'Gather your crew in the same room. Share the boarding code and prepare your duty roster.', orders: 'Open your sealed orders privately. Acknowledge them when you understand your mission.', night: 'Eyes on your own screen. Every crew member attends privately to their station.', discussion: 'Talk face to face. Compare stories, protect your information, and find the Hollow.', nominations: 'Tell the Captain who you nominate. Self-nominations are allowed.', voting: 'Choose Execute or Spare. Your ballot is secret and cannot be changed.', aftermath: 'The tribunal has ended. Take a breath before the next dark cycle.', victory: 'All secrets are out. Celebrate your side, then get the crew together for another voyage.' }[s.phase];
}
function crewBoard() {
  const members = state.players.filter(p => p.playing), lobby = state.phase === 'lobby';
  return `<div class="board-scenery" aria-hidden="true"><div class="core-ring"></div><span class="core-label">CONTAINMENT CORE</span><span class="deck-line"></span></div><div class="board-title"><div><span class="eyebrow">${lobby ? 'CREW MANIFEST' : 'LIFE SUPPORT TELEMETRY'}</span><h2>${lobby ? 'Your crew is assembling.' : 'All eyes on the crew.'}</h2></div><span class="badge">${members.filter(p => lobby || p.alive).length} ${lobby ? '/ 15 BERTHS' : '/ ' + members.length + ' ALIVE'}</span></div><p class="fine-print">CLOCKWISE SEATING · Follow berth numbers around your real table. The last berth neighbours berth 01. ${lobby?'Captain: tap a player to move their berth before launch.':'Seating is locked for this voyage; keep your physical places, including empty berths after deaths.'}</p><div class="crew-grid">${members.map((p, i) => `<button class="crew-seat ${!p.alive ? 'dead' : ''} ${p.id === state.block ? 'on-block' : ''} ${p.id === state.me.id ? 'my-seat' : ''}" data-action="person" data-id="${p.id}"><span class="seat-top"><span>BERTH ${String(i + 1).padStart(2, '0')}</span><span class="seat-indicator ${p.online ? '' : 'disconnected'}" title="${p.online ? 'Connected' : 'Disconnected'}"></span></span>${avatar(p.avatar)}<strong>${esc(p.name)}</strong><span class="seat-status">${!p.alive ? 'SIGNAL LOST' : p.id === state.block ? 'ON THE BLOCK' : p.id === state.host ? 'CAPTAIN' : p.id === state.me.id ? 'YOU' : lobby ? 'READY TO BOARD' : 'CREW MEMBER'}</span>${p.id === state.block ? `<span class="axe-badge">${icon('axe')}</span>` : ''}${p.muted ? '<span class="restriction-badge">SPEECH RESTRICTED</span>' : ''}${p.noVote ? '<span class="restriction-badge">VOTING SUSPENDED</span>' : ''}${p.role ? `<span class="revealed-role ${isHollow(p.role) ? 'red' : ''}">${esc(ROLES[p.role]?.name)}</span>` : ''}</button>`).join('')}${lobby ? Array.from({ length: Math.max(0, 6 - members.length) }, (_, i) => `<div class="crew-seat empty"><span class="seat-top">BERTH ${String(members.length + i + 1).padStart(2, '0')}</span><span class="empty-portrait">+</span><strong>Awaiting cadet</strong><span class="seat-status">AVAILABLE BERTH</span></div>`).join('') : ''}</div>${lobby ? `<div class="board-note">${icon('crew')} ${members.length < 6 ? `${6 - members.length} more crew needed to launch.` : 'Crew minimum reached. Review the roster before launch.'} Maximum 15 players.</div>` : `<div class="board-note">${icon('axe')} Execution threshold: ${Math.max(1,Math.ceil((state.eligibleCount ?? members.filter(p=>p.alive).length)/2))} votes. Tied highest votes cancel execution.</div>`}`;
}
function station() {
  return `<section class="station-panel panel"><span class="eyebrow cyan">DARK CYCLE / PRIVATE TERMINAL</span><h2>Attend to your station.</h2><p>Everyone stays at their terminal until the light cycle. Open My orders for your private instructions. Actions close at the start of the light cycle; the server resolves everyone’s orders together.</p>${state.me.playing ? button('Open My orders '+icon('lock'),'orders','primary full') : '<p>You are observing without a character.</p>'}${button('Station watch · everyone','night-watch','quiet full')}</section>`;
}
function voting() {
  const s = state, nominee = s.players.find(p => p.id === s.nomination?.to), from = s.players.find(p => p.id === s.nomination?.from);
  return `<section class="ballot-panel panel"><span class="eyebrow red">EMERGENCY TRIBUNAL / SECRET BALLOT</span><div class="nominee-portrait">${avatar(nominee?.avatar, true)}${icon('axe')}</div><h2>${esc(nominee?.name)} is nominated.</h2><p>Nominated by ${esc(from?.name)}.</p><section class="ballot-rules"><h3>How this ballot works</h3><p><strong>${Math.max(1,Math.ceil((s.eligibleCount ?? s.players.filter(p=>p.playing&&p.alive).length)/2))} Execute votes needed</strong> to qualify — half the eligible voters, rounded up.</p><p>${s.high ? `The highest total so far is <strong>${s.high}</strong>. A higher qualifying total replaces it; matching it clears the block. Lower totals change nothing.` : 'The first qualifying suspect goes on the block. Higher totals replace them; a tied highest qualifying total clears the block.'}</p><p>Voting does not execute anyone immediately. Only the final suspect on the block is executed when nominations close. A tied highest total means no execution.</p></section>${s.me.playing && s.me.alive && s.me.eligibleVote !== false ? s.me.ballot === null ? `<div class="ballot-actions">${button(`${icon('axe')} Execute`, 'vote-execute', 'danger')}${button(`${icon('check')} Spare`, 'vote-spare', 'secondary')}</div><small>Your ballot is final. Only the combined total is revealed.</small>` : `<div class="sealed-status">${icon('lock')} Ballot sealed. Waiting for the crew.</div>` : `<p class="muted">No ballot is available. Only living eligible players vote.</p>`}<div class="ballot-progress"><span style="width:${s.votesCast / Math.max(1,s.eligibleCount ?? s.players.filter(p=>p.playing&&p.alive).length) * 100}%"></span></div><span class="eyebrow">${s.votesCast} BALLOTS SEALED</span></section>`;
}
function commandPanel() {
  const s = state, captain = s.host === s.me.id, members = s.players.filter(p => p.playing), alive = members.filter(p => p.alive);
  const options = members.filter(p => p.alive);
  return `<aside class="command-panel"><section class="panel voyage-card"><div class="panel-eyebrow"><span>BOARDING PASS</span>${icon('orbit')}</div><span class="muted">YOUR VOYAGE CODE</span><button class="room-code" data-action="copy" aria-label="Copy boarding code">${s.code}${icon('log')}</button><p>Same room. Separate screens.<br>Keep your orders to yourself.</p><div class="captain-line">${icon('star')} Captain ${esc(s.players.find(p => p.id === s.host)?.name)}${s.host === s.me.id ? ' · You' : ''}</div></section>${captain ? `<section class="panel captain-controls"><div class="panel-eyebrow"><span>CAPTAIN’S COMMAND</span>${icon('star')}</div>${s.phase !== 'lobby' ? button('Captain’s Handbook '+icon('log'),'captain-handbook','quiet full') : ''}${s.phase === 'lobby' ? settingsForm() + button(`Seal the ship ${icon('arrow')}`, 'start', 'primary full', members.length < 6 || members.length !== s.settings.playerCount ? 'disabled' : '') + `<p class="fine-print">${members.length} / ${s.settings.playerCount} playing crew · ${s.settings.playerCount + (s.settings.spareCards??3)} possible cards · ${s.settings.spareCards??3} backup cadets</p>` : s.phase === 'orders' ? `<p>${members.filter(p => p.acknowledged).length} / ${members.length} crew have acknowledged their orders. Ship Intelligence begins dark cycle one automatically when everyone is ready and connected.</p>` : s.phase === 'discussion' ? `<p>Let the crew compare stories. Open nominations when the discussion is ready.</p>${button('Open nominations ' + icon('axe'), 'nominations', 'primary full')}${button('Add one minute', 'extend', 'quiet full')}` : s.phase === 'nominations' ? `<form id="nomination-form"><label>NOMINATING<select name="from" required><option value="">Choose a crew member</option>${options.filter(p => !s.nominations.some(n => n.from === p.id)).map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label><label>NOMINATED<select name="to" required><option value="">Choose a suspect</option>${options.filter(p => !s.nominations.some(n => n.to === p.id)).map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label><button class="button secondary full" type="submit">Open secret ballot ${icon('arrow')}</button></form><hr><p>${s.block ? `${esc(s.players.find(p => p.id === s.block)?.name)} is on the block with ${s.high} votes.` : s.tied ? 'Highest votes are tied. Nobody will be executed.' : 'Nobody is on the block.'}</p>${button('No more nominations', 'end-nominations', 'danger full')}` : s.phase === 'voting' ? `<p>Ballots remain secret. Close voting after every eligible player has voted.</p>${button('Reveal vote total ' + icon('eye'), 'closeVote', 'primary full', s.votesCast < (s.eligibleCount ?? alive.length) ? 'disabled' : '')}` : s.phase === 'aftermath' ? `<p>The public log records the outcome. Start the next dark cycle when the crew is ready.</p>${button('Begin dark cycle ' + icon('arrow'), 'night', 'primary full')}` : s.phase === 'night' ? `<p>The server resolves station orders at the shared deadline. Captain controls reveal no secret activity.</p><div class="sealed-status">${icon('lock')} Dark cycle order is automatic</div>` : button('Prepare another voyage ' + icon('arrow'), 'rematch', 'primary full')}</section>` : `<section class="panel wait-card">${icon('signal')}<h3>${s.phase === 'lobby' ? 'Your berth is reserved.' : 'Stay with the crew.'}</h3><p>${s.phase === 'lobby' ? 'The Captain is preparing the roster. Review possible characters and Dark cycle order in Script.' : 'The Captain handles the pace. Your private actions appear in the current phase.'}</p></section>`}<button class="button quiet full leave" data-action="leave">Leave voyage</button></aside>`;
}
function victory() {
  const s = state, hollow = s.winner === 'hollow', winners = s.players.filter(p => p.playing && ROLES[p.role]?.team === s.winner);
  return `<section class="victory ${hollow ? 'hollow-victory' : ''}"><div class="victory-burst" aria-hidden="true"></div><div class="confetti" aria-hidden="true">${Array.from({ length: 24 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div><span class="eyebrow">${hollow ? 'CONTAINMENT FAILED' : 'MISSION ACCOMPLISHED'}</span><div class="victory-emblem">${icon(hollow ? 'eclipse' : 'orbit')}</div><h2>${hollow ? 'THE HOLLOW<br>HAVE RISEN.' : 'ANOMALY<br>CONTAINED.'}</h2><p>${hollow ? 'The ship is theirs. It was never just a feeling.' : 'You found what didn’t belong. The stars are yours again.'}</p><p class="victory-condition">${hollow ? 'Hollow victory: living Hollow equal or outnumber living Crew.' : 'Crew victory: no living Hollow remain.'} Fallen teammates share their team’s victory.</p><div class="winners">${winners.map(p => `<div>${avatar(p.avatar)}<strong>${esc(p.name)}</strong><span>+1 POINT · ${p.score} TOTAL</span></div>`).join('')}</div><section class="final-reveal"><span class="eyebrow">THE FINAL REVEAL</span><h3>Who was aboard?</h3><div class="reveal-grid">${s.players.filter(p=>p.playing).map(p=>`<article class="reveal-person ${isHollow(p.role)?'reveal-hollow':''}">${avatar(p.avatar)}<div><strong>${esc(p.name)}</strong><span>${esc(ROLES[p.role]?.name || 'Unknown character')}</span><small>${isHollow(p.role)?'Hollow':'Crew'} · ${p.alive?'Survived':'Fallen'}${ROLES[p.role]?.team===s.winner?' · Winning team':''}</small></div></article>`).join('')}</div></section><details class="voyage-recap"><summary>The voyage in public transmissions</summary><p>Public events only; private reports stay private.</p>${s.log.map(l=>`<article><span class="eyebrow">CYCLE ${l.day}</span><p>${esc(cycleText(l.text))}</p></article>`).join('') || '<p>No public transmissions were recorded.</p>'}</details>${s.unused?.length ? `<div class="unused-cards"><span class="eyebrow">THE ${s.settings.spareCards??3} UNUSED CARDS</span><p>${s.unused.map(role => esc(ROLES[role]?.name)).join(' · ')}</p></div>` : ''}<p class="muted">${s.me.playing ? ROLES[s.me.role]?.team === s.winner ? 'You won. Your point is on the board.' : 'You lost this voyage. The next one is a fresh start.' : 'Voyage complete. Winning-team scores have been updated.'}</p>${s.host === s.me.id ? button('Another voyage ' + icon('arrow'), 'rematch', 'primary') : '<span class="badge">WAITING FOR THE CAPTAIN’S NEXT VOYAGE</span>'}</section>`;
}
function missionBrief(expanded = false) {
  return `<details class="mission-brief panel" ${expanded ? 'open' : ''}><summary><strong>Your mission</strong></summary><p>A distress call echoes through the ship. It is your voice. You never sent it.</p><p>The Hollow are hiding among your crew—even the Captain could be one.</p><p><strong>Dark cycle:</strong> Use secret powers. Gather clues, protect crewmates—or choose a victim.</p><p><strong>Light cycle:</strong> Compare stories, nominate suspects and vote. One player may be executed.</p><p>Crew win when every Hollow is dead. Hollow win when they equal or outnumber the living Crew.</p></details>`;
}
function game() {
  const s = state;
  return `${header()}<main class="game-shell"><div id="connection-warning" class="connection-warning ${socket?.connected ? 'hidden' : ''}" role="status">Uplink interrupted. Controls are unavailable while we reconnect. Your saved boarding pass will restore your seat.</div>${s.pause ? `<div class="pause-banner"><h2>Voyage paused.</h2><p>${s.pause.reason === 'captain' ? 'The Captain is disconnected. Wait for them, or let every connected player agree to continue under a new Captain.' : 'A living crew member disconnected during the dark cycle. The clock resumes when they return.'}</p>${s.pause.reason === 'captain' && s.me.playing ? button(s.consent.includes(s.me.id) ? 'Agreement recorded' : 'Agree to continue with a new Captain', 'consent', 'secondary', s.consent.includes(s.me.id) ? 'disabled' : '') : ''}</div>` : ''}<section class="phase-banner ${s.phase === 'night' ? 'night-banner' : ''}"><div><span class="eyebrow cyan">VOYAGE ${s.code} <span class="phase-divider">/</span> ${s.day ? 'CYCLE ' + String(s.day).padStart(2, '0') : 'PRE-LAUNCH'}</span><h1>${phaseNames[s.phase]}<span class="phase-pip"></span></h1><p>${phaseHelp()}</p></div>${s.deadline ? `<div class="phase-clock"><span data-clock>--:--</span><small>${s.pause ? 'PAUSED' : s.phase === 'night' ? 'UNTIL LIGHT CYCLE' : 'DISCUSSION LEFT'}</small></div>` : `<div class="phase-insignia" aria-hidden="true">${icon(s.phase === 'lobby' ? 'ship' : 'orbit')}</div>`}</section><div class="game-layout"><div class="main-deck">${missionBrief(s.phase === 'lobby')}${s.phase === 'victory' ? victory() : ''}<nav class="deck-tabs" aria-label="Game information">${button(`${icon('crew')} Crew`, 'tab-crew', panel === 'crew' ? 'active' : '')}${button(`${icon('lock')} My orders ${ordersNotice()}`, 'orders', '', !s.me.playing || s.phase === 'lobby' ? 'disabled' : '')}${button(`${icon('log')} Script`, 'tab-roster', panel === 'roster' ? 'active' : '')}${button(`${icon('signal')} Ship log`, 'tab-log', panel === 'log' ? 'active' : '')}</nav>${panel === 'roster' ? scriptPanel() : panel === 'log' ? `<section class="panel ship-log"><span class="eyebrow">PUBLIC TRANSMISSION HISTORY</span><h2>The ship remembers.</h2>${s.log.length ? [...s.log].reverse().map(l => `<article><span>CYCLE ${String(l.day).padStart(2, '0')}</span><p>${esc(cycleText(l.text))}</p></article>`).join('') : '<p>No transmissions yet. Your story starts at launch.</p>'}</section>` : `${s.phase === 'orders' ? `<section class="orders-prompt panel">${icon('lock')}<div><h2>${s.me.playing ? 'A sealed transmission awaits.' : 'Orders are with the crew.'}</h2><p>${s.me.acknowledged ? 'Orders acknowledged. Keep them private; wait for the Captain.' : s.me.playing ? 'Check that nobody can see your screen before opening your character.' : 'Wait for every player to privately acknowledge their character.'}</p></div>${s.me.playing ? button('Open sealed orders ' + icon('arrow'), 'orders', 'primary') : ''}</section>` : ''}${s.phase === 'night' ? station() : ''}${s.phase === 'voting' ? voting() : ''}<section class="board panel">${crewBoard()}</section>`}</div>${commandPanel()}</div></main><footer><span>DECADENCE ARCADE / SPACE CASE</span><span>${icon('lock')} PRIVATE ORDERS. PUBLIC SUSPICIONS.</span></footer>`;
}
function mobileDock() {
  if (!state) return '';
  const captain = state.host === state.me.id;
  return `<nav class="mobile-dock" aria-label="Quick game controls">${button(`${icon('crew')} Crew board`, 'board-jump', 'quiet')}${state.me.playing && state.phase !== 'lobby' ? button(`${icon('lock')} My orders ${ordersNotice()}`, 'orders', 'quiet') : ''}${captain ? button(`${icon('star')} Command`, 'command-jump', 'primary') : ''}</nav>`;
}
function render() {
  const active = document.activeElement, focusId = active?.id, selection = active instanceof HTMLInputElement ? active.selectionStart : null;
  // Preserve in-progress Captain form edits when another cadet joins or votes.
  const form = $('#settings-form'); const draft = form ? [...new FormData(form)] : null;
  const switches = form ? [...form.querySelectorAll('[type=checkbox]')].map(el => [el.name, el.checked]) : [];
  const nomination = $('#nomination-form'); const nominationDraft = nomination ? [...new FormData(nomination)] : null;
  const expanded=[...app.querySelectorAll('[data-wiki-role][open]')].map(el=>el.dataset.wikiRole);
  app.innerHTML = state ? game() + mobileDock() : landing();
  for(const key of expanded) app.querySelector(`[data-wiki-role="${key}"]`)?.setAttribute('open','');
  if (draft && $('#settings-form')) { for (const [key, value] of draft) { const el = $('#settings-form').elements.namedItem(key); if (el && el.type !== 'checkbox') el.value = value; } for (const [key, checked] of switches) $('#settings-form').elements.namedItem(key).checked = checked; }
  if (nominationDraft && $('#nomination-form')) for (const [key, value] of nominationDraft) $('#nomination-form').elements.namedItem(key).value = value;
  if (focusId && document.getElementById(focusId)) { const el = document.getElementById(focusId); el.focus({ preventScroll: true }); if (selection !== null && el.type !== 'number') try { el.setSelectionRange(selection, selection); } catch {} }
  refreshPoolBudget($('#settings-form'));
  if(modal.open&&modal.classList.contains('script-editor-dialog'))refreshPoolBudget();
  document.body.dataset.phase = state?.phase || 'landing'; renderConnection(); updateClock();
  if(modal.open&&modal.classList.contains('orders-dialog')&&state?.me.role) refreshOrders();
}
function closeNightTerminal() {
  if(modal.open&&(modal.classList.contains('orders-dialog')||modal.classList.contains('watch-dialog'))) modal.close();
}
function updateClock() {
  if(state?.phase==='night'&&!state.pause&&state.deadline&&Date.now()+offset>=state.deadline) closeNightTerminal();
  document.querySelectorAll('[data-clock]').forEach(el => {
    if (state?.pause) return;
    const seconds = Math.max(0, Math.ceil((state.deadline - Date.now() - offset) / 1000)); el.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  });
}
setInterval(updateClock, 250);
function openModal(content, className = '') { modal.className = className; modal.innerHTML = `<button class="modal-close button quiet icon-button" data-action="close" aria-label="Close dialog">${icon('close')}</button>${content}`; if (!modal.open) modal.showModal(); }
async function chooseAvatar(intent, data) {
  if (!socket?.connected) return toast('Reconnect before choosing your crew avatar.');
  boarding = { intent, data }; takenAvatars = [];
  if (intent === 'join') {
    const result = await new Promise(resolve => socket.timeout(10_000).emit('command', { action: 'inspect', data: { code: data.code } }, (error, reply) => resolve(error ? null : reply)));
    if (!result?.ok) { boarding = null; return toast(result?.error || 'Could not check available avatars. Try again.'); }
    takenAvatars = result.availability.taken;
  }
  const preferred = read('spacecase.avatar');
  selectedAvatar = Number.isInteger(preferred) && AVATARS[preferred] && !takenAvatars.includes(preferred) ? preferred : null;
  avatarPicker();
}
function avatarPicker() {
  if (!boarding) return;
  openModal(`<section class="avatar-picker"><span class="eyebrow cyan">PERSONNEL ID / MAKE IT YOURS</span><h2>Choose your crew face.</h2><p>${boarding.intent === 'join' ? 'Taken faces belong to this crew. Pick an available avatar to board.' : 'Your ship. Your callsign. Your face on the manifest.'}</p><div class="avatar-options" role="group" aria-label="Crew avatars">${AVATARS.map((label, i) => `<button class="avatar-option ${selectedAvatar === i ? 'selected' : ''}" data-action="avatar-pick" data-avatar="${i}" aria-label="${label}${takenAvatars.includes(i) ? ', taken' : ', available'}" aria-pressed="${selectedAvatar === i}" ${takenAvatars.includes(i) || boardingBusy ? 'disabled' : ''}>${avatar(i)}<strong>${label}</strong><small>${takenAvatars.includes(i) ? 'TAKEN' : selectedAvatar === i ? 'SELECTED' : 'AVAILABLE'}</small>${selectedAvatar === i ? icon('check') : ''}</button>`).join('')}</div><p class="avatar-reservation">${icon('lock')} One face per crew member. Your avatar is reserved when you board.</p>${button(boardingBusy ? 'Reserving your berth…' : selectedAvatar === null ? 'Select an avatar to board' : `Board as ${esc(boarding.data.name)} ${icon('arrow')}`, 'board-avatar', 'primary full', selectedAvatar === null || takenAvatars.includes(selectedAvatar) || boardingBusy ? 'disabled' : '')}</section>`, 'avatar-dialog');
}
socket?.on('availability', available => {
  if (!boarding || boarding.intent !== 'join' || boarding.data.code !== available.code) return;
  if (available.phase !== 'lobby') { boarding = null; modal.close(); return toast('This voyage just launched. Ask the Captain to start a new voyage.'); }
  takenAvatars = available.taken;
  if (takenAvatars.includes(selectedAvatar)) { selectedAvatar = null; toast('That avatar was just claimed. Choose another face.'); }
  if (modal.open) avatarPicker();
});
modal.addEventListener('close', () => {
  modal.removeAttribute('aria-label');refreshPoolBudget($('#settings-form'));
  if (boarding) { boarding = null; if (socket?.connected) command('uninspect'); }
});
function privateCapabilities() {
  if(!socket?.connected) { const closed={active:false,targets:[],reason:'Uplink interrupted. Reconnect before issuing orders.'}; return {ability:closed,hunt:closed,restrictions:state.me.orders?.restrictions||{}}; }
  if(state.me.orders) return state.me.orders;
  const closed={active:false,targets:[],reason:'Waiting for your current station briefing.'};
  return {ability:closed,hunt:closed,restrictions:{}};
}

function huntVoters(target) {
  if(state.phase!=='night'||!state.me.alive||!canHunt(state.me.role)||!state.hollow)return '';
  const voters=state.hollow.members.filter(member=>member.target===target);
  return voters.length?`<span class="hunt-voters" aria-label="Chosen by ${esc(voters.map(v=>state.players.find(p=>p.id===v.id)?.name||'Unknown').join(', '))}">${voters.map(v=>{const p=state.players.find(p=>p.id===v.id);return `<span class="hunt-voter" title="${esc(p?.name)}">${avatar(p?.avatar)}</span>`;}).join('')}</span>`:'';
}
function lockedHuntCard(view) {
  const target=state.players.find(p=>p.id===(state.hollow?.lockedTarget||view.selection?.[0]));
  return target?`<div class="locked-hunt-target" aria-label="Collective target: ${esc(target.name)}">${avatar(target.avatar)}<strong>${esc(target.name)}</strong><span class="sealed-label">${icon('lock')} SEALED</span>${huntVoters(target.id)}</div>`:'';
}
function hollowChoices() {
  if(!state.hollow||!state.me.alive||!canHunt(state.me.role))return '';
  return `<section class="hollow-choices"><span class="eyebrow">YOUR PRIVATE NETWORK</span><div class="hunt-links">${state.hollow.members.map(h=>{const p=state.players.find(p=>p.id===h.id);return `<span class="hunt-person">${avatar(p?.avatar)}<small>${esc(p?.name)}</small></span>`;}).join('')}</div></section>`;
}
function actionCard(view,channel) {
  if(!view.active) return `<section class="orders-action inactive"><span class="eyebrow">${channel==='hunt'?'COLLECTIVE ATTACK':'STATION STATUS'}</span><p>${esc(view.reason)}</p>${channel==='hunt'&&view.locked?lockedHuntCard(view):''}${view.locked?'<div class="sealed-status">'+icon('lock')+' Consensus sealed: '+esc(state.players.find(p=>p.id===view.selection?.[0])?.name)+'.</div>':''}</section>`;
  if(channel==='ability'&&(state.me.powerRole||state.me.role)==='resonance'&&!resonanceArmed&&!view.selection?.length) return `<section class="orders-action"><span class="eyebrow">ONCE PER VOYAGE</span><h3>Use your resonance scan this dark cycle?</h3><p>Compare two other living players. You can save this ability for a later dark cycle.</p>${view.passed?'<p class="sealed-status">Waiting this dark cycle. Your ability is still available.</p>':''}${button('Use ability this dark cycle','resonance-use','primary full')}${button('Wait until next dark cycle','order-pass','quiet full','data-channel="ability"')}</section>`;
  const selected=(orderDrafts[channel] ?? view.selection ?? []).filter(id=>view.targets.includes(id)), mode=orderMode ?? view.mode;
  return `<section class="orders-action"><div class="panel-eyebrow"><span>${channel==='hunt'?'HOLLOW CONSENSUS':'CURRENT DARK CYCLE ABILITY'}${view.once?' / ONCE PER VOYAGE':''}</span>${icon('lock')}</div><h3>${esc(view.title)}</h3><p>${esc(view.reason)}</p>${view.modes?.length?`<div class="order-modes" role="group" aria-label="Ability mode">${view.modes.map(value=>`<button type="button" class="button ${mode===value?'secondary':'quiet'}" data-action="order-mode" data-mode="${value}" aria-pressed="${mode===value}">${value==='mute'?'Mute speech':'Suspend voting'}</button>`).join('')}</div>`:''}<p class="selection-count">${selected.length} / ${view.count} selected${view.passed?' · Skipped this cycle':view.submitted?' · Order received':''}</p><div class="orders-targets ${channel==='hunt'?'hunt-targets':''}">${view.targets.map(id=>{const p=state.players.find(p=>p.id===id);return `<button type="button" class="order-target ${selected.includes(id)?'selected':''}" data-action="order-target" data-channel="${channel}" data-id="${id}" data-count="${view.count}" aria-pressed="${selected.includes(id)}">${avatar(p.avatar)}<span>${esc(p.name)}${!p.alive?'<small>DECEASED</small>':''}${state.me.role==='echo'&&(state.me.powerRole||state.me.role)==='echo'&&p.role?'<small>'+esc(ROLES[p.role].name)+'</small>':''}</span>${selected.includes(id)?icon('check'):''}${channel==='hunt'?huntVoters(id):''}</button>`;}).join('')}</div>${channel==='hunt'?'<p class="fine-print">Choose any player, including yourself, other Hollow or the dead. A dead target causes no attack death. Choices appear immediately to living Hollow; unanimity locks every Hollow order until the light cycle.</p>':button((view.submitted?'Update':'Confirm')+(['xenobiologist','analyst','resonance','cartographer'].includes(state.me.powerRole||state.me.role)?' scan ':' action ')+icon('arrow'),'order-submit','primary full',`data-channel="ability" ${selected.length!==view.count||(view.modes?.length&&!mode)?'disabled':''}`)+button('Skip ability this cycle','order-pass','quiet full','data-channel="ability"')}<p class="terminal-foot">${icon('lock')} Private to your station. Results arrive at the start of the light cycle if you survive.</p></section>`;
}
function nextOrder(caps) {
  if (!socket?.connected) return 'Your connection is interrupted. Wait for the uplink to return before issuing orders.';
  if (state.phase === 'victory') return 'The voyage is over. Close your orders to see every character and the final reveal.';
  if (!state.me.alive) return 'Follow silently. You cannot speak, nominate, vote or use powers, but you still win with your team.';
  if (state.pause) return 'The voyage is paused. Your orders cannot change until play resumes.';
  if (state.phase === 'orders') return state.me.acknowledged ? 'Your briefing is acknowledged. Keep it private and wait for the remaining crew; dark cycle one starts automatically.' : 'Read your objective, power and starting information, then tap Understood to acknowledge your orders.';
  if (state.phase === 'night') {
    const ability = caps.ability, hunt = caps.hunt;
    if (ability.active && !ability.submitted && !ability.passed) return `Choose ${ability.count} target${ability.count === 1 ? '' : 's'} for your station ability, then confirm. You may also skip this cycle. ${ability.once ? 'This power is once per voyage; you can save it for later.' : ''}`;
    if (hunt.active) return hunt.selection?.length ? 'Your collective target is selected. Wait for the other living network members to agree; you may change your choice until consensus locks.' : 'Choose a collective attack target. Every living network member must agree on the same player; no agreement means no collective attack.';
    if (hunt.locked) return 'Your network has agreed. The collective target is sealed. Wait until the light cycle.';
    if (ability.passed) return 'You skipped your station ability this cycle. Stay at your terminal until the light cycle.';
    if (ability.submitted) return 'Your station order is received. You can update it before the deadline. Stay at your terminal until the light cycle.';
    return `No target selection is available now. ${ability.reason || ''} Stay at your terminal until the light cycle.`;
  }
  if (state.phase === 'voting') return caps.restrictions?.noVote ? 'Your voting is suspended this light cycle. Follow the ballot without voting.' : state.me.ballot !== null ? 'Your ballot is sealed and cannot change. Wait for the Captain to reveal the combined total.' : 'Close your orders and cast Execute or Spare on the ballot screen. Read the threshold and tie rules before choosing.';
  if (state.phase === 'discussion' || state.phase === 'nominations') return caps.restrictions?.mute ? 'Your speech is restricted. Follow silently; you may nominate by signalling the Captain and vote unless your voting is also suspended.' : 'Read your reports and compare stories with the room. Decide what to share; keep your screen private. During nominations, tell the Captain whom you suspect.';
  return 'Read the public tribunal result. Wait for the Captain to begin the next dark cycle.';
}
function newcomerBriefing(role, hollow, caps) {
  const power = ROLES[state.me.powerRole || state.me.role] || role;
  return `<section class="orders-status newcomer-briefing"><h3>What should I do now?</h3><p>${esc(nextOrder(caps))}</p><details><summary>Your mission, power and limits</summary><p><strong>Your goal:</strong> ${hollow ? 'Help the Hollow equal or outnumber the living Crew. Keep your allegiance secret.' : 'Help eliminate every Hollow. Use evidence and discussion to protect the Crew.'}</p><p><strong>Your power:</strong> ${esc(power.description)}</p><p><strong>When and limits:</strong> ${esc(power.timing)}</p><p>Only legal targets are offered in your terminal. Your original allegiance stays the same when you copy a power. A report is evidence about what your power detected; disguises and interference can affect some results.</p></details></section>`;
}
function ordersMarkup() {
  const role=ROLES[state.me.role], hollow=isHollow(state.me.role), caps=privateCapabilities();
  const restriction=caps.restrictions||{};
  return `<section class="private-card ${hollow?'hollow-card':''}"><div class="orders-topline"><span class="eyebrow cyan">MY ORDERS / PRIVATE</span>${state.phase==='night'&&state.deadline?`<span class="orders-clock"><b data-clock>${state.pause?'PAUSED':'--:--'}</b><small>UNTIL LIGHT CYCLE</small></span>`:''}</div><div class="orders-identity">${icon(role.symbol)}<div><h2>${esc(role.name)}</h2><span class="team-label">${hollow?'HOLLOW ALLEGIANCE':'LOYAL CREW'} · ${esc(phaseNames[state.phase])}</span></div></div>${newcomerBriefing(role,hollow,caps)}${state.me.echo?`<section class="orders-status"><h3>Echo protocol</h3><p>${state.me.echo.role?`${state.me.echo.pending?'Activates next dark cycle':'Copied power'}: ${esc(ROLES[state.me.echo.role].name)}.`:state.me.echo.spent?'Copy attempt spent.':'Choose any dead player during the dark cycle; hidden roles remain concealed.'}</p>${state.me.echo.role?`<p>${esc(ROLES[state.me.echo.role].description)}</p><small>${esc(ROLES[state.me.echo.role].timing)}</small>`:''}</section>`:''}${!state.me.alive?'<div class="orders-status">SIGNAL LOST · History only. No new orders or reports.</div>':''}${restriction.mute||restriction.noVote?`<section class="orders-status"><strong>ACTIVE RESTRICTIONS</strong>${restriction.mute?'<p>Do not speak until the next dark cycle. You may nominate silently.</p>':''}${restriction.noVote?'<p>Your voting is suspended until the next dark cycle.</p>':''}</section>`:''}${state.phase==='orders'?`<section class="orders-status"><h3>Your starting briefing</h3><p>${esc(role.description)}</p>${canHunt(state.me.role)?'<p>You also share the unanimous Hollow attack from dark cycle two. Submit or skip your special order before choosing the shared victim.</p>':''}<p>Read your character and any starting information below. Dark cycle one begins automatically when every player has acknowledged their orders and is connected.</p></section>`:((hollow&&!caps.ability.active&&(caps.hunt.active||caps.hunt.locked||!role.action))?'':actionCard(caps.ability,'ability'))}${canHunt(state.me.role)&&state.me.alive&&state.phase!=='orders'?actionCard(caps.hunt,'hunt'):''}${hollow&&role.action&&!caps.ability.active&&caps.hunt.active?`<p class="fine-print">Special power: ${esc(caps.ability.reason)}</p>`:''}${caps.defenceSpent!==undefined?'<p class="resource-status">Hull defence: '+(caps.defenceSpent?'depleted':'one charge available')+'.</p>':''}${caps.usedOnce&&ROLES[state.me.powerRole||state.me.role]?.action?.once?'<p class="resource-status">'+icon('check')+' Once-per-voyage ability spent.</p>':''}${caps.boundName?`<p class="resource-status">Ward link: ${esc(caps.boundName)}. Link status is resolved each dark cycle.</p>`:''}${state.hollow&&state.phase==='orders'?hollowChoices():''}<section class="private-reports"><h3>Your private information</h3>${state.me.reports.length?[...state.me.reports].reverse().map(r=>`<article class="private-report"><span class="eyebrow">${r.day===0?'STARTING BRIEFING':'OBSERVED CYCLE '+r.day}${r.timing?' / '+esc(cycleText(r.timing)):''}</span><p>${esc(cycleText(r.text))}</p></article>`).join(''):'<p>No private reports yet. '+esc(role.timing)+'</p>'}</section><details class="character-reference"><summary>Character and objective</summary><p>${esc(role.description)}</p><small>${esc(role.timing)}</small><p>${hollow?'Take control: living Hollow must equal or outnumber living Crew.':'Contain the anomaly: eliminate every Hollow.'}</p></details>${state.phase==='orders'&&!state.me.acknowledged?button('Understood. Conceal orders. '+icon('lock'),'acknowledge','primary full'):button('Conceal orders '+icon('lock'),'close','secondary full')}</section>`;
}
function markOrdersRead() {
  save('spacecase.orders-read',{key:ordersReadKey(),reports:state.me.reports.map((r,i)=>r.id||`${r.day}:${i}`),inherited:!!state.me.inherited});
  document.querySelectorAll('.orders-notification').forEach(dot=>dot.remove());
}
function refreshOrders() {
  const top=modal.scrollTop, active=document.activeElement, action=active?.dataset.action, id=active?.dataset.id, mode=active?.dataset.mode, channel=active?.dataset.channel;
  modal.innerHTML=`<button type="button" class="modal-close button quiet icon-button" data-action="close" aria-label="Close dialog">${icon('close')}</button>`+ordersMarkup();
  modal.scrollTop=top;
  if(action) [...modal.querySelectorAll('[data-action]')].find(el=>el.dataset.action===action&&el.dataset.id===id&&el.dataset.mode===mode&&el.dataset.channel===channel)?.focus({preventScroll:true});
  markOrdersRead();
}
function orders() {
  if(!state.me.playing||state.phase==='lobby') return;
  if(!state.me.role) {pendingOrders=true;command('reveal').then(ok=>{if(!ok)pendingOrders=false;});return;}
  openModal(ordersMarkup(),'orders-dialog'); markOrdersRead(); updateClock();
}
function showDawnDeaths() {
  const fallen=state.lastDeaths.map(id=>state.players.find(p=>p.id===id)).filter(Boolean);
  if(!fallen.length) return;
  const ownDeath=fallen.some(p=>p.id===state.me.id);
  openModal(`<section class="dawn-reveal"><span class="eyebrow red">LIGHT CYCLE / PUBLIC TRANSMISSION</span><h2>${fallen.length===1?'A signal went dark.':fallen.length+' signals went dark.'}</h2><p>${fallen.map(p=>esc(p.name)).join(' · ')} died during the dark cycle.</p><div class="dawn-tokens">${fallen.map((p,i)=>`<article class="dawn-token" style="--reveal-delay:${i*180}ms"><div class="dawn-token-flip"><div class="dawn-token-front" aria-hidden="true">${avatar(p.avatar)}</div><div class="dawn-token-back">${icon('signal')}<strong>${esc(p.name)}</strong><span>SIGNAL LOST</span>${p.role?`<small>${esc(ROLES[p.role]?.name)}</small>`:''}</div></div></article>`).join('')}</div>${ownDeath?'<p>Your signal is lost. Follow silently; you cannot speak, vote or act, and receive no new private information.</p>':'<p>The crew board and Ship log record these deaths.</p>'}${button(state.phase==='victory'?'See voyage result':'Return to the crew','close','secondary full')}</section>`,'dawn-dialog');
}
function showDeath() { openModal(`<section class="death-screen"><div class="death-reticle">${icon('signal')}</div><span class="eyebrow red">TERMINAL CONNECTION SEVERED</span><h2>SIGNAL<br>LOST.</h2><p>You have died. Your part in the story isn’t forgotten.</p><p class="muted">Follow the voyage silently. You can no longer speak, nominate, vote, or use abilities. No new private reports will reach this station.</p>${button('Follow the voyage ' + icon('arrow'), 'close', 'secondary full')}</section>`, 'death-dialog'); }
function captainHandbook() {
  openModal(`<section class="guide captain-handbook"><span class="eyebrow cyan">CAPTAIN’S HANDBOOK</span><h2>Guide the crew.<br>Guard the secrets.</h2>${missionBrief(true)}<p>You bring everyone together and keep the voyage moving. Ship Intelligence deals characters, resolves powers, counts votes and decides victory.</p>
<h3>1. Prepare the voyage</h3><ul><li>Gather 6–15 players in the same room, each with a private screen and Internet access. Share the boarding code.</li><li>Choose whether you are playing or overseeing. A playing Captain has a secret character and may belong to either team. An overseeing Captain has no character, ballot or team score and must remain neutral.</li><li>Set the playing crew count, 3–5 backup cards, death-reveal setting and timers. The count includes you only if you are playing.</li><li>Build or randomize the Script: it lists possible characters, not the actual deal. Apply the script, then Save briefing. Resolve any validation message before launch.</li><li>Match numbered berths to your clockwise seating. The last seat neighbours the first. Keep those places after launch, even when someone dies.</li></ul>
<h3>2. Brief the crew and launch</h3><p>Read this aloud if useful: “The Hollow are hidden among us. In the dark, work privately at your station. In the light, compare stories and vote on suspects. Crew win when every Hollow is dead; Hollow win when they equal or outnumber the living Crew.”</p><p>Explain that dead players follow silently: no speaking, nominations, votes or powers, but they still win with their team. Check that exactly the selected number of players are connected, save your briefing, then Seal the ship.</p><p>Everyone privately opens and acknowledges their orders. Dark cycle one starts automatically when all playing seats are ready and connected. There are no attacks in the first dark cycle.</p>
<h3>3. Respect the dark cycle</h3><p>Everyone stays at their terminal until the shared timer ends, including players without an action. Do not call out roles, ask who has finished or request anyone’s private results. Ship Intelligence collects legal choices and resolves effects automatically. You cannot shorten the dark cycle or act on another player’s behalf.</p>
<h3>4. Run discussion and the tribunal</h3><ol><li>At the light cycle, let the crew read their reports and discuss face to face. Respect any public speech or voting restrictions. Add a minute if needed; open nominations when the room is ready.</li><li>Record the actual living nominator and their chosen living suspect. Each may nominate once and be nominated once per light cycle. Self-nominations are allowed.</li><li>Players cast their own secret, final Execute or Spare ballot. Reveal the total only after every eligible player has voted.</li><li>Half the eligible voters, rounded up, must vote Execute to qualify. The highest qualifying total puts a suspect on the block; a higher total replaces them and a tied highest total clears the block. A lower total changes nothing.</li><li>Allow further legal nominations, then choose No more nominations and review the confirmation. Only the final suspect on the block is executed; a tied highest result means nobody is executed. Protection can prevent an execution death.</li><li>If the game continues, begin the next dark cycle when the room is ready.</li></ol>
<h3>5. Handle connection problems fairly</h3><p>If play pauses, ask the disconnected player to reopen the game in the same browser with their saved boarding pass. If you disconnect, connected players can unanimously agree to a new Captain. Do not create a replacement voyage while trying to recover the current one.</p><p>On the current file-storage hosting setup, a server restart or deployment may lose the room and points. A saved boarding pass cannot restore a room the server no longer has.</p>
<h3>6. Close the story</h3><p>Let everyone enjoy the final character reveal and public recap. Ship Intelligence awards one point to each winning teammate, including the fallen. Prepare another voyage when the crew is ready.</p><h3>Your boundaries</h3><p>You cannot choose secret assignments, override ballots, invent investigation results or change teams during play. If you oversee and see assignments, keep that knowledge out of discussion. If you play, use only the information your own character receives.</p>${button('Back to the voyage','close','primary full')}</section>`);
}
function guide() { openModal(`<section class="guide"><span class="eyebrow cyan">CADET FIELD GUIDE</span><h2>Keep your friends close.</h2><p>Space Case is played together in person, with a private phone or computer for each player. Internet is required.</p><h3>1. Find your allegiance</h3><p>Crew win when every Hollow is dead. Hollow win when they equal or outnumber the remaining living Crew. The Captain may play without seeing other characters, or oversee without playing.</p><h3>2. Attend your station</h3><p>Everyone privately uses their screen during the dark cycle. The first dark cycle has no attack. Later, every living member of the Hollow network must select the same victim. No agreement means no attack. Finishing early never ends the shared timer.</p><h3>3. Respect the dark cycle order</h3><p>Your starting briefing appears with your sealed character. Your chosen three, four or five spare cards are secretly unused. Copied Echo powers activate when the dark cycle begins. Scans and first dark cycle signals resolve before the attack. Deaths, revival and surviving players’ reports settle at the start of the light cycle. Some investigative transmissions may be delayed; each report shows the cycle it observed. Dead players receive no new private reports. This is Space Case’s explicit adaptation; Werewords has no recurring dark cycle kills.</p><h3>4. Nominate and vote</h3><p>Each living player may nominate once and be nominated once per light cycle, including themselves. The Captain records nominations. Living eligible players secretly vote Execute or Spare. A voting suspension removes your ballot, while a mute restricts speech only. At least half the living eligible voters, rounded up, must vote Execute.</p><h3>5. One execution</h3><p>The highest qualifying total puts a suspect on the block. A higher total replaces them; tied highest totals clear the block. Closing nominations executes at most one player. Dead players cannot speak, vote, nominate, or use abilities, but still win with their team. Revival restores participation that light cycle; powers resume next dark cycle with spent resources preserved.</p><h3>6. Stay connected</h3><p>A disconnected Captain pauses the voyage. Connected players can all agree to a new Captain. A living player disconnecting during the dark cycle or voting pauses play. Keep your saved boarding pass on this browser to return to your seat.</p><p class="fine-print">Thirty characters are available. Open My orders for your current actions, restrictions and private reports. Combination balance and final artwork require group playtesting.</p>${button('Ready for boarding ' + icon('arrow'), 'close', 'primary full')}</section>`); }
function preferences() { openModal(`<section class="preferences"><span class="eyebrow cyan">PERSONAL TERMINAL</span><h2>Your comfort settings.</h2><label class="switch-row"><span><strong>Reduced motion</strong><small>Keep the atmosphere, soften the movement.</small></span><input id="motion-preference" type="checkbox" ${reduced ? 'checked' : ''}></label><label class="switch-row"><span><strong>Terminal sounds</strong><small>Quiet button tones and a victory flourish.</small></span><input id="sound-preference" type="checkbox" ${sound ? 'checked' : ''}></label>${!state ? button('Forget saved callsign', 'forget-name', 'quiet full') : ''}<p class="fine-print">These settings affect only your terminal. Your device’s reduced-motion preference is used by default.</p>${button('Back to the voyage', 'close', 'primary full')}</section>`); }
app.addEventListener('submit', async event => {
  event.preventDefault(); const form = event.target, data = new FormData(form);
  if (form.id === 'boarding-form') {
    name = String(data.get('name')).trim(); save('spacecase.name', name);
    const intent = event.submitter?.value || 'create';
    if (intent === 'join' && !/^[A-Fa-f0-9]{6}$/.test(String(data.get('code')).trim())) return toast('Enter the six-character boarding code from your Captain.');
    await chooseAvatar(intent, { name, code: String(data.get('code')).trim().toUpperCase() });
  } else if (form.id === 'settings-form') {
    const roles = Object.fromEntries(Object.keys(CARD_LIMITS).map(key => [key, Number(data.get(key))]));
    if (await command('settings', { playerCount: Number(data.get('playerCount')), spareCards:Number(data.get('spareCards')), playing: data.has('playing'), reveal: data.has('reveal'), discussion: Number(data.get('discussion')), night: Number(data.get('night')), roles })) toast('Briefing saved. All crew can review the roster.');
  } else if (form.id === 'nomination-form') await command('nominate', { from: data.get('from'), to: data.get('to') });
});
app.addEventListener('change', event => { if (event.target.closest('#settings-form')) refreshPoolBudget(); });
app.addEventListener('input', event => { if (event.target.id === 'callsign') name = event.target.value; });
async function onAction(event) {
  const el = event.target.closest('[data-action]'); if (!el || el.disabled) return;
  const action = el.dataset.action; tone();
  if (action === 'avatar-pick') {
    selectedAvatar = Number(el.dataset.avatar); avatarPicker();
    modal.querySelector(`[data-avatar="${selectedAvatar}"]`)?.focus(); return;
  }
  if (action === 'board-avatar') {
    if (!boarding || selectedAvatar === null || takenAvatars.includes(selectedAvatar) || boardingBusy) return;
    boardingBusy = true; avatarPicker();
    const chosen = selectedAvatar;
    const ok = await command(boarding.intent, { ...boarding.data, avatar: chosen });
    boardingBusy = false;
    if (ok) { save('spacecase.avatar', chosen); boarding = null; modal.close(); }
    else if (boarding) avatarPicker();
    return;
  }
  if (action === 'close') return modal.close();
  if (action === 'library') return library();
  if (action === 'faction') {
    if (el.dataset.scope === 'library') { libraryTeam = el.dataset.team; library(); }
    else if (el.dataset.scope === 'editor') {
      const form=activePoolForm(),draft=poolFields(form);poolTeam=el.dataset.team;
      form.querySelector('.editor-card-list').innerHTML=poolCards(draft.roles);refreshPoolBudget(form);
    } else { publicTeam = el.dataset.team; render(); }
    return;
  }
  if (['pool-toggle','pool-more','pool-less'].includes(action)) {
    const form=activePoolForm(), draft=poolFields(form), remaining=draft.playerCount+draft.spareCards-poolSize(draft.roles);
    const input=form.elements[el.dataset.role], key=el.dataset.role;
    input.value=action==='pool-toggle'?togglePoolRole(key,Number(input.value),remaining):adjustPoolCopies(key,Number(input.value),action==='pool-more'?1:-1,remaining);
    refreshPoolBudget(); return;
  }
  if(action==='open-script-editor')return openScriptEditor();
  if(action==='randomize-pool') {
    const form=activePoolForm(),draft=poolFields(form),roles=randomPool(draft.playerCount,draft.spareCards,form.elements.reveal.checked);
    for(const [key,n] of Object.entries(roles))form.elements[key].value=n;
    refreshPoolBudget(form);toast('Random script ready. Review or change any character.');return;
  }
  if(action==='clear-pool') {const form=activePoolForm();for(const key of Object.keys(CARD_LIMITS))form.elements[key].value=0;refreshPoolBudget(form);return;}
  if(action==='script-characters'||action==='script-night') {scriptTab=action==='script-characters'?'characters':'night';render();return;}
  if(action==='script-saved'||action==='script-all') {scriptAll=action==='script-all';render();return;}
  if(action==='script-first'||action==='script-other') {scriptFirst=action==='script-first';render();return;}
  if(action==='night-watch') return nightWatch();
  if(action==='watch-tap') {watchCount++;modal.querySelector('[data-watch-count]').textContent=String(watchCount).padStart(2,'0');return;}
  if (action === 'fill-cadets') { const form = activePoolForm(), draft = poolFields(form); form.elements.cadet.value = Math.max(0, draft.playerCount + draft.spareCards - (poolSize(draft.roles) - draft.roles.cadet)); refreshPoolBudget(); return; }
  if (action === 'captain-handbook') return captainHandbook();
  if (action === 'guide') return guide();
  if (action === 'preferences') return preferences();
  if (action.startsWith('tab-')) { panel = action.slice(4); render(); return; }
  if (action === 'orders') return orders();
  if (action === 'command-jump' || action === 'board-jump') { document.querySelector(action === 'command-jump' ? '.captain-controls' : '.main-deck')?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' }); return; }
  if(action==='order-mode') {orderMode=el.dataset.mode;refreshOrders();return;}
  if(action==='order-target') {
    const channel=el.dataset.channel, view=privateCapabilities()[channel], id=el.dataset.id, count=view.count;
    if(!view.active||!view.targets.includes(id)) return;
    const selected=orderDrafts[channel] ?? view.selection ?? [];
    orderDrafts[channel]=selected.includes(id)?selected.filter(t=>t!==id):[...selected,id].slice(-count);
    if(channel==='hunt') {
      await command('hunt',orderDrafts.hunt.length?{targets:orderDrafts.hunt}:{pass:true});
    }
    if(modal.open) refreshOrders();return;
  }
  if(action==='order-submit') {
    const view=privateCapabilities().ability;
    await command('ability',{targets:orderDrafts.ability ?? view.selection ?? [],...(view.modes?.length?{mode:orderMode ?? view.mode}:{})});return;
  }
  if(action==='resonance-use') { resonanceArmed=true; refreshOrders(); return; }
  if(action==='order-pass') {if((state.me.powerRole||state.me.role)==='resonance')resonanceArmed=false;orderDrafts[el.dataset.channel]=[];await command(el.dataset.channel==='hunt'?'hunt':'ability',{pass:true});return;}
  if (action === 'vote-execute' || action === 'vote-spare') return command('vote', { execute: action === 'vote-execute' });
  if (action === 'acknowledge') { if (await command('acknowledge')) modal.close(); return; }
  if (action === 'copy') { try { await navigator.clipboard.writeText(state.code); toast('Boarding code copied. Tell your crew.'); } catch { toast(`Your boarding code is ${state.code}.`); } return; }
  if (action === 'person') {
    const p = state.players.find(p => p.id === el.dataset.id), i = state.players.filter(q => q.playing).findIndex(q => q.id === p.id);
    return openModal(`<section class="person-detail">${avatar(p.avatar, true)}<span class="eyebrow">BERTH ${String(i + 1).padStart(2, '0')}</span><h2>${esc(p.name)}</h2><p>${p.alive ? 'Life signs stable.' : 'Signal lost. No further actions.'} ${p.online ? 'Terminal connected.' : 'Terminal disconnected.'}</p>${p.role ? `<h3>${esc(ROLES[p.role]?.name)}</h3>` : '<p class="muted">Character assignment is private.</p>'}<span class="badge">${p.score} SESSION POINT${p.score === 1 ? '' : 'S'}</span>${state.phase==='lobby'&&state.host===state.me.id&&p.playing?`<p>Captain: match this berth to the crew’s clockwise physical seating.</p>${button('Move to earlier berth','seat-earlier','secondary full',`data-id="${p.id}" ${i===0?'disabled':''}`)}${button('Move to later berth','seat-later','secondary full',`data-id="${p.id}" ${i===state.players.filter(q=>q.playing).length-1?'disabled':''}`)}`:''}${state.phase === 'lobby' && state.host === state.me.id && p.id !== state.me.id ? button('Release this berth', 'remove-person', 'danger full', `data-id="${p.id}"`) : ''}${button('Return to crew', 'close', 'secondary full')}</section>`);
  }
  if(action==='seat-earlier'||action==='seat-later') { if(await command('move-seat',{id:el.dataset.id,direction:action==='seat-earlier'?-1:1}))modal.close(); return; }
  if (action === 'remove-person') { const id = el.dataset.id, p = state.players.find(p => p.id === id); return openModal(`<section class="guide"><h2>Release ${esc(p.name)}’s berth?</h2><p>They will return to boarding and can join again with the voyage code.</p>${button('Release berth', 'confirm-remove', 'danger full', `data-id="${id}"`)}${button('Keep aboard', 'close', 'quiet full')}</section>`); }
  if (action === 'confirm-remove') { if (await command('remove', { id: el.dataset.id })) modal.close(); return; }
  if (action === 'end-nominations') return openModal(`<section class="guide"><span class="eyebrow red">FINAL TRIBUNAL ORDER</span><h2>${state.block ? 'Confirm execution?' : 'Close without execution?'}</h2><p>${state.block ? `${esc(state.players.find(p => p.id === state.block)?.name)} is on the block with ${state.high} Execute votes. Their death will be public.` : state.tied ? 'Highest votes are tied. Nobody will die.' : 'Nobody qualified for the block. Nobody will die.'}</p>${button('Confirm and close nominations', 'confirm-execute', 'danger full')}${button('Return to nominations', 'close', 'quiet full')}</section>`);
  if (action === 'confirm-execute') { if (await command('execute')) modal.close(); return; }
  if (action === 'leave') return openModal(`<section class="guide"><h2>Leave this voyage?</h2><p>Your boarding pass can restore your seat during an active voyage. Leaving as Captain pauses play until you return or the crew agrees to a successor.</p>${button('Leave the ship', 'confirm-leave', 'danger full')}${button('Stay aboard', 'close', 'quiet full')}</section>`);
  if (action === 'confirm-leave') { const activeVoyage = state.phase !== 'lobby'; if (await command('leave')) { if (!activeVoyage) { session = null; forget('spacecase.session'); } state = null; panel = 'crew'; modal.close(); render(); if (activeVoyage) toast('Your boarding pass is saved. Reload this page to return to your berth.'); } return; }
  if (action === 'forget-name') { name = ''; forget('spacecase.name'); modal.close(); render(); return; }
  if (['start','night','nominations','extend','closeVote','rematch','consent'].includes(action)) { await command(action); }
}
app.addEventListener('click', onAction); modal.addEventListener('click', onAction);
modal.addEventListener('click', event => { if (event.target === modal) { const r = modal.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) modal.close(); } });
modal.addEventListener('change', event => {
  if(event.target.closest('#script-editor-form')){refreshPoolBudget();return;}
  if (event.target.id === 'motion-preference') { reduced = event.target.checked; document.documentElement.dataset.motion = reduced ? 'reduced' : 'full'; save('spacecase.motion', reduced); }
  if (event.target.id === 'sound-preference') { sound = event.target.checked; save('spacecase.sound', sound); tone(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && modal.open && modal.classList.contains('orders-dialog')) modal.close(); });
window.render_game_to_text = () => JSON.stringify({ mode: state?.phase || 'boarding', phase: state?.phase, code: state?.code, day: state?.day, crew: state?.players.map(({ name, alive, online }) => ({ name, alive, online })), ownRoleVisible: modal.open && modal.classList.contains('orders-dialog'), connected: socket?.connected || false, panel });
window.advanceTime = () => { updateClock(); };
document.addEventListener('keydown', event => { if (event.key === 'f' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) { if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.(); } });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { /* Installation may be unavailable outside a secure origin. */ });
render();
