// Dibujo 100% por código (canvas), sin imágenes externas ni coste de generación IA.
// Proporciones "caricatura/avatar": cabeza grande, sonrisa, mofletes, gorro y gafas de color.

const SKINS = [
  { id: 'cna',   cap: '#0066cc', suit: '#FBBF24', name: 'CNA' },
  { id: 'red',   cap: '#ef4444', suit: '#0f172a', name: 'Rojo' },
  { id: 'green', cap: '#22c55e', suit: '#0f172a', name: 'Verde' },
  { id: 'purple',cap: '#a855f7', suit: '#0f172a', name: 'Morado' },
  { id: 'orange',cap: '#f97316', suit: '#0f172a', name: 'Naranja' },
  { id: 'cyan',  cap: '#06b6d4', suit: '#0f172a', name: 'Cian' },
];

// strokePhase: 0..1 ciclo de brazada (anima brazo adelante/atrás)
function drawSwimmer(ctx, x, y, skin, strokePhase, invulnerable) {
  const cap = skin.cap;
  const suit = skin.suit;
  const skinTone = '#ffcfa3';
  const armSwing = Math.sin(strokePhase * Math.PI * 2);

  ctx.save();
  ctx.translate(x, y);
  if (invulnerable) ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 60);

  // estela de salpicaduras
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath(); ctx.arc(-6 + armSwing * 2, 26, 3, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(6 - armSwing * 2, 30, 2.4, 0, 7); ctx.fill();

  // brazo trasero
  ctx.fillStyle = skinTone;
  ctx.save();
  ctx.translate(8, 12);
  ctx.rotate(0.4 - armSwing * 0.5);
  ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 9, 0, 0, 7); ctx.fill();
  ctx.restore();

  // piernas / aleteo
  ctx.fillStyle = suit;
  ctx.save();
  ctx.translate(-5, 28);
  ctx.rotate(-0.25 + armSwing * 0.3);
  ctx.beginPath(); ctx.ellipse(0, 0, 3.6, 7, 0, 0, 7); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(5, 29);
  ctx.rotate(0.25 - armSwing * 0.3);
  ctx.beginPath(); ctx.ellipse(0, 0, 3.6, 7, 0, 0, 7); ctx.fill();
  ctx.restore();

  // torso
  ctx.fillStyle = suit === '#0f172a' ? cap : suit;
  ctx.beginPath(); ctx.ellipse(0, 12, 10, 13, 0, 0, 7); ctx.fill();
  ctx.fillStyle = suit;
  ctx.beginPath(); ctx.ellipse(0, 18, 10, 8, 0, 0, 7); ctx.fill();

  // brazo delantero (el que se extiende)
  ctx.fillStyle = skinTone;
  ctx.save();
  ctx.translate(-12, -2);
  ctx.rotate(-0.3 - armSwing * 0.6);
  ctx.beginPath(); ctx.ellipse(0, 0, 4.8, 10, 0, 0, 7); ctx.fill();
  ctx.restore();

  // cabeza
  ctx.fillStyle = skinTone;
  ctx.beginPath(); ctx.arc(0, -11, 12.5, 0, 7); ctx.fill();

  // gorro
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.arc(0, -12.5, 12.5, Math.PI, 0);
  ctx.closePath();
  ctx.fill();

  // gafas
  ctx.fillStyle = '#1e293b';
  ctx.beginPath(); ctx.ellipse(-4.2, -11, 3.4, 3.8, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4.2, -11, 3.4, 3.8, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#bfe9ff';
  ctx.beginPath(); ctx.ellipse(-4.2, -12, 1.2, 1.4, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4.2, -12, 1.2, 1.4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-2.2, -12, 4.4, 1.4);

  // mofletes
  ctx.fillStyle = 'rgba(253,164,175,0.55)';
  ctx.beginPath(); ctx.arc(-7, -5, 2.2, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(7, -5, 2.2, 0, 7); ctx.fill();

  // sonrisa
  ctx.strokeStyle = '#7c2d12';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, -6, 4.5, 0.2, Math.PI - 0.2); ctx.stroke();

  ctx.restore();
}

function drawObstacleBuoy(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#ef4444';
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(-11, -3, 22, 6);
  ctx.restore();
}

function drawObstacleRival(ctx, x, y, strokePhase) {
  drawSwimmer(ctx, x, y, SKINS[4], strokePhase, false);
}

function drawObstacleJellyfish(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#f9a8d4';
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 9, 0, Math.PI, 0); ctx.fill();
  for (let i = -2; i <= 2; i++) {
    ctx.strokeStyle = '#f9a8d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(i * 4, 2);
    ctx.lineTo(i * 4, 14 + Math.abs(i) * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawObstacleBoat(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(-20, -8); ctx.lineTo(20, -8); ctx.lineTo(13, 10); ctx.lineTo(-13, 10);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawCoin(ctx, x, y, t) {
  const squash = 0.6 + 0.4 * Math.abs(Math.cos(t));
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#FBBF24';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 0, 8 * squash, 8, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawPowerup(ctx, x, y, type) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = type === 'boost' ? '#22c55e' : '#0ea5e9';
  ctx.beginPath(); ctx.arc(0, 0, 12, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(type === 'boost' ? '⚡' : '🛡', 0, 1);
  ctx.restore();
}
