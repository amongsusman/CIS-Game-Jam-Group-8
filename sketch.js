const W = 1200, H = 600;
const GRAVITY = 0.55;
const MAX_FALL_SPEED = 12;

let state = 'START'; 
let currentLevel = 0;
let tiny, giant, boat, levelData;
let particles = [], embers = [], bgPillars = [], fireballs = [], bullets =[];
let doorOpen = false, win = false, screenShake = 0, levelTimer = 0;

// Cinematic Engine Variables
let cam = { x: W/2, y: H/2, scale: 1 };
let camTarget = { x: W/2, y: H/2, scale: 1 };
let cutscene = null, cutsceneTimer = 0;
let irisState = 'none', irisRadius = 0;
let timeScale = 1.0; 
let tutCamOverride = false, tutCamTarget = { x: W/2, y: H/2, scale: 1 };
let tutText = "", tutStep = 0, tutTimer = 0, tutHighlight = null, tutPhase = 0, pressedF = false;

let gameFont;

function preload() {
  gameFont = loadFont('https://fonts.gstatic.com/s/righteous/v17/1cXxaUPXBpj2rGoU7C9mjw.ttf');
}

function setup() {
  let cnv = createCanvas(W, H);
  cnv.parent("gameFrame");
  textFont(gameFont);
  for(let i=0; i<80; i++) embers.push(new Ember(true));
}

function resetLevel() {
  const lv = levels[currentLevel];
  levelData = JSON.parse(JSON.stringify(lv)); 
  fireballs = []; bullets =[]; levelTimer = 0;
  timeScale = 1.0; tutCamOverride = false; tutText = ""; tutStep = 0; tutTimer = 0; tutPhase = 0; tutHighlight = null;
  
  levelData.crates =[];
  if (levelData.cratesToDrop) {
    levelData.cratesToDrop.forEach(cDef => {
      let sx = levelData.trapdoor.x + cDef.offsetX;
      let sy = levelData.trapdoor.y - 48; 
      levelData.crates.push({
        x: sx, y: sy, w: 48, h: 48, vx: 0, vy: 0, type: cDef.type || 'wood',
        isCrate: true, startX: sx, startY: sy, burnTimer: 0, 
        onTrapdoor: true, lifted: false
      });
    });
  }
  if (levelData.initialCrates) {
    levelData.initialCrates.forEach(c => {
      levelData.crates.push({
        x: c.x, y: c.y, w: 48, h: 48, vx: 0, vy: 0, type: c.type || 'wood',
        isCrate: true, startX: c.x, startY: c.y, burnTimer: 0, onTrapdoor: false, lifted: false
      });
    });
  }

  levelData.guns =[];
  if (levelData.initialGuns) {
    levelData.initialGuns.forEach(g => {
      levelData.guns.push({
        x: g.x, y: g.y, w: 35, h: 15, vx: 0, vy: 0, 
        isGun: true, startX: g.x, startY: g.y, lifted: false, destroyed: false
      });
    });
  }
  
  bgPillars =[];
  for(let i=0; i<16; i++) bgPillars.push({x: random(-200, levelData.w+200), w: random(100, 400)});
  
  tiny = makeEntity(levelData.p1.x, levelData.p1.y, 18, 24, color(0, 230, 255), 4.2, -11.5);
  giant = makeEntity(levelData.p2.x, levelData.p2.y, 44, 68, color(255, 70, 90), 3.2, -10.5);
  
  boat = levelData.boat ? { x: levelData.boat.x, y: levelData.boat.y, w: levelData.boat.w, h: levelData.boat.h, vx: 0, minX: levelData.boat.minX, maxX: levelData.boat.maxX } : null;
  doorOpen = false; win = false; particles =[];
  cutscene = null; cutsceneTimer = 0; irisState = 'opening'; irisRadius = 0;
  
  cam = { x: W/2, y: H/2, scale: 1 };
  camTarget = { x: W/2, y: H/2, scale: 1 };
  state = 'PLAYING';
}

function makeEntity(x, y, w, h, col, speed, jump) {
  return { 
    x, y, w, h, col, speed, jump, vx: 0, vy: 0, groundTimer: 0, 
    lift: null, face: 1, s: 1, history:[], inDoor: false,
    onGiant: false, giantOffsetX: 0, onCrate: null, crateOffsetX: 0, 
    throwVx: 0, throwVy: 0, throwCharging: false, chargeFrames: 0, throwPowerT: 0
  };
}

const levels =[
  { // Level 1 (Cinematic Tutorial)
    w: 1200, h: 600, p1: {x: 100, y: 400}, p2: {x: 180, y: 400},
    platforms:[
      {x: 0, y: 500, w: 1200, h: 100}, 
      {x: 460, y: 350, w: 100, h: 20}
    ],
    switches:[
      {x: 480, y: 490, w: 60, h: 10, type: 'pressure', on: false}, 
      {x: 495, y: 335, w: 30, h: 15, type: 'toggle', on: false, locked: true, triggers: 'trapdoor'},   
      {x: 850, y: 490, w: 40, h: 10, type: 'pressure', on: false} 
    ],
    trapdoor: {x: 700, y: 100, w: 80, h: 20, open: false}, 
    cratesToDrop:[{offsetX: 16, type: 'wood'}],
    hazards:[], 
    door: {x: 1050, y: 415, w: 45, h: 85}
  },
  { // Level 2
    w: 1400, h: 600, p1: {x: 50, y: 350}, p2: {x: 120, y: 350},
    boat: {x: 250, y: 450, w: 140, h: 50, minX: 250, maxX: 460},
    platforms:[{x: 0, y: 450, w: 250, h: 150}, {x: 600, y: 450, w: 300, h: 150}, {x: 1200, y: 450, w: 200, h: 150}, {x: 0, y: 0, w: 670, h: 80}, {x: 830, y: 0, w: 570, h: 80}],
    geysers:[{x: 320, y: 80, timer: 0}, {x: 420, y: 80, timer: 60}, {x: 520, y: 80, timer: 0}, {x: 950, y: 80, timer: 30}, {x: 1050, y: 80, timer: 90}, {x: 1150, y: 80, timer: 30}], 
    trapdoor: {x: 670, y: 60, w: 160, h: 20, open: false}, cratesToDrop:[{offsetX: 10}, {offsetX: 60}, {offsetX: 110}], 
    switches:[{x: 700, y: 440, w: 40, h: 10, on: false, type: 'pressure'}, {x: 800, y: 435, w: 30, h: 15, on: false, type: 'toggle', locked: true, triggers: 'trapdoor'}],
    hazards:[{x: 250, y: 500, w: 350, h: 100, type: 'lava'}, {x: 900, y: 500, w: 300, h: 100, type: 'lava'}], door: {x: 1300, y: 365, w: 45, h: 85},
    hint: "Jump inside the boat as Giant and push against the boat's inner walls to drive it across the magma."
  },
  { // Level 3 (Redesigned "The Metal Umbrella")
    w: 1600, h: 600, p1: {x: 50, y: 350}, p2: {x: 120, y: 350},
    platforms:[ {x: 0, y: 500, w: 1600, h: 100} ], 
    drips:[ 
      {x: 300, timer: 0}, {x: 500, timer: 30}, {x: 700, timer: 60}, 
      {x: 900, timer: 90}, {x: 1100, timer: 15}, {x: 1300, timer: 45} 
    ],
    initialCrates:[{x: 250, y: 452, type: 'metal'}], 
    switches:[{x: 1400, y: 490, w: 80, h: 10, type: 'heavy', on: false}], 
    hazards:[], 
    door: {x: 1500, y: 415, w: 45, h: 85},
    hint: "Giant needs to hold the Metal Crate high overhead to block the falling magma while Tiny walks safely underneath!"
  },
  { // Level 4
    w: 1600, h: 1000, p1: {x: 100, y: 850}, p2: {x: 200, y: 850},
    platforms:[
      {x: 0, y: 950, w: 700, h: 50}, {x: 780, y: 950, w: 80, h: 50}, {x: 940, y: 950, w: 80, h: 50}, {x: 1100, y: 950, w: 500, h: 50},
      {x: 0, y: -50, w: 1200, h: 70}, {x: 1280, y: -50, w: 320, h: 70},
      {x: 150, y: 400, w: 100, h: 20}, {x: 350, y: 320, w: 100, h: 20}, {x: 550, y: 240, w: 100, h: 20}, {x: 750, y: 160, w: 100, h: 20}, {x: 950, y: 200, w: 100, h: 20}, {x: 1050, y: 150, w: 80, h: 20},
      {x: 1450, y: 450, w: 150, h: 50} 
    ],
    breakableWalls:[{x: 730, y: 450, w: 60, h: 500, broken: false, isPillar: true}],
    initialGuns:[{x: 150, y: 935}], initialCrates:[], 
    trapdoor: {x: 1200, y: 800, w: 80, h: 20, open: false}, cratesToDrop:[{offsetX: 16, type: 'metal'}],
    vents:[{x: 50, y: 450, w: 100, h: 500, linkedType: 'heavy', active: false}],
    pulleys:[{
        x1: 1280, y1: 250, w1: 60, h1: 20, startY1: 250, endY1: 930, 
        x2: 1350, y2: 930, w2: 100, h2: 20, startY2: 930, endY2: 450, 
        linkedType: 'toggle', progress: 0
    }],
    switches:[
      {x: 1200, y: 940, w: 80, h: 10, type: 'heavy', on: false}, 
      {x: 1075, y: 135, w: 30, h: 15, type: 'toggle', on: false}, 
      {x: 690, y: 700, w: 20, h: 60, type: 'target_pillar', on: false, startY: 700, speed: 0.05, range: 100, triggers: 'trapdoor'} 
    ],
    hazards:[{x: 700, y: 950, w: 400, h: 50, type: 'lava'}], door: {x: 1500, y: 365, w: 45, h: 85}
  }
];

