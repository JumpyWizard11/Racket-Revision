// Question bank part 3: structs/variants, implementing languages (interpreters, MUPL), static vs dynamic typing.
(function () {
  const P = (window.PRELUDES = window.PRELUDES || {});
  P.arith = `(struct const (int) #:transparent)
(struct negate (e) #:transparent)
(struct add (e1 e2) #:transparent)
(struct multiply (e1 e2) #:transparent)`;
  P.lbi = `(struct const (int) #:transparent)
(struct bool (b) #:transparent)
(struct negate (e1) #:transparent)
(struct add (e1 e2) #:transparent)
(struct multiply (e1 e2) #:transparent)
(struct eq-num (e1 e2) #:transparent)
(struct if-then-else (e1 e2 e3) #:transparent)`;
  // A complete, correct MUPL interpreter (the language from the old exams' Homework 5).
  P.mupl = `(struct var (string) #:transparent)       ; a variable, e.g. (var "foo")
(struct int (num) #:transparent)          ; a constant number, e.g. (int 17)
(struct add (e1 e2) #:transparent)        ; add two expressions
(struct isgreater (e1 e2) #:transparent)  ; if e1 > e2 then (int 1) else (int 0)
(struct ifnz (e1 e2 e3) #:transparent)    ; if e1 is not zero then e2 else e3
(struct fun (nameopt formal body) #:transparent) ; 1-argument function; nameopt is #f or a name for recursion
(struct call (funexp actual) #:transparent)      ; function call
(struct mlet (var e body) #:transparent)  ; let var = e in body
(struct apair (e1 e2) #:transparent)      ; make a pair
(struct first (e) #:transparent)          ; first part of a pair
(struct second (e) #:transparent)         ; second part of a pair
(struct munit () #:transparent)           ; unit value, ends a list
(struct ismunit (e) #:transparent)        ; (int 1) if e is munit else (int 0)
(struct closure (env fun) #:transparent)  ; what functions evaluate to

(define (envlookup env str)
  (cond [(null? env) (error "unbound variable during evaluation" str)]
        [(equal? (car (car env)) str) (cdr (car env))]
        [#t (envlookup (cdr env) str)]))

(define (eval-under-env e env)
  (cond [(var? e) (envlookup env (var-string e))]
        [(or (int? e) (munit? e) (closure? e)) e]
        [(add? e)
         (let ([v1 (eval-under-env (add-e1 e) env)]
               [v2 (eval-under-env (add-e2 e) env)])
           (if (and (int? v1) (int? v2))
               (int (+ (int-num v1) (int-num v2)))
               (error "MUPL addition applied to non-number")))]
        [(isgreater? e)
         (let ([v1 (eval-under-env (isgreater-e1 e) env)]
               [v2 (eval-under-env (isgreater-e2 e) env)])
           (if (and (int? v1) (int? v2))
               (if (> (int-num v1) (int-num v2)) (int 1) (int 0))
               (error "MUPL isgreater applied to non-number")))]
        [(ifnz? e)
         (let ([v (eval-under-env (ifnz-e1 e) env)])
           (if (int? v)
               (if (= (int-num v) 0)
                   (eval-under-env (ifnz-e3 e) env)
                   (eval-under-env (ifnz-e2 e) env))
               (error "MUPL ifnz applied to non-number")))]
        [(fun? e) (closure env e)]
        [(call? e)
         (let ([c (eval-under-env (call-funexp e) env)]
               [arg (eval-under-env (call-actual e) env)])
           (if (closure? c)
               (let* ([f (closure-fun c)]
                      [env1 (cons (cons (fun-formal f) arg) (closure-env c))]
                      [env2 (if (fun-nameopt f) (cons (cons (fun-nameopt f) c) env1) env1)])
                 (eval-under-env (fun-body f) env2))
               (error "MUPL call applied to non-function")))]
        [(mlet? e)
         (let ([v (eval-under-env (mlet-e e) env)])
           (eval-under-env (mlet-body e) (cons (cons (mlet-var e) v) env)))]
        [(apair? e) (apair (eval-under-env (apair-e1 e) env) (eval-under-env (apair-e2 e) env))]
        [(first? e)
         (let ([v (eval-under-env (first-e e) env)])
           (if (apair? v) (apair-e1 v) (error "MUPL first applied to non-apair")))]
        [(second? e)
         (let ([v (eval-under-env (second-e e) env)])
           (if (apair? v) (apair-e2 v) (error "MUPL second applied to non-apair")))]
        [(ismunit? e)
         (if (munit? (eval-under-env (ismunit-e e) env)) (int 1) (int 0))]
        ;; <<NEW CASES GO HERE>>
        [#t (error (format "bad MUPL expression: ~v" e))]))

(define (eval-exp e) (eval-under-env e null))`;
  const MUPL_TEMPLATE = (extraStructs) => P.mupl.replace('(define (envlookup', extraStructs + '\n\n(define (envlookup').replace(';; <<NEW CASES GO HERE>>', '<<ANSWER>>');

  const Q = (window.QUESTIONS = window.QUESTIONS || []);
  Q.push(
  // ======================= STRUCTS & VARIANTS =======================
  { id: 'st-basic', topic: 'structs', type: 'predict', src: 'slides',
    q: '`struct` defines a constructor, a predicate and field accessors. Evaluate:',
    code: `(struct point2d (x y) #:transparent)
(define p (point2d 3 4))`,
    parts: [{ ask: '(point2d-x p)', a: '3' }, { ask: '(point2d? p)', a: '#t' }, { ask: '(point2d? (list 3 4))', a: '#f' }, { ask: 'p', a: '(point2d 3 4)' }, { ask: '(list? p)', a: '#f' }, { ask: '(pair? p)', a: '#f' }],
    explain: 'A struct value is something entirely NEW: not a list, not a pair. #:transparent only makes it print nicely as `(point2d 3 4)`.' },

  { id: 'st-opaque', topic: 'structs', type: 'predict', src: 'slides',
    q: 'Without #:transparent:',
    code: `(struct pt (x y))
(struct mpt (x y) #:transparent #:mutable)
(define m (mpt 1 2))
(set-mpt-x! m 10)`,
    parts: [{ ask: '(pt 1 2)', a: '#<pt>' }, { ask: '(pt-y (pt 1 2))', a: '2' }, { ask: 'm', a: '(mpt 10 2)' }],
    explain: 'Opaque structs print as #<pt>. #:mutable adds setters like set-mpt-x!. Fun fact: mcons is just a predefined `(struct mcons (mcar mcdr) #:transparent #:mutable)`.' },

  { id: 'st-wrongfield', topic: 'structs', type: 'predict', src: 'slides',
    q: 'Struct accessors check their argument. Evaluate:',
    prelude: 'arith',
    code: ``,
    parts: [{ ask: '(add-e1 (add (const 1) (const 2)))', a: '(const 1)' }, { ask: '(multiply-e1 (add (const 1) (const 2)))', a: 'error', err: 'multiply-e1: contract violation' }],
    explain: 'With structs you cannot use a projection from the wrong type, and `car`/`cdr` on an add is also an error. Error messages are good.' },

  { id: 'st-listbreak', topic: 'structs', type: 'predict', src: 'slides',
    q: 'The list-and-symbol approach to variants. Evaluate (is the abstraction safe?):',
    code: `(define (Const i) (list 'Const i))
(define (Add e1 e2) (list 'Add e1 e2))
(define (Add? x) (eq? (car x) 'Add))
(define (Add-e1 e) (cadr e))`,
    parts: [{ ask: '(Add (Const 1) (Const 2))', a: "'(Add (Const 1) (Const 2))" }, { ask: '(Add? (cons \'Add "gotcha"))', a: '#t' }, { ask: '(car (Add (Const 1) (Const 2)))', a: "'Add" }, { ask: '(Add-e1 (cons \'Add "gotcha"))', a: 'error', err: 'cadr: contract violation' }],
    explain: 'Anyone can build a malformed value like `(cons \'Add "gotcha")` that FOOLS the predicate, or poke inside with car/cdr. Structs prevent both, which gives abstraction without static types.' },

  { id: 'st-why', topic: 'structs', type: 'mcq', src: 'slides',
    q: 'Why should you prefer `struct` over tagged lists for variants in Racket?',
    options: ['Structs are faster to type only', 'More concise, better style, less error-prone: better error messages, you cannot use the wrong accessor, and weird lists cannot fool the predicates', 'Tagged lists cannot be recursive', 'Structs give static type checking'],
    answer: 1,
    explain: 'One is NOT syntactic sugar for the other: a struct creates a genuinely new dynamic type, which you cannot simulate with a function or macro.' },

  { id: 'st-whyvariants', topic: 'structs', type: 'mcq', src: 'slides',
    q: 'OCaml uses variants for (1) mixing types in one collection and (2) labelled recursive trees. Which does Racket actually need structs for?',
    options: ['Only (1)', 'Only (2): dynamic typing already lets lists mix types (every value carries a runtime tag), but you still need LABELS to tell e.g. add from multiply nodes', 'Both', 'Neither'],
    answer: 1,
    explain: 'A node holding two numbers could be an add OR a multiply, and the data type alone cannot tell you which, so you need a label.' },

  { id: 'st-funny', topic: 'structs', type: 'predict', src: 'slides',
    q: 'Mixed collections with no variant type. Evaluate:',
    code: `(define (funny-sum xs)
  (cond [(null? xs) 0]
        [(number? (car xs)) (+ (car xs) (funny-sum (cdr xs)))]
        [(string? (car xs)) (+ (string-length (car xs)) (funny-sum (cdr xs)))]
        [#t (error "list was supposed to have only numbers and strings")]))`,
    parts: [{ ask: '(funny-sum (list 1 "hi" 2 "abc"))', a: '8' }, { ask: "(funny-sum (list 1 'x))", a: 'error', err: 'only numbers and strings' }],
    explain: 'Type predicates (number?, string?) replace pattern matching on constructors.' },

  { id: 'st-eval', topic: 'structs', type: 'predict', src: 'slides',
    q: 'Two evaluators: one returns a Racket number, the other returns an expression (a const).',
    prelude: 'arith',
    code: `(define (eval-exp e)
  (cond [(const? e) (const-int e)]
        [(negate? e) (- (eval-exp (negate-e e)))]
        [(add? e) (+ (eval-exp (add-e1 e)) (eval-exp (add-e2 e)))]
        [(multiply? e) (* (eval-exp (multiply-e1 e)) (eval-exp (multiply-e2 e)))]))
(define (eval-exp-exp e)
  (cond [(const? e) e]
        [(negate? e) (const (- (const-int (eval-exp-exp (negate-e e)))))]
        [(add? e) (let ([v1 (eval-exp-exp (add-e1 e))] [v2 (eval-exp-exp (add-e2 e))])
                    (const (+ (const-int v1) (const-int v2))))]
        [(multiply? e) (let ([v1 (eval-exp-exp (multiply-e1 e))] [v2 (eval-exp-exp (multiply-e2 e))])
                         (const (* (const-int v1) (const-int v2))))]
        [#t (error "eval-exp expected an exp")]))`,
    parts: [{ ask: '(eval-exp (add (const 3) (negate (const 5))))', a: '-2' }, { ask: '(eval-exp-exp (add (const 3) (negate (const 5))))', a: '(const -2)' }, { ask: '(eval-exp-exp (multiply (negate (add (const 2) (const 2))) (const 7)))', a: '(const -28)' }],
    explain: 'The pattern for the expression-returning version: check the tag, remove the tag (const-int), compute, then tag the new result (const ...).' },

  { id: 'st-whyexp', topic: 'structs', type: 'mcq', src: 'slides',
    q: 'Why switch the evaluator\'s "type" from expr → int to expr → expr?',
    options: ['Faster', 'So results can be different KINDS of values (numbers, booleans, pairs, closures…) and to keep the language being implemented (LBI) separate from the metalanguage (Racket)', 'Required by struct', 'To avoid recursion'],
    answer: 1,
    explain: 'It is painful while the only result is a number, but necessary as soon as you add bools, pairs or functions.' },

  { id: 'st-missingcase', topic: 'structs', type: 'predict', src: 'exam style (bad code)',
    q: 'This evaluator forgot a case. What happens? (A void result prints NOTHING, so answer `void`.)',
    prelude: 'arith',
    code: `(define (eval-exp e)
  (cond [(const? e) (const-int e)]
        [(negate? e) (- (eval-exp (negate-e e)))]
        [(add? e) (+ (eval-exp (add-e1 e)) (eval-exp (add-e2 e)))]))`,
    parts: [{ ask: '(eval-exp (add (const 1) (const 2)))', a: '3' }, { ask: '(eval-exp (multiply (const 2) (const 3)))', a: 'void', shows: '', alt: ['#<void>', 'nothing', 'no output'] },
            { ask: '(eval-exp (add (const 1) (multiply (const 2) (const 3))))', a: 'error', err: '+: contract violation' }],
    explain: 'A cond with no matching clause returns #<void> silently, with no error, so the bug surfaces LATER, far from its cause, when + receives void. This is why the slides add `[#t (error "...")]` as a final clause.' },

  { id: 'st-forall', topic: 'structs', type: 'write', src: 'Sp17 final Q1c',
    q: 'Binary trees: `(struct node (left num right) #:transparent)` and `(struct empty () #:transparent)`. Write `forall`: returns #f iff some number in the tree makes f return #f (so #t for the empty tree).',
    prelude: 'tree',
    starter: `(define (forall f t)
  )`,
    answer: `(define (forall f t)
  (if (empty? t)
      #t
      (and (f (node-num t)) (forall f (node-left t)) (forall f (node-right t)))))`,
    tests: [{ run: '(forall even? (node (empty) 2 (node (empty) 4 (empty))))', expect: '#t' }, { run: '(forall even? (node (empty) 2 (node (empty) 3 (empty))))', expect: '#f' }, { run: '(forall even? (empty))', expect: '#t' }],
    explain: '`and` short-circuits, so it stops at the first #f. Note the struct is called empty, so `empty?` here is the struct\'s predicate.' },

  { id: 'st-gross', topic: 'structs', type: 'mcq', src: 'Sp17 final Q1e',
    q: 'What does `gross-abuse-of-forall` compute (as a client sees it)?',
    code: `(define (gross-abuse-of-forall t)
  (let ([x 0])
    (begin (forall (lambda (n) (begin (set! x (+ x 1)) #t)) t)
           x)))`,
    options: ['The sum of the tree', 'The number of numbers (nodes) in the tree', 'The depth of the tree', 'Always 0'],
    answer: 1,
    explain: 'The lambda always returns #t, so forall visits EVERY node, and each visit bumps x. Without mutation: `(define (foo t) (if (empty? t) 0 (+ 1 (foo (node-left t)) (foo (node-right t)))))`.' },

  // ======================= IMPLEMENTING LANGUAGES =======================
  { id: 'i-lbim', topic: 'interp', type: 'mcq', src: 'slides',
    q: 'We write an interpreter for "simple arithmetic" as a Racket function. Which is the metalanguage (M) and which is the language being implemented (LBI)?',
    options: ['M = simple arithmetic, LBI = Racket', 'M = Racket, LBI = simple arithmetic. LBI programs are Racket DATA (structs)', 'Both are Racket', 'M = C'],
    answer: 1,
    explain: 'We skip parsing by writing LBI programs directly as ASTs, built with struct constructors in Racket.' },

  { id: 'i-compiled', topic: 'interp', type: 'mcq', src: 'slides',
    q: '"C is faster than Java because C is a compiled language." What is the best response?',
    options: ['Correct', 'Technically wrong: being compiled or interpreted is a property of an IMPLEMENTATION, not the language. Better: "C programs are often faster when compiled"', 'Java is compiled too, so they are the same speed', 'C is interpreted'],
    answer: 1,
    explain: 'There are C interpreters, and Java is compiled to bytecode, which is then interpreted and JIT-compiled. Programs cannot tell how they are being run.' },

  { id: 'i-interp-vs-comp', topic: 'interp', type: 'mcq', src: 'slides',
    q: 'Which describes a COMPILER?',
    options: ['A program in M that takes an LBI program and produces its answer', 'A program in M that translates an LBI program into an equivalent program in a target language T that is already implemented', 'A type checker', 'A parser'],
    answer: 1,
    explain: 'Interpreter = evaluator (runs the program). Compiler = translator (must preserve meaning). Real systems mix both (javac → bytecode → JVM interpreter + JIT).' },

  { id: 'i-syntax-type', topic: 'interp', type: 'mcq', src: 'slides',
    q: 'Which input MUST our interpreter detect and report with a good LBI-level error message?',
    options: ['(negate -7) (a Racket number where an expression is expected)', '(multiply (add (const 3) "ha-ha!") (const 4))', '(add (const 3) (bool #t)), a legal AST that adds a number and a boolean', '(const #t)'],
    answer: 2,
    explain: 'Illegal ASTs (the other three) are the parser\'s job, so it is fine to crash on them. A syntactically legal program that misuses values is a DYNAMIC TYPE ERROR in the LBI: check after evaluating each subexpression and report it in LBI terms.' },

  { id: 'i-checks', topic: 'interp', type: 'predict', src: 'slides', independent: true,
    q: 'Two interpreters on the same legal-but-wrong program: `(multiply (const 2) (if-then-else (bool #f) (const 7) (bool #t)))`. What error does each give? (Type the error message.)',
    prelude: 'lbi',
    code: `(define (ev-wrong e) ; no type checks
  (cond [(const? e) e] [(bool? e) e]
        [(multiply? e) (const (* (const-int (ev-wrong (multiply-e1 e))) (const-int (ev-wrong (multiply-e2 e)))))]
        [(if-then-else? e) (if (bool-b (ev-wrong (if-then-else-e1 e))) (ev-wrong (if-then-else-e2 e)) (ev-wrong (if-then-else-e3 e)))]))
(define (ev e) ; checks every value it uses
  (cond [(const? e) e] [(bool? e) e]
        [(multiply? e) (let ([v1 (ev (multiply-e1 e))] [v2 (ev (multiply-e2 e))])
                         (if (and (const? v1) (const? v2)) (const (* (const-int v1) (const-int v2))) (error "multiply applied to non-number")))]
        [(if-then-else? e) (let ([v (ev (if-then-else-e1 e))])
                             (if (bool? v) (if (bool-b v) (ev (if-then-else-e2 e)) (ev (if-then-else-e3 e))) (error "if-then-else applied to non-boolean")))]))`,
    parts: [{ ask: '(ev (multiply (const 2) (if-then-else (bool #f) (const 7) (bool #t))))', a: 'error', err: 'multiply applied to non-number' },
            { ask: '(ev-wrong (multiply (const 2) (if-then-else (bool #f) (const 7) (bool #t))))', a: 'error', err: 'const-int: contract violation' }],
    explain: 'The unchecked version crashes with a META-language (Racket) error about const-int, which means nothing to an LBI programmer. The checked version reports the problem in LBI terms.' },

  { id: 'i-env', topic: 'interp', type: 'predict', src: 'MUPL',
    q: 'Environments are lists of (string . value) pairs, newest first. Evaluate:',
    code: `(define (envlookup env str)
  (cond [(null? env) (error "unbound variable during evaluation" str)]
        [(equal? (car (car env)) str) (cdr (car env))]
        [#t (envlookup (cdr env) str)]))
(define env (list (cons "x" 1) (cons "y" 2) (cons "x" 3)))`,
    parts: [{ ask: '(envlookup env "x")', a: '1' }, { ask: '(envlookup env "y")', a: '2' }, { ask: '(envlookup (cons (cons "y" 9) env) "y")', a: '9' }, { ask: '(envlookup env "z")', a: 'error', err: 'unbound variable during evaluation "z"' }],
    explain: 'Extending an environment = consing a new pair on the FRONT, so lookup finds the newest binding first. That is shadowing, for free.' },

  { id: 'i-closure', topic: 'interp', type: 'mcq', src: 'slides',
    q: 'In the interpreter, what does a FUNCTION expression evaluate to?',
    options: ['Itself', 'A closure: the function plus the CURRENT environment', 'The result of calling it', 'A list of free variables'],
    answer: 1,
    explain: 'A function is not yet a value. The closure "remembers" where it was defined, and that is all lexical scope needs.' },

  { id: 'i-call', topic: 'interp', type: 'mcq', src: 'slides',
    q: 'Evaluating `(call e1 e2)`: the closure\'s function body is evaluated in…',
    options: ['The caller\'s current environment', 'The closure\'s environment, extended with argument name → value of e2 (and the function\'s name → the closure itself, for recursion)', 'The empty environment', 'The top-level environment'],
    answer: 1,
    explain: 'NEVER the caller\'s environment: that would be dynamic scope. Also evaluate e1 and check that it IS a closure (a dynamic type check).' },

  { id: 'i-mupl-run', topic: 'interp', type: 'predict', src: 'MUPL',
    q: 'Using the full MUPL interpreter (see helpers), evaluate these programs:',
    prelude: 'mupl',
    code: ``,
    parts: [{ ask: '(eval-exp (mlet "x" (int 4) (add (var "x") (var "x"))))', a: '(int 8)' },
            { ask: '(eval-exp (call (fun #f "x" (add (var "x") (int 1))) (int 5)))', a: '(int 6)' },
            { ask: '(eval-exp (mlet "y" (int 1) (mlet "f" (fun #f "x" (add (var "x") (var "y"))) (mlet "y" (int 100) (call (var "f") (int 5))))))', a: '(int 6)' },
            { ask: '(eval-exp (call (fun "sum" "n" (ifnz (var "n") (add (var "n") (call (var "sum") (add (var "n") (int -1)))) (int 0))) (int 4)))', a: '(int 10)' },
            { ask: '(eval-exp (fun #f "x" (var "x")))', a: '(closure \'() (fun #f "x" (var "x")))' }],
    explain: 'Third program: f\'s closure captured y = 1, so the later y = 100 is ignored, giving (int 6). With dynamic scope it would be 105. Fourth: the name "sum" is bound to the closure itself, which allows recursion: 4+3+2+1.' },

  { id: 'i-buggy', topic: 'interp', type: 'predict', src: 'Sp17 final Q4 (bad code!)', independent: true,
    q: 'This MUPL interpreter has SEVERAL bugs. For each program, what does this buggy version ACTUALLY produce? (Find the bugs first.)',
    code: `(struct var (string) #:transparent)
(struct int (num) #:transparent)
(struct add (e1 e2) #:transparent)
(struct ifnz (e1 e2 e3) #:transparent)
(struct mlet (var e body) #:transparent)
(struct apair (e1 e2) #:transparent)
(struct first (e) #:transparent)
(struct second (e) #:transparent)
(define (envlookup env str)
  (cond [(null? env) (error "unbound variable during evaluation" str)]
        [(equal? (car (car env)) str) (cdr (car env))]
        [#t (envlookup (cdr env) str)]))
(define (eval-under-env e env)
  (cond [(var? e) (envlookup env (var-string e))]
        [(int? e) e]
        [(add? e) (let ([v1 (eval-under-env (add-e1 e) env)]
                        [v2 (eval-under-env (add-e2 e) env)])
                    (if (and (int? v1) (int? v2))
                        (int (+ (int-num v1) (int-num v2)))
                        (error "MUPL addition applied to non-number")))]
        [(ifnz? e) (let ([v1 (eval-under-env (ifnz-e1 e) env)]
                         [v2 (eval-under-env (ifnz-e2 e) env)]
                         [v3 (eval-under-env (ifnz-e3 e) env)])
                     (if (int? v1)
                         (if (= (int-num v1) 0) v2 v3)
                         (error "MUPL ifnz applied to non-number")))]
        [(mlet? e) (let* ([v (eval-under-env (mlet-e e) env)])
                     (eval-under-env (mlet-body e) (list (cons (mlet-var e) v))))]
        [(apair? e) (apair (eval-under-env (apair-e1 e) env)
                           (eval-under-env (apair-e2 e) env))]
        [(first? e) (if (apair? (first-e e))
                        (apair-e1 (first-e e))
                        (error "MUPL first applied to non-apair"))]
        [(second? e) (if (apair? (second-e e))
                         (apair-e2 (second-e e))
                         (error "MUPL second applied to non-apair"))]
        [#t (error (format "bad MUPL expression: ~v" e))]))
(define (eval-exp e) (eval-under-env e null))`,
    parts: [{ ask: '(eval-exp (first (apair (apair (int 3) (int 4)) (int 5))))', a: '(apair (int 3) (int 4))' },
            { ask: '(eval-exp (first (apair (add (int 3) (int 4)) (int 5))))', a: '(add (int 3) (int 4))' },
            { ask: '(eval-exp (first (first (apair (apair (int 3) (int 4)) (int 5)))))', a: 'error', err: 'MUPL first applied to non-apair' },
            { ask: '(eval-exp (mlet "x" (int 4) (ifnz (var "x") (var "x") (var "y"))))', a: 'error', err: 'unbound variable during evaluation "y"' },
            { ask: '(eval-exp (mlet "x" (int 4) (ifnz (var "x") (int 5) (int 6))))', a: '(int 6)' },
            { ask: '(eval-exp (mlet "x" (int 4) (mlet "y" (int 4) (ifnz (var "x") (int 5) (int 6)))))', a: 'error', err: 'unbound variable during evaluation "x"' },
            { ask: '(eval-exp (mlet "y" (int 4) (mlet "x" (int 4) (ifnz (var "x") (int 5) (int 6)))))', a: '(int 6)' }],
    explain: 'Bugs: (1) first/second do not EVALUATE their subexpression (they inspect the raw syntax), so (b) returns unevaluated syntax and (c) fails. (2) ifnz evaluates BOTH branches eagerly, so (d) looks up y even though it is never needed. (3) ifnz branches are swapped (= 0 picks v2), so (e) and (g) give 6 instead of 5. (4) mlet REPLACES the environment with a one-element list instead of extending it, so (f) loses x. The correct answers are (apair (int 3) (int 4)), (int 7), (int 3), (int 4), (int 5), (int 5), (int 5).' },

  { id: 'i-callpair', topic: 'interp', type: 'mcq', src: 'Sp19 final Q4c',
    q: '`(struct callpair (e))` should evaluate e to a pair (closure . arg) and call it. Is this case correct?',
    code: `[(callpair? e)
 (let ([pr (eval-under-env e env)])
   (if (not (apair? pr))
       (error "argument to callpair did not evaluate to a pair")
       (eval-under-env (call (apair-e1 pr) (apair-e2 pr)) env)))]`,
    options: ['Yes, correct', 'No: it evaluates `e` (the whole callpair expression) again instead of `(callpair-e e)`, so it recurses forever', 'No: wrong error message', 'No: should use first/second'],
    answer: 1,
    explain: 'A one-word bug: `(eval-under-env e env)` vs `(eval-under-env (callpair-e e) env)`. Always check that a recursive call is on a SUB-expression.' },

  { id: 'i-callpair2', topic: 'interp', type: 'mcq', src: 'Sp19 final Q4b',
    q: 'Is this implementation of callpair correct when e evaluates to a pair whose first part is a closure?',
    code: `[(callpair? e)
 (eval-under-env (mlet "x" (callpair-e e)
                   (call (apair-e1 (var "x")) (apair-e2 (var "x"))))
                 env)]`,
    options: ['Yes', 'No: apair-e1 is a RACKET function applied (right now, while building the expression) to the MUPL syntax (var "x"), which is not an apair, so it raises a Racket error', 'No: x might shadow a user variable, but otherwise fine', 'No: infinite loop'],
    answer: 1,
    explain: 'Mixing up levels: `first` is the MUPL construct (syntax, evaluated later), while `apair-e1` is a Racket accessor (runs immediately). The version using `(first (var "x"))` and `(second (var "x"))` is correct.' },

  { id: 'i-mmax', topic: 'interp', type: 'write', src: 'Au18 final Q4a',
    q: 'Add a case for `(struct mmax (e1 e2))`: if both subexpressions evaluate to ints, return the max; if only ONE is an int, return that int; error only if neither is. (You are writing one cond clause.)',
    prelude: [],
    template: MUPL_TEMPLATE('(struct mmax (e1 e2) #:transparent)'),
    starter: `[(mmax? e)
 ]`,
    answer: `[(mmax? e)
 (let ([v1 (eval-under-env (mmax-e1 e) env)]
       [v2 (eval-under-env (mmax-e2 e) env)])
   (cond [(and (int? v1) (int? v2)) (if (> (int-num v1) (int-num v2)) v1 v2)]
         [(int? v1) v1]
         [(int? v2) v2]
         [#t (error "MUPL mmax applied to two non-numbers")]))]`,
    tests: [{ run: '(eval-exp (mmax (int 3) (int 7)))', expect: '(int 7)' }, { run: '(eval-exp (mmax (munit) (int 2)))', expect: '(int 2)' }, { run: '(eval-exp (mlet "a" (int 9) (mmax (var "a") (apair (int 1) (int 1)))))', expect: '(int 9)' }],
    explain: 'Evaluate both subexpressions in the CURRENT env, then dynamic-type-check the resulting VALUES.' },

  { id: 'i-mmax-macro', topic: 'interp', type: 'write', src: 'Au18 final Q4b',
    q: 'Write a Racket function (a MUPL "macro") `mmax2` so `(mmax2 e1 e2)` builds a MUPL expression computing the max of two ints (an error if either is not an int). Use mlet so e1 and e2 are evaluated only once; assume "_x" and "_y" are safe names.',
    prelude: 'mupl',
    starter: `(define (mmax2 e1 e2)
  )`,
    answer: `(define (mmax2 e1 e2)
  (mlet "_x" e1
        (mlet "_y" e2
              (ifnz (isgreater (var "_x") (var "_y")) (var "_x") (var "_y")))))`,
    tests: [{ run: '(eval-exp (mmax2 (int 3) (int 8)))', expect: '(int 8)' }, { run: '(eval-exp (mmax2 (add (int 5) (int 5)) (int 8)))', expect: '(int 10)' }, { run: '(mmax2 (int 1) (int 2))', expect: '(mlet "_x" (int 1) (mlet "_y" (int 2) (ifnz (isgreater (var "_x") (var "_y")) (var "_x") (var "_y"))))' }],
    explain: 'A MUPL macro is just a Racket function that RETURNS MUPL syntax. There is no change to the interpreter. These macros are NOT hygienic (a user variable called "_x" could clash).' },

  { id: 'i-mmax-why', topic: 'interp', type: 'mcq', src: 'Au18 final Q4c',
    q: 'Why can\'t the macro approach give the flexible semantics of the mmax case ("if only one is an int, return it")?',
    options: ['Macros cannot use mlet', 'MUPL has no construct to TEST whether a value is an int (unlike ismunit for munit); with an isint construct it would be possible', 'Macros are evaluated at run time', 'It can'],
    answer: 1,
    explain: 'A macro can only produce programs made of EXISTING constructs. If no existing construct can observe something, no macro can either.' },

  { id: 'i-fom', topic: 'interp', type: 'write', src: 'Wi22 final Q4a',
    q: 'Add a case for `(struct first-or-munit (e))`: if e evaluates to a pair, return its first part; if e evaluates to munit, return munit; anything else is an error.',
    template: MUPL_TEMPLATE('(struct first-or-munit (e) #:transparent)'),
    starter: `[(first-or-munit? e)
 ]`,
    answer: `[(first-or-munit? e)
 (let ([pr (eval-under-env (first-or-munit-e e) env)])
   (cond [(apair? pr) (apair-e1 pr)]
         [(munit? pr) pr]
         [#t (error "MUPL first-or-munit applied to non-pair non-munit")]))]`,
    tests: [{ run: '(eval-exp (first-or-munit (apair (int 1) (int 2))))', expect: '(int 1)' }, { run: '(eval-exp (first-or-munit (munit)))', expect: '(munit)' }],
    explain: 'Could it be a macro? YES: `(mlet "_x" e (ifnz (ismunit (var "_x")) (var "_x") (first (var "_x"))))`. Could `first-or-anything` (return non-pairs unchanged) be a macro? NO: MUPL has no way to test whether a value is a pair.' },

  { id: 'i-envremove', topic: 'interp', type: 'write', src: 'Au17 final Q4a',
    q: 'Write `envremove`: given an environment and a string, return the environment with ALL bindings for that string removed.',
    starter: `(define (envremove env str)
  )`,
    answer: `(define (envremove env str)
  (cond [(null? env) null]
        [(equal? (car (car env)) str) (envremove (cdr env) str)]
        [#t (cons (car env) (envremove (cdr env) str))]))`,
    tests: [{ run: '(envremove (list (cons "x" 1) (cons "y" 2) (cons "x" 3)) "x")', expect: '\'(("y" . 2))' }, { run: '(envremove null "x")', expect: "'()" }],
    explain: 'Remove EVERY occurrence: shadowing means a name can appear several times. Then `letinstead` (rename a variable and hide the old name) needs envremove, so it cannot be a macro: no MUPL construct can evaluate something in an environment with FEWER bindings. `letalso` can be a macro: `(mlet vn (var vo) body)`.' },

  { id: 'i-mlet2', topic: 'interp', type: 'write', src: 'Wi23 final Q4b',
    q: 'Add `(struct mlet2 (var1 e1 var2 e2 body))` with Racket **let** semantics (NOT let*): both e1 and e2 are evaluated in the ORIGINAL environment.',
    template: MUPL_TEMPLATE('(struct mlet2 (var1 e1 var2 e2 body) #:transparent)'),
    starter: `[(mlet2? e)
 ]`,
    answer: `[(mlet2? e)
 (let* ([v1 (eval-under-env (mlet2-e1 e) env)]
        [v2 (eval-under-env (mlet2-e2 e) env)]
        [newenv (cons (cons (mlet2-var1 e) v1) (cons (cons (mlet2-var2 e) v2) env))])
   (eval-under-env (mlet2-body e) newenv))]`,
    tests: [{ run: '(eval-exp (mlet "x" (int 1) (mlet2 "x" (int 10) "y" (var "x") (var "y"))))', expect: '(int 1)' }, { run: '(eval-exp (mlet2 "a" (int 2) "b" (int 3) (add (var "a") (var "b"))))', expect: '(int 5)' }],
    explain: 'For let* semantics you would evaluate e2 in `(cons (cons var1 v1) env)` instead, and then the first test would give (int 10).' },

  { id: 'i-length', topic: 'interp', type: 'write', src: 'Sp23 final Q4a',
    q: 'Fill in the blank so `(struct length (e))` computes the length of a MUPL list (munit or (apair v rest)).',
    template: MUPL_TEMPLATE('(struct length (e) #:transparent)'),
    starter: `[(length? e)
 (letrec ([f (lambda (v)
               (cond [(munit? v) 0]
                     [(apair? v) ___]
                     [#t (error "MUPL length not applied to a MUPL list")]))])
   (int (f (eval-under-env (length-e e) env))))]`,
    answer: `[(length? e)
 (letrec ([f (lambda (v)
               (cond [(munit? v) 0]
                     [(apair? v) (+ 1 (f (apair-e2 v)))]
                     [#t (error "MUPL length not applied to a MUPL list")]))])
   (int (f (eval-under-env (length-e e) env))))]`,
    tests: [{ run: '(eval-exp (length (apair (int 7) (apair (int 8) (munit)))))', expect: '(int 2)' }, { run: '(eval-exp (length (munit)))', expect: '(int 0)' }],
    explain: 'f works on Racket-level VALUES (already evaluated), so use apair-e2 directly. If you removed the `(int ...)` wrapper, the result would be a Racket number, and `(add (int 3) (length (munit)))` would fail with "MUPL addition applied to non-number".' },

  { id: 'i-len-bugs', topic: 'interp', type: 'explain', src: 'Sp23 final Q4d (bad code)',
    q: 'This MUPL length function has two bugs. Find them.',
    code: `(fun "len" "x"
     (ifnz (munit? (var "x"))
           (int 0)
           (add (int 1) (call (var "len") (second "x")))))`,
    answer: '1) `munit?` is the RACKET predicate (it would run now, on syntax, and return #f). Use the MUPL construct `(ismunit (var "x"))`. 2) `(second "x")` passes a raw string; it should be `(second (var "x"))`. If called on a non-list, you would expect the error "MUPL second applied to non-apair".',
    explain: 'Classic level confusion: Racket functions (munit?, apair-e1) run while you BUILD the expression, while MUPL constructs (ismunit, first) run when the interpreter EVALUATES it.' },

  { id: 'i-free', topic: 'interp', type: 'mcq', src: 'slides',
    q: 'What are the free variables of `(lambda (x) (+ y (let ([y z]) (+ y y))))`? (Ignore +.)',
    options: ['{}', '{z}', '{y, z}', '{x, y, z}'],
    answer: 2,
    explain: 'The FIRST y (outside the let) is free. Inside the let, y is bound, but its right-hand side `z` is free. x is a parameter.' },

  { id: 'i-free2', topic: 'interp', type: 'mcq', src: 'slides',
    q: 'Free variables of `(lambda (x) (let ([y 0]) (+ x y z)))`?',
    options: ['{z}', '{y, z}', '{x, y, z}', '{}'],
    answer: 0,
    explain: 'x is a parameter, y is bound by the let, and only z comes from outside. Similarly `(lambda (x y z) (+ x y z))` has no free variables, and `(lambda (x) (if x y z))` has {y, z}.' },

  { id: 'i-freewhy', topic: 'interp', type: 'mcq', src: 'slides',
    q: 'Why would an implementation compute a function\'s free variables?',
    options: ['To type-check it', 'So a closure can store a SMALLER environment containing only the bindings the body could possibly use. It is a static property, so it can be precomputed once before evaluation', 'To find infinite loops', 'Free variables are errors'],
    answer: 1,
    explain: 'Keeping the whole environment can waste space. A function body cannot use any variables other than its free ones.' },

  { id: 'i-closconv', topic: 'interp', type: 'mcq', src: 'slides',
    q: 'Closure conversion (compiling to a target like C, which has no closures) works by…',
    options: ['Interpreting instead', 'Giving every function an extra ENVIRONMENT argument, having calls pass the right environment, and looking up free variables through that argument', 'Inlining all functions', 'Using global variables'],
    answer: 1,
    explain: 'The environment-passing that the interpreter did for us gets woven into the compiled code.' },

  { id: 'i-lbimacro', topic: 'interp', type: 'predict', src: 'slides',
    q: 'LBI "macros" are Racket functions that build LBI syntax. What do these RETURN (before any evaluation)?',
    prelude: 'lbi',
    code: `(define (andalso e1 e2) (if-then-else e1 e2 (bool #f)))
(define (double e) (multiply e (const 2)))
(define (list-product es)
  (if (null? es) (const 1) (multiply (car es) (list-product (cdr es)))))`,
    parts: [{ ask: '(double (const 4))', a: '(multiply (const 4) (const 2))' }, { ask: '(list-product (list (const 2) (const 3)))', a: '(multiply (const 2) (multiply (const 3) (const 1)))' }, { ask: '(andalso (bool #t) (bool #f))', a: '(if-then-else (bool #t) (bool #f) (bool #f))' }],
    explain: 'They run in Racket (the metalanguage) BEFORE the LBI program is evaluated, which is exactly the "expand before run" idea of macros. The interpreter is unchanged. Downside: not hygienic.' },

  // ======================= STATIC vs DYNAMIC TYPING =======================
  { id: 't-defs', topic: 'typing', type: 'mcq', src: 'slides',
    q: 'A type system is meant to prevent bad thing X. It is SOUND if…',
    options: ['It never rejects a program that would not do X', 'It never ACCEPTS a program that, on some input, does X (no false negatives)', 'It always terminates', 'It accepts every program'],
    answer: 1,
    explain: 'Sound = no false negatives (never lets X through). Complete = no false positives (never rejects a program that would never do X). The usual goal is sound but not complete.' },

  { id: 't-complete', topic: 'typing', type: 'mcq', src: 'slides',
    q: 'OCaml rejects `let f2 x = if true then 0 else 4 / "hi"` even though it can never divide by a string. This shows that OCaml\'s type system is…',
    options: ['Unsound', 'Incomplete (a false positive)', 'Undecidable', 'Weakly typed'],
    answer: 1,
    explain: 'Rejecting a program that would never misbehave = incompleteness. Other examples from the slides: f1 is never called; `if x <= abs x ...`; `f5 (if true then 1 else "hi")`.' },

  { id: 't-undecidable', topic: 'typing', type: 'mcq', src: 'slides',
    q: 'Why can\'t we have a perfect type checker for "does this program ever divide by a string"?',
    options: ['Nobody has tried hard enough', 'It is undecidable: no checker can always terminate AND be sound AND be complete (if it could, you could solve the Halting problem: does `e; 4 / "hi"` divide by a string?)', 'Strings are dynamic', 'It is possible'],
    answer: 1,
    explain: 'A mathematical theorem. So static checking is necessarily approximate, and languages choose sound + terminating, giving up completeness.' },

  { id: 't-lion-b', topic: 'typing', type: 'mcq', src: 'Sp19 final Q5',
    q: 'EitherWay accepts a program if Lion OR Tiger accepts it. If both Lion and Tiger are sound, is EitherWay sound?',
    options: ['yes', 'no', 'maybe'],
    answer: 0,
    explain: 'Any accepted program was accepted by a sound system, so it cannot do X. (And WhyNotBoth, which accepts only if BOTH accept, is sound whenever at least one of them is sound.)' },

  { id: 't-lion-d', topic: 'typing', type: 'mcq', src: 'Sp19 final Q5',
    q: 'Lion is sound, Tiger is UNsound. Is EitherWay (accept if either accepts) sound?',
    options: ['yes', 'no', 'maybe'],
    answer: 1,
    explain: 'Tiger accepts some bad program, so EitherWay accepts it too. Both unsound: WhyNotBoth is "maybe" (their bad programs might not overlap), EitherWay is "no".' },

  { id: 't-lion-h', topic: 'typing', type: 'mcq', src: 'Sp19 final Q5',
    q: 'Lion is sound, Tiger is complete. Is EitherWay complete? Is WhyNotBoth complete?',
    options: ['EitherWay yes; WhyNotBoth no (Lion, being sound for a Turing-complete language, cannot be complete, and it rejects some good programs)', 'Both yes', 'Both no', 'EitherWay no; WhyNotBoth yes'],
    answer: 0,
    explain: 'Tiger alone already accepts every good program, so EitherWay does too. WhyNotBoth needs Lion to accept as well.' },

  { id: 't-au17', topic: 'typing', type: 'mcq', src: 'Au17 final Q6',
    q: 'OCaml\'s checker is sound, incomplete and always terminates. We change it to still terminate and accept MORE programs. Which outcome is IMPOSSIBLE?',
    options: ['Still sound, still not complete', 'No longer sound, still not complete', 'Still sound and now complete', 'No longer sound, now complete'],
    answer: 2,
    explain: 'Sound + complete + always terminating is impossible (undecidability). Unsound + complete is easy: just accept everything.' },

  { id: 't-wi23-add', topic: 'typing', type: 'mcq', src: 'Wi23 final Q5a',
    q: 'Add exactly ONE extra program to the set OCaml accepts. Which result is possible?',
    options: ['Sound and complete', 'Sound and still incomplete, e.g. by adding `if true then 34 else "hi"`', 'Unsound and complete', 'None of these'],
    answer: 1,
    explain: 'Adding a harmless program keeps it sound (still incomplete, since infinitely many harmless programs are still rejected). Adding a bad program like `3 + "hi"` makes it unsound and still incomplete. Complete is impossible either way.' },

  { id: 't-sp23-b', topic: 'typing', type: 'mcq', src: 'Sp23 final Q7b',
    q: 'Change OCaml so `[]` has type `int list` instead of `\'a list`. The type system is now…',
    options: ['Sound and incomplete', 'Unsound and incomplete', 'Sound and complete', 'Unsound and complete'],
    answer: 0,
    explain: 'It is more restrictive (rejects e.g. `"hi" :: []`), but nothing bad gets through: [] really can be used as an int list. Making a type system stricter can never break soundness.' },

  { id: 't-sp23-c', topic: 'typing', type: 'mcq', src: 'Sp23 final Q7c',
    q: 'Change OCaml so `[]` has type `string`. Now…',
    options: ['Sound and incomplete', 'Unsound and incomplete', 'Sound and complete', 'Unsound and complete'],
    answer: 1,
    explain: 'Unsound: `[] ^ "hi"` type-checks, but [] is not actually a string, so a primitive gets the wrong kind of value. Still incomplete, because `1 :: []` is now rejected.' },

  { id: 't-sp23-de', topic: 'typing', type: 'mcq', src: 'Sp23 final Q7d/e',
    q: 'Change only the EVALUATION rule so `17 :: []` produces `[24]` (types unchanged). And if it produced `["hi"]` instead?',
    options: ['[24]: still sound; ["hi"]: unsound (an int list now holds a string)', 'Both unsound', 'Both sound', '[24]: unsound; ["hi"]: sound'],
    answer: 0,
    explain: 'Soundness is about whether run-time values match the types the checker promised. [24] is still an int list; ["hi"] breaks the promise. Neither change makes the system complete.' },

  { id: 't-sp23-f', topic: 'typing', type: 'mcq', src: 'Sp23 final Q7f',
    q: 'Every expression that parses is given type `string`, so everything type-checks. The type system is…',
    options: ['Sound, not complete', 'Not sound, complete', 'Sound and complete', 'Neither'],
    answer: 1,
    explain: 'It never rejects anything, so it is complete (no false positives). It accepts `3 + "hi"`, so it is not sound.' },

  { id: 't-wi22', topic: 'typing', type: 'mcq', src: 'Wi22 final Q5',
    q: 'Allow a function expecting an n-tuple to be passed a LONGER tuple (the extra parts are evaluated, then dropped). Sound? Complete?',
    options: ['Sound, not complete', 'Not sound, not complete', 'Sound and complete', 'Not sound, complete'],
    answer: 0,
    explain: 'The function still gets exactly the components it expects, so it is sound. If instead missing components were filled with None, it would be UNSOUND, because the function might expect an int where it gets None.' },

  { id: 't-au18-rule', topic: 'typing', type: 'mcq', src: 'Au18 final Q5',
    q: 'OCaml\'s typing rule for `if e1 then e2 else e3` is…',
    options: ['e1 any type; result type of e2', 'e1 must be bool; e2 and e3 must have the SAME type t; the whole expression has type t', 'e2 and e3 can differ', 'e1 must be int'],
    answer: 1,
    explain: 'That is why `13 + (if true then 4 else "hi")` is rejected even though it is harmless. A sound extension: for `if true then e2 else e3`, use e2\'s type and ignore e3. That accepts more programs and stays sound, but is still incomplete.' },

  { id: 't-prevent', topic: 'typing', type: 'mcq', src: 'slides',
    q: 'Which can still happen in a well-typed OCaml program?',
    options: ['Adding a number to a string', 'Using an undefined variable', 'List.hd [] raising an exception, or division by zero', 'Calling an int as if it were a function'],
    answer: 2,
    explain: 'Types prevent primitive misuse, unbound variables and invariant violations. They do not prevent exceptions, out-of-bounds access, or division by zero, and no type system can tell that you swapped the branches of an if.' },

  { id: 't-weak', topic: 'typing', type: 'mcq', src: 'slides',
    q: '"Weak typing" (C/C++) really means…',
    options: ['Dynamic typing', 'Neither static nor dynamic checks are guaranteed: programs that pass the checker can do ANYTHING ("catch-fire semantics") when they go wrong', 'Few types', 'Type inference'],
    answer: 1,
    explain: 'Reasons: ease of implementation, performance, and the lower level (no array sizes stored). Racket is NOT weakly typed: it checks things dynamically and fails safely with an error.' },

  { id: 't-bigvariant', topic: 'typing', type: 'mcq', src: 'slides',
    q: 'From an OCaml programmer\'s view, Racket is like…',
    options: ['OCaml without functions', 'A language with ONE big variant type: every value carries a tag (42 is really Int 42), and primitives like + and car check tags and raise errors for the wrong constructor. Each struct adds a constructor', 'A weakly typed language', 'Java'],
    answer: 1,
    explain: 'And from a Racket view, OCaml is a "well-behaved subset" of Racket: it never needs number? checks, but it rejects some useful programs.' },

  { id: 't-primitive', topic: 'typing', type: 'mcq', src: 'slides',
    q: 'Whether `"foo" + "bar"` is allowed is a question of…',
    options: ['Static vs dynamic typing', 'The run-time semantics of the PRIMITIVE. You can allow or disallow it with either kind of checking', 'Soundness', 'Hygiene'],
    answer: 1,
    explain: 'A common misconception. The same goes for `arr[10]` on a 5-element array, or calling a function with the wrong number of arguments.' },

  { id: 't-claim1', topic: 'typing', type: 'mcq', src: 'slides',
    q: '"I can build a list of numbers and strings, or return a number OR a string, without making a variant type." This argues for…',
    options: ['Static typing', 'Dynamic typing'], answer: 1,
    explain: 'Claim 1A (dynamic is more convenient). The counter-claim 1B (static is more convenient): you can assume data has the right type, without number? checks cluttering the code.' },

  { id: 't-claim2', topic: 'typing', type: 'mcq', src: 'slides',
    q: '"Any sound static type system forbids some programs that do nothing wrong, e.g. (cons (g 7) (g #t))." This argues for…',
    options: ['Static typing', 'Dynamic typing'], answer: 1,
    explain: 'Claim 2A. The counter-claim 2B: static typing lets you add tags only where needed (variants), instead of paying for tags on every value.' },

  { id: 't-claim3', topic: 'typing', type: 'mcq', src: 'slides',
    q: '"Static typing only catches easy bugs. You still have to test, and testing finds the easy bugs too." This argues for…',
    options: ['Static typing', 'Dynamic typing'], answer: 1,
    explain: 'Claim 3B. Claim 3A (static) is that bugs are caught as soon as you compile, so you never need to test for them. Example: the curried pow called with the wrong arguments is caught statically, but writing + instead of * is not caught by either.' },

  { id: 't-claim4', topic: 'typing', type: 'mcq', src: 'slides',
    q: '"The implementation does not need to store or check tags." This argues that ___ is faster.',
    options: ['Static typing', 'Dynamic typing'], answer: 0,
    explain: 'Claim 4A. Claim 4B (dynamic): optimizers can remove many tag checks, e.g. in `(let ([x (+ y y)]) (* x 4))` x is known to be a number, and you do not have to code around the type system.' },

  { id: 't-claim6', topic: 'typing', type: 'mcq', src: 'slides',
    q: '"Early on I don\'t know all the cases yet, and I want to run incomplete programs without appeasing the type checker." This argues for ___ for prototyping.',
    options: ['Static typing', 'Dynamic typing'], answer: 1,
    explain: 'Claim 6A. Claim 6B (static): types document your evolving decisions, and stubs like `| _ -> raise Unimplemented` are easy.' },

  { id: 't-claim7', topic: 'typing', type: 'mcq', src: 'slides',
    q: '"When I change a function\'s type, the type checker gives me a TODO list of every caller that must change." This argues for ___ for evolution.',
    options: ['Static typing', 'Dynamic typing'], answer: 0,
    explain: 'Claim 7B. Claim 7A (dynamic): you can make code MORE permissive (take an int or a string) without touching old callers at all. Counter-argument to 7B: the TODO list is mandatory, so you cannot test part-way through.' },

  { id: 't-wi23-adv', topic: 'typing', type: 'mcq', src: 'Wi23 final Q5b',
    q: '"It can be easier to run tests on partially-written programs." Advantage of…',
    options: ['Static typing', 'Dynamic typing'], answer: 1,
    explain: 'Also dynamic: easier to change code to handle more cases without breaking clients. Static: easier to discover missing cases without testing, and easier to find all client code that must change.' },

  { id: 't-sortpair', topic: 'typing', type: 'explain', src: 'Sp17 final Q5',
    q: 'Racket `sort-pair` checks `(pair? p)`, `(number? (car p))`, `(number? (cdr p))` and errors otherwise. (a) Port it to OCaml with type int * int -> int * int. (b) How do you make `(sort-pair null)` return null in Racket? (c) Must existing Racket callers change? (d/e) In OCaml the type becomes (int*int) option -> (int*int) option. Must callers change?',
    answer: '(a) `let sort_pair (x,y) = if x >= y then (x,y) else (y,x)`, with all the dynamic checks removed because the type guarantees them. (b) Add `[(null? p) p]` as the first cond clause. (c) Definitely not: old callers never passed null. (e) Definitely: no old call type-checks any more, and the type checker lists them all for you.',
    explain: 'Exactly claims 7A and 7B (evolution) in action.' },

  { id: 't-eager', topic: 'typing', type: 'mcq', src: 'slides',
    q: 'Preventing `3 / 0`: static vs dynamic checking are points on a continuum. Which is the most EAGER option?',
    options: ['At run time, when the division happens', 'At link time', 'At keystroke time, in the editor', 'Return +inf.0 later'],
    answer: 2,
    explain: 'Keystroke → compile → link → run → "later" (return +inf.0). There is a tension: "catch a bug before it matters" vs "don\'t report a bug that might not matter".' },

  { id: 't-gradual', topic: 'typing', type: 'mcq', src: 'slides',
    q: 'Typed Racket is an example of…',
    options: ['Weak typing', 'Gradual typing: mixing static and dynamic checking in one language (still active research)', 'Hygiene', 'Closure conversion'],
    answer: 1,
    explain: '"Static vs dynamic" is too coarse a question. The better question is: what should we enforce statically?' }
  );
  P.tree = `(struct node (left num right) #:transparent)
(struct empty () #:transparent)`;
})();
