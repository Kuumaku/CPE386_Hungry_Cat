# Hungry Cat (Trigo Cat: Mouse Hunt) — Technical Documentation & README

> **Game Title:** Hungry Cat / Trigo Cat: Mouse Hunt  
> **Course / Subject:** CPE386 — Educational Puzzle Game for Trigonometry  
> **Stack:** Vanilla HTML5, CSS3, SVG, JavaScript (ES6+), Web Audio API, LocalStorage (Zero external npm dependencies)

---

## 1. Project Overview & Architecture

**Hungry Cat** is an interactive, browser-based educational puzzle game designed to teach students fundamental trigonometry concepts through progressive, playful mechanics. The player guides an inquisitive cat to search for and pounce on mice hiding around a unit circle and Cartesian coordinate plane.

### Core Files Structure
* **`index.html`**:
  - Provides the complete single-page application structure.
  - Contains SVG asset definitions (`<defs>`) for the cat, mice, bushes, trees, crates, and decorative elements.
  - Hosts both the main landing page (`#home-screen`) and the active game field (`.app`), toggled smoothly without page reloads.
  - Includes modal dialog containers (`<dialog id="modal">`) for field guides, trig reference tables, world maps, learning journal, skins, badges, and assessments.
* **`style.css`**:
  - Warm, storybook-themed visual design with CSS variables (`--ink`, `--muted`, `--purple`, `--line`, `--cat-color`).
  - Fluid responsive layouts supporting full desktop down to 360px mobile viewports.
  - Keyframe animations for cat tail wagging, sparkles, floating leaves, pulsing targets, and focus accessibility rings.
  - Media queries covering desktop (>1650px, 1200px), tablet (950px, 850px, 730px), and mobile (600px).
* **`game.js`**:
  - Self-contained IIFE (`'use strict'; (() => { ... })();`) encapsulating the entire game engine.
  - Real-time tick loop (`requestAnimationFrame`), input system (physical keyboard code mapping, pointer drag, mouse click, and swipe), math coordinate system, SVG board rendering, mission evaluation, scoring, and progress persistence.
* **`Game_Design.pdf`**:
  - The comprehensive master design document covering 5 Learning Outcomes (LO1–LO5), 15 levels, Endless Mode, assessment specifications, UI wireframes, and mission answers.
* **`person1_tasks.txt`**:
  - Scope: Missing features, question alignment, and behavior verification for Worlds 1–3 (Understanding Angles, Quadrants, Coordinates).
* **`person2_tasks.txt`**:
  - Scope: Worlds 4–5 (Signs of Sin/Cos, Exact Trig Values), 10-question endless sets, assessments (pre/post-test), rewards, skins, badges, responsive layout, and validation.

---

## 2. Game Modes & Educational Design

### 2.1 Learning Outcomes (LO) & Modules
| Module / World | Learning Topic | Target Learning Outcome (LO) | Levels |
| :--- | :--- | :--- | :--- |
| **World 1: Angle Forest** | Understanding Angles ($0^\circ - 360^\circ$) | **LO1:** Identify $0^\circ, 30^\circ, 45^\circ, 60^\circ, 90^\circ$ and standard angles on a $360^\circ$ circle. | Level 1–3 |
| **World 2: Quadrant Adventure** | The Four Quadrants | **LO2:** Identify the four quadrants (QI–QIV) in a coordinate plane and determine which quadrant an angle/sign pair falls into. | Level 4–6 |
| **World 3: Coordinate Valley** | Cosine & Sine Coordinates | **LO3:** Explain and apply $x = \cos\theta$ (horizontal) and $y = \sin\theta$ (vertical). | Level 7–9 |
| **World 4: Sign Forest** | Signs of $\sin\theta$ and $\cos\theta$ | **LO4:** Determine the signs of $\sin\theta$ and $\cos\theta$ in each quadrant. | Level 10–12 |
| **World 5: Trig Treasure** | Exact Trigonometric Values | **LO5:** Determine exact values of $\sin\theta, \cos\theta$ (and $\tan\theta = \sin/\cos$) using reference angles. | Level 13–15 |

