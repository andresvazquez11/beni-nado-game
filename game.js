(function () {
  'use strict';

  // ---------- Estado global ----------
  const LANES = 3;
  const CANVAS_W = 360;
  const CANVAS_H = 640;
  const LANE_X = [CANVAS_W * 0.25, CANVAS_W * 0.5, CANVAS_W * 0.75];
  const LANE_Y = [CANVAS_H * 0.3, CANVAS_H * 0.5, CANVAS_H * 0.7];
  const SWIMMER_Y = CANVAS_H * 0.72; // Nivel 1: posición fija vertical del nadador
  const SWIMMER_X = CANVAS_W * 0.22; // Nivel 2: posición fija horizontal del nadador
  const POOL_TO_OCEAN_DISTANCE = 150; // metros
  const POPUP_DURATION = 0.9;

  let canvas, ctx, dpr = 1, scale = 1;
  let state = 'menu'; // menu | countdown | playing | gameover
  let levelMode = 1; // 1 = vertical (carrera infinita) | 2 = horizontal (circo)
  let player = { name: '', skin: SKINS[0] };

  let lane = 1, lanePos = LANE_X[1], laneTargetPos = LANE_X[1];
  let distance = 0, carlitos = 0, amigos = 0, hearts = 3, invulnTimer = 0;
  let speed = 90; // px/seg lógicos avanzando "hacia delante" (representado como velocidad de scroll)
  let strokePhase = 0;
  let activePowerup = null, powerupTimer = 0;
  let entities = []; // {type, lane, pos, ...} - pos = coordenada en el eje de scroll
  let popups = []; // {x, y, name, age} - texto flotante al recoger una cara
  let collected = {}; // nombre -> veces recogido, para el resumen final
  let spawnTimer = 0, spawnInterval = 1.1;
  let lastTs = 0;
  let envMix = 0; // 0 = piscina, 1 = mar abierto

  // ---------- Setup canvas ----------
  function setupCanvas() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  // ---------- Skins picker ----------
  function buildSkinPicker() {
    const el = document.getElementById('skin-picker');
    el.innerHTML = '';
    SKINS.slice(0, 5).forEach((skin, i) => {
      const sw = document.createElement('div');
      sw.className = 'skin-swatch' + (i === 0 ? ' selected' : '');
      sw.style.background = skin.cap;
      sw.dataset.id = skin.id;
      sw.addEventListener('click', () => {
        document.querySelectorAll('.skin-swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
        player.skin = skin;
      });
      el.appendChild(sw);
    });
    player.skin = SKINS[0];
  }

  // ---------- Pantallas ----------
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  function sanitizeName(raw) {
    const trimmed = (raw || '').trim().slice(0, 12);
    return trimmed.replace(/[<>"'&]/g, '') || 'Nadador';
  }

  // ---------- Input ----------
  function setupInput() {
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');

    const pressLeft = (e) => { e.preventDefault(); changeLane(-1); };
    const pressRight = (e) => { e.preventDefault(); changeLane(1); };

    btnLeft.addEventListener('touchstart', pressLeft, { passive: false });
    btnRight.addEventListener('touchstart', pressRight, { passive: false });
    btnLeft.addEventListener('click', () => changeLane(-1));
    btnRight.addEventListener('click', () => changeLane(1));

    window.addEventListener('keydown', (e) => {
      if (state !== 'playing') return;
      if (levelMode === 2) {
        if (e.key === 'ArrowUp') changeLane(-1);
        if (e.key === 'ArrowDown') changeLane(1);
      } else {
        if (e.key === 'ArrowLeft') changeLane(-1);
        if (e.key === 'ArrowRight') changeLane(1);
      }
    });
  }

  function updateLaneButtons() {
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    if (levelMode === 2) {
      btnLeft.textContent = '▲';
      btnRight.textContent = '▼';
    } else {
      btnLeft.textContent = '◀';
      btnRight.textContent = '▶';
    }
  }

  function changeLane(dir) {
    if (state !== 'playing') return;
    lane = Math.max(0, Math.min(LANES - 1, lane + dir));
    laneTargetPos = (levelMode === 2 ? LANE_Y : LANE_X)[lane];
  }

  // ---------- Spawner ----------
  function spawnStartPos() {
    return levelMode === 2 ? CANVAS_W + 30 : -30;
  }

  function spawnEntity() {
    const r = Math.random();
    const spawnLane = Math.floor(Math.random() * LANES);
    if (r < 0.5) {
      entities.push({ type: 'obstacle', kind: pickObstacleKind(), lane: spawnLane, pos: spawnStartPos(), hit: false });
      // "Esquiva dos veces": de vez en cuando, un segundo obstáculo en otro carril (estilo Circus Charlie).
      if (levelMode === 2 && Math.random() < 0.25) {
        const otherLane = (spawnLane + 1 + Math.floor(Math.random() * (LANES - 1))) % LANES;
        entities.push({ type: 'obstacle', kind: pickObstacleKind(), lane: otherLane, pos: spawnStartPos() - 60, hit: false });
      }
    } else if (r < 0.85) {
      // Carlos es el coleccionable principal (más frecuente); el resto son amigos (variedad).
      const isCarlos = Math.random() < 0.5;
      entities.push({
        type: 'coin',
        face: isCarlos ? 'carlos' : Math.floor(Math.random() * FRIEND_COUNT),
        lane: spawnLane,
        pos: spawnStartPos(),
        hit: false,
      });
    } else {
      entities.push({ type: 'powerup', kind: Math.random() < 0.5 ? 'boost' : 'shield', lane: spawnLane, pos: spawnStartPos(), hit: false });
    }
  }

  function pickObstacleKind() {
    if (envMix < 0.5) {
      return Math.random() < 0.5 ? 'buoy' : 'rival';
    }
    const kinds = ['jellyfish', 'boat', 'buoy'];
    return kinds[Math.floor(Math.random() * kinds.length)];
  }

  // ---------- Ciclo de partida ----------
  function startGame(chosenLevel) {
    levelMode = chosenLevel || levelMode;
    player.name = sanitizeName(document.getElementById('player-name').value);
    localStorage.setItem('beni_name', player.name);
    localStorage.setItem('beni_skin', player.skin.id);

    lane = 1;
    laneTargetPos = (levelMode === 2 ? LANE_Y : LANE_X)[1];
    lanePos = laneTargetPos;
    distance = 0; carlitos = 0; amigos = 0; hearts = 3; invulnTimer = 0;
    speed = 90; strokePhase = 0;
    activePowerup = null; powerupTimer = 0;
    entities = []; popups = []; collected = {}; spawnTimer = 0; spawnInterval = 1.1;
    envMix = 0;

    updateLaneButtons();
    updateHUD();
    showScreen('screen-game');
    runCountdown();
  }

  function runCountdown() {
    state = 'countdown';
    const el = document.getElementById('countdown');
    el.classList.add('active');
    let n = 3;
    el.textContent = n;
    const iv = setInterval(() => {
      n--;
      if (n > 0) { el.textContent = n; }
      else if (n === 0) { el.textContent = '¡YA!'; }
      else {
        clearInterval(iv);
        el.classList.remove('active');
        state = 'playing';
        lastTs = performance.now();
        requestAnimationFrame(loop);
      }
    }, 700);
  }

  function endGame() {
    state = 'gameover';
    const score = carlitos + amigos;
    const bestKey = 'beni_best_' + player.name + '_' + levelMode;
    const best = parseFloat(localStorage.getItem(bestKey) || '0');
    const isRecord = score > best;
    if (isRecord) localStorage.setItem(bestKey, score.toFixed(0));

    document.getElementById('end-distance').textContent = carlitos + ' CARLITOS · ' + amigos + ' AMIGOS';
    document.getElementById('end-record').textContent =
      (isRecord ? 'Nuevo récord personal 🎉 · ' : ('Tu mejor marca: ' + Math.max(best, score) + ' puntos · ')) +
      Math.round(distance) + 'm recorridos';

    const namesList = Object.keys(collected)
      .map(name => name + (collected[name] > 1 ? ' x' + collected[name] : ''))
      .join(', ');
    document.getElementById('end-collected').textContent = namesList ? 'Atrapaste a: ' + namesList : '';
    document.getElementById('end-leaderboard-label').textContent = '🏆 Récords — Nivel ' + levelMode;

    Leaderboard.submitScore(player.name, carlitos, amigos, Math.round(distance), player.skin.id, levelMode)
      .then(renderLeaderboardEnd)
      .catch(() => renderLeaderboardEnd());

    showScreen('screen-end');
  }

  function renderLeaderboardEnd() {
    Leaderboard.getTop(10, levelMode).then(rows => renderLeaderboardList('leaderboard-list', rows));
  }

  function renderLeaderboardList(elId, rows) {
    const list = document.getElementById(elId);
    list.innerHTML = '';
    rows.forEach(r => {
      const li = document.createElement('li');
      const nameSpan = document.createElement('span');
      nameSpan.textContent = String(r.name || 'Nadador').slice(0, 12);
      const distSpan = document.createElement('span');
      distSpan.textContent = (Number(r.carlitos) || 0) + ' C · ' + (Number(r.amigos) || 0) + ' A';
      li.appendChild(nameSpan);
      li.appendChild(distSpan);
      if (r.name === player.name) li.classList.add('you');
      list.appendChild(li);
    });
    if (rows.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Sin récords todavía — ¡sé el primero!';
      list.appendChild(li);
    }
  }

  // ---------- HUD ----------
  function updateHUD() {
    document.getElementById('hud-distance').textContent = Math.round(distance) + 'm';
    document.getElementById('hud-carlitos').textContent = '🧒 ' + carlitos;
    document.getElementById('hud-amigos').textContent = '👫 ' + amigos;
    document.getElementById('hud-hearts').textContent = '♥ '.repeat(hearts) + '♡ '.repeat(3 - hearts);
    const pu = document.getElementById('hud-powerup');
    if (activePowerup) {
      pu.classList.add('active');
      pu.textContent = activePowerup === 'boost' ? '⚡ IMPULSO' : '🛡 ESCUDO';
    } else {
      pu.classList.remove('active');
    }
  }

  // ---------- Bucle principal ----------
  function loop(ts) {
    if (state !== 'playing') return;
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    update(dt);
    render();

    requestAnimationFrame(loop);
  }

  function update(dt) {
    // dificultad creciente
    speed = 90 + distance * 0.35;
    spawnInterval = Math.max(0.45, 1.1 - distance * 0.003);

    const speedMult = activePowerup === 'boost' ? 1.8 : 1;
    distance += (speed * speedMult * dt) / 20;
    envMix = Math.min(1, distance / POOL_TO_OCEAN_DISTANCE);

    strokePhase += dt * 2.2 * speedMult;
    lanePos += (laneTargetPos - lanePos) * Math.min(1, dt * 12);

    if (invulnTimer > 0) invulnTimer -= dt;
    if (activePowerup) {
      powerupTimer -= dt;
      if (powerupTimer <= 0) activePowerup = null;
    }

    spawnTimer += dt;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnEntity();
    }

    const moveDelta = (speed * speedMult) * dt;
    if (levelMode === 2) {
      entities.forEach(e => { e.pos -= moveDelta; });
      entities = entities.filter(e => e.pos > -40);
    } else {
      entities.forEach(e => { e.pos += moveDelta; });
      entities = entities.filter(e => e.pos < CANVAS_H + 40);
    }

    popups.forEach(p => { p.age += dt / POPUP_DURATION; });
    popups = popups.filter(p => p.age < 1);

    checkCollisions();

    if (hearts <= 0) endGame();

    updateHUD();
  }

  function checkCollisions() {
    const fixedPos = levelMode === 2 ? SWIMMER_X : SWIMMER_Y;
    entities.forEach(e => {
      if (e.hit) return;
      if (e.lane !== lane) return;
      if (Math.abs(e.pos - fixedPos) > 22) return;

      const popupPos = entityScreenPos(e);

      if (e.type === 'coin') {
        e.hit = true;
        const name = e.face === 'carlos' ? 'Carlos' : FRIEND_NAMES[e.face];
        if (e.face === 'carlos') carlitos++; else amigos++;
        collected[name] = (collected[name] || 0) + 1;
        popups.push({ x: popupPos.x, y: popupPos.y - 20, name, age: 0 });
        entities = entities.filter(x => x !== e);
      } else if (e.type === 'powerup') {
        e.hit = true;
        activePowerup = e.kind;
        powerupTimer = e.kind === 'boost' ? 5 : 8;
        if (e.kind === 'shield') activePowerup = 'shield';
        entities = entities.filter(x => x !== e);
      } else if (e.type === 'obstacle') {
        if (invulnTimer > 0) return;
        if (activePowerup === 'shield') {
          activePowerup = null;
          e.hit = true;
          entities = entities.filter(x => x !== e);
          return;
        }
        hearts--;
        invulnTimer = 1.2;
        e.hit = true;
        entities = entities.filter(x => x !== e);
      }
    });
  }

  // ---------- Render ----------
  function entityScreenPos(e) {
    if (levelMode === 2) return { x: e.pos, y: LANE_Y[e.lane] };
    return { x: LANE_X[e.lane], y: e.pos };
  }

  function render() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawBackground();
    drawLanes();
    entities.forEach(drawEntity);
    if (levelMode === 2) {
      drawSwimmerHoriz(ctx, SWIMMER_X, lanePos, player.skin, strokePhase, invulnTimer > 0);
    } else {
      drawSwimmer(ctx, lanePos, SWIMMER_Y, player.skin, strokePhase, invulnTimer > 0);
    }
    popups.forEach(p => drawNamePopup(ctx, p.x, p.y, p.name, p.age));
  }

  function drawBackground() {
    const poolColor = '#0ea5e9';
    const oceanColor = '#0066cc';
    ctx.fillStyle = lerpColor(poolColor, oceanColor, envMix);
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  function drawLanes() {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 - envMix * 0.5) + ')';
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    const dashOffset = (distance * 8) % 24;
    if (levelMode === 2) {
      ctx.lineDashOffset = dashOffset;
      const midY1 = (LANE_Y[0] + LANE_Y[1]) / 2;
      const midY2 = (LANE_Y[1] + LANE_Y[2]) / 2;
      [midY1, midY2].forEach(y => {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_W, y);
        ctx.stroke();
      });
    } else {
      ctx.lineDashOffset = -dashOffset;
      [73, 147].map(x => x / 220 * CANVAS_W).forEach(x => {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_H);
        ctx.stroke();
      });
    }
    ctx.restore();
  }

  function drawEntity(e) {
    const { x, y } = entityScreenPos(e);
    if (e.type === 'coin') {
      if (e.face === 'carlos') drawCarlosFace(ctx, x, y, distance + e.lane);
      else drawFriendFace(ctx, x, y, e.face, distance + e.lane);
    }
    else if (e.type === 'powerup') drawPowerup(ctx, x, y, e.kind);
    else if (e.type === 'obstacle') {
      if (e.kind === 'buoy') drawObstacleBuoy(ctx, x, y);
      else if (e.kind === 'rival') {
        if (levelMode === 2) drawObstacleRivalHoriz(ctx, x, y, strokePhase + e.lane);
        else drawObstacleRival(ctx, x, y, strokePhase + e.lane);
      }
      else if (e.kind === 'jellyfish') drawObstacleJellyfish(ctx, x, y);
      else if (e.kind === 'boat') drawObstacleBoat(ctx, x, y);
    }
  }

  function lerpColor(a, b, t) {
    const pa = hexToRgb(a), pb = hexToRgb(b);
    const r = Math.round(pa.r + (pb.r - pa.r) * t);
    const g = Math.round(pa.g + (pb.g - pa.g) * t);
    const bl = Math.round(pa.b + (pb.b - pa.b) * t);
    return `rgb(${r},${g},${bl})`;
  }
  function hexToRgb(hex) {
    const v = parseInt(hex.slice(1), 16);
    return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
  }

  // ---------- Records (pantalla aparte) ----------
  let recordsLevel = 1;
  function loadRecords(level) {
    recordsLevel = level;
    document.querySelectorAll('.level-tab').forEach(t => t.classList.toggle('active', Number(t.dataset.level) === level));
    Leaderboard.getTop(20, level).then(rows => renderLeaderboardList('leaderboard-list-2', rows));
  }

  // ---------- Init ----------
  function init() {
    setupCanvas();
    setupInput();
    buildSkinPicker();

    const savedName = localStorage.getItem('beni_name');
    if (savedName) document.getElementById('player-name').value = savedName;
    const savedSkinId = localStorage.getItem('beni_skin');
    if (savedSkinId) {
      const idx = SKINS.findIndex(s => s.id === savedSkinId);
      if (idx >= 0) {
        document.querySelectorAll('.skin-swatch').forEach((s, i) => s.classList.toggle('selected', i === idx));
        player.skin = SKINS[idx];
      }
    }

    document.getElementById('btn-play').addEventListener('click', () => {
      player.name = sanitizeName(document.getElementById('player-name').value);
      showScreen('screen-levels');
    });
    document.getElementById('btn-levels-back').addEventListener('click', () => showScreen('screen-menu'));
    document.querySelectorAll('.level-card').forEach(card => {
      card.addEventListener('click', () => startGame(Number(card.dataset.level)));
    });

    document.getElementById('btn-retry').addEventListener('click', () => startGame(levelMode));
    document.getElementById('btn-menu').addEventListener('click', () => showScreen('screen-menu'));
    document.getElementById('btn-leaderboard').addEventListener('click', () => {
      loadRecords(1);
      showScreen('screen-records');
    });
    document.querySelectorAll('.level-tab').forEach(tab => {
      tab.addEventListener('click', () => loadRecords(Number(tab.dataset.level)));
    });
    document.getElementById('btn-records-back').addEventListener('click', () => showScreen('screen-menu'));

    showScreen('screen-menu');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
