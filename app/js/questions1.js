// Question bank part 1: basics/parens and scope/let/mutation.
// Types: predict (type what it evaluates to), mcq, write (write code, tests run in-app), explain (self-marked).
// Every predict answer and write test is checked against real Racket by tools/verify.js.
(function () {
  const P = (window.PRELUDES = window.PRELUDES || {});
  P.take = `(define (take-stream n s)
  (if (= n 0) null
      (let ([p (s)]) (cons (car p) (take-stream (- n 1) (cdr p))))))`;
  P.pairadj = `(define (pair-adjacent xs)
  (if (or (null? xs) (null? (cdr xs)))
      xs
      (cons (cons (car xs) (cadr xs)) (pair-adjacent (cddr xs)))))`;

  const Q = (window.QUESTIONS = window.QUESTIONS || []);
  Q.push(
  // ======================= BASICS & PARENS =======================
  { id: 'b-curry', topic: 'basics', type: 'predict',
    q: 'Curried functions. What does each expression evaluate to?',
    code: `(define (pow x y) (if (= y 0) 1 (* x (pow x (- y 1)))))
(define ((cpow x) y) (pow x y))
(define three-to-the (cpow 3))`,
    parts: [{ ask: '(three-to-the 2)', a: '9' }, { ask: '((cpow 2) 5)', a: '32' }, { ask: '(procedure? (cpow 2))', a: '#t' }],
    explain: '`(define ((cpow x) y) ...)` is sugar for `(define (cpow x) (lambda (y) ...))`. So `(cpow 3)` returns a function still waiting for `y`. To call it you need the extra parentheses: `((cpow 2) 5)`.' },

  { id: 'b-fw5', topic: 'basics', type: 'mcq', src: 'slides',
    q: 'What happens when we evaluate `(fact-wrong5 3)`?',
    code: `(define (fact-wrong5 n)
  (if (= n 0) 1 (* n ((fact-wrong5) (- n 1)))))`,
    options: ['Returns 6', 'Error: fact-wrong5 arity mismatch (expected 1, given 0)', 'Error: application: not a procedure', 'Infinite loop'],
    answer: 1,
    explain: '`(fact-wrong5)` calls fact-wrong5 with ZERO arguments, which is an arity error. The plan was to call the result of that with `(- n 1)`. Extra parens in Racket always mean "call this".' },

  { id: 'b-fw5b', topic: 'basics', type: 'predict', src: 'slides',
    q: 'Same broken function. What does each part give? (Write `error` if it fails.)',
    code: `(define (fact-wrong5 n)
  (if (= n 0) 1 (* n ((fact-wrong5) (- n 1)))))`,
    parts: [{ ask: '(fact-wrong5 0)', a: '1' }, { ask: '(fact-wrong5 1)', a: 'error', err: 'arity mismatch' }],
    explain: 'With n = 0 the `if` takes the `1` branch and never reaches the broken code. `if` only evaluates the branch it picks. Dynamic typing means the bug only appears when that code actually runs.' },

  { id: 'b-fw1b', topic: 'basics', type: 'predict', src: 'slides',
    q: '`fact-works1b` has `(1)` in its base case, yet it "works". What do these give?',
    code: `(define (fact n) (if (= n 0) 1 (* n (fact (- n 1)))))
(define (fact-works1b n) (if (= n 0) (1) (* n (fact (- n 1)))))`,
    parts: [{ ask: '(fact-works1b 5)', a: '120' }, { ask: '(fact-works1b 0)', a: 'error', err: 'not a procedure' }],
    explain: 'It is not recursive: it calls the CORRECT `fact` on n-1. Its own broken base case `(1)` only runs when you pass 0 directly, and then it tries to call the number 1 as a function: "application: not a procedure".' },

  { id: 'b-fw6', topic: 'basics', type: 'predict', src: 'slides',
    q: 'Infix habit bug. What do these give?',
    code: `(define (fact-wrong6 n)
  (if (= n 0) 1 (n * (fact-wrong6 (- n 1)))))`,
    parts: [{ ask: '(fact-wrong6 0)', a: '1' }, { ask: '(fact-wrong6 2)', a: 'error', err: 'not a procedure' }],
    explain: '`(n * ...)` treats `n` (here 2) as a function and passes it `*` and the recursive result. Fix: `(* n (fact-wrong6 (- n 1)))`.' },

  { id: 'b-fw4', topic: 'basics', type: 'mcq', src: 'slides',
    q: 'What error does `(fact-wrong4 3)` produce?',
    code: `(define (fact-wrong4 n)
  (if (= n 0) 1 (* n fact-wrong4 (- n 1))))`,
    options: ['application: not a procedure', '*: contract violation, expected: number?, given: #<procedure:fact-wrong4>', 'arity mismatch', 'No error, returns 6'],
    answer: 1,
    explain: '`*` happily takes 3 arguments, but the second one is the function value `fact-wrong4` itself (no parens means no call). `*` checks its arguments at run time and complains.' },

  { id: 'b-fw2', topic: 'basics', type: 'mcq', src: 'slides',
    q: 'This file contains the definition below plus `(+ 1 2)` on the next line. What happens when you run the file?',
    code: `(define (fact-wrong2 n) (if = n 0 1 (* n (fact-wrong2 (- n 1)))))
(+ 1 2)`,
    options: ['Prints 3, then fails only if fact-wrong2 is called', 'Fails with "if: bad syntax" before anything runs (nothing printed)', 'Prints 3 and never fails', 'Infinite loop'],
    answer: 1,
    explain: '`if` must have exactly 3 sub-parts; here it gets 5 (`=`, `n`, `0`, `1`, `(* ...)`). That is a SYNTAX error, caught when the module is compiled, so nothing runs. Contrast with type errors, which are only found when the code runs.' },

  { id: 'b-fw3', topic: 'basics', type: 'mcq', src: 'slides',
    q: 'What is wrong with this definition?',
    code: `(define fact-wrong3 (n) (if (= n 0) 1 (* n (fact-wrong3 (- n 1)))))`,
    options: ['Nothing', 'define: bad syntax. (define id expr) takes ONE expression; here (n) is treated as calling n with zero args, followed by a dangling if', 'n is unbound', 'Missing #lang racket'],
    answer: 1,
    explain: 'Function sugar needs the name INSIDE the parens: `(define (fact-wrong3 n) ...)`. Without that, `define` sees an identifier followed by two expressions, which is bad syntax.' },

  { id: 'b-truthy', topic: 'basics', type: 'predict',
    q: 'Truthiness: everything except `#f` is true. Evaluate:',
    code: `(define (count-falses xs)
  (cond [(null? xs) 0]
        [(car xs) (count-falses (cdr xs))]
        [#t (+ 1 (count-falses (cdr xs)))]))`,
    parts: [{ ask: "(if 0 'yes 'no)", a: "'yes" }, { ask: "(if null 'yes 'no)", a: "'yes" }, { ask: "(if \"\" 'yes 'no)", a: "'yes" },
            { ask: '(count-falses (list 1 #f "x" #f #t))', a: '2' }, { ask: '(and 1 2 3)', a: '3' }, { ask: '(or #f #f 7)', a: '7' }],
    explain: 'Unlike Python, 0, empty list and "" are all TRUE in Racket. Only `#f` is false. `and` returns its last value if every part is true. `or` returns the first true value.' },

  { id: 'b-deepsum', topic: 'basics', type: 'predict', src: 'slides',
    q: 'Two deep-sum versions. What happens on a list containing a string?',
    code: `(define (deep-sum1 xs)
  (if (null? xs) 0
      (if (number? (car xs))
          (+ (car xs) (deep-sum1 (cdr xs)))
          (+ (deep-sum1 (car xs)) (deep-sum1 (cdr xs))))))
(define (deep-sum4 xs)
  (cond [(null? xs) 0]
        [(number? xs) xs]
        [(list? xs) (+ (deep-sum4 (car xs)) (deep-sum4 (cdr xs)))]
        [#t 0]))`,
    parts: [{ ask: '(deep-sum1 (list 1 (list 2 (list 3)) 4))', a: '10' }, { ask: '(deep-sum4 (list 1 "hi" (list 2 #t) 3))', a: '6' }, { ask: '(deep-sum1 (list 1 "hi"))', a: 'error', err: 'car: contract violation' }],
    explain: 'deep-sum1 assumes every element is a number or a list. For "hi" it recurses with `(deep-sum1 "hi")`, and `(car "hi")` fails. deep-sum4 checks the argument itself (not `(car xs)`) and returns 0 for anything that is not a number or list.' },

  { id: 'b-whatdoes1', topic: 'basics', type: 'mcq', src: 'exam style',
    q: 'No labels, no comments. What does `foo` compute?',
    code: `(define (foo xs)
  (cond [(null? xs) null]
        [(null? (cdr xs)) xs]
        [#t (cons (car xs) (foo (cddr xs)))]))`,
    options: ['Removes the last element', 'Keeps the 1st, 3rd, 5th, ... elements (drops every second one)', 'Reverses the list', 'Pairs up adjacent elements'],
    answer: 1,
    explain: 'Trace with a tiny input: `(foo (list 1 2 3 4 5))` → 1 consed onto `(foo (list 3 4 5))` → 3 consed onto `(foo (list 5))` → `(5)`. Result `(1 3 5)`. `cddr` skips two elements at a time. TIP: on the exam, always trace a 3–5 element list.' },

  { id: 'b-whatdoes1p', topic: 'basics', type: 'predict', src: 'exam style',
    q: 'Same `foo`. Predict the results:',
    code: `(define (foo xs)
  (cond [(null? xs) null]
        [(null? (cdr xs)) xs]
        [#t (cons (car xs) (foo (cddr xs)))]))`,
    parts: [{ ask: '(foo (list 1 2 3 4))', a: "'(1 3)" }, { ask: '(foo (list 7))', a: "'(7)" }, { ask: '(foo null)', a: "'()" }],
    explain: 'Even-length lists hit the `null?` base case; odd-length ones hit the one-element case, which returns `xs` (a list containing the last element).' },

  { id: 'b-whatdoes2', topic: 'basics', type: 'explain', src: 'exam style',
    q: 'What does `bar` do? Is there a case where its answer is ambiguous or misleading?',
    code: `(define (bar f xs)
  (if (null? xs)
      #f
      (if (f (car xs)) (car xs) (bar f (cdr xs)))))`,
    answer: 'It returns the FIRST element of xs for which f returns a true value, or #f if there is none. The flaw: if the element found is itself #f (e.g. `(bar not (list 1 #f 2))`), the result #f looks exactly like "not found". Style: nested ifs should be a cond.',
    explain: 'Exams love "are there any cases when this fails?". Look for: empty list, one element, an element equal to the "failure" value, wrong types, and missing base cases.' },

  { id: 'b-whatdoes2p', topic: 'basics', type: 'predict', src: 'exam style',
    q: 'Same `bar`. Evaluate:',
    code: `(define (bar f xs)
  (if (null? xs)
      #f
      (if (f (car xs)) (car xs) (bar f (cdr xs)))))`,
    parts: [{ ask: '(bar even? (list 1 3 4 6))', a: '4' }, { ask: '(bar even? (list 1 3))', a: '#f' }, { ask: '(bar not (list 1 #f 2))', a: '#f' }],
    explain: 'The third call FOUND #f (because `(not #f)` is #t), but you cannot tell that apart from "not found".' },

  { id: 'b-special', topic: 'basics', type: 'mcq',
    q: 'Which of these is NOT a special form (i.e. it is just a normal function call)?',
    options: ['define', 'if', 'lambda', '+'],
    answer: 3,
    explain: 'A term `(t1 ... tn)` is a special form if t1 is a keyword like `define`, `lambda`, `if`, `cond`, `let`. Otherwise it is a function call, and ALL arguments are evaluated first. `+` is an ordinary function.' },

  { id: 'b-ast', topic: 'basics', type: 'mcq',
    q: 'Why does Racket use so many parentheses?',
    options: ['Historical accident only', 'The code is written directly as its abstract syntax tree (atoms are leaves, parenthesised sequences are nodes), so parsing is trivial and code is data', 'To make the language statically typed', 'Parentheses are optional'],
    answer: 1,
    explain: 'The syntax IS the AST. That is why "code is data, data is code", and why macros and `quote`/`eval` are so natural in Racket.' },

  { id: 'b-brackets', topic: 'basics', type: 'predict',
    q: '`[ ]` and `( )` mean the same thing but must match. Evaluate:',
    code: ``,
    parts: [{ ask: '[+ 1 2]', a: '3' }, { ask: "(let ([x 5]) (* x x))", a: '25' }, { ask: '(cond [#f 1] [else 2])', a: '2' }],
    explain: 'Brackets are only a style convention (used for let bindings and cond clauses). `(+ 1 2]` would be a read error because the shapes do not match.' },

  { id: 'b-dyn', topic: 'basics', type: 'predict',
    q: 'Dynamic typing lets one function return different types. Evaluate:',
    code: `(define (f y) (if (> y 0) (+ y y) "hi"))
(define (g h) (cons (h 7) (h #t)))`,
    parts: [{ ask: '(f 3)', a: '6' }, { ask: '(f -1)', a: '"hi"' }, { ask: '(g (lambda (x) (cons x x)))', a: "'((7 . 7) #t . #t)" }],
    explain: 'Neither would type-check in OCaml: `f` returns int OR string, and `g` uses `h` at two different types. The printed form `\'((7 . 7) #t . #t)` is a pair whose car is `(7 . 7)` and whose cdr is `(#t . #t)`.' },

  { id: 'b-revappend', topic: 'basics', type: 'write', src: 'Wi22 final Q1',
    q: 'Write `revappend`, which takes two lists and returns the reverse of the first appended to the second. Do not use reverse or append. Example: `(revappend (list 1 2 3) (list 4 5 6))` gives `\'(3 2 1 4 5 6)`.',
    starter: `(define (revappend xs ys)
  )`,
    answer: `(define (revappend xs ys)
  (if (null? xs)
      ys
      (revappend (cdr xs) (cons (car xs) ys))))`,
    tests: [{ run: '(revappend (list 1 2 3) (list 4 5 6))', expect: "'(3 2 1 4 5 6)" }, { run: '(revappend null (list 1))', expect: "'(1)" }, { run: '(revappend (list 1 2) null)', expect: "'(2 1)" }],
    explain: 'The accumulator `ys` collects elements in reverse as you walk xs. Then `(define (reverse xs) (revappend xs null))`.' },

  { id: 'b-forall-index', topic: 'basics', type: 'predict', src: 'Wi22 final Q1d',
    q: 'Read this unlabelled code. What do the calls give? (Think about what `mystery` checks.)',
    code: `(define (forall-index f xs)
  (letrec ([g (lambda (i xs)
                (cond [(null? xs) #t]
                      [(not (f i (car xs))) #f]
                      [#t (g (+ i 1) (cdr xs))]))])
    (g 0 xs)))
(define (mystery k xs)
  (forall-index (lambda (i x) (= (+ k i) x)) xs))`,
    parts: [{ ask: '(mystery 3 (list 3 4 5))', a: '#t' }, { ask: '(mystery 3 (list 3 5))', a: '#f' }, { ask: '(mystery 7 null)', a: '#t' }],
    explain: '`mystery` is #t exactly when xs is empty or is k, k+1, k+2, ... (each element is one more than the one before, starting at k).' },

  { id: 'b-fold', topic: 'basics', type: 'predict', src: 'Sp19 final Q1',
    q: 'fold-basic is foldl with (f acc x). What does `mystery` give?',
    code: `(define (fold-basic f acc xs)
  (if (null? xs) acc (fold-basic f (f acc (car xs)) (cdr xs))))
(define (mystery xs)
  (fold-basic (lambda (x y) (if (or (not x) (> y x)) y x)) #f xs))`,
    parts: [{ ask: '(mystery null)', a: '#f' }, { ask: '(mystery (list 4 5 9 3 7))', a: '9' }, { ask: '(mystery (list 4 5 #f 3 7))', a: 'error', err: 'contract violation' }],
    explain: '`mystery` is "max of the list, or #f if empty". With `#f` inside the list, `(> #f 5)` is a contract violation. Note the lambda\'s parameter names are misleading: x is the ACCUMULATOR. Bad naming is a classic exam trick.' },

  { id: 'b-folddeep', topic: 'basics', type: 'predict', src: 'Sp19 final Q1d',
    q: 'fold-deep folds into nested lists. Evaluate (careful with the improper pair):',
    code: `(define (fold-deep f acc xs)
  (cond [(null? xs) acc]
        [(list? (car xs)) (fold-deep f (fold-deep f acc (car xs)) (cdr xs))]
        [#t (fold-deep f (f acc (car xs)) (cdr xs))]))`,
    parts: [{ ask: '(fold-deep + 0 (list 3 (list 4 (list 5) 6) (list 7)))', a: '25' },
            { ask: '(fold-deep (lambda (x y) (cons y x)) null (list (list 3 4) null (list 3 5 (list "hi") 9) (cons 4 6) (cons 5 null)))', a: '\'(5 (4 . 6) 9 "hi" 5 3 4 3)' }],
    explain: '`(cons 4 6)` is NOT a list (`list?` is #f), so it is treated as a single element. `(cons 5 null)` IS the list (5), so 5 is folded in. Consing onto the accumulator reverses the order.' },

  { id: 'b-keeplarger', topic: 'basics', type: 'write', src: 'Wi23 final Q1',
    q: 'Write `keep-larger`: given a list of numbers, return the larger of the 1st and 2nd, then of the 3rd and 4th, and so on. An odd last element is kept. No helper functions. `(keep-larger (list 3 4 4 3 9 -9 12))` gives `\'(4 4 9 12)`.',
    starter: `(define (keep-larger xs)
  )`,
    answer: `(define (keep-larger xs)
  (if (or (null? xs) (null? (cdr xs)))
      xs
      (cons (max (car xs) (cadr xs)) (keep-larger (cddr xs)))))`,
    tests: [{ run: '(keep-larger (list 3 4 4 3 9 -9 12))', expect: "'(4 4 9 12)" }, { run: '(keep-larger (list 3 4 4 3 9 -9 12 13))', expect: "'(4 4 9 13)" }, { run: '(keep-larger null)', expect: "'()" }],
    explain: 'Two base cases (0 or 1 element left) both return xs. `cadr` = second element, `cddr` = everything after the first two.' },

  { id: 'b-pairadj', topic: 'basics', type: 'predict', src: 'Wi23 final Q1',
    q: 'Predict the printed results.',
    code: `(define (pair-adjacent xs)
  (if (or (null? xs) (null? (cdr xs)))
      xs
      (cons (cons (car xs) (cadr xs)) (pair-adjacent (cddr xs)))))`,
    parts: [{ ask: '(pair-adjacent (list 3 4 4 3 9 -9 12))', a: "'((3 . 4) (4 . 3) (9 . -9) 12)" }, { ask: '(pair-adjacent (list 1 2))', a: "'((1 . 2))" }],
    explain: 'Would OCaml type-check this? NO: the result list mixes pairs and a plain element. keep-larger, by contrast, has OCaml type `int list -> int list`.' },

  { id: 'b-keepagain', topic: 'basics', type: 'write', src: 'Wi23 final Q1e',
    q: 'Fill in the lambda body so `keep-larger-again` equals keep-larger. Use `pair-adjacent` (already defined), `pair?` and `max`.',
    prelude: 'pairadj',
    starter: `(define (keep-larger-again xs)
  (map (lambda (usually-a-pair)
         ___)
       (pair-adjacent xs)))`,
    answer: `(define (keep-larger-again xs)
  (map (lambda (usually-a-pair)
         (if (pair? usually-a-pair)
             (max (car usually-a-pair) (cdr usually-a-pair))
             usually-a-pair))
       (pair-adjacent xs)))`,
    tests: [{ run: '(keep-larger-again (list 3 4 4 3 9 -9 12))', expect: "'(4 4 9 12)" }],
    explain: 'The only non-pair is the odd last element; keep it as is.' },

  { id: 'b-wlal', topic: 'basics', type: 'write', src: 'Sp23 final Q1c',
    q: 'Write `without-last-and-last`: return a pair whose car is the list without its last element and whose cdr is the last element (#f if empty). One recursive function, using one `let`. `(without-last-and-last (list 3 4 5 6))` gives `\'((3 4 5) . 6)`.',
    starter: `(define (without-last-and-last xs)
  )`,
    answer: `(define (without-last-and-last xs)
  (cond [(null? xs) (cons null #f)]
        [(null? (cdr xs)) (cons null (car xs))]
        [#t (let ([pr (without-last-and-last (cdr xs))])
              (cons (cons (car xs) (car pr)) (cdr pr)))]))`,
    tests: [{ run: '(without-last-and-last (list 3 4 5 6))', expect: "'((3 4 5) . 6)" }, { run: '(without-last-and-last null)', expect: "'(() . #f)" }, { run: '(without-last-and-last (list 9))', expect: "'(() . 9)" }],
    explain: 'Recursive-pair pattern: recurse on the tail, pull the pair apart with car/cdr, rebuild with the head consed on. Note `\'(() . #f)`: an empty list paired with #f.' },

  { id: 'b-partition', topic: 'basics', type: 'mcq', src: 'Sp17 final Q1d',
    q: '`partition` splits a list into (things f says true . things f says false), keeping order. Is `(car (partition f xs))` equivalent to `(car (partition f (car (partition f xs))))`?',
    code: `(define (partition f xs)
  (if (null? xs)
      (cons null null)
      (let ([pr (partition f (cdr xs))])
        (if (f (car xs))
            (cons (cons (car xs) (car pr)) (cdr pr))
            (cons (car pr) (cons (car xs) (cdr pr)))))))`,
    options: ['Yes, always', 'No, never', 'Depends on f: yes if f is pure, but an f with side effects/state could behave differently when called more times', 'Depends only on xs'],
    answer: 2,
    explain: 'Equivalence questions: ask "could a caller tell the difference?". The second version calls f more times, and with a stateful f (e.g. one using set!) the results can differ. For `number?` (pure) the answer is yes.' },

  // ======================= LET, SCOPE & MUTATION =======================
  { id: 's-lets-au18', topic: 'scope', type: 'predict', src: 'Au18 final Q2a',
    q: 'Given the definitions, give the value of each expression, or `error`.',
    code: `(define x 15)
(define y 17)`,
    parts: [{ ask: '(let ([x y] [y x]) (cons x y))', a: "'(17 . 15)" },
            { ask: '(let* ([x y] [y x]) (cons x y))', a: "'(17 . 17)" },
            { ask: '(let ([x (cons x y)] [y (cons x y)]) (cons (car x) (car y)))', a: "'(15 . 15)" },
            { ask: '(letrec ([x y] [y x]) (cons x y))', a: 'error', err: 'cannot use before initialization' }],
    explain: '`let`: every right-hand side sees the OUTER x and y, so you get a swap. `let*`: y sees the NEW x (17). Third: both conses use outer x = 15, so car of each is 15. `letrec`: x\'s right-hand side reads y before y is initialised → error.' },

  { id: 's-double', topic: 'scope', type: 'mcq', src: 'slides',
    q: 'Are `double1` and `double2` equivalent (same result for every number x)?',
    code: `(define (double1 x)
  (let ([x (+ x 3)]
        [y (+ x 2)])
    (+ x y -5)))
(define (double2 x)
  (let* ([x (+ x 3)]
         [y (+ x 2)])
    (+ x y -8)))`,
    options: ['Yes: both return 2x, even though y is computed differently', 'No: double1 returns x + 3', 'No: double2 errors', 'Only for x = 5'],
    answer: 0,
    explain: 'double1: x\' = x+3, y = (old x)+2, so (x+3)+(x+2)-5 = 2x. double2: x\' = x+3, y = (new x)+2 = x+5, so (x+3)+(x+5)-8 = 2x. Different evaluation, same answer.' },

  { id: 's-double-p', topic: 'scope', type: 'predict', src: 'slides',
    q: 'Now with a twist: same bindings, but the body returns y.',
    code: `(define (f1 x) (let  ([x (+ x 3)] [y (+ x 2)]) y))
(define (f2 x) (let* ([x (+ x 3)] [y (+ x 2)]) y))`,
    parts: [{ ask: '(f1 10)', a: '12' }, { ask: '(f2 10)', a: '15' }],
    explain: 'In `let`, y\'s right-hand side uses the parameter x = 10. In `let*`, it uses the new x = 13.' },

  { id: 's-triple', topic: 'scope', type: 'predict', src: 'slides',
    q: 'letrec: all bindings are in scope for all right-hand sides, but they are still EVALUATED in order.',
    code: `(define (triple x)
  (letrec ([y (+ x 2)]
           [f (lambda (z) (+ z y w x))]
           [w (+ x 7)])
    (f -9)))
(define (oops x)
  (letrec ([y (+ x 2)]
           [w (f 1)]
           [f (lambda (z) (+ z y))])
    w))`,
    parts: [{ ask: '(triple 10)', a: '30' }, { ask: '(oops 10)', a: 'error', err: 'cannot use before initialization' }],
    explain: '`triple` is fine: f mentions w, but f is only CALLED in the body, after w exists. `oops` CALLS f while defining w, before f is initialised: "f: undefined; cannot use before initialization". Functions do not look up variables until they are called.' },

  { id: 's-badletrec', topic: 'scope', type: 'predict', src: 'slides',
    q: 'Does the `if` save us here?',
    code: `(define (bad-letrec-example x)
  (letrec ([y z]
           [z 13])
    (if x y z)))`,
    parts: [{ ask: '(bad-letrec-example #f)', a: 'error', err: 'z: undefined' }],
    explain: 'No. The error happens while evaluating the BINDINGS (y\'s right-hand side reads z too early), before the body\'s `if` ever runs. It fails for every argument.' },

  { id: 's-mod2', topic: 'scope', type: 'mcq', src: 'slides',
    q: 'Which binding form is REQUIRED for mutually recursive local functions like even?/odd?',
    options: ['let', 'let*', 'letrec (or local define)', 'set!'],
    answer: 2,
    explain: 'even? refers to odd? and odd? refers to even?. With let/let*, at least one of them would not be in scope. letrec (and local define, which has the same semantics) puts ALL bindings in scope for all right-hand sides.' },

  { id: 's-style', topic: 'scope', type: 'mcq', src: 'slides',
    q: 'Style guide: you need a local binding where later bindings use earlier ones (no recursion). Best choice?',
    options: ['let', 'let*', 'letrec', 'top-level define'],
    answer: 1,
    explain: '`let` for shadowing/swaps (or when anything works), `let*` for sequences, `letrec` for mutual recursion. Use the simplest construct that works: it tells the reader there is no sequencing or recursion to worry about.' },

  { id: 's-localdefine', topic: 'scope', type: 'predict',
    q: 'Local `define` has letrec semantics. Evaluate:',
    code: `(define (f x)
  (define y (* x 2))
  (define (g z) (+ y z w))
  (define w 10)
  (g 1))
(define (h x)
  (define a (k 1))
  (define (k z) (* z x))
  a)`,
    parts: [{ ask: '(f 3)', a: '17' }, { ask: '(h 5)', a: 'error', err: 'cannot use before initialization' }],
    explain: 'In f, g is only called after w is defined: 6 + 1 + 10 = 17. In h, `(k 1)` runs while k is still uninitialised.' },

  { id: 's-toplevel', topic: 'scope', type: 'mcq', src: 'slides',
    q: 'A Racket file contains `(define w (+ v 4))` followed by `(define v 5)`. What happens?',
    options: ['w is 9', 'Error: v: undefined; cannot reference an identifier before its definition', 'w is #<undefined>', 'Error: module: identifier already defined'],
    answer: 1,
    explain: 'Top-level is like letrec: you may REFER to later bindings inside function bodies (they run later), but evaluating `(+ v 4)` right now needs v\'s value, which does not exist yet.' },

  { id: 's-toplevel2', topic: 'scope', type: 'mcq', src: 'slides',
    q: 'A file contains `(define f 1)` and later `(define f 17)`. In OCaml that would just shadow. In Racket?',
    options: ['f is 17 afterwards', 'f is 1', 'Error: module: identifier already defined in: f (and nothing in the file runs)', 'Warning only'],
    answer: 2,
    explain: 'Top-level defines all live in one letrec-like scope, so both would be in scope at once. That makes no sense, so it is an error.' },

  { id: 's-setclosure', topic: 'scope', type: 'predict', src: 'slides',
    q: 'Closures REFERENCE their environment; they do not copy it. Evaluate the final names:',
    code: `(define b 3)
(define g (lambda (x) (+ x b)))
(define c (+ b 4))
(set! b 5)
(define d (g 4))
(define e c)`,
    parts: [{ ask: 'c', a: '7' }, { ask: 'd', a: '9' }, { ask: 'e', a: '7' }],
    explain: 'g looks up b when it RUNS, and by then b is 5, so d = 9. c was computed before the set!, and a computed value never changes: "once an expression produces a value, how it did so is irrelevant".' },

  { id: 's-au18-b', topic: 'scope', type: 'predict', src: 'Au18 final Q2b',
    q: 'Nested closures with mutation. Work carefully: draw the environments!',
    code: `(define f
  (let ([x 1])
    (begin (set! x (+ x 1))
           (lambda ()
             (let ([y 1])
               (begin (set! y (+ y 1))
                      (set! x (+ y x))
                      (lambda ()
                        (let ([z 1])
                          (begin (set! z (+ z 1))
                                 (set! y (+ y z))
                                 (set! x (+ y x))
                                 x)))))))))
(define a1 (f))
(define a2 (f))
(define p1 (a1))
(define p2 (a2))
(define p3 (a1))
(define p4 (a2))`,
    parts: [{ ask: 'p1', a: '10' }, { ask: 'p2', a: '14' }, { ask: 'p3', a: '20' }, { ask: 'p4', a: '26' }],
    explain: 'There is ONE shared x (created once when f is defined, then x = 2). Each call to f makes a NEW y. a1: y=2, x=4. a2: y\'=2, x=6. p1: z=2, y=4, x=10. p2: y\'=4, x=14. p3: z is fresh each call (2), y=6, x=20. p4: y\'=6, x=26.' },

  { id: 's-sp17', topic: 'scope', type: 'predict', src: 'Sp17 final Q2',
    q: 'Which x does each function mutate? Give a1 … a8.',
    code: `(define x 7)
(define f1 (lambda () (begin (set! x (+ x 1)) (+ x 1))))
(define f2 (lambda (x) (begin (set! x (+ x 1)) (+ x 1))))
(define f3 (let ([x 5]) (lambda () (begin (set! x (+ x 1)) (+ x 1)))))
(define f4 (lambda () (let ([x 7]) (begin (set! x (+ x 1)) (+ x 1)))))
(define a1 (f1))
(define a2 (f2 x))
(define a3 (f3))
(define a4 (f4))
(define a5 (f1))
(define a6 (f2 x))
(define a7 (f3))
(define a8 (f4))`,
    parts: [{ ask: 'a1', a: '9' }, { ask: 'a2', a: '10' }, { ask: 'a3', a: '7' }, { ask: 'a4', a: '9' }, { ask: 'a5', a: '10' }, { ask: 'a6', a: '11' }, { ask: 'a7', a: '8' }, { ask: 'a8', a: '9' }],
    explain: 'f1 mutates the GLOBAL x. f2 mutates its own parameter (a copy of the value), so the global is unaffected. f3 mutates a private x shared across calls (a counter). f4 makes a fresh x = 7 every call, so it always returns 9.' },

  { id: 's-sp19', topic: 'scope', type: 'predict', src: 'Sp19 final Q2',
    q: 'Give part-a … part-f.',
    code: `(define x 1)
(define y 2)
(define (g a) (+ a y))
(define (f1 z) (let ([x y] [y x]) (+ x (g y) z)))
(define (f2 z) (let* ([x y] [y x]) (+ x (g y) z)))
(define (f3 z)
  (let ([t x])
    (begin (set! x y)
           (set! y t)
           (let ([ans (+ x (g y) z)] [u x])
             (begin (set! x y) (set! y u) ans)))))
(define part-a (f1 3))
(define part-b (f2 3))
(define part-c (f3 3))
(define part-d (f1 3))
(define part-e (f2 3))
(define part-f (f3 3))`,
    parts: [{ ask: 'part-a', a: '8' }, { ask: 'part-b', a: '9' }, { ask: 'part-c', a: '7' }, { ask: 'part-d', a: '8' }, { ask: 'part-e', a: '9' }, { ask: 'part-f', a: '7' }],
    explain: 'KEY: g uses the GLOBAL y (lexical scope: where g was defined), not f1\'s local y. f1: x=2, local y=1, (g 1) = 1+2 = 3, so 2+3+3 = 8. f2: x=2, y=2, (g 2) = 4, so 2+4+3 = 9. f3 swaps the globals, so x=2, y=1, (g 1) = 1+1 = 2, giving 2+2+3 = 7, and then swaps them back, so the repeat calls give the same answers.' },

  { id: 's-wi22', topic: 'scope', type: 'predict', src: 'Wi22 final Q2',
    q: 'mcons aliasing. What is each part bound to?',
    code: `(define f1
  (lambda (x y)
    (let* ([p1 (mcons x y)] [p2 (mcons x y)])
      (begin (set-mcar! p1 (+ 1 (mcar p1)))
             (set-mcar! p2 (+ 1 (mcar p2)))
             (cons (mcar p1) (mcar p2))))))
(define f2
  (let* ([p1 (mcons 1 2)] [p2 (mcons 1 2)])
    (lambda (x y)
      (begin (set-mcar! p1 (+ 1 (mcar p1)))
             (set-mcar! p2 (+ 1 (mcar p2)))
             (cons (mcar p1) (mcar p2))))))
(define f3
  (lambda (x y)
    (let* ([p1 (mcons x y)] [p2 p1])
      (begin (set-mcar! p1 (+ 1 (mcar p1)))
             (set-mcar! p2 (+ 1 (mcar p2)))
             (cons (mcar p1) (mcar p2))))))
(define f4
  (lambda (p1 y)
    (let ([p2 (mcons (mcar p1) y)])
      (begin (set-mcar! p1 (+ 1 (mcar p1)))
             (set-mcar! p2 (+ 1 (mcar p2)))
             (cons (mcar p1) (mcar p2))))))
(define part-a (f1 1 2))
(define part-b (f1 1 2))
(define part-c (f2 1 2))
(define part-d (f2 1 2))
(define part-e (f3 1 2))
(define part-f (f3 1 2))
(define part-g (f4 (mcons 1 2) 2))
(define part-h (f4 (mcons 1 2) 2))`,
    parts: [{ ask: 'part-a', a: "'(2 . 2)" }, { ask: 'part-b', a: "'(2 . 2)" }, { ask: 'part-c', a: "'(2 . 2)" }, { ask: 'part-d', a: "'(3 . 3)" }, { ask: 'part-e', a: "'(3 . 3)" }, { ask: 'part-f', a: "'(3 . 3)" }, { ask: 'part-g', a: "'(2 . 2)" }, { ask: 'part-h', a: "'(2 . 2)" }],
    explain: 'f1: fresh pairs per call. f2: the pairs are created ONCE (outside the lambda) and persist, so the second call gives 3. f3: p2 IS p1 (an alias), so it is incremented twice → 3. f4: p2 is a NEW pair copied from p1, and each call gets a brand-new p1.' },

  { id: 's-wi23', topic: 'scope', type: 'predict', src: 'Wi23 final Q2',
    q: 'set! vs set-mcar!. Give part-a … part-h.',
    code: `(define f1 (let ([x 0]) (lambda () (begin (set! x (+ x 1)) x))))
(define f2 (lambda () (let ([x 0]) (begin (set! x (+ x 1)) x))))
(define f3 (lambda (mp) (begin (set-mcar! mp (+ (mcar mp) 1)) mp)))
(define f4 (lambda (mp) (begin (set! mp (mcons (+ (mcar mp) 1) (mcdr mp))) mp)))
(define p (mcons 0 0))
(define part-a (f1))
(define part-b (f2))
(define part-c (mcar (f3 p)))
(define part-d (mcar (f4 p)))
(define part-e (f1))
(define part-f (f2))
(define part-g (mcar (f3 p)))
(define part-h (mcar (f4 p)))`,
    parts: [{ ask: 'part-a', a: '1' }, { ask: 'part-b', a: '1' }, { ask: 'part-c', a: '1' }, { ask: 'part-d', a: '2' }, { ask: 'part-e', a: '2' }, { ask: 'part-f', a: '1' }, { ask: 'part-g', a: '2' }, { ask: 'part-h', a: '3' }],
    explain: 'f3 MUTATES the pair p, which the caller sees. f4 only rebinds its LOCAL variable mp to a new pair, so p is untouched. After part-c p is (1 . 0); part-d sees a new pair with mcar 2; part-g bumps p to 2; part-h makes a new pair with 3.' },

  { id: 's-sp23', topic: 'scope', type: 'predict', src: 'Sp23 final Q2',
    q: 'Give part-a … part-j.',
    code: `(define f1 (let ([y 0]) (lambda (x) (begin (set! y (+ y x)) (+ y 1)))))
(define f2 (lambda (x) (let ([y 0]) (begin (set! y (+ y x)) (+ y 1)))))
(define (f3 p) (lambda (x) (begin (set-mcar! p (+ (mcar p) x)) (+ (mcar p) 1))))
(define part-a (f1 2))
(define part-b (f2 2))
(define part-c (f1 2))
(define part-d (f2 2))
(define p1 (mcons 3 4))
(define p2 (mcons 3 4))
(define foo (f3 p1))
(define bar (f3 p1))
(define baz (f3 p2))
(define part-e (foo 2))
(define part-f (bar 2))
(define part-g (baz 2))
(define part-h (foo 2))
(define part-i (bar 2))
(define part-j (baz 2))`,
    parts: [{ ask: 'part-a', a: '3' }, { ask: 'part-b', a: '3' }, { ask: 'part-c', a: '5' }, { ask: 'part-d', a: '3' }, { ask: 'part-e', a: '6' }, { ask: 'part-f', a: '8' }, { ask: 'part-g', a: '6' }, { ask: 'part-h', a: '10' }, { ask: 'part-i', a: '12' }, { ask: 'part-j', a: '8' }],
    explain: 'foo and bar share the SAME pair p1, so every call to either bumps the same mcar: 5, 7, 9, 11 (+1 each answer). baz has its own pair p2: 5, 7.' },

  { id: 's-counter-bug', topic: 'scope', type: 'explain', src: 'exam style',
    q: 'This counter always returns 1. Why? Fix it in one line.',
    code: `(define (make-counter)
  (lambda ()
    (let ([c 0])
      (begin (set! c (+ c 1)) c))))`,
    answer: 'The `let` is INSIDE the lambda, so every call creates a fresh c = 0. Move it outside: `(define (make-counter) (let ([c 0]) (lambda () (begin (set! c (+ c 1)) c))))`. Now the closure captures one c that persists between calls.',
    explain: 'Same idea as f1 vs f2 in the Wi23 exam: where a binding sits relative to the lambda decides whether state is shared.' },

  { id: 's-counter', topic: 'scope', type: 'predict',
    q: 'Each call to make-counter creates a new environment.',
    code: `(define (make-counter)
  (let ([c 0])
    (lambda () (begin (set! c (+ c 1)) c))))
(define c1 (make-counter))
(define c2 (make-counter))`,
    parts: [{ ask: '(c1)', a: '1' }, { ask: '(c1)', a: '2' }, { ask: '(c2)', a: '1' }, { ask: '(c1)', a: '3' }],
    explain: 'c1 and c2 each captured their OWN c.' },

  { id: 's-alias', topic: 'scope', type: 'predict', src: 'slides',
    q: 'cons cells are immutable. Evaluate:',
    code: `(define lst1 (cons 14 null))
(define aliased-lst1 lst1)
(set! lst1 (cons 42 null))`,
    parts: [{ ask: 'lst1', a: "'(42)" }, { ask: 'aliased-lst1', a: "'(14)" }, { ask: '(car aliased-lst1)', a: '14' }],
    explain: '`set!` changes which list the NAME lst1 points to. It does not change the list itself. The alias still points to the old, unchanged list. Because cons cells are immutable, aliasing never matters for lists.' },

  { id: 's-mcons', topic: 'scope', type: 'predict', src: 'slides',
    q: 'mcons cells CAN be mutated, and aliases see the change.',
    code: `(define mp (mcons 1 (mcons #t "hi")))
(define alias mp)
(set-mcdr! (mcdr mp) "bye")
(set-mcar! alias 10)`,
    parts: [{ ask: 'mp', a: '(mcons 10 (mcons #t "bye"))' }, { ask: '(mcar mp)', a: '10' }, { ask: '(car mp)', a: 'error', err: 'car: contract violation' }],
    explain: 'mcons pairs are a completely separate type: `car` on an mcons (or `mcar` on a cons) is a run-time error. Note mcons values print as `(mcons ...)`, not with a quote.' },

  { id: 's-cons-truth', topic: 'scope', type: 'predict', src: 'slides',
    q: '`cons` just makes a pair. Lists are right-nested pairs ending in null.',
    code: `(define pr (cons 1 (cons #t "hi")))
(define lst (cons 1 (cons #t (cons "hi" null))))`,
    parts: [{ ask: 'pr', a: '\'(1 #t . "hi")' }, { ask: 'lst', a: '\'(1 #t "hi")' }, { ask: '(list? pr)', a: '#f' }, { ask: '(pair? pr)', a: '#t' },
            { ask: '(cdr (cdr pr))', a: '"hi"' }, { ask: '(caddr lst)', a: '"hi"' }, { ask: '(list? null)', a: '#t' }, { ask: '(pair? null)', a: '#f' }, { ask: '(length pr)', a: 'error', err: 'length: contract violation' }],
    explain: 'pr is an IMPROPER list (it does not end in null), so it prints with a dot and `length` rejects it. `pair?` is true for every non-empty list; `list?` is true for proper lists, including the empty one.' },

  { id: 's-boxes', topic: 'scope', type: 'mcq',
    q: 'Which expression builds `\'(1 2 . 3)`?',
    options: ['(list 1 2 3)', '(cons 1 (cons 2 3))', '(cons (cons 1 2) 3)', '(list 1 (cons 2 3))'],
    answer: 1,
    explain: 'Read the dot as "the final cdr is 3 instead of null". (list 1 2 3) is \'(1 2 3); (cons (cons 1 2) 3) is \'((1 . 2) . 3); (list 1 (cons 2 3)) is \'(1 (2 . 3)). Use the Box diagram tool to see each one.' },

  { id: 's-begin', topic: 'scope', type: 'predict',
    q: 'Sequencing with begin.',
    code: `(define x 1)`,
    parts: [{ ask: '(* 10 (begin 1 2 3))', a: '30' }, { ask: '(* 2 (begin (set! x (+ x 10)) x))', a: '22' }, { ask: '(let ([y 1]) (set! y 5) y)', a: '5' }],
    explain: '`begin` evaluates each expression in order and returns the LAST one. Bodies of let/lambda/define have an implicit begin. (Quirk: a `begin` written directly at the top level of a file is spliced into the file, so each of its values is printed.)' },

  { id: 's-setbang-mcq', topic: 'scope', type: 'mcq',
    q: 'What does `(set! x e)` do?',
    options: ['Creates a new binding for x', 'Evaluates e to a value v and updates the existing binding of x to v; every closure using that x sees the change', 'Mutates the contents of the list x points to', 'Only works on mcons'],
    answer: 1,
    explain: 'It is an assignment statement (like `x = e` in Python). The `!` signals mutation. Racket only allows set! on a top-level variable from inside the module that defines it.' }
  );
})();