### 2.2 Level Types within Each World
1. **Level 1 (Learn):** Tutorial mode with explanatory hints and visual cues. **No hearts lost on incorrect attempts**, allowing players to safely explore and learn from mistakes.
2. **Level 2 (Practice):** Randomized/semi-hidden questions with reduced hints. Standard lives system (3 hearts).
3. **Level 3 (Challenge):** Timed obstacle level featuring dynamic hazards (moving bees, patrolling dogs, or disappearing targets). Correct catches award $+5\text{ seconds}$ bonus time.

### 2.3 Modes
* **Story Mode:** Sequential progression across 5 Worlds (15 Levels). Each level requires completing exactly **3 missions**.
* **Endless Mode (Mouse Rush):** Continuous challenge where questions are pulled across all unlocked worlds. Continues until player loses all 3 hearts. Tracks high score (`rushBest`).

---

## 3. Core Game Rules & Logic Systems

### 3.1 Mission Count
* In **Story Mode**, every level has **3 missions** (catching 1 mouse = completing 1 mission).
* In **Mouse Rush**, the run is indefinite with no 3-mission cap.

### 3.2 Scoring System
* **Catch a Mouse:** $+10\text{ points}$
* **First Attempt Bonus:** $+5\text{ points}$ (if no mistake was made on that mission)
* **No Hint Bonus:** $+5\text{ points}$ (if hint button was not opened during that mission)
* **Combo Bonus:** $+5\text{ points}$ for every 3 consecutive correct catches (`streak % 3 === 0`)
* **Fish Coins:** $2\text{ coins}$ per catch $+ 1$ for first attempt $+ 1$ for no hint $+ 1$ for combo.

### 3.3 Hearts & Health System
* Player starts each level with **3 Hearts** (`♥ ♥ ♥`).
* **Learn Levels:** Incorrect attempts produce feedback toasts and guide arrows with **0 hearts lost**.
* **Practice & Challenge Levels:** Incorrect attempts or hazard collisions deduct **1 Heart**.
* Reaching **0 Hearts** triggers `showResult(false)` (Game Over) requiring a level restart.
* Completing a level resets hearts to 3 for the next level.

### 3.4 Star Rating System
Upon winning a level, stars are awarded based on remaining hearts:
* **3 Hearts Remaining:** 3 Stars (`★★★`)
* **2 Hearts Remaining:** 2 Stars (`★★☆`)
* **1 Heart Remaining:** 1 Star (`★☆☆`)
* Stars and high scores are saved persistently in `localStorage`.

### 3.5 Challenge Timer System
* World 1 Challenge: 60 seconds
* World 2 Challenge: 60 seconds
* World 3 Challenge: 120 seconds
* World 4 Challenge: 120 seconds
* World 5 Challenge: 60 seconds
* Each successful catch adds $+5\text{ seconds}$ to `state.timeLeft`. The clock pauses while modal guides are open.

---

## 4. Comprehensive Function & Logic Reference (`game.js`)

Below is the complete catalog of all state properties, mathematical helpers, game mechanics, and UI controllers in `game.js`.

### 4.1 Global Constants & State
* `ANGLES`: Standard angle array `[0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]`.
* `INNER`: Filtered angles excluding the primary axes (`a % 90 !== 0`).
* `CHALLENGE_SECONDS`: Array of time limits for stage 2 of each world: `[60, 60, 120, 120, 60]`.
* `MISSION_COUNTS`: Array of mission counts `[[3,3,3], [3,3,3], [3,3,3], [3,3,3], [3,3,3]]`.
* `WORLDS`: Metadata for all 5 worlds (name, topic, icon, description, titles, lessons).
* `fresh()`: Factory function returning default persistent storage structure (`unlocked`, `stars`, `best`, `coins`, `rushBest`, `total`, `first`, `hints`, `attempts`, `pre`, `post`, `skin`).
* `saved`: Loaded object from `localStorage.getItem('trigo-cat-v1')`.
* `state`: Live in-memory game state:
  - `world`, `stage`, `mode`: Active position in the game.
  - `mission`: Current mission index ($0, 1, 2$).
  - `hearts`: Remaining lives ($0 - 3$).
  - `score`, `streak`, `attempts`: Current level scoring tracking.
  - `hinted`: Boolean flag if hint was requested in current mission.
  - `selected`: Selected angle or answer option index.
  - `axis`: Active movement axis in World 3 (`'cos'` or `'sin'`).
  - `signCos`, `signSin`: Chosen signs (`'+'` or `'−'`) in World 4.
  - `clue`: Progress index through multi-part clues in Challenge levels.
  - `cat`: Position coordinates `{x, y}` of the cat.
  - `target`: Target position coordinates `{x, y}` of the mouse.
  - `question`: Current question object.
  - `questions`: Array of questions generated for the current level.
  - `timeLeft`: Remaining seconds for timed challenges.

