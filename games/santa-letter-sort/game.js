(() => {
  "use strict";

  const { Grid, PixelStage, PAL, mix, hash2 } = window.GBPixel || {};
  if (!Grid || !PixelStage || !PAL) {
    document.body.innerHTML = "<p style='padding:24px;font:16px sans-serif;color:white'>The GameBox pixel renderer did not load. Return to GameBox and try again.</p>";
    throw new Error("GameBox pixel renderer is required by Santa’s Letter Sort.");
  }

  const $ = (id) => document.getElementById(id);
  const WORLD_W = 160;
  const WORLD_H = 156;
  const LEVEL_LENGTH = 6;
  const BEST_KEY = "gamebox.santaLetterSort.record.v1";
  const RECIPIENTS = [
    "MILO", "ELSIE", "THEO", "LUNA", "OLIVER", "RUBY", "JACK", "MAPLE",
    "IVY", "NOAH", "POPPY", "FINN", "ARLO", "MABEL", "ELLA", "KIT",
  ];
  const STREETS = ["MISTLETOE", "CANDY CANE", "TINSEL", "FROSTY", "JINGLE"];
  const ZONES = [
    { id: "toy-town", name: "TOY TOWN", code: "TT", color: "#bd3744", icon: "TOYS", ink: "#fff8e9" },
    { id: "pine-woods", name: "PINE WOODS", code: "PW", color: "#267647", icon: "PINES", ink: "#fff8e9" },
    { id: "ice-bay", name: "ICE BAY", code: "IB", color: "#317a98", icon: "ICE", ink: "#fff8e9" },
    { id: "sugar-ridge", name: "SUGAR RIDGE", code: "SR", color: "#ecc85d", icon: "SWEET", ink: "#263324" },
  ];

  const C = {
    ink: PAL.ink,
    paper: PAL.paper,
    gold: PAL.gold,
    teal: PAL.teal,
    rose: PAL.rose,
    wall: "#714b3c",
    wallLight: "#9b6750",
    wallDark: "#4b332d",
    timber: "#70432d",
    timberLight: "#a56c3c",
    timberDark: "#39291f",
    snow: "#eaf7f5",
    ice: "#a8dfeb",
    sky: "#426f86",
    pine: "#123b29",
    pineLight: "#276040",
    pineShade: "#0a291d",
    red: "#d83f45",
    redLight: "#f16668",
    skin: "#efc496",
    beard: "#ece6d5",
  };

  const ui = {
    home: $("homeScreen"),
    game: $("gameScreen"),
    over: $("overScreen"),
    pauseOverlay: $("pauseOverlay"),
    best: $("bestScore"),
    score: $("scoreLabel"),
    shift: $("shiftLabel"),
    stamps: $("stampRow"),
    combo: $("comboLabel"),
    progress: $("progressBar"),
    progressLabel: $("progressLabel"),
    timer: $("timerFill"),
    timerLabel: $("timerLabel"),
    serial: $("letterSerial"),
    postmark: $("postmark"),
    destination: $("destinationLabel"),
    recipient: $("recipientLabel"),
    address: $("addressLabel"),
    routeCount: $("routeCount"),
    sacks: $("sackGrid"),
    feedback: $("feedback"),
    finalScore: $("finalScore"),
    deepestShift: $("deepestShift"),
    resultCopy: $("resultCopy"),
  };

  const state = {
    screen: "home",
    level: 1,
    progress: 0,
    score: 0,
    streak: 0,
    stamps: 3,
    turn: 0,
    letter: null,
    startedAt: 0,
    duration: 0,
    pausedAt: 0,
    best: { score: 0, level: 1 },
    feedbackTimeout: 0,
  };

  function activeZones(level) {
    return ZONES.slice(0, Math.min(ZONES.length, 2 + Math.floor((level - 1) / 2)));
  }

  function roundDuration(level) {
    return Math.max(1800, 5200 - (level - 1) * 300);
  }

  function numberLabel(value) {
    return String(value).padStart(5, "0");
  }

  function makeLetter(level) {
    const routes = activeZones(level);
    const zone = routes[Math.floor(Math.random() * routes.length)];
    const recipient = RECIPIENTS[Math.floor(Math.random() * RECIPIENTS.length)];
    const street = STREETS[Math.floor(Math.random() * STREETS.length)];
    const streetNumber = Math.ceil(Math.random() * 98);
    return {
      zone,
      recipient,
      address: `${streetNumber} ${street} LANE · NORTH POLE`,
    };
  }

  function loadRecord() {
    try {
      const stored = JSON.parse(localStorage.getItem(BEST_KEY) || "null");
      if (stored && Number.isFinite(stored.score) && Number.isFinite(stored.level)) {
        state.best = {
          score: Math.max(0, stored.score),
          level: Math.max(1, stored.level),
        };
      }
    } catch {
      ui.feedback.textContent = "LOCAL SCORE SAVING IS UNAVAILABLE";
      ui.feedback.classList.add("bad");
    }
    ui.best.textContent = numberLabel(state.best.score);
  }

  function saveRecord() {
    const next = {
      score: Math.max(state.best.score, state.score),
      level: Math.max(state.best.level, state.level),
    };
    if (next.score === state.best.score && next.level === state.best.level) return;
    state.best = next;
    ui.best.textContent = numberLabel(next.score);
    try {
      localStorage.setItem(BEST_KEY, JSON.stringify(next));
    } catch {
      ui.feedback.textContent = "LOCAL SCORE SAVING IS UNAVAILABLE";
      ui.feedback.classList.add("bad");
    }
  }

  function playHaptic(pattern) {
    if (typeof navigator.vibrate !== "function") return;
    navigator.vibrate(pattern);
  }

  function buildWorld() {
    const g = new Grid(WORLD_W, WORLD_H);
    g.rect(0, 0, WORLD_W, 135, (x, y) => {
      if (y < 8) return C.wallDark;
      const grain = hash2(x, y, 91);
      return grain > 0.9 ? mix(C.wall, C.wallLight, 0.42) : mix(C.wallDark, C.wall, 0.72);
    });

    for (let y = 14; y < 105; y += 15) {
      g.hline(0, WORLD_W - 1, y, C.wallDark);
      for (let x = (y % 30 === 14 ? 12 : 46); x < WORLD_W; x += 45) {
        g.vline(x, y + 1, y + 13, C.wallLight);
      }
      for (let x = 4; x < WORLD_W; x += 13) {
        if (hash2(x, y, 14) > 0.65) g.set(x, y + 4, C.wallLight);
      }
    }

    // Frosted window and the pine line beyond it.
    g.rect(99, 18, 50, 50, C.timberDark);
    g.rect(102, 21, 44, 44, C.ice);
    g.rect(104, 23, 40, 39, C.sky);
    g.rect(104, 47, 40, 15, C.snow);
    g.rect(107, 42, 8, 8, "#d3e8e3");
    g.rect(120, 37, 7, 12, "#d3e8e3");
    g.rect(133, 44, 8, 6, "#d3e8e3");
    g.rect(110, 32, 3, 3, "#f7eed9");
    g.rect(126, 28, 3, 3, "#f7eed9");
    g.rect(138, 34, 3, 3, "#f7eed9");
    drawPine(g, 108, 31, 17);
    drawPine(g, 131, 29, 21);
    g.rect(97, 16, 4, 55, C.timberLight);
    g.rect(147, 16, 4, 55, C.timberLight);
    g.rect(97, 15, 54, 4, C.timberLight);
    g.rect(97, 68, 54, 4, C.timberLight);
    g.rect(122, 20, 3, 44, C.timberDark);
    g.rect(102, 42, 44, 3, C.timberDark);

    // Garlands and the post-room shelves.
    for (let x = 5; x < 94; x += 8) {
      const y = 20 + Math.floor(Math.sin(x * 0.13) * 4 + 4);
      g.rect(x, y, 5, 3, x % 3 === 0 ? C.pineLight : C.pine);
      if (x % 16 === 5) g.set(x + 1, y + 3, C.gold);
    }
    g.rect(7, 45, 75, 3, C.timberDark);
    g.rect(7, 43, 75, 2, C.timberLight);
    g.rect(83, 50, 67, 3, C.timberDark);
    g.rect(83, 48, 67, 2, C.timberLight);
    drawGift(g, 17, 31, 13, 12, C.red);
    drawGift(g, 36, 32, 11, 11, C.teal);
    drawGift(g, 53, 31, 17, 12, C.gold);
    drawSackOnWorld(g, 91, 37, C.rose, "#f99a82");
    drawSackOnWorld(g, 117, 38, C.teal, C.ice);

    // The sorting table and timber mail bins.
    g.rect(8, 104, 144, 7, C.timberDark);
    g.rect(10, 102, 140, 5, C.timberLight);
    g.rect(15, 111, 6, 28, C.timberDark);
    g.rect(139, 111, 6, 28, C.timberDark);
    g.rect(19, 114, 122, 3, "#9f663c");
    g.rect(24, 118, 30, 20, "#705034");
    g.rect(56, 118, 30, 20, "#79563a");
    g.rect(88, 118, 30, 20, "#694b34");
    g.rect(120, 118, 16, 20, "#79563a");
    g.hline(25, 53, 121, C.timberLight);
    g.hline(57, 85, 121, C.timberLight);
    g.hline(89, 117, 121, C.timberLight);
    g.hline(121, 135, 121, C.timberLight);

    // Snow at the sill and floor-level gift parcels.
    g.rect(0, 139, WORLD_W, 17, "#d4e9dc");
    g.hline(0, WORLD_W - 1, 139, C.snow);
    for (let x = 3; x < WORLD_W; x += 11) {
      if (hash2(x, 145, 50) > 0.45) g.rect(x, 143 + (x % 3), 3, 2, C.snow);
    }
    drawGift(g, 17, 142, 13, 10, C.red);
    drawGift(g, 33, 144, 10, 8, C.gold);
    drawPine(g, 134, 127, 26);

    return g.toCanvas();
  }

  function drawPine(g, x, y, height) {
    const rows = Math.max(3, Math.floor(height / 4));
    const center = x + Math.floor(height / 5);
    g.rect(center - 1, y + height - 5, 4, 7, C.timberDark);
    for (let row = 0; row < rows; row++) {
      const width = 3 + row * 2;
      const left = center - Math.floor(width / 2);
      const top = y + row * 3;
      g.rect(left, top, width, 4, row % 2 ? C.pine : C.pineLight);
      g.vline(left, top + 1, top + 3, C.pineShade);
      if (width > 5) g.set(left + width - 2, top + 1, "#398154");
    }
    g.hline(center - 2, center + 2, y + height + 1, "#edf8e9");
  }

  function drawGift(g, x, y, width, height, color) {
    g.rect(x + 1, y + 2, width, height, C.timberDark);
    g.rect(x, y, width, height - 2, color);
    g.rect(x + Math.floor(width / 2) - 1, y, 3, height - 2, C.cream);
    g.rect(x, y + Math.floor(height / 2), width, 2, C.gold);
    g.rect(x + Math.floor(width / 2) - 4, y - 3, 4, 3, C.gold);
    g.rect(x + Math.floor(width / 2) + 1, y - 3, 4, 3, C.gold);
    g.set(x + Math.floor(width / 2), y - 4, C.gold);
  }

  function drawSackOnWorld(g, x, y, color, highlight) {
    g.rect(x + 2, y + 3, 13, 16, C.timberDark);
    g.rect(x + 4, y + 4, 11, 14, color);
    g.rect(x + 2, y + 7, 3, 7, color);
    g.rect(x + 5, y + 2, 8, 3, highlight);
    g.rect(x + 7, y, 4, 3, C.gold);
    g.vline(x + 5, y + 7, y + 15, highlight);
    g.hline(x + 6, x + 12, y + 17, C.timberDark);
  }

  function makeSanta() {
    const g = new Grid(25, 35);
    g.rect(7, 0, 12, 3, C.red);
    g.rect(5, 3, 16, 4, C.red);
    g.rect(4, 6, 18, 3, C.cream);
    g.rect(7, 9, 14, 9, C.skin);
    g.rect(7, 12, 14, 4, C.beard);
    g.rect(7, 16, 14, 3, C.beard);
    g.set(10, 12, C.ink);
    g.set(17, 12, C.ink);
    g.rect(11, 15, 6, 2, C.red);
    g.rect(5, 19, 18, 11, C.red);
    g.rect(3, 21, 4, 9, C.redLight);
    g.rect(21, 21, 4, 9, C.red);
    g.rect(5, 28, 18, 3, C.cream);
    g.rect(8, 30, 5, 5, C.ink);
    g.rect(16, 30, 5, 5, C.ink);
    g.rect(11, 20, 4, 3, C.gold);
    g.set(12, 25, C.cream);
    g.set(12, 8, C.cream);
    return g.toCanvas();
  }

  function makeEnvelope(stampColor) {
    const g = new Grid(21, 15);
    g.rect(1, 1, 19, 13, C.timberDark);
    g.rect(2, 0, 17, 12, C.paper);
    g.rect(2, 11, 17, 2, "#d7c7a8");
    g.line(2, 1, 10, 8, "#d6c6a7");
    g.line(18, 1, 10, 8, "#d6c6a7");
    g.rect(14, 2, 3, 3, stampColor);
    g.set(15, 3, C.gold);
    g.hline(4, 9, 10, "#ad9470");
    g.hline(4, 12, 12, "#ad9470");
    return g.toCanvas();
  }

  function createCanvasAssets() {
    return {
      room: buildWorld(),
      santa: makeSanta(),
    };
  }

  const assets = createCanvasAssets();
  const canvas = $("world");
  const stageWrap = $("stageWrap");
  const stage = new PixelStage(canvas, WORLD_W, WORLD_H, stageWrap);
  const ctx = stage.ctx;
  const zoneSprites = new Map();
  let animationFrame = 0;
  let timerFrame = 0;
  let lastFrame = 0;

  function drawWorld(now) {
    if (!lastFrame || now - lastFrame > 95) {
      lastFrame = now;
      const bob = Math.round(Math.sin(now / 270) * 2);
      ctx.clearRect(0, 0, WORLD_W, WORLD_H);
      ctx.drawImage(assets.room, 0, 0);
      ctx.drawImage(assets.santa, 32, 67 + bob);
      const stampColor = state.letter ? state.letter.zone.color : C.gold;
      if (!zoneSprites.has(stampColor)) {
        zoneSprites.set(stampColor, makeEnvelope(stampColor));
      }
      ctx.drawImage(zoneSprites.get(stampColor), 68, 76 + bob);
    }
    animationFrame = requestAnimationFrame(drawWorld);
  }

  function renderStamps() {
    ui.stamps.innerHTML = Array.from({ length: 3 }, (_, i) =>
      `<span class="stamp${i >= state.stamps ? " lost" : ""}" aria-hidden="true"></span>`,
    ).join("");
    ui.stamps.setAttribute("aria-label", `${state.stamps} of 3 stamps remaining`);
  }

  function renderProgress() {
    ui.progress.innerHTML = Array.from({ length: LEVEL_LENGTH }, (_, i) =>
      `<span class="progress-segment${i < state.progress ? " filled" : ""}" aria-hidden="true"></span>`,
    ).join("");
    ui.progress.setAttribute("aria-valuenow", String(state.progress));
    ui.progressLabel.textContent = `${String(state.progress).padStart(2, "0")} / 06`;
  }

  function renderSacks() {
    const routes = activeZones(state.level);
    ui.routeCount.textContent = `${routes.length} ACTIVE ROUTES`;
    ui.sacks.innerHTML = routes.map((zone, index) => `
      <button
        class="sack-button"
        type="button"
        data-zone="${zone.id}"
        aria-label="Sort to ${zone.name}. Keyboard shortcut ${index + 1}."
        style="--sack-color:${zone.color};--route-ink:${zone.ink}"
      >
        <span class="route-code" aria-hidden="true">${zone.code}</span>
        <span class="route-name">${zone.name}</span>
        <span class="route-hint">${zone.icon} · ROUTE ${zone.code} · KEY ${index + 1}</span>
      </button>
    `).join("");
  }

  function renderLetter() {
    if (!state.letter) return;
    ui.serial.textContent = `NORTH POLE · ${String(state.turn).padStart(3, "0")}`;
    ui.postmark.textContent = state.letter.zone.code;
    ui.postmark.style.color = state.letter.zone.color;
    ui.postmark.style.borderColor = state.letter.zone.color;
    ui.destination.textContent = state.letter.zone.name;
    ui.recipient.textContent = `ATTN: ${state.letter.recipient}`;
    ui.address.textContent = state.letter.address;
  }

  function renderStats() {
    ui.score.textContent = numberLabel(state.score);
    ui.shift.textContent = `SHIFT ${String(state.level).padStart(2, "0")}`;
    ui.combo.textContent = `× ${String(state.streak).padStart(2, "0")}`;
    renderStamps();
    renderProgress();
    renderSacks();
    renderLetter();
  }

  function setFeedback(message, isBad = false) {
    window.clearTimeout(state.feedbackTimeout);
    ui.feedback.textContent = message;
    ui.feedback.classList.toggle("bad", isBad);
    state.feedbackTimeout = window.setTimeout(() => {
      ui.feedback.textContent = "";
      ui.feedback.classList.remove("bad");
    }, 820);
  }

  function showScreen(screen) {
    state.screen = screen;
    ui.home.hidden = screen !== "home";
    ui.game.hidden = screen !== "game" && screen !== "paused";
    ui.over.hidden = screen !== "over";
    ui.pauseOverlay.hidden = screen !== "paused";
    if (screen === "game") $("pauseButton").focus({ preventScroll: true });
    if (screen === "home") $("startButton").focus({ preventScroll: true });
    if (screen === "over") $("againButton").focus({ preventScroll: true });
  }

  function startGame() {
    state.level = 1;
    state.progress = 0;
    state.score = 0;
    state.streak = 0;
    state.stamps = 3;
    state.turn = 1;
    state.duration = roundDuration(state.level);
    state.startedAt = performance.now();
    state.pausedAt = 0;
    state.letter = makeLetter(state.level);
    renderStats();
    ui.timer.style.width = "100%";
    ui.timer.classList.remove("danger");
    ui.timerLabel.textContent = "NEXT LETTER";
    showScreen("game");
    playHaptic(14);
  }

  function finishGame() {
    state.screen = "over";
    saveRecord();
    ui.finalScore.textContent = numberLabel(state.score);
    ui.deepestShift.textContent = String(state.level).padStart(2, "0");
    ui.resultCopy.textContent = state.score > 0
      ? `${numberLabel(state.score)} points · shift ${String(state.level).padStart(2, "0")}`
      : "The mailroom is ready for another run.";
    showScreen("over");
  }

  function loseStamp(reason) {
    if (state.screen !== "game") return;
    state.streak = 0;
    state.stamps = Math.max(0, state.stamps - 1);
    renderStamps();
    setFeedback(reason, true);
    playHaptic([22, 35, 22]);
    if (state.stamps === 0) {
      finishGame();
      return;
    }
    nextLetter();
  }

  function nextLetter() {
    state.turn += 1;
    state.duration = roundDuration(state.level);
    state.startedAt = performance.now();
    state.letter = makeLetter(state.level);
    renderLetter();
    ui.timer.style.width = "100%";
    ui.timer.classList.remove("danger");
    ui.timerLabel.textContent = "NEXT LETTER";
  }

  function sortLetter(zoneId) {
    if (state.screen !== "game" || !state.letter) return;
    if (state.letter.zone.id !== zoneId) {
      loseStamp("WRONG SACK · ONE STAMP LOST");
      return;
    }

    state.score += 10 + Math.min(state.streak, 5) * 2;
    state.progress += 1;
    state.streak += 1;
    const finishedShift = state.progress === LEVEL_LENGTH;
    if (finishedShift) {
      state.level += 1;
      state.progress = 0;
    }
    state.turn += 1;
    state.letter = makeLetter(state.level);
    state.duration = roundDuration(state.level);
    state.startedAt = performance.now();
    renderStats();
    ui.timer.style.width = "100%";
    ui.timer.classList.remove("danger");
    ui.timerLabel.textContent = "NEXT LETTER";
    setFeedback(finishedShift ? "SHIFT COMPLETE · NEW ROUTES OPEN" : "DELIVERED · NICE WORK");
    saveRecord();
    playHaptic(18);
  }

  function pauseGame() {
    if (state.screen !== "game") return;
    state.screen = "paused";
    state.pausedAt = performance.now();
    showScreen("paused");
    $("resumeButton").focus({ preventScroll: true });
  }

  function resumeGame() {
    if (state.screen !== "paused") return;
    const pausedFor = performance.now() - state.pausedAt;
    state.startedAt += pausedFor;
    state.screen = "game";
    showScreen("game");
  }

  function updateTimer(now) {
    if (state.screen === "game") {
      const remaining = Math.max(0, state.duration - (now - state.startedAt));
      const ratio = remaining / state.duration;
      ui.timer.style.width = `${Math.max(0, ratio * 100)}%`;
      const urgent = ratio < 0.28;
      ui.timer.classList.toggle("danger", urgent);
      ui.timerLabel.textContent = urgent ? "HURRY" : "NEXT LETTER";
      if (remaining === 0) loseStamp("TIME’S UP · ONE STAMP LOST");
    }
    timerFrame = requestAnimationFrame(updateTimer);
  }

  $("startButton").addEventListener("click", startGame);
  $("againButton").addEventListener("click", startGame);
  $("pauseButton").addEventListener("click", pauseGame);
  $("resumeButton").addEventListener("click", resumeGame);
  ui.sacks.addEventListener("click", (event) => {
    const button = event.target.closest("[data-zone]");
    if (button) sortLetter(button.dataset.zone);
  });
  document.addEventListener("keydown", (event) => {
    if (state.screen !== "game" || !/^[1-4]$/.test(event.key)) return;
    const button = ui.sacks.querySelectorAll("[data-zone]")[Number(event.key) - 1];
    if (button) sortLetter(button.dataset.zone);
  });

  loadRecord();
  renderStats();
  animationFrame = requestAnimationFrame(drawWorld);
  timerFrame = requestAnimationFrame(updateTimer);

  window.addEventListener("pagehide", () => {
    cancelAnimationFrame(animationFrame);
    cancelAnimationFrame(timerFrame);
    stage.destroy();
  }, { once: true });
})();