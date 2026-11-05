// Question bank part 2: thunks / streams / promises / memoization, and quote / eval / macros.
(function () {
  const P = (window.PRELUDES = window.PRELUDES || {});
  P.mult = `(define (my-mult x y-thunk) ; calls y-thunk x times
  (cond [(= x 0) 0]
        [(= x 1) (y-thunk)]
        [#t (+ (y-thunk) (my-mult (- x 1) y-thunk))]))`;
  P.promise = `(define (my-delay th) (mcons #f th))
(define (my-force p)
  (if (mcar p)
      (mcdr p)
      (begin (set-mcar! p #t)
             (set-mcdr! p ((mcdr p)))
             (mcdr p))))`;
  P.nats = `(define nats
  (letrec ([f (lambda (x) (cons x (lambda () (f (+ x 1)))))])
    (lambda () (f 0))))`;

  const Q = (window.QUESTIONS = window.QUESTIONS || []);
  Q.push(
  // ======================= THUNKS =======================
  { id: 'l-myif', topic: 'lazy', type: 'mcq', src: 'slides',
    q: 'Why does `(fact-wrong 5)` never finish?',
    code: `(define (my-if-wrong x y z) (if x y z))
(define (fact-wrong n)
  (my-if-wrong (= n 0) 1 (* n (fact-wrong (- n 1)))))`,
    options: ['my-if-wrong has the branches backwards', 'Function arguments are evaluated EAGERLY, before the call, so (* n (fact-wrong (- n 1))) is evaluated even when n = 0, recursing forever', 'if cannot be used inside a function', 'It finishes and returns 120'],
    answer: 1,
    explain: '`if` is a special form: it only evaluates the branch it chooses (lazy). A function cannot do that, because all its arguments are evaluated before it runs. So you cannot implement `if` as a function, unless the branches are wrapped in thunks.' },

  { id: 'l-myif-p', topic: 'lazy', type: 'predict', src: 'slides',
    q: 'Eager arguments vs lazy branches. Evaluate (write `error` if it fails):',
    code: `(define (my-if-wrong x y z) (if x y z))
(define (weird-if x y z) (if x (y) (z)))`,
    parts: [{ ask: "(if #t 'ok (/ 1 0))", a: "'ok" }, { ask: "(weird-if #t (lambda () 'ok) (lambda () (/ 1 0)))", a: "'ok" }, { ask: "(my-if-wrong #t 'ok (/ 1 0))", a: 'error', err: 'division by zero' }],
    explain: 'Wrapping each branch in `(lambda () ...)` delays it. weird-if then calls only the thunk it needs.' },

  { id: 'l-thunk-def', topic: 'lazy', type: 'mcq',
    q: 'What is a thunk?',
    options: ['A macro', 'A zero-argument function used only to DELAY a computation until it is called', 'A mutable pair', 'A function that memoizes'],
    answer: 1,
    explain: '`e` evaluates now. `(lambda () e)` delays e. `(th)` runs the delayed computation. No new language features are needed: it is just an idiom using lambda.' },

  { id: 'l-printlater', topic: 'lazy', type: 'predict', src: 'slides',
    q: 'Thunking changes WHEN side effects happen. What is printed, in order? (Type the full output.)',
    code: `(define (print-later) (lambda () (println "hello")))
(define f (print-later))
(println "before")`,
    parts: [{ ask: '(f)', a: '"before"\n"hello"', shows: '"before"\n"hello"' }, { ask: '(f)', a: '"hello"' }],
    explain: 'Defining f prints nothing: println is inside an un-called lambda. Each call `(f)` prints. (println returns void, so nothing extra is shown.)' },

  { id: 'l-perf', topic: 'lazy', type: 'mcq', src: 'slides',
    q: 'You thunk an expensive computation. When does that make the program SLOWER?',
    options: ['When the result is never needed', 'When the result is needed exactly once', 'When the result is needed more than once (the thunk recomputes it each time)', 'Never'],
    answer: 2,
    explain: 'Thunk: helps if used 0 times, no change if used once, hurts if used many times. Promises (memoized thunks) fix the "many times" case.' },

  { id: 'l-count', topic: 'lazy', type: 'predict', src: 'slides (my-mult)',
    q: 'How many times does `slow` actually run? Evaluate in order:',
    prelude: 'mult',
    code: `(define count 0)
(define (slow) (begin (set! count (+ count 1)) 7))`,
    parts: [{ ask: '(my-mult 5 slow)', a: '35' }, { ask: 'count', a: '5' }, { ask: '(my-mult 0 slow)', a: '0' }, { ask: 'count', a: '5' },
            { ask: '(my-mult 3 (let ([v (slow)]) (lambda () v)))', a: '21' }, { ask: 'count', a: '6' }, { ask: '(my-mult 0 (let ([v (slow)]) (lambda () v)))', a: '0' }, { ask: 'count', a: '7' }],
    explain: 'Passing `slow` itself: it runs once per use (5 times). The `let` version computes once EAGERLY, even when the result is never used (the last call still ran slow).' },

  { id: 'l-promise-count', topic: 'lazy', type: 'predict', src: 'slides (promises)',
    q: 'Now with a promise. Evaluate in order:',
    prelude: ['mult', 'promise'],
    code: `(define count 0)
(define (slow) (begin (set! count (+ count 1)) 7))`,
    parts: [{ ask: '(my-mult 4 (let ([p (my-delay slow)]) (lambda () (my-force p))))', a: '28' }, { ask: 'count', a: '1' },
            { ask: '(my-mult 0 (let ([p (my-delay slow)]) (lambda () (my-force p))))', a: '0' }, { ask: 'count', a: '1' }],
    explain: 'A promise is the best of both: never computed if unused (count stays 1), computed once and cached if used many times.' },

  { id: 'l-promise-state', topic: 'lazy', type: 'predict', src: 'slides',
    q: 'A promise is a mutable pair (computed? . thunk-or-value). Evaluate in order:',
    prelude: 'promise',
    code: `(define p (my-delay (lambda () (* 6 7))))`,
    parts: [{ ask: '(mcar p)', a: '#f' }, { ask: '(procedure? (mcdr p))', a: '#t' }, { ask: '(my-force p)', a: '42' }, { ask: 'p', a: '(mcons #t 42)' }, { ask: '(my-force p)', a: '42' }],
    explain: 'The first force runs the thunk, then OVERWRITES the cdr with the answer and sets the flag to #t. Later forces just return the cached cdr.' },

  { id: 'l-promise-bug', topic: 'lazy', type: 'explain', src: 'exam style',
    q: 'Someone "simplified" my-force. What breaks?',
    code: `(define (my-force p)
  (if (mcar p)
      (mcdr p)
      (begin (set-mcar! p #t)
             ((mcdr p)))))`,
    answer: 'It never caches the result: the cdr still holds the thunk. The first force returns the right value, but every later force returns the THUNK itself (since mcar is now #t and the cdr is the procedure), not the value. It needs `(set-mcdr! p ((mcdr p)))` and then `(mcdr p)`.',
    explain: 'Check each branch: what does the cdr hold AFTER this runs, and what does the next call return?' },

  // ======================= STREAMS =======================
  { id: 'l-stream-def', topic: 'lazy', type: 'mcq', src: 'slides',
    q: 'In this course a stream is…',
    options: ['A list built with mcons', 'A thunk that, when called, returns a pair whose car is the next value and whose cdr is a stream', 'A pair whose cdr is a thunk', 'A promise'],
    answer: 1,
    explain: 'The stream is the THUNK. `(s)` gives a pair; `(car (s))` is the first value; `(cdr (s))` is the rest of the stream (another thunk). So the second element is `(car ((cdr (s))))`.' },

  { id: 'l-stream-access', topic: 'lazy', type: 'predict', src: 'slides',
    q: 'Count the parens carefully. Evaluate:',
    prelude: 'nats',
    code: `(define ones (lambda () (cons 1 ones)))
(define powers-of-two
  (letrec ([f (lambda (x) (cons x (lambda () (f (* x 2)))))])
    (lambda () (f 1))))`,
    parts: [{ ask: '(car (ones))', a: '1' }, { ask: '(car ((cdr (nats))))', a: '1' }, { ask: '(car ((cdr ((cdr (powers-of-two))))))', a: '4' }, { ask: 'ones', a: '#<procedure:ones>' }, { ask: '(car ones)', a: 'error', err: 'car: contract violation' }],
    explain: 'A stream is a procedure, not a pair, so `(car ones)` fails. You must CALL it first: `(car (ones))`.' },

  { id: 'l-ones-wrong', topic: 'lazy', type: 'mcq', src: 'slides',
    q: 'Which definition of an infinite stream of 1s is CORRECT?',
    options: ['(define ones (cons 1 ones))', '(define ones (lambda () (cons 1 ones)))', '(define ones (lambda () (cons 1 (ones))))', '(define (ones) (lambda () (cons 1 (ones))))'],
    answer: 1,
    explain: 'A: uses ones before it is defined (error). B: correct (so is `(define (ones) (cons 1 ones))`). C: calling it loops forever, because the cdr calls ones immediately instead of delaying. D: double-thunk, since `(ones)` returns a lambda, not a pair.' },

  { id: 'l-ones-wrong-p', topic: 'lazy', type: 'predict', src: 'slides',
    q: 'What goes wrong with each? (error / loops forever)',
    code: `(define (dbl-thunk) (lambda () (cons 1 (dbl-thunk))))`,
    parts: [{ ask: '(procedure? (dbl-thunk))', a: '#t' }, { ask: '(car (dbl-thunk))', a: 'error', err: 'car: contract violation' }],
    explain: 'Calling the stream returns ANOTHER procedure instead of a pair. Thunk exactly once, around the rest of the stream.' },

  { id: 'l-numuntil', topic: 'lazy', type: 'predict', src: 'slides',
    q: 'Stream consumers.',
    prelude: ['take', 'nats'],
    code: `(define (number-until pred? s)
  (let ([p (s)])
    (if (pred? (car p)) 0 (+ 1 (number-until pred? (cdr p))))))
(define powers-of-two
  (letrec ([f (lambda (x) (cons x (lambda () (f (* x 2)))))])
    (lambda () (f 1))))`,
    parts: [{ ask: '(take-stream 5 nats)', a: "'(0 1 2 3 4)" }, { ask: '(number-until (lambda (x) (> x 50)) nats)', a: '51' }, { ask: '(number-until (lambda (x) (> x 50)) powers-of-two)', a: '6' }],
    explain: 'number-until counts elements BEFORE the first one satisfying pred?. For powers of two: 1, 2, 4, 8, 16, 32 (6 of them), then 64 > 50.' },

  { id: 'l-mystery-stream', topic: 'lazy', type: 'predict', src: 'Wi22 final Q3',
    q: 'What are the first six elements of mystery-stream?',
    prelude: 'take',
    code: `(define (mystery-stream)
  (letrec ([f (lambda (i)
                (cons i
                      (lambda () (cons (number->string i)
                                       (lambda () (f (+ i 1)))))))])
    (f 1)))`,
    parts: [{ ask: '(take-stream 6 mystery-stream)', a: '\'(1 "1" 2 "2" 3 "3")' }],
    explain: 'Note `mystery-stream` is defined with function sugar, so it IS a thunk (zero-argument function) returning a pair. Each number is followed by its string version.' },

  { id: 'l-filter-stream', topic: 'lazy', type: 'write', src: 'Wi22 final Q3b',
    q: 'Write `filter-stream`: takes a function f and a stream s, and returns a stream of the elements of s for which f is not #f.',
    prelude: ['take', 'nats'],
    starter: `(define (filter-stream f s)
  )`,
    answer: `(define (filter-stream f s)
  (lambda ()
    (let ([pr (s)])
      (if (f (car pr))
          (cons (car pr) (filter-stream f (cdr pr)))
          ((filter-stream f (cdr pr)))))))`,
    tests: [{ run: '(take-stream 4 (filter-stream even? nats))', expect: "'(0 2 4 6)" }, { run: '(take-stream 3 (filter-stream (lambda (x) (> x 10)) nats))', expect: "'(11 12 13)" }],
    explain: 'The tricky part is the skip case: `(filter-stream f (cdr pr))` is a STREAM (thunk), but here we need a PAIR, so call it with an extra pair of parens.' },

  { id: 'l-map-orig', topic: 'lazy', type: 'predict', src: 'Wi22 final Q3e',
    q: 'map-with-original pairs each element with f of it. First six elements?',
    prelude: 'take',
    code: `(define (mystery-stream)
  (letrec ([f (lambda (i) (cons i (lambda () (cons (number->string i) (lambda () (f (+ i 1)))))))])
    (f 1)))
(define (map-with-original f s)
  (lambda ()
    (let ([pr (s)])
      (cons (cons (car pr) (f (car pr)))
            (map-with-original f (cdr pr))))))`,
    parts: [{ ask: '(take-stream 6 (map-with-original number? mystery-stream))', a: '\'((1 . #t) ("1" . #f) (2 . #t) ("2" . #f) (3 . #t) ("3" . #f))' }],
    explain: 'Each element becomes a pair (element . (number? element)).' },

  { id: 'l-endable', topic: 'lazy', type: 'predict', src: 'Au18 final Q3b',
    q: 'Endable streams may return #f to mean "no more elements". Evaluate (`loops forever` if it never ends):',
    code: `(define (sum-until-non-number-or-end es)
  (let ([p (es)])
    (if (or (not p) (not (number? (car p))))
        0
        (+ (car p) (sum-until-non-number-or-end (cdr p))))))
(define (stream->endable-stream stop? s)
  (lambda ()
    (let ([p (s)])
      (if (stop? (car p))
          #f
          (cons (car p) (stream->endable-stream stop? (cdr p)))))))
(define (s-help i) (cons i (lambda () (s-help (* 2 i)))))
(define s (lambda () (s-help 1)))`,
    parts: [{ ask: '(sum-until-non-number-or-end (stream->endable-stream (lambda (y) (> y 10)) s))', a: '15' },
            { ask: '(sum-until-non-number-or-end (stream->endable-stream (lambda (y) (> y 0)) s))', a: '0' },
            { ask: '(sum-until-non-number-or-end (stream->endable-stream (lambda (y) #f) s))', a: 'loops forever', nonterm: true }],
    explain: 'i: 1+2+4+8 = 15 (16 > 10 stops it). ii: 1 > 0 stops immediately, so 0. iii: it never stops and the numbers keep doubling, so the recursion never ends.' },

  { id: 'l-count-until', topic: 'lazy', type: 'write', src: 'Sp19 final Q3a',
    q: 'Write `count-until-total-is-more`: given a stream s of non-negative numbers and a number limit, return the minimum number of elements whose sum is strictly greater than limit. No helpers. Hint: the base case is when limit is negative.',
    prelude: 'nats',
    starter: `(define (count-until-total-is-more s limit)
  )`,
    answer: `(define (count-until-total-is-more s limit)
  (if (< limit 0)
      0
      (let ([pr (s)])
        (+ 1 (count-until-total-is-more (cdr pr) (- limit (car pr)))))))`,
    tests: [{ run: '(count-until-total-is-more (cdr (nats)) 6)', expect: '4' }, { run: '(count-until-total-is-more nats 0)', expect: '2' }],
    explain: '`(cdr (nats))` is the stream 1, 2, 3, ...; 1+2+3 = 6 is not > 6, but 1+2+3+4 = 10 is, so the answer is 4. Subtract each element from limit as you go.' },

  { id: 'l-every-third', topic: 'lazy', type: 'write', src: 'Sp19 final Q3b',
    q: 'Write `every-third`, returning a stream of every 3rd element of s (for 1, 2, 3, ... it gives 3, 6, 9, ...). No recursive helpers.',
    prelude: ['take', 'nats'],
    starter: `(define (every-third s)
  )`,
    answer: `(define (every-third s)
  (lambda ()
    (let ([third-pr ((cdr ((cdr (s)))))])
      (cons (car third-pr) (every-third (cdr third-pr))))))`,
    tests: [{ run: '(take-stream 4 (every-third nats))', expect: "'(2 5 8 11)" }],
    explain: '`(s)` is pair 1, `((cdr (s)))` is pair 2, `((cdr ((cdr (s)))))` is pair 3. Then recurse on the rest after the third.' },

  { id: 'l-wi23-stream', topic: 'lazy', type: 'predict', src: 'Wi23 final Q3d',
    q: 's is 0, 1, 2, .... What are the first 10 elements of `(keep-larger-stream (alternate-with-k 5 s))`?',
    prelude: ['take', 'nats'],
    code: `(define (keep-larger-stream s)
  (lambda ()
    (let* ([pr1 (s)] [pr2 ((cdr pr1))])
      (cons (max (car pr1) (car pr2)) (keep-larger-stream (cdr pr2))))))
(define (alternate-with-k k s)
  (lambda ()
    (cons k (lambda ()
              (let ([pr (s)])
                (cons (car pr) (alternate-with-k k (cdr pr))))))))`,
    parts: [{ ask: '(take-stream 10 (keep-larger-stream (alternate-with-k 5 nats)))', a: "'(5 5 5 5 5 5 6 7 8 9)" }],
    explain: 'alternate gives 5,0,5,1,5,2,... Taking max of each pair: (5,0)→5 … (5,5)→5, (5,6)→6, (5,7)→7, ...' },

  { id: 'l-upfrom', topic: 'lazy', type: 'write', src: 'Sp23 final Q3a',
    q: 'Write `up-from`: given n, return the stream n, n+1, n+2, .... (2 lines)',
    prelude: 'take',
    starter: `(define (up-from n)
  )`,
    answer: `(define (up-from n)
  (lambda () (cons n (up-from (+ n 1)))))`,
    tests: [{ run: '(take-stream 3 (up-from 7))', expect: "'(7 8 9)" }],
    explain: 'The recursive call is not a call that runs right away: `(up-from (+ n 1))` just builds the next thunk. That is why it does not loop.' },

  { id: 'l-cycle', topic: 'lazy', type: 'predict', src: 'Sp23 final Q3c',
    q: 'First six elements of `(mystery 3)`?',
    prelude: 'take',
    code: `(define (up-from n) (lambda () (cons n (up-from (+ n 1)))))
(define (down-from-cycle n)
  (letrec ([f (lambda (m)
                (lambda ()
                  (if (= m 0)
                      (cons 0 (down-from-cycle n))
                      (cons m (f (- m 1))))))])
    (f n)))
(define (mystery n)
  (letrec ([f (lambda (s1 s2)
                (let ([pr1 (s1)] [pr2 (s2)])
                  (cons (cons (car pr1) (car pr2))
                        (lambda () (f (cdr pr1) (cdr pr2))))))])
    (lambda () (f (up-from n) (down-from-cycle n)))))`,
    parts: [{ ask: '(take-stream 6 (mystery 3))', a: "'((3 . 3) (4 . 2) (5 . 1) (6 . 0) (7 . 3) (8 . 2))" }],
    explain: 'mystery zips two streams: 3, 4, 5, ... with 3, 2, 1, 0, 3, 2, ...' },

  { id: 'l-n-at-once', topic: 'lazy', type: 'predict', src: 'Sp17 final Q3',
    q: 'n-at-once returns (list of first n . rest-of-stream). Evaluate:',
    code: `(define (n-at-once s n)
  (if (= n 0)
      (cons null s)
      (let* ([pr (s)]
             [r (n-at-once (cdr pr) (- n 1))])
        (cons (cons (car pr) (car r)) (cdr r)))))
(define (f i) (lambda () (cons i (f (+ i 1)))))`,
    parts: [{ ask: '(car (n-at-once (f 7) 4))', a: "'(7 8 9 10)" }, { ask: '(car ((cdr (n-at-once (f 7) 4))))', a: '11' }],
    explain: 'The cdr of the result is the remaining stream, so calling it gives the pair starting at 11.' },

  { id: 'l-inftree', topic: 'lazy', type: 'predict', src: 'Au17 final Q3',
    q: 'Infinite trees: a thunk returning a struct whose children are infinite trees.',
    code: `(struct inftree (left-th root right-th))
(define (doubling-tree x)
  (lambda () (inftree (doubling-tree (* x 2)) x (doubling-tree (+ (* x 2) 1)))))
(define (sum-to-depth i t)
  (if (= i 0)
      0
      (let ([trip (t)])
        (+ (inftree-root trip)
           (sum-to-depth (- i 1) (inftree-left-th trip))
           (sum-to-depth (- i 1) (inftree-right-th trip))))))`,
    parts: [{ ask: '(sum-to-depth 1 (doubling-tree 1))', a: '1' }, { ask: '(sum-to-depth 3 (doubling-tree 1))', a: '28' }],
    explain: 'Depth 3 holds 1; 2, 3; 4, 5, 6, 7, and those sum to 28. The same thunk idea as streams, just with two "rest" thunks instead of one.' },

  { id: 'l-stream-bug', topic: 'lazy', type: 'explain', src: 'exam style',
    q: 'This is supposed to be the stream 2, 6, 18, 54, .... Calling `(s)` never returns. Find and fix the bug.',
    code: `(define s
  (letrec ([f (lambda (x) (cons x (f (* x 3))))])
    (lambda () (f 2))))`,
    answer: 'The cdr is `(f (* x 3))`, which is an immediate recursive call, so f recurses forever. The rest of the stream must be DELAYED in a thunk: `(cons x (lambda () (f (* x 3))))`.',
    explain: 'The key gotcha: thunk in exactly the right place, around the recursive rest.' },

  // ======================= MEMOIZATION =======================
  { id: 'l-memo-count', topic: 'lazy', type: 'predict',
    q: 'A memoized function keeps a cache in a closure. Evaluate in order:',
    code: `(define calls 0)
(define memo-sq
  (let ([memo null])
    (lambda (x)
      (let ([ans (assoc x memo)])
        (if ans
            (cdr ans)
            (begin (set! calls (+ calls 1))
                   (let ([r (* x x)])
                     (set! memo (cons (cons x r) memo))
                     r)))))))`,
    parts: [{ ask: '(memo-sq 3)', a: '9' }, { ask: '(memo-sq 4)', a: '16' }, { ask: '(memo-sq 3)', a: '9' }, { ask: 'calls', a: '2' }, { ask: "(assoc 4 (list (cons 3 9) (cons 4 16)))", a: "'(4 . 16)" }, { ask: "(assoc 5 (list (cons 3 9)))", a: '#f' }],
    explain: '`assoc` returns the whole (key . value) pair, or #f, which is why the code takes `(cdr ans)`. The third call is a cache hit, so calls stays at 2.' },

  { id: 'l-memo-where', topic: 'lazy', type: 'mcq', src: 'slides (fibonacci3)',
    q: 'fibonacci3 is `(define fibonacci3 (letrec ([memo null] [f (lambda (x) ...)]) f))`. What if it were written `(define (fibonacci3 x) (letrec ([memo null] [f ...]) (f x)))` instead?',
    options: ['Exactly the same', 'Each call to fibonacci3 would start with an EMPTY table, so results are not reused between separate calls (one call is still fast, because f shares the table during its own recursion)', 'It would be exponential', 'It would not compile'],
    answer: 1,
    explain: 'Where the `memo` binding lives decides how long the cache lives. Outside the lambda, it is shared by every call.' },

  { id: 'l-memo-when', topic: 'lazy', type: 'mcq', src: 'slides',
    q: 'Memoization is only correct/worthwhile when…',
    options: ['The function has side effects', 'The function has no side effects and does not read mutable memory, AND keeping the cache is cheaper than recomputing, AND results get reused', 'The function is tail recursive', 'The arguments are strings'],
    answer: 1,
    explain: 'If the function were impure, skipping a call would change behaviour. For recursive functions like fibonacci, memoization turns exponential time into linear time (dynamic programming).' },

  // ======================= QUOTE / EVAL =======================
  { id: 'm-quote', topic: 'macros', type: 'predict', src: 'slides',
    q: 'Code is data. Evaluate:',
    code: `(define x #t) (define y 1) (define z 2)`,
    parts: [{ ask: '(if x y z)', a: '1' }, { ask: "'(if x y z)", a: "'(if x y z)" }, { ask: "(car '(if x y z))", a: "'if" }, { ask: "(length '(if (+ 1 2) 3))", a: '3' }, { ask: "(equal? 1 '1)", a: '#t' }, { ask: "(symbol? (cadr '(foo bar)))", a: '#t' }],
    explain: 'Quoting stops evaluation: you get a list of symbols. `(+ 1 2)` inside the quote is just a 3-element list. A quoted number is the same number.' },

  { id: 'm-qq', topic: 'macros', type: 'predict', src: 'slides',
    q: 'Quasiquote ` with unquote , evaluates only the unquoted parts.',
    code: ``,
    parts: [{ ask: "`(if (+ 1 2))", a: "'(if (+ 1 2))" }, { ask: "`(if ,(+ 1 2))", a: "'(if 3)" }, { ask: "'(if ,(+ 1 2))", a: "'(if ,(+ 1 2))" }, { ask: "`(1 ,(* 2 3) x)", a: "'(1 6 x)" }],
    explain: 'Unquote only works inside a QUASIquote (backtick). Inside a normal quote it is just more data.' },

  { id: 'm-eval', topic: 'macros', type: 'predict', src: 'slides',
    q: 'eval turns data back into code.',
    code: `(define expr '(1 + 2))
(define reorder (list (cadr expr) (car expr) (caddr expr)))`,
    parts: [{ ask: 'reorder', a: "'(+ 1 2)" }, { ask: '(eval reorder)', a: '3' }, { ask: '(eval expr)', a: 'error', err: 'not a procedure' }],
    explain: '`(eval \'(1 + 2))` tries to call 1 as a function. Rearranging the list into prefix form fixes it: "quote + eval = metaprogramming". (Note: `(define expr (1 + 2))` without the quote would fail immediately.)' },

  { id: 'm-symbols', topic: 'macros', type: 'mcq', src: 'slides',
    q: 'What are symbols like `\'foo`?',
    options: ['Strings', 'Variables', 'Interned strings: immutable, only one copy each, so they compare quickly with eq?', 'Macros'],
    answer: 2,
    explain: 'Each symbol is basically a unique integer id behind the scenes, so `(eq? \'a \'a)` is #t and very fast. That is why the list-based variants use `(eq? (car x) \'Add)`.' },

  // ======================= C PREPROCESSOR =======================
  { id: 'm-cpp1', topic: 'macros', type: 'mcq', src: 'slides',
    q: 'C: `#define POW2_BAD(x) x*x`. What does `POW2_BAD(9 + 1)` evaluate to?',
    options: ['100', '19', '82', 'Compile error'],
    answer: 1,
    explain: 'Plain search and replace: `9 + 1*9 + 1` = 19. The fix is to parenthesise everything: `((x)*(x))`. Racket macros never have this problem, because the parentheses ARE the tree structure.' },

  { id: 'm-cpp2', topic: 'macros', type: 'mcq', src: 'slides',
    q: 'C: `#define ADD(x, y) x + y`. What is `ADD(1, 2 * 3) * 4`?',
    options: ['28', '25', '36', '10'],
    answer: 1,
    explain: 'It expands to `1 + 2 * 3 * 4` = 1 + 24 = 25, not (1 + 6) * 4 = 28. This is the associativity problem.' },

  { id: 'm-cpp3', topic: 'macros', type: 'mcq', src: 'slides',
    q: 'C: `int a = 4; #define BAD_INCR(x) { int a = 0; x += 1; }` then `BAD_INCR(a); printf("%d", a);` prints?',
    options: ['5', '4', '1', '0'],
    answer: 1,
    explain: 'It expands to `{ int a = 0; a += 1; }`: the macro\'s local `a` CAPTURES the caller\'s `a`, so the outer a stays 4. This is the unhygienic shadowing problem that Racket\'s hygienic macros solve.' },

  // ======================= MACROS =======================
  { id: 'm-when', topic: 'macros', type: 'mcq', src: 'slides',
    q: 'When does macro expansion happen?',
    options: ['Every time the macro is called at run time', 'Before the program runs (at compile/expansion time), rewriting syntax even inside function bodies', 'Only in the REPL', 'After evaluation'],
    answer: 1,
    explain: 'A macro is a function from SYNTAX to SYNTAX. Once a macro is defined, its name is a special form, not a function.' },

  { id: 'm-myif', topic: 'macros', type: 'predict', src: 'slides',
    q: 'Macros with keywords.',
    code: `(define-syntax my-if
  (syntax-rules (then else)
    [(my-if e1 then e2 else e3) (if e1 e2 e3)]))
(define-syntax comment-out
  (syntax-rules ()
    [(comment-out ignore instead) instead]))`,
    parts: [{ ask: '(my-if #t then 7 else 14)', a: '7' }, { ask: '(my-if #f then (car null) else 14)', a: '14' }, { ask: '(comment-out (car null) #f)', a: '#f' }],
    explain: 'my-if expands to a real `if`, so the unused branch never runs (no `(car null)` error). A FUNCTION version would evaluate every argument first and crash.' },

  { id: 'm-myif-bad', topic: 'macros', type: 'mcq', src: 'slides',
    q: 'With my-if defined as above, what does `(my-if #t then 7 then 9)` give?',
    options: ['7', '9', 'my-if: bad syntax', 'then: unbound identifier'],
    answer: 2,
    explain: '`then` and `else` are literals in syntax-rules, so the pattern only matches when they appear exactly. Keywords are scoped to the macro, and misuse is a syntax error.' },

  { id: 'm-dbl', topic: 'macros', type: 'predict', src: 'slides',
    q: 'Macros copy syntax. Type the FULL output (prints and value).',
    code: `(define-syntax dbl
  (syntax-rules ()
    [(dbl x) (+ x x)]))
(define-syntax dbl2
  (syntax-rules ()
    [(dbl2 x) (* 2 x)]))`,
    parts: [{ ask: '(dbl (begin (println "Yo!") 42))', a: '"Yo!"\n"Yo!"\n84', shows: '"Yo!"\n"Yo!"\n84' }, { ask: '(dbl2 (begin (println "Yo!") 42))', a: '"Yo!"\n84', shows: '"Yo!"\n84' }],
    explain: 'dbl pastes the argument TWICE, so its side effect happens twice. As functions these two would be equivalent; as macros they are not. Fix: `[(dbl x) (let ([y x]) (+ y y))]`.' },

  { id: 'm-take', topic: 'macros', type: 'predict', src: 'slides',
    q: 'Evaluation-order gotcha. Full output?',
    code: `(define-syntax take
  (syntax-rules (from)
    [(take e1 from e2) (- e2 e1)]))`,
    parts: [{ ask: '(take (begin (print "a") 1) from (begin (print "b") 10))', a: '"b""a"9', shows: '"b""a"9' }],
    explain: 'The expansion is `(- e2 e1)`, so e2 runs first. Fix: `(let ([v1 e1] [v2 e2]) (- v2 v1))` to keep left-to-right order.' },

  { id: 'm-hyg1', topic: 'macros', type: 'predict', src: 'slides',
    q: 'Hygiene: the macro\'s local y does not capture the caller\'s y.',
    code: `(define-syntax dbl
  (syntax-rules ()
    [(dbl x) (let ([y 1]) (* 2 x y))]))
(define-syntax dbl2
  (syntax-rules ()
    [(dbl2 x) (* 2 x)]))`,
    parts: [{ ask: '(let ([y 7]) (dbl y))', a: '14' }, { ask: '(let ([* +]) (dbl2 42))', a: '84' }],
    explain: 'A naive (C-style) expansion would give `(let ([y 7]) (let ([y 1]) (* 2 y y)))` = 2, and `(let ([* +]) (* 2 42))` = 44. Racket renames the macro\'s own locals, and looks up free names like `*` where the MACRO was defined (lexical scope for macros).' },

  { id: 'm-hyg-mcq', topic: 'macros', type: 'mcq', src: 'slides',
    q: 'Which two things does hygiene guarantee?',
    options: ['Macros run faster and use less memory', 'Local variables the macro introduces are renamed (so they cannot capture the user\'s variables), and free identifiers in the template are looked up where the macro was DEFINED', 'Macros cannot use let', 'Arguments are evaluated exactly once'],
    answer: 1,
    explain: 'Hygiene does NOT stop repeated evaluation (dbl still prints twice) or fix evaluation order. Those are your job.' },

  { id: 'm-swap', topic: 'macros', type: 'predict',
    q: 'A swap! macro uses a temporary called tmp. What if the user ALSO has a variable called tmp?',
    code: `(define-syntax swap!
  (syntax-rules ()
    [(swap! a b) (let ([tmp a]) (set! a b) (set! b tmp))]))`,
    parts: [{ ask: '(let ([x 1] [y 2]) (swap! x y) (list x y))', a: "'(2 1)" }, { ask: '(let ([tmp 1] [y 2]) (swap! tmp y) (list tmp y))', a: "'(2 1)" }],
    explain: 'Thanks to hygiene, the macro\'s tmp is a DIFFERENT variable from the user\'s tmp, so it still works. In C this would silently break.' },

  { id: 'm-sp17', topic: 'macros', type: 'predict', src: 'Sp17 final Q2',
    q: 'Functions, closures and a macro, all after a set!. Give a, b and c.',
    code: `(define x 7)
(define fa (lambda (x) (let ([y (+ x 1)]) (+ y x))))
(define fb (let ([y (+ x 1)]) (lambda (x) (+ y x))))
(define-syntax fc
  (syntax-rules ()
    [(fc y) (+ x y 1)]))
(set! x 15)
(define a (fa 4))
(define b (fb 4))
(define c (fc 4))`,
    parts: [{ ask: 'a', a: '9' }, { ask: 'b', a: '12' }, { ask: 'c', a: '20' }],
    explain: 'fa: its parameter x = 4, y = 5, so 9. fb: y was computed ONCE at definition time using x = 7, so y = 8 and 8 + 4 = 12. fc expands to `(+ x 4 1)` where x is the top-level x, which is now 15, so 20.' },

  { id: 'm-for', topic: 'macros', type: 'mcq', src: 'slides',
    q: 'Why does the `for` macro bind `[l lo] [h hi]` with a let instead of using lo and hi directly in the loop?',
    code: `(define-syntax for
  (syntax-rules (to do)
    [(for lo to hi do body)
     (let ([l lo] [h hi])
       (letrec ([loop (lambda (it)
                        (if (> it h) #t (begin body (loop (+ it 1)))))])
         (loop l)))]))`,
    options: ['Style only', 'So lo and hi are evaluated exactly ONCE (if hi had side effects or was slow, using it in the test would re-run it every iteration), while body is purposely re-evaluated each iteration', 'Hygiene requires it', 'So that it is a let*'],
    answer: 1,
    explain: '"Think about whether you really want the macro to evaluate something more than once. If not, use a local binding."' },

  { id: 'm-for-p', topic: 'macros', type: 'predict', src: 'slides',
    q: 'Full output?',
    code: `(define-syntax for
  (syntax-rules (to do)
    [(for lo to hi do body)
     (let ([l lo] [h hi])
       (letrec ([loop (lambda (it)
                        (if (> it h) #t (begin body (loop (+ it 1)))))])
         (loop l)))]))`,
    parts: [{ ask: '(for 1 to 3 do (print "hi!"))', a: '"hi!""hi!""hi!"#t', shows: '"hi!""hi!""hi!"#t' }, { ask: '(for 5 to 1 do (print "x"))', a: '#t' }],
    explain: 'The loop returns #t when done. print does not add a newline, so the value follows straight after.' },

  { id: 'm-mylet', topic: 'macros', type: 'predict', src: 'slides',
    q: 'Recursive macros and `...`.',
    code: `(define-syntax my-let*
  (syntax-rules ()
    [(my-let* () body) body]
    [(my-let* ([var0 val0] [var-rest val-rest] ...) body)
     (let ([var0 val0])
       (my-let* ([var-rest val-rest] ...) body))]))
(define-syntax let2
  (syntax-rules ()
    [(let2 () body) body]
    [(let2 (var val) body) (let ([var val]) body)]
    [(let2 (var1 val1 var2 val2) body)
     (let ([var1 val1]) (let ([var2 val2]) body))]))`,
    parts: [{ ask: '(my-let* ([a 1] [b (+ a 1)] [c (* b 10)]) (list a b c))', a: "'(1 2 20)" }, { ask: '(let2 (a 5 b (+ a 2)) (cons a b))', a: "'(5 . 7)" }],
    explain: 'my-let* expands one binding at a time into nested lets, which is exactly why let* is "sugar for nested lets". `...` matches zero or more repetitions.' },

  { id: 'm-macro-or-fn', topic: 'macros', type: 'mcq', src: 'slides',
    q: 'Which of these genuinely NEEDS to be a macro (could not be written as a function)?',
    options: ['my-force (look at the promise and maybe compute it)', 'dbl (double a number)', 'my-delay, so users can write (my-delay e) with no lambda and e is not evaluated yet', 'max-of-list'],
    answer: 2,
    explain: 'Rule of thumb: only use a macro when a function cannot do it. my-delay must stop its argument being evaluated, and only a macro can do that. A my-force macro would bind `(let ([x e]) ...)`, evaluating e once, which is exactly what a function does anyway, so there is no benefit.' },

  { id: 'm-delay-macro', topic: 'macros', type: 'mcq', src: 'slides',
    q: 'my-delay is now a macro: `[(my-delay e) (mcons #f (lambda () e))]`. A client still writes `(my-delay (lambda () (slow)))`. What happens when it is forced?',
    options: ['Works the same', 'Double thunk: forcing returns the inner lambda (a procedure) instead of the result of slow', 'Error at expansion', 'slow runs twice'],
    answer: 1,
    explain: 'Changing my-delay into a macro changes how clients must USE it: they must no longer write the thunk themselves, because the macro already adds one.' },

  { id: 'm-token', topic: 'macros', type: 'mcq', src: 'slides',
    q: 'A Racket macro rewrites `head` into `car`. What happens to `(+ headt 7)` and `head-door`?',
    options: ['Both get rewritten', 'Neither changes: macros work on TOKENS, and headt and head-door are single tokens in Racket', 'Only head-door changes', 'Syntax error'],
    answer: 1,
    explain: 'Macros are not character search and replace. In C or OCaml, though, `head-door` is three tokens (head, -, door), so a C macro WOULD rewrite it.' },

  { id: 'm-write-unless', topic: 'macros', type: 'write',
    q: 'Write a macro `my-unless` such that `(my-unless c e)` evaluates e only when c is #f, and returns #f otherwise. (1–3 lines)',
    starter: `(define-syntax my-unless
  (syntax-rules ()
    [___ ___]))`,
    answer: `(define-syntax my-unless
  (syntax-rules ()
    [(my-unless c e) (if c #f e)]))`,
    tests: [{ run: "(my-unless #f 'ran)", expect: "'ran" }, { run: '(my-unless #t (car null))', expect: '#f' }],
    explain: 'It must be a macro: as a function, `(car null)` would be evaluated before the call and crash.' },

  { id: 'm-write-or2', topic: 'macros', type: 'write',
    q: 'Write `my-or2` so `(my-or2 e1 e2)` returns e1\'s value if it is not #f, else e2\'s value, evaluating e1 only ONCE. (Watch: `(if e1 e1 e2)` evaluates e1 twice!)',
    starter: `(define-syntax my-or2
  (syntax-rules ()
    [(my-or2 e1 e2) ___]))`,
    answer: `(define-syntax my-or2
  (syntax-rules ()
    [(my-or2 e1 e2) (let ([t e1]) (if t t e2))]))`,
    tests: [{ run: '(my-or2 #f 5)', expect: '5' }, { run: '(my-or2 (begin (print "once") 3) 9)', expect: '"once"3' }, { run: '(let ([t 7]) (my-or2 #f t))', expect: '7' }],
    explain: 'The last test passes only because of hygiene: the user\'s t and the macro\'s t are different variables.' }
  );
})();