function updatePlayer(e) {
  if (timeScale > 0) e.groundTimer = e.onGround ? 8 : max(0, e.groundTimer - 1);
  let canJump = e.groundTimer > 0;
  let canMove = (cutscene === null) && !e.inDoor && state === 'PLAYING';

  if (timeScale > 0 && e === giant && e.lift && canMove && e.lift.type !== 'metal') {
    if (keyIsDown(32) || keyIsDown(16)) {
      e.chargeFrames++;
      if (e.chargeFrames > 8) e.throwCharging = true;
      if (e.throwCharging) {
        e.throwPowerT = (sin(frameCount * 0.05) + 1) / 2;
        e.throwVx = e.face * lerp(8, 24, e.throwPowerT);
        e.throwVy = lerp(-3, -10, e.throwPowerT);
      }
    } else { e.chargeFrames = 0; e.throwCharging = false; }
  }

  if (timeScale > 0 && e === tiny && e.lift && canMove && e.lift.isGun) {
    if (keyIsDown(81)) { 
      e.chargeFrames++;
      if (e.chargeFrames > 8) e.throwCharging = true;
      if (e.throwCharging) {
        e.throwPowerT = (sin(frameCount * 0.05) + 1) / 2;
        e.throwVx = e.face * lerp(8, 24, e.throwPowerT);
        e.throwVy = lerp(-3, -10, e.throwPowerT);
      }
    } else { e.chargeFrames = 0; e.throwCharging = false; }
  }

  if (e === tiny && canMove && (keyIsDown(65) || keyIsDown(68) || keyIsDown(87))) {
    tiny.onGiant = false; tiny.onCrate = null;
  }

  if (e === tiny && tiny.onGiant) {
    tiny.x = giant.x + tiny.giantOffsetX; tiny.y = giant.y - tiny.h;
    tiny.vy = giant.vy; tiny.vx = giant.vx; 
    tiny.onGround = true; canJump = true;
  }
  else if (e === tiny && tiny.onCrate) {
    let c = tiny.onCrate;
    tiny.x = c.x + tiny.crateOffsetX; tiny.y = c.y - tiny.h;
    tiny.vy = c.vy; tiny.vx = c.vx; 
    tiny.onGround = true; canJump = true;
  }

  if (canMove) {
    if (e === tiny) {
      if (!tiny.onGiant && !tiny.onCrate) e.vx = (keyIsDown(65) ? -e.speed : (keyIsDown(68) ? e.speed : 0));
      if (keyIsDown(87) && canJump) { 
        e.vy = e.jump; e.s = 1.4; e.groundTimer = 0; tiny.onGiant = false; tiny.onCrate = null;
        if(timeScale > 0) spawnParticles(e.x+e.w/2, e.y+e.h, 6, color(100, 230, 255), 'dust'); 
      }
    } else {
      e.vx = (keyIsDown(LEFT_ARROW) ? -e.speed : (keyIsDown(RIGHT_ARROW) ? e.speed : 0));
      if (keyIsDown(UP_ARROW) && canJump) { 
        e.vy = e.jump; e.s = 1.3; e.groundTimer = 0; 
        if(timeScale > 0) spawnParticles(e.x+e.w/2, e.y+e.h, 8, color(255, 100, 100), 'dust'); 
      }
    }
  } else if (e.inDoor && irisState !== 'closing') {
    e.vx = ((levelData.door.x + levelData.door.w/2 - e.w/2) - e.x) * 0.15;
  } else {
    if (!e.onGiant && !e.onCrate) e.vx *= 0.8;
  }

  if (!(e === tiny && (tiny.onGiant || tiny.onCrate))) {
    e.vy += GRAVITY * timeScale; if(e.vy > MAX_FALL_SPEED) e.vy = MAX_FALL_SPEED; 
    e.y += e.vy * timeScale; e.x += e.vx * timeScale;
  }

  if (levelData.conveyors) {
    levelData.conveyors.forEach(c => {
      if (c.active && e.vy >= 0 && e.x + e.w > c.x && e.x < c.x + c.w && abs((e.y + e.h) - c.y) < 6) e.x += c.speed * timeScale;
    });
  }
  
  e.onGround = false; e.s = lerp(e.s, 1, 0.15);
  if (e.vx !== 0 && canMove && !e.onGiant && !e.onCrate) e.face = e.vx > 0 ? 1 : -1;

  if (frameCount % 3 === 0 && canMove && timeScale > 0) { 
    e.history.push({x: e.x, y: e.y}); if (e.history.length > 3) e.history.shift(); 
  }

  let colliders =[...levelData.platforms];
  if (levelData.breakableWalls) levelData.breakableWalls.forEach(w => { if(!w.broken) colliders.push(w); });
  colliders.forEach(p => boxCollide(e, p));

  if (e === tiny && !tiny.onGiant && !tiny.onCrate) {
    if (rectIntersect(tiny, giant) && tiny.vy >= giant.vy && tiny.y + tiny.h <= giant.y + 20) {
      tiny.onGiant = true; tiny.giantOffsetX = tiny.x - giant.x;
      tiny.y = giant.y - tiny.h; tiny.vy = giant.vy; tiny.onGround = true;
    }
  }

  if (boat) {
    let bLeft = {x: boat.x, y: boat.y, w: 20, h: boat.h};
    let bRight = {x: boat.x+boat.w-20, y: boat.y, w: 20, h: boat.h};
    let bFloor = {x: boat.x+10, y: boat.y+boat.h-15, w: boat.w-20, h: 15};
    boxCollide(e, bFloor);
    if (rectIntersect(e, bLeft)) {
      boxCollide(e, bLeft); 
      if (e === giant && e.y > boat.y - e.h + 5) {
        if (keyIsDown(LEFT_ARROW) && e.x > boat.x) boat.vx -= 0.6 * timeScale;
        if (keyIsDown(RIGHT_ARROW) && e.x < boat.x) boat.vx += 0.6 * timeScale;
      }
      if (e === tiny && e.y > boat.y - e.h + 5) {
        if (keyIsDown(65) && e.x > boat.x) boat.vx -= 0.3 * timeScale;
        if (keyIsDown(68) && e.x < boat.x) boat.vx += 0.3 * timeScale;
      }
    }
    if (rectIntersect(e, bRight)) {
      boxCollide(e, bRight);
      if (e === giant && e.y > boat.y - e.h + 5) {
        if (keyIsDown(RIGHT_ARROW) && e.x < boat.x + boat.w) boat.vx += 0.6 * timeScale;
        if (keyIsDown(LEFT_ARROW) && e.x > boat.x + boat.w) boat.vx -= 0.6 * timeScale;
      }
      if (e === tiny && e.y > boat.y - e.h + 5) {
        if (keyIsDown(68) && e.x < boat.x + boat.w) boat.vx += 0.3 * timeScale;
        if (keyIsDown(65) && e.x > boat.x + boat.w) boat.vx -= 0.3 * timeScale;
      }
    }
  }

  levelData.crates.forEach(c => { 
    if (e === giant && !c.lifted && !c.onTrapdoor) {
      if (rectIntersect(e, c)) {
        let dx = (e.x + e.w/2) - (c.x + c.w/2), dy = (e.y + e.h/2) - (c.y + c.h/2);
        let oX = (e.w + c.w)/2 - Math.abs(dx), oY = (e.h + c.h)/2 - Math.abs(dy);
        if (oX < oY) { 
          e.x += (dx > 0) ? oX : -oX; 
          if (c.type !== 'metal') {
            c.vx = (dx > 0) ? -0.8 : 0.8; 
            e.vx *= 0.5; 
            if(frameCount%15===0 && Math.abs(e.vx) > 0.1 && timeScale > 0) spawnParticles(c.x+c.w/2, c.y+c.h, 2, color(200), 'dust');
          } else { e.vx = 0; } 
        } else { 
          if (dy > 0) { e.y += oY; e.vy = 0; }
          else { e.y -= oY; e.vy = 0; e.onGround = true; } 
        }
      }
    }
    if (e === tiny && !c.lifted && !c.onTrapdoor) boxCollide(e, c);
    
    if (e === tiny && !tiny.onGiant && !tiny.onCrate && !c.onTrapdoor) {
      if (rectIntersect(tiny, c) && tiny.vy >= c.vy && tiny.y + tiny.h <= c.y + 20) {
        tiny.onCrate = c; tiny.crateOffsetX = tiny.x - c.x;
        tiny.y = c.y - tiny.h; tiny.vy = c.vy; tiny.onGround = true;
      }
    }
  });

  e.x = constrain(e.x, 0, levelData.w - e.w);
}

