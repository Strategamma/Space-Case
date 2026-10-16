import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLES } from '../../public/roles.js';
import { act, project, ensureAvatars } from '../../server/game.js';
import { deliverReports, report } from '../../server/moderator.js';
import { scenario } from '../helpers/character-scenario.js';

for (const [id,role] of Object.entries(ROLES)) {
  test(`${role.name}: reports stay private, dead recipients receive nothing, saved state restores, rematch clears secrets`,()=>{
    const s=scenario([id,'hollow',...Array(6).fill('cadet')]);
    const note=report(s.p[0],s.p[0],2,'contract-test',`Private fixture for ${id}`);
    deliverReports(s.room,[note]);
    assert.ok(project(s.room,s.p[0].id).me.reports.some(r=>r.id===note.id));
    const other=project(s.room,s.p[2].id);
    assert.equal(other.players[0].role,undefined);
    assert.ok(!JSON.stringify(other).includes(note.text));
    const restored=JSON.parse(JSON.stringify(s.room));ensureAvatars(restored);
    assert.deepEqual(JSON.parse(JSON.stringify(project(restored,s.p[0].id).me)),JSON.parse(JSON.stringify(project(s.room,s.p[0].id).me)));
    s.p[0].alive=false;
    deliverReports(s.room,[report(s.p[0],s.p[0],2,'after-death','Must not arrive')]);
    assert.ok(!s.p[0].reports.some(r=>r.text==='Must not arrive'));
    s.room.phase='victory';
    act(s.room,s.room.host,'rematch');
    for(const p of s.room.players) {assert.equal(p.role,null);assert.deepEqual(p.reports,[]);}
    assert.equal(s.room.phase,'lobby');
  });
}
