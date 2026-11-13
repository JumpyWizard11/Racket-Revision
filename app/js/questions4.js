// Question bank part 4:
//  (1) balanced multiple-choice options, so the right answer is not the longest/most detailed one
//      (the app also shuffles option order every time);
//  (2) "rewrite / improve / fix this code" questions in the style of the old exams (tag: 'rewrite').
(function () {
  const P = window.PRELUDES, Q = window.QUESTIONS;
  const byId = Object.fromEntries(Q.map(q => [q.id, q]));

  // ---------- (1) balanced options: the CORRECT answer is listed first, the app shuffles ----------
  const OPTS = {
    'b-fw5': ['Error: arity mismatch, fact-wrong5 was called with 0 arguments', 'Error: application: not a procedure (it tried to call a number)', 'Returns 6: the extra parentheses are simply ignored', 'Infinite loop: the base case is never reached'],
    'b-fw4': ['*: contract violation: expected number?, given a procedure', 'application: not a procedure: it tried to call the number 3', 'arity mismatch: fact-wrong4 was called with 0 arguments', 'No error: * ignores the extra argument and returns 6'],
    'b-fw2': ['Fails with "if: bad syntax" before anything runs; nothing is printed', 'Prints 3, then fails with "if: bad syntax" only when fact-wrong2 is later called', 'Prints 3; the definition is fine because = is a valid value', 'Fails with "=: contract violation" as soon as the file is loaded'],
    'b-fw3': ['define: bad syntax, because define sees a name followed by two expressions', 'n: unbound identifier, because n is used before it is defined', 'Nothing: this is the curried form of a function definition', 'arity mismatch when it is called, because fact-wrong3 was defined to take no arguments'],
    'b-whatdoes1': ['Keeps the 1st, 3rd, 5th… elements (drops every second one)', 'Keeps the 2nd, 4th, 6th… elements (drops every first one)', 'Removes the last element whenever the length is even', 'Pairs up adjacent elements into two-element lists'],
    'b-ast': ['The code is written directly as its syntax tree, so parsing is trivial and code is data', 'Parentheses mark the places where evaluation must be delayed, which is what makes Racket lazy', 'They replace type annotations, letting the compiler infer types statically', 'They are only a LISP tradition; the parser would work the same without them'],
    'b-partition': ['Depends on f: yes if f is pure, but not always if f has state', 'Yes, always: partitioning an already-partitioned list changes nothing', 'No, never: the second version loses the elements for which f was false', 'Depends on xs: yes for lists of numbers, no for lists with mixed types'],
    's-double': ['Yes: both return 2x, although y is computed from a different x', 'No: double1 returns 2x, but double2 returns 2x + 3', "No: double1 fails, because y's right-hand side cannot see x", 'Only when x = 5: the constants -5 and -8 were chosen for that case'],
    's-mod2': ['letrec (or local define), so each function can see the other', 'let*, because the second binding can see the first one', 'let, because lambdas only look up variables when called', 'Any of them: the choice is only a matter of style'],
    's-toplevel': ['Error: v: undefined; cannot reference an identifier before its definition', 'w is 9, because top-level definitions are allowed to refer to ones that come later', 'w is #<undefined> until v is defined, and then becomes 9', 'Error: module: identifier already defined in: v'],
    's-toplevel2': ['Error: module: identifier already defined (and nothing in the file runs)', 'f is 17 afterwards: the second define simply shadows the first one, as in OCaml', 'f is 17 afterwards: a second define acts like set! on the first', 'f stays 1: a later definition of an existing name is ignored'],
    's-setbang-mcq': ['Evaluates e and updates the existing binding of x; closures using that x see the change', 'Evaluates e and creates a brand-new binding that shadows the old x from this point onwards', 'Mutates the contents of the pair or list that x currently points to', 'Updates x only inside the current function; closures keep the old value'],
    'l-myif': ['Arguments are evaluated before the call, so the recursive call runs even when n = 0', 'my-if-wrong has its two branches backwards, so the base case can never be chosen for any n', 'if evaluates both of its branches when it is used inside a function body', '(= n 0) is evaluated lazily, so the test never actually happens'],
    'l-thunk-def': ['A zero-argument function used only to delay a computation', 'A mutable pair holding a flag and a cached result', 'A macro that stops its argument from being evaluated', 'A function that remembers the results of earlier calls'],
    'l-perf': ['When the result is needed more than once: it is recomputed every time', 'When the result is never needed: building the lambda wastes time', 'When the result is needed exactly once: the call adds a big overhead', 'Never: a thunk caches its result after the first call'],
    'l-stream-def': ['A thunk that returns a pair: the next value and a stream for the rest', 'A pair: the next value and a thunk that returns the rest of the values', 'A promise that, when forced, returns a list of all remaining values', 'A list whose elements are thunks, each computing one value'],
    'l-memo-where': ['Each call would start with an empty table, so separate calls share nothing', 'Exactly the same: letrec creates the table only once either way', 'It would be exponential again, since f could no longer see the memo table at all', 'It would not run: letrec is not allowed inside a function body'],
    'l-memo-when': ['The function is pure, results get reused, and the cache is cheaper than recomputing', 'The function is recursive, uses tail calls, and its arguments are numbers', 'The function has side effects, and they must happen only once for each different argument', 'The function is defined with letrec, so the table can be shared safely'],
    'm-symbols': ['Interned strings: one copy each, so eq? comparison is fast', 'Ordinary strings that are printed without their quotes', 'Variables whose value has not been looked up yet', 'Zero-argument macros that expand to their own name'],
    'm-when': ['Before the program runs, rewriting syntax even inside function bodies', "At run time, each time the macro's name is called like a function", 'At run time, but only the first time; then the result is cached', 'Before the program runs, but only for uses at the top level of the file'],
    'm-hyg-mcq': ['Macro-introduced variables are renamed, and free template names resolve where the macro was defined', 'Macro arguments are evaluated exactly once, and always in left-to-right order', 'Macro-introduced variables are renamed, and arguments are evaluated at most once', 'Free template names resolve where the macro is used, and macro-introduced variables keep their names'],
    'm-for': ['So lo and hi are evaluated once, while body is re-evaluated each time', 'Because hygiene would otherwise rename lo and hi and break the loop', 'So that body can refer to l and h as loop variables inside the loop', 'Because pattern variables cannot be used inside a letrec in a template'],
    'm-macro-or-fn': ['my-delay: (my-delay e) must not evaluate e yet', 'my-force: it must run the delayed thunk only once', 'dbl: it must avoid evaluating its argument twice', 'max-of-list: it must avoid repeating the recursive call'],
    'm-delay-macro': ["Double thunk: forcing returns the inner lambda, not slow's result", 'Works the same: the macro detects the lambda and reuses it', "Syntax error: my-delay's pattern does not match a lambda", 'slow runs twice: once in the macro and once when forced'],
    'm-token': ['Neither changes: macros work on tokens, and each of those is a single token', 'Both change: every occurrence of the four characters h-e-a-d is replaced by c-a-r', 'Only head-door changes, because the hyphen separates two tokens', "Only headt changes, because it starts with the macro's name"],
    'st-why': ["A new type: wrong accessors fail, predicates can't be fooled, errors are clearer", 'Structs are statically type-checked, so field errors are found before the program runs', 'Structs are faster, because list-based variants must copy their fields', 'Structs are sugar for tagged lists, so they are just shorter to write'],
    'st-whyvariants': ['Only (2): values already carry type tags, but tree nodes still need labels', "Only (1): lists can't mix types without a wrapper, but trees need no labels", 'Both: Racket needs a struct wherever OCaml would use a variant', 'Neither: cons cells and type predicates cover both uses completely'],
    'st-whyexp': ["Results can be many kinds of LBI values, kept apart from Racket's own", 'Returning structs is faster than returning plain Racket numbers from each case', 'struct accessors only accept expressions, never plain numbers', 'It removes the need for recursion in the add and multiply cases'],
    'st-gross': ['The number of numbers (nodes) in the tree', 'The sum of all the numbers in the tree', "The depth of the tree's longest branch", 'Always 0, because x is rebound on each call'],
    'i-lbim': ['M = Racket, LBI = arithmetic; LBI programs are Racket structs', 'M = arithmetic, LBI = Racket; Racket programs are the data', 'Both are Racket, since the arithmetic language has no parser', 'M = Racket, LBI = Racket; structs are just a part of Racket'],
    'i-compiled': ['Imprecise: compiled/interpreted describes an implementation, not a language', 'Correct: compiled languages always run faster than interpreted ones', 'Wrong: Java is also compiled, so the two must run at the same speed', 'Wrong: C is really interpreted by the CPU, so it is actually an interpreted language'],
    'i-interp-vs-comp': ['Written in M; translates an LBI program into an equivalent program in T', 'Written in M; takes an LBI program and directly produces its answer', 'Written in T; checks an LBI program for type errors before it runs', 'Written in LBI; turns concrete syntax into an abstract syntax tree'],
    'i-closure': ['A closure: the function plus the current environment', 'Itself: a function expression is already a value', 'A closure: the function plus an empty environment', 'The value of its body in the current environment'],
    'i-call': ["The closure's environment, extended with the argument (and the function's own name)", "The caller's current environment, extended with the argument's value", "The top-level (global) environment, extended with the argument (and the function's own name)", "The closure's environment only; the argument is substituted into the body"],
    'i-callpair': ['No: it evaluates e itself again instead of (callpair-e e), so it never terminates', 'No: it should use first and second instead of apair-e1 and apair-e2', "No: the call is evaluated in env, but it should be evaluated in the closure's environment", 'Yes: it evaluates the subexpression, checks for a pair, then calls it'],
    'i-callpair2': ['No: apair-e1 is a Racket accessor run right now on (var "x"), which is not an apair', 'No: "x" may shadow a variable of the user\'s, so the wrong closure could end up being called', 'No: mlet evaluates (callpair-e e) twice, once for each use of (var "x")', 'Yes: mlet binds the pair to "x", and the call then takes it apart'],
    'i-mmax-why': ['MUPL has no construct to test whether a value is an int', 'MUPL macros cannot use mlet to name their arguments', 'MUPL macros are expanded at run time, after evaluation', "MUPL's isgreater raises an error when given two ints"],
    'i-freewhy': ['So a closure can store a smaller environment with only the bindings it could use', 'So the interpreter can report every unbound variable before any function is called', 'So the type checker can give each function a more precise type', 'So functions with no free variables can be run before the program starts'],
    'i-closconv': ['Every function takes an extra environment argument, used to look up free variables', 'Every function is inlined at each of its call sites, so no environments are needed at all', 'Every free variable becomes a global that calls save and restore', 'Every closure is run by a small interpreter shipped inside the target code'],
    't-defs': ['It never accepts a program that, on some input, does X', 'It never rejects a program that, on every input, avoids X', 'It always terminates, whether it accepts or rejects', 'It accepts exactly the programs that never do X'],
    't-complete': ['Incomplete (a false positive)', 'Unsound (a false negative)', 'Undecidable (it may loop)', 'Weakly typed (no checks)'],
    't-undecidable': ['It is undecidable: no checker can always terminate, be sound and be complete', 'It is decidable but too slow: checking would take exponential time', 'It is impossible only for dynamically typed languages like Racket', 'It is possible, but only if the checker also runs the program on some test inputs'],
    't-lion-h': ['EitherWay: yes. WhyNotBoth: no', 'EitherWay: no. WhyNotBoth: yes', 'Both of them are complete', 'Neither of them is complete'],
    't-wi23-add': ['Sound and still incomplete (add a harmless program)', 'Sound and complete (add the one missing program)', 'Unsound and complete (add a program that misbehaves)', 'None: adding any program at all breaks soundness'],
    't-sp23-de': ['[24]: still sound. ["hi"]: unsound', '[24]: unsound. ["hi"]: still sound', 'Both changes keep it sound', 'Both changes make it unsound'],
    't-au18-rule': ['e1 must be bool; e2 and e3 must have the same type t, the type of the whole if', "e1 must be bool; the whole if has e2's type, and e3 is allowed to have any type at all", 'e1 may have any type; e2 and e3 must have the same type t', 'e1 must be bool; e2 and e3 may differ, giving a union type'],
    't-prevent': ['List.hd [] raising an exception', 'Adding a number to a string', 'Using an undefined variable', 'Calling an int as a function'],
    't-weak': ['No guaranteed checks at all: a wrong program may do anything', 'Checks happen at run time instead of at compile time', 'Checks exist, but implicit conversions hide most errors', 'Types are inferred, so the programmer never writes them'],
    't-bigvariant': ['A language with one big variant type: every value is tagged, and primitives check the tags', 'A language with no types at all: values are just raw bits, which each primitive reinterprets', "A language where every expression has type 'a, which is checked statically", "A language with OCaml's types, but checked lazily when a module loads"],
    't-primitive': ['The run-time semantics of the primitive itself', 'Static vs dynamic typing: only dynamic languages can allow it', 'Soundness: allowing it would make the type system unsound', 'Completeness: rejecting it would be a false positive'],
    't-gradual': ['Gradual typing: mixing static and dynamic checking', 'Weak typing: skipping checks for performance', 'Hygienic typing: renaming types during expansion', 'Closure conversion: passing types as arguments'],
  };
  for (const [id, options] of Object.entries(OPTS)) { const q = byId[id]; if (q) { q.options = options; q.answer = 0; } }
  // explanations must not refer to option letters, because options are shuffled
  if (byId['l-ones-wrong']) byId['l-ones-wrong'].explain = '`(define ones (lambda () (cons 1 ones)))` is correct (so is `(define (ones) (cons 1 ones))`). `(cons 1 ones)` with no lambda uses ones before it is defined. `(lambda () (cons 1 (ones)))` loops forever when called, because the cdr calls ones immediately instead of delaying it. `(define (ones) (lambda () ...))` is a double thunk: calling it returns a lambda, not a pair.';

  // ---------- (2) rewrite / improve / fix questions ----------
  P.addindex = `(define (add-index xs)   ; '(a b) -> '((1 . a) (2 . b))
  (letrec ([g (lambda (i xs)
                (if (null? xs) null
                    (cons (cons i (car xs)) (g (+ i 1) (cdr xs)))))])
    (g 1 xs)))`;
  // MUPL interpreter with one case cut out, so you can rewrite that case
  const cut = (from, to) => { const s = P.mupl; return s.slice(0, s.indexOf(from)) + '<<ANSWER>>\n        ' + s.slice(s.indexOf(to)); };

  const R = (q) => Q.push(Object.assign({ type: 'write', tag: 'rewrite' }, q));

  R({ id: 'rw-cond', topic: 'basics', src: 'exam style: improve the style',
    q: 'The style of this function is poor (nested ifs). Rewrite it with **cond**, keeping the same behaviour.',
    code: `(define (sign-word n)
  (if (< n 0) "neg" (if (= n 0) "zero" (if (< n 10) "small" "big"))))`,
    starter: `(define (sign-word n)\n  )`,
    answer: `(define (sign-word n)
  (cond [(< n 0) "neg"]
        [(= n 0) "zero"]
        [(< n 10) "small"]
        [#t "big"]))`,
    require: [['\\(cond', 'use cond']], forbid: [['\\(if\\b', 'no if: use cond clauses']],
    tests: [{ run: '(sign-word -3)', expect: '"neg"' }, { run: '(sign-word 0)', expect: '"zero"' }, { run: '(sign-word 5)', expect: '"small"' }, { run: '(sign-word 50)', expect: '"big"' }],
    hint: 'One clause per test, in the same order as the ifs. The final else becomes [#t "big"].',
    explain: 'Each nested if becomes one clause; the innermost else becomes the `[#t ...]` clause. The slides call cond "better style than nested ifs".' });

  R({ id: 'rw-boolean', topic: 'basics', src: 'exam style: improve the style',
    q: 'Two style problems here: an `if` that just returns #t/#f, and a lambda that only wraps another function. Rewrite `all-empty?` in one short line with neither.',
    code: `(define (all-empty? xss)
  (andmap (lambda (xs) (if (null? xs) #t #f)) xss))`,
    starter: `(define (all-empty? xss)\n  )`,
    answer: `(define (all-empty? xss)
  (andmap null? xss))`,
    forbid: [['\\(if\\b', 'no if needed'], ['lambda', 'no lambda needed: pass the function itself']],
    tests: [{ run: '(all-empty? (list null null))', expect: '#t' }, { run: '(all-empty? (list null (list 1)))', expect: '#f' }],
    hint: '(if c #t #f) is just c. And (lambda (x) (f x)) is just f.',
    explain: '`(if (null? xs) #t #f)` is the same as `(null? xs)`, and `(lambda (xs) (null? xs))` is the same as `null?`. The slides call this "unnecessary function wrapping".' });

  R({ id: 'rw-collatz', topic: 'basics', src: 'OCaml midterm Q3 style: translate',
    q: 'Translate this Python function into a recursive Racket function `collatz` (no mutation, no helper).',
    code: `; def collatz(n):
;     i = 0
;     while n != 1:
;         if n % 2 == 0: n = n / 2
;         else:          n = 3 * n + 1
;         i += 1
;     return i`,
    starter: `(define (collatz n)\n  )`,
    answer: `(define (collatz n)
  (if (= n 1)
      0
      (+ 1 (collatz (if (even? n) (quotient n 2) (+ (* 3 n) 1))))))`,
    forbid: [['set!', 'no mutation']],
    tests: [{ run: '(collatz 12)', expect: '9' }, { run: '(collatz 1)', expect: '0' }, { run: '(collatz 27)', expect: '111' }],
    hint: 'The loop condition becomes the base case. Each loop iteration becomes "1 + the answer for the next n".',
    explain: 'A while loop becomes recursion: the exit test is the base case, and the loop body computes the argument of the recursive call. This version is NOT tail recursive, because `(+ 1 ...)` still has work to do after the call returns.' });

  R({ id: 'rw-collatz-tail', topic: 'basics', src: 'OCaml midterm Q3 style: make it tail-recursive',
    q: 'This `collatz` is not tail-recursive. Rewrite it as `collatz-tr` using a local helper with an accumulator.',
    code: `(define (collatz n)
  (if (= n 1)
      0
      (+ 1 (collatz (if (even? n) (quotient n 2) (+ (* 3 n) 1))))))`,
    starter: `(define (collatz-tr n)\n  (letrec ([go (lambda (n acc)\n                 )])\n    (go n 0)))`,
    answer: `(define (collatz-tr n)
  (letrec ([go (lambda (n acc)
                 (if (= n 1)
                     acc
                     (go (if (even? n) (quotient n 2) (+ (* 3 n) 1)) (+ acc 1))))])
    (go n 0)))`,
    forbid: [['\\(\\+ 1 \\(', 'the recursive call must be the LAST thing done: no (+ 1 (...)) around it']],
    tests: [{ run: '(collatz-tr 12)', expect: '9' }, { run: '(collatz-tr 1)', expect: '0' }, { run: '(collatz-tr 27)', expect: '111' }],
    hint: 'Carry the count in acc. Base case returns acc; the recursive call passes (+ acc 1).',
    explain: 'Tail-recursive = nothing is left to do after the recursive call. The pending `(+ 1 ...)` moves into the accumulator argument.' });

  R({ id: 'rw-sum-tail', topic: 'basics', src: 'exam style: make it tail-recursive',
    q: 'Rewrite `sum` as a tail-recursive `sum-tr`. (The first test uses a 50,000-element list: in this app a non-tail version runs out of memory on it.)',
    code: `(define (sum xs)
  (if (null? xs) 0 (+ (car xs) (sum (cdr xs)))))`,
    starter: `(define (sum-tr xs)\n  )`,
    answer: `(define (sum-tr xs)
  (letrec ([go (lambda (xs acc)
                 (if (null? xs) acc (go (cdr xs) (+ acc (car xs)))))])
    (go xs 0)))`,
    tests: [{ run: '(sum-tr (range 0 50000))', expect: '1249975000' }, { run: '(sum-tr null)', expect: '0' }],
    hint: 'Helper (go xs acc): when xs is empty return acc, else (go (cdr xs) (+ acc (car xs))).',
    explain: 'The accumulator holds the sum so far, so the recursive call is the whole result and needs no extra stack.' });

  R({ id: 'rw-map', topic: 'basics', src: 'OCaml midterm Q4 style: rewrite with a library function',
    q: 'Rewrite `foo` using the library function **map** instead of explicit recursion.',
    code: `(define (foo xs)
  (if (null? xs)
      null
      (cons (* 2 (car xs)) (foo (cdr xs)))))`,
    starter: `(define (foo xs)\n  )`,
    answer: `(define (foo xs)
  (map (lambda (x) (* 2 x)) xs))`,
    require: [['\\(map\\b', 'use map']], forbid: [['\\(foo \\(cdr', 'no recursive call to foo']],
    tests: [{ run: '(foo (list 1 2 3))', expect: "'(2 4 6)" }, { run: '(foo null)', expect: "'()" }],
    hint: 'What happens to EACH element? Put that in a lambda and give it to map.',
    explain: 'Recognise the shape: "cons (something with car) onto (recursion on cdr)" is map. "Keep car only if a test holds" is filter. "Combine car with the recursive result" is a fold.' });

  R({ id: 'rw-filter', topic: 'basics', src: 'OCaml midterm Q4 style: rewrite with library functions',
    q: 'First work out what `bar` computes. Then rewrite it with no explicit recursion, using **filter** and **length**.',
    code: `(define (bar xs)
  (cond [(null? xs) 0]
        [(even? (car xs)) (+ 1 (bar (cdr xs)))]
        [#t (bar (cdr xs))]))`,
    starter: `(define (bar xs)\n  )`,
    answer: `(define (bar xs)
  (length (filter even? xs)))`,
    require: [['filter', 'use filter']], forbid: [['\\(bar \\(cdr', 'no recursive call to bar']],
    tests: [{ run: '(bar (list 1 2 3 4 6))', expect: '3' }, { run: '(bar null)', expect: '0' }],
    hint: 'bar counts the even numbers. Keep only the evens, then count them.',
    explain: 'bar counts how many elements are even. Note `even?` is passed directly: no lambda wrapper is needed.' });

  R({ id: 'rw-mapindex', topic: 'basics', src: 'Au18 final Q1d',
    q: '`map-index1` calls f with a position (starting at 1) and an element. Rewrite it as `map-index2` using **map** and the helper `add-index` (already loaded).',
    prelude: 'addindex',
    code: `(define (map-index1 f xs)
  (letrec ([g (lambda (i xs)
                (if (null? xs) null
                    (cons (f i (car xs)) (g (+ i 1) (cdr xs)))))])
    (g 1 xs)))`,
    starter: `(define (map-index2 f xs)\n  (map (lambda (pr) ___) (add-index ___)))`,
    answer: `(define (map-index2 f xs)
  (map (lambda (pr) (f (car pr) (cdr pr))) (add-index xs)))`,
    tests: [{ run: '(map-index2 (lambda (i x) (* i x)) (list 5 5 5))', expect: "'(5 10 15)" }, { run: '(map-index2 cons (list "a" "b"))', expect: '\'((1 . "a") (2 . "b"))' }],
    hint: 'add-index gives pairs (position . element). Take each pair apart with car and cdr.',
    explain: 'Are the two versions equivalent? Yes, for all f and xs: both call f the same number of times, with the same arguments, in the same order.' });

  R({ id: 'rw-max-let', topic: 'scope', src: 'slides (max-of-list): improve it',
    q: '`bad-max` is correct but exponentially slow: it can make the SAME recursive call twice. Rewrite it as `good-max` using a **let** so each call is made once. (The first test needs it to be fast.)',
    code: `(define (bad-max xs)   ; assumes xs is not empty
  (cond [(null? (cdr xs)) (car xs)]
        [(> (car xs) (bad-max (cdr xs))) (car xs)]
        [#t (bad-max (cdr xs))]))`,
    starter: `(define (good-max xs)\n  )`,
    answer: `(define (good-max xs)
  (if (null? (cdr xs))
      (car xs)
      (let ([m (good-max (cdr xs))])
        (if (> (car xs) m) (car xs) m))))`,
    require: [['\\(let', 'use a let to remember the recursive result']],
    tests: [{ run: '(good-max (range 0 30))', expect: '29' }, { run: '(good-max (list 3 9 2))', expect: '9' }, { run: '(good-max (list 7))', expect: '7' }],
    hint: 'Bind the recursive result to a name once, then compare (car xs) with that name.',
    explain: 'On an increasing list, bad-max makes two recursive calls at every level: 2^n calls. A let evaluates the recursive call once and reuses the value.' });

  R({ id: 'rw-letstar', topic: 'scope', src: 'exam style: improve the style',
    q: 'Rewrite `f` with a single **let\\*** instead of nested lets.',
    code: `(define (f x)
  (let ([a (+ x 1)])
    (let ([b (* a 2)])
      (let ([c (- b x)])
        (list a b c)))))`,
    starter: `(define (f x)\n  )`,
    answer: `(define (f x)
  (let* ([a (+ x 1)]
         [b (* a 2)]
         [c (- b x)])
    (list a b c)))`,
    require: [['\\(let\\*', 'use let*']], forbid: [['\\(let \\(', 'no plain let']],
    tests: [{ run: '(f 3)', expect: "'(4 8 5)" }],
    hint: 'let* is exactly sugar for nested lets: list the bindings in the same order.',
    explain: 'Could you use a plain `let` with all three bindings? No: b needs a and c needs b, and in a let no right-hand side can see the new bindings.' });

  R({ id: 'rw-nomut', topic: 'scope', src: 'Sp17 final Q1e style: remove the mutation',
    q: 'Rewrite `total` so it gives the same results **without mutation** (no set!).',
    code: `(define (total xs)
  (let ([acc 0])
    (begin (for-each (lambda (x) (set! acc (+ acc x))) xs)
           acc)))`,
    starter: `(define (total xs)\n  )`,
    answer: `(define (total xs)
  (if (null? xs)
      0
      (+ (car xs) (total (cdr xs)))))`,
    forbid: [['set!', 'no set!']],
    tests: [{ run: '(total (list 1 2 3))', expect: '6' }, { run: '(total null)', expect: '0' }],
    hint: 'First say what it computes (the sum). Then write that directly with recursion or foldl.',
    explain: 'Describe what clients see ("the sum of the list"), then write that. `(foldl + 0 xs)` also works.' });

  R({ id: 'rw-counter', topic: 'scope', src: 'exam style: fix the bug',
    q: 'This counter maker is broken: every counter returns 1 forever. Rewrite it so each counter counts 1, 2, 3, ….',
    code: `(define (make-counter)
  (lambda ()
    (let ([c 0])
      (begin (set! c (+ c 1)) c))))`,
    starter: `(define (make-counter)\n  )`,
    answer: `(define (make-counter)
  (let ([c 0])
    (lambda ()
      (begin (set! c (+ c 1)) c))))`,
    tests: [{ run: '(define k (make-counter))\n(list (k) (k) (k))', expect: "'(1 2 3)" }, { run: '(define a (make-counter))\n(define b (make-counter))\n(list (a) (a) (b))', expect: "'(1 2 1)" }],
    hint: 'Where must the let be so that c is created once per counter, not once per call?',
    explain: 'The let must be OUTSIDE the lambda, so the closure captures one c that survives between calls. Inside the lambda, a fresh c = 0 is made on every call.' });

  R({ id: 'rw-nomut-tree', topic: 'structs', src: 'Sp17 final Q1e',
    q: 'Write `foo`, equivalent to `gross-abuse-of-forall`, but using **no mutation and no forall**. (Trees: `(node left num right)` and `(empty)`.)',
    prelude: 'tree',
    code: `(define (gross-abuse-of-forall t)
  (let ([x 0])
    (begin (forall (lambda (n) (begin (set! x (+ x 1)) #t)) t)
           x)))`,
    starter: `(define (foo t)\n  )`,
    answer: `(define (foo t)
  (if (empty? t)
      0
      (+ 1 (foo (node-left t)) (foo (node-right t)))))`,
    forbid: [['set!', 'no set!'], ['forall', 'no forall']],
    tests: [{ run: '(foo (node (node (empty) 1 (empty)) 2 (empty)))', expect: '2' }, { run: '(foo (empty))', expect: '0' }],
    hint: 'forall visits every node, and each visit adds 1. So it counts the nodes.',
    explain: 'The lambda always returns #t, so forall never stops early and visits every node once: the result is the number of nodes.' });

  R({ id: 'rw-exp', topic: 'structs', src: 'slides: change the evaluator',
    q: 'This evaluator returns Racket numbers. Rewrite it so it returns **expressions** (a `const`) instead, as the "new way" in the slides.',
    prelude: 'arith',
    code: `(define (eval-exp e)
  (cond [(const? e) (const-int e)]
        [(negate? e) (- (eval-exp (negate-e e)))]
        [(add? e) (+ (eval-exp (add-e1 e)) (eval-exp (add-e2 e)))]))`,
    starter: `(define (eval-exp e)\n  (cond [(const? e) ___]\n        [(negate? e) ___]\n        [(add? e) ___]))`,
    answer: `(define (eval-exp e)
  (cond [(const? e) e]
        [(negate? e) (const (- (const-int (eval-exp (negate-e e)))))]
        [(add? e) (const (+ (const-int (eval-exp (add-e1 e)))
                            (const-int (eval-exp (add-e2 e)))))]))`,
    tests: [{ run: '(eval-exp (add (const 3) (negate (const 5))))', expect: '(const -2)' }, { run: '(eval-exp (const 7))', expect: '(const 7)' }],
    hint: 'Base case: a const is already a value. Other cases: unwrap with const-int, compute, wrap with const.',
    explain: 'The idiom: check the tag, remove the tag (const-int), compute, then tag the new result (const ...).' });

  R({ id: 'rw-stream', topic: 'lazy', src: 'exam style: fix the bug',
    q: 'This should be the stream 2, 6, 18, 54, … but calling `(s)` never returns. Rewrite it correctly.',
    prelude: 'take',
    code: `(define s
  (letrec ([f (lambda (x) (cons x (f (* x 3))))])
    (lambda () (f 2))))`,
    starter: `(define s\n  )`,
    answer: `(define s
  (letrec ([f (lambda (x) (cons x (lambda () (f (* x 3)))))])
    (lambda () (f 2))))`,
    tests: [{ run: '(take-stream 4 s)', expect: "'(2 6 18 54)" }],
    hint: 'The cdr of the pair must be a STREAM (a thunk), not the result of calling f right now.',
    explain: 'The rest of the stream has to be delayed with `(lambda () ...)`. Without it, f calls itself forever while building the first pair.' });

  R({ id: 'rw-force', topic: 'lazy', src: 'exam style: fix the bug',
    q: 'This `my-force` returns the right value the first time, but wrong values afterwards. Rewrite `my-force` correctly.',
    code: `(define (my-delay th) (mcons #f th))
(define (my-force p)
  (if (mcar p)
      (mcdr p)
      (begin (set-mcar! p #t)
             ((mcdr p)))))`,
    starter: `(define (my-delay th) (mcons #f th))\n(define (my-force p)\n  )`,
    answer: `(define (my-delay th) (mcons #f th))
(define (my-force p)
  (if (mcar p)
      (mcdr p)
      (begin (set-mcar! p #t)
             (set-mcdr! p ((mcdr p)))
             (mcdr p))))`,
    tests: [{ run: '(define n 0)\n(define p (my-delay (lambda () (begin (set! n (+ n 1)) 42))))\n(list (my-force p) (my-force p) n)', expect: "'(42 42 1)" }],
    hint: 'After the first force, what does the mcdr hold? It must hold the ANSWER, not the thunk.',
    explain: 'The buggy version never stores the result, so the second force returns the thunk itself. Store it with set-mcdr!, then return the mcdr.' });

  R({ id: 'rw-macro-once', topic: 'macros', src: 'slides: improve the macro',
    q: 'This macro evaluates its argument twice. Rewrite `dbl` so the argument is evaluated exactly **once**.',
    code: `(define-syntax dbl
  (syntax-rules ()
    [(dbl x) (+ x x)]))`,
    starter: `(define-syntax dbl\n  (syntax-rules ()\n    [(dbl x) ___]))`,
    answer: `(define-syntax dbl
  (syntax-rules ()
    [(dbl x) (let ([y x]) (+ y y))]))`,
    tests: [{ run: '(dbl (begin (print "x") 4))', expect: '"x"8' }, { run: '(let ([y 5]) (dbl y))', expect: '10' }],
    hint: 'Bind the argument to a local variable with let, then use the variable twice.',
    explain: 'A let evaluates x once. The second test passes thanks to hygiene: the macro\'s y cannot capture the user\'s y. (`(* 2 x)` also evaluates x once.)' });

  R({ id: 'rw-macro-order', topic: 'macros', src: 'slides: improve the macro',
    q: '`(take e1 from e2)` computes e2 − e1, but it evaluates e2 BEFORE e1. Rewrite it so e1 is evaluated first (left to right), each exactly once.',
    code: `(define-syntax take
  (syntax-rules (from)
    [(take e1 from e2) (- e2 e1)]))`,
    starter: `(define-syntax take\n  (syntax-rules (from)\n    [(take e1 from e2) ___]))`,
    answer: `(define-syntax take
  (syntax-rules (from)
    [(take e1 from e2) (let ([v1 e1] [v2 e2]) (- v2 v1))]))`,
    tests: [{ run: '(take (begin (print "a") 1) from (begin (print "b") 10))', expect: '"a""b"9' }, { run: '(take 3 from 10)', expect: '7' }],
    hint: 'A let evaluates its bindings top to bottom. Bind e1 first, then e2.',
    explain: 'Bind both to variables in the order you want them evaluated, then use the variables in any order.' });

  R({ id: 'rw-fn-to-macro', topic: 'macros', src: 'exam style: function or macro?',
    q: 'As a function, `my-and2` evaluates BOTH arguments, so `(my-and2 #f (car null))` crashes. Rewrite it as a **macro** that only evaluates e2 when e1 is true.',
    code: `(define (my-and2 e1 e2)
  (if e1 e2 #f))`,
    starter: `(define-syntax my-and2\n  (syntax-rules ()\n    [___ ___]))`,
    answer: `(define-syntax my-and2
  (syntax-rules ()
    [(my-and2 e1 e2) (if e1 e2 #f)]))`,
    require: [['define-syntax', 'make it a macro']],
    tests: [{ run: '(my-and2 #f (car null))', expect: '#f' }, { run: '(my-and2 1 2)', expect: '2' }],
    hint: 'The template can be the same if as before. What changes is WHEN e2 gets evaluated.',
    explain: 'Same body, but as a macro the arguments are pasted into the if unevaluated, so the if decides whether e2 ever runs. This is the one job a function cannot do.' });

  R({ id: 'rw-ifnz', topic: 'interp', src: 'Sp17 final Q4: fix the interpreter',
    q: 'This `ifnz` case has TWO bugs (see what it does with `(ifnz (int 4) (int 5) (int 6))` and with an unbound variable in the unused branch). Rewrite the case correctly. ifnz means: if e1 is **not zero** then e2, else e3.',
    template: cut('[(ifnz? e)', '[(fun? e)'),
    code: `[(ifnz? e)
 (let ([v1 (eval-under-env (ifnz-e1 e) env)]
       [v2 (eval-under-env (ifnz-e2 e) env)]
       [v3 (eval-under-env (ifnz-e3 e) env)])
   (if (int? v1)
       (if (= (int-num v1) 0) v2 v3)
       (error "MUPL ifnz applied to non-number")))]`,
    starter: `[(ifnz? e)\n ]`,
    answer: `[(ifnz? e)
 (let ([v1 (eval-under-env (ifnz-e1 e) env)])
   (if (int? v1)
       (if (= (int-num v1) 0)
           (eval-under-env (ifnz-e3 e) env)
           (eval-under-env (ifnz-e2 e) env))
       (error "MUPL ifnz applied to non-number")))]`,
    tests: [{ run: '(eval-exp (ifnz (int 4) (int 5) (int 6)))', expect: '(int 5)' }, { run: '(eval-exp (ifnz (int 0) (var "nope") (int 6)))', expect: '(int 6)' }, { run: '(eval-exp (ifnz (int 1) (int 5) (var "nope")))', expect: '(int 5)' }],
    hint: 'Bug 1: the branches are swapped. Bug 2: both branches are evaluated before the test. Only evaluate the branch you pick.',
    explain: 'An interpreter for a conditional must evaluate the test first and then ONLY the chosen branch, the same lazy behaviour as Racket\'s own if.' });

  R({ id: 'rw-mlet', topic: 'interp', src: 'Sp17 final Q4: fix the interpreter',
    q: 'This `mlet` case is buggy: `(mlet "x" (int 4) (mlet "y" (int 1) (add (var "x") (var "y"))))` fails with an unbound variable. Rewrite the case.',
    template: cut('[(mlet? e)', '[(apair? e)'),
    code: `[(mlet? e)
 (let* ([v (eval-under-env (mlet-e e) env)])
   (eval-under-env (mlet-body e) (list (cons (mlet-var e) v))))]`,
    starter: `[(mlet? e)\n ]`,
    answer: `[(mlet? e)
 (let ([v (eval-under-env (mlet-e e) env)])
   (eval-under-env (mlet-body e) (cons (cons (mlet-var e) v) env)))]`,
    tests: [{ run: '(eval-exp (mlet "x" (int 4) (mlet "y" (int 1) (add (var "x") (var "y")))))', expect: '(int 5)' }, { run: '(eval-exp (mlet "x" (int 1) (mlet "x" (int 2) (var "x"))))', expect: '(int 2)' }],
    hint: 'The body must see the new binding AND everything that was already in env.',
    explain: 'The bug REPLACES the environment with a one-element list. Extend it instead: cons the new pair onto the front of env.' });

  R({ id: 'rw-first', topic: 'interp', src: 'Sp17 final Q4: fix the interpreter',
    q: 'This `first` case is buggy: `(first (apair (add (int 3) (int 4)) (int 5)))` returns unevaluated syntax, and `(first (var "p"))` always errors. Rewrite the case.',
    template: cut('[(first? e)', '[(second? e)'),
    code: `[(first? e)
 (if (apair? (first-e e))
     (apair-e1 (first-e e))
     (error "MUPL first applied to non-apair"))]`,
    starter: `[(first? e)\n ]`,
    answer: `[(first? e)
 (let ([v (eval-under-env (first-e e) env)])
   (if (apair? v)
       (apair-e1 v)
       (error "MUPL first applied to non-apair")))]`,
    tests: [{ run: '(eval-exp (first (apair (add (int 3) (int 4)) (int 5))))', expect: '(int 7)' }, { run: '(eval-exp (mlet "p" (apair (int 1) (int 2)) (first (var "p"))))', expect: '(int 1)' }],
    hint: 'It inspects the raw subexpression. Evaluate the subexpression first, then check the VALUE.',
    explain: 'Always evaluate a subexpression before looking at what kind of thing it is. The buggy version looks at syntax, so it only "works" when the syntax happens to be a literal apair.' });

  R({ id: 'rw-len', topic: 'interp', src: 'Sp23 final Q4d: fix two bugs',
    q: 'This MUPL length function has two bugs. Rewrite it correctly (it is bound to the Racket variable `len`).',
    prelude: 'mupl',
    code: `(define len
  (fun "len" "x"
       (ifnz (munit? (var "x"))
             (int 0)
             (add (int 1) (call (var "len") (second "x"))))))`,
    starter: `(define len\n  (fun "len" "x"\n       ))`,
    answer: `(define len
  (fun "len" "x"
       (ifnz (ismunit (var "x"))
             (int 0)
             (add (int 1) (call (var "len") (second (var "x")))))))`,
    tests: [{ run: '(eval-exp (call len (apair (int 1) (apair (int 2) (munit)))))', expect: '(int 2)' }, { run: '(eval-exp (call len (munit)))', expect: '(int 0)' }],
    hint: 'munit? is a RACKET function (it runs now, on syntax). Which MUPL construct tests for unit? And "x" is a string, not a variable expression.',
    explain: 'Level confusion: `munit?` runs in Racket while the program is being built; `ismunit` is the MUPL construct evaluated later. And a variable use must be `(var "x")`.' });

  R({ id: 'rw-sortpair', topic: 'typing', src: 'Sp17 final Q5b: change the function',
    q: 'Change `sort-pair` so that `(sort-pair null)` evaluates to null, with everything else unchanged. (Would existing callers need to change? Think about it, then check the explanation.)',
    code: `(define (sort-pair p)
  (cond [(or (not (pair? p))
             (not (number? (car p)))
             (not (number? (cdr p))))
         (error "sort-pair cannot handle your argument")]
        [(>= (car p) (cdr p)) p]
        [#t (cons (cdr p) (car p))]))`,
    starter: `(define (sort-pair p)
  (cond [(or (not (pair? p))
             (not (number? (car p)))
             (not (number? (cdr p))))
         (error "sort-pair cannot handle your argument")]
        [(>= (car p) (cdr p)) p]
        [#t (cons (cdr p) (car p))]))`,
    answer: `(define (sort-pair p)
  (cond [(null? p) p]
        [(or (not (pair? p))
             (not (number? (car p)))
             (not (number? (cdr p))))
         (error "sort-pair cannot handle your argument")]
        [(>= (car p) (cdr p)) p]
        [#t (cons (cdr p) (car p))]))`,
    tests: [{ run: '(sort-pair null)', expect: "'()" }, { run: '(sort-pair (cons 1 5))', expect: "'(5 . 1)" }, { run: '(sort-pair (cons 5 1))', expect: "'(5 . 1)" }],
    hint: 'One new cond clause, placed before the error clause.',
    explain: 'Existing Racket callers: definitely no change needed (dynamic typing, claim 7A). In OCaml the type would become `(int * int) option -> ...`, and EVERY caller would have to change, but the type checker would list them all (claim 7B).' });
})();
