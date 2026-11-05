// map.js: the concept map (how ideas connect) and side-by-side comparisons.
(function () {
  // [id, label, topic, lesson "topic/section", x, y]
  const N = [
    ['syntax', 'S-expressions', 'basics', 'basics/syntax', 62, 40], ['specialform', 'Special forms', 'basics', 'basics/syntax', 190, 40], ['dyn', 'Dynamic typing', 'basics', 'basics/dynamic', 318, 40],
    ['lambda', 'lambda', 'basics', 'basics/define', 62, 100], ['truthy', 'cond / truthiness', 'basics', 'basics/cond', 318, 100], ['lists', 'cons & lists', 'basics', 'basics/lists', 190, 100],
    ['currying', 'Currying', 'basics', 'basics/define', 62, 160], ['let', 'let', 'scope', 'scope/let', 190, 160], ['letstar', 'let*', 'scope', 'scope/letstar', 318, 160],
    ['closure', 'Closures', 'scope', 'scope/set', 62, 220], ['letrec', 'letrec', 'scope', 'scope/letrec', 190, 220], ['define', 'define rules', 'scope', 'scope/top', 318, 220],
    ['setbang', 'set! / begin', 'scope', 'scope/set', 62, 280], ['improper', 'Pairs / improper', 'scope', 'scope/cons', 190, 280], ['mcons', 'mcons', 'scope', 'scope/mcons', 318, 280],
    ['thunk', 'Thunks', 'lazy', 'lazy/thunks', 62, 350], ['stream', 'Streams', 'lazy', 'lazy/streams', 190, 350], ['promise', 'Promises', 'lazy', 'lazy/promises', 318, 350],
    ['memo', 'Memoization', 'lazy', 'lazy/memo', 318, 410], ['quote', 'quote / eval', 'macros', 'macros/quote', 62, 410], ['cpp', 'C preprocessor', 'macros', 'macros/cpp', 190, 410],
    ['macro', 'Macros', 'macros', 'macros/macros', 62, 470], ['hygiene', 'Hygiene', 'macros', 'macros/hygiene', 190, 470], ['lbimacro', 'LBI macros', 'interp', 'interp/lbimacro', 318, 470],
    ['listvariant', 'Tagged lists', 'structs', 'structs/diy', 62, 540], ['struct', 'struct', 'structs', 'structs/struct', 190, 540], ['interp', 'Interpreter', 'interp', 'interp/ast', 318, 540],
    ['env', 'Environments', 'interp', 'interp/env', 318, 600], ['closureimpl', 'Closures (impl.)', 'interp', 'interp/closures', 190, 600], ['freevars', 'Free variables', 'interp', 'interp/free', 62, 600],
    ['static', 'Static checking', 'typing', 'typing/static', 62, 670], ['sound', 'Sound / complete', 'typing', 'typing/sound', 190, 670], ['undecidable', 'Undecidability', 'typing', 'typing/undecidable', 318, 670],
    ['weak', 'Weak typing', 'typing', 'typing/weak', 126, 730], ['claims', '7 claim pairs', 'typing', 'typing/claims', 254, 730],
  ];
  const E = [
    ['syntax', 'specialform', 'Every ( … ) is either a special form or a function call. Only special forms may skip evaluating their parts.'],
    ['syntax', 'quote', 'Code is data: the syntax already IS a tree, so quoting code gives you that tree as a list of symbols.'],
    ['specialform', 'thunk', '`if` is lazy only because it is a special form. A function evaluates all its arguments, unless you hand it thunks.'],
    ['specialform', 'macro', 'Defining a macro creates a NEW special form: its arguments are no longer evaluated first.'],
    ['lambda', 'thunk', 'A thunk is just a lambda with zero parameters: (lambda () e).'],
    ['lambda', 'currying', 'Currying = lambdas that return lambdas. You need extra parens to call: ((pow 2) 4).'],
    ['lambda', 'closure', 'Evaluating a lambda produces a closure: the code plus a reference to the environment it was made in.'],
    ['closure', 'setbang', 'Closures REFERENCE their environment, so a later set! is visible when the closure runs (the b/g example).'],
    ['closure', 'closureimpl', 'The interpreter makes this explicit: (struct closure (env fun)). Calls use the closure\'s env, never the caller\'s.'],
    ['closure', 'memo', 'A memo table hidden in a closure persists between calls. WHERE the binding sits decides how long the cache lives.'],
    ['let', 'letstar', 'let* is sugar for nested lets: each binding sees the previous ones.'],
    ['let', 'letrec', 'Same syntax, but a different environment for the right-hand sides: outer (let) vs all bindings in scope (letrec).'],
    ['letrec', 'define', 'Local define and top-level define both have letrec semantics: forward references only inside function bodies.'],
    ['letrec', 'stream', 'Stream producers use a letrec helper (f x) that conses x onto a thunk calling (f next).'],
    ['letstar', 'macro', 'my-let* is a recursive macro that expands into nested lets, which proves let* is just sugar.'],
    ['let', 'interp', 'mlet / mlet2 in an interpreter: let vs let* is just WHICH environment you pass when evaluating e2.'],
    ['lists', 'improper', 'A list is nothing but pairs ending in null. End in something else and you get an improper list.'],
    ['improper', 'mcons', 'cons cells are immutable (so aliasing is harmless). mcons is a separate, mutable pair type.'],
    ['lists', 'listvariant', 'Lists + symbols can simulate variants: (list \'Add e1 e2) with eq? checks on the tag.'],
    ['listvariant', 'struct', 'struct does the same job safely: a genuinely new type that car/cdr can\'t break and fake values can\'t fool.'],
    ['struct', 'interp', 'LBI programs are ASTs built from structs, so the interpreter is a cond over struct predicates.'],
    ['dyn', 'truthy', 'With no static types, conditions can be any value, so Racket defines everything except #f as true.'],
    ['dyn', 'struct', 'Type predicates (number?, const?) replace OCaml\'s pattern matching on constructors.'],
    ['dyn', 'static', 'Checking at run time vs before running: what each catches, costs and allows.'],
    ['dyn', 'interp', 'The interpreter performs DYNAMIC type checks on LBI values (add applied to non-number…).'],
    ['thunk', 'stream', 'A stream IS a thunk that returns a pair (value . another-stream).'],
    ['thunk', 'promise', 'A promise is a thunk plus a cache, so it is computed at most once (call-by-need).'],
    ['mcons', 'promise', 'Our promise is an mcons: (#f . thunk) becomes (#t . value) after the first force.'],
    ['setbang', 'promise', 'my-force uses set-mcar! and set-mcdr! to store the computed answer.'],
    ['promise', 'memo', 'Promise = remember one answer. Memoization = remember one answer per ARGUMENT (an assoc-list table).'],
    ['setbang', 'memo', 'The memo table is extended with set!, so the function must be pure for this to be valid.'],
    ['macro', 'promise', 'my-delay as a macro adds the (lambda () …) for you. A function can\'t, because its argument would already be evaluated.'],
    ['quote', 'macro', 'Macros rewrite code-as-data before evaluation. quote + eval is the manual version.'],
    ['cpp', 'macro', 'C\'s #define is a dumb text-replacement macro system that runs before compiling.'],
    ['cpp', 'hygiene', 'C macros capture variables and break precedence. Racket\'s hygiene and parens fix both.'],
    ['macro', 'hygiene', 'Racket renames variables a macro introduces and looks up free template names where the macro was defined.'],
    ['hygiene', 'closure', 'Hygiene is lexical scope for macros, the same principle closures follow for functions.'],
    ['macro', 'lbimacro', 'The same idea one level up: build LBI code before it runs. But those "macros" are NOT hygienic.'],
    ['interp', 'lbimacro', 'A Racket function returning an LBI AST works as an LBI macro, with no interpreter change. It can only use existing constructs.'],
    ['interp', 'env', 'eval-under-env carries an environment: a list of (string . value) pairs, newest first.'],
    ['env', 'closureimpl', 'Evaluating a fun captures the CURRENT env inside a closure.'],
    ['closureimpl', 'freevars', 'Store only the free variables in a closure. Compiling this = closure conversion (an extra env argument).'],
    ['static', 'sound', 'A type system is judged by soundness (no false negatives) and completeness (no false positives).'],
    ['sound', 'undecidable', 'No checker can always terminate AND be sound AND be complete, which is why OCaml rejects some harmless programs.'],
    ['static', 'weak', 'Weak typing (C/C++) = no guaranteed static or dynamic checks. Racket is NOT weak: it checks at run time.'],
    ['static', 'claims', 'Seven pairs of arguments: convenience, useful programs, early bugs, speed, reuse, prototyping, evolution.'],
  ];
  window.MAP = { nodes: N.map(([id, label, topic, lesson, x, y]) => ({ id, label, topic, lesson, x, y })), edges: E.map(([a, b, why]) => ({ a, b, why })) };

  // ---------- side-by-side comparisons ----------
  window.COMPARE = [
    { title: 'let vs let* vs letrec vs define', html: `<table class="cmp small"><tr><th></th><th>RHS evaluated in…</th><th>Use for</th><th><code>([x y] [y x])</code>, x=15, y=17</th></tr>
<tr><td><b>let</b></td><td>the outer env (none of the new names)</td><td>shadowing, swaps, default</td><td><code>'(17 . 15)</code></td></tr>
<tr><td><b>let*</b></td><td>outer env + earlier bindings</td><td>sequences</td><td><code>'(17 . 17)</code></td></tr>
<tr><td><b>letrec</b></td><td>all new names in scope, evaluated in order</td><td>(mutual) recursion</td><td>error: y used before initialization</td></tr>
<tr><td><b>local define</b></td><td>same as letrec</td><td>preferred style in real Racket</td><td>(same as letrec)</td></tr></table>` },
    { title: 'Eager vs thunk vs promise vs memoization', html: `<table class="cmp small"><tr><th></th><th>When computed</th><th>How many times</th><th>Mechanism</th></tr>
<tr><td><b>eager</b> (normal argument)</td><td>immediately</td><td>exactly once, even if unused</td><td>default rule for calls</td></tr>
<tr><td><b>thunk</b></td><td>each time it is called</td><td>0, 1 or many</td><td><code>(lambda () e)</code></td></tr>
<tr><td><b>promise</b></td><td>the first time it is forced</td><td>at most once</td><td>thunk + mcons flag/cache</td></tr>
<tr><td><b>memoization</b></td><td>the first time for each argument</td><td>at most once per argument</td><td>table (assoc list) + set!</td></tr>
<tr><td><b>stream</b></td><td>one element per call</td><td>as many as the consumer asks for</td><td>thunk → (value . stream)</td></tr></table>` },
    { title: 'Function vs macro', html: `<table class="cmp small"><tr><th>Function</th><th>Macro</th></tr>
<tr><td>Runs at run time</td><td>Expands before the program runs</td></tr>
<tr><td>Arguments evaluated first, exactly once, left to right</td><td>Arguments pasted in as syntax: evaluated 0, 1 or many times, in template order</td></tr>
<tr><td>A first-class value: can be passed around</td><td>A special form: not a value</td></tr>
<tr><td>Use it whenever possible</td><td>Only when a function can't do the job</td></tr></table>` },
    { title: 'C preprocessor vs Racket macros', html: `<table class="cmp small"><tr><th></th><th>C #define</th><th>Racket syntax-rules</th></tr>
<tr><td>Works on</td><td>text (tokens, no structure)</td><td>syntax trees (tokens)</td></tr>
<tr><td>Precedence</td><td>broken: add parens everywhere</td><td>no problem: the parens are the structure</td></tr>
<tr><td>Variable capture</td><td>yes: use weird / ALL-CAPS names</td><td>no: hygiene renames</td></tr>
<tr><td>Free names</td><td>resolved where used (like dynamic scope)</td><td>resolved where defined (lexical)</td></tr>
<tr><td>Repeated evaluation</td><td>yes</td><td>yes! Still your job (use let)</td></tr></table>` },
    { title: 'Tagged list vs struct', html: `<table class="cmp small"><tr><th>Tagged list</th><th>struct</th></tr>
<tr><td><code>(list 'Add e1 e2)</code>; list? is #t</td><td><code>(add e1 e2)</code>; a brand-new type</td></tr>
<tr><td>car/cdr break the abstraction</td><td>Only the accessors work</td></tr>
<tr><td><code>(cons 'Add "gotcha")</code> fools Add?</td><td>Predicates can't be fooled</td></tr>
<tr><td>Can be written with functions</td><td>Must be a primitive feature</td></tr></table>` },
    { title: 'Interpreter vs compiler', html: `<table class="cmp small"><tr><th>Interpreter</th><th>Compiler</th></tr>
<tr><td>Written in M; takes an LBI program and produces its answer</td><td>Written in M; translates LBI into an equivalent program in T</td></tr>
<tr><td>"evaluator, executor"</td><td>"translator": must preserve meaning</td></tr>
<tr><td>Closures: store the env in a struct</td><td>Closures: closure conversion (an extra env argument)</td></tr></table><p class="small">Both are properties of IMPLEMENTATIONS, not languages.</p>` },
    { title: 'Syntax error vs dynamic type error (in an LBI)', html: `<table class="cmp small"><tr><th>Illegal AST</th><th>Legal AST, wrong values</th></tr>
<tr><td><code>(negate -7)</code>, <code>(const #t)</code></td><td><code>(add (const 3) (bool #t))</code></td></tr>
<tr><td>The parser's job: crashing is fine</td><td>Must check every value used and report in LBI terms</td></tr></table>` },
    { title: 'Sound vs complete', html: `<table class="cmp small"><tr><th>Sound</th><th>Complete</th></tr>
<tr><td>Never ACCEPTS a program that can do X</td><td>Never REJECTS a program that can't do X</td></tr>
<tr><td>No false negatives</td><td>No false positives</td></tr>
<tr><td>The usual goal (you can trust it)</td><td>Usually given up (undecidability)</td></tr>
<tr><td>Broken by accepting more</td><td>Broken by rejecting more</td></tr>
<tr><td>Trivially achieved by rejecting everything</td><td>Trivially achieved by accepting everything</td></tr></table>` },
    { title: 'OCaml vs Racket', html: `<table class="cmp small"><tr><th></th><th>OCaml</th><th>Racket</th></tr>
<tr><td>Types</td><td>static, inferred</td><td>dynamic (tagged values)</td></tr>
<tr><td>Data</td><td>variants + match</td><td>struct + predicates (+ cons for anything)</td></tr>
<tr><td>let</td><td>sequential (like let*)</td><td>let / let* / letrec, all different</td></tr>
<tr><td>Top level</td><td>shadowing allowed</td><td>letrec-like, no duplicates</td></tr>
<tr><td>Mutation</td><td>ref cells</td><td>set!, mcons</td></tr>
<tr><td>Truth</td><td>bool only</td><td>everything except #f is true</td></tr>
<tr><td>Macros</td><td>no (preprocessors exist)</td><td>hygienic syntax-rules</td></tr></table>` },
  ];
})();