function updateBullets() {
  if (state !== 'PLAYING') return;
  for(let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];
    b.vy += GRAVITY * timeScale; if (b.vy > MAX_FALL_SPEED) b.vy = MAX_FALL_SPEED; 
    b.x += b.vx * timeScale; b.y += b.vy * timeScale;
    
    let hit = false;
    let bRect = {x: b.x-b.r, y: b.y-b.r, w: b.r*2, h: b.r*2};

    levelData.platforms.forEach(p => { if (rectIntersect(bRect, p)) hit = true; });
    levelData.crates.forEach(c => { if (rectIntersect(bRect, c)) hit = true; });
    if (levelData.breakableWalls) levelData.breakableWalls.forEach(w => { if (!w.broken && rectIntersect(bRect, w)) hit = true; });

    if (levelData.switches) {
      levelData.switches.forEach(s => {
        if (s.type.startsWith('target') && !s.destroyed && !s.on && rectIntersect(bRect, s)) {
          s.destroyed = true; s.on = true; hit = true;
          spawnParticles(s.x+s.w/2, s.y+s.h/2, 20, color(0, 255, 255), 'spark');
          
          if (s.type === 'target_pillar' || s.type === 'target') {
            if (levelData.breakableWalls) {
              levelData.breakableWalls.forEach(w => {
                if (w.isPillar && !w.broken) { w.broken = true; screenShake = 15; spawnParticles(w.x+w.w/2, w.y+w.h/2, 60, color(80, 75, 85), 'dust'); }
              });
            }
          }
          if (levelData.guns) levelData.guns.forEach(g => g.destroyed = true);
          if (tiny.lift && tiny.lift.isGun) { tiny.lift = null; tiny.throwCharging = false; tiny.chargeFrames = 0; }
          triggerSwitchEvents(s);
        }
      });
    }

    if (hit || b.y > levelData.h + 200) {
      if (hit) spawnParticles(b.x, b.y, 10, color(0, 255, 255), 'spark');
      bullets.splice(i, 1);
    }
  }
}

function triggerSwitchEvents(s) {
  if (s.triggers === 'trapdoor' && levelData.trapdoor && !levelData.trapdoor.cutscenePlayed) {
    cutscene = 'trapdoor'; cutsceneTimer = 0;
    camTarget = { x: levelData.trapdoor.x + levelData.trapdoor.w/2, y: levelData.trapdoor.y + 100, scale: 1.8 };
    levelData.trapdoor.cutscenePlayed = true;
  }
}

function updateGuns() {
  if (state !== 'PLAYING') return;
  if (levelData.guns) {
    levelData.guns = levelData.guns.filter(g => !g.destroyed);
    levelData.guns.forEach(g => {
      if (g.lifted) {
        g.x = tiny.x + tiny.w/2 - g.w/2; 
        g.y = tiny.y - g.h - 12; 
        g.vx = 0; g.vy = 0;
      } else {
        g.vy += GRAVITY * timeScale; if(g.vy > MAX_FALL_SPEED) g.vy = MAX_FALL_SPEED; 
        g.x += g.vx * timeScale; g.y += g.vy * timeScale; g.vx *= Math.pow(0.95, timeScale);
        let colliders =[...levelData.platforms];
        if (levelData.breakableWalls) levelData.breakableWalls.forEach(w => { if(!w.broken) colliders.push(w); });
        colliders.forEach(p => boxCollide(g, p));
      }
    });
  }
}

function checkLogic() {
  if (state !== 'PLAYING') return;
  let giantOnPlate = false;
  
  if (levelData.switches) {
    levelData.switches.forEach(s => {
      if (s.destroyed) return;
      let checkRect = {x: s.x, y: s.y - 4, w: s.w, h: s.h + 4}; 
      if (s.type === 'pressure') {
        let active = rectIntersect(giant, checkRect) || levelData.crates.some(c => rectIntersect(c, checkRect));
        if(active && !s.on) {
          spawnParticles(s.x+s.w/2, s.y, 5, color(255, 200, 50), 'spark');
          if (levelData.vents && levelData.vents.some(v => v.linkedType === 'pressure')) {
            let v = levelData.vents.find(v => v.linkedType === 'pressure');
            if (!v.cutscenePlayed) { cutscene = 'vent'; cutsceneTimer = 0; camTarget = { x: v.x + v.w/2, y: v.y + v.h/2, scale: 1.2 }; v.cutscenePlayed = true; }
          }
        }
        s.on = active; 
        if (active && rectIntersect(giant, checkRect)) giantOnPlate = true;
      }
      if (s.type === 'heavy') {
        let active = levelData.crates.some(c => c.type === 'metal' && rectIntersect(c, checkRect));
        if(active && !s.on) {
          spawnParticles(s.x+s.w/2, s.y, 10, color(0, 200, 255), 'spark');
          if (levelData.vents && levelData.vents.some(v => v.linkedType === 'heavy')) {
            let v = levelData.vents.find(v => v.linkedType === 'heavy');
            if (!v.cutscenePlayed) { cutscene = 'vent'; cutsceneTimer = 0; camTarget = { x: v.x + v.w/2, y: v.y + v.h/2, scale: 1.2 }; v.cutscenePlayed = true; }
          }
        }
        s.on = active;
      }
    });

    levelData.switches.forEach(s => {
      if (s.destroyed) return;
      if (s.type === 'toggle') { 
        if (s.locked !== undefined) s.locked = !giantOnPlate; 
        if (!s.locked && !s.on && rectIntersect(tiny, s)) {
          if (keyIsDown(81) && (!tiny.lift || !tiny.lift.isGun)) {
            s.crankProgress = (s.crankProgress || 0) + 0.015;
            if (s.crankProgress >= 1) {
              s.crankProgress = 1; s.on = true;
              spawnParticles(s.x + s.w/2, s.y, 15, color(0, 255, 150), 'spark');
              triggerSwitchEvents(s);
            }
          }
        }
      }
    });
  }

  if (levelData.hazards) levelData.hazards.forEach(h => { if (rectIntersect(tiny, h) || rectIntersect(giant, h)) resetLevel(); });
  
  let switchesOk;
  
  if (currentLevel == 0) {
    switchesOk = !levelData.switches || levelData.switches[1].on && levelData.switches[2].on;
  }
  else {
    switchesOk = !levelData.switches || levelData.switches.every(s => s.on);
  }
  
  doorOpen = switchesOk;
  
  tiny.inDoor = rectIntersect(tiny, levelData.door) && doorOpen && tiny.onGround;
  giant.inDoor = rectIntersect(giant, levelData.door) && doorOpen && giant.onGround;

  if (tiny.inDoor && giant.inDoor && irisState !== 'closing') {
    irisState = 'closing'; irisRadius = max(W, H) * 2;
    camTarget = { x: levelData.door.x + levelData.door.w/2, y: levelData.door.y + levelData.door.h/2, scale: 1.6 };
  }
}

