// Christmas Dash's deterministic gameplay rules. No DOM or renderer dependencies.
export const LANES = [-3, 0, 3];
export const PLAYER_Z = 5;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const choose = (random, values) => values[Math.floor(random() * values.length)];
export function createRun(random = Math.random) {
  let id = 0;
  return {
    status: 'ready', lane: 1, distance: 0, gifts: 0, score: 0,
    speed: 14, jumpY: 0, jumpV: 0, slide: 0, slideHeld: false, slideHeldTime: 0, seconds: 0,
    objects: [], spawnIn: 5, rows: 0, forcedRows: 0, forcedStreak: 0,
    lastForcedKind: null, combo: 0, lastEvent: '',
    random, nextId: () => ++id
  };
}
export function startRun(run) {
  if (run.status !== 'ready') return false;
  run.status = 'running';
  return true;
}
export function togglePause(run) {
  if (run.status === 'running') run.status = 'paused';
  else if (run.status === 'paused') run.status = 'running';
  return run.status;
}
export function steer(run, direction) {
  if (run.status !== 'running') return;
  run.lane = clamp(run.lane + Math.sign(direction), 0, 2);
}
export function jump(run) {
  if (run.status !== 'running' || run.jumpY > 0 || run.slide > 0) return false;
  // Roughly 0.54s in the air rather than 0.78s: snappy jump and landing.
  run.jumpV = 10.8;
  run.jumpY = 0.01;
  return true;
}
export function duck(run, held = false) {
  if (run.status !== 'running' || run.jumpY > 0) return false;
  // A held Duck control stays active only while pressed; swipes are short taps.
  run.slideHeld = Boolean(held);
  run.slideHeldTime = 0;
  run.slide = held ? 1 : 0.34;
  return true;
}
export function releaseDuck(run) {
  run.slideHeld = false;
  // Don't leave the player crouched for a second after releasing the button.
  // Quick taps still produce a useful duck; deliberate holds stand up
  // almost immediately when released.
  run.slide = Math.min(run.slide, run.slideHeldTime < 0.12 ? 0.24 : 0.055);
}
export function spawnRow(run) {
  // Ease into each run. The first 110m teaches steering with open routes;
  // mandatory jumps/ducks appear gradually, then return to the fast and
  // demanding advanced patterns. After six forced moves, give a breather.
  const lanes = [0, 1, 2];
  const safeLane = choose(run.random, lanes);
  const hazards = lanes.filter(l => l !== safeLane);
  const stage = Math.min(6, Math.floor(run.distance / 110));
  const forceChance = [0, 0.10, 0.30, 0.55, 0.78, 0.92, 0.985][stage];
  const forced = run.forcedStreak < 6 && run.random() < forceChance;
  const twoHazardChance = [0.10, 0.35, 0.62, 0.80, 0.95, 1, 1][stage];
  const count = forced || (run.rows >= 3 && run.random() < twoHazardChance) ? 2 : 1;
  const kinds = run.rows < 3 ? ['crate']
    : run.distance < 160 ? ['crate', 'snowman']
    : ['crate', 'snowman', 'arch', 'arch'];
  const hazardZ = -45;
  // Snowmen are impassable. Place them clearly ahead of the gift sequence,
  // rather than at the same depth where they can seem to swallow presents.
  const snowmanZ = hazardZ + 12;
  for (let n = 0; n < count; n++) {
    const lane = hazards.splice(Math.floor(run.random() * hazards.length), 1)[0];
    const kind = choose(run.random, kinds);
    run.objects.push({
      id: run.nextId(), kind, lane,
      z: kind === 'snowman' ? snowmanZ : hazardZ, hit: false
    });
  }
  // The reward lane is ALWAYS actionable when all three lanes are blocked.
  // Alternate actions in consecutive forced sections for real jump/duck
  // variety. Clear reward lanes still appear as intentional breathing space.
  const giftLane = safeLane;
  let rewardHazard = null;
  if (forced) {
    const kind = run.forcedStreak > 0
      ? (run.lastForcedKind === 'crate' ? 'arch' : 'crate')
      : (run.random() < 0.55 ? 'crate' : 'arch');
    rewardHazard = { id: run.nextId(), kind, lane: safeLane, z: hazardZ, hit: false };
    run.objects.push(rewardHazard);
    run.lastForcedKind = kind;
  }
  // Non-forced sections genuinely leave a clear lane, so a fifth
  // compulsory move cannot sneak in via an "optional" reward obstacle.
  run.forcedStreak = forced ? run.forcedStreak + 1 : 0;
  if (forced) run.forcedRows++;
  // 1st: approach, 2nd: directly ABOVE the top of the barricade,
  // 3rd: landing. Never put the centre gift *inside* the obstacle.
  const offsets = rewardHazard?.kind === 'crate' ? [4.8, 0, -4.8]
    : rewardHazard?.kind === 'arch' ? [4.8, -3.5, -6]
    : [4.8, 2.4, 0];
  const gifts = offsets.map((offset, n) => ({
    id: run.nextId(), kind: 'gift', lane: giftLane,
    z: hazardZ + offset, height: rewardHazard?.kind === 'crate' && n === 1 ? 1.0 : 0,
    hit: false
  }));
  // Compare against the full active scene, including earlier sections. If an
  // impassable snowman lies anywhere on this reward line, don't spawn gifts
  // inviting the player to run straight into it.
  const overlapsSnowman = gifts.some(g => run.objects.some(o =>
    o.kind === 'snowman' && !o.hit && o.lane === g.lane && Math.abs(o.z - g.z) < 4
  ));
  if (!overlapsSnowman) run.objects.push(...gifts);
  run.rows++;
}
export function advance(run, dt) {
  if (run.status !== 'running') return [];
  dt = clamp(dt, 0, 0.05);
  run.seconds += dt;
  // A readable opening (~14m/s), with the former 43m/s top speed restored later.
  run.speed = Math.min(43, 14 + run.distance / 37);
  const travel = run.speed * dt;
  run.distance += travel;
  run.spawnIn -= travel;
  if (run.spawnIn <= 0) {
    spawnRow(run);
    // Two consecutive compulsory jumps must remain physically achievable
    // even at top speed (0.55s airtime); preserve a little input/reaction
    // margin rather than spawning the next unavoidable barricade too soon.
    // More time to react at first; spacing tapers to the original hard pace.
    const beginnerGap = Math.max(23, 37 - run.distance / 18);
    run.spawnIn += Math.max(beginnerGap, run.speed * 0.72) + run.random() * 4;
  }
  if (run.jumpY > 0 || run.jumpV > 0) {
    run.jumpY += run.jumpV * dt;
    run.jumpV -= 40 * dt;
    if (run.jumpY <= 0) { run.jumpY = 0; run.jumpV = 0; }
  }
  if(run.slideHeld)run.slideHeldTime += dt;
  run.slide = run.slideHeld ? 1 : Math.max(0, run.slide - dt);
  const events = [];
  for (const o of run.objects) {
    const previousZ = o.z;
    o.z += travel;
    if (o.hit || o.lane !== run.lane) continue;
    if (previousZ <= PLAYER_Z + 0.65 && o.z >= PLAYER_Z - 0.65) {
      if (o.kind === 'gift') {
        // Elevated presents above barricades can only be claimed in the air.
        if ((o.height || 0) > 0 && run.jumpY < 0.7) continue;
        o.hit = true;
        run.gifts++;
        run.combo++;
        events.push({type:'gift', id:o.id});
      } else {
        const avoided = (o.kind === 'crate' && run.jumpY > 0.7)
          || (o.kind === 'arch' && run.slide > 0.12);
        o.hit = true;
        if (avoided) {
          events.push({type:'dodge', kind:o.kind, id:o.id});
        } else {
          run.status = 'over';
          events.push({type:'crash', kind:o.kind, id:o.id});
          break;
        }
      }
    }
  }
  run.objects = run.objects.filter(o => o.z < 13 && !o.hit);
  run.score = Math.floor(run.distance * 3) + run.gifts * 25;
  return events;
}