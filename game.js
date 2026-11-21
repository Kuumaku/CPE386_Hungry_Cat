"use strict";
(() => {
  // Shared constants and DOM access.
  const $ = (id) => document.getElementById(id);
  const ANGLES = [
    0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330,
  ];
  const INNER = ANGLES.filter((a) => a % 90 !== 0);
  // One shared clock per Challenge level; each correct catch grants five seconds.
  const CHALLENGE_SECONDS = [60, 60, 120, 120, 60];
  const MISSION_COUNTS = [
    [3, 3, 3],
    [3, 3, 3],
    [3, 3, 3],
    [3, 3, 3],
    [3, 3, 3],
  ];
  const missionCount = () => MISSION_COUNTS[state.world][state.stage];
  const isTimedChallenge = () => state.mode === "story" && state.stage === 2;
  const WORLDS = [
    {
      name: "Angle Forest",
      topic: "Understanding angles",
      icon: "❧",
      desc: "Follow your curiosity. Find the angle. Catch the mouse.",
      place: "THE FOREST CLEARING",
      lesson: "Every adventure starts at 0°.",
      detail: "Angles grow counterclockwise.",
      titles: ["Angle Discovery", "Hidden Mouse", "The Bee’s Secret"],
    },
    {
      name: "Quadrant Adventure",
      topic: "The four quadrants",
      icon: "⌘",
      desc: "Four little corners. A whole world of possibilities.",
      place: "THE QUADRANT GARDEN",
      lesson: "A place for every point.",
      detail: "Points on an axis are not in a quadrant.",
      titles: ["Quadrant Explorer", "Where’s the Mouse?", "Mystery Trail"],
    },
    {
      name: "Coordinate Valley",
      topic: "Cosine & sine",
      icon: "⌁",
      desc: "A sideways step, an upward leap. Find your coordinates.",
      place: "THE COORDINATE VALLEY",
      lesson: "COS takes you sideways. SIN takes you skyward.",
      detail: "x = cos θ · y = sin θ",
      titles: ["Choose Your Axis", "Two Little Steps", "Mouse Escape"],
    },
    {
      name: "Sign Forest",
      topic: "Signs of sin & cos",
      icon: "✣",
      desc: "Positive or negative? Let the signs lead the way.",
      place: "THE SIGN FOREST",
      lesson: "The signs point the way.",
      detail: "Cosine follows x. Sine follows y.",
      titles: ["Hidden Signs", "Sign Catch", "The Three-Clue Trail"],
    },
    {
      name: "Trig Treasure",
      topic: "Exact trigonometric values",
      icon: "♧",
      desc: "A clever little mouse. An exact little answer.",
      place: "THE TREASURE MEADOW",
      lesson: "Find the reference angle, then choose the sign.",
      detail: "tan θ = sin θ / cos θ",
      titles: ["Value Discovery", "Reference Angle Hunt", "Treasure Chase"],
    },
  ];
  const fresh = () => ({
    unlocked: 1,
    stars: {},
    best: {},
    coins: 0,
    rushBest: 0,
    total: 0,
    first: 0,
    hints: 0,
    attempts: 0,
    pre: null,
    post: null,
    skin: "ginger",
  });
  let saved;
  try {
    saved = {
      ...fresh(),
      ...JSON.parse(localStorage.getItem("trigo-cat-v1") || "{}"),
    };
  } catch {
    saved = fresh();
  }
  let state = {
    world: 0,
    stage: 0,
    mode: "story",
    mission: 0,
    hearts: 3,
    score: 0,
    streak: 0,
    attempts: 0,
    hinted: false,
    selected: null,
    axis: null,
    signCos: null,
    signSin: null,
    clue: 0,
    busy: false,
    active: true,
    elapsed: 0,
    bee: 210,
    cat: { x: 450, y: 350 },
    target: null,
    question: null,
    questions: [],
    moveTo: null,
  };
  let runId = 0,
    inHome = true;
  let explore = false,
    sound = false,
    audio = null,
    lastTime = 0,
    toastTimer,
    quiz = null;
  const keys = new Set();
  const rad = (a) => (a * Math.PI) / 180;
  const pos = (a, r = 220) => ({
    x: 450 + Math.cos(rad(a)) * r,
    y: 350 - Math.sin(rad(a)) * r,
  });
  const q = (a) =>
    a > 0 && a < 90
      ? 1
      : a > 90 && a < 180
        ? 2
        : a > 180 && a < 270
          ? 3
          : a > 270 && a < 360
            ? 4
            : 0;
  const roman = ["", "I", "II", "III", "IV"];
  const qpos = (n) => {
    const p = {
      x: 450 + (n === 1 || n === 4 ? 160 : -160),
      y: 350 + (n <= 2 ? -150 : 150),
    };
    if (state.world === 1 && state.stage === 0) {
      const t = state.elapsed + n;
      p.x += 14 * Math.cos(t * 0.8);
      p.y += 12 * Math.sin(t * 0.8);
    }
    return p;
  };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const sample = (a) => a[Math.floor(Math.random() * a.length)];

  // Shuffle an array in place without mutating the caller's original array.
  function shuffle(a) {
    a = [...a];
    for (let i = a.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const exact = (n) => {
    if (Math.abs(n) < 0.0001) return "0";
    let s = n < 0 ? "−" : "";
    n = Math.abs(n);
    if (Math.abs(n - 1) < 0.0001) return s + "1";
    if (Math.abs(n - 0.5) < 0.0001) return s + "1/2";
    if (Math.abs(n - Math.SQRT1_2) < 0.0001) return s + "√2/2";
    if (Math.abs(n - Math.sqrt(3) / 2) < 0.0001) return s + "√3/2";
    if (Math.abs(n - Math.sqrt(3)) < 0.0001) return s + "√3";
    if (Math.abs(n - 1 / Math.sqrt(3)) < 0.0001) return s + "√3/3";
    return n.toFixed(2);
  };
  const val = (fn, a) =>
    exact(
      fn === "sin"
        ? Math.sin(rad(a))
        : fn === "cos"
          ? Math.cos(rad(a))
          : Math.tan(rad(a)),
    );

  // Persistence and feedback.
  function save() {
    try {
      localStorage.setItem("trigo-cat-v1", JSON.stringify(saved));
    } catch {}
    $("coins").textContent = saved.coins;
    updateAssessments();
    updateHome();
  }
  function beep(good = true) {
    if (!sound) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(),
        g = audio.createGain();
      o.connect(g);
      g.connect(audio.destination);
      o.type = "sine";
      o.frequency.setValueAtTime(good ? 660 : 200, audio.currentTime);
      o.frequency.exponentialRampToValueAtTime(
        good ? 990 : 130,
        audio.currentTime + 0.14,
      );
      g.gain.setValueAtTime(0.07, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.22);
      o.start();
      o.stop(audio.currentTime + 0.23);
    } catch {}
  }
  function toast(msg, error = false) {
    clearTimeout(toastTimer);
    $("toast").textContent = msg;
    $("toast").className = "toast visible" + (error ? " error" : "");
    toastTimer = setTimeout(() => $("toast").classList.remove("visible"), 3500);
  }
  function scenery() {
    let s =
      '<rect width="900" height="690" fill="url(#surround)"/><path d="M-20 580Q160 530 206 625T620 715" fill="none" stroke="#c4caa0" stroke-width="46" opacity=".55"/><path d="M710-20Q765 90 906 91" fill="none" stroke="#c1c99d" stroke-width="40" opacity=".5"/><ellipse cx="450" cy="356" rx="330" ry="305" fill="#a8c58e"/><ellipse cx="450" cy="350" rx="305" ry="280" fill="url(#grass)"/><ellipse cx="450" cy="350" rx="298" ry="273" fill="url(#grassTexture)"/>';
    for (const [x, y, z] of [
      [47, 102, 1.1],
      [118, 55, 0.8],
      [836, 118, 1.2],
      [895, 205, 0.85],
      [40, 523, 1.1],
      [112, 626, 0.9],
      [802, 597, 1.2],
      [894, 488, 0.85],
      [-10, 320, 0.85],
      [894, 16, 1.2],
      [235, -10, 0.8],
      [675, 660, 0.7],
    ])
      s += `<use href="#tree" transform="translate(${x} ${y}) scale(${z})" filter="url(#shadow)"/>`;
    for (const [x, y, z] of [
      [147, 142, 0.7],
      [727, 139, 0.8],
      [141, 551, 0.8],
      [733, 531, 0.8],
      [271, 628, 0.65],
      [605, 54, 0.65],
    ])
      s += `<use href="#bush" transform="translate(${x} ${y}) scale(${z})"/>`;
    for (let i = 0; i < 28; i++) {
      const a = i * 137.5,
        p = pos(a, 260 + (i % 4) * 10);
      s += `<g transform="translate(${p.x} ${p.y})"><path d="M0 0v8" stroke="#79985e" stroke-width="2"/><path d="M0 0C-12-12-14 5 0 1C12-12 14 5 0 1" fill="${i % 2 ? "#e7dca1" : "#f1e3c3"}"/><circle r="2.5" fill="#b9a666"/></g>`;
    }
    s +=
      '<g transform="translate(729 241) rotate(-18)" class="sparkle"><path d="M-3 0q-17-22-19-5q-1 10 16 10M3 0q17-22 19-5q1 10-16 10" fill="#e3bf88"/><path d="M0-7v16" stroke="#a58b68" stroke-width="3"/></g><g transform="translate(189 405)" class="sparkle"><path d="M0-7v14m-7-7h14" stroke="#f1f0cd" stroke-width="3" stroke-linecap="round"/></g>';
    $("scenery").innerHTML = s;
  }
  function renderNav() {
    // Render world navigation and respect the current unlock state.
    $("world-nav").innerHTML = WORLDS.map(
      (w, i) =>
        `<button class="world-button ${state.world === i ? "active" : ""}" data-world="${i}" title="${w.name}"><span class="world-icon">${w.icon}</span><div><strong>${w.name}</strong><small>World ${i + 1} · ${i === 0 ? "The beginning" : w.topic}</small></div>${saved.unlocked < i * 3 + 1 && !explore ? '<span class="lock">⌑</span>' : ""}</button>`,
    ).join("");
    document.querySelectorAll("[data-world]").forEach(
      (el) =>
        (el.onclick = () => {
          const w = +el.dataset.world;
          if (saved.unlocked < w * 3 + 1 && !explore) {
            showMap();
            return;
          }
          start(w, 0);
        }),
    );
  }
  function makeQuestion(w, stage, index, choice = {}) {
    // Build one World/Level question for Story or replay mode.
    const replay = !!saved.stars[w * 3 + stage + 1] || state.mode === "rush";
    let a;
    if (w === 0) {
      if (stage === 0) {
        a = [0, 30, 45, 60, 90, 150][index % 6];
        return {
          a,
          prompt: `The mouse is hiding at <strong>${a}°</strong>. Which bush should we search?`,
        };
      }
      if (stage === 2) {
        const routes = [
            [0, 135, 90],
            [90, 180, -45],
            [270, 120, -90],
            [180, -135, 30],
            [30, 180, 120],
          ],
          [begin, first, second] = routes[index % 5];
        return {
          a: (begin + first + second + 720) % 360,
          prompt: `Start at <strong>${begin}°</strong>. Turn <strong>${Math.abs(first)}° ${first > 0 ? "counterclockwise" : "clockwise"}</strong>, then <strong>${Math.abs(second)}° ${second > 0 ? "counterclockwise" : "clockwise"}</strong>. Find the final angle and avoid all three bees.`,
        };
      }
      const combos = replay
        ? shuffle([
            [30, 90, 1],
            [90, 30, -1],
            [0, 90, -1],
            [180, 45, 1],
            [270, 60, 1],
            [90, 45, -1],
            [0, 45, 1],
            [0, 60, 1],
            [90, 60, 1],
            [270, 30, -1],
          ])
        : [
            [30, 90, 1],
            [90, 30, -1],
            [0, 90, -1],
            [180, 45, 1],
            [270, 60, 1],
          ];
      const [start, turn, dir] = choice.combo || combos[index % combos.length];
      a = (start + turn * dir + 360) % 360;
      return {
        a,
        prompt: `Start at <strong>${start}°</strong>. Turn <strong>${turn}° ${dir === 1 ? "counterclockwise" : "clockwise"}</strong>. Where is the mouse?`,
      };
    }
    if (w === 1 || w === 3) {
      a =
        stage === 0
          ? [45, 135, 225, 315, 60][index % 5]
          : (choice.angle ??
            (replay ? sample(INNER) : [150, 225, 330, 45, 135][index % 5]));
      const target = q(a),
        cos = target === 1 || target === 4 ? "+" : "−",
        sin = target <= 2 ? "+" : "−";
      let seq =
        stage === 2
          ? choice.sequence || shuffle([45, 135, 225, 315]).slice(0, 3)
          : null;
      return {
        a,
        q: target,
        cos,
        sin,
        seq,
        prompt:
          w === 1
            ? stage === 0
              ? `Find the mouse where <strong>x ${cos === "+" ? ">" : "<"} 0</strong> and <strong>y ${sin === "+" ? ">" : "<"} 0</strong>.`
              : stage === 1
                ? `The mouse is hiding in the quadrant containing <strong>${a}°</strong>.`
                : "Follow three clues in order. Open the box for each clue to reveal the mouse."
            : stage === 0
              ? `Find the mouse where <strong>cos θ is ${cos === "+" ? "positive" : "negative"}</strong> and <strong>sin θ is ${sin === "+" ? "positive" : "negative"}</strong>.`
              : stage === 1
                ? `At <strong>${a}°</strong>, choose the signs of COS and SIN to catch the mouse.`
                : "Follow the signs through three clues. The mouse waits at the end.",
      };
    }
    if (w === 2) {
      a =
        stage === 0
          ? [0, 90, 180, 270, 360][index % 5]
          : (choice.angle ??
            (replay ? sample(INNER) : [60, 135, 300, 45, 225][index % 5]));
      return {
        a,
        prompt:
          stage === 0
            ? `The mouse is on the <strong>${a % 180 === 0 ? "horizontal" : "vertical"} axis</strong>. Choose COS or SIN, then move to catch it.`
            : `Reach the mouse at <strong>${a}°</strong>. Use COS for x and SIN for y.${stage === 2 ? "<br>Watch for the patrolling dog!" : ""}`,
      };
    }
    const fixed = [
      [
        ["sin", 0],
        ["cos", 30],
        ["sin", 45],
        ["cos", 60],
        ["sin", 90],
      ],
      [
        ["cos", 120],
        ["sin", 150],
        ["cos", 225],
      ],
      [
        ["sin", 300],
        ["cos", 315],
        ["tan", 135],
      ],
    ];
    let [fn, angle] = fixed[stage][index % fixed[stage].length];
    if ((replay || choice.fn) && stage !== 0) {
      fn =
        choice.fn ||
        (stage === 2
          ? ["sin", "cos", "tan"][index % 3]
          : sample(["sin", "cos"]));
      angle =
        choice.angle ?? sample(fn === "tan" ? [45, 135, 225, 315] : INNER);
    }
    const answer = val(fn, angle),
      pool = ["0", "1", "−1", "1/2", "−1/2", "√2/2", "−√2/2", "√3/2", "−√3/2"];
    return {
      a: angle,
      fn,
      answer,
      options: shuffle([
        answer,
        ...shuffle(pool.filter((v) => v !== answer)).slice(
          0,
          stage === 2 ? 3 : 2,
        ),
      ]),
      prompt: `A mouse is carrying the exact value of <strong>${fn} ${angle}°</strong>.<br>Catch the one with the right answer.`,
    };
  }
  // Construct a shuffled deck, so a story run never contains the same question twice.
  function buildQuestions(w, stage, count) {
    const replay = !!saved.stars[w * 3 + stage + 1] || state.mode === "rush";
    let choices = [];
    if (w === 0 && stage > 0 && replay)
      choices = shuffle([
        [30, 90, 1],
        [90, 30, -1],
        [0, 90, -1],
        [180, 45, 1],
        [270, 60, 1],
        [90, 45, -1],
        [0, 45, 1],
        [0, 60, 1],
        [90, 60, 1],
        [270, 30, -1],
      ]).map((combo) => ({ combo }));
    if ((w === 1 || w === 3) && stage === 2) {
      const angles = [45, 135, 225, 315],
        sequences = [];
      for (const a of angles)
        for (const b of angles)
          for (const c of angles)
            if (a !== b && a !== c && b !== c)
              sequences.push({ sequence: [a, b, c] });
      const deck = shuffle(sequences);
      while (choices.length < count && deck.length) {
        const previous = choices.at(-1)?.sequence[0],
          next = deck.findIndex((item) => item.sequence[0] !== previous);
        choices.push(deck.splice(Math.max(0, next), 1)[0]);
      }
    }
    if ((w === 1 || w === 3) && stage === 1 && replay)
      choices = shuffle(INNER).map((angle) => ({ angle }));
    if (w === 2 && stage > 0 && replay)
      choices = shuffle(INNER).map((angle) => ({ angle }));
    if (w === 4 && stage === 1)
      choices = shuffle(
        ["sin", "cos"].flatMap((fn) => INNER.map((angle) => ({ fn, angle }))),
      );
    if (w === 4 && stage === 2) {
      const angles = shuffle(INNER),
        tanAngles = shuffle([45, 135, 225, 315]);
      choices = Array.from({ length: count }, (_, i) => ({
        fn: ["sin", "cos", "tan", "sin", "cos"][i % 5],
        angle: i % 5 === 2 ? tanAngles[0] : angles[i],
      }));
    }
    return Array.from({ length: count }, (_, i) =>
      makeQuestion(w, stage, i, choices[i] || {}),
    );
  }
  function questionKey(w, stage, z) {
    if ((w === 1 || w === 3) && stage === 2) return z.seq.join(",");
    if (w === 4) return `${z.fn}:${z.a}`;
    if (w === 0 && stage > 0) return z.prompt;
    return String(z.a);
  }
  // Mouse Rush is unbounded, so only the last three questions per world and level are excluded.
  function rushQuestion() {
    const id = `${state.world}:${state.stage}`,
      recent = state.rushRecent[id] || [],
      key = (z) => questionKey(state.world, state.stage, z);
    let z;
    for (let attempt = 0; attempt < 50; attempt++) {
      z = makeQuestion(state.world, state.stage, state.mission + attempt);
      if (!recent.includes(key(z))) break;
    }
    recent.push(key(z));
    if (recent.length > 3) recent.shift();
    state.rushRecent[id] = recent;
    return z;
  }
  function start(world, stage, mode = "story") {
    // Reset a level/run and initialize its UI and first mission.
    runId++;
    if ($("modal").open) $("modal").close();
    keys.clear();
    clearTimeout(toastTimer);
    $("toast").className = "toast";
    state = {
      ...state,
      world,
      stage,
      mode,
      mission: 0,
      hearts: 3,
      score: 0,
      streak: 0,
      active: true,
      busy: false,
      elapsed: 0,
      pendingGuide: false,
      rushRecent: {},
      failureReason: null,
      timeLeft:
        mode === "story" && stage === 2 ? CHALLENGE_SECONDS[world] : null,
    };
    state.questions = buildQuestions(world, stage, missionCount());
    renderNav();
    const w = WORLDS[world];
    $("world-title").innerHTML = `${w.name}<span>✦</span>`;
    $("eyebrow").textContent = `WORLD 0${world + 1} · ${w.topic.toUpperCase()}`;
    $("world-desc").textContent = w.desc;
    $("location").textContent = w.place;
    $("crumb").textContent =
      mode === "rush" ? "Mouse Rush" : `World ${world + 1}`;
    $("lesson").textContent = w.lesson;
    $("lesson-detail").textContent = w.detail;
    $("level-tag").textContent =
      mode === "rush"
        ? "How far can your curiosity go?"
        : stage === 0
          ? "Take your time. You’re learning."
          : stage === 1
            ? "A little practice goes a long way."
            : "You’ve got this, little explorer.";
    $("level-tabs").innerHTML = ["Learn", "Practice", "Challenge"]
      .map(
        (t, i) =>
          `<button class="level-tab ${stage === i ? "active" : ""}" data-stage="${i}"><span class="num">${i + 1}</span> ${t}${saved.unlocked < world * 3 + i + 1 && !explore ? " ⌑" : ""}</button>`,
      )
      .join("");
    document.querySelectorAll("[data-stage]").forEach(
      (b) =>
        (b.onclick = () => {
          let s = +b.dataset.stage;
          if (saved.unlocked < world * 3 + s + 1 && !explore) {
            toast(
              "Complete the previous level, or turn on Free explore in the world map.",
            );
            return;
          }
          start(world, s);
        }),
    );
    newMission();
    if (stage === 0 || stage === 2 || world === 2 || world === 4) {
      showGuide();
    }
  }
  function newMission() {
    // Reset mission state and build the next question's game board.
    state.catTurn = 0;
    state.targetTurn = 0;
    state.cursorFacing = false;
    state.aimPointer = null;
    state.hintToken = (state.hintToken || 0) + 1;
    $("hint-arrows").innerHTML = "";
    state.invincibleUntil = 2;
    state.axisLockUntil = 0;
    state.attempts = 0;
    state.hinted = false;
    state.clue = 0;
    state.busy = false;
    state.elapsed = 0;
    state.selected = null;
    state.axis = null;
    state.signCos = null;
    state.signSin = null;
    state.cat = { x: 450, y: state.world === 4 ? 545 : 350 };
    state.moveTo = null;
    state.question =
      state.mode === "rush" ? rushQuestion() : state.questions[state.mission];
    state.target = pos(state.question.a);
    state.bee = sample(ANGLES.filter((a) => a !== state.question.a));
    state.bees = [];
    $("hint-content").hidden = true;
    $("hint-content").textContent = "";
    renderMission();
    drawBoard();
    updateHUD();
  }
  function renderMission() {
    // Display mission text, controls, hints, and progress for the current question.
    const { world: w, stage: s, question: z } = state;
    $("mission-title").textContent = WORLDS[w].titles[s];
    $("prompt").innerHTML = z.prompt;
    $("mission-count").textContent =
      state.mode === "rush"
        ? `MOUSE ${String(state.mission + 1).padStart(2, "0")}`
        : `${String(state.mission + 1).padStart(2, "0")} / ${String(missionCount()).padStart(2, "0")}`;
    $("mission-dots").innerHTML =
      state.mode === "rush"
        ? ""
        : Array.from({ length: missionCount() }, (_, i) => i)
            .map(
              (i) =>
                `<span class="mission-dot ${i < state.mission ? "done" : i === state.mission ? "current" : ""}"></span>`,
            )
            .join("");
    $("answer-controls").innerHTML = "";
    $("clue-progress").innerHTML = "";
    if (z.seq) renderClues();
    if (w === 2) {
      $("answer-controls").innerHTML =
        '<div class="axis-controls"><button data-axis="cos">COS <kbd>C</kbd></button><button data-axis="sin">SIN <kbd>V</kbd></button></div>';
      document
        .querySelectorAll("[data-axis]")
        .forEach((b) => (b.onclick = () => selectAxis(b.dataset.axis)));
    }
    if (w === 3 && s === 1) {
      $("answer-controls").innerHTML =
        '<p class="sign-instruction">Drag or click each sign. Both choices are checked automatically.</p>' +
        ["Cos", "Sin"]
          .map(
            (n) =>
              `<div class="sign-controls"><label>${n.toUpperCase()}</label><span class="sign-drop" data-sign-drop="${n}" aria-label="${n.toUpperCase()} sign drop area">?</span><button draggable="true" data-sign="${n}" data-value="+" aria-label="Set ${n.toUpperCase()} positive or drag positive sign">+</button><button draggable="true" data-sign="${n}" data-value="−" aria-label="Set ${n.toUpperCase()} negative or drag negative sign">−</button></div>`,
          )
          .join("");
      document.querySelectorAll("[data-sign]").forEach((b) => {
        b.onclick = () => setSign(b.dataset.sign, b.dataset.value);
        b.ondragstart = (e) =>
          e.dataTransfer.setData("text/plain", b.dataset.value);
      });
      document.querySelectorAll("[data-sign-drop]").forEach((drop) => {
        drop.ondragover = (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        };
        drop.ondrop = (e) => {
          e.preventDefault();
          const sign = e.dataTransfer.getData("text/plain");
          setSign(drop.dataset.signDrop, sign);
        };
      });
    }
    if (w === 4) {
      $("answer-controls").innerHTML =
        '<button class="secondary" id="reference-table">Open reference table</button>';
      if ($("reference-table")) $("reference-table").onclick = showTable;
    }
    $("hint").disabled = false;
    $("hint").querySelector("small").textContent = "Get a hint, keep exploring";
    $("catch").innerHTML =
      w === 1 && s === 0
        ? "Catch the mouse <span>✦</span>"
        : w === 1 || w === 3
          ? "Search & catch <span>✦</span>"
          : "Catch the mouse <span>✦</span>";
    $("keyboard-note").innerHTML =
      w === 3 && s === 1
        ? "Choose both signs to catch the mouse"
        : w === 1 || w === 2 || w === 3
          ? "Move with <kbd>WASD</kbd> · Catch with <kbd>Enter</kbd>"
          : "or press <kbd>Space</kbd> to catch";
    $("field-help").textContent =
      w === 3 && s === 1
        ? "Choose COS and SIN signs to catch the mouse"
        : w === 0
          ? state.mode === "rush"
            ? "Avoid the three moving bees · click a bush to aim"
            : "Click a bush to aim your paw"
          : w === 4
            ? "Click or swipe an answer mouse • Space to catch"
            : w === 2
              ? "Choose COS or SIN • WASD to move"
              : w === 1
                ? "WASD / arrow keys to move • Enter near a mouse or box"
                : "WASD to explore • Enter near a box to search";
    updateSelection();
  }
  function renderClues() {
    // Refresh the ordered-clue prompt and progress indicators.
    const z = state.question,
      a = z.seq[state.clue],
      n = q(a),
      count = z.seq.length;
    $("clue-progress").innerHTML =
      `<div class="clue-pills">${Array.from({ length: count }, (_, i) => `<span class="${i < state.clue ? "passed" : i === state.clue ? "active" : ""}">${i < state.clue ? "✓" : "Clue " + (i + 1)}</span>`).join("")}</div>`;
    const intro = `<strong>Clue ${state.clue + 1} of ${count}</strong><br>`;
    if (state.world === 1) {
      $("prompt").innerHTML =
        state.stage === 0
          ? intro +
            `Find the mouse where <strong>x ${n === 1 || n === 4 ? "&gt;" : "&lt;"} 0</strong> and <strong>y ${n <= 2 ? "&gt;" : "&lt;"} 0</strong>.`
          : intro +
            `Find the box in the quadrant containing <strong>${a}°</strong>.`;
    } else {
      $("prompt").innerHTML =
        intro +
        `Go where <strong>cos θ is ${n === 1 || n === 4 ? "positive" : "negative"}</strong> and <strong>sin θ is ${n <= 2 ? "positive" : "negative"}</strong>.`;
    }
  }
  function drawBoard() {
    // Render the unit-circle board, labels, and angle or coordinate grid.
    const { world: w, stage: s } = state;
    let b = "";
    if ((w === 1 || w === 3) && s === 0)
      b =
        '<g opacity=".18" pointer-events="none"><path d="M450 350L670 350A220 220 0 0 0 450 130Z" fill="#e6ba85"/><path d="M450 350L450 130A220 220 0 0 0 230 350Z" fill="#bad8e6"/><path d="M450 350L230 350A220 220 0 0 0 450 570Z" fill="#d4bddb"/><path d="M450 350L450 570A220 220 0 0 0 670 350Z" fill="#eadb91"/></g>';
    if (w !== 4) {
      b +=
        '<circle cx="450" cy="350" r="220" fill="none" stroke="#89a46a" stroke-width="2" stroke-dasharray="5 8" opacity=".5"/><path d="M178 350H722M450 82V618" stroke="#88a66d" stroke-width="1.8" opacity=".55"/><path d="m715 344 8 6-8 6m-271-268 6-8 6 8" fill="none" stroke="#7c9c64" stroke-width="2"/><text x="732" y="355" class="axis-text">x</text><text x="445" y="73" class="axis-text">y</text>';
      if (w === 3)
        b +=
          '<g aria-label="Safe area"><circle cx="450" cy="350" r="65" fill="#f5ecd5" fill-opacity=".68" stroke="#ba9475" stroke-width="2" stroke-dasharray="5 5"/><text x="450" y="415" text-anchor="middle" fill="#795a48" style="font:600 13px Outfit,sans-serif;letter-spacing:1px">SAFE AREA</text></g>';
      if (w === 2)
        for (let n = -2; n <= 2; n++) {
          const d = n * 110;
          if (n)
            b += `<path d="M${450 + d} 132V568M230 ${350 + d}H670" stroke="#9cb582" stroke-width="1" opacity=".3"/>`;
        }
      if (w === 1 || w === 3)
        for (let n = 1; n <= 4; n++) {
          const p = qpos(n);
          if (s === 0)
            b += `<text x="${p.x}" y="${p.y - 48}" text-anchor="middle" class="q-label">Q${roman[n]}</text><text x="${p.x}" y="${p.y - 27}" text-anchor="middle" class="q-sub">${n === 1 || n === 4 ? "x +" : "x −"} · ${n <= 2 ? "y +" : "y −"}</text>`;
        }
      if (w === 0) {
        for (const a of ANGLES) {
          const p = pos(a),
            t = pos(a, 261);
          b += `<g class="angle-point" data-angle="${a}" role="button" tabindex="0" aria-label="Aim at ${a} degrees"><circle class="angle-ring" cx="${p.x}" cy="${p.y - 3}" r="31"/><use href="#bush" transform="translate(${p.x} ${p.y}) scale(.72)"/>${state.mode !== "rush" && (s === 0 || (s === 1 && a % 90 === 0)) ? `<text x="${t.x}" y="${t.y + 5}" text-anchor="middle" class="angle-text">${a}°</text>` : ""}</g>`;
        }
        b +=
          '<circle cx="450" cy="350" r="55" fill="#e5edc8" stroke="#b9ce96" stroke-dasharray="3 6"/><path d="M507 350A57 57 0 0 0 499 321" fill="none" stroke="#a4b887" stroke-width="2"/><text x="505" y="328" class="axis-text">θ</text>';
      }
    } else {
      b +=
        '<path d="M190 493Q450 600 710 493" fill="none" stroke="#a8bc7e" stroke-width="2" stroke-dasharray="5 8"/><text x="450" y="613" text-anchor="middle" class="axis-text" style="font-size:13px;letter-spacing:2px">THE ANSWER IS ON THE MOVE</text>';
    }
    $("board").innerHTML = b;
    document.querySelectorAll("[data-angle]").forEach((el) => {
      const f = () => {
        if (!state.active || state.busy) return;
        state.cursorFacing = false;
        state.selected = +el.dataset.angle;
        document
          .querySelectorAll("[data-angle]")
          .forEach((x) => x.classList.toggle("selected", x === el));
        updateSelection();
        drawAim();
        updateCat();
      };
      el.onclick = f;
      el.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.stopPropagation();
          f();
        }
      };
    });
    drawEntities();
    drawAim();
    updateCat();
  }
  function drawEntities() {
    // Place mice, boxes, targets, answer mice, and obstacles in the board.
    const { world: w, stage: s, question: z } = state;
    let e = "";
    if (w === 1 || w === 3) {
      for (let n = 1; n <= 4; n++) {
        if (w === 3 && s === 1) continue;
        const p = qpos(n),
          visibleMouse = w === 1 && s === 0,
          kind = visibleMouse ? "mouse" : "box";
        e += `<g id="quadrant-${n}" class="field-entity" data-box="${n}" transform="translate(${p.x} ${p.y})" role="button" tabindex="0" aria-label="Walk to ${["", "upper right", "upper left", "lower left", "lower right"][n]} ${kind}"><use href="#${kind}"${visibleMouse ? ' transform="scale(1.25)"' : ""}/><text y="51" text-anchor="middle" class="q-sub">${s === 0 ? "Q" + roman[n] : "SEARCH"}</text></g>`;
      }
      if (w === 3 && s === 1) {
        const p = pos(z.a);
        e += `<use href="#mouse" transform="translate(${p.x} ${p.y})"/>`;
      }
    }
    if (w === 2) {
      e += `<g id="moving-mouse"><use href="#mouse"/><rect x="-30" y="-52" width="60" height="22" rx="7" class="speech"/><text y="-37" text-anchor="middle" class="axis-text">${z.a}°</text></g>`;
      if (s === 2) e += dog();
    }
    if ((w === 1 || w === 3) && s === 2) e += dog();
    if (w === 0 && (s === 2 || state.mode === "rush")) {
      const count = 3;
      for (let i = 0; i < count; i++)
        e += `<g id="${count === 1 ? "bee" : "bee-" + i}"><ellipse rx="17" ry="12" fill="#edc576"/><path d="M-5-11v22m10-22v22" stroke="#6c6754" stroke-width="5"/><ellipse cx="-6" cy="-15" rx="8" ry="11" fill="#fbf5dcbb" transform="rotate(-25)"/><ellipse cx="7" cy="-15" rx="8" ry="11" fill="#fbf5dcbb" transform="rotate(25)"/><circle cx="12" cy="-3" r="2" fill="#534f3d"/></g>`;
    }
    if (w === 4) {
      z.options.forEach((v, i) => {
        e += `<g id="value-${i}" class="value-mouse" data-answer="${i}" role="button" tabindex="0" aria-label="Catch answer ${v}"><use href="#mouse" transform="scale(1.3)"/></g>`;
      });
      if (s === 2)
        e +=
          '<g aria-hidden="true" pointer-events="none"><use href="#bush" transform="translate(370 285) scale(1.15)"/><use href="#bush" transform="translate(510 375) scale(1.15)"/></g>';
      z.options.forEach((v, i) => {
        e += `<g id="value-label-${i}" class="value-mouse" data-answer="${i}" aria-hidden="true"><rect x="-46" y="-74" width="92" height="38" rx="11" class="value-bg"/><text y="-49" text-anchor="middle" class="entity-label">${v}</text><path d="M0-36v10" stroke="#9a8d71" stroke-width="3"/></g>`;
      });
    }
    $("entities").innerHTML = e;
    document.querySelectorAll("[data-box]").forEach((el) => {
      const f = () => {
        if (!state.active || state.busy) return;
        state.moveTo = qpos(+el.dataset.box);
        toast("Move close, then press Enter or Catch.");
      };
      el.onclick = f;
      el.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          if (dist(state.cat, qpos(+el.dataset.box)) <= 66) catchMouse();
          else f();
        }
      };
    });
    document.querySelectorAll("[data-answer]").forEach((el) => {
      const f = () => {
        if (state.busy || !state.active) return;
        state.selected = +el.dataset.answer;
        document
          .querySelectorAll("[data-answer]")
          .forEach((x) =>
            x.classList.toggle(
              "selected",
              +x.dataset.answer === state.selected,
            ),
          );
        updateSelection();
        drawAim();
        catchMouse();
      };
      el.onclick = f;
      el.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          f();
        }
      };
    });
    animateEntities();
  }
  function dog() {
    return '<g id="dog"><ellipse cy="20" rx="28" ry="9" fill="#51714b" opacity=".2"/><ellipse cy="5" rx="24" ry="18" fill="#ae8061"/><path d="m-18-8-8-13 15-5m28 18 8-13-15-5" fill="#795946"/><ellipse cy="-8" rx="21" ry="17" fill="#c49870"/><ellipse cy="-1" rx="12" ry="9" fill="#e5c7a0"/><circle cx="-8" cy="-10" r="2.5" fill="#3b4739"/><circle cx="8" cy="-10" r="2.5" fill="#3b4739"/><ellipse cy="-3" rx="5" ry="3" fill="#5b4e41"/><path d="M-16 11h32" stroke="#9d778e" stroke-width="5"/><text y="-35" text-anchor="middle" class="axis-text">PATROL</text></g>';
  }
  function animateEntities() {
    const t = state.elapsed,
      w = state.world,
      s = state.stage;
    if (w === 0 && (s === 2 || state.mode === "rush")) {
      const rush = state.mode === "rush",
        count = 3;
      state.bees = Array.from(
        { length: count },
        (_, i) =>
          ANGLES[
            (Math.floor(t / (rush ? 0.5 : 5)) + 10 + i * 5) % ANGLES.length
          ],
      );
      state.bee = state.bees[0];
      state.bees.forEach((a, i) => {
        const p = pos(a);
        $("bee-" + i)?.setAttribute(
          "transform",
          `translate(${p.x} ${p.y - 25 + Math.sin(t * 5 + i) * 4})`,
        );
      });
    }
    if (w === 2) {
      if (s === 0) {
        state.target = pos(state.question.a, 175 + Math.min(t * 8, 42));
      }
      if (s === 2) {
        const offset = Math.floor(t / 4.5) % 4;
        const a = (state.question.a + offset * 90) % 360;
        state.target = pos(a);
        if (state.question.activeAngle !== a) {
          state.question.activeAngle = a;
          $("prompt").innerHTML =
            `Reach the mouse at <strong>${a}°</strong>. Use COS for x and SIN for y.<br>Watch for the patrolling dog!`;
        }
        $("moving-mouse")
          ?.querySelector("text")
          ?.replaceChildren(document.createTextNode(a + "°"));
        if (t % 4.5 > 3.5) $("moving-mouse")?.classList.add("pulse");
        else $("moving-mouse")?.classList.remove("pulse");
      }
      const p = state.target;
      $("moving-mouse")?.setAttribute(
        "transform",
        `translate(${p.x} ${p.y + Math.sin(t * 3) * 2})`,
      );
      updateProximityCue();
    }
    if (w === 1 && s === 0) {
      for (let n = 1; n <= 4; n++) {
        const p = qpos(n);
        $("quadrant-" + n)?.setAttribute(
          "transform",
          `translate(${p.x} ${p.y})`,
        );
      }
      updateProximityCue();
    }
    if ($("dog")) {
      const p = dogPosition();
      $("dog").setAttribute("transform", `translate(${p.x} ${p.y})`);
    }
    if (w === 4)
      state.question.options.forEach((_, i) => {
        const p = valuePosition(i);
        $("value-" + i)?.setAttribute("transform", `translate(${p.x} ${p.y})`);
        $("value-label-" + i)?.setAttribute(
          "transform",
          `translate(${p.x} ${p.y})`,
        );
      });
  }
  function dogPosition() {
    if (state.world === 2) {
      const t = state.elapsed,
        step = Math.floor(t / 4.5),
        blend = Math.min(1, (t % 4.5) / 1.2),
        old = pos(state.question.a + Math.max(0, step - 1) * 90, 155),
        next = pos(state.question.a + step * 90, 155);
      return {
        x: old.x + (next.x - old.x) * blend + Math.sin(t * 1.2) * 38,
        y: old.y + (next.y - old.y) * blend + Math.cos(t * 1.2) * 38,
      };
    }
    return {
      x: 450 + Math.sin(state.elapsed * 0.7) * 205,
      y: state.world === 2 ? 425 : 350 + Math.cos(state.elapsed * 0.7) * 115,
    };
  }
  function valuePosition(i) {
    const n = state.question.options.length,
      s = state.stage,
      t = state.elapsed;
    if (s === 2) {
      const phase = (t / 4) % n,
        step = Math.floor(phase),
        f = phase - step,
        ease = (1 - Math.cos(Math.PI * f)) / 2,
        from = (i + step) % n,
        to = (from + 1) % n;
      return {
        x: 230 + 140 * (from + (to - from) * ease),
        y: i % 2 === 0 ? 285 : 375,
      };
    }
    return {
      x: 240 + i * (420 / (n - 1)) + (s ? Math.sin(t * 0.45 + i * 2) * 28 : 0),
      y: 300 + Math.cos(i * 2) * 42 + (s ? Math.cos(t * 0.5 + i) * 25 : 0),
    };
  }
  function valueHidden(i) {
    if (state.world !== 4 || state.stage !== 2) return false;
    const p = valuePosition(i);
    return [
      { x: 370, y: 285 },
      { x: 510, y: 375 },
    ].some((b) => Math.abs(p.x - b.x) < 32 && Math.abs(p.y - b.y) < 22);
  }
  function updateCat() {
    // Update the cat position and facing direction in the SVG field.
    const c = state.cat;
    if (state.world === 0 && state.selected !== null && !state.cursorFacing)
      state.targetTurn = 90 - state.selected;
    const turn = ` rotate(${state.catTurn || 0})`;
    $("cat").setAttribute("transform", `translate(${c.x} ${c.y})${turn}`);
    if (state.world === 2) updateSelection();
    updateAxisCue();
    updateProximityCue();
  }
  function updateAxisCue() {
    const cue = $("axis-cue");
    if (!cue) return;
    if (state.world !== 2 || !state.axis) {
      cue.innerHTML = "";
      return;
    }
    const c = state.cat;
    const shape =
      state.axis === "cos"
        ? "M-74 0h24M50 0h24 M-67-6l-7 6 7 6 M67-6l7 6-7 6"
        : "M0-72v20M0 50v22 M-6-65l6-7 6 7 M-6 65l6 7 6-7";
    cue.innerHTML = `<path d="${shape}" transform="translate(${c.x} ${c.y})" fill="none" stroke="#a55c45" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".88"/>`;
  }
  function updateProximityCue() {
    const cue = $("proximity-cue");
    if (!cue) return;
    if (state.world === 3 && state.stage === 1) {
      cue.innerHTML = "";
      $("catch").hidden = true;
      return;
    }
    if (![1, 2, 3].includes(state.world) || !state.active || state.busy) {
      cue.innerHTML = "";
      $("catch").hidden = false;
      return;
    }
    const near =
      state.world === 2
        ? dist(state.cat, state.target) <= 59
        : [1, 2, 3, 4].some((n) => dist(state.cat, qpos(n)) <= 66);
    if (state.world === 2) {
      $("catch").hidden = !near;
      cue.innerHTML = near
        ? `<g transform="translate(${state.cat.x} ${Math.max(35, state.cat.y - 67)})"><rect x="-50" y="-18" width="100" height="30" rx="10" fill="#fffaf0"/><text y="2" text-anchor="middle" class="axis-text">CATCH!</text></g>`
        : "";
      return;
    }
    $("catch").hidden = false;
    if (!near) {
      cue.innerHTML = "";
      $("field-help").textContent =
        "WASD / arrow keys to move • Enter near a mouse or box";
      return;
    }
    const x = Math.max(72, Math.min(828, state.cat.x)),
      y = Math.max(35, state.cat.y - 67);
    cue.innerHTML = `<g transform="translate(${x} ${y})"><rect x="-68" y="-18" width="136" height="30" rx="10" fill="#fffaf0" stroke="#b78c6a" stroke-width="2"/><text y="2" text-anchor="middle" fill="#80543a" style="font:600 12px Outfit, sans-serif">ENTER / CATCH</text></g>`;
    $("field-help").textContent = "In range! Press Enter or Catch.";
  }
  function drawAim() {
    let target = null;
    if (state.world === 0 && state.selected !== null)
      target = pos(state.selected);
    if (state.world === 4 && state.aimPointer) target = state.aimPointer;
    else if (state.world === 4 && state.selected !== null)
      target = valuePosition(state.selected);
    if (!target) {
      $("aim").innerHTML = "";
      return;
    }
    const c = state.cat,
      dx = target.x - c.x,
      dy = target.y - c.y,
      n = Math.hypot(dx, dy) || 1,
      x = c.x + (dx / n) * 48,
      y = c.y + (dy / n) * 48;
    const a = (Math.atan2(dy, dx) * 180) / Math.PI;
    $("aim").innerHTML =
      `<path d="M${x} ${y}L${target.x} ${target.y}" stroke="#bc6d53" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 8" opacity=".65"/><g transform="translate(${x + (dx / n) * 16} ${y + (dy / n) * 16}) rotate(${a})"><path d="m-5-7 10 7-10 7" fill="none" stroke="#ae5f47" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>${state.world === 4 && state.aimPointer ? `<g transform="translate(${target.x} ${target.y})" fill="#a85e49" opacity=".85"><ellipse cy="4" rx="9" ry="7"/><circle cx="-8" cy="-6" r="3.5"/><circle cx="0" cy="-9" r="3.5"/><circle cx="8" cy="-6" r="3.5"/></g>` : ""}`;
  }
  function updateSelection() {
    const w = state.world;
    $("selection-label").textContent =
      w === 2 ? "YOUR POSITION" : w === 1 || w === 3 ? "EXPLORING" : "YOUR AIM";
    $("selection-value").textContent =
      w === 0
        ? state.selected === null
          ? "Choose an angle"
          : state.selected + "°"
        : w === 4
          ? state.selected === null
            ? "Choose a mouse"
            : state.question.options[state.selected]
          : w === 2
            ? `(${((state.cat.x - 450) / 220).toFixed(2)}, ${((350 - state.cat.y) / 220).toFixed(2)})`
            : w === 3 && state.stage === 1
              ? `COS ${state.signCos || "?"} · SIN ${state.signSin || "?"}`
              : w === 1 && state.stage === 0
                ? "Find the right mouse"
                : "Find the right box";
  }
  function updateTimer() {
    // Render the remaining Challenge time and urgent-time state.
    const el = $("challenge-timer"),
      timed = isTimedChallenge();
    el.hidden = !timed;
    if (!timed) return;
    const seconds = Math.max(0, Math.ceil(state.timeLeft));
    $("timer-value").textContent =
      `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    el.classList.toggle("urgent", seconds <= 10);
    el.setAttribute("aria-label", `Time remaining: ${seconds} seconds`);
  }
  function updateHUD() {
    updateTimer();
    $("hearts").textContent = Array.from({ length: 3 }, (_, i) =>
      i < state.hearts ? "♥" : "♡",
    ).join(" ");
    $("hearts").setAttribute("aria-label", state.hearts + " hearts");
    $("score").textContent = String(state.score).padStart(3, "0");
    $("coins").textContent = saved.coins;
  }
  function setSign(which, sign) {
    if (!["Cos", "Sin"].includes(which) || !["+", "−"].includes(sign)) return;
    state["sign" + which] = sign;
    document
      .querySelectorAll(`[data-sign="${which}"]`)
      .forEach((b) => b.classList.toggle("selected", b.dataset.value === sign));
    document.querySelectorAll(`[data-sign-drop="${which}"]`).forEach((drop) => {
      drop.textContent = sign;
      drop.classList.add("filled");
    });
    updateSelection();
    if (
      state.world === 3 &&
      state.stage === 1 &&
      state.signCos &&
      state.signSin &&
      state.active &&
      !state.busy
    ) {
      if (
        state.signCos === state.question.cos &&
        state.signSin === state.question.sin
      ) {
        success(
          pos(state.question.a),
          `COS ${state.signCos} · SIN ${state.signSin}`,
        );
      } else {
        wrong(
          "Check the quadrant: COS follows x and SIN follows y. Choose both signs again.",
        );
        state.signCos = null;
        state.signSin = null;
        document
          .querySelectorAll("[data-sign]")
          .forEach((b) => b.classList.remove("selected"));
        document.querySelectorAll("[data-sign-drop]").forEach((d) => {
          d.textContent = "?";
          d.classList.remove("filled");
        });
        updateSelection();
      }
    }
  }
  function selectAxis(axis) {
    if (state.busy || !state.active) return;
    state.axis = axis;
    state.moveTo = null;
    updateCat();
    document
      .querySelectorAll("[data-axis]")
      .forEach((b) => b.classList.toggle("selected", b.dataset.axis === axis));
    const expected = state.question.a % 180 === 0 ? "cos" : "sin";
    if (state.world === 2 && state.stage === 0 && axis !== expected) {
      state.axisLockUntil = state.elapsed + 1;
      toast(
        "That axis does not follow the mouse. COS is horizontal; SIN is vertical.",
      );
      return;
    }
    state.axisLockUntil = 0;
    toast(
      axis === "cos"
        ? "COS selected: use A / D to move horizontally."
        : "SIN selected: use W / S to move vertically.",
    );
  }
  function wrong(message) {
    if (state.world === 3) {
      state.cat = { x: 450, y: 350 };
      state.moveTo = null;
      keys.clear();
      updateCat();
    }
    state.attempts++;
    state.streak = 0;
    saved.attempts++;
    if (state.stage !== 0 || state.mode === "rush") state.hearts--;
    save();
    updateHUD();
    beep(false);
    toast(
      message +
        (state.stage === 0 && state.mode !== "rush"
          ? " Keep trying — no hearts lost."
          : ""),
      true,
    );
    if (state.hearts <= 0) {
      state.active = false;
      (() => {
        const thisRun = runId;
        setTimeout(() => {
          if (thisRun === runId) showResult(false);
        }, 450);
      })();
    }
  }
  function showSignArrows(n) {
    const layer = $("hint-arrows"),
      x = n === 1 || n === 4 ? 1 : -1,
      y = n <= 2 ? -1 : 1,
      token = ++state.hintToken,
      run = runId;
    layer.innerHTML = `<g transform="translate(450 350)" fill="none" stroke="#c36549" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M0 0h${x * 115}m${-x * 14} -10l${x * 14} 10 ${-x * 14} 10"/><path d="M0 0v${y * 115}m-10 ${-y * 14}l10 ${y * 14} 10 ${-y * 14}"/></g><text x="${450 + x * 132}" y="355" text-anchor="middle" fill="#9e4e37" style="font:700 16px Outfit,sans-serif">X / COS ${x > 0 ? "+" : "−"}</text><text x="450" y="${350 + y * 132}" text-anchor="middle" fill="#9e4e37" style="font:700 16px Outfit,sans-serif">Y / SIN ${y < 0 ? "+" : "−"}</text>`;
    setTimeout(() => {
      if (run === runId && state.hintToken === token) layer.innerHTML = "";
    }, 3500);
  }
  function catchMouse() {
    // Validate the player's current selection and complete or reject the catch.
    if (!state.active || state.busy || $("modal").open) return;
    const { world: w, stage: s, question: z } = state;
    if (w === 0) {
      if (state.selected === null) {
        toast("Choose a bush around the circle first.");
        return;
      }
      if (
        (s === 2 || state.mode === "rush") &&
        (state.bees || [state.bee]).includes(state.selected)
      ) {
        wrong("That bush has a bee! Wait for it to move.");
        return;
      }
      if (state.selected !== z.a) {
        wrong(
          "No mouse here. Start at 0° on the right and check your direction.",
        );
        return;
      }
      success(pos(z.a));
      return;
    }
    if (w === 4) {
      if (state.selected === null) {
        toast("Aim at an answer mouse first.");
        return;
      }
      if (valueHidden(state.selected)) {
        toast("That mouse is behind a bush. Wait until it comes out.");
        return;
      }
      if (z.options[state.selected] !== z.answer) {
        wrong("Check the reference angle and the sign of the function.");
        return;
      }
      success(valuePosition(state.selected));
      return;
    }
    if (w === 2) {
      if (!state.axis) {
        toast("Choose COS or SIN before moving.");
        return;
      }
      if (dist(state.cat, state.target) > 59) {
        if (s === 2) {
          state.cat = { x: 450, y: 350 };
          state.moveTo = null;
          updateCat();
          wrong("Missed the mouse. Return to the centre and try again.");
        } else toast("A little closer! Move toward the mouse, then catch.");
        return;
      }
      success(state.target);
      return;
    }
    const nearest = [1, 2, 3, 4]
      .map((n) => ({ n, p: qpos(n) }))
      .sort((a, b) => dist(a.p, state.cat) - dist(b.p, state.cat))[0];
    if (dist(nearest.p, state.cat) > 66) {
      toast(
        state.world === 1 && state.stage === 0
          ? "Get closer to a mouse, then press Enter or Catch."
          : "Get closer to a box, then press Enter or Catch.",
      );
      return;
    }
    const target = z.seq ? q(z.seq[state.clue]) : z.q;
    if (nearest.n !== target) {
      if (w === 1 && s === 0) {
        const side = [
          "",
          "upper-right",
          "upper-left",
          "lower-left",
          "lower-right",
        ][target];
        wrong(
          `Not this mouse. Quadrant ${roman[target]} is in the ${side} area.`,
        );
      } else {
        wrong("An empty box! Check the clue and the quadrant’s signs.");
        if (w === 3 && s === 0) showSignArrows(target);
      }
      return;
    }
    if (w === 3 && s === 1) {
      if (!state.signCos || !state.signSin) {
        toast("Choose a sign for both COS and SIN first.");
        return;
      }
      if (state.signCos !== z.cos || state.signSin !== z.sin) {
        wrong("Try the signs again: COS follows x and SIN follows y.");
        return;
      }
    }
    if (z.seq && state.clue < z.seq.length - 1) {
      state.clue++;
      renderClues();
      toast("Clue found! Follow the next clue.");
      beep();
      return;
    }
    const detail =
      w === 3
        ? `QI–IV signs: cos ${nearest.n === 1 || nearest.n === 4 ? "+" : "−"}, sin ${nearest.n <= 2 ? "+" : "−"}`
        : null;
    success(nearest.p, detail);
  }
  function success(p, detail = null) {
    // Award points/rewards, animate success, and advance or complete the mission.
    if (isTimedChallenge()) state.timeLeft += 5;
    state.hintToken++;
    $("hint-arrows").innerHTML = "";
    const thisRun = runId;
    state.busy = true;
    state.moveTo = null;
    keys.clear();
    const first = state.attempts === 0;
    state.streak++;
    saved.bestStreak = Math.max(saved.bestStreak || 0, state.streak);
    const combo = state.streak % 3 === 0;
    let earned =
      10 + (first ? 5 : 0) + (state.hinted ? 0 : 5) + (combo ? 5 : 0);
    state.score += earned;
    saved.coins +=
      2 + (first ? 1 : 0) + (state.hinted ? 0 : 1) + (combo ? 1 : 0);
    saved.total++;
    saved.attempts++;
    if (first) saved.first++;
    save();
    updateHUD();
    beep();
    $("effects").innerHTML =
      `<g transform="translate(${p.x} ${p.y})"><use href="#mouse"/><text y="-42" text-anchor="middle" fill="#985b3e" style="font:600 28px Outfit,sans-serif">+${earned} ✦</text><circle r="48" fill="none" stroke="#fff4c1" stroke-width="4" class="pulse"/></g>`;
    const original = { ...state.cat },
      begin = performance.now();
    function pounce(t) {
      if (thisRun !== runId) return;
      const k = Math.min((t - begin) / 260, 1),
        wave = Math.sin(k * Math.PI);
      state.cat = {
        x: original.x + (p.x - original.x) * wave,
        y: original.y + (p.y - original.y) * wave - wave * 28,
      };
      updateCat();
      if (k < 1) requestAnimationFrame(pounce);
    }
    requestAnimationFrame(pounce);
    toast(
      `${detail ? detail + " · " : ""}Mouse found! +${earned} points${isTimedChallenge() ? " · +5 seconds" : ""}${combo ? " · Three-mouse combo!" : ""}`,
    );
    setTimeout(() => {
      if (!state.active || thisRun !== runId) return;
      $("effects").innerHTML = "";
      state.mission++;
      if (state.mode === "rush") {
        if (state.mission % 3 === 0) {
          const accessible = WORLDS.map((_, i) => i).filter(
            (i) => i * 3 < saved.unlocked,
          );
          state.world = sample(accessible);
          state.stage = Math.min(2, Math.floor(state.mission / 5));
          $("world-title").innerHTML =
            WORLDS[state.world].name + "<span>✦</span>";
          $("location").textContent = WORLDS[state.world].place;
          renderNav();
        }
        newMission();
      } else if (state.mission >= missionCount()) {
        state.active = false;
        const level = state.world * 3 + state.stage + 1;
        saved.stars[level] = Math.max(saved.stars[level] || 0, state.hearts);
        saved.best[level] = Math.max(saved.best[level] || 0, state.score);
        saved.unlocked = Math.max(saved.unlocked, Math.min(15, level + 1));
        save();
        renderNav();
        showResult(true);
      } else newMission();
    }, 1000);
  }
  function hint() {
    // Show a world-specific hint and mark that this mission used a hint.
    if (state.hinted) {
      $("hint-content").hidden = !$("hint-content").hidden;
      return;
    }
    state.hinted = true;
    saved.hints++;
    save();
    const w = state.world,
      s = state.stage;
    const text =
      w === 0
        ? "Start at 0° on the right. Counterclockwise turns add to your angle; clockwise turns subtract. Add 360° if your result is negative."
        : w === 1
          ? "Quadrants are counted counterclockwise: I, II, III, IV. Compare the angle with the 90°, 180°, and 270° boundaries. An axis itself belongs to no quadrant."
          : w === 2
            ? "COS controls x (left and right), and SIN controls y (up and down). On the unit circle, x = cos θ and y = sin θ. Use the angle and quadrant to estimate each coordinate, then switch axes to reach the mouse."
            : w === 3
              ? "COS has the same sign as x; SIN has the same sign as y. Positive x means right, positive y means up. Combine the two directions to narrow your search."
              : "First fold the angle toward the nearest x-axis to find its reference angle. Use the magnitude for that basic angle, then apply the sign for the quadrant. For tan, divide sin by cos.";
    $("hint-content").textContent = text;
    $("hint-content").hidden = false;
  }
  function openModal(html) {
    // Pause movement and open a native dialog with the supplied content.
    keys.clear();
    state.moveTo = null;
    $("modal-content").innerHTML = html;
    $("modal").showModal();
    document
      .querySelector(".close-modal")
      ?.addEventListener("click", () => $("modal").close());
  }
  function modalTop(label) {
    return `<div class="modal-top"><span class="eyebrow">${label}</span><button class="close-modal" aria-label="Close dialog">×</button></div>`;
  }
  function showGuide() {
    // Build and display the field guide for the active World/Level.
    const w = state.world,
      s = state.stage;
    let steps = [];
    if (w === 0)
      steps = [
        "Read the mission. All angles start at <strong>0° on the right</strong> and grow counterclockwise.",
        "Click a bush to aim, then press <strong>Space</strong> or <strong>Catch the mouse</strong>.",
        s === 2
          ? "Three bees change bushes every <strong>5 seconds</strong>. If a bee blocks your target, wait before catching."
          : `Find ${missionCount()} mice to complete the level. Learn levels let you try again without losing hearts.`,
      ];
    if (w === 1 || w === 3)
      steps = [
        "Use <strong>WASD / arrow keys</strong> to walk anywhere in the field. You can also click a mouse or box to walk toward it.",
        "Read the clue, walk close to the correct mouse or box, then press <strong>Enter</strong> or <strong>Catch</strong>.",
        s === 2
          ? "Each mouse has <strong>three clues</strong>. Search one box per clue, in order. The mouse appears after the third. Avoid the patrolling dog."
          : w === 3 && s === 1
            ? "Drag + or − to <strong>COS and SIN</strong>, or click each sign. Once both are selected, the answer is checked automatically."
            : "Quadrants go counterclockwise from the upper right: <strong>I, II, III, IV</strong>. Axes are not quadrants.",
      ];
    if (w === 2)
      steps = [
        "The cat starts facing forward. Choose <strong>COS (C)</strong> for horizontal movement or <strong>SIN (V)</strong> for vertical movement.",
        "After choosing an axis, a line appears beside the cat. Use <strong>A / D</strong> for COS or <strong>W / S</strong> for SIN. Switch axes whenever you need.",
        "Move close to the mouse and press <strong>Enter</strong> or <strong>Space</strong> to catch. You can also swipe near the mouse." +
          (s === 2
            ? " The mouse moves every <strong>4–5 seconds</strong> and flashes before moving. Avoid the dog."
            : ""),
      ];
    if (w === 4)
      steps = [
        "Work out the exact value of the function in your mission." +
          (s > 0
            ? " Find the <strong>reference angle</strong> (the acute angle to the x-axis), then use the quadrant to choose the sign. Example: 210° has a 30° reference angle."
            : ""),
        "Click or swipe the answer mouse to pounce. You can also use <strong>Space</strong> or <strong>Catch the mouse</strong>.",
        s === 2
          ? "<strong>tan θ = sin θ / cos θ.</strong> Example: tan 225° = (−√2/2) / (−√2/2) = 1. The mice swap places every 4 seconds, and sometimes hide behind bushes. Wait for a clear shot. Use Hint for the method or open the Reference Table if you get stuck."
          : "Mice " +
            (s === 0
              ? "stay still so you can think."
              : "move gently so you can track their answer signs.") +
            ` Catch ${missionCount()} correct answers.`,
      ];
    if (w === 3)
      steps.push(
        "The circle at the centre is the <strong>Safe Area</strong>. The dog cannot catch you inside it. An incorrect search returns you there.",
      );
    if (isTimedChallenge())
      steps.push(
        `You have <strong>${CHALLENGE_SECONDS[w]} seconds for the whole level</strong>. Each mouse caught adds <strong>5 seconds</strong>. The clock pauses while a guide or menu is open. If time runs out, the level ends.`,
      );
    if (w === 4 && s === 0)
      steps.push(
        "At 0°, sin = 0 and cos = 1. At 90°, sin = 1 and cos = 0. Open the reference table to explore the other basic angles.",
      );
    openModal(
      modalTop("A LITTLE FIELD GUIDE") +
        `<h2 class="modal-title">${WORLDS[w].titles[s]}</h2><p class="modal-copy">${s === 0 ? "A safe place to be curious. Mistakes cost no hearts." : `Three hearts. ${missionCount()} ${missionCount() === 1 ? "mouse" : "mice"}. One clever cat.`}</p>` +
        steps
          .map(
            (t, i) =>
              `<div class="guide-step"><span>${i + 1}</span><div>${t}</div></div>`,
          )
          .join("") +
        `<div class="modal-actions"><button class="catch-button" id="guide-play">Let’s explore <span>✦</span></button>${w === 4 ? '<button class="secondary" id="table-button">Reference table</button>' : ""}</div>`,
    );
    $("guide-play").onclick = () => $("modal").close();
    if ($("table-button")) $("table-button").onclick = showTable;
  }
  function showTable() {
    state.hinted = true;
    saved.hints++;
    save();
    openModal(
      modalTop("REFERENCE TABLE") +
        '<h2 class="modal-title">Little angles, exact values.</h2><p class="modal-copy">For other quadrants, use the reference angle and apply the correct sign.</p><table class="value-table"><thead><tr><th>θ</th><th>sin θ</th><th>cos θ</th><th>tan θ</th></tr></thead><tbody>' +
        [0, 30, 45, 60, 90]
          .map(
            (a) =>
              `<tr><td>${a}°</td><td>${val("sin", a)}</td><td>${val("cos", a)}</td><td>${a === 90 ? "undefined" : val("tan", a)}</td></tr>`,
          )
          .join("") +
        "</tbody></table>",
    );
  }
  function showMap() {
    openModal(
      modalTop("YOUR ADVENTURE") +
        '<h2 class="modal-title">Small steps. Wonderful places.</h2><p class="modal-copy">Five worlds, fifteen levels. Complete each level to open the next.</p><div class="world-map-grid">' +
        WORLDS.map(
          (w, i) =>
            `<div class="map-world"><span class="world-icon">${w.icon}</span><div><h3>${w.name}</h3><p>${w.topic}</p></div><div class="map-levels">${[
              0, 1, 2,
            ]
              .map((s) => {
                const n = i * 3 + s + 1;
                return `<button data-map-level="${n}" ${n > saved.unlocked && !explore ? "disabled" : ""} title="${["Learn", "Practice", "Challenge"][s]}">${s + 1}<small>${saved.stars[n] ? "★".repeat(saved.stars[n]) : "·"}</small></button>`;
              })
              .join("")}</div></div>`,
        ).join("") +
        '</div><label class="explore-toggle"><input id="explore" type="checkbox" ' +
        (explore ? "checked" : "") +
        "> Free explore · preview any level in this prototype</label>",
    );
    $("explore").onchange = (e) => {
      explore = e.target.checked;
      $("modal").close();
      renderNav();
      showMap();
    };
    document.querySelectorAll("[data-map-level]").forEach(
      (b) =>
        (b.onclick = () => {
          const n = +b.dataset.mapLevel - 1;
          start(Math.floor(n / 3), n % 3);
        }),
    );
  }
  function showResult(win) {
    if (
      win &&
      state.mode === "story" &&
      allLevelsComplete() &&
      saved.post === null
    ) {
      showAssessmentIntro("post", true);
      return;
    }
    if (state.mode === "rush") {
      saved.rushBest = Math.max(saved.rushBest, state.score);
      save();
    }
    openModal(
      modalTop(
        state.mode === "rush"
          ? "MOUSE RUSH"
          : win
            ? "LEVEL COMPLETE"
            : "A LITTLE PAUSE",
      ) +
        `<div class="big-stars">${win ? "★".repeat(state.hearts) + "☆".repeat(3 - state.hearts) : "♡"}</div><h2 class="modal-title">${win ? "You’ve earned your whiskers." : "Every explorer tries again."}</h2><p class="modal-copy">${win ? (state.world === 4 && state.stage === 2 ? "All five worlds explored! Take your post-test in the learning journal to see how far you’ve come." : `${missionCount()} clever ${missionCount() === 1 ? "mouse" : "mice"} found. A little more math discovered.`) : state.mode === "rush" ? `You caught ${state.mission} mice. Your best Mouse Rush score is ${saved.rushBest}.` : state.failureReason === "time" ? "Time is up. Try the level again and catch mice to earn extra time." : "Your hearts ran out, but your curiosity doesn’t have to. Try the level again."}</p><div class="result-stats"><span>LEVEL SCORE<strong>${state.score}</strong></span><span>MICE CAUGHT<strong>${state.mission}</strong></span><span>FISH COINS<strong>${saved.coins}</strong></span></div><div class="modal-actions"><button class="catch-button" id="result-next">${win ? "Keep exploring" : "Try again"} <span>✦</span></button><button class="secondary" id="result-map">World map</button></div>`,
    );
    $("result-next").onclick = () => {
      if (!win) {
        start(state.world, state.stage, state.mode);
        return;
      }
      let level = state.world * 3 + state.stage + 1;
      if (level >= 15) {
        showMap();
        return;
      }
      start(Math.floor(level / 3), level % 3);
    };
    $("result-map").onclick = showMap;
  }
  function showJournal() {
    const accuracy = saved.total
      ? Math.round((saved.first / saved.total) * 100)
      : 0;
    openModal(
      modalTop("YOUR LEARNING JOURNAL") +
        '<h2 class="modal-title">Look how far you’ve wandered.</h2>' +
        `<div class="journal-stats"><div class="journal-stat"><strong>${Object.keys(saved.stars).length} / 15</strong>LEVELS COMPLETED</div><div class="journal-stat"><strong>${accuracy}%</strong>FIRST-TRY ACCURACY</div><div class="journal-stat"><strong>${saved.hints}</strong>HINTS USED</div><div class="journal-stat"><strong>${saved.total}</strong>MICE FOUND</div><div class="journal-stat"><strong>${Object.values(saved.stars).reduce((a, b) => a + b, 0)}</strong>STARS COLLECTED</div><div class="journal-stat"><strong>${saved.rushBest}</strong>MOUSE RUSH BEST</div></div><p class="modal-copy">Pre-test: <strong>${saved.pre === null ? "Not taken" : scoreText("pre")}</strong> · Post-test: <strong>${saved.post === null ? "Not taken" : scoreText("post")}</strong>${saved.pre !== null && saved.post !== null ? ` · Improvement: ${comparisonPoints() >= 0 ? "+" : ""}${comparisonPoints()} percentage points` : ""}</p><div class="modal-actions"><button class="secondary" id="pre-test">Take pre-test</button><button class="secondary" id="post-test">Take post-test</button></div><div class="modal-actions"><button class="secondary" id="open-skin-collection">Preview cat skins</button></div>`,
    );
    $("open-skin-collection").onclick = showSkins;
    $("pre-test").onclick = () => showAssessmentIntro("pre");
    $("post-test").onclick = () => showAssessmentIntro("post");
    document
      .querySelectorAll("[data-skin]")
      .forEach(
        (b) => (b.onclick = () => equipSkin(b.dataset.skin, showJournal)),
      );
  }
  const SKINS = [
    { id: "ginger", name: "Ginger", color: "#ef9c45", price: 0 },
    {
      id: "cloud",
      name: "Cloud",
      color: "#bcbcc5",
      price: 10,
      levels: [1, 2, 3],
    },
    {
      id: "violet",
      name: "Lavender",
      color: "#b49bd0",
      price: 10,
      levels: Array.from({ length: 15 }, (_, i) => i + 1),
    },
    { id: "rose", name: "Strawberry", color: "#ee9fae", price: 20 },
    { id: "mint", name: "Mint Mochi", color: "#8bc6ad", price: 25 },
    { id: "blue", name: "Blueberry", color: "#93b9df", price: 30 },
    { id: "cocoa", name: "Cocoa", color: "#ad8069", price: 25 },
    { id: "peach", name: "Peach", color: "#f3bc91", levels: [4, 5, 6] },
    { id: "lemon", name: "Lemon Cream", color: "#e4cd73", levels: [7, 8, 9] },
    { id: "sakura", name: "Sakura", color: "#d6a3cf", levels: [10, 11, 12] },
  ];
  function applySkin() {
    const skin = SKINS.find((x) => x.id === saved.skin) || SKINS[0];
    document.documentElement.style.setProperty("--cat-color", skin.color);
  }
  const quizBank = [
    {
      p: "Which direction is 90° from the positive x-axis?",
      o: ["Up", "Right", "Down", "Left"],
      a: 0,
    },
    {
      p: "Which quadrant contains 150°?",
      o: ["QI", "QII", "QIII", "QIV"],
      a: 1,
    },
    {
      p: "Which function gives the x-coordinate on the unit circle?",
      o: ["sin θ", "cos θ", "tan θ", "None"],
      a: 1,
    },
    {
      p: "In QIII, what are the signs of cos θ and sin θ?",
      o: ["+, +", "+, −", "−, +", "−, −"],
      a: 3,
    },
    { p: "What is sin 30°?", o: ["1/2", "√2/2", "√3/2", "1"], a: 0 },
    {
      p: "Starting at 0°, which direction is 270°?",
      o: ["Up", "Right", "Down", "Left"],
      a: 2,
    },
    {
      p: "A point with x > 0 and y < 0 lies in which quadrant?",
      o: ["QI", "QII", "QIII", "QIV"],
      a: 3,
    },
    {
      p: "Which function gives the y-coordinate on the unit circle?",
      o: ["sin θ", "cos θ", "tan θ", "None"],
      a: 0,
    },
    {
      p: "In QII, what are the signs of cos θ and sin θ?",
      o: ["+, +", "−, +", "−, −", "+, −"],
      a: 1,
    },
    { p: "What is cos 60°?", o: ["1", "√2/2", "1/2", "√3/2"], a: 2 },
  ];
  const postQuizBank = [
    {
      p: "Starting at 0°, which direction is 180°?",
      o: ["Right", "Up", "Left", "Down"],
      a: 2,
    },
    {
      p: "What angle lies halfway between 0° and 90°?",
      o: ["30°", "45°", "60°", "180°"],
      a: 1,
    },
    {
      p: "Which quadrant contains 240°?",
      o: ["QI", "QII", "QIII", "QIV"],
      a: 2,
    },
    {
      p: "A point with x < 0 and y > 0 lies in which quadrant?",
      o: ["QI", "QII", "QIII", "QIV"],
      a: 1,
    },
    {
      p: "Which function gives the horizontal coordinate on the unit circle?",
      o: ["sin θ", "cos θ", "tan θ", "None"],
      a: 1,
    },
    {
      p: "At 90°, what is the y-coordinate?",
      o: ["−1", "0", "1/2", "1"],
      a: 3,
    },
    {
      p: "In QIV, what are the signs of cos θ and sin θ?",
      o: ["+, +", "−, +", "−, −", "+, −"],
      a: 3,
    },
    {
      p: "In QII, is sin θ positive or negative?",
      o: ["Positive", "Negative", "Always zero", "Undefined"],
      a: 0,
    },
    { p: "What is sin 60°?", o: ["1/2", "√2/2", "√3/2", "0"], a: 2 },
    { p: "What is cos 0°?", o: ["0", "1/2", "√2/2", "1"], a: 3 },
  ];
  function scoreMax(type) {
    return saved[type + "Max"] || 5;
  }
  function scoreText(type) {
    return saved[type] === null
      ? "Not taken"
      : `${saved[type]} / ${scoreMax(type)}`;
  }
  function comparisonPoints() {
    return saved.pre === null || saved.post === null
      ? null
      : Math.round(
          (saved.post / scoreMax("post") - saved.pre / scoreMax("pre")) * 100,
        );
  }
  function allLevelsComplete() {
    return Array.from({ length: 15 }, (_, i) => i + 1).every(
      (n) => saved.stars[n] > 0,
    );
  }
  function updateAssessments() {
    // Refresh pre-test/post-test status shown in the game UI.
    if (!$("pre-status")) return;
    $("pre-status").textContent =
      saved.pre === null
        ? "10 questions · before your adventure"
        : `Completed · ${scoreText("pre")}`;
    $("pre-action").textContent = saved.pre === null ? "Start" : "Review";
    $("post-status").textContent =
      saved.post !== null
        ? `Completed · ${scoreText("post")}`
        : allLevelsComplete()
          ? "Ready · finish your learning journey"
          : `${Object.keys(saved.stars).length} / 15 levels completed`;
    $("post-action").textContent =
      saved.post !== null ? "Review" : allLevelsComplete() ? "Start" : "View";
  }
  function assessmentComparison() {
    // Format the before/after assessment comparison.
    const improvement = comparisonPoints();
    return `<div class="assessment-comparison"><div>PRE-TEST<strong>${saved.pre === null ? "—" : scoreText("pre")}</strong></div><div>POST-TEST<strong>${saved.post === null ? "—" : scoreText("post")}</strong></div><div>CHANGE<strong>${improvement === null ? "—" : (improvement >= 0 ? "+" : "") + improvement + " pp"}</strong></div></div>${improvement === null ? "" : '<p class="assessment-notice">Change is shown in percentage points, so different test lengths remain comparable.</p>'}`;
  }
  function showAssessmentIntro(type, completed = false) {
    // Explain and launch a pre-test or post-test.
    const pre = type === "pre",
      ready = pre || allLevelsComplete(),
      taken = saved[type] !== null;
    openModal(
      modalTop(
        pre
          ? "BEFORE YOUR ADVENTURE · ก่อนเรียน"
          : "AFTER YOUR ADVENTURE · หลังเรียน",
      ) +
        `<h2 class="modal-title">${completed ? "Adventure complete! " : ""}${pre ? "Pre-test" : "Post-test"}</h2><p class="modal-copy">${pre ? "Start with a quick check of what you already know. After all five worlds, take the post-test to compare your understanding." : "Check what you have learned across all five worlds, then compare it with your pre-test."}</p>` +
        assessmentComparison() +
        `<div class="assessment-overview"><strong>10 questions · 5 learning topics</strong><br>Angles · Quadrants · Coordinates · Signs · Exact values<br>No timer, no hearts, and no game-score penalties.</div>${!ready ? '<p class="assessment-notice">Complete all 15 story levels to unlock the post-test. Your progress is shown beside the Post-test button on the game screen.</p>' : ""}${pre && saved.total > 0 && saved.pre === null ? '<p class="assessment-notice">You have already started playing. You can still take this test, but it will not represent a baseline from before your first play.</p>' : ""}${!pre && saved.pre === null ? '<p class="assessment-notice">No pre-test was recorded. You can record a post-test score, but improvement cannot be calculated.</p>' : ""}${taken ? '<p class="assessment-notice">Your recorded score is shown above. Retaking this test replaces that score.</p>' : ""}<div class="modal-actions assessment-intro-actions"><button class="catch-button" id="assessment-start" ${ready ? "" : "disabled"}>${taken ? "Retake" : "Start"} ${pre ? "pre-test" : "post-test"} <span>✦</span></button><button class="secondary" id="assessment-later">${ready ? "Continue game" : "Back to game"}</button></div>`,
    );
    $("assessment-start").onclick = () => startQuiz(type);
    $("assessment-later").onclick = () => $("modal").close();
  }
  function startQuiz(type) {
    if (type === "post" && !allLevelsComplete()) {
      showAssessmentIntro("post");
      return;
    }
    quiz = {
      type,
      index: 0,
      score: 0,
      fromHome: inHome,
      questions: shuffle(type === "pre" ? quizBank : postQuizBank).map((z) => {
        let choices = shuffle(z.o.map((v, i) => ({ v, correct: i === z.a })));
        return { ...z, choices };
      }),
    };
    renderQuiz();
  }
  function answerQuiz(index) {
    if (!quiz || quiz.index >= quiz.questions.length) return;
    const choice = quiz.questions[quiz.index].choices[index];
    if (!choice) return;
    if (choice.correct) quiz.score++;
    quiz.index++;
    renderQuiz();
  }
  function renderQuiz() {
    if (quiz.index >= quiz.questions.length) {
      const reward =
        quiz.type === "pre" && saved.pre === null && !saved.preRewarded;
      if (reward) {
        saved.coins += 10;
        saved.preRewarded = true;
      }
      saved[quiz.type] = quiz.score;
      saved[quiz.type + "Max"] = quiz.questions.length;
      save();
      openModal(
        modalTop("ASSESSMENT COMPLETE") +
          `<h2 class="modal-title">${quiz.type === "pre" ? "Pre-test" : "Post-test"}: ${quiz.score} / ${quiz.questions.length}</h2><p class="modal-copy">Your result is saved on this device.${quiz.type === "pre" ? " Now explore all five worlds, then take your post-test." : " Compare your before-and-after scores below."}${reward ? " You earned 10 Fish Coins!" : ""}</p>` +
          assessmentComparison() +
          `<div class="modal-actions"><button class="catch-button" id="quiz-done">${quiz.type === "pre" ? "Start adventure" : "View learning results"}</button><button class="secondary" id="quiz-journal">Learning journal</button></div>`,
      );
      $("quiz-done").onclick =
        quiz.type === "pre"
          ? () => {
              if (quiz.fromHome) enterGame("story");
              else $("modal").close();
            }
          : showJournal;
      $("quiz-journal").onclick = showJournal;
      return;
    }
    const z = quiz.questions[quiz.index];
    openModal(
      modalTop(
        `${quiz.type === "pre" ? "PRE" : "POST"}-TEST · ${quiz.index + 1} OF ${quiz.questions.length}`,
      ) +
        `<h2 class="modal-title">${z.p}</h2><p class="modal-copy">A quick check of your understanding. No hearts or game points involved.</p><div class="quiz-options">${z.choices.map((o, i) => `<button data-quiz="${i}">${o.v}</button>`).join("")}</div>`,
    );
    document
      .querySelectorAll("[data-quiz]")
      .forEach((b) => (b.onclick = () => answerQuiz(+b.dataset.quiz)));
  }
  function tick(time) {
    // Run the animation/game loop, timers, movement, and obstacle checks.
    const dt = Math.min((time - lastTime) / 1000, 0.04) || 0;
    lastTime = time;
    if (!inHome && state.active && !$("modal").open) {
      const delta =
        (((state.targetTurn || 0) - (state.catTurn || 0) + 540) % 360) - 180;
      state.catTurn = (state.catTurn || 0) + delta * (1 - Math.exp(-12 * dt));
      updateCat();
    }
    if (!inHome && state.active && !state.busy && !$("modal").open) {
      state.elapsed += dt;
      if (isTimedChallenge()) {
        state.timeLeft = Math.max(0, state.timeLeft - dt);
        updateTimer();
        if (state.timeLeft <= 0) {
          state.failureReason = "time";
          state.active = false;
          state.moveTo = null;
          keys.clear();
          beep(false);
          showResult(false);
          requestAnimationFrame(tick);
          return;
        }
      }
      animateEntities();
      if ([1, 2, 3].includes(state.world)) {
        let dx =
            (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
            (keys.has("a") || keys.has("arrowleft") ? 1 : 0),
          dy =
            (keys.has("s") || keys.has("arrowdown") ? 1 : 0) -
            (keys.has("w") || keys.has("arrowup") ? 1 : 0);
        if (dx || dy) state.moveTo = null;
        if (state.moveTo) {
          const d = dist(state.cat, state.moveTo);
          if (d < 5) state.moveTo = null;
          else {
            dx = (state.moveTo.x - state.cat.x) / d;
            dy = (state.moveTo.y - state.cat.y) / d;
          }
        }
        if (state.world === 2) {
          if (!state.axis || state.elapsed < state.axisLockUntil) {
            dx = 0;
            dy = 0;
          } else if (state.axis === "cos") dy = 0;
          else dx = 0;
        }
        const magnitude = Math.hypot(dx, dy);
        if (magnitude > 1) {
          dx /= magnitude;
          dy /= magnitude;
        }
        if (dx || dy) {
          const bounds =
            state.world === 1 || state.world === 3
              ? { minX: 50, maxX: 850, minY: 50, maxY: 645 }
              : { minX: 150, maxX: 750, minY: 105, maxY: 585 };
          state.cat.x = Math.max(
            bounds.minX,
            Math.min(bounds.maxX, state.cat.x + dx * 220 * dt),
          );
          state.cat.y = Math.max(
            bounds.minY,
            Math.min(bounds.maxY, state.cat.y + dy * 220 * dt),
          );
          updateCat();
        }
        if (
          state.stage === 2 &&
          $("dog") &&
          state.elapsed > (state.invincibleUntil || 0) &&
          !(state.world === 3 && dist(state.cat, { x: 450, y: 350 }) <= 65) &&
          dist(state.cat, dogPosition()) < 43
        ) {
          state.invincibleUntil = state.elapsed + 2;
          state.cat = { x: 450, y: 350 };
          state.moveTo = null;
          updateCat();
          wrong("The dog spotted you! Wait for a clear path.");
        }
      }
      if (state.world === 4 && (state.selected !== null || state.aimPointer))
        drawAim();
    }
    requestAnimationFrame(tick);
  }
  // Pointer motion previews the paw without changing which answer is selected.
  $("field").addEventListener("pointermove", (e) => {
    if (
      state.world !== 4 ||
      !state.active ||
      state.busy ||
      $("modal").open ||
      e.pointerType === "touch"
    )
      return;
    const r = $("field").getBoundingClientRect();
    state.aimPointer = {
      x: Math.max(0, Math.min(900, ((e.clientX - r.left) * 900) / r.width)),
      y: Math.max(0, Math.min(690, ((e.clientY - r.top) * 690) / r.height)),
    };
    drawAim();
  });
  $("field").addEventListener("pointerleave", () => {
    if (state.world === 4) {
      state.aimPointer = null;
      drawAim();
    }
  });
  $("field").addEventListener("pointermove", (e) => {
    if (
      ![0, 4].includes(state.world) ||
      !state.active ||
      state.busy ||
      $("modal").open
    )
      return;
    const r = $("field").getBoundingClientRect(),
      x = ((e.clientX - r.left) * 900) / r.width,
      y = ((e.clientY - r.top) * 690) / r.height;
    state.cursorFacing = true;
    state.targetTurn =
      (Math.atan2(y - state.cat.y, x - state.cat.x) * 180) / Math.PI + 90;
  });
  $("field").addEventListener("pointerleave", () => {
    state.cursorFacing = false;
  });
  let swipeStart = null;
  $("field").addEventListener("pointerdown", (e) => {
    if (
      state.world !== 4 ||
      !state.active ||
      state.busy ||
      $("modal").open ||
      e.target.closest?.("[data-answer]")
    )
      return;
    swipeStart = { x: e.clientX, y: e.clientY };
  });
  $("field").addEventListener("pointerup", (e) => {
    if (!swipeStart || state.world !== 4 || !state.active || state.busy) return;
    const start = swipeStart;
    swipeStart = null;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 18) return;
    const rect = $("field").getBoundingClientRect(),
      point = {
        x: ((e.clientX - rect.left) * 900) / rect.width,
        y: ((e.clientY - rect.top) * 690) / rect.height,
      };
    const candidates = state.question.options
      .map((_, i) => ({ i, p: valuePosition(i) }))
      .filter((x) => !valueHidden(x.i) && dist(point, x.p) < 45)
      .sort((a, b) => dist(point, a.p) - dist(point, b.p));
    if (!candidates.length) {
      toast("Missed the mouse — no heart lost.");
      return;
    }
    state.selected = candidates[0].i;
    updateSelection();
    drawAim();
    catchMouse();
  });
  $("field").addEventListener("pointercancel", () => {
    swipeStart = null;
  });
  let axisPointer = null;
  function axisDestination(e) {
    const rect = $("field").getBoundingClientRect(),
      x = ((e.clientX - rect.left) * 900) / rect.width,
      y = ((e.clientY - rect.top) * 690) / rect.height;
    state.moveTo =
      state.axis === "cos"
        ? { x: Math.max(150, Math.min(750, x)), y: state.cat.y }
        : { x: state.cat.x, y: Math.max(105, Math.min(585, y)) };
  }
  $("field").addEventListener("pointerdown", (e) => {
    if (
      state.world !== 2 ||
      !state.axis ||
      state.busy ||
      !state.active ||
      $("modal").open
    )
      return;
    axisPointer = {
      x: e.clientX,
      y: e.clientY,
      near: dist(state.cat, state.target) <= 59,
    };
    if (!axisPointer.near) axisDestination(e);
  });
  $("field").addEventListener("pointermove", (e) => {
    if (
      axisPointer &&
      !axisPointer.near &&
      state.world === 2 &&
      state.axis &&
      e.buttons
    )
      axisDestination(e);
  });
  $("field").addEventListener("pointerup", (e) => {
    if (!axisPointer || state.world !== 2) return;
    const p = axisPointer;
    axisPointer = null;
    if (p.near && Math.hypot(e.clientX - p.x, e.clientY - p.y) >= 18) {
      state.moveTo = null;
      const r = $("field").getBoundingClientRect(),
        point = {
          x: ((e.clientX - r.left) * 900) / r.width,
          y: ((e.clientY - r.top) * 690) / r.height,
        };
      if (dist(point, state.target) <= 75) catchMouse();
      else if (state.stage === 2) {
        state.cat = { x: 450, y: 350 };
        updateCat();
        wrong("Missed the mouse. Return to the centre and try again.");
      } else toast("Missed the mouse. Try again.");
    }
  });
  $("field").addEventListener("pointercancel", () => {
    axisPointer = null;
  });
  // Use physical key positions so WASD and C/V work with Thai and other keyboard layouts.
  function gameKey(e) {
    const physical = {
      KeyW: "w",
      KeyA: "a",
      KeyS: "s",
      KeyD: "d",
      KeyC: "c",
      KeyV: "v",
      ArrowUp: "arrowup",
      ArrowDown: "arrowdown",
      ArrowLeft: "arrowleft",
      ArrowRight: "arrowright",
      Space: " ",
      Enter: "enter",
      NumpadEnter: "enter",
    };
    return physical[e.code] || String(e.key || "").toLowerCase();
  }
  window.addEventListener("keydown", (e) => {
    if (inHome || $("modal").open || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = gameKey(e);
    if (
      [
        "w",
        "a",
        "s",
        "d",
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        " ",
        "enter",
      ].includes(k)
    ) {
      e.preventDefault();
      if (k === " " || k === "enter") {
        if (!e.repeat) catchMouse();
      } else keys.add(k);
    }
    if (state.world === 2 && (k === "c" || k === "v")) {
      e.preventDefault();
      if (!e.repeat) selectAxis(k === "c" ? "cos" : "sin");
    }
  });
  window.addEventListener("keyup", (e) => keys.delete(gameKey(e)));
  window.addEventListener("blur", () => keys.clear());
  document.addEventListener("visibilitychange", () => keys.clear());
  $("modal").addEventListener("close", () => keys.clear());
  $("catch").onclick = catchMouse;
  $("hint").onclick = hint;
  $("help").onclick = showGuide;
  $("map-button").onclick = showMap;
  $("journal").onclick = $("avatar").onclick = showJournal;
  $("restart").onclick = () => start(state.world, state.stage, state.mode);
  $("sound").onclick = toggleSound;
  $("endless").onclick = () => {
    start(0, 1, "rush");
    toast(
      "Mouse Rush! Catch mice from your unlocked worlds until your hearts run out.",
    );
  };
  function updateHome() {
    if (!$("home-coins")) return;
    const completed = Object.keys(saved.stars).length;
    const modules = Array.from({ length: 5 }, (_, i) =>
      [1, 2, 3].every((n) => saved.stars[i * 3 + n] > 0),
    ).filter(Boolean).length;
    $("home-coins").textContent = saved.coins;
    $("home-stars").textContent =
      `${Object.values(saved.stars).reduce((a, b) => a + b, 0)} / 45`;
    $("home-modules").textContent = `${modules} / 5`;
    $("home-best").textContent = saved.rushBest;
    $("home-assessment-status").textContent =
      saved.post !== null
        ? "Complete"
        : saved.pre !== null
          ? "Pre-test done"
          : "Required";
    $("home-pre-title").textContent =
      saved.pre === null
        ? "Step 1: Take the Pre-test Before Playing!"
        : "Your Pre-test is Complete!";
    $("home-pre-copy").textContent =
      saved.pre === null
        ? "Complete 10 quick questions to record your baseline score & earn bonus Fish Coins."
        : `Score: ${scoreText("pre")}. ${scoreMax("pre") === 5 ? "This is your earlier 5-question score; you can take the new 10-question test." : allLevelsComplete() ? "Your Post-test is ready in Learning Report." : "Explore all five worlds, then take your Post-test."}`;
    $("home-pre").textContent =
      saved.pre === null ? "Start Pre-test (10 Qs)" : "Retake Pre-test (10 Qs)";
  }
  function showHome() {
    inHome = true;
    keys.clear();
    state.moveTo = null;
    if ($("modal").open) $("modal").close();
    document.body.classList.add("home-active");
    updateHome();
    window.scrollTo(0, 0);
  }
  function enterGame(mode) {
    if (saved.pre === null) {
      showAssessmentIntro("pre");
      return;
    }
    if ($("modal").open) $("modal").close();
    inHome = false;
    document.body.classList.remove("home-active");
    if (mode === "rush") {
      start(0, 1, "rush");
      toast(
        "Mouse Rush! Catch mice from your unlocked worlds until your hearts run out.",
      );
    } else if (state.mode === "rush" || !state.active) start(0, 0);
    else if (state.pendingGuide) {
      state.pendingGuide = false;
      showGuide();
    }
    window.scrollTo(0, 0);
  }
  function showBadges() {
    const items = [
      ["🌱", "First catch", saved.total >= 1, "Catch your first mouse."],
      [
        "🎯",
        "Sharp whiskers",
        saved.first >= 10,
        "Catch 10 mice on your first try.",
      ],
      [
        "🔥",
        "Three in a row",
        (saved.bestStreak || 0) >= 3,
        "Catch three mice consecutively.",
      ],
      [
        "⭐",
        "Perfect level",
        Object.values(saved.stars).some((n) => n === 3),
        "Earn three stars on any level.",
      ],
      ["📝", "Ready to learn", saved.pre !== null, "Complete the pre-test."],
      [
        "🗺️",
        "World explorer",
        Array.from({ length: 5 }, (_, i) =>
          [1, 2, 3].every((n) => saved.stars[i * 3 + n] > 0),
        ).some(Boolean),
        "Complete all three levels in a world.",
      ],
      [
        "🏆",
        "Trigo champion",
        allLevelsComplete(),
        "Complete all 15 story levels.",
      ],
    ];
    openModal(
      modalTop("YOUR ACHIEVEMENTS") +
        '<h2 class="modal-title">Badges & little victories</h2><p class="modal-copy">Keep exploring to earn these badges.</p><div class="badge-grid">' +
        items
          .map(
            ([icon, name, earned, desc]) =>
              `<div class="badge-item ${earned ? "" : "locked"}"><span>${icon}</span><strong>${name} ${earned ? "✓" : ""}</strong><small>${desc}</small></div>`,
          )
          .join("") +
        "</div>",
    );
  }
  function earnedSkins() {
    return SKINS.filter(
      (s) => s.levels && s.levels.every((n) => saved.stars[n] > 0),
    ).map((s) => s.id);
  }
  function equipSkin(id, refresh) {
    const skin = SKINS.find((s) => s.id === id);
    if (!skin) return;
    const owned = new Set([
      "ginger",
      saved.skin,
      ...(saved.ownedSkins || []),
      ...earnedSkins(),
    ]);
    if (!owned.has(id)) {
      if (skin.price === undefined) {
        toast("Complete the listed levels to unlock this coat.");
        return;
      }
      if (saved.coins < skin.price) {
        toast(`Collect ${skin.price} Fish Coins to unlock this coat.`);
        return;
      }
      saved.coins -= skin.price;
      owned.add(id);
    }
    saved.ownedSkins = [...owned];
    saved.skin = id;
    applySkin();
    save();
    refresh();
  }
  function showSkins() {
    const owned = new Set([
      "ginger",
      saved.skin,
      ...(saved.ownedSkins || []),
      ...earnedSkins(),
    ]);
    openModal(
      modalTop("YOUR CAT SKINS") +
        `<h2 class="modal-title">A little coat collection.</h2><p class="modal-copy">${saved.coins} Fish Coins · Preview every coat below. Purchased and earned coats stay unlocked.</p><div class="cat-skin-grid">${SKINS.map(
          (s) => {
            const selected = saved.skin === s.id,
              unlocked = owned.has(s.id),
              method = s.levels
                ? `Complete levels ${s.levels[0]}–${s.levels.at(-1)}`
                : "";
            return `<button data-home-skin="${s.id}" aria-pressed="${selected}" ${!unlocked && s.price === undefined ? "disabled" : ""} style="--cat-color:${s.color}"><svg viewBox="-55 -52 110 135" aria-hidden="true"><use href="#cat-art"/></svg><strong>${s.name}</strong><span>${selected ? "✓ Equipped" : unlocked ? "Equip" : s.price !== undefined ? `${s.price} Fish Coins` : "Earn by playing"}</span><small>${!unlocked ? method : ""}</small></button>`;
          },
        ).join("")}</div>`,
    );
    document
      .querySelectorAll("[data-home-skin]")
      .forEach(
        (b) => (b.onclick = () => equipSkin(b.dataset.homeSkin, showSkins)),
      );
  }
  function toggleSound() {
    sound = !sound;
    $("sound").classList.toggle("on", sound);
    $("sound").setAttribute(
      "aria-label",
      sound ? "Mute sound" : "Enable sound",
    );
    $("home-sound").textContent = sound ? "♫" : "♪";
    $("home-sound").setAttribute(
      "aria-label",
      sound ? "Mute sound" : "Enable sound",
    );
    beep();
  }
  function boot() {
    scenery();
    applySkin();
    start(0, 0);
    updateAssessments();
    showHome();
    state.pendingGuide = true;
    requestAnimationFrame(tick);
  }
  $("home-pre").onclick = () => {
    if (saved.pre === null) startQuiz("pre");
    else showAssessmentIntro("pre");
  };
  $("home-story").onclick = () => enterGame("story");
  $("home-rush").onclick = () => enterGame("rush");
  $("home-skins").onclick = showSkins;
  $("home-badges").onclick = showBadges;
  $("home-report").onclick = showJournal;
  $("home-sound").onclick = toggleSound;
  $("return-home").onclick = showHome;
  $("assessment-pre").onclick = () => showAssessmentIntro("pre");
  $("assessment-post").onclick = () => showAssessmentIntro("post");
  $("assessment-results").onclick = showJournal;
  boot();
})();