// ==========================================
// CINEMATIC TUTORIAL ENGINE (LEVEL 1)
// ==========================================
function checkTutorialLogic() {
  if (currentLevel !== 0 || state !== 'PLAYING') return;
  if (!levelData.switches || levelData.switches.length < 3) return;

  let plate1 = levelData.switches[0];
  let switch1 = levelData.switches[1];
  let plate2 = levelData.switches[2];
  let crate = levelData.crates[0]; // Safely evaluates

  switch(tutStep) {
    case 0:
      tutText = "TINY: WASD to Move & Jump\nGIANT: Arrow Keys to Move & Jump";
      if (abs(tiny.x - 100) > 30 && abs(giant.x - 180) > 30) { tutStep = 1; tutTimer = 0; tutText = ""; }
      break;
    case 1:
      tutText = "Press 'F' to toggle Fullscreen for the best experience!";
      tutTimer++;
      if (tutTimer > 180 || pressedF) { tutStep = 2; tutTimer = 0; tutText = ""; }
      break;
    case 2:
      if (abs(giant.x - plate1.x) < 200) {
        if (tutPhase === 0) {
          timeScale = 0.1; tutCamOverride = true; tutCamTarget = {x: plate1.x, y: plate1.y, scale: 1.6};
          tutHighlight = {x: plate1.x, y: plate1.y, w: plate1.w, h: plate1.h};
          tutTimer++;
          if (tutTimer > 100) { tutPhase = 1; timeScale = 1.0; tutCamOverride = false; }
        } else {
          tutText = "Giant, stand on the plate to unlock the switch!";
          if (plate1.on) { tutStep = 3; tutPhase = 0; tutTimer = 0; tutHighlight = null; tutText = ""; }
        }
      }
      break;
    case 3:
      tutText = "Tiny, jump on Giant's head to reach the switch!\nHold 'Q' to crank it.";
      if (switch1.on) { tutStep = 4; tutPhase = 0; tutTimer = 0; tutText = ""; }
      break;
    case 4:
      if (cutscene === null && levelData.trapdoor.open) { tutStep = 5; tutPhase = 0; tutTimer = 0; }
      break;
    case 5:
      if (crate && crate.y > 450) {
        tutHighlight = {x: crate.x, y: crate.y, w: crate.w, h: crate.h};
        tutText = "Giant, stand near the crate and hold SPACE to lift it.";
        if (giant.lift === crate) { tutStep = 6; tutHighlight = null; tutText = ""; }
      }
      break;
    case 6:
      if (tutPhase === 0) {
        timeScale = 0.1; tutCamOverride = true; tutCamTarget = {x: plate2.x, y: plate2.y, scale: 1.6};
        tutHighlight = {x: plate2.x, y: plate2.y, w: plate2.w, h: plate2.h};
        tutTimer++;
        if (tutTimer > 100) { tutPhase = 1; timeScale = 1.0; tutCamOverride = false; }
      } else {
        tutText = "Release SPACE to throw the wooden crate onto the final Plate!";
        if (plate2.on) { tutStep = 7; tutPhase = 0; tutTimer = 0; tutHighlight = null; tutText = ""; }
      }
      break;
    case 7:
      tutText = "The crate is holding the door open!\nBoth players must enter.";
      break;
  }
}

function updateMechanics() {
  if (levelData.switches) {
    levelData.switches.forEach(s => {
      if (s.type.startsWith('target') && s.speed && !s.destroyed) s.y = s.startY + sin(frameCount * s.speed) * s.range;
    });
  }

  if (levelData.gates) {
    levelData.gates.forEach(g => {
      if (levelData.switches) {
        let s = levelData.switches.find(sw => sw.type === g.linkedType);
        g.y = lerp(g.y, (s && s.on) ? g.endY : g.startY, 0.1);
      }
      fill(60, 55, 65); rect(g.x, g.y, g.w, g.h, 2); fill(80, 75, 85); rect(g.x+4, g.y+4, g.w-8, g.h-8);
      boxCollide(tiny, g); boxCollide(giant, g); levelData.crates.forEach(c => boxCollide(c, g));
    });
  }

  if (levelData.vents) {
    levelData.vents.forEach(v => {
      if (levelData.switches) {
        let s = levelData.switches.find(sw => sw.type === v.linkedType);
        v.active = s ? s.on : true;
      }
      if (v.active) {
        if (frameCount % 2 === 0 && timeScale > 0) {
          spawnParticles(v.x + random(v.w), v.y + v.h - 10, 1, color(200, 255, 255), 'wind');
        }
        if (tiny.x < v.x + v.w && tiny.x + tiny.w > v.x && tiny.y < v.y + v.h && tiny.y + tiny.h > v.y) {
          tiny.vy -= 1.2 * timeScale; if (tiny.vy < -12) tiny.vy = -12; tiny.onGround = false;
        }
      }
    });
  }

  if (levelData.conveyors) {
    levelData.conveyors.forEach(c => {
      if (levelData.switches) {
        let s = levelData.switches.find(sw => sw.type === c.linkedType);
        c.active = s ? s.on : (c.linkedType === 'none' ? true : false);
      }
      boxCollide(tiny, c); boxCollide(giant, c);
    });
  }

  if (levelData.anvils) {
    levelData.anvils.forEach(a => {
      a.vy += GRAVITY * timeScale; a.y += a.vy * timeScale; a.x += a.vx * timeScale;
      if(a.vy > MAX_FALL_SPEED) a.vy = MAX_FALL_SPEED; 
      let onConv = false;
      if (levelData.conveyors) {
        levelData.conveyors.forEach(c => {
          if (rectIntersect(a, c) && a.vy >= 0 && a.y + a.h <= c.y + 15) {
            a.y = c.y - a.h; a.vy = 0; onConv = true; a.vx = c.active ? c.speed : 0;
          }
        });
      }
      if (!onConv) { 
        a.vx *= Math.pow(0.9, timeScale); 
        let colliders =[...levelData.platforms];
        if (levelData.breakableWalls) levelData.breakableWalls.forEach(w => { if(!w.broken) colliders.push(w); });
        if (levelData.gates) levelData.gates.forEach(g => colliders.push(g));
        colliders.forEach(p => boxCollide(a, p)); 
      }
    });
  }

  if (levelData.pulleys) {
    levelData.pulleys.forEach(pu => {
      if (pu.linkedType) {
        if (levelData.switches) {
          let s = levelData.switches.find(sw => sw.type === pu.linkedType);
          pu.weight = (s && s.on);
        }
      } else {
        pu.weight = false;
        let p1Rect = {x: pu.x1, y: pu.y1-5, w: pu.w1, h: 10};
        if (levelData.anvils) levelData.anvils.forEach(a => { if (rectIntersect(a, p1Rect)) pu.weight = true; });
      }
      
      pu.progress = lerp(pu.progress || 0, pu.weight ? 1 : 0, 0.05 * timeScale);
      let oldY1 = pu.y1, oldY2 = pu.y2;
      pu.y1 = lerp(pu.startY1, pu.endY1, pu.progress);
      pu.y2 = lerp(pu.startY2, pu.endY2, pu.progress);
      let dy1 = pu.y1 - oldY1; let dy2 = pu.y2 - oldY2;
      
      let entities =[tiny, giant];
      if (levelData.anvils) entities = entities.concat(levelData.anvils);
      if (levelData.crates) entities = entities.concat(levelData.crates);
      
      entities.forEach(e => {
        if (e.x < pu.x1 + pu.w1 && e.x + e.w > pu.x1 && abs((e.y + e.h) - oldY1) < 15 && e.vy >= 0) { e.y += dy1; e.vy = 0; e.onGround = true; e.y = pu.y1 - e.h; }
        if (e.x < pu.x2 + pu.w2 && e.x + e.w > pu.x2 && abs((e.y + e.h) - oldY2) < 15 && e.vy >= 0) { e.y += dy2; e.vy = 0; e.onGround = true; e.y = pu.y2 - e.h; }
        boxCollide(e, {x: pu.x1, y: pu.y1, w: pu.w1, h: pu.h1});
        boxCollide(e, {x: pu.x2, y: pu.y2, w: pu.w2, h: pu.h2});
      });
    });
  }
}

function updateHazards() {
  if (state !== 'PLAYING') return;
  if (levelData.geysers) {
    levelData.geysers.forEach(g => {
      g.timer += 1 * timeScale;
      if (g.timer >= 120) {
        g.timer = 0; fireballs.push({x: g.x, y: g.y + 10, r: 12, vy: 7});
        spawnParticles(g.x, g.y, 10, color(255, 100, 0), 'spark');
      }
      if (g.timer > 100 && frameCount % 3 === 0) spawnParticles(g.x + random(-10,10), g.y + 5, 1, color(255, 150, 0), 'spark');
    });
  }

  if (levelData.drips) {
    levelData.drips.forEach(d => {
      d.timer += 1 * timeScale;
      if (d.timer >= 120) {
        d.timer = 0; fireballs.push({x: d.x, y: 20, r: 10, vy: 2});
        spawnParticles(d.x, 20, 10, color(255, 100, 0), 'spark');
      }
      if (d.timer > 100 && frameCount % 3 === 0) spawnParticles(d.x + random(-10,10), 20, 1, color(255, 150, 0), 'spark');
    });
  }

  for (let i = fireballs.length - 1; i >= 0; i--) {
    let f = fireballs[i]; f.vy += GRAVITY * 0.15 * timeScale; f.y += f.vy * timeScale;
    let blocked = false;
    let fRect = {x: f.x-f.r, y: f.y-f.r, w: f.r*2, h: f.r*2};

    for (let c of levelData.crates) {
      if (rectIntersect(fRect, c)) { blocked = true; spawnParticles(f.x, f.y, 8, color(255, 100, 0), 'spark'); break; }
    }
    levelData.platforms.forEach(p => {
      if (rectIntersect(fRect, p)) { blocked = true; spawnParticles(f.x, f.y, 8, color(255, 100, 0), 'spark'); }
    });
    if (blocked) { fireballs.splice(i, 1); continue; }
    if (rectIntersect(fRect, tiny) || rectIntersect(fRect, giant)) { resetLevel(); return; }
    if (f.y > levelData.h + 50) fireballs.splice(i, 1);
  }
}