---

### 4.2 Math & Geometry Functions
| Function | Parameters | Return | Description |
| :--- | :--- | :--- | :--- |
| `rad(a)` | `a` (degrees) | `number` (radians) | Converts degrees to radians: $a \times \frac{\pi}{180}$. |
| `pos(a, r=220)` | `a` (angle), `r` (radius) | `{x, y}` | Converts a unit circle angle into SVG Cartesian coordinates centered at $(450, 350)$. Note: $y = 350 - \sin(a) \times r$ because SVG $y$ is inverted. |
| `q(a)` | `a` (angle) | `1 \| 2 \| 3 \| 4 \| 0` | Determines the quadrant for angle $a$. Returns `0` if the angle lies exactly on an axis ($0^\circ, 90^\circ, 180^\circ, 270^\circ$). |
| `qpos(n)` | `n` (quadrant index 1..4) | `{x, y}` | Calculates center coordinates for the quadrant boxes/mice. |
| `dist(a, b)` | `a {x,y}`, `b {x,y}` | `number` | Calculates Euclidean distance $\sqrt{(a.x-b.x)^2 + (a.y-b.y)^2}$. |
| `sample(a)` | `a` (array) | `any` | Picks a random element from array `a`. |
| `shuffle(a)` | `a` (array) | `array` | Performs an immutable Fisher-Yates shuffle on an array. |
| `exact(n)` | `n` (numeric value) | `string` | Converts floating-point trig outputs into clean radical/fraction strings (`'0'`, `'1'`, `'1/2'`, `'√2/2'`, `'√3/2'`, `'−1/2'`, etc.). |
| `val(fn, a)` | `fn` (`'sin'\|'cos'\|'tan'`), `a` | `string` | Calculates the trigonometric value for angle $a$ and returns the formatted exact string. |

---

### 4.3 Question & Mission Engines
| Function | Parameters | Description |
| :--- | :--- | :--- |
| `makeQuestion(w, stage, index, choice)` | `w` (world), `stage`, `index`, `choice` | Core question generator. Builds prompt text, target angle `a`, quadrant `q`, trig function `fn`, answer options, or sequential clues `seq` based on the level design. |
| `buildQuestions(w, stage, count)` | `w`, `stage`, `count` | Assembles a non-repeating deck of `count` questions for Story mode using unique combos or shuffled sequences. |
| `questionKey(w, stage, z)` | `w`, `stage`, `z` | Generates a unique string key for a question to prevent duplicates. |
| `rushQuestion()` | *none* | Generates a random mission for Endless Mouse Rush, excluding the 3 most recently played questions. |

---

### 4.4 Game Engine & State Transitions
| Function | Parameters | Description |
| :--- | :--- | :--- |
| `start(world, stage, mode)` | `world`, `stage`, `mode='story'` | Starts a level: initializes timers, builds question deck, updates HUD labels, renders nav, and calls `newMission()`. |
| `newMission()` | *none* | Resets per-mission variables (`attempts=0`, `hinted=false`, `cat` position), loads the question, positions bees/hazards, renders mission text, and redraws the board. |
| `catchMouse()` | *none* | Primary action trigger (Enter / Space / Catch Button). Validates player selection against target: angle match (W1), box proximity and quadrant match (W2), axis proximity (W3), sign choices (W4), or value mouse selection (W5). |
| `success(p, detail)` | `p` (target pos), `detail` (optional) | Handles correct action: adds score & coins, triggers pounce animation, awards $+5\text{s}$ in timed challenges, increments mission count, and triggers `showResult(true)` upon completing all missions. |
| `wrong(message)` | `message` (feedback string) | Handles incorrect action: deducts 1 heart (in Practice/Challenge), resets streak, plays low error beep, displays toast with educational hint. Triggers Game Over if hearts hit 0. |
| `hint()` | *none* | Shows pedagogical hint text tailored to the current world's concept. Records hint usage in `saved.hints` (disqualifies "No Hint" bonus). |
| `selectAxis(axis)` | `axis` (`'cos'` or `'sin'`) | Sets active movement axis in World 3. Restricts cat motion strictly to horizontal ($x$) or vertical ($y$). |
| `setSign(which, sign)` | `which` (`'Cos'\|'Sin'`), `sign` (`'+'\|'−'`) | Selects trig signs in World 4 and auto-evaluates when both are selected. |
| `tick(time)` | `time` (timestamp) | Main `requestAnimationFrame` loop. Handles smooth cat rotation, challenge timer countdown, movement velocity calculations, boundary clamping, and dog patrol collision detection. |
| `gameKey(e)` | `e` (KeyboardEvent) | Normalizes keyboard inputs using `e.code` (e.g. `KeyW`, `KeyA`, `KeyC`, `KeyV`) so WASD and C/V work seamlessly on Thai and non-English keyboard layouts. |

---

### 4.5 Rendering & SVG Drawing
| Function | Description |
| :--- | :--- |
| `scenery()` | Generates static background SVG: meadow grass gradients, peripheral trees, decorative bushes, and sparkles. |
| `renderNav()` | Generates the 5 world navigation buttons on the left sidebar, including lock icons and active world indicators. |
| `renderMission()` | Updates the mission card DOM: mission count (`01 / 03`), title, prompt text, mission dots, clue pills, and contextual controls (C/V axis buttons, sign drops, reference table button). |
| `renderClues()` | Renders sequential clue pills (`Clue 1 of 3`) for Challenge levels. |
| `drawBoard()` | Draws the active math canvas: coordinate axes ($x, y$), unit circle dashed line, angle bushes with degree labels (W1), quadrant boundaries and Roman numeral labels (W2, W4), grid lines (W3), or safe area circle. |
| `drawEntities()` | Renders interactive entities: bush targets, quadrant boxes, moving mice, patrolling dogs, bees, and floating value mice. |
| `animateEntities()` | Updates real-time positions for bees orbiting the circle, dog patrol sweeps, and floating value mice. |
| `updateCat()` | Updates cat SVG translation (`transform="translate(x, y)"`) and rotation. |
| `updateAxisCue()` | Draws directional arrows beside the cat indicating allowed movement along the active axis (horizontal for COS, vertical for SIN). |
| `updateProximityCue()` | Renders the interactive "CATCH!" floating badge when the cat is in striking range of a mouse or box. |
| `drawAim()` | Draws dashed aiming trajectory lines from the cat to the selected target bush or value mouse. |
| `updateHUD()` | Refreshes hearts display (`♥ ♥ ♥`), current score, Fish Coins, and countdown timer. |

---

### 4.6 Assessments, Collectibles & Modals
| Function | Description |
| :--- | :--- |
| `showGuide()` | Opens the level tutorial modal explaining gameplay mechanics, rules, and math objectives. |
| `showTable()` | Displays the exact trig values reference table ($0^\circ, 30^\circ, 45^\circ, 60^\circ, 90^\circ$). |
| `showMap()` | Opens the World Map modal allowing players to replay completed levels or toggle Free Explore mode. |
| `showResult(win)` | Displays Level Complete or Game Over modal showing stars earned, score, mice caught, and coins. |
| `showJournal()` | Displays the Learning Journal: completed levels, first-try accuracy, hints used, pre/post-test scores, and percentage point improvement. |
| `showBadges()` | Displays achievements modal (First catch, Sharp whiskers, Three in a row, Perfect level, etc.). |
| `showSkins()` / `equipSkin(id)` | Manages cat coat customization: unlocks skins via level completion or purchase with Fish Coins. |
| `startQuiz(type)` / `renderQuiz()` / `answerQuiz(i)` | Powers the 10-question Pre-test and Post-test interactive quiz assessments. |
| `save()` | Serializes `saved` progress to `localStorage` and updates UI widgets. |

---

## 5. Person 1 Tasks: Prioritized Implementation Plan

Below is the step-by-step roadmap for **Person 1**, designed to tackle foundational game architecture first, followed by question design alignment, interactive mechanics, and testing.

```
                    ┌────────────────────────────────────────┐
                    │ STEP 1: Foundation (Mission Count)    │
                    │ Change MISSION_COUNTS from 5 to 3      │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │ STEP 2: World 1 (Angle Forest)         │
                    │ • Learn: 30°, 90°, 150°               │
                    │ • Practice: verify directions/answers  │
                    │ • Challenge: 3-step route & bees       │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │ STEP 3: World 2 (Quadrants)            │
                    │ • Learn: QI, QIII, QIV                 │
                    │ • Practice: 150°, 300°, 225°          │
                    │ • Challenge: paths with axes (X/Y)     │
                    │ • Mechanics: box reachability & labels │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │ STEP 4: World 3 (Coordinates Cos/Sin)  │
                    │ • Learn: explicitly teach x=cos, y=sin │
                    │ • Practice: 2-axis movement (C & V)    │
                    │ • Challenge: dog patrol & return safe  │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │ STEP 5: Shared Systems & Progression   │
                    │ • Hearts rule (Learn safe, P/C lose 1) │
                    │ • Scoring (+10/+5/+5/+5 combo)         │
                    │ • Level unlocking (3 per world)        │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │ STEP 6: Regression Verification Matrix │
                    │ • Run all 9 levels across inputs       │
                    │ • Desktop & Mobile responsiveness      │
                    └────────────────────────────────────────┘
```

### Detailed Step-by-Step Breakdown

#### Phase 1: Foundation (Start Here)
* **Action:** In `game.js`, change `MISSION_COUNTS` from `[[5,5,5], ...]` to `[[3,3,3], [3,3,3], [3,3,3], [3,3,3], [3,3,3]]`.
* **Why do this first?** Every single downstream task, UI mission counter (`01 / 03`), progress dot (`renderMission`), level completion check (`state.mission >= missionCount()`), and unlock condition depends directly on the mission count being 3.

#### Phase 2: World 1 — Angle Forest (Tasks 2, 3, 4)
1. **Task 2 (Learn Level 1):**
   - Update `makeQuestion(0, 0, index)`:
     - Mission 1: `"Find 30°"` ($a = 30^\circ$)
     - Mission 2: `"Find the right angle."` ($a = 90^\circ$, prompt specifies right angle)
     - Mission 3: `"Find 150°"` ($a = 150^\circ$)
   - Ensure all angle bushes ($0^\circ, 30^\circ, 45^\circ, 60^\circ, 90^\circ, 150^\circ, \dots$) remain rendered on the circle so player can choose.
2. **Task 3 (Practice Level 2):**
   - Verify initial non-replay questions match the design:
     - Mission 1: $30^\circ \xrightarrow{+90^\circ \text{ CCW}} 120^\circ$
     - Mission 2: $90^\circ \xrightarrow{-30^\circ \text{ CW}} 60^\circ$
     - Mission 3: $0^\circ \xrightarrow{-90^\circ \text{ CW}} 270^\circ$
   - Verify CCW adds angle and CW subtracts angle modulo $360^\circ$.
3. **Task 4 (Challenge Level 3):**
   - Verify initial routes:
     - Mission 1: Start $30^\circ$, rotate $90^\circ$ CCW $\rightarrow 120^\circ$
     - Mission 2: Start $90^\circ$, rotate $30^\circ$ CW $\rightarrow 60^\circ$
     - Mission 3: Start $0^\circ$, rotate $90^\circ$ CW $\rightarrow 270^\circ$
   - Ensure angle degree labels are hidden on bushes.
   - Confirm bee positions never coincide with the correct target mouse and catching a bee incurs an obstacle penalty.

#### Phase 3: World 2 — Quadrant Adventure (Tasks 5, 6, 7, 8)
1. **Task 5 (Learn Level 4):**
   - Update `makeQuestion(1, 0, index)` to implement the three design missions:
     - Mission 1: $x > 0$ and $y > 0 \rightarrow \mathbf{QI}$
     - Mission 2: $x < 0$ and $y < 0$ or $(-, -) \rightarrow \mathbf{QIII}$
     - Mission 3: $x > 0$ and $y < 0 \rightarrow \mathbf{QIV}$
   - Verify prompt text and target quadrant ID.
