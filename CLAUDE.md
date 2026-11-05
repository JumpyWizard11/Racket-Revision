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
- **Practice** (`js/questions1-3.js`): 170 questions (predict-the-output, multiple choice, write-code with automatic tests, explain/self-marked). There are 54 tagged with the past exam they came from. Modes: in order, exam mix, past-exam only, review mistakes, new only.
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
  explain: 'shown after answering' }
```

**After adding or editing questions, run `node tools/verify.js`** (needs Racket installed; `racket` is on PATH on this PC). It runs every predict/write question in real Racket and in `racket.js` and reports any mismatch. Last result: 87/87 checkable questions pass.

Known, deliberate interpreter differences: numbers are JS floats (`(/ 1 2)` → `0.5`, huge integers lose precision); `eval` behaves like the DrRacket REPL (as in the slides), not a bare module; long-running programs are stopped after ~3M steps.

---

## Putting it on the iPhone (offline)

A PWA needs HTTPS hosting **once**. After that it runs from the phone's cache with no signal.

1. Create a free GitHub repo (e.g. `racket-revision`) → **Add file → Upload files** → drag in **the contents of `app/`** (index.html, sw.js, manifest.webmanifest, `js/`, `icons/`) → Commit.
2. Repo **Settings → Pages** → Source: *Deploy from a branch*, Branch: `main`, folder `/ (root)` → Save. After about a minute it is live at `https://<username>.github.io/racket-revision/`.
3. On the iPhone, open that URL in **Safari** → **Share** → **Add to Home Screen**.
4. **Open it once from the Home Screen while online**, tap around a few pages, then test in **Airplane Mode**. It should all still work.
5. Before leaving: open it again from the Home Screen so the cache is fresh. Progress is stored on the phone.

Updating later: change files → **bump `VERSION` in `app/sw.js`** → upload again → open the app online twice (the first open fetches the update, the second uses it).

Local preview on the PC: `python tools/serve.py` → http://localhost:8730 (the service worker is disabled on localhost so edits show immediately).