function drawMechanicsAndHazards() {
  if (levelData.geysers) {
    levelData.geysers.forEach(g => {
      fill(30, 15, 15); rect(g.x - 20, g.y, 40, 10, 4); fill(255, 80, 0); rect(g.x - 15, g.y + 6, 30, 6, 2);
    });
  }
  
  fireballs.forEach(f => {
    fill(255, 100, 0); ellipse(f.x, f.y, f.r*2); fill(255, 255, 0); ellipse(f.x, f.y, f.r);
    beginShape(); vertex(f.x - f.r, f.y); vertex(f.x + f.r, f.y); vertex(f.x, f.y - f.r * 2.5); endShape(CLOSE);
  });

  if (levelData.breakableWalls) {
    levelData.breakableWalls.forEach(w => {
      if (!w.broken) {
        fill(60, 55, 65); rect(w.x, w.y, w.w, w.h, 4);
        fill(45, 40, 50); rect(w.x + 5, w.y + 5, w.w - 10, w.h - 10, 2);
        fill(30, 25, 35); for(let i=20; i<w.h; i+=40) rect(w.x + 10, w.y + i, w.w - 20, 4);
      }
    });
  }

  if (levelData.vents) {
    levelData.vents.forEach(v => {
      fill(60); rect(v.x, v.y + v.h - 20, v.w, 20); fill(40);
      for(let i=10; i<v.w; i+=15) rect(v.x+i, v.y+v.h-20, 5, 20);
    });
  }

  if (levelData.conveyors) {
    levelData.conveyors.forEach(c => {
      fill(50, 50, 60); rect(c.x - 4, c.y, c.w + 8, c.h, 10); fill(30); rect(c.x, c.y + 2, c.w, c.h - 4);
      fill(80, 200, 100); let offset = c.active ? (frameCount * Math.abs(c.speed) * 0.5) % 20 : 0;
      for (let i = offset; i < c.w; i += 20) { if (i > 0 && i < c.w - 4) { fill(90); rect(c.x + i, c.y, 4, c.h); } }
      push(); translate(c.x, c.y + c.h/2); rotate(c.active ? frameCount * 0.1 * Math.sign(c.speed) : 0); fill(100); ellipse(0, 0, c.h + 2); fill(60); ellipse(0, 0, 6); pop();
      push(); translate(c.x + c.w, c.y + c.h/2); rotate(c.active ? frameCount * 0.1 * Math.sign(c.speed) : 0); fill(100); ellipse(0, 0, c.h + 2); fill(60); ellipse(0, 0, 6); pop();
    });
  }

  if (levelData.anvils) {
    levelData.anvils.forEach(a => {
      fill(60, 65, 70); rect(a.x + 2, a.y + a.h - 8, a.w - 4, 8, 2); rect(a.x + 12, a.y + 12, a.w - 24, a.h - 20); 
      beginShape(); vertex(a.x, a.y + 12); vertex(a.x, a.y + 4); vertex(a.x + a.w, a.y + 4); vertex(a.x + a.w, a.y + 12); endShape(CLOSE);
      fill(90, 95, 100); rect(a.x + 2, a.y + 4, a.w - 4, 2); 
    });
  }

  if (levelData.pulleys) {
    levelData.pulleys.forEach(pu => {
      stroke(120); strokeWeight(4);
      line(pu.x1 + pu.w1/2, 50, pu.x2 + pu.w2/2, 50); 
      line(pu.x1 + pu.w1/2, 50, pu.x1 + pu.w1/2, pu.y1); line(pu.x2 + pu.w2/2, 50, pu.x2 + pu.w2/2, pu.y2);
      noStroke(); fill(40); ellipse(pu.x1 + pu.w1/2, 50, 30, 30); ellipse(pu.x2 + pu.w2/2, 50, 30, 30);
      fill(80); ellipse(pu.x1 + pu.w1/2, 50, 15, 15); ellipse(pu.x2 + pu.w2/2, 50, 15, 15);

      let elevatorPlatforms =[ {x: pu.x1, y: pu.y1, w: pu.w1, h: pu.h1}, {x: pu.x2, y: pu.y2, w: pu.w2, h: pu.h2} ];
      elevatorPlatforms.forEach(el => {
         fill(220, 180, 0); rect(el.x, el.y, el.w, el.h, 4); 
         fill(30); rect(el.x + 5, el.y + 5, el.w - 10, el.h - 10, 2); 
         fill(100); rect(el.x + el.w/2 - 10, el.y - 10, 20, 10, 2); fill(60); ellipse(el.x + el.w/2, el.y - 5, 6, 6);
      });
    });
  }
}

function drawOutofBounds() {
  fill(30, 25, 40);
  rect(-2000, -2000, 2000, levelData.h + 4000); 
  rect(levelData.w, -2000, 2000, levelData.h + 4000); 
  rect(-2000, -2000, levelData.w + 4000, 2000); 
  rect(-2000, levelData.h, levelData.w + 4000, 2000); 
  stroke(20, 15, 25); strokeWeight(10); noFill(); rect(0, 0, levelData.w, levelData.h); noStroke();
}

function drawBullets() {
  bullets.forEach(b => { 
    fill(0, 255, 255); ellipse(b.x, b.y, b.r*2); 
    fill(255); ellipse(b.x, b.y, b.r); 
  });
}

function drawSciFiGun(dir) {
  scale(dir, 1);
  fill(40, 45, 55); rect(0, -6, 35, 12, 4); 
  fill(20, 25, 30); rect(5, 0, 10, 12, 2); 
  fill(0, 255, 255); rect(10, -3, 20, 4, 2); 
  ellipse(35, 0, 6); 
  fill(60, 70, 80); rect(5, -8, 10, 4, 2); 
}

function drawGuns() {
  if (levelData.guns) {
    levelData.guns.forEach(g => {
      if (!g.lifted) { push(); translate(g.x, g.y + g.h/2); drawSciFiGun(1); pop(); }
    });
  }
}

function drawInstructions() {
  fill(0, 150); rect(0, 0, W, H);
  fill(255); textSize(24); textAlign(CENTER, CENTER);
  let lines = levelData.msg.split('\n');
  for(let i=0; i<lines.length; i++) text(lines[i], W/2, H/2 - 40 + i*35);
  fill(0, 255, 150); text("Press ENTER to Begin", W/2, H/2 + 60);
}

function drawTutorialOverlay() {
  if (tutHighlight) {
    push();
    let pulse = sin(frameCount * 0.1) * 50 + 150;
    noFill(); stroke(255, 215, 0, pulse); strokeWeight(4);
    rect(tutHighlight.x - 5, tutHighlight.y - 5, tutHighlight.w + 10, tutHighlight.h + 10, 8);
    pop();
  }
  
  if (tutText) {
    push(); resetMatrix();
    fill(0, 150); rect(0, H - 120, W, 120);
    fill(255, 215, 0); textSize(28); textAlign(CENTER, CENTER);
    let lines = tutText.split('\n');
    for (let i = 0; i < lines.length; i++) {
      text(lines[i], W/2, H - 80 + (i * 35));
    }
    pop();
  }
}

