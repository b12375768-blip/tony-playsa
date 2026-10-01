/* PC Games vs PlayStation - mini game
   A small platformer written for this site. No dependencies, no network calls.
   Scores stay in this browser's localStorage. */

(function () {
  'use strict';

  var canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var SCORE_KEY = 'pgp_highscore';
  var BOARD_KEY = 'pgp_leaderboard';

  var el = {
    score: document.getElementById('score'),
    coins: document.getElementById('coins'),
    high: document.getElementById('highScore'),
    start: document.getElementById('startBtn'),
    reset: document.getElementById('resetBtn'),
    live: document.getElementById('gameLive')
  };

  var running = false;
  var paused = false;
  var rafId = 0;
  var score = 0;
  var coins = 0;
  var highScore = 0;
  var stars = [];

  try { highScore = parseInt(localStorage.getItem(SCORE_KEY) || '0', 10) || 0; } catch (e) { highScore = 0; }
  el.high.textContent = highScore;

  /* ---------- Canvas sizing ---------- */

  function resizeCanvas() {
    var parent = canvas.parentElement;
    var w = parent ? parent.clientWidth : 800;
    w = Math.max(320, w);
    canvas.width = w;
    canvas.height = Math.min(Math.round(w * 0.6), 460);
    buildStars();
    draw();
  }

  function buildStars() {
    stars = [];
    for (var i = 0; i < 60; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.55,
        r: Math.random() * 1.6 + 0.4
      });
    }
  }

  /* ---------- World ---------- */

  var platforms = [];
  var tokens = [];
  var obstacles = [];

  var player = {
    x: 0, y: 0, width: 34, height: 52,
    speed: 5, jumpPower: 12.5,
    isJumping: false, velocityY: 0, gravity: 0.55
  };

  function initWorld() {
    platforms = [];
    tokens = [];
    obstacles = [];

    var baseY = canvas.height - 46;
    for (var i = 0; i < 9; i++) {
      platforms.push({
        x: Math.random() * Math.max(1, canvas.width - 190),
        y: baseY - i * 96,
        width: 150 + Math.random() * 110,
        height: 18
      });
    }

    for (var t = 0; t < 18; t++) {
      tokens.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.55,
        r: 11,
        collected: false
      });
    }

    for (var o = 0; o < 7; o++) {
      obstacles.push({
        x: Math.random() * canvas.width,
        y: -40 - Math.random() * canvas.height,
        width: 28,
        height: 26,
        speed: 2 + Math.random() * 2.6
      });
    }

    player.x = canvas.width / 2;
    player.y = canvas.height - 60;
    player.isJumping = false;
    player.velocityY = 0;

    score = 0;
    coins = 0;
    el.score.textContent = score;
    el.coins.textContent = coins;
  }

  /* ---------- Drawing ---------- */

  function drawBackground() {
    var g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#123a6b');
    g.addColorStop(1, '#0b1524');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (var i = 0; i < stars.length; i++) {
      ctx.beginPath();
      ctx.arc(stars[i].x, stars[i].y, stars[i].r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlatforms() {
    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      ctx.fillStyle = '#1f9d63';
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.fillStyle = '#14784b';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + 9, p.y + 9);
      ctx.lineTo(p.x + 9, p.y + p.height + 9);
      ctx.lineTo(p.x, p.y + p.height);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawTokens() {
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (t.collected) continue;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(t.x - t.r * 0.3, t.y - t.r * 0.3, t.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawObstacles() {
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(o.x, o.y, o.width, o.height);
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.moveTo(o.x, o.y);
      ctx.lineTo(o.x + o.width / 2, o.y - o.height / 2);
      ctx.lineTo(o.x + o.width, o.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawPlayer() {
    ctx.fillStyle = '#0a72d4';
    ctx.fillRect(player.x - player.width / 2, player.y - player.height, player.width, player.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(player.x - player.width / 4, player.y - player.height + 11, 7, 7);
    ctx.fillRect(player.x + player.width / 4 - 7, player.y - player.height + 11, 7, 7);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x - player.width / 4, player.y - 20);
    ctx.lineTo(player.x + player.width / 4, player.y - 20);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function drawOver(state) {
    ctx.fillStyle = 'rgba(4, 8, 14, .72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px Inter, system-ui, sans-serif';

    var title = 'Game over';
    if (state === 'paused') title = 'Paused';
    if (state === 'idle') title = 'Runner demo';
    ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 34);

    ctx.font = '18px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#cbd8e6';
    ctx.fillText('Score ' + score + '   |   Tokens ' + coins, canvas.width / 2, canvas.height / 2 + 6);
    ctx.fillStyle = '#8fa3b8';
    ctx.font = '15px Inter, system-ui, sans-serif';
    ctx.fillText(state === 'idle'
      ? 'Press "Start demo" to play'
      : 'Best this session: ' + highScore, canvas.width / 2, canvas.height / 2 + 38);
    ctx.textAlign = 'start';
  }

  function draw(state) {
    drawBackground();
    drawPlatforms();
    drawTokens();
    drawObstacles();
    drawPlayer();
    if (state) drawOver(state);
  }

  /* ---------- Logic ---------- */

  function updatePlayer() {
    player.velocityY += player.gravity;
    player.y += player.velocityY;

    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      if (
        player.x + player.width / 2 > p.x &&
        player.x - player.width / 2 < p.x + p.width &&
        player.y + 4 > p.y &&
        player.y < p.y + p.height &&
        player.velocityY > 0
      ) {
        player.y = p.y;
        player.velocityY = 0;
        player.isJumping = false;
      }
    }

    if (player.y > canvas.height - 18) {
      player.y = canvas.height - 18;
      player.velocityY = 0;
      player.isJumping = false;
    }

    if (player.x - player.width / 2 < 0) player.x = player.width / 2;
    if (player.x + player.width / 2 > canvas.width) player.x = canvas.width - player.width / 2;
  }

  function collectTokens() {
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (t.collected) continue;
      if (
        player.x + player.width / 2 > t.x - t.r &&
        player.x - player.width / 2 < t.x + t.r &&
        player.y - player.height < t.y + t.r &&
        player.y > t.y - t.r
      ) {
        t.collected = true;
        coins += 1;
        score += 100;
        el.coins.textContent = coins;
        el.score.textContent = score;
      }
    }
  }

  function updateObstacles() {
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      o.y += o.speed;
      if (o.y > canvas.height) {
        o.y = -60;
        o.x = Math.random() * canvas.width;
      }
      if (
        player.x + player.width / 2 > o.x &&
        player.x - player.width / 2 < o.x + o.width &&
        player.y - player.height < o.y + o.height &&
        player.y > o.y
      ) {
        gameOver();
        return;
      }
    }
  }

  function saveRun() {
    if (score > highScore) {
      highScore = score;
      try { localStorage.setItem(SCORE_KEY, String(highScore)); } catch (e) { /* storage blocked */ }
      el.high.textContent = highScore;
    }
    if (score <= 0) return;
    try {
      var board = JSON.parse(localStorage.getItem(BOARD_KEY) || '[]');
      if (!Array.isArray(board)) board = [];
      board.push({ score: score, coins: coins, at: Date.now() });
      board.sort(function (a, b) { return b.score - a.score; });
      board = board.slice(0, 25);
      localStorage.setItem(BOARD_KEY, JSON.stringify(board));
    } catch (e) { /* storage blocked */ }
  }

  function gameOver() {
    running = false;
    paused = false;
    saveRun();
    draw('over');
    if (el.live) el.live.textContent = 'Game over. Score ' + score + ', tokens ' + coins + '. Press "Start demo" to play again.';
    if (el.start) el.start.textContent = 'Play again';
  }

  function loop() {
    if (!running || paused) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updatePlayer();
    collectTokens();
    updateObstacles();
    if (!running) return;
    score += 1;
    el.score.textContent = score;
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function start() {
    stopLoop();
    initWorld();
    running = true;
    paused = false;
    if (el.start) el.start.textContent = 'Restart';
    if (el.live) el.live.textContent = 'Demo running. Collect tokens and avoid the red obstacles.';
    loop();
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    if (paused) {
      draw('paused');
      if (el.live) el.live.textContent = 'Paused. Press P to continue.';
    } else {
      if (el.live) el.live.textContent = 'Demo running.';
      stopLoop();
      loop();
    }
  }

  /* ---------- Input ---------- */

  var keys = {};
  var HELD = { up: false, down: false, left: false, right: false };

  function syncHeld() {
    HELD.up = !!(keys.ArrowUp || keys.w || keys.W);
    HELD.down = !!(keys.ArrowDown || keys.s || keys.S);
    HELD.left = !!(keys.ArrowLeft || keys.a || keys.A);
    HELD.right = !!(keys.ArrowRight || keys.d || keys.D);
  }

  function jump() {
    if (!running || paused) return;
    if (!player.isJumping) {
      player.velocityY = -player.jumpPower;
      player.isJumping = true;
    }
  }

  window.addEventListener('keydown', function (e) {
    if (e.key === 'p' || e.key === 'P') { togglePause(); return; }
    if (e.key === ' ' || e.key === 'ArrowUp') e.preventDefault();
    keys[e.key] = true;
    syncHeld();
    if (e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') jump();
  });

  window.addEventListener('keyup', function (e) {
    keys[e.key] = false;
    syncHeld();
  });

  function handleInput() {
    if (!running || paused) return;
    if (HELD.left) player.x -= player.speed;
    if (HELD.right) player.x += player.speed;
    if (HELD.down) player.y += player.speed;
  }

  setInterval(handleInput, 1000 / 60);

  /* On-screen controls, so the game is playable on touch screens */
  var pad = document.querySelector('[data-touch-pad]');
  if (pad) {
    pad.querySelectorAll('[data-dir]').forEach(function (btn) {
      var dir = btn.getAttribute('data-dir');
      var activeKey = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' }[dir];
      function press(e) {
        e.preventDefault();
        btn.classList.add('is-active');
        if (dir === 'up') { keys[activeKey] = true; syncHeld(); jump(); }
        else { keys[activeKey] = true; syncHeld(); }
      }
      function release(e) {
        e.preventDefault();
        btn.classList.remove('is-active');
        keys[activeKey] = false;
        syncHeld();
      }
      btn.addEventListener('touchstart', press, { passive: false });
      btn.addEventListener('touchend', release, { passive: false });
      btn.addEventListener('touchcancel', release, { passive: false });
      btn.addEventListener('mousedown', press);
      btn.addEventListener('mouseup', release);
      btn.addEventListener('mouseleave', release);
    });
  }

  if (el.start) {
    el.start.addEventListener('click', function () {
      start();
    });
  }

  if (el.reset) {
    el.reset.addEventListener('click', function () {
      stopLoop();
      running = false;
      paused = false;
      initWorld();
      draw('idle');
      if (el.start) el.start.textContent = 'Start demo';
      if (el.live) el.live.textContent = 'Reset. Score ' + score + ', tokens ' + coins + '. Press "Start demo" to play.';
    });
  }

  window.addEventListener('resize', resizeCanvas);

  resizeCanvas();
  initWorld();
  draw('idle');
  if (el.live) el.live.textContent = 'Demo not running. Press "Start demo" to play.';
})();