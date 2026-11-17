# Racket Revision (CSC 330, Fall 2026)

Revision workspace for the **Racket midterm**: closed book, no cheat sheet, pencil only, short one-line answers (the longest official code answer is about 4 lines). It covers **all the Racket slides** and nothing on Ruby or OCaml.

The solution is an **offline phone app** (`app/`) built from the slides and the Racket parts of past exams. It runs on an iPhone with no signal once it has been added to the Home Screen.

---

## What's here

| Path | What it is |
|---|---|
| `Racket Slides/racket-01-intro.pdf` … `racket7.pdf` | **The lecture slides. This is exactly what the exam covers.** |
| `Racket Slides/Previous Racket/` | Old CSE341 (UW) finals/midterms that the course staff "ported" to OCaml + Racket-OOP. `*Solved*` = with answers, `*Unsolved*` = blank. |
| `Racket Slides/OCaml_exampleMidterm1.pdf` | This course's own (UVic CSC 330) OCaml midterm 1: the best guide to the **style** of exam questions. |
| `app/` | The revision app (static website / PWA). Upload this folder to host it. |
| `tools/verify.js` | Checks every question's answer against **real Racket** and against the app's interpreter. |
| `tools/serve.py` | Local preview server (no caching): `python tools/serve.py`, then open http://localhost:8730 |
| `tools/make-icons.js` | Regenerates `app/icons/*.png`. |

### Which resource to use, and when

| Slides deck | Topic | App topic |
|---|---|---|
| `racket-01-intro.pdf` | syntax/AST, define, lambda, currying, lists, **parens matter**, dynamic typing, cond, truthiness | λ Racket basics & parentheses |
| `racket-02-let.pdf` | let / let* / letrec / define, top level, cons & improper lists, set!, begin, mcons | ⟲ let, scope & mutation |
| `racket-03-thunk-lazy.pdf` | thunks, eager vs lazy, streams, promises (my-delay/my-force), memoization | ⏳ Thunks, streams, promises & memo |
| `racket4.pdf` | C preprocessor, quote/quasiquote/eval, syntax-rules macros, gotchas, hygiene | ⟿ Quote, eval & macros |
| `racket5.pdf` | variants via tagged lists vs `struct`, evaluators returning exps | ▣ Structs & variants |
| `racket6.pdf` | implementing PLs: interpreter vs compiler, LBI vs metalanguage, dynamic type checks, environments, closures, free variables, closure conversion, LBI macros | ⚙ Implementing languages |
| `racket7.pdf` | static vs dynamic typing, soundness/completeness, undecidability, weak typing, the 7 claim pairs | ⚖ Static vs dynamic typing |

**Old exams: what is relevant**

- `Previous Racket/final*.pdf`: **use these.** Their Racket sections line up with our slides:
  - Q1 "Racket programming" (list recursion, higher-order functions, "what does this compute")
  - Q2 "Scope / aliasing / mutation" (the **part-a … part-h** tracing questions; very likely exam style)
  - Q3 "Streams" / delayed evaluation
  - Q4 "Interpreter implementation" (MUPL: add a case to `eval-under-env`, "can it be a macro?", find bugs)
  - Q5 "Soundness / completeness" and static typing
- **Skip** in those finals: Racket **OOP/classes/mixins**, "functional vs OO decomposition" ports and **subtyping**. None of these are in our Racket slides. Also skip anything Ruby.
- `Previous Racket/midterm*.pdf` and `OCaml_exampleMidterm1.pdf` are **OCaml**. Use them only to see the *style* of questions (types of answers, "is it pure / does it fail / is it bad style and how would you fix it"), not the content.
- How to practise: attempt the `*Unsolved*` version on paper first, then check against `*Solved*`. (Most Racket parts are already inside the app with checked answers.)

---

## The app (`app/`)

A static, framework-free website: plain HTML/CSS/JS, no build step, no internet needed at runtime.

- **Learn**: 7 topics / 49 sections that follow the slides. Each section has explanations, **runnable/editable code**, visualisers, 🔗 connection callouts, ⚠️ exam traps and inline "check yourself" questions.
- **Visualisers** (`js/viz.js`): environment-frame stepper (let/let*/letrec, set! & closures, counters, aliasing, promises, MUPL lexical scope), box-and-pointer diagrams, AST viewer, "parens always mean something" gallery, thunk/eager/promise counter, memoization counter, **stream explorer** (pulls real values through the interpreter, including broken streams), **macro expander** (pattern bindings, step-by-step expansion, hygienic renaming shown as `y₁`, plus what a naive C-style expansion would print), C preprocessor expander, **interpreter AST evaluator** (checked vs unchecked), free-variable tapping game, sound/complete simulator, static-vs-dynamic claims sorter.
- **Practice** (`js/questions1-4.js`): 194 questions (predict-the-output, multiple choice, write-code with automatic tests, explain/self-marked). 24 are **rewrite / improve / fix** questions (`tag: 'rewrite'`): improve the style, rewrite with map/filter/let/cond, make it tail-recursive, remove mutation, fix a broken stream/promise/macro/interpreter case. Modes: smart review (mistakes first, then new, then oldest correct), rewrite & improve, in order, exam mix, past-exam only, review mistakes, new only.
- **Multiple choice is deliberately balanced**: `questions4.js` holds option sets (`OPTS`, correct answer listed first) where all options have similar length and detail, and the app shuffles option order on every render. Keep it that way: never make the correct option the longest or most detailed one, and never refer to option letters in explanations.
- **Connect** (`js/map.js`): a concept map of 35 concepts and 46 labelled connections (tap one to see how it relates to the others), plus 9 side-by-side comparison tables.
- **Code**: a playground running `js/racket.js`, a mini Racket interpreter (module semantics, the same error messages as Racket, syntax-rules with hygiene, struct, mcons, …). It has a bracket keyboard bar and fixes iPhone "smart quotes" automatically.
- **Cards**: 42 flashcards. **Exam tips**: technique for tracing, "what does it do", bug-fixing, sound/complete.

Progress is saved in `localStorage` on the device.

### File map

```
app/index.html            page shell + all CSS (light/dark mode)
app/js/racket.js          Racket interpreter (reader, evaluator w/ tail calls, macros, printer, primitives)
app/js/viz.js             visualiser widgets + stepper scripts (STEPS)
app/js/questions1.js      basics + scope questions   (also PRELUDES: shared helper code)
app/js/questions2.js      lazy + macros questions
app/js/questions3.js      structs + interpreter + typing questions (contains the full MUPL interpreter prelude)
app/js/questions4.js      balanced multiple-choice options (OPTS overrides) + the rewrite/improve/fix questions
app/js/lessons.js         TOPICS (lesson content), CARDS (flashcards), EXAM_TIPS
app/js/map.js             MAP (concept graph) and COMPARE (comparison tables)
app/js/app.js             router, views, question engine, progress storage, service-worker registration
app/sw.js                 service worker (offline cache). Bump VERSION after any change!
app/manifest.webmanifest  PWA manifest; app/icons/ = home-screen icons
```

### Lesson markup (inside `lessons.js` bodies)

- `<pre data-run>code</pre>`: runnable block (`data-draw` adds a box diagram; `data-prelude="mupl"` preloads helper code)
- `<div data-widget="stepper:let-forms"></div>`: a widget from `Viz.widgets` (`box`, `streams`, `macro`, `lbi`, `freevars`, `venn`, …)
- `<div data-quiz="question-id"></div>`: embed a question from the bank
- `<a data-map="node-id">`: link to a concept on the map

### Question format

```js
{ id, topic: 'basics'|'scope'|'lazy'|'macros'|'structs'|'interp'|'typing', type: 'predict'|'mcq'|'write'|'explain',
  src: 'Wi23 final Q2',            // optional; "final"/"midterm" puts it in Past-exam mode
  q: 'prompt with `code`', code: '...shown code...', prelude: 'mupl' | ['take','nats'],
  parts: [{ ask: '(expr)', a: "'(1 2)" }, { ask: '(bad)', a: 'error', err: 'substring of the Racket error' },
          { ask: '(loop)', a: 'loops forever', nonterm: true }],   // predict; add independent:true to run parts separately
  options: [...], answer: 1,                                       // mcq
  starter, answer: 'model code', tests: [{ run: '(expr)', expect: 'printed value' }], template, // write
  tag: 'rewrite', hint: 'shown by the Hint button',                 // write (optional)
  require: [['regex', 'message']], forbid: [['regex', 'message']],  // write (optional style rules, e.g. must use cond / no set!)
  explain: 'shown after answering' }
```

**After adding or editing questions, run `node tools/verify.js`** (needs Racket installed; `racket` is on PATH on this PC). It runs every predict/write question in real Racket and in `racket.js` and reports any mismatch. It also checks that each model answer obeys its own require/forbid style rules. Last result: 111/111 checkable questions pass.

Known, deliberate interpreter differences: numbers are JS floats (`(/ 1 2)` → `0.5`, huge integers lose precision); `eval` behaves like the DrRacket REPL (as in the slides), not a bare module; long-running programs are stopped after ~3M steps.

---

## Design choices (blueprint for a similar app, e.g. a Ruby version)

This app is meant to be reused as a template for revising another language. Nothing below is Racket-specific unless it says so. To make a version for another language, keep the structure and swap the content and the interpreter.

### Who it's for, and the constraints that drove everything

- **The learner:** knows the material only loosely, struggles most with exam questions that show unlabelled "bad code" and ask what it does, whether it fails, or how to fix or rewrite it. They need to *see* what happens and how ideas connect, not just read definitions.
- **The exam:** closed book, no cheat sheet, short answers (max ~4 lines of code). So the app trains recall and reading code on paper, not looking things up.
- **The device:** an iPhone, used **offline** (camping). So: no server, no accounts, no CDN, no web fonts, no build step, everything cached by a service worker.
- **Source of truth:** the lecture slides define the scope. The old exams define the *style* of questions. Anything in the old exams but not in the slides (here: Racket OOP, subtyping, Ruby) is left out on purpose.

### Content structure

- **One topic per slide deck, in lecture order**, each split into short sections (about 5–9 per topic). Each section is one idea, so it can be read in a couple of minutes and marked "understood".
- **Every section mixes four things:** a short explanation, code the learner can run and edit, a visualiser where the idea is about *what happens when*, and 1–2 inline "check yourself" questions from the bank. Reading alone is never the end of a section.
- **Callout types with fixed meanings:** 🔑 key idea, 🔗 connection to another concept (links into the concept map), ⚠️ exam trap. Keep the set small so they stay meaningful.
- **An "exam skill" section in topics where a technique matters** (e.g. "reading unlabelled code", "add a case to the interpreter"): a numbered routine to follow on paper.
- **Show connections, don't just state them:** a concept map (nodes = concepts, edges = one-sentence explanations of the relationship), plus side-by-side comparison tables for things students confuse (e.g. let vs let* vs letrec, function vs macro, thunk vs promise vs memoization).
- **Flashcards** for definitions that must be recalled word-perfect, and an **Exam tips** page with checklists.

### Questions: types and rules

- **Four types:** `predict` (type what the code evaluates to, part by part, including `error` or `loops forever`), `mcq`, `write` (write or fix code, then run automatic tests), `explain` (write an answer, reveal a model answer, self-mark).
- **Rewrite / improve / fix questions get their own tag and practice mode**, because they are the hardest exam style. Each one shows the bad code, asks for a rewrite, and checks the result with tests plus optional **style rules** (`require` / `forbid` regexes such as "must use cond", "no set!", "recursive call must be last"). Where the point is efficiency or tail recursion, a test is chosen so a bad version actually fails (a huge input, or one that takes exponential time). Each has a **Hint** button before the model answer.
- **Multiple-choice options must not give the answer away.** All options have similar length and level of detail, each wrong option is a believable misconception, and the app **shuffles option order every time**. Explanations never refer to option letters. (The first version failed this: the correct answer was usually the longest and usually option B.)
- **Questions from past exams are tagged with their source** (e.g. "Wi23 final Q2") and have their own practice mode.
- **Every answer is machine-checked against the real language** (`tools/verify.js` runs real Racket). A revision app with wrong answers does more harm than none, so no question ships unverified.
- **Lenient answer matching** for typed answers (ignore spacing, an optional leading quote, iPhone smart quotes), plus an "I was actually right" button for formatting mismatches.

### Practice and progress