function draw() {
  if (state === 'START') return drawStartScreen();
  if (state === 'WIN') return drawWinScreen();

  checkTutorialLogic();
  updateCamera();
  drawBackgroundFX();

  push();
  translate(W/2, H/2); scale(cam.scale); translate(-cam.x, -cam.y);

  if (screenShake > 0) { translate(random(-screenShake, screenShake), random(-screenShake, screenShake)); screenShake *= 0.85; if (screenShake < 0.5) screenShake = 0; }

  if (levelData.hazards) levelData.hazards.forEach(h => drawLava(h));
  levelData.platforms.forEach(p => { 
    fill(35, 30, 45); rect(p.x, p.y, p.w, p.h, 6); 
    fill(55, 50, 65); rect(p.x, p.y, p.w, 8, 6); 
    fill(20, 15, 25); rect(p.x, p.y + p.h - 8, p.w, 8, 6); 
  });
  
  drawOutofBounds();
  updateMechanics(); drawMechanicsAndHazards(); drawTrapdoor(); drawSwitches(); drawDoor();

  if(boat) { 
    fill(80, 55, 40); rect(boat.x, boat.y, 20, boat.h, 4); rect(boat.x+boat.w-20, boat.y, 20, boat.h, 4);
    rect(boat.x, boat.y + boat.h - 15, boat.w, 15, 4);
    fill(100, 70, 50); rect(boat.x+4, boat.y+4, 12, boat.h-8, 2); rect(boat.x+boat.w-16, boat.y+4, 12, boat.h-8, 2);
    rect(boat.x+20, boat.y+boat.h-11, boat.w-40, 7, 2);
    if(state === 'PLAYING') { boat.vx = constrain(boat.vx, -4.5, 4.5); boat.x = constrain(boat.x + boat.vx, boat.minX, boat.maxX); boat.vx *= Math.pow(0.85, timeScale); }
  }
  
  updateCrates(); updateGuns(); 
  levelData.crates.forEach(c => drawCrate(c)); 
  drawGuns();

  if (state === 'PLAYING' || state === 'INSTRUCTIONS') { 
    updatePlayer(giant); updatePlayer(tiny); updateBullets(); 
  }
  
  drawTrails(giant); drawTrails(tiny); drawPlayer(giant); drawPlayer(tiny); drawThrowTrajectory(); drawBullets();
  
  checkLogic();
  if (state === 'PLAYING') { updateParticles(); updateHazards(); }
  handleCutscenes();
  pop();
  
  drawVignette(); 
  drawMarioIrisCutscene();
  if (state === 'INSTRUCTIONS') drawInstructions();

  // Dynamic Hint & Fail Logic
  if (state === 'PLAYING' && currentLevel === 3) {
    levelTimer += 1 * timeScale;
    let target = levelData.switches[2];
    
    // Hint after 20 seconds
    if (levelTimer > 1200 && target && !target.on) {
      tutText = "HINT: Tiny, pick up the gun and hold 'Q' to aim at the moving target!";
    } else if (tutText.startsWith("HINT:")) {
      tutText = ""; 
    }

    // Elevator Fail State Check
    let pulley = levelData.pulleys[0];
    if (pulley && pulley.progress > 0.2 && giant.y > 850) {
      tutText = "FAIL: Giant missed the elevator!\nMake sure Giant is on the elevator before Tiny cranks the switch.\nPress 'R' to Restart.";
    }
  }

  drawTutorialOverlay();
}

function updateCamera() {
  if (tutCamOverride) {
    cam.x = lerp(cam.x, tutCamTarget.x, 0.06); cam.y = lerp(cam.y, tutCamTarget.y, 0.06); cam.scale = lerp(cam.scale, tutCamTarget.scale, 0.06);
    return;
  }
  if (cutscene === 'trapdoor') {
    camTarget.x = levelData.trapdoor.x + levelData.trapdoor.w/2; camTarget.y = levelData.trapdoor.y + 100; camTarget.scale = 1.8;
  } else if (cutscene === 'vent' && levelData.vents) {
    camTarget.x = levelData.vents[0].x + levelData.vents[0].w/2; camTarget.y = levelData.vents[0].y + levelData.vents[0].h/2; camTarget.scale = 1.2;
  }

  if (cutscene || irisState === 'closing') {
    cam.x = lerp(cam.x, camTarget.x, 0.06); cam.y = lerp(cam.y, camTarget.y, 0.06); cam.scale = lerp(cam.scale, camTarget.scale, 0.06);
  } else {
    let minX = min(tiny.x, giant.x), maxX = max(tiny.x + tiny.w, giant.x + giant.w);
    let minY = min(tiny.y, giant.y), maxY = max(tiny.y + tiny.h, giant.y + giant.h);
    let dx = maxX - minX, dy = maxY - minY;
    
    let targetScale = min(1, W / (dx + 400), H / (dy + 300));
    targetScale = max(0.4, targetScale); 
    
    let viewW = W / targetScale, viewH = H / targetScale;
    camTarget.scale = targetScale;
    
    if (viewW > levelData.w) camTarget.x = levelData.w / 2;
    else camTarget.x = constrain((minX + maxX)/2, viewW/2, levelData.w - viewW/2);
    
    if (viewH > levelData.h) camTarget.y = levelData.h / 2;
    else camTarget.y = constrain((minY + maxY)/2, viewH/2, levelData.h - viewH/2);
    
    cam.x = lerp(cam.x, camTarget.x, 0.08); cam.y = lerp(cam.y, camTarget.y, 0.08); cam.scale = lerp(cam.scale, camTarget.scale, 0.08);
  }
}

function handleCutscenes() {
  if (cutscene === 'trapdoor') {
    cutsceneTimer++; if (cutsceneTimer === 90) { levelData.trapdoor.open = true; screenShake = 8; }
    if (cutsceneTimer > 180) cutscene = null;
  } else if (cutscene === 'vent') {
    cutsceneTimer++; if (cutsceneTimer > 120) cutscene = null;
  }
}

function drawTrapdoor() {
  let td = levelData.trapdoor; if (!td) return;
  if (!td.open) {
    fill(80); rect(td.x, td.y, td.w, td.h); 
    let stripeW = (td.w - 16) / 5; 
    fill(100); rect(td.x, td.y, 8, td.h); 
    for(let i=0; i<5; i++) { fill(i % 2 === 0 ? color(220,180,0) : color(20)); rect(td.x + 8 + i*stripeW, td.y, stripeW, td.h); }
    fill(100); rect(td.x + td.w - 8, td.y, 8, td.h); 
  } else {
    fill(15, 10, 20); rect(td.x, td.y, td.w, td.h); 
    fill(100); rect(td.x, td.y, 8, td.h * 1.5); fill(220,180,0); rect(td.x+8, td.y, 6, td.h * 1.5); fill(20); rect(td.x+14, td.y, 6, td.h * 1.5);
    fill(100); rect(td.x + td.w - 8, td.y, 8, td.h * 1.5); fill(220,180,0); rect(td.x + td.w - 14, td.y, 6, td.h * 1.5); fill(20); rect(td.x + td.w - 20, td.y, 6, td.h * 1.5);
  }
}

function drawLava(h) {
  fill(255, 80, 0); rect(h.x, h.y+8, h.w, h.h-8); 
  
  fill(255, 150, 0);
  beginShape(); vertex(h.x, h.y + h.h);
  for(let x=0; x<=h.w; x+=15) vertex(h.x + x, h.y + 5 + sin((frameCount + h.x + x)*0.08)*5);
  vertex(h.x+h.w, h.y+h.h); endShape(CLOSE);
  fill(255, 200, 0); rect(h.x, h.y+10, h.w, 2); 
}

function drawCrate(c) {
  if (c.type === 'metal') {
    fill(100, 110, 120); rect(c.x, c.y, c.w, c.h, 4); fill(80, 90, 100); rect(c.x+4, c.y+4, c.w-8, c.h-8, 2);
    fill(150); ellipse(c.x+8, c.y+8, 4); ellipse(c.x+c.w-8, c.y+8, 4); ellipse(c.x+8, c.y+c.h-8, 4); ellipse(c.x+c.w-8, c.y+c.h-8, 4);
    strokeWeight(4); stroke(60, 70, 80); line(c.x+6, c.y+c.h/2, c.x+c.w-6, c.y+c.h/2); noStroke();
  } else {
    let r = map(c.burnTimer, 0, 450, 110, 255), g = map(c.burnTimer, 0, 450, 90, 50), b = map(c.burnTimer, 0, 450, 60, 0);
    fill(r, g, b); rect(c.x, c.y, c.w, c.h, 4); fill(r-30, g-30, b-30); rect(c.x+4, c.y+4, c.w-8, c.h-8, 2); fill(r+20, g+20, b+20); rect(c.x+8, c.y+8, c.w-16, c.h-16, 2);
    strokeWeight(3); stroke(r-40, g-40, b-40); line(c.x + 8, c.y + 8, c.x + c.w - 8, c.y + c.h - 8); line(c.x + c.w - 8, c.y + 8, c.x + 8, c.y + c.h - 8); noStroke();
    if (c.burnTimer > 300 && frameCount % 4 === 0) { fill(255, 200, 0); ellipse(c.x + random(c.w), c.y + random(c.h), 4); }
  }
}

