// lessons.js: the learning content, one topic per slide deck.
// Markup used inside bodies (turned into live widgets by app.js):
//   <pre data-run>code</pre>          runnable + editable code   (add data-draw to also draw the result as boxes)
//   <div data-widget="name"></div>    a visualiser from viz.js   (e.g. "stepper:let-forms", "streams", "macro")
//   <div data-quiz="question-id"></div>  an inline check question from the question bank
//   <a data-map="node-id">text</a>    jump to that concept on the Connections map
(function () {
  window.TOPICS = [
  // =====================================================================
  { id: 'basics', icon: 'λ', title: 'Racket basics & parentheses', slides: 'racket-01-intro.pdf',
    blurb: 'Syntax as a tree, define/lambda, currying, lists, why parens matter, dynamic typing, cond and truthiness.',
    sections: [
    { id: 'big', title: 'The big picture', body: `
<p>Racket is a <b>functional</b> language from the LISP/Scheme family, like OCaml in many ways (closures, first-class functions, let expressions), with three big differences:</p>
<table class="cmp"><tr><th></th><th>OCaml</th><th>Racket</th></tr>
<tr><td>Typing</td><td>static (checked before running)</td><td><b>dynamic</b> (checked while running)</td></tr>
<tr><td>Syntax</td><td>lots of rules</td><td>(almost) only parentheses</td></tr>
<tr><td>Mutation</td><td>discouraged (refs)</td><td>available: <code>set!</code>, <code>mcons</code></td></tr>
<tr><td>Variants</td><td>datatypes + match</td><td><code>struct</code> + predicates</td></tr></table>
<p>Every file starts with <code>#lang racket</code> and is a <b>module</b>: a collection of definitions where forward references are allowed.</p>
<div class="callout key">🔑 Keep asking: <i>"When is this evaluated, and in which environment?"</i> That one question answers most exam questions in this unit (let forms, closures, thunks, macros, interpreters).</div>` },

    { id: 'syntax', title: 'Syntax = the tree (special forms vs calls)', body: `
<p>A Racket term is either an <b>atom</b> (<code>#t</code>, <code>17</code>, <code>"hi"</code>, <code>x</code>) or a <b>sequence in parentheses</b> <code>(t1 … tn)</code>. That's it.</p>
<ul><li>If <code>t1</code> is a <b>special form</b> keyword (<code>define</code>, <code>lambda</code>, <code>if</code>, <code>cond</code>, <code>let</code>…), something special to that form happens.</li>
<li>Otherwise it is a <b>function call</b>: evaluate <code>t1</code> and <b>all</b> the arguments, left to right, then call.</li></ul>
<div data-widget="ast"></div>
<div class="callout link">🔗 Because code is already a tree, "code is data": you can <a data-map="quote">quote</a> code into a list and rewrite it with <a data-map="macro">macros</a>. The same idea comes back when we write <a data-map="interp">interpreters</a> over ASTs.</div>
<div data-quiz="b-special"></div>` },

    { id: 'define', title: 'define, lambda, currying', body: `
<pre data-run>(define x 3)
(define cube (lambda (x) (* x x x)))   ; a function value bound to cube
(define (cube2 x) (* x x x))          ; sugar for the same thing
(define (pow x y)
  (if (= y 0) 1 (* x (pow x (- y 1)))))
(cube 3)
(pow 2 10)</pre>
<p><b>Currying</b> works in any language with closures. Racket has real multi-argument functions, so currying is less common, but you must know the parentheses:</p>
<pre data-run>(define pow2 (lambda (x) (lambda (y) (pow1 x y))))
(define ((pow2b x) y) (pow1 x y))   ; sugar: note the extra parens
(define (pow1 x y) (if (= y 0) 1 (* x (pow1 x (- y 1)))))
(define three-to-the (pow2 3))      ; a function waiting for y
(three-to-the 4)
((pow2 2) 4)                        ; need exactly these parens</pre>
<div data-quiz="b-curry"></div>` },

    { id: 'parens', title: 'Parentheses ALWAYS mean something', body: `
<p>In OCaml or maths, extra parentheses are harmless. In Racket, <code>(e)</code> means <b>call e with zero arguments</b>, and <code>((e))</code> means call e, then call the result. Every bug below is legal-looking code that fails differently. Run each one and read the real error message:</p>
<div data-widget="parens"></div>
<div class="callout trap">⚠️ <b>Exam trap:</b> some of these are <b>syntax errors</b> (fact-wrong2, fact-wrong3). They fail before ANYTHING runs, even if never called. The others are <b>run-time</b> errors that only happen if that code is reached, so <code>(fact-wrong5 0)</code> happily returns 1.</div>
<div data-quiz="b-fw5b"></div><div data-quiz="b-fw1b"></div>` },

    { id: 'lists', title: 'Lists: null, cons, car, cdr', body: `
<table class="cmp"><tr><th>Racket</th><th>OCaml</th><th>meaning</th></tr>
<tr><td><code>null</code> / <code>'()</code></td><td><code>[]</code></td><td>empty list</td></tr>
<tr><td><code>(cons x xs)</code></td><td><code>x :: xs</code></td><td>add to front</td></tr>
<tr><td><code>car</code> / <code>first</code></td><td><code>List.hd</code></td><td>first element</td></tr>
<tr><td><code>cdr</code> / <code>rest</code></td><td><code>List.tl</code></td><td>everything after the first</td></tr>
<tr><td><code>null?</code></td><td><code>= []</code></td><td>is it empty?</td></tr>
<tr><td><code>(list a b c)</code></td><td><code>[a; b; c]</code></td><td>build a list</td></tr></table>
<p>No pattern matching: the recursion skeleton is always <i>"if null, base case, else do something with car and recurse on cdr"</i>.</p>
<pre data-run data-draw>(define (my-map f xs)
  (if (null? xs)
      null
      (cons (f (car xs)) (my-map f (cdr xs)))))
(my-map (lambda (x) (* x 10)) (list 1 2 3))</pre>
<p>Combinations: <code>cadr</code> = car of cdr (2nd element), <code>cddr</code> = cdr of cdr, <code>caddr</code> = 3rd element. Read the letters <b>right to left</b>.</p>
<div data-quiz="b-whatdoes1"></div>` },

    { id: 'dynamic', title: 'Dynamic typing', body: `
<p>No static type checker, so values of any type can go anywhere and mistakes become <b>run-time errors</b> (like Python's TypeError). The upside is flexibility, e.g. lists nested to any depth with no datatype declaration:</p>
<pre data-run>(define (deep-sum xs)
  (cond [(null? xs) 0]
        [(number? (car xs)) (+ (car xs) (deep-sum (cdr xs)))]
        [#t (+ (deep-sum (car xs)) (deep-sum (cdr xs)))]))
(deep-sum (list 1 (list 2 (list 3 4)) 5))
(deep-sum (list 1 "oops"))</pre>
<p>Type <b>predicates</b> (<code>number?</code>, <code>string?</code>, <code>null?</code>, <code>pair?</code>, <code>list?</code>, <code>procedure?</code>) replace pattern matching.</p>
<div class="callout link">🔗 This is the whole topic of the last lecture: <a data-map="static">static vs dynamic typing</a>. Racket is not "weakly" typed: <code>(+ 1 "a")</code> is safely caught at run time.</div>
<div data-quiz="b-deepsum"></div>` },

    { id: 'cond', title: 'cond, brackets & truthiness', body: `
<p><code>cond</code> is a multi-way if, much better style than nested ifs: <code>(cond [test1 e1] [test2 e2] … [#t eN])</code>. The first true test wins; <code>#t</code> (or <code>else</code>) at the end is the catch-all.</p>
<p><code>[ ]</code> means the same as <code>( )</code>, but shapes must match. By convention brackets are used for cond clauses and let bindings.</p>
<p><b>Truthiness:</b> any value that is not <code>#f</code> counts as true, including <code>0</code>, <code>'()</code> and <code>""</code>.</p>
<pre data-run>(if 0 "0 is true" "0 is false")
(if '() "empty list is true" "false")
(define (count-falses xs)
  (cond [(null? xs) 0]
        [(car xs) (count-falses (cdr xs))]   ; any non-#f element counts as true
        [#t (+ 1 (count-falses (cdr xs)))]))
(count-falses (list #f 1 #f "x"))
(and 1 2 3)
(or #f 7)</pre>
<div data-quiz="b-truthy"></div>` },

    { id: 'reading', title: '🎯 Exam skill: reading unlabelled code', body: `
<p>The exam gives you code with bad names (<code>foo</code>, <code>sth</code>, <code>mystery</code>) and asks what it does, what it outputs, whether it fails, or how to fix it. Use this routine every time:</p>
<ol class="steps">
<li><b>Find the shape.</b> What are the base cases? What is the recursive call on (<code>cdr</code>? <code>cddr</code>? a smaller number?)</li>
<li><b>Trace a TINY input</b> (0, 1, 2 and 3 elements) on paper. Write each call on its own line.</li>
<li><b>Name it.</b> Describe what clients SEE in one sentence, not how it works.</li>
<li><b>Hunt edge cases:</b> empty list, one element, #f as an element, wrong types, a missing cond clause (returns void!).</li>
<li><b>Check the parens</b> on every call: is something called with the wrong number of arguments, or not called at all?</li>
<li><b>Style:</b> nested ifs → cond; car/cdr soup → let-bound names; duplicated work → a let.</li></ol>
<div data-quiz="b-whatdoes2p"></div><div data-quiz="b-fold"></div>` },
    ] },

  // =====================================================================
  { id: 'scope', icon: '⟲', title: 'let, scope & mutation', slides: 'racket-02-let.pdf',
    blurb: 'let / let* / letrec / define, top-level rules, cons cells & improper lists, set!, begin, mcons and aliasing.',
    sections: [
    { id: 'let', title: 'let: all right-hand sides see the OUTER environment', body: `
<p>Four ways to make local bindings: <code>let</code>, <code>let*</code>, <code>letrec</code>, <code>define</code>. They differ ONLY in <b>which environment each right-hand side is evaluated in</b>.</p>
<p><b>let</b>: evaluate every right-hand side in the environment from <i>before</i> the let, then create all the bindings at once. That is why <code>(let ([x y] [y x]) …)</code> swaps.</p>
<div data-widget="stepper:let-forms"></div>
<div data-quiz="s-lets-au18"></div>` },

    { id: 'letstar', title: 'let*: sequential (sugar for nested lets)', body: `
<p><b>let*</b> adds each binding as it goes, so later right-hand sides see earlier bindings. <code>(let* ([a 1] [b a]) e)</code> means exactly <code>(let ([a 1]) (let ([b a]) e))</code>. It works like OCaml's let.</p>
<div data-widget="stepper:double"></div>
<div data-quiz="s-double-p"></div>
<div class="callout link">🔗 Because let* is just nested lets, you can write it as a recursive <a data-map="macro">macro</a> (<code>my-let*</code>, in the macros topic). In an interpreter, the let vs let* difference is just WHICH env you pass when evaluating e2 (the <code>mlet2</code> exam question).</div>` },

    { id: 'letrec', title: 'letrec & local define: everything in scope, evaluated in order', body: `
<p><b>letrec</b>: all the bindings are in scope for ALL the right-hand sides, which is what you need for (mutual) recursion. But the right-hand sides are still <b>evaluated in order</b>, so reading a later binding's VALUE too early is an error. Mentioning it inside a lambda is fine, because <b>functions don't look up variables until they are called</b>.</p>
<pre data-run>(define (mod2 x)
  (letrec ([even? (lambda (x) (if (zero? x) #t (odd? (- x 1))))]
           [odd?  (lambda (x) (if (zero? x) #f (even? (- x 1))))])
    (if (even? x) 0 1)))
(mod2 5)
(define (bad-letrec-example x)
  (letrec ([y z]     ; z is in scope, but has no value yet!
           [z 13])
    (if x y z)))
(bad-letrec-example #t)</pre>
<p><b>Local define</b> (at the start of a function body) has the same semantics as letrec, and is the preferred style in real Racket.</p>
<div data-quiz="s-triple"></div><div data-quiz="s-localdefine"></div>` },

    { id: 'top', title: 'The top level & style rules', body: `
<p>Top-level <code>define</code>s in a file also work like letrec:</p>
<ul><li>you can refer to <b>earlier</b> bindings any time;</li>
<li>you can refer to <b>later</b> bindings only inside function bodies (they run later);</li>
<li>you can NOT bind the same name twice (unlike OCaml shadowing): <code>module: identifier already defined</code>.</li></ul>
<pre data-run>(define (f x) (+ x (* x y)))   ; forward reference inside a body: fine
(define y 3)
(f 2)
(define w (+ v 4))   ; v's value is needed right now, and it doesn't exist yet
(define v 5)</pre>
<div class="callout key">🔑 <b>Style:</b> <code>let</code> for shadowing/swaps (and whenever any form works), <code>let*</code> for sequences, <code>letrec</code> for mutual recursion. Use the simplest form that works: it tells the reader there is nothing tricky going on.</div>
<div data-quiz="s-style"></div><div data-quiz="s-toplevel2"></div>` },

    { id: 'cons', title: 'The truth about cons: pairs & improper lists', body: `
<p><code>cons</code> just makes a <b>pair</b>. A list is right-nested pairs <b>ending in null</b>. If the last cdr is not null, you get an <b>improper list</b>, printed with a dot.</p>
<div data-widget="box"></div>
<ul><li><code>pair?</code>: is it a cons cell? (true for every non-empty list)</li>
<li><code>list?</code>: is it a proper list? (true for <code>'()</code> too)</li>
<li>List functions like <code>length</code> reject improper lists.</li></ul>
<div data-quiz="s-cons-truth"></div><div data-quiz="s-boxes"></div>` },

    { id: 'set', title: 'set! and begin: closures see mutation', body: `
<p><code>(set! x e)</code> evaluates e and <b>updates the existing binding</b> of x, i.e. an assignment statement. With side effects, sequencing matters: <code>(begin e1 … eN)</code> runs each in order and returns the last one. (Bodies of lambda/let have an implicit begin.)</p>
<p>The crucial idea: a closure stores a <b>reference</b> to its environment, not a copy. So it sees later set!s, while values that were already computed don't change.</p>
<div data-widget="stepper:set-closure"></div>
<div class="callout link">🔗 This is exactly how the <a data-map="closureimpl">interpreter's closures</a> work: <code>(closure env fun)</code> holds the env. It is also why a promise or memo table hidden in a closure keeps its state.</div>
<div data-quiz="s-setclosure"></div>` },

    { id: 'state', title: 'Where state lives (the classic exam question)', body: `
<p>Old exams ALWAYS have a "what is part-a … part-h bound to?" question. The whole trick is <b>whether a binding is created once (outside the lambda) or on every call (inside the lambda)</b>, and whether you mutate a <b>variable</b> (set!) or a <b>pair</b> (set-mcar!).</p>
<div data-widget="stepper:counter"></div>
<div class="callout trap">⚠️ <b>Method for these questions:</b> draw each closure with an arrow to its environment. A <code>let</code> OUTSIDE the lambda = one shared box. INSIDE = a fresh box per call. A parameter is a NEW variable holding a copy of the caller's value, so set! on it never affects the caller. But set-mcar! on a pair passed in DOES affect the caller.</div>
<div data-quiz="s-wi23"></div><div data-quiz="s-sp17"></div>` },

    { id: 'mcons', title: 'Immutable cons vs mutable mcons', body: `
<p>Racket's cons cells are <b>immutable</b> (a big difference from Scheme). So aliasing doesn't matter, lists can't have cycles, and <code>list?</code> can be fast. <code>set!</code> on a list variable only changes which list the NAME points to.</p>
<p>When you really need mutation there are separate <b>mutable pairs</b>: <code>mcons</code>, <code>mcar</code>, <code>mcdr</code>, <code>set-mcar!</code>, <code>set-mcdr!</code>, <code>mpair?</code>. They are a completely different type: <code>(car (mcons 1 2))</code> is an error.</p>
<div data-widget="stepper:alias"></div>
<div data-quiz="s-mcons"></div><div data-quiz="s-wi22"></div>` },
    ] },

  // =====================================================================
  { id: 'lazy', icon: '⏳', title: 'Thunks, streams, promises & memoization', slides: 'racket-03-thunk-lazy.pdf',
    blurb: 'Eager vs lazy evaluation, thunks, performance, streams (producers & consumers), promises, memoization.',
    sections: [
    { id: 'eager', title: 'Eager arguments vs lazy if', body: `
<p>Function arguments are evaluated <b>eagerly</b>, BEFORE the call. The branches of <code>if</code> are evaluated <b>lazily</b>: only the chosen one. So you cannot write <code>if</code> as a function:</p>
<pre data-run>(define (my-if-wrong x y z) (if x y z))
(if #t 'ok (/ 1 0))           ; fine: the else branch is never evaluated
(my-if-wrong #t 'ok (/ 1 0))  ; (/ 1 0) is evaluated BEFORE my-if-wrong runs</pre>
<p>With recursion it is worse: <code>(define (fact-wrong n) (my-if-wrong (= n 0) 1 (* n (fact-wrong (- n 1)))))</code> never terminates, because the recursive call is always evaluated, even when n = 0.</p>
<div data-quiz="l-myif"></div>` },

    { id: 'thunks', title: 'Thunks: delay with an "unnecessary" lambda', body: `
<p>A <b>thunk</b> is a zero-argument function used only to delay a computation. No new features, just an idiom:</p>
<table class="cmp"><tr><td><code>e</code></td><td>evaluate e now</td></tr><tr><td><code>(lambda () e)</code></td><td>delay e (make a thunk)</td></tr><tr><td><code>(th)</code></td><td>run the delayed computation</td></tr></table>
<pre data-run>(define (weird-if x y z) (if x (y) (z)))   ; branches are thunks
(define (fact n)
  (weird-if (= n 0)
            (lambda () 1)
            (lambda () (* n (fact (- n 1))))))
(fact 5)
(define (print-later) (lambda () (println "hello")))
(define f (print-later))   ; prints nothing yet
(f)
(f)</pre>
<div class="callout link">🔗 Thunks are the building block for <a data-map="stream">streams</a> (thunk returning a pair) and <a data-map="promise">promises</a> (thunk + cache). A <a data-map="macro">macro</a> can add the thunk for you, which a function can't.</div>
<div data-quiz="l-printlater"></div>` },

    { id: 'perf', title: 'Performance: thunks help, hurt, or don\'t matter', body: `
<p>If you never need the result, delaying helps. If you need it exactly once, there is no change. If you need it many times, it <b>hurts</b> (recomputed each time). It can be hard to predict which case you're in!</p>
<div data-widget="thunks"></div>
<div data-quiz="l-count"></div>` },

    { id: 'streams', title: 'Streams: infinite sequences', body: `
<p>A <b>stream</b> is a <b>thunk that, when called, returns a pair</b> <code>(value . rest-of-stream)</code>, where the rest is again a stream (thunk). The producer knows how to make every value; the consumer decides how many to ask for.</p>
<ul><li>first value: <code>(car (s))</code></li><li>second value: <code>(car ((cdr (s))))</code></li><li>usually: bind <code>(s)</code> to a variable and recurse on the cdr.</li></ul>
<div data-widget="streams"></div>
<pre data-run>(define ones (lambda () (cons 1 ones)))
(define nats
  (letrec ([f (lambda (x) (cons x (lambda () (f (+ x 1)))))])
    (lambda () (f 0))))
(define (take-stream n s)          ; a consumer
  (if (= n 0) null
      (let ([p (s)])
        (cons (car p) (take-stream (- n 1) (cdr p))))))
(take-stream 5 nats)
(define (number-until pred? s)     ; another consumer
  (let ([p (s)])
    (if (pred? (car p)) 0 (+ 1 (number-until pred? (cdr p))))))
(number-until (lambda (x) (> x 50)) nats)</pre>
<div class="callout trap">⚠️ <b>Getting it wrong</b> (try these in the explorer above):<br>
<code>(define ones (cons 1 ones))</code> uses ones before it is defined.<br>
<code>(define (ones) (cons 1 (ones)))</code> never terminates when called (the rest is not delayed).<br>
<code>(define (ones) (lambda () (cons 1 (ones))))</code> is a double thunk: calling it gives a procedure, not a pair.</div>
<div data-quiz="l-ones-wrong"></div><div data-quiz="l-stream-access"></div>` },

    { id: 'streamq', title: 'Writing stream functions (exam pattern)', body: `
<p>Almost every stream function you write has this shape: <b>return a thunk</b>; inside it, <b>call the input stream</b> to get a pair, <b>build a new pair</b> whose cdr is a <b>recursive call that returns a stream</b> (so it is NOT called yet).</p>
<pre data-run>(define nats (letrec ([f (lambda (x) (cons x (lambda () (f (+ x 1)))))]) (lambda () (f 0))))
(define (take-stream n s) (if (= n 0) null (let ([p (s)]) (cons (car p) (take-stream (- n 1) (cdr p))))))
(define (map-stream f s)
  (lambda ()                                ; 1. a stream is a thunk
    (let ([pr (s)])                         ; 2. pull one pair
      (cons (f (car pr))                    ; 3. new value
            (map-stream f (cdr pr))))))     ; 4. recursive call RETURNS a thunk, it is not called
(take-stream 5 (map-stream (lambda (x) (* x x)) nats))</pre>
<div data-quiz="l-filter-stream"></div><div data-quiz="l-mystery-stream"></div>` },

    { id: 'promises', title: 'Promises: compute at most once', body: `
<p>Best of both worlds: don't compute until needed, then <b>save the answer</b> and reuse it. This is <b>lazy evaluation / call-by-need</b> (Haskell's default). Our own implementation uses a <b>mutable pair</b>: <code>(#f . thunk)</code> becomes <code>(#t . value)</code> after the first force.</p>
<div data-widget="stepper:promise"></div>
<p>Like a thunk: faster if unused, the same if used once. <b>Unlike</b> a thunk: faster if used more than once.</p>
<div class="callout link">🔗 Promise = <a data-map="thunk">thunk</a> + <a data-map="mcons">mcons</a> + <a data-map="setbang">set-mcar!/set-mcdr!</a>. Later, <code>my-delay</code> becomes a <a data-map="macro">macro</a> so the user doesn't have to write the lambda.</div>
<div data-quiz="l-promise-state"></div><div data-quiz="l-promise-bug"></div>` },

    { id: 'memo', title: 'Memoization', body: `
<p>Promises remember ONE answer. Memoization remembers an answer <b>per argument</b>: keep a table (here an association list of <code>(arg . result)</code> pairs), check it before computing, and add every new answer. It is only valid if the function is pure, and only a win if keeping the cache is cheaper than recomputing and results get reused. For recursive functions it can be exponentially faster (dynamic programming).</p>
<pre data-run>(define fibonacci3
  (letrec ([memo null]                       ; ONE table, shared by all calls
           [f (lambda (x)
                (let ([ans (assoc x memo)])  ; assoc returns (x . result) or #f
                  (if ans
                      (cdr ans)
                      (let ([new-ans (if (or (= x 1) (= x 2)) 1
                                         (+ (f (- x 1)) (f (- x 2))))])
                        (begin (set! memo (cons (cons x new-ans) memo))
                               new-ans)))))])
    f))
(fibonacci3 50)</pre>
<div data-widget="memo"></div>
<div data-quiz="l-memo-where"></div><div data-quiz="l-memo-count"></div>` },
    ] },

  // =====================================================================
  { id: 'macros', icon: '⟿', title: 'Quote, eval & macros', slides: 'racket4.pdf',
    blurb: 'C preprocessor problems, code as data (quote / quasiquote / eval), syntax-rules, when to use macros, evaluation-order gotchas, hygiene.',
    sections: [
    { id: 'cpp', title: 'Motivation: the C preprocessor (and its problems)', body: `
<p>C's <code>#define</code> is a search-and-replace engine that runs <b>before the compiler</b>. The arguments are pasted in as-is, with <b>no evaluation</b> at expansion time. It is "dumb": it knows nothing about scope, precedence or the language.</p>
<div data-widget="cpp"></div>
<div data-quiz="m-cpp3"></div>` },

    { id: 'quote', title: 'Code is data: quote, quasiquote, eval', body: `
<p>Every identifier in code is a <b>symbol</b>. Quoting (<code>'</code>) an expression gives the code as <b>data</b>: a list of symbols. Symbols are interned strings (one copy each, compared with fast <code>eq?</code>).</p>
<pre data-run>'if
'(if x y z)                 ; a list of 4 symbols, NOT an if
(car '(+ 1 2))
\`(if ,(+ 1 2))              ; quasiquote: evaluate only the unquoted parts
'(if ,(+ 1 2))              ; a plain quote does NOT unquote
(define expr '(1 + 2))
(define reorder (list (cadr expr) (car expr) (caddr expr)))
reorder
(eval reorder)              ; data → code
(eval expr)                 ; tries to call 1</pre>
<p><b>quote + eval = metaprogramming</b>: you can rearrange code however you like (even make "French" Racket). Macros make this convenient and safe.</p>
<div data-quiz="m-qq"></div>` },

    { id: 'macros', title: 'Macros: functions from syntax to syntax', body: `
<p>A <b>macro</b> describes how to rewrite syntax. <b>Macro expansion</b> happens <b>before the program runs</b>, even inside function bodies. Once defined, the macro name is a <b>special form</b>, not a function call, so its arguments are NOT evaluated first. It is one way to implement syntactic sugar.</p>
<pre data-run>(define-syntax my-if               ; macro name
  (syntax-rules (then else)        ; literal keywords
    [(my-if e1 then e2 else e3)    ; when you see this pattern…
     (if e1 e2 e3)]))              ; …replace it with this template
(my-if #t then 7 else (car null))
(define-syntax comment-out
  (syntax-rules ()
    [(comment-out ignore instead) instead]))
(comment-out (car null) #f)</pre>
<p>Explore any macro step by step: see the pattern variables, the expansion, the result, and what a naive (C-style) expansion would do instead:</p>
<div data-widget="macro"></div>
<div data-quiz="m-myif-bad"></div>` },

    { id: 'when', title: 'When to use a macro (and when not)', body: `
<p>Rule of thumb: <b>only use a macro when a function cannot do what you want</b>, i.e. when you need to control <i>whether/when/how many times</i> something is evaluated, or to change syntax.</p>
<table class="cmp"><tr><th>Needs a macro</th><th>A function is enough</th></tr>
<tr><td><code>my-if</code>: must not evaluate both branches</td><td><code>my-force</code>: evaluates its argument once, exactly as a function would</td></tr>
<tr><td><code>my-delay</code>: must not evaluate e yet</td><td><code>dbl</code>: just arithmetic</td></tr>
<tr><td><code>comment-out</code>: must never evaluate the ignored part</td><td>anything that uses each argument's value once</td></tr></table>
<pre data-run>(define-syntax my-delay
  (syntax-rules ()
    [(my-delay e) (mcons #f (lambda () e))]))   ; WE add the thunk now
(my-delay (begin (print "hi") (* 3 4)))         ; nothing printed yet</pre>
<div class="callout trap">⚠️ Making my-delay a macro <b>changes how clients use it</b>: they must stop writing the lambda themselves, or they get a double thunk.</div>
<div data-quiz="m-macro-or-fn"></div><div data-quiz="m-delay-macro"></div>` },

    { id: 'gotchas', title: 'Gotchas: repeated evaluation & evaluation order', body: `
<p>A macro <b>copies syntax</b>, so an argument used twice in the template is <b>evaluated twice</b>. Also think about <b>order</b>: you probably want left-to-right. Hygiene does NOT fix either of these. Fix them with a <code>let</code>:</p>
<pre data-run>(define-syntax dbl  (syntax-rules () [(dbl x) (+ x x)]))
(define-syntax dbl! (syntax-rules () [(dbl! x) (let ([y x]) (+ y y))]))
(dbl  (begin (println "Yo!") 42))
(dbl! (begin (println "Yo!") 42))
(define-syntax take (syntax-rules (from) [(take e1 from e2) (- e2 e1)]))
(take (begin (print "a") 1) from (begin (print "b") 10))</pre>
<div data-quiz="m-dbl"></div><div data-quiz="m-for"></div>` },

    { id: 'hygiene', title: 'Hygiene: scope done right', body: `
<p>Racket macros are <b>hygienic</b>:</p>
<ol><li>Local variables the macro introduces are secretly <b>renamed</b>, so they can't capture (shadow) the user's variables.</li>
<li>Free identifiers in the template (like <code>*</code> or <code>+</code>) are looked up where the macro was <b>defined</b>, not where it is used. That is lexical scope for macros.</li></ol>
<pre data-run>(define-syntax dbl (syntax-rules () [(dbl x) (let ([y 1]) (* 2 x y))]))
(let ([y 7]) (dbl y))        ; 14, not 2
(define-syntax dbl2 (syntax-rules () [(dbl2 x) (* 2 x)]))
(let ([* +]) (dbl2 42))      ; 84, not 44</pre>
<p>In the expander, try the presets <b>hygiene: y</b>, <b>hygiene: *</b> and <b>swap!</b> to see the naive expansion next to the real one.</p>
<div class="callout link">🔗 Compare <a data-map="cpp">C macros</a> (no hygiene, so people use ALL_CAPS names and weird local names) and <a data-map="lbimacro">LBI macros</a> written as Racket functions (also NOT hygienic).</div>
<div data-quiz="m-hyg1"></div><div data-quiz="m-swap"></div>` },

    { id: 'questions', title: 'Tokens, parens & scope', body: `
<ul><li><b>Tokens:</b> macros work on tokens, not characters. Rewriting <code>head</code>→<code>car</code> won't touch <code>headt</code> or <code>head-door</code> (one token in Racket, three in C).</li>
<li><b>Associativity:</b> C needs <code>((x)+(y))</code> everywhere. Racket doesn't, because the parentheses ARE the structure.</li>
<li><b>Scope:</b> handled by hygiene (above).</li></ul>
<p>More examples from the slides, including a recursive macro using <code>...</code> (zero or more repetitions):</p>
<pre data-run>(define-syntax my-let*
  (syntax-rules ()
    [(my-let* () body) body]
    [(my-let* ([var0 val0] [var-rest val-rest] ...) body)
     (let ([var0 val0])
       (my-let* ([var-rest val-rest] ...) body))]))
(my-let* ([a 5] [b 6] [c 7] [d 8]) (list a b c d))</pre>
<div data-quiz="m-token"></div><div data-quiz="m-sp17"></div>` },
    ] },

  // =====================================================================
  { id: 'structs', icon: '▣', title: 'Structs & variants', slides: 'racket5.pdf',
    blurb: 'Why Racket needs labels, DIY variants with lists & symbols, struct, list vs struct, evaluators returning expressions.',
    sections: [
    { id: 'why', title: 'Why variants? (and why Racket barely needs them)', body: `
<p>OCaml uses variants for (1) <b>mixing types</b> in one collection and (2) <b>labelled recursive trees</b>. In Racket, (1) is free: every value already carries a run-time tag, so lists can mix anything. You just test with <code>number?</code>, <code>string?</code>… But (2) still needs <b>labels</b>: an add node and a multiply node both hold two subexpressions.</p>
<pre data-run>(define (funny-sum xs)
  (cond [(null? xs) 0]
        [(number? (car xs)) (+ (car xs) (funny-sum (cdr xs)))]
        [(string? (car xs)) (+ (string-length (car xs)) (funny-sum (cdr xs)))]
        [#t (error "list was supposed to have only numbers and strings")]))
(funny-sum (list 1 2 "hi" 3 "bye"))</pre>
<div data-quiz="st-whyvariants"></div>` },

    { id: 'diy', title: 'Attempt #1: tagged lists', body: `
<p>To simulate a datatype you need an interface: <b>constructors</b> (build), <b>predicates</b> (which constructor?) and <b>accessors</b> (get the data). With lists and symbols:</p>
<pre data-run>(define (Const i) (list 'Const i))
(define (Add e1 e2) (list 'Add e1 e2))
(define (Const? x) (eq? (car x) 'Const))
(define (Add? x) (eq? (car x) 'Add))
(define (Const-i e) (cadr e))
(define (Add-e1 e) (cadr e))
(define (Add-e2 e) (caddr e))
(define (eval-exp e)
  (cond [(Const? e) (Const-i e)]
        [(Add? e) (+ (eval-exp (Add-e1 e)) (eval-exp (Add-e2 e)))]))
(eval-exp (Add (Const 2) (Const 3)))
(Add? (cons 'Add "gotcha"))     ; fooled!</pre>` },

    { id: 'struct', title: 'Attempt #2: struct', body: `
<p><code>(struct point2d (x y) #:transparent)</code> defines a <b>new type</b> with:</p>
<ul><li>constructor <code>(point2d e1 e2)</code></li><li>predicate <code>(point2d? e)</code></li><li>accessors <code>(point2d-x e)</code>, <code>(point2d-y e)</code>, which raise an error on anything else</li></ul>
<p><code>#:transparent</code> = nice printing. <code>#:mutable</code> adds <code>set-point2d-x!</code>. (mcons is really just a predefined mutable struct!)</p>
<pre data-run data-draw>(struct const (int) #:transparent)
(struct negate (e) #:transparent)
(struct add (e1 e2) #:transparent)
(struct multiply (e1 e2) #:transparent)
(define (eval-exp e)
  (cond [(const? e) (const-int e)]
        [(negate? e) (- (eval-exp (negate-e e)))]
        [(add? e) (+ (eval-exp (add-e1 e)) (eval-exp (add-e2 e)))]
        [(multiply? e) (* (eval-exp (multiply-e1 e)) (eval-exp (multiply-e2 e)))]))
(eval-exp (multiply (negate (add (const 2) (const 2))) (const 7)))
(multiply (negate (add (const 2) (const 2))) (const 7))</pre>
<div data-quiz="st-basic"></div>` },

    { id: 'vs', title: 'list approach vs struct approach', body: `
<table class="cmp"><tr><th>tagged list</th><th>struct</th></tr>
<tr><td>Just a list: <code>list?</code> is #t, car/cdr work</td><td>A brand-new type: NOT a list or pair</td></tr>
<tr><td>Anyone can break the abstraction with car/cdr</td><td>You can't use the wrong accessor</td></tr>
<tr><td>Easy to make malformed values that fool predicates</td><td>Predicates can't be fooled</td></tr>
<tr><td>Bad error messages</td><td>Good error messages</td></tr>
<tr><td>Can be written with plain functions</td><td>Must be a primitive feature (no function or macro can make a new type)</td></tr></table>
<p>One is <b>not</b> sugar for the other. Always prefer struct. With no type system, you must <b>document</b> which structs are expressions and what field types are expected (but you get polymorphism for free).</p>
<div data-quiz="st-listbreak"></div><div data-quiz="st-wrongfield"></div>` },

    { id: 'exp', title: 'A new way to write evaluators: return expressions', body: `
<p>Until now <code>eval-exp</code> had "type" expr → int. From now on it is <b>expr → expr</b>: it returns <code>(const 7)</code>, not <code>7</code>. This is painful while the only results are numbers, but it lets results be <b>different kinds of values</b> (booleans, pairs, closures), and it keeps the <b>language being implemented</b> separate from the <b>metalanguage</b> (Racket).</p>
<p>The idiom: <b>base case</b> → return the tagged value. <b>Recursive case</b> → check the tag, remove the tag, compute, tag the new result.</p>
<pre data-run>(struct const (int) #:transparent)
(struct negate (e) #:transparent)
(struct add (e1 e2) #:transparent)
(define (eval-exp-exp e)
  (cond [(const? e) e]
        [(negate? e) (const (- (const-int (eval-exp-exp (negate-e e)))))]
        [(add? e) (let ([v1 (eval-exp-exp (add-e1 e))]
                        [v2 (eval-exp-exp (add-e2 e))])
                    (const (+ (const-int v1) (const-int v2))))]
        [#t (error "eval-exp expected an exp")]))
(eval-exp-exp (add (const 3) (negate (const 5))))</pre>
<div class="callout link">🔗 This IS the start of the <a data-map="interp">interpreter</a> topic: the next lecture just adds booleans, variables and closures to this function.</div>
<div data-quiz="st-missingcase"></div>` },
    ] },

  // =====================================================================
  { id: 'interp', icon: '⚙', title: 'Implementing languages (interpreters)', slides: 'racket6.pdf',
    blurb: 'Workflow, interpreter vs compiler, LBI vs metalanguage, syntax vs dynamic type errors, environments, closures, free variables, LBI macros.',
    sections: [
    { id: 'workflow', title: 'The workflow & interpreter vs compiler', body: `
<div data-widget="workflow"></div>
<p>Two ways to run the <b>language being implemented (LBI)</b>:</p>
<ul><li><b>Interpreter</b> (evaluator), written in a metalanguage M: takes an LBI program and produces its answer.</li>
<li><b>Compiler</b> (translator), written in M: translates LBI into a target language T that already runs. The translation must <b>preserve meaning</b>.</li></ul>
<p>Reality mixes both: <code>javac</code> compiles to bytecode, the JVM interprets it but JIT-compiles hot code to assembly, and the CPU even translates assembly into micro-ops.</p>
<div class="callout key">🔑 <b>Sermon:</b> there is no such thing as a "compiled language". Interpreted vs compiled is a property of an <b>implementation</b>. Say "C programs are often faster when compiled".</div>
<div data-quiz="i-compiled"></div>` },

    { id: 'ast', title: 'Skip parsing: LBI programs are Racket structs', body: `
<p>We write LBI programs directly as ASTs using struct constructors. LBI code = Racket <b>data</b>, and the interpreter is just a recursive Racket function. Watch it evaluate (children first, then the parent):</p>
<div data-widget="lbi"></div>
<div data-quiz="i-lbim"></div>` },

    { id: 'errors', title: 'Syntax errors vs dynamic type errors', body: `
<table class="cmp"><tr><th>Illegal AST ("syntax error")</th><th>Legal AST, wrong values (dynamic type error)</th></tr>
<tr><td><code>(negate -7)</code>, <code>(add (const 3) "ha!")</code>, <code>(const #t)</code></td><td><code>(add (const 3) (bool #t))</code>, <code>(if-then-else (const 5) …)</code></td></tr>
<tr><td>A parser would reject these. It is OK to crash or give a strange error. Don't test for them.</td><td>MUST be checked: after evaluating each subexpression, check the result's kind, and give an error <b>in terms of the LBI</b>.</td></tr></table>
<div data-quiz="i-syntax-type"></div><div data-quiz="i-checks"></div>` },

    { id: 'env', title: 'Variables & environments', body: `
<p>To support variables, the interpreter carries an <b>environment</b>: a map from variable names (Racket strings) to LBI <b>values</b>, here a list of <code>(name . value)</code> pairs, newest first.</p>
<ul><li>The main helper is <code>(eval-under-env e env)</code>; <code>eval-exp</code> calls it with <code>null</code>.</li>
<li><b>Variable:</b> look it up. Most recursive calls pass the <b>same</b> env. <b>let</b> evaluates the body in an <b>extended</b> env.</li></ul>
<pre data-run>(define (envlookup env str)
  (cond [(null? env) (error "unbound variable during evaluation" str)]
        [(equal? (car (car env)) str) (cdr (car env))]
        [#t (envlookup (cdr env) str)]))
(define env (list (cons "x" 1) (cons "y" 2)))
(envlookup (cons (cons "x" 99) env) "x")   ; newest binding wins = shadowing
(envlookup env "z")</pre>
<div data-quiz="i-env"></div>` },

    { id: 'closures', title: 'Closures: function + environment', body: `
<p>A function expression is not yet a value: it evaluates to a <b>closure</b> <code>(closure env fun)</code> holding the <b>current</b> environment. To evaluate <code>(call e1 e2)</code>:</p>
<ol><li>evaluate e1 in the current env; it must be a closure (dynamic type check);</li>
<li>evaluate e2 in the current env;</li>
<li>evaluate the closure's body in the <b>closure's env</b>, extended with <i>argument name → e2's value</i> and <i>function name → the closure</i> (for recursion). <b>Never</b> the caller's env.</li></ol>
<div data-widget="stepper:lexical"></div>
<p>Here is a full MUPL interpreter running live (the language from the old exams). Edit the program at the bottom:</p>
<pre data-run data-prelude="mupl">(eval-exp
  (call (fun "sum" "n"
          (ifnz (var "n")
                (add (var "n") (call (var "sum") (add (var "n") (int -1))))
                (int 0)))
        (int 4)))</pre>
<div data-quiz="i-call"></div><div data-quiz="i-mupl-run"></div>` },

    { id: 'free', title: 'Free variables & closure conversion', body: `
<p>A closure keeps its whole environment, which can waste space. Instead, store only the <b>free variables</b> of the function: those used in the body but not bound inside it (after accounting for shadowing). This is a <b>static</b> property, so it can be precomputed once.</p>
<div data-widget="freevars"></div>
<p><b>Compiling</b> closures to a language without them (C, assembly) = <b>closure conversion</b>: every function takes an extra <b>environment argument</b>, calls pass the right environment, and free variables are looked up through it.</p>
<div data-quiz="i-free"></div><div data-quiz="i-closconv"></div>` },

    { id: 'lbimacro', title: 'LBI macros = Racket functions returning LBI code', body: `
<p>A Racket function that <b>returns an LBI AST</b> acts as a macro for the LBI. You use it as if it were LBI syntax, it "expands" before the LBI program runs, and the interpreter needs <b>no changes</b>. Downside: <b>not hygienic</b>. Use names like "_x" and <code>mlet</code> so each subexpression is evaluated once.</p>
<pre data-run>(struct const (int) #:transparent)
(struct bool (b) #:transparent)
(struct multiply (e1 e2) #:transparent)
(struct if-then-else (e1 e2 e3) #:transparent)
(define (andalso e1 e2) (if-then-else e1 e2 (bool #f)))
(define (list-product es)
  (if (null? es) (const 1) (multiply (car es) (list-product (cdr es)))))
(list-product (list (const 2) (const 3) (const 4)))
(andalso (bool #t) (bool #f))</pre>
<div class="callout trap">⚠️ <b>"Can this new construct be a macro?"</b> (it is on every old exam). YES only if it can be built from EXISTING constructs. NO if it needs something the LBI can't express: testing whether a value is an int or pair (no isint/isapair), or evaluating in an env with FEWER bindings.</div>
<div data-quiz="i-mmax-why"></div><div data-quiz="i-lbimacro"></div>` },

    { id: 'recipe', title: '🎯 Exam recipe: "add a case to eval-under-env"', body: `
<ol class="steps"><li>Write <code>[(newthing? e)</code>.</li>
<li><b>Evaluate</b> each subexpression that is needed: <code>(eval-under-env (newthing-e1 e) env)</code>. Which env? Usually the same one; for let-like forms, an extended one.</li>
<li><b>Check</b> the resulting values' kinds (<code>int?</code>, <code>apair?</code>, <code>closure?</code>), else <code>(error "...")</code>.</li>
<li><b>Compute</b> and <b>return an LBI value</b> (<code>(int …)</code>, not a Racket number!).</li></ol>
<div class="callout trap">⚠️ The most common bugs in old exams' "bad code": inspecting the raw syntax instead of evaluating it first; evaluating both branches of an if; replacing the env instead of extending it; recursing on <code>e</code> instead of a subexpression; returning a Racket number; using a Racket function (<code>munit?</code>, <code>apair-e1</code>) where a MUPL construct (<code>ismunit</code>, <code>first</code>) belongs.</div>
<div data-quiz="i-buggy"></div><div data-quiz="i-callpair"></div>` },
    ] },

  // =====================================================================
  { id: 'typing', icon: '⚖', title: 'Static vs dynamic typing', slides: 'racket7.pdf',
    blurb: 'OCaml vs Racket views, what static checking is, soundness & completeness, undecidability, weak typing, the 7 claim pairs.',
    sections: [
    { id: 'views', title: 'Two perspectives', body: `
<p><b>From Racket's view</b>, OCaml (ignoring syntax) is a <b>well-behaved subset</b> of Racket. Many programs outside that subset have bugs (passing a list to +), but some useful ones are excluded too (a list alternating strings and numbers; returning different types from different branches).</p>
<p><b>From OCaml's view</b>, Racket uses <b>one big variant</b>: <code>type the_type = Int of int | Pair of the_type * the_type | Fun of … | Bool of bool | …</code>. Constructors are applied implicitly (42 is really <code>Int 42</code>), primitives check tags and raise errors, and each <code>struct</code> adds a constructor.</p>
<div data-quiz="t-bigvariant"></div>` },

    { id: 'static', title: 'What static checking is (and isn\'t)', body: `
<p><b>Static checking</b> = anything done to reject a program after it parses but before it runs. A <b>type system</b> gives each expression a type, to prevent some errors. Whatever it makes impossible needn't be checked at run time.</p>
<table class="cmp"><tr><th>OCaml types prevent</th><th>OCaml types allow</th></tr>
<tr><td>primitives on wrong types, unbound variables, match failures (with exhaustive matches), breaking module invariants</td><td>exceptions (<code>List.hd []</code>), array out of bounds, division by zero, and logic bugs like swapped if branches</td></tr></table>
<p>Racket is dynamically typed but still detects unbound variables statically. OCaml is statically typed but allows <code>List.hd []</code>. The line is fuzzy but usually clear.</p>
<div class="callout trap">⚠️ <b>Misconception:</b> whether <code>"foo" + "bar"</code> or <code>arr[10]</code> is allowed is about the <b>run-time semantics of primitives</b>, not about static vs dynamic checking.</div>
<div data-quiz="t-prevent"></div><div data-quiz="t-primitive"></div>` },

    { id: 'sound', title: 'Soundness & completeness', body: `
<p>Suppose a type system is meant to prevent some bad thing X:</p>
<ul><li><b>Sound</b>: never <b>accepts</b> a program that, on some input, does X. No <b>false negatives</b>.</li>
<li><b>Complete</b>: never <b>rejects</b> a program that, on every input, never does X. No <b>false positives</b>.</li></ul>
<p>The usual goal: <b>sound but not complete</b> (so you can rely on it). Fancy features like generics aim at fewer false positives.</p>
<div data-widget="venn"></div>
<div class="callout key">🔑 <b>Decision recipe for exam questions.</b> <i>Sound?</i> Can you find ONE accepted program that does the bad thing? If yes → unsound. <i>Complete?</i> Can you find ONE rejected program that never does the bad thing? If yes → incomplete. Accepting MORE programs can only hurt soundness; rejecting MORE can only hurt completeness.</div>
<div data-quiz="t-defs"></div><div data-quiz="t-sp23-c"></div><div data-quiz="t-lion-d"></div>` },

    { id: 'undecidable', title: 'Why incompleteness is unavoidable', body: `
<p>OCaml rejects these, even though none of them ever divides by a string:</p>
<pre class="code">let f1 x = 4 / "hi"                  (* never called *)
let f2 x = if true then 0 else 4 / "hi"
let f3 x = if x then 0 else 4 / "hi"
let x = f3 true
let f4 x = if x <= abs x then 0 else 4 / "hi"
let y = f5 (if true then 1 else "hi")</pre>
<p>Almost anything interesting is <b>undecidable</b>. No static checker can be all three of: (1) always terminating, (2) sound, (3) complete. That is a theorem, related to the <b>Halting problem</b>: does <code>e; 4 / "hi"</code> divide by a string? Only if e terminates!</p>
<div data-quiz="t-au17"></div><div data-quiz="t-wi23-add"></div>` },

    { id: 'weak', title: 'Unsoundness & weak typing', body: `
<p>If a type system is unsound, a language could fix the definition, insert dynamic checks, let X happen, or, worst of all, let <b>anything</b> happen. That last option is <b>weak typing</b> (C/C++): programs that pass static checking can "set the computer on fire" because dynamic checks are optional and usually not done. The reasons: ease of implementation, performance, and the lower level (no array sizes stored).</p>
<p><b>Racket is NOT weakly typed.</b> It checks most things dynamically, and an implementation may optimise checks away only when it can prove them unnecessary. "Weak typing" is a poor name: it really means <i>neither static nor dynamic checks</i>.</p>
<div data-quiz="t-weak"></div>` },

    { id: 'claims', title: 'The great debate: 7 pairs of claims', body: `
<table class="cmp small"><tr><th>#</th><th>For dynamic</th><th>For static</th></tr>
<tr><td>1</td><td>More convenient: mixed lists, return int OR string</td><td>More convenient: no type checks cluttering code</td></tr>
<tr><td>2</td><td>Static rejects useful programs</td><td>Static lets you tag only where needed</td></tr>
<tr><td>3</td><td>Static only catches easy bugs (you test anyway)</td><td>Catches bugs earlier, at compile time</td></tr>
<tr><td>4</td><td>Faster: optimizers remove checks, no workarounds</td><td>Faster: no tags to store or check</td></tr>
<tr><td>5</td><td>Reuse: cons cells everywhere, one library</td><td>Reuse via generics & subtyping, no confusion</td></tr>
<tr><td>6</td><td>Prototyping: run incomplete code</td><td>Prototyping: types document decisions</td></tr>
<tr><td>7</td><td>Evolution: accept more without touching callers</td><td>Evolution: type checker gives a TODO list</td></tr></table>
<div data-widget="claims"></div>
<p>Static/dynamic is a continuum (keystroke → compile → link → run → later), and the better question is <i>what should we enforce statically?</i> <b>Gradual typing</b> (e.g. Typed Racket) mixes both.</p>
<div data-quiz="t-sortpair"></div>` },
    ] },
  ];

  // ---------- flash cards ----------
  window.CARDS = [
    ['What is a special form?', 'A form like define, lambda, if, cond, let, set!, define-syntax whose sub-parts are NOT all evaluated like a function call. Anything else in head position is a call: evaluate everything, then apply.'],
    ['What does (e) mean in Racket?', 'Call e with zero arguments. ((e)) calls e, then calls the result. Parens are never "just grouping".'],
    ['Syntax error vs run-time error (Racket file)', 'Syntax errors (e.g. if with 5 parts) are reported before anything runs. Run-time errors (car of a number, calling 1) happen only if that code is reached.'],
    ['What is false in Racket?', 'Only #f. 0, \'(), "" are all true.'],
    ['let', 'All right-hand sides are evaluated in the OUTER environment, then bound at once. (let ([x y] [y x]) …) swaps.'],
    ['let*', 'Each binding is visible to the later ones. The same as nested lets.'],
    ['letrec', 'All bindings are in scope for all right-hand sides (for mutual recursion), but evaluated in order: reading one before it is initialised gives "cannot use before initialization".'],
    ['Local define semantics', 'Same as letrec. Preferred style in real Racket.'],
    ['Top-level rules', 'Like letrec: forward references only inside function bodies. The same name can\'t be defined twice (module: identifier already defined).'],
    ['pair? vs list?', 'pair?: any cons cell (every non-empty list). list?: a proper list ending in null (including \'()).'],
    ['Improper list', 'Pairs that do not end in null, e.g. (cons 1 (cons 2 3)) = \'(1 2 . 3). length etc. reject it.'],
    ['What does set! change?', 'The binding of a variable. Closures that reference that environment see the change; values already computed don\'t change.'],
    ['Closures and environments', 'A closure REFERENCES the environment where it was created (it is not a copy).'],
    ['Why are cons cells immutable?', 'Aliasing doesn\'t matter, lists can\'t have cycles, and list? can be O(1). Use mcons/set-mcar!/set-mcdr! for mutation.'],
    ['Thunk', 'A zero-argument function used to delay evaluation: (lambda () e). Call it with (th).'],
    ['Thunk performance', 'Helps if the result is never needed, no change if needed once, hurts if needed many times.'],
    ['Stream', 'A thunk that returns a pair (value . stream). Second element: (car ((cdr (s)))).'],
    ['3 ways to get ones wrong', '(cons 1 ones): used before defined. (define (ones) (cons 1 (ones))): infinite loop. (define (ones) (lambda () (cons 1 (ones)))): double thunk.'],
    ['Promise (our version)', 'An mcons (#f . thunk). The first force runs the thunk, then stores (#t . value). Later forces return the value. Lazy evaluation / call-by-need.'],
    ['Memoization requires…', 'A function with no side effects that doesn\'t read mutable memory. A win if keeping the cache is cheaper than recomputing and results are reused.'],
    ['Symbol', 'An interned string (one copy each), compared fast with eq?. \'foo is a symbol; \'(if x y) is a list of symbols.'],
    ['quasiquote / unquote', '`(if ,(+ 1 2)) → \'(if 3). Unquote only works inside quasiquote.'],
    ['eval', 'Turns data (a quoted list) back into code and runs it. (eval \'(+ 1 2)) → 3.'],
    ['Macro', 'A function from syntax to syntax, expanded before the program runs. Its name becomes a special form: arguments are not evaluated first.'],
    ['When should you use a macro?', 'Only when a function can\'t do it: to control whether, when or how many times something is evaluated, or to change syntax.'],
    ['Macro gotchas hygiene doesn\'t fix', 'Repeated evaluation (an argument used twice runs twice) and evaluation order. Fix both with a let.'],
    ['Hygiene (2 parts)', '1) Variables the macro introduces are renamed, so they can\'t capture the user\'s. 2) Free template identifiers are looked up where the macro was defined.'],
    ['C preprocessor problems', 'Text replacement: precedence (9 + 1*9 + 1), repeated evaluation, variable capture (no hygiene).'],
    ['struct generates…', 'A constructor (name …), a predicate name?, accessors name-field. #:transparent prints nicely, #:mutable adds set-name-field!'],
    ['Why struct over tagged lists?', 'A new type: can\'t be broken with car/cdr, predicates can\'t be fooled, good errors. One is not sugar for the other.'],
    ['Why return exps from eval?', 'So results can be many kinds of values (bools, pairs, closures), and to separate the LBI from the metalanguage.'],
    ['Interpreter vs compiler', 'Interpreter: runs LBI programs (written in M). Compiler: translates LBI into an equivalent target-language program.'],
    ['Syntax error vs type error in an LBI', 'Illegal AST: OK to crash (the parser\'s job). Legal AST with wrong values: must check and report in LBI terms.'],
    ['Evaluating a function in the interpreter', 'It produces a closure = function + current env. Calls evaluate the body in the closure\'s env + argument (+ function name), never the caller\'s env.'],
    ['Free variables', 'Variables used in a body but not bound inside it. Precompute them, and store only those in the closure.'],
    ['Closure conversion', 'Compiling closures: every function takes an extra env argument; free variables are looked up in it.'],
    ['LBI macro', 'A Racket function returning LBI syntax. No interpreter change, but NOT hygienic. It can only use existing constructs.'],
    ['Sound', 'Never accepts a program that can do the bad thing. No false negatives.'],
    ['Complete', 'Never rejects a program that can\'t do the bad thing. No false positives.'],
    ['Undecidability', 'No checker can always terminate AND be sound AND be complete (Halting problem).'],
    ['Weak typing', 'Neither static nor dynamic checks are guaranteed: errors can do anything (C/C++). Racket is NOT weakly typed.'],
    ['Racket from OCaml\'s view', 'One big variant: every value is tagged (Int 42), primitives check tags, each struct adds a constructor.'],
  ].map(([front, back]) => ({ front, back }));

  // ---------- exam technique ----------
  window.EXAM_TIPS = `
<h3>What this exam looks like</h3>
<ul><li>Closed book, no cheat sheet, pencil only. All answers are short (the longest code answer is about 4 lines).</li>
<li>Expect, based on the old exams: <b>predict the output</b> (let forms, closures + set!, mcons), <b>what does this unlabelled function do</b>, <b>find/fix the bug</b>, <b>fill in the blank</b> (streams, macros, interpreter cases), <b>is it a macro or a function</b>, <b>free variables</b>, <b>sound/complete</b>, and short "why" theory questions.</li></ul>
<h3>Tracing questions (part-a … part-h)</h3>
<ol><li>Draw a box for every frame (global, each let, each CALL). Write the bindings inside.</li>
<li>Draw an arrow from every closure to the frame it was created in.</li>
<li>A let OUTSIDE a lambda runs once (shared state); INSIDE, it runs on every call (fresh state).</li>
<li>set! changes a variable's box. set-mcar! changes a pair. A parameter is a fresh box holding a copy.</li>
<li>Free variables in a function body are looked up via the closure's arrow, NOT where it is called.</li></ol>
<h3>"What does this code do?"</h3>
<ol><li>Find the base cases and what the recursion is on.</li><li>Trace inputs with 0, 1, 2 and 3 elements.</li><li>Answer in one sentence about what callers SEE.</li><li>Then: edge cases (empty, single, #f elements, wrong types, missing cond clause → void).</li></ol>
<h3>"Fix the bug" checklist</h3>
<ul><li>Wrong parens: extra = a call, missing = no call. Arity errors.</li><li>Stream: is the rest delayed? Thunked exactly once?</li><li>Macro: an argument used twice? Wrong evaluation order? Should it even be a macro?</li><li>Interpreter: is the subexpression evaluated before being inspected? Right env (extend, don't replace)? Recursing on a subexpression, not e? Returning an LBI value? Mixing Racket functions with LBI constructs?</li><li>A cond with no else silently returns void.</li></ul>
<h3>Sound / complete questions</h3>
<ul><li>Unsound ⇔ there is ONE accepted program that does the bad thing.</li><li>Incomplete ⇔ there is ONE rejected program that never does the bad thing.</li><li>Accepting more can only break soundness; rejecting more can only break completeness.</li><li>Sound + complete + always terminating is impossible (for interesting properties).</li></ul>
<h3>Things people mix up</h3>
<ul><li><code>'(1 2 . 3)</code> vs <code>'(1 (2 . 3))</code>. Draw the boxes.</li><li><code>(car (s))</code> vs <code>(car s)</code> for streams.</li><li>A promise caches; a thunk doesn't.</li><li>Hygiene fixes capture, NOT repeated evaluation.</li><li>Interpreted/compiled describes implementations, not languages.</li><li><code>first</code> (MUPL syntax) vs <code>apair-e1</code> (a Racket function, runs now).</li></ul>`;
})();