- Modes: **Smart review** (past mistakes first, then unseen, then the correct answers seen longest ago: a cheap form of spaced repetition), rewrite & improve, exam mix (random 15), past-exam only, mistakes only, new only, browse all. Topic filter chips apply to every mode.
- Progress (answers, understood sections, known flashcards, code drafts) lives in `localStorage` on the device, behind a wrapper that falls back to memory if storage is blocked.

### The in-browser interpreter (the part to replace for another language)

- Running real code on the phone is what makes most features work: runnable lesson code, "▶ Run it" on predict questions, tests for write questions, the playground, and the stream explorer / macro expander.
- Requirements it was built to: **the same printed output and error messages as the real language** (students learn to read real errors); run a file the way the real tool does (here: Racket module semantics); a step limit and stack-overflow catch so infinite loops become a friendly message instead of freezing the phone; normalise iPhone smart quotes.
- Keep a short documented list of known differences from the real language, and keep the verification script checking the interpreter against the real one.
- **For Ruby:** this would need a small Ruby-subset interpreter in JavaScript built to the same requirements (or an existing one that is small enough to bundle offline), covering only the features in the Ruby slides. Verification would run real `ruby` on the PC instead of `racket`.

### Visualisers

- **Built for the ideas students get wrong, not for decoration.** Each one answers "what happens, step by step?". The most useful pattern is the **stepper**: code with the current line highlighted, a one-sentence note, and a diagram of the program's state (here: environment frames, where each closure is colour-matched to the frame it points to and changed bindings flash).
- **Show broken versions next to correct ones** (wrong streams, naive vs hygienic macro expansion, an interpreter with and without type checks). Seeing the failure teaches the rule.
- **Drive visualisers with the real interpreter where possible**, so what students see matches what really runs. Hand-written step scripts are fine for short, fixed walkthroughs.
- For a Ruby version, the same pattern would fit things like method lookup through classes and mixins, blocks/closures and what they capture, `self`, and duck typing vs static checks.

### Phone UI

- Phone-first, max width ~760px, bottom tab bar (Learn · Practice · Connect · Code · Cards), safe-area padding for the notch, light and dark mode from the system setting.
- Inputs use 16px text so iOS doesn't zoom in, with autocorrect, autocapitalise and spellcheck turned off on code fields. The code editor has a key bar for brackets and common keywords, since they are slow to type on a phone keyboard.
- Lesson sections are collapsed accordions that build their widgets only when opened, so pages stay fast.

### Tech and deployment

- Plain HTML/CSS/JS with no framework and no build step: easy to edit, nothing to install, works from any static host. Each content type is its own data file (lessons, questions, map), separate from the code that renders it.
- Service worker: cache-first with a background refresh, a version constant that must be bumped on every change, disabled on localhost so edits appear immediately while developing.
- Hosted on GitHub Pages (public repo). The learner opens it once online, adds it to the Home Screen, and from then on it works offline.

---

## Putting it on the iPhone (offline)

A PWA needs HTTPS hosting **once**. After that it runs from the phone's cache with no signal.

1. Create a free GitHub repo (e.g. `racket-revision`) → **Add file → Upload files** → drag in **the contents of `app/`** (index.html, sw.js, manifest.webmanifest, `js/`, `icons/`) → Commit.
2. Repo **Settings → Pages** → Source: *Deploy from a branch*, Branch: `main`, folder `/ (root)` → Save. After about a minute it is live at `https://<username>.github.io/racket-revision/`.
3. On the iPhone, open that URL in **Safari** → **Share** → **Add to Home Screen**.
4. **Open it once from the Home Screen while online**, tap around a few pages, then test in **Airplane Mode**. It should all still work.
5. Before leaving: open it again from the Home Screen so the cache is fresh. Progress is stored on the phone.

The live copy is the GitHub repo `JumpyWizard11/Racket-Revision` (this folder), served at https://jumpywizard11.github.io/Racket-Revision/ (a root `index.html` forwards to `app/`).

Updating later: change files → **bump `VERSION` in `app/sw.js`** → commit and push with GitHub Desktop → on the phone, open the app online, close it fully, and open it again (the first open fetches the update, the second uses it).

Local preview on the PC: `python tools/serve.py` → http://localhost:8730 (the service worker is disabled on localhost so edits show immediately).