function drawSwitches() {
  if (levelData.switches) {
    levelData.switches.forEach(s => {
      if (s.destroyed) return;
      if (s.type === 'heavy') {
        fill(40, 40, 50); rect(s.x - 6, s.y + s.h - 4, s.w + 12, 8, 3);
        fill(s.on ? color(0, 200, 255) : color(100, 100, 120)); rect(s.x, s.on ? s.y + s.h/2 : s.y - 6, s.w, s.on ? s.h/2 : s.h + 6, 2);
      } else if (s.type === 'pressure') {
        fill(60, 60, 70); rect(s.x - 4, s.y + s.h - 4, s.w + 8, 8, 3);
        fill(s.on ? color(0, 200, 100) : color(255, 60, 0)); rect(s.x, s.on ? s.y + s.h/2 : s.y - 4, s.w, s.on ? s.h/2 : s.h + 4, 2);
      } else if (s.type.startsWith('target')) {
        fill(40); rect(s.x, s.y, s.w, s.h, 4);
        fill(s.on ? color(0, 255, 255) : color(255, 50, 50)); ellipse(s.x + s.w/2, s.y + s.h/2, s.w - 4);
        fill(255); ellipse(s.x + s.w/2, s.y + s.h/2, (s.w - 4)/2);
        fill(s.on ? color(0, 255, 255) : color(255, 50, 50)); ellipse(s.x + s.w/2, s.y + s.h/2, (s.w - 4)/4);
      } else {
        fill(45, 45, 55); rect(s.x - 10, s.y + s.h - 8, s.w + 20, 8, 3); fill(15); rect(s.x + s.w/2 - 12, s.y + s.h - 6, 24, 4, 2); 
        
        let progress = s.on ? 1 : (s.crankProgress || 0);
        let leverAngle = map(progress, 0, 1, -PI/3, PI/3);
        
        push(); translate(s.x + s.w/2, s.y + s.h - 4); rotate(leverAngle);
        strokeWeight(6); stroke(s.locked ? 80 : 200); line(0, 0, 0, -20);
        noStroke(); fill(s.locked ? 60 : (s.on ? color(0, 255, 150) : color(255, 50, 50))); ellipse(0, -20, 12); pop();

        if (progress > 0 && progress < 1) {
          fill(0); rect(s.x, s.y - 30, s.w, 6, 2); fill(0, 255, 150); rect(s.x, s.y - 30, s.w * progress, 6, 2);
        }
      }
    });
  }
}

function drawDoor() {
  let d = levelData.door; fill(30, 25, 35); rect(d.x, d.y, d.w, d.h, 6);
  if (doorOpen) {
    fill(0, 255, 150);
    rect(d.x+10, d.y+10, d.w-20, d.h-20, 4);
  } else { fill(70, 30, 30); rect(d.x+10, d.y+10, d.w-20, d.h-20, 4); }
}

function drawPlayer(e) {
  push();
  let isGiant = (e === giant);
  let bounceRate = isGiant ? 0.2 : 0.5;
  let bounceAmt = isGiant ? 0.005 : 0.05; 
  let squeeze = e.onGround && abs(e.vx) > 0.1 ? sin(frameCount * bounceRate) * bounceAmt : 0;
  let breath = sin(frameCount * (isGiant ? 0.03 : 0.05)) * (isGiant ? 0.8 : 2);
  
  translate(e.x + e.w/2, e.y + e.h); 
  scale(constrain(1/e.s, 0.6, 1.5) + squeeze, constrain(e.s, 0.6, 1.5) - squeeze + breath/e.h); 
  
  if (e.inDoor) drawingContext.globalAlpha = 0.5;
  
  stroke(255, 255, 255, 80); strokeWeight(2);
  fill(e.col); rect(-e.w/2, -e.h, e.w, e.h, 8); noStroke();
  
  fill(255); let eyeX = e.face * (e.w * 0.15), eyeY = -e.h * 0.7;
  rect(eyeX - 5, eyeY, 4, 7, 2); rect(eyeX + 5, eyeY, 4, 7, 2);
  fill(0); rect(eyeX - 4 + (e.face>0?1:0), eyeY + 2, 2, 3); rect(eyeX + 6 + (e.face>0?1:0), eyeY + 2, 2, 3);
  
  if (e.lift) { 
    if (e.lift.isGun) {
      push(); translate(e.face * (e.w/2 + 5), -e.h/2); drawSciFiGun(e.face); 
      fill(e.col); ellipse(e.face > 0 ? 5 : -5, 2, 8, 8); ellipse(e.face > 0 ? 20 : -20, 0, 8, 8); pop();
    } else {
      fill(e.col); rect(-e.w/2 - 4, -e.h - 10, 8, 20, 4); rect(e.w/2 - 4, -e.h - 10, 8, 20, 4); 
    }
  }
  pop();
}

function drawThrowTrajectory() {
  let players = [tiny, giant];
  for (let player of players) {
    if (!player.lift || !player.throwCharging) continue;
    if (player.lift.type === 'metal') continue; 
    
    let isGun = player.lift.isGun;
    push();
    stroke(isGun ? color(255, 0, 0, 200) : color(255, 100)); strokeWeight(isGun ? 2 : 4); 
    drawingContext.setLineDash([8, 12]); noFill(); beginShape();
    
    let tx = isGun ? player.x + 9 + (player.face * 49) : player.x + player.w/2;
    let ty = isGun ? player.y + 12 : player.y - player.lift.h/2 - 12;
    let tvx = player.throwVx + player.vx, tvy = player.throwVy;
    
    for(let i = 0; i < 60; i++) { 
      vertex(tx, ty); 
      tvy += GRAVITY; if (tvy > MAX_FALL_SPEED) tvy = MAX_FALL_SPEED; 
      ty += tvy; tx += tvx; 
      if (!isGun) tvx *= 0.95; 
      if (ty > levelData.h + 50 || tx < 0 || tx > levelData.w) break; 
    }
    endShape(); drawingContext.setLineDash([]); pop();
  }
}

function drawTrails(e) {
  if (e.inDoor) return;
  for(let i=0; i<e.history.length; i++) { fill(red(e.col), green(e.col), blue(e.col), (i/e.history.length)*70); rect(e.history[i].x, e.history[i].y, e.w, e.h, 8); }
}

function boxCollide(e, p) {
  if (rectIntersect(e, p)) {
    let dx = (e.x + e.w/2) - (p.x + p.w/2), dy = (e.y + e.h/2) - (p.y + p.h/2);
    let oX = (e.w + p.w)/2 - Math.abs(dx), oY = (e.h + p.h)/2 - Math.abs(dy);
    if (oX < oY) { e.x += (dx > 0) ? oX : -oX; e.vx = 0; }
    else { 
      if (dy > 0) { e.y += oY; e.vy = 0; }
      else { 
        e.y = p.y - e.h; 
        if (e.vy > 5) { 
           if (e === giant) screenShake = 6; else if (e.isCrate || e.isAnvil) screenShake = 4;
           e.s = 0.6; spawnParticles(e.x + e.w/2, e.y + e.h, e.w/8, color(200), 'dust');
        }
        e.vy = 0; e.onGround = true; 
      } 
    }
  }
}