2. **Task 6 (Practice Level 5):**
   - Update initial missions in `makeQuestion(1, 1, index)`:
     - Mission 1: $150^\circ \rightarrow \mathbf{QII}$
     - Mission 2: $300^\circ \rightarrow \mathbf{QIV}$
     - Mission 3: $225^\circ \rightarrow \mathbf{QIII}$
3. **Task 7 (Challenge Level 6):**
   - Fix multi-step path logic to support both Quadrants and Axes:
     - Mission 1: $135^\circ \rightarrow 315^\circ \rightarrow 225^\circ \implies \mathbf{QII} \rightarrow \mathbf{QIV} \rightarrow \mathbf{QIII}$
     - Mission 2: $45^\circ \rightarrow 180^\circ \rightarrow 270^\circ \implies \mathbf{QI} \rightarrow \text{x-axis} \rightarrow \text{y-axis}$
     - Mission 3: $300^\circ \rightarrow 150^\circ \rightarrow 45^\circ \implies \mathbf{QIV} \rightarrow \mathbf{QII} \rightarrow \mathbf{QI}$
   - Ensure axis targets are distinctly handled and never mislabeled as QI–QIV.
4. **Task 8 (Field Mechanics):**
   - Verify 4 quadrant target boxes are reachable with WASD/arrows and mouse click.
   - Verify incorrect box inspections deduct hearts in Practice/Challenge.
   - Ensure quadrant labels and coordinate sign indicators stay visible during Learn.

#### Phase 4: World 3 — Coordinate Valley (Tasks 9, 10)
1. **Task 9 (Learn & Practice Levels 7 & 8):**
   - Level 7 (Learn): Explicitly reinforce that horizontal movement is controlled by $\cos\theta$ and vertical by $\sin\theta$.
   - Level 8 (Practice): Player must use COS (<kbd>C</kbd>) and SIN (<kbd>V</kbd>) axes to position the cat at coordinates corresponding to standard angles. Prevent diagonal movement during single-axis lock.
2. **Task 10 (Challenge Level 9):**
   - Moving mouse position shift logic (relocating every 4–5s with warning pulse).
   - Patrolling dog collision: on hit or miss, return cat to Safe Area $(450, 350)$ and deduct 1 heart.
   - Verify $\tan\theta$ is not introduced in World 3 (reserved for World 5).

#### Phase 5: Shared Mechanics & Progression Verification (Tasks 11, 12)
* **Task 11:** Test hearts behavior across all modes:
  - Learn: 0 hearts lost on mistake.
  - Practice/Challenge: 1 heart lost on mistake; 0 hearts triggers level failure.
  - Timed Challenge: $+5\text{s}$ per successful catch.
  - Scoring: $+10$ catch, $+5$ first try, $+5$ no hint, $+5$ for 3-combo.
* **Task 12:** Level unlock chain:
  - Completing 3 levels of World 1 unlocks World 2.
  - Completing 3 levels of World 2 unlocks World 3.
  - Replay and Free Explore functionality remain properly isolated.

#### Phase 6: Regression Testing Matrix (Task 13)
* Prepare a manual/automated verification test checklist:
  - Levels 1–9 with exact 3-mission count.
  - Controls: Mouse clicks, Touch drag/tap, Keyboard (<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, Arrows, <kbd>C</kbd>, <kbd>V</kbd>, <kbd>Space</kbd>, <kbd>Enter</kbd>).
  - Browser responsiveness at 360px, 730px, 1200px.

---

## 6. How to Run & Test Locally

1. Open a terminal in the project root:
   ```bash
   python3 -m http.server 8000 --directory dist
   ```
2. Navigate to `http://localhost:8000` in any modern web browser (Chrome, Edge, Firefox, Safari).
3. Open Developer Tools (<kbd>F12</kbd> or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd>) to check for any console errors or warnings.
4. Storage can be reset at any time by clearing `localStorage.removeItem('trigo-cat-v1')` in the browser console.