function rectIntersect(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function updateCrates() {
  if (state !== 'PLAYING') return;
  levelData.crates.forEach(c => {
    if (c.onTrapdoor) {
      if (levelData.trapdoor.open) c.onTrapdoor = false; else { c.vx = 0; c.vy = 0; c.y = levelData.trapdoor.y - c.h; return; }
    }
    
    if (c.lifted) { c.x = giant.x + giant.w/2 - c.w/2; c.y = giant.y - c.h - 12; c.vx=0; c.vy=0; }
    else { 
      c.vy += GRAVITY * timeScale; if(c.vy > MAX_FALL_SPEED) c.vy = MAX_FALL_SPEED;
      c.y += c.vy * timeScale; c.x += c.vx * timeScale; c.vx *= Math.pow(0.95, timeScale);
      
      let colliders =[...levelData.platforms];
      if (levelData.breakableWalls) levelData.breakableWalls.forEach(w => { if(!w.broken) colliders.push(w); });
      if (levelData.gates) levelData.gates.forEach(g => colliders.push(g)); 
      colliders.forEach(p => boxCollide(c, p));

      if (rectIntersect(c, giant) && c.vy >= 0 && c.y + c.h <= giant.y + 20) { c.y = giant.y - c.h; c.vy = 0; c.vx *= 0.5; }

      if (levelData.hazards) {
        levelData.hazards.forEach(h => {
          if (h.type === 'lava' && rectIntersect(c, h)) {
            let floatY = h.y - c.h/2 + 5; 
            if (c.y > floatY) { c.y = lerp(c.y, floatY, 0.2); c.vy = 0; }
            c.vx *= 0.8; if(c.type !== 'metal') c.burnTimer++;
            if(frameCount % 5 === 0) spawnParticles(c.x+c.w/2, c.y+c.h, 2, color(255,100,0), 'spark');
          }
        });
      }

      if (c.burnTimer > 450) { 
        c.x = c.startX; c.y = c.startY; c.vx = 0; c.vy = 0; c.burnTimer = 0; screenShake = 3;
        spawnParticles(c.x+c.w/2, c.y+c.h/2, 15, color(200), 'dust');
        if (tiny.onCrate === c) { tiny.onCrate = null; tiny.onGround = false; }
      }
    }
  });
}

function keyPressed() {
  if ([32, 37, 38, 39, 40].includes(keyCode)) {
    return false;
  }
  if (key === 'f' || key === 'F') { 
    let fs = fullscreen(); fullscreen(!fs); 
    pressedF = true;
    return; 
  }
  if (key >= '1' && key <= '4') { let idx = parseInt(key) - 1; if (idx < levels.length) { currentLevel = idx; resetLevel(); return; } }
  
  if (keyCode === ENTER) { 
    if(state === 'START') resetLevel(); 
    if(state === 'INSTRUCTIONS') state = 'PLAYING';
    return; 
  }
  
  if (state !== 'PLAYING') return;
  if (key === 'r' || key === 'R') { resetLevel(); }
  
  if ((key === 'q' || key === 'Q') && cutscene === null) {
    if (!tiny.lift) {
      let nearSwitch = false;
      if (levelData.switches) nearSwitch = levelData.switches.some(s => s.type === 'toggle' && !s.on && rectIntersect(tiny, s));
      if (!nearSwitch) {
        let picked = false;
        if (levelData.guns) {
          levelData.guns.forEach(g => { 
            if (!picked && dist(tiny.x+tiny.w/2, tiny.y+tiny.h/2, g.x+g.w/2, g.y+g.h/2) < 80) { 
              g.lifted = true; tiny.lift = g; tiny.s = 1.2; picked = true;
            } 
          });
        }
      }
    }
  }

  if ((keyCode === 32 || keyCode === 16) && cutscene === null) {
    if (!giant.lift) {
      levelData.crates.forEach(c => { 
        if (!giant.lift && !c.onTrapdoor && dist(giant.x+giant.w/2, giant.y+giant.h/2, c.x+c.w/2, c.y+c.h/2) < 80) { 
          c.lifted = true; giant.lift = c; giant.s = 1.2;
          if (tiny.onGiant) { 
            tiny.onGiant = false; tiny.onCrate = c; tiny.crateOffsetX = tiny.x - c.x;
            tiny.y = c.y - tiny.h; tiny.vy = 0; tiny.onGround = true;
          }
          spawnParticles(c.x+c.w/2, c.y+c.h/2, 5, color(200), 'spark');
        } 
      });
    }
  }
}

function keyReleased() {
  if ((key === 'q' || key === 'Q') && state === 'PLAYING' && cutscene === null) {
    if (tiny.lift && tiny.lift.isGun) {
      if (tiny.throwCharging && tiny.chargeFrames > 8) {
        let spawnX = tiny.x + 9 + (tiny.face * 49);
        let spawnY = tiny.y + 12;
        bullets.push({x: spawnX, y: spawnY, vx: tiny.throwVx + tiny.vx, vy: tiny.throwVy, r: 4});
        screenShake = 4;
      }
      tiny.throwCharging = false; tiny.chargeFrames = 0;
    }
  }

  if ((keyCode === 32 || keyCode === 16) && state === 'PLAYING' && cutscene === null) {
    if (giant.lift) {
      let item = giant.lift; 
      item.lifted = false; 
      if (item.type === 'metal') { 
        item.vx = 0; item.vy = 0;
        item.x = constrain(giant.x + (giant.face * (giant.w/2 + item.w/2 + 5)), 0, levelData.w - item.w);
      } else {
        if (giant.throwCharging) { item.vx = giant.throwVx + giant.vx; item.vy = giant.throwVy; } 
        else {
          if (giant.vx === 0 && !keyIsDown(LEFT_ARROW) && !keyIsDown(RIGHT_ARROW)) { item.vx = 0; item.vy = -16; } 
          else { item.vx = (giant.face * 11) + giant.vx; item.vy = -10; }
        }
      }
      giant.lift = null; giant.throwCharging = false; giant.chargeFrames = 0; screenShake = 3; giant.s = 0.8;
      spawnParticles(giant.x+giant.w/2, giant.y, 10, color(200), 'dust');
    }
  }
}

function drawMarioIrisCutscene() {
  if (irisState === 'opening') {
    irisRadius += 40; drawIrisMask(W/2, H/2, irisRadius); if (irisRadius > max(W,H)*1.5) irisState = 'none';
  } 
  else if (irisState === 'closing') {
    irisRadius = lerp(irisRadius, 0, 0.08);
    let tX = levelData.door.x + levelData.door.w/2, tY = levelData.door.y + levelData.door.h/2;
    let screenX = W/2 + (tX - cam.x) * cam.scale, screenY = H/2 + (tY - cam.y) * cam.scale;
    drawIrisMask(screenX, screenY, irisRadius);

    if (irisRadius < 5 && cutsceneTimer++ > 50) {
      if (currentLevel < levels.length - 1) { currentLevel++; resetLevel(); } else { win = true; state = 'WIN'; }
    }
  }
}

function drawIrisMask(x, y, radius) {
  fill(0); beginShape(); vertex(0, 0); vertex(W, 0); vertex(W, H); vertex(0, H); beginContour(); 
  for (let a = TWO_PI; a > 0; a -= 0.1) vertex(x + cos(a) * radius, y + sin(a) * radius);
  endContour(); endShape(CLOSE);
}

function spawnParticles(x, y, count, c, type) {
  for(let i=0; i<count; i++) particles.push({ x: x+random(-10,10), y: y+random(-5,5), vx: random(-2, 2), vy: random(-1, -3), l: 1.0, col: c, type: type });
}

function updateParticles() {
  for(let i=particles.length-1; i>=0; i--) {
    let p = particles[i]; p.x += p.vx * timeScale; p.y += p.vy * timeScale;
    if (p.type === 'wind') {
      p.vy -= 0.3 * timeScale; p.y += p.vy * timeScale; p.x += random(-1, 1) * timeScale; p.l -= 0.015 * timeScale; fill(200, 255, 255, p.l*200); rect(p.x, p.y, 2, 15);
    }
    else if (p.type === 'dust') { p.l -= 0.04 * timeScale; p.vy *= Math.pow(0.9, timeScale); p.vx *= Math.pow(0.9, timeScale); fill(red(p.col), green(p.col), blue(p.col), p.l*255); ellipse(p.x, p.y, p.l*10); } 
    else { 
      p.vy += GRAVITY * 0.4 * timeScale; p.l -= 0.03 * timeScale; 
      fill(red(p.col), green(p.col), blue(p.col), p.l*255); rect(p.x, p.y, 4, 4); 
    }
    if(p.l <= 0) particles.splice(i,1);
  }
}

function drawBackgroundFX() {
  // Safe Gradient Drawing
  for(let y = 0; y < H; y += 20) {
    let c = lerpColor(color(10, 5, 16), color(37, 15, 26), y / H);
    fill(c); noStroke(); rect(0, y, W, 20);
  }
  
  fill(12, 8, 16); bgPillars.forEach(p => rect(p.x - cam.x*0.1, 0, p.w, levelData ? max(H, levelData.h) : H));
  
  if (state === 'PLAYING' || state === 'START' || state === 'INSTRUCTIONS') {
    embers.forEach(e => { e.x += e.vx * timeScale; e.y += e.vy * timeScale; fill(255, 100, 0, e.alpha); ellipse(e.x, e.y, e.s); if(e.y < 0) e.reset(); });
  }
}

function drawVignette() {
  push();
  resetMatrix();
  let grad = drawingContext.createRadialGradient(W/2, H/2, H*0.4, W/2, H/2, W*0.7);
  grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.6)');
  drawingContext.fillStyle = grad;
  drawingContext.fillRect(0, 0, W, H);
  pop();
}

class Ember {
  constructor(rY) { this.reset(); if(rY) this.y = random(levelData ? levelData.h : H); }
  reset() { this.x = random(-200, 2000); this.y = (levelData ? levelData.h : H) + 10; this.s = random(2,5); this.vx = random(-1,1); this.vy = random(-1, -4); this.alpha = random(100, 255); }
}

function drawStartScreen() {
  drawBackgroundFX(); textAlign(CENTER, CENTER); 
  fill(255, 200, 0); textSize(70); text("TINY & GIANT", W/2, H/3 - 20);
  fill(255, 80, 0); textSize(40); text("VOLCANO ESCAPE", W/2, H/3 + 40);
  fill(0, 255, 150, 150 + sin(frameCount*0.1)*100); textSize(24); text("Press ENTER to Begin", W/2, H*0.7);
}

function drawWinScreen() {
  drawBackgroundFX(); textAlign(CENTER, CENTER); 
  fill(0, 255, 150); textSize(60); text("ESCAPE SUCCESSFUL", W/2, H/2 - 20);
  fill(200); textSize(24); text("Thanks for playing!", W/2, H/2 + 40);
}
