// viz.js — interactive visualisers used inside lessons.
(function () {
  'use strict';
  const R = window.Racket;

  // ---------- tiny DOM helpers ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  }
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // ---------- syntax highlighting ----------
  const KW = new Set(['define', 'lambda', 'λ', 'let', 'let*', 'letrec', 'if', 'cond', 'else', 'begin', 'set!', 'define-syntax', 'syntax-rules', 'struct', 'quote', 'and', 'or', 'when', 'unless', 'delay']);
  function highlight(code) {
    let outHtml = ''; let i = 0; const n = code.length;
    while (i < n) {
      const c = code[i];
      if (c === ';') { let j = code.indexOf('\n', i); if (j < 0) j = n; outHtml += '<span class="t-com">' + esc(code.slice(i, j)) + '</span>'; i = j; continue; }
      if (c === '"') { let j = i + 1; while (j < n && code[j] !== '"') { if (code[j] === '\\') j++; j++; } j++; outHtml += '<span class="t-str">' + esc(code.slice(i, j)) + '</span>'; i = j; continue; }
      if ('()[]'.includes(c)) { outHtml += '<span class="t-par">' + c + '</span>'; i++; continue; }
      if (c === "'" || c === '`' || c === ',') { outHtml += '<span class="t-q">' + c + '</span>'; i++; continue; }
      if (/\s/.test(c)) { outHtml += c; i++; continue; }
      let j = i; while (j < n && !/[\s()\[\]";'`,]/.test(code[j])) j++;
      const tok = code.slice(i, j); i = j;
      if (KW.has(tok)) outHtml += '<span class="t-kw">' + esc(tok) + '</span>';
      else if (/^#[tf]$|^#:/.test(tok)) outHtml += '<span class="t-bool">' + esc(tok) + '</span>';
      else if (/^-?\d/.test(tok)) outHtml += '<span class="t-num">' + esc(tok) + '</span>';
      else if (tok.startsWith('⟦')) outHtml += '<span class="t-ren">' + esc(tok.slice(1, -1)) + '</span>';
      else outHtml += esc(tok);
    }
    return outHtml;
  }

  // ---------- runnable code block ----------
  function codeBlock(code, opts = {}) {
    const wrap = h('div', { class: 'codeblock' });
    const pre = h('pre', { class: 'code', html: highlight(code) });
    const ta = h('textarea', { class: 'code-edit', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', rows: Math.min(14, code.split('\n').length + 1) });
    ta.value = code;
    const outEl = h('div', { class: 'run-out', hidden: true });
    let editing = false;
    const runBtn = h('button', { class: 'btn small primary', onclick: () => run() }, '▶ Run');
    const editBtn = h('button', { class: 'btn small', onclick: () => toggle() }, '✎ Edit');
    const drawBtn = opts.draw ? h('button', { class: 'btn small', onclick: () => run(true) }, '▦ Draw') : null;
    function toggle() {
      editing = !editing;
      if (editing) { ta.value = current(); pre.replaceWith(ta); ta.focus(); editBtn.textContent = '✓ Done'; }
      else { pre.innerHTML = highlight(ta.value); ta.replaceWith(pre); editBtn.textContent = '✎ Edit'; }
    }
    const current = () => editing ? ta.value : (pre.dataset.src || code);
    ta.addEventListener('input', () => { pre.dataset.src = ta.value; });
    function run(draw) {
      const src = (opts.prelude || '') + '\n' + current();
      const r = R.run(src);
      outEl.hidden = false; outEl.innerHTML = '';
      if (r.output) outEl.append(h('pre', { class: 'out-text' }, r.output));
      if (r.error) outEl.append(h('pre', { class: 'out-err' }, r.error));
      if (!r.output && !r.error) outEl.append(h('div', { class: 'muted small' }, '(no output: definitions print nothing)'));
      if (draw && r.results.length) outEl.append(h('div', { class: 'boxwrap', html: boxDiagram(r.results[r.results.length - 1]) }));
      if (opts.onRun) opts.onRun(r);
    }
    wrap.append(pre, h('div', { class: 'code-actions' }, runBtn, editBtn, drawBtn, opts.extra || null), outEl);
    return wrap;
  }

  // ---------- box-and-pointer diagrams ----------
  function isBoxed(v) { return v instanceof R.Pair || v instanceof R.MPair || v instanceof R.StructVal && v.type.transparent; }
  function shortText(v) { const s = R.printValue(v).replace(/^'/, ''); return s; }
  function boxDiagram(v) {
    if (!isBoxed(v)) return `<div class="muted small">${esc(R.printValue(v))} is not a pair, so there is nothing to draw.</div>`;
    const COL = 104, ROW = 84, BW = 36, BH = 32, PAD = 14;
    const nodes = [], edges = []; const seen = new Map();
    function place(val, col, row, depth) {
      if (seen.has(val)) return { w: 0, node: seen.get(val), shared: true };
      if (depth > 30 || nodes.length > 80) return { w: 1, node: null };
      const node = { val, col, row, kind: val instanceof R.StructVal ? 'struct' : val instanceof R.MPair ? 'mpair' : 'pair' };
      nodes.push(node); seen.set(val, node);
      if (node.kind === 'struct') {
        const k = val.vals.length; node.cols = Math.max(1, Math.ceil((56 + 40 * k) / COL));
        let acc = 0; node.fields = [];
        val.vals.forEach((f, idx) => {
          if (isBoxed(f)) { const r = place(f, col + acc, row + 1, depth + 1); if (r.node) edges.push({ from: node, slot: idx, to: r.node, down: true }); node.fields.push(null); acc += Math.max(1, r.w); }
          else node.fields.push(shortText(f));
        });
        return { w: Math.max(node.cols, acc), node };
      }
      let w = 1;
      if (isBoxed(val.car)) { const r = place(val.car, col, row + 1, depth + 1); if (r.node) edges.push({ from: node, slot: 'car', to: r.node, down: !r.shared }); w = Math.max(1, r.w); }
      else node.carText = shortText(val.car);
      if (isBoxed(val.cdr)) { const r = place(val.cdr, col + w, row, depth + 1); if (r.node) edges.push({ from: node, slot: 'cdr', to: r.node }); w += r.w; }
      else node.cdrText = val.cdr === R.NIL ? null : shortText(val.cdr);
      return { w, node };
    }
    const total = place(v, 0, 0, 0).w;
    const maxRow = Math.max(...nodes.map(n => n.row));
    const W = PAD * 2 + total * COL, H = PAD * 2 + (maxRow + 1) * ROW;
    const X = (n) => PAD + n.col * COL, Y = (n) => PAD + n.row * ROW;
    let s = `<svg class="boxsvg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="box and pointer diagram"><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="bx-arrowhead"/></marker></defs>`;
    const txt = (x, y, t, cls = 'bx-t') => {
      const tt = t.length > 7 ? t.slice(0, 6) + '…' : t;
      return `<text x="${x}" y="${y}" class="${cls}" text-anchor="middle" dominant-baseline="central">${esc(tt)}</text>`;
    };
    for (const n of nodes) {
      const x = X(n), y = Y(n);
      if (n.kind === 'struct') {
        const k = n.val.vals.length; const nameW = 56;
        s += `<rect x="${x}" y="${y}" width="${nameW + 40 * k}" height="${BH}" rx="7" class="bx-struct"/>`;
        s += txt(x + nameW / 2, y + BH / 2, n.val.type.name, 'bx-sname');
        n.fields.forEach((f, idx) => {
          const fx = x + nameW + 40 * idx;
          s += `<line x1="${fx}" y1="${y}" x2="${fx}" y2="${y + BH}" class="bx-div"/>`;
          if (f !== null) s += txt(fx + 20, y + BH / 2, f); else s += `<circle cx="${fx + 20}" cy="${y + BH / 2}" r="3" class="bx-dot"/>`;
        });
        s += `<text x="${x}" y="${y - 3}" class="bx-tag">${n.val.type.name}-${esc(n.val.type.fields.join('/'))}</text>`;
        continue;
      }
      const cls = n.kind === 'mpair' ? 'bx-mbox' : 'bx-box';
      s += `<rect x="${x}" y="${y}" width="${BW}" height="${BH}" class="${cls}"/><rect x="${x + BW}" y="${y}" width="${BW}" height="${BH}" class="${cls}"/>`;
      if (n.kind === 'mpair') s += `<text x="${x}" y="${y - 3}" class="bx-tag">mcons</text>`;
      if (n.carText !== undefined) {
        if (n.carText.length <= 4) s += txt(x + BW / 2, y + BH / 2, n.carText);
        else { s += `<circle cx="${x + BW / 2}" cy="${y + BH / 2}" r="3" class="bx-dot"/><line x1="${x + BW / 2}" y1="${y + BH / 2}" x2="${x + BW / 2}" y2="${y + BH + 16}" class="bx-arrow" marker-end="url(#ah)"/>` + txt(x + BW / 2, y + BH + 28, n.carText); }
      } else s += `<circle cx="${x + BW / 2}" cy="${y + BH / 2}" r="3" class="bx-dot"/>`;
      if (n.cdrText === null) s += `<line x1="${x + BW + 4}" y1="${y + BH - 4}" x2="${x + 2 * BW - 4}" y2="${y + 4}" class="bx-null"/>`;
      else if (n.cdrText !== undefined) s += txt(x + BW * 1.5, y + BH / 2, n.cdrText, 'bx-t bx-improper');
      else s += `<circle cx="${x + BW * 1.5}" cy="${y + BH / 2}" r="3" class="bx-dot"/>`;
    }
    for (const e of edges) {
      const a = e.from, b = e.to;
      if (a.kind === 'struct') {
        const sx = X(a) + 56 + 40 * e.slot + 20, sy = Y(a) + BH / 2;
        s += `<path d="M${sx},${sy} L${sx},${Y(b) - 14} L${X(b) + 14},${Y(b) - 2}" class="bx-arrow" marker-end="url(#ah)"/>`;
      } else if (e.slot === 'car') {
        const sx = X(a) + BW / 2, sy = Y(a) + BH / 2;
        if (e.down) s += `<line x1="${sx}" y1="${sy}" x2="${X(b) + (b.kind === 'struct' ? 20 : BW / 2)}" y2="${Y(b) - 2}" class="bx-arrow" marker-end="url(#ah)"/>`;
        else s += `<path d="M${sx},${sy} C${sx},${sy + 60} ${X(b) + BW},${Y(b) + BH + 50} ${X(b) + BW},${Y(b) + BH + 2}" class="bx-arrow bx-shared" marker-end="url(#ah)"/>`;
      } else {
        const sx = X(a) + BW * 1.5, sy = Y(a) + BH / 2;
        if (b.row === a.row && b.col > a.col) s += `<line x1="${sx}" y1="${sy}" x2="${X(b) - 2}" y2="${Y(b) + BH / 2}" class="bx-arrow" marker-end="url(#ah)"/>`;
        else s += `<path d="M${sx},${sy} C${sx + 40},${sy - 60} ${X(b) + BW},${Y(b) - 50} ${X(b) + BW},${Y(b) - 2}" class="bx-arrow bx-shared" marker-end="url(#ah)"/>`;
      }
    }
    return s + '</svg>';
  }

  function boxPlayground() {
    const presets = [
      ["(list 1 2 3)", 'A proper list: pairs chained by cdr, ending in null (the slash).'],
      ["(cons 1 (cons 2 3))", 'Improper list \'(1 2 . 3): the last cdr is 3, not null.'],
      ["(cons (cons 1 2) 3)", "'((1 . 2) . 3): the car points DOWN to another pair."],
      ["(list 1 (cons 2 3))", "'(1 (2 . 3)): a 2-element list whose 2nd element is a pair."],
      ['(cons 1 (cons #t "hi"))', 'The slides\' pr: \'(1 #t . "hi").'],
      ['(list (list 1 2) (list 3))', 'A list of lists.'],
      ["(mcons 1 (mcons #t \"hi\"))", 'Mutable pairs are a different type (orange).'],
      ['(begin (struct add (e1 e2) #:transparent) (struct const (i) #:transparent) (add (const 2) (const 3)))', 'A struct is NOT made of pairs: it is a brand-new kind of value.'],
    ];
    const input = h('input', { class: 'inp mono', value: presets[0][0], spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' });
    const note = h('div', { class: 'muted small' }, presets[0][1]);
    const area = h('div', { class: 'boxwrap' });
    const printed = h('div', { class: 'printed mono' });
    function draw() {
      const r = R.run(input.value);
      if (r.error) { area.innerHTML = ''; printed.textContent = ''; area.append(h('pre', { class: 'out-err' }, r.error)); return; }
      const v = r.results[r.results.length - 1];
      printed.textContent = 'Racket prints: ' + (v === undefined ? '(nothing)' : R.printValue(v));
      area.innerHTML = v === undefined ? '' : boxDiagram(v);
    }
    const chips = h('div', { class: 'chips' }, presets.map(([c, n]) => h('button', { class: 'chip mono', onclick: () => { input.value = c; note.textContent = n; draw(); } }, c.length > 26 ? c.slice(0, 24) + '…' : c)));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') draw(); });
    setTimeout(draw, 0);
    return h('div', { class: 'widget' }, h('div', { class: 'w-title' }, '▦ Box-and-pointer diagram'), chips, h('div', { class: 'row' }, input, h('button', { class: 'btn primary small', onclick: draw }, 'Draw')), note, printed, area,
      h('div', { class: 'legend small' }, h('span', { class: 'lg lg-pair' }), ' cons pair [car | cdr]  ', h('span', { class: 'lg lg-m' }), ' mcons  ', h('span', { class: 'lg lg-s' }), ' struct   ╱ = null'));
  }

  // ---------- environment stepper ----------
  // Frames are written compactly: "G: x=15; y=17 | let(G): *x=17; *y=15"
  //   NAME(PARENT): key=value; ...   a leading * highlights a change,  λ(x)@G is a closure whose env is frame G
  const FRAME_COLORS = 6;
  function parseFrames(spec) {
    if (!spec) return [];
    return spec.split(' | ').map((f) => {
      const m = f.match(/^\s*([^:(]+)(?:\(([^)]*)\))?:\s*(.*)$/);
      const name = m[1].trim(), parent = m[2] || null;
      const vars = m[3].trim() ? m[3].split(';').map(kv => {
        const k = kv.indexOf('='); let key = kv.slice(0, k).trim(); const val = kv.slice(k + 1).trim();
        const hot = key.startsWith('*'); if (hot) key = key.slice(1);
        const cm = val.match(/^(λ.*)@(\w+)$/);
        return { key, val: cm ? cm[1] : val, env: cm ? cm[2] : null, hot };
      }) : [];
      return { name, parent, vars };
    });
  }
  function stepper(def) {
    const wrap = h('div', { class: 'widget stepper' });
    const tabs = def.variants ? h('div', { class: 'seg' }) : null;
    let variant = 0, k = 0;
    const codeEl = h('pre', { class: 'code step-code' });
    const framesEl = h('div', { class: 'frames' });
    const noteEl = h('div', { class: 'step-note' });
    const outEl = h('div', { class: 'step-out mono' });
    const counter = h('span', { class: 'muted small' });
    const prev = h('button', { class: 'btn small', onclick: () => go(k - 1) }, '◀ Back');
    const next = h('button', { class: 'btn small primary', onclick: () => go(k + 1) }, 'Next ▶');
    const cur = () => def.variants ? def.variants[variant] : def;
    function go(nk) {
      const d = cur(); k = Math.max(0, Math.min(d.steps.length - 1, nk));
      const st = d.steps[k];
      const lines = d.code.split('\n');
      codeEl.innerHTML = lines.map((l, idx) => `<span class="ln${(st.line || []).includes(idx + 1) ? ' hl' : ''}">${highlight(l) || ' '}</span>`).join('');
      const frames = parseFrames(st.frames);
      const colorOf = {}; frames.forEach((f, idx) => { colorOf[f.name] = idx % FRAME_COLORS; });
      framesEl.innerHTML = '';
      frames.forEach((f) => {
        framesEl.append(h('div', { class: 'frame c' + colorOf[f.name] },
          h('div', { class: 'frame-h' }, h('b', null, f.name), f.parent ? h('span', { class: 'frame-p' }, '↑ parent: ' + f.parent) : null),
          f.vars.length ? f.vars.map(v => h('div', { class: 'bind' + (v.hot ? ' hot' : '') },
            h('span', { class: 'bk mono' }, v.key), h('span', { class: 'bv mono' + (v.env ? ' clos c' + (colorOf[v.env] ?? 0) : '') }, v.val, v.env ? h('span', { class: 'envtag' }, ' env→' + v.env) : null))) : h('div', { class: 'muted small' }, '(empty)')));
      });
      noteEl.innerHTML = st.note || '';
      outEl.textContent = st.out ? '⇒ ' + st.out : '';
      outEl.hidden = !st.out;
      counter.textContent = `step ${k + 1} / ${d.steps.length}`;
      prev.disabled = k === 0; next.disabled = k === d.steps.length - 1;
    }
    if (tabs) def.variants.forEach((v, idx) => tabs.append(h('button', { class: 'seg-b' + (idx === 0 ? ' on' : ''), onclick: (e) => { variant = idx; [...tabs.children].forEach(c => c.classList.remove('on')); e.target.classList.add('on'); go(0); } }, v.label)));
    wrap.append(h('div', { class: 'w-title' }, '🪜 ' + def.title), tabs, codeEl, h('div', { class: 'step-nav' }, prev, counter, next), noteEl, outEl, h('div', { class: 'frames-label small muted' }, 'Environment frames (each box is one scope):'), framesEl);
    setTimeout(() => go(0), 0);
    return wrap;
  }

  const STEPS = {
    'let-forms': {
      title: 'let vs let* vs letrec (Au18 exam)',
      variants: [
        { label: 'let', code: `(define x 15)\n(define y 17)\n(let ([x y]\n      [y x])\n  (cons x y))`, steps: [
          { line: [1, 2], frames: 'G: x=15; y=17', note: 'Top level: x = 15, y = 17.' },
          { line: [3], frames: 'G: x=15; y=17', note: '<b>let</b>: evaluate ALL right-hand sides in the environment from <i>before</i> the let. RHS of x is <code>y</code>, which looks up G and gets <b>17</b>.' },
          { line: [4], frames: 'G: x=15; y=17', note: 'RHS of y is <code>x</code>. It still looks in G (the new x does not exist yet), so <b>15</b>.' },
          { line: [3, 4], frames: 'G: x=15; y=17 | let(G): *x=17; *y=15', note: 'Only now is the new frame created, with both bindings at once.' },
          { line: [5], frames: 'G: x=15; y=17 | let(G): x=17; y=15', note: 'The body looks up x and y in the let frame first.', out: "'(17 . 15), a swap!" }] },
        { label: 'let*', code: `(define x 15)\n(define y 17)\n(let* ([x y]\n       [y x])\n  (cons x y))`, steps: [
          { line: [1, 2], frames: 'G: x=15; y=17', note: 'Same start.' },
          { line: [3], frames: 'G: x=15; y=17 | let*1(G): *x=17', note: '<b>let*</b> adds each binding as it goes (like nested lets). x = y = <b>17</b>, in a new frame.' },
          { line: [4], frames: 'G: x=15; y=17 | let*1(G): x=17 | let*2(let*1): *y=17', note: 'RHS of y is <code>x</code>, found in the frame just made: <b>17</b> (not 15!).' },
          { line: [5], frames: 'G: x=15; y=17 | let*1(G): x=17 | let*2(let*1): y=17', note: 'Body: x is found in let*1, y in let*2.', out: "'(17 . 17)" }] },
        { label: 'letrec', code: `(define x 15)\n(define y 17)\n(letrec ([x y]\n         [y x])\n  (cons x y))`, steps: [
          { line: [1, 2], frames: 'G: x=15; y=17', note: 'Same start.' },
          { line: [3, 4], frames: 'G: x=15; y=17 | letrec(G): x=⟨uninitialised⟩; y=⟨uninitialised⟩', note: '<b>letrec</b> creates the frame FIRST with every name in scope but uninitialised, so all right-hand sides can see all the names (for recursion).' },
          { line: [3], frames: 'G: x=15; y=17 | letrec(G): x=⟨uninitialised⟩; y=⟨uninitialised⟩', note: 'Right-hand sides are still evaluated <b>in order</b>. RHS of x is <code>y</code>, which finds the letrec frame\'s y. It is not initialised yet.', out: 'ERROR  y: undefined; cannot use before initialization' }] },
      ],
    },
    'double': {
      title: 'double1 (let) vs double2 (let*) with x = 5',
      variants: [
        { label: 'let', code: `(define (double1 x)\n  (let ([x (+ x 3)]\n        [y (+ x 2)])\n    (+ x y -5)))\n(double1 5)`, steps: [
          { line: [5], frames: 'G: double1=λ(x)@G | call(G): x=5', note: 'Calling double1 makes a frame with the parameter x = 5.' },
          { line: [2, 3], frames: 'G: double1=λ(x)@G | call(G): x=5', note: 'Both RHS use the OLD x = 5: (+ 5 3) = 8 and (+ 5 2) = 7.' },
          { line: [2, 3], frames: 'G: double1=λ(x)@G | call(G): x=5 | let(call): *x=8; *y=7', note: 'The new frame shadows x.' },
          { line: [4], frames: 'G: double1=λ(x)@G | call(G): x=5 | let(call): x=8; y=7', note: '8 + 7 − 5', out: '10' }] },
        { label: 'let*', code: `(define (double2 x)\n  (let* ([x (+ x 3)]\n         [y (+ x 2)])\n    (+ x y -8)))\n(double2 5)`, steps: [
          { line: [5], frames: 'G: double2=λ(x)@G | call(G): x=5', note: 'Parameter x = 5.' },
          { line: [2], frames: 'G: double2=λ(x)@G | call(G): x=5 | l1(call): *x=8', note: 'x = 5 + 3 = 8, added immediately.' },
          { line: [3], frames: 'G: double2=λ(x)@G | call(G): x=5 | l1(call): x=8 | l2(l1): *y=10', note: 'y uses the NEW x: 8 + 2 = 10.' },
          { line: [4], frames: 'G: double2=λ(x)@G | call(G): x=5 | l1(call): x=8 | l2(l1): y=10', note: '8 + 10 − 8. The same answer, by a different route! Both functions always return 2x.', out: '10' }] },
      ],
    },
    'set-closure': {
      title: 'Closures reference their environment (set! example)',
      code: `(define b 3)\n(define g (lambda (x) (+ x b)))\n(define c (+ b 4))\n(set! b 5)\n(define d (g 4))\n(define e c)`,
      steps: [
        { line: [1], frames: 'G: *b=3', note: 'b = 3.' },
        { line: [2], frames: 'G: b=3; *g=λ(x)@G', note: 'A lambda evaluates to a <b>closure</b>: code + a <i>pointer</i> to the environment where it was made (G). It does NOT copy b\'s current value.' },
        { line: [3], frames: 'G: b=3; g=λ(x)@G; *c=7', note: 'c = 3 + 4 = 7, computed now and stored as a plain number.' },
        { line: [4], frames: 'G: *b=5; g=λ(x)@G; c=7', note: '<b>set!</b> updates b in G. Anything that looks up b from now on sees 5.' },
        { line: [5], frames: 'G: b=5; g=λ(x)@G; c=7 | call g(G): x=4', note: 'Calling g: a new frame whose parent is g\'s env (G). The body looks up b <b>now</b> and gets 5.', out: 'd = 9' },
        { line: [6], frames: 'G: b=5; g=λ(x)@G; c=7; *d=9; *e=7', note: 'c was already a value (7). "Once an expression produces a value, how it did so is irrelevant." So e = 7.', out: 'e = 7' }],
    },
    'counter': {
      title: 'Where state lives: let outside vs inside the lambda',
      variants: [
        { label: 'let OUTSIDE (shared)', code: `(define f1\n  (let ([x 0])\n    (lambda ()\n      (begin (set! x (+ x 1)) x))))\n(f1)\n(f1)`, steps: [
          { line: [1, 2], frames: 'G: f1=? | let(G): *x=0', note: 'The let runs ONCE, when f1 is defined.' },
          { line: [3], frames: 'G: *f1=λ()@let | let(G): x=0', note: 'f1 is a closure whose environment is the let frame. x lives there.' },
          { line: [5], frames: 'G: f1=λ()@let | let(G): *x=1 | call(let): ', note: 'Calling f1: the new frame\'s parent is the LET frame, so set! updates that shared x.', out: '1' },
          { line: [6], frames: 'G: f1=λ()@let | let(G): *x=2 | call(let): ', note: 'Same x again.', out: '2' }] },
        { label: 'let INSIDE (fresh)', code: `(define f2\n  (lambda ()\n    (let ([x 0])\n      (begin (set! x (+ x 1)) x))))\n(f2)\n(f2)`, steps: [
          { line: [1, 2], frames: 'G: *f2=λ()@G', note: 'No let has run yet. f2 is a closure over G.' },
          { line: [5], frames: 'G: f2=λ()@G | call(G):  | let(call): *x=1', note: 'Each CALL runs the let, creating a brand-new x = 0, then increments it.', out: '1' },
          { line: [6], frames: 'G: f2=λ()@G | call(G):  | let(call): *x=1', note: 'A different, fresh x again. The old one is gone.', out: '1' }] },
      ],
    },
    'alias': {
      title: 'set! on an immutable list vs set-mcar! on a mutable pair',
      variants: [
        { label: 'cons + set!', code: `(define lst1 (cons 14 null))\n(define alias lst1)\n(set! lst1 (cons 42 null))\n(car alias)`, steps: [
          { line: [1], frames: 'G: *lst1=→ [14|╱]', note: 'lst1 points to a pair holding 14.' },
          { line: [2], frames: 'G: lst1=→ [14|╱]; *alias=→ same pair', note: 'alias points to the SAME pair.' },
          { line: [3], frames: 'G: *lst1=→ [42|╱] (new pair); alias=→ [14|╱]', note: 'set! makes the NAME lst1 point somewhere new. The old pair is untouched (cons cells are immutable).' },
          { line: [4], frames: 'G: lst1=→ [42|╱]; alias=→ [14|╱]', note: 'So aliasing never matters for immutable lists.', out: '14' }] },
        { label: 'mcons + set-mcar!', code: `(define mp (mcons 14 null))\n(define alias mp)\n(set-mcar! mp 42)\n(mcar alias)`, steps: [
          { line: [1], frames: 'G: *mp=→ {14|╱}', note: 'A mutable pair.' },
          { line: [2], frames: 'G: mp=→ {14|╱}; *alias=→ same pair', note: 'Two names, ONE pair.' },
          { line: [3], frames: 'G: mp=→ {*42|╱}; alias=→ same pair', note: 'set-mcar! changes the PAIR itself, so both names see it.' },
          { line: [4], frames: 'G: mp=→ {42|╱}; alias=→ same pair', note: 'Mutation + aliasing = surprises. This is exactly what the Wi22/Wi23 exam questions test.', out: '42' }] },
      ],
    },
    'promise': {
      title: 'Inside a promise (mcons #f thunk) → (mcons #t value)',
      code: `(define (my-delay th) (mcons #f th))\n(define (my-force p)\n  (if (mcar p)\n      (mcdr p)\n      (begin (set-mcar! p #t)\n             (set-mcdr! p ((mcdr p)))\n             (mcdr p))))\n(define p (my-delay (lambda () (* 6 7))))\n(my-force p)\n(my-force p)`,
      steps: [
        { line: [8], frames: 'G: *p=(mcons #f #<procedure>)', note: 'my-delay just pairs a "not done yet" flag with the thunk. Nothing is computed.' },
        { line: [9, 3], frames: 'G: p=(mcons #f #<procedure>)', note: 'First force: the flag (mcar) is #f, so take the else branch.' },
        { line: [5], frames: 'G: *p=(mcons #t #<procedure>)', note: 'Mark it as computed with set-mcar!…' },
        { line: [6], frames: 'G: *p=(mcons #t 42)', note: '…call the thunk ONCE and overwrite the mcdr with the answer.', out: '42' },
        { line: [10, 3, 4], frames: 'G: p=(mcons #t 42)', note: 'Second force: the flag is #t, so just return the cached mcdr. The thunk never runs again.', out: '42' }],
    },
    'lexical': {
      title: 'Lexical scope in the interpreter (MUPL closures)',
      code: `(mlet "y" (int 1)\n  (mlet "f" (fun #f "x" (add (var "x") (var "y")))\n    (mlet "y" (int 100)\n      (call (var "f") (int 5)))))`,
      steps: [
        { line: [1], frames: 'env: *y=(int 1)', note: 'eval-under-env conses ("y" . (int 1)) onto the environment.' },
        { line: [2], frames: 'env: y=(int 1); *f=λx@env', note: 'A fun evaluates to (closure env fun), which captures the CURRENT env, where y = 1.' },
        { line: [3], frames: 'env: *y=(int 100); f=λx@env; y=(int 1)', note: 'A new y is consed on the front. It shadows the old y for lookups in THIS env.' },
        { line: [4], frames: 'env: y=(int 100); f=λx@closure; y=(int 1) | closure: y=(int 1) | call(closure): *x=(int 5)', note: 'Call: the body is evaluated in the CLOSURE\'s env extended with x, NOT in the caller\'s env.' },
        { line: [2], frames: 'closure: y=(int 1) | call(closure): x=(int 5)', note: 'So y means 1.', out: '(int 6). With dynamic scope it would be (int 105).' }],
    },
  };

  // ---------- paren gallery (runs live) ----------
  function parenGallery() {
    const items = [
      ['(define (fact n) (if (= n 0) 1 (* n (fact (- n 1)))))\n(fact 5)', 'Correct.'],
      ['(define (fact-wrong1 n) (if (= n 0) (1) (* n (fact-wrong1 (- n 1)))))\n(fact-wrong1 5)', '(1) calls the number 1 as a function with zero arguments.'],
      ['(define (fact-wrong2 n) (if = n 0 1 (* n (fact-wrong2 (- n 1)))))', 'if gets 5 parts: a SYNTAX error, reported even without calling it.'],
      ['(define fact-wrong3 (n) (if (= n 0) 1 (* n (fact-wrong3 (- n 1)))))', 'Missing parens around the name: define sees an identifier plus 2 expressions.'],
      ['(define (fact-wrong4 n) (if (= n 0) 1 (* n fact-wrong4 (- n 1))))\n(fact-wrong4 3)', 'fact-wrong4 without parens is the function VALUE, passed to *.'],
      ['(define (fact-wrong5 n) (if (= n 0) 1 (* n ((fact-wrong5) (- n 1)))))\n(fact-wrong5 3)', '(fact-wrong5) calls it with zero arguments.'],
      ['(define (fact-wrong6 n) (if (= n 0) 1 (n * (fact-wrong6 (- n 1)))))\n(fact-wrong6 3)', 'n is used as a function (infix habit).'],
    ];
    const wrap = h('div', { class: 'widget' }, h('div', { class: 'w-title' }, '🧪 Parens always mean something: tap ▶ Run on each'));
    items.forEach(([code, why], idx) => {
      const why_el = h('div', { class: 'why small', hidden: true }, '💡 ' + why);
      wrap.append(h('div', { class: 'gallery-item' }, h('div', { class: 'small muted' }, idx === 0 ? 'baseline' : 'variant ' + idx), codeBlock(code, { onRun: () => { why_el.hidden = false; } }), why_el));
    });
    return wrap;
  }

  // ---------- AST viewer ----------
  function astViewer() {
    const input = h('input', { class: 'inp mono', value: '(define (cube x) (* x x x))', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' });
    const area = h('div', { class: 'astwrap' });
    function node(d) {
      if (d instanceof R.Pair) {
        const kids = []; let p = d; while (p instanceof R.Pair) { kids.push(p.car); p = p.cdr; }
        const head = kids[0] instanceof R.Sym ? kids[0].name : null;
        const special = head && KW.has(head);
        return h('div', { class: 'ast-node' }, h('div', { class: 'ast-label' + (special ? ' sf' : ' app') }, special ? 'special form: ' + head : head ? 'call: ' + head : '( … )'), h('div', { class: 'ast-kids' }, kids.map(node)));
      }
      return h('div', { class: 'ast-leaf mono' }, R.datum(d));
    }
    function draw() {
      area.innerHTML = '';
      try { R.read(R.cleanSource(input.value)).forEach(d => area.append(node(d))); }
      catch (e) { area.append(h('pre', { class: 'out-err' }, e.message)); }
    }
    input.addEventListener('input', draw); setTimeout(draw, 0);
    return h('div', { class: 'widget' }, h('div', { class: 'w-title' }, '🌳 Your code IS a tree'), h('div', { class: 'small muted' }, 'Edit the code: every ( … ) is a node, everything else is a leaf. Green nodes are special forms; blue nodes are function calls.'), input, area);
  }

  // ---------- thunk / eager / promise counter ----------
  function thunkCounter() {
    const slider = h('input', { type: 'range', min: 0, max: 5, value: 3, class: 'slider' });
    const label = h('b');
    const cols = h('div', { class: 'tc-cols' });
    const kinds = [
      ['Thunk', '(lambda () (slow))', (x) => x, 'Runs slow every time the value is used.'],
      ['Eager let', '(let ([v (slow)])\n  (lambda () v))', () => 1, 'Runs slow once, right away, even if never used.'],
      ['Promise', '(let ([p (my-delay slow)])\n  (lambda () (my-force p)))', (x) => (x > 0 ? 1 : 0), 'Runs slow at most once, and only if needed.'],
    ];
    function upd() {
      const x = +slider.value; label.textContent = x; cols.innerHTML = '';
      kinds.forEach(([name, code, f, note]) => {
        const n = f(x);
        cols.append(h('div', { class: 'tc-col' }, h('div', { class: 'tc-name' }, name), h('pre', { class: 'code tiny', html: highlight(code) }),
          h('div', { class: 'tc-dots' }, Array.from({ length: n }, (_, i) => h('span', { class: 'dot', style: `animation-delay:${i * 0.12}s` }))),
          h('div', { class: 'tc-n' }, `slow ran ${n}×`), h('div', { class: 'small muted' }, note)));
      });
    }
    slider.addEventListener('input', upd); setTimeout(upd, 0);
    return h('div', { class: 'widget' }, h('div', { class: 'w-title' }, '⏱ How many times does the expensive work run?'),
      h('pre', { class: 'code tiny', html: highlight('(my-mult x y-thunk) ; calls (y-thunk) x times') }),
      h('div', { class: 'row' }, h('span', null, 'x = '), label, slider), cols,
      h('div', { class: 'small' }, '🔗 Thunks help if a value is used 0 times, make no difference for 1, and hurt for many. Promises win in every case.'));
  }

  // ---------- memo widget ----------
  function memoWidget() {
    const slider = h('input', { type: 'range', min: 1, max: 25, value: 10, class: 'slider' });
    const outEl = h('div');
    function upd() {
      const n = +slider.value;
      let calls1 = 0; const f1 = (x) => { calls1++; return x <= 2 ? 1 : f1(x - 1) + f1(x - 2); }; const val = f1(n);
      let calls3 = 0; const memo = new Map(); const f3 = (x) => { calls3++; if (memo.has(x)) return memo.get(x); const r = x <= 2 ? 1 : f3(x - 1) + f3(x - 2); memo.set(x, r); return r; }; f3(n);
      const max = Math.max(calls1, calls3);
      const table = [...memo.entries()].reverse().slice(0, 6).map(([k, v]) => `(${k} . ${v})`).join(' ');
      outEl.innerHTML = '';
      outEl.append(h('div', null, `(fibonacci ${n}) = `, h('b', null, val)),
        h('div', { class: 'bar-row' }, h('span', { class: 'bar-l' }, 'fibonacci1'), h('div', { class: 'bar bad', style: `width:${Math.max(2, 100 * calls1 / max)}%` }), h('span', { class: 'bar-n' }, calls1 + ' calls')),
        h('div', { class: 'bar-row' }, h('span', { class: 'bar-l' }, 'fibonacci3'), h('div', { class: 'bar good', style: `width:${Math.max(2, 100 * calls3 / max)}%` }), h('span', { class: 'bar-n' }, calls3 + ' calls')),
        h('div', { class: 'small mono memo-table' }, 'memo = \'(' + table + (memo.size > 6 ? ' …' : '') + ')'));
    }
    slider.addEventListener('input', upd); setTimeout(upd, 0);
    return h('div', { class: 'widget' }, h('div', { class: 'w-title' }, '📒 Memoization: exponential → linear'), h('div', { class: 'row' }, h('span', null, 'n'), slider), outEl,
      h('div', { class: 'small' }, 'fibonacci3 checks its association list (memo) with assoc before computing, so each n is computed only once. The newest entries are at the front, because they are consed on.'));
  }

  // ---------- stream explorer (uses the real interpreter) ----------
  function streamExplorer() {
    const presets = [
      ['nats (0,1,2,…)', `(define s\n  (letrec ([f (lambda (x) (cons x (lambda () (f (+ x 1)))))])\n    (lambda () (f 0))))`],
      ['ones', `(define s (lambda () (cons 1 s)))`],
      ['powers of two', `(define s\n  (letrec ([f (lambda (x) (cons x (lambda () (f (* x 2)))))])\n    (lambda () (f 1))))`],
      ['number then string', `(define (s)\n  (letrec ([f (lambda (i) (cons i (lambda () (cons (number->string i) (lambda () (f (+ i 1)))))))])\n    (f 1)))`],
      ['✗ double thunk', `(define (s) (lambda () (cons 1 (s))))`],
      ['✗ forgot the thunk', `(define (s) (cons 1 (s)))`],
    ];
    const ta = h('textarea', { class: 'code-edit', rows: 4, spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' });
    ta.value = presets[0][1];
    const chain = h('div', { class: 'chain' });
    const exprEl = h('div', { class: 'mono small expr' });
    const msg = h('div', { class: 'small' });
    let thunk = null, path = '(s)', got = [];
    function reset() {
      chain.innerHTML = ''; got = []; msg.textContent = ''; path = '(s)'; thunk = null;
      const r = R.run(ta.value, { capture: (G) => { thunk = R.lookup(G, 's'); } });
      if (r.error) { msg.innerHTML = ''; msg.append(h('pre', { class: 'out-err' }, r.error)); thunk = null; return; }
      if (!thunk) { msg.textContent = 'Define a stream called s.'; return; }
      chain.append(h('div', { class: 'pair thunk' }, 'λ', h('div', { class: 'small muted' }, 's')));
      exprEl.textContent = 'Next: call (s)';
    }
    function step() {
      if (!thunk) return reset();
      if (got.length >= 12) { msg.textContent = 'That is enough: the stream is infinite, we only compute what we ask for.'; return; }
      const res = R.call(thunk, []);
      chain.lastChild && chain.lastChild.classList.contains('thunk') && chain.lastChild.remove();
      if (res.error) { msg.innerHTML = ''; msg.append(h('pre', { class: 'out-err' }, res.error), h('div', null, res.error.includes('memory') ? '💥 Calling the thunk recursed forever: the rest of the stream was not delayed.' : '')); thunk = null; return; }
      const v = res.value;
      if (!(v instanceof R.Pair)) {
        msg.innerHTML = ''; msg.append(h('div', { class: 'bad-t' }, `✗ Calling the stream returned ${R.printValue(v)}, not a pair! ` + (v instanceof R.Closure ? 'That is a double thunk.' : '')));
        thunk = null; return;
      }
      got.push(R.printValue(v.car));
      exprEl.textContent = `(car ${path}) = ${R.printValue(v.car)}`;
      chain.append(h('div', { class: 'pair' }, h('span', { class: 'pcar mono' }, R.printValue(v.car)), h('span', { class: 'pcdr' }, '•')), h('span', { class: 'arrow' }, '→'));
      if (!(v.cdr instanceof R.Closure || v.cdr instanceof R.Prim)) { msg.textContent = 'The cdr is not a thunk, so this is not a stream.'; thunk = null; return; }
      thunk = v.cdr; path = `((cdr ${path}))`;
      chain.append(h('div', { class: 'pair thunk' }, 'λ', h('div', { class: 'small muted' }, 'not called yet')));
      msg.textContent = 'Values so far: ' + got.join(', ');
    }
    const chips = h('div', { class: 'chips' }, presets.map(([n, c]) => h('button', { class: 'chip', onclick: () => { ta.value = c; reset(); } }, n)));
    setTimeout(reset, 0);
    return h('div', { class: 'widget' }, h('div', { class: 'w-title' }, '🌊 Stream explorer: pull values one at a time'), chips, ta,
      h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: reset }, '↺ Reset'), h('button', { class: 'btn small primary', onclick: step }, 'Call the thunk ▶')),
      exprEl, h('div', { class: 'chainwrap' }, chain), msg,
      h('div', { class: 'small muted' }, 'A stream is a thunk. Each call gives a pair [value | next thunk]. The consumer decides how many values to ask for.'));
  }

  // ---------- macro expander ----------
  const MACRO_PRESETS = [
    { name: 'my-if', def: `(define-syntax my-if\n  (syntax-rules (then else)\n    [(my-if e1 then e2 else e3) (if e1 e2 e3)]))`, use: `(my-if (> 3 2) then "yes" else (car null))`, note: 'The literals then/else must appear exactly. The expansion is a real if, so (car null) never runs.' },
    { name: 'comment-out', def: `(define-syntax comment-out\n  (syntax-rules ()\n    [(comment-out ignore instead) instead]))`, use: `(comment-out (car null) #f)`, note: 'The first argument disappears completely, before anything runs.' },
    { name: 'my-delay', def: `(define-syntax my-delay\n  (syntax-rules ()\n    [(my-delay e) (mcons #f (lambda () e))]))`, use: `(my-delay (begin (print "hi") (* 3 4)))`, note: 'The macro adds the thunk for you, so nothing prints yet.' },
    { name: 'dbl (repeats!)', def: `(define-syntax dbl\n  (syntax-rules ()\n    [(dbl x) (+ x x)]))`, use: `(dbl (begin (println "Yo!") 42))`, note: 'x is pasted TWICE, so "Yo!" prints twice.' },
    { name: 'take (order!)', def: `(define-syntax take\n  (syntax-rules (from)\n    [(take e1 from e2) (- e2 e1)]))`, use: `(take (begin (print "a") 1) from (begin (print "b") 10))`, note: 'e2 ends up evaluated before e1.' },
    { name: 'hygiene: y', def: `(define-syntax dbl\n  (syntax-rules ()\n    [(dbl x) (let ([y 1]) (* 2 x y))]))`, use: `(let ([y 7]) (dbl y))`, note: 'The macro\'s y is renamed (y₁), so it cannot capture the user\'s y. Compare the naive result!' },
    { name: 'hygiene: *', def: `(define-syntax dbl\n  (syntax-rules ()\n    [(dbl x) (* 2 x)]))`, use: `(let ([* +]) (dbl 42))`, note: 'The * in the template refers to * where the MACRO was defined, not the user\'s local *.' },
    { name: 'swap!', def: `(define-syntax swap!\n  (syntax-rules ()\n    [(swap! a b) (let ([tmp a]) (set! a b) (set! b tmp))]))`, use: `(let ([tmp 1] [y 2]) (swap! tmp y) (list tmp y))`, note: 'Naive expansion breaks when the user also has a tmp. Hygiene saves it.' },
    { name: 'my-let* (recursive)', def: `(define-syntax my-let*\n  (syntax-rules ()\n    [(my-let* () body) body]\n    [(my-let* ([var0 val0] [var-rest val-rest] ...) body)\n     (let ([var0 val0])\n       (my-let* ([var-rest val-rest] ...) body))]))`, use: `(my-let* ([a 5] [b (+ a 1)] [c (* b 2)]) (list a b c))`, note: 'Each step peels off one binding into a let, until no bindings are left.' },
  ];
  function macroExplorer() {
    const defTa = h('textarea', { class: 'code-edit', rows: 4, spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' });
    const useIn = h('textarea', { class: 'code-edit', rows: 2, spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' });
    const note = h('div', { class: 'small muted' });
    const res = h('div', { class: 'mx-res' });
    function load(p) { defTa.value = p.def; useIn.value = p.use; note.textContent = p.note; go(); }
    function go() {
      res.innerHTML = '';
      let info;
      try { info = R.expandInfo(defTa.value, useIn.value); }
      catch (e) { res.append(h('pre', { class: 'out-err' }, e.message)); return; }
      if (info.bindings.length) {
        res.append(h('div', { class: 'mx-h' }, '① Pattern variables matched:'));
        res.append(h('table', { class: 'mx-tbl' }, info.bindings.map(([k, v]) => h('tr', null, h('td', { class: 'mono' }, k), h('td', null, '→'), h('td', { class: 'mono' }, v)))));
      }
      res.append(h('div', { class: 'mx-h' }, info.steps.length > 1 ? `② Expansion steps (${info.steps.length}):` : '② Template filled in (the expansion):'));
      info.steps.forEach((s, i) => res.append(h('pre', { class: 'code small', html: (info.steps.length > 1 ? `<span class="muted">${i + 1}.</span> ` : '') + highlight(s) })));
      if (/⟦/.test(info.hygienic || '')) res.append(h('div', { class: 'small hyg' }, h('span', { class: 't-ren' }, 'renamed'), ' identifiers were introduced by the macro. Racket renames them so they cannot clash with your variables (hygiene).'));
      const runSrc = defTa.value + '\n' + useIn.value;
      const real = R.run(runSrc);
      res.append(h('div', { class: 'mx-h' }, '③ Run it (hygienic, real Racket behaviour):'), h('pre', { class: real.error ? 'out-err' : 'out-text' }, (real.output || '') + (real.error || '')));
      const naive = info.naive ? R.run(info.naive) : null;
      if (naive && ((naive.output || '') + (naive.error || '')) !== ((real.output || '') + (real.error || ''))) {
        res.append(h('div', { class: 'mx-h' }, '✗ What a naive (C-style, unhygienic) expansion would do:'), h('pre', { class: 'code small', html: highlight(info.naive) }), h('pre', { class: naive.error ? 'out-err' : 'out-text' }, (naive.output || '') + (naive.error || '')));
      }
    }
    const chips = h('div', { class: 'chips' }, MACRO_PRESETS.map(p => h('button', { class: 'chip', onclick: () => load(p) }, p.name)));
    setTimeout(() => load(MACRO_PRESETS[0]), 0);
    return h('div', { class: 'widget' }, h('div', { class: 'w-title' }, '🔁 Macro expander: see the rewrite before it runs'), chips,
      h('div', { class: 'small b' }, 'Macro definition'), defTa, h('div', { class: 'small b' }, 'Use'), useIn,
      h('button', { class: 'btn small primary', onclick: go }, 'Expand ▶'), note, res);
  }

  // ---------- C preprocessor expander ----------
  function cppExpander() {
    const cases = [
      ['#define POW2_BAD(x) x*x', 'POW2_BAD(9 + 1)', '9 + 1*9 + 1', '19 (not 100!)'],
      ['#define POW2_GOOD(x) ((x)*(x))', 'POW2_GOOD(9 + 1)', '((9 + 1)*(9 + 1))', '100'],
      ['#define ADD(x, y) x + y', 'ADD(1, 2 * 3) * 4', '1 + 2 * 3 * 4', '25 (not 28)'],
      ['#define DOUBLE(x) (x + x)', 'DOUBLE(foo())', '(foo() + foo())', 'foo() is CALLED TWICE'],
      ['int a = 4;\n#define BAD_INCR(x) { int a = 0; x += 1; }', 'BAD_INCR(a);', '{ int a = 0; a += 1; }', 'outer a is still 4: the macro\'s a captured it'],
    ];
    const wrap = h('div', { class: 'widget' }, h('div', { class: 'w-title' }, '✂ C preprocessor = dumb search & replace. Tap to expand'));
    cases.forEach(([d, use, exp, val]) => {
      const res = h('div', { class: 'cpp-res', hidden: true }, h('div', { class: 'mono' }, '→ ' + exp), h('div', { class: 'small' }, '= ' + val));
      wrap.append(h('div', { class: 'cpp-case', onclick: () => { res.hidden = !res.hidden; } }, h('pre', { class: 'code tiny' }, d), h('div', { class: 'mono b' }, use), res));
    });
    wrap.append(h('div', { class: 'small' }, '🔗 Racket macros fix all three problems: parens make associativity explicit, macros work on tokens/trees not text, and hygiene prevents capture. They do NOT stop repeated evaluation; you still need a let for that.'));
    return wrap;
  }

  // ---------- LBI evaluation tree ----------
  const LBI_DEFS = `(struct const (int) #:transparent)
(struct bool (b) #:transparent)
(struct negate (e1) #:transparent)
(struct add (e1 e2) #:transparent)
(struct multiply (e1 e2) #:transparent)
(struct eq-num (e1 e2) #:transparent)
(struct if-then-else (e1 e2 e3) #:transparent)`;
  function lbiTree() {
    const presets = [
      ['good', '(multiply (negate (add (const 2) (const 2))) (const 7))'],
      ['if', '(if-then-else (eq-num (const 3) (add (const 1) (const 2))) (const 10) (const 20))'],
      ['type error', '(multiply (negate (add (const 2) (const 2))) (if-then-else (bool #f) (const 7) (bool #t)))'],
      ['bad if test', '(if-then-else (const 5) (bool #t) (const 7))'],
    ];
    const input = h('textarea', { class: 'code-edit', rows: 2, spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' });
    input.value = presets[0][1];
    let checked = true;
    const seg = h('div', { class: 'seg' }, h('button', { class: 'seg-b on', onclick: (e) => setMode(true, e) }, 'checked interpreter'), h('button', { class: 'seg-b', onclick: (e) => setMode(false, e) }, 'no checks'));
    const svgWrap = h('div', { class: 'treewrap' });
    const log = h('div', { class: 'small mono tree-log' });
    const counter = h('span', { class: 'small muted' });
    let steps = [], k = 0, root = null;
    function setMode(c, e) { checked = c; [...seg.children].forEach(b => b.classList.remove('on')); e.target.classList.add('on'); build(); }
    function build() {
      let v; const r = R.run(LBI_DEFS + '\n' + input.value);
      if (r.error) { svgWrap.innerHTML = ''; log.innerHTML = ''; log.append(h('pre', { class: 'out-err' }, r.error)); return; }
      v = r.results[r.results.length - 1];
      let id = 0;
      const mk = (val) => {
        if (!(val instanceof R.StructVal)) return { id: id++, label: R.printValue(val), leaf: true, kids: [] };
        const leafy = val.vals.filter(x => !(x instanceof R.StructVal));
        return { id: id++, label: val.type.name + (leafy.length ? ' ' + leafy.map(R.printValue).join(' ') : ''), type: val.type.name, raw: val, kids: val.vals.filter(x => x instanceof R.StructVal).map(mk) };
      };
      root = mk(v);
      steps = []; const P = R.printValue;
      // evaluate (records steps); mirrors eval-exp-with-bools (checked) or the unchecked version
      const err = (node, m) => { steps.push({ node, err: m }); throw { lbi: true }; };
      const isC = (x) => x && x.type && x.type.name === 'const', isB = (x) => x && x.type && x.type.name === 'bool';
      const mkC = (n) => ({ type: { name: 'const' }, vals: [n] }), mkB = (b) => ({ type: { name: 'bool' }, vals: [b] });
      const show = (x) => x.type ? `(${x.type.name} ${P(x.vals[0])})` : P(x);
      const num = (node, x, who) => { if (isC(x)) return x.vals[0]; if (checked) err(node, `${who} applied to non-number`); err(node, `const-int: contract violation\n  expected: const?\n  given: ${show(x)}   ← a RACKET error, not an LBI one`); };
      function ev(node) {
        const t = node.type; let res;
        steps.push({ node, start: true });
        if (t === 'const' || t === 'bool') res = t === 'const' ? mkC(node.raw.vals[0]) : mkB(node.raw.vals[0]);
        else if (t === 'negate') res = mkC(-num(node, ev(node.kids[0]), 'negate'));
        else if (t === 'add' || t === 'multiply' || t === 'eq-num') {
          const a = ev(node.kids[0]), b = ev(node.kids[1]);
          const x = num(node, a, t), y = num(node, b, t);
          res = t === 'add' ? mkC(x + y) : t === 'multiply' ? mkC(x * y) : mkB(x === y);
        } else if (t === 'if-then-else') {
          const c = ev(node.kids[0]);
          if (!isB(c)) { if (checked) err(node, 'if-then-else applied to non-boolean'); err(node, `bool-b: contract violation\n  expected: bool?\n  given: ${show(c)}   ← a RACKET error`); }
          res = ev(node.kids[c.vals[0] ? 1 : 2]);
        } else err(node, 'unknown expression');
        steps.push({ node, val: show(res) });
        return res;
      }
      try { ev(root); } catch (e) { if (!e.lbi) throw e; }
      k = 0; render();
    }
    function layout(n, depth, x0) { // returns width; sets n.x n.y
      n.y = depth;
      if (!n.kids.length) { n.x = x0; return 1; }
      let x = x0; n.kids.forEach(c => { x += layout(c, depth + 1, x); });
      n.x = (n.kids[0].x + n.kids[n.kids.length - 1].x) / 2; return x - x0;
    }
    function render() {
      if (!root) return;
      const width = layout(root, 0, 0);
      const all = []; const walk = (n) => { all.push(n); n.kids.forEach(walk); }; walk(root);
      const depth = Math.max(...all.map(n => n.y));
      const CW = 112, RH = 64, W = Math.max(320, width * CW + 20), H = (depth + 1) * RH + 30;
      const state = {}; let errInfo = null;
      for (let i = 0; i <= k && i < steps.length; i++) { const s = steps[i]; if (s.start) state[s.node.id] = { active: true }; if (s.val) state[s.node.id] = { val: s.val }; if (s.err) { state[s.node.id] = { err: true }; errInfo = s.err; } }
      const curStep = steps[k];
      let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="treesvg">`;
      const X = (n) => 10 + n.x * CW + CW / 2, Y = (n) => 20 + n.y * RH;
      all.forEach(n => n.kids.forEach(c => { svg += `<line x1="${X(n)}" y1="${Y(n) + 14}" x2="${X(c)}" y2="${Y(c) - 14}" class="tr-edge"/>`; }));
      all.forEach(n => {
        const st = state[n.id] || {}; const isCur = curStep && curStep.node === n;
        const cls = st.err ? 'tr-err' : st.val ? 'tr-done' : st.active ? 'tr-act' : 'tr-idle';
        const text = st.val ? st.val : n.label;
        svg += `<rect x="${X(n) - 52}" y="${Y(n) - 14}" width="104" height="28" rx="8" class="tr-node ${cls}${isCur ? ' tr-cur' : ''}"/><text x="${X(n)}" y="${Y(n)}" text-anchor="middle" dominant-baseline="central" class="tr-t">${esc(text.length > 16 ? text.slice(0, 15) + '…' : text)}</text>`;
      });
      svgWrap.innerHTML = svg + '</svg>';
      counter.textContent = `step ${Math.min(k + 1, steps.length)} / ${steps.length}`;
      log.innerHTML = '';
      if (curStep) {
        if (curStep.start) log.textContent = `eval: ${curStep.node.label.split(' ')[0]} … (evaluate its subexpressions first)`;
        if (curStep.val) log.textContent = `${curStep.node.label.split(' ')[0]} ⇒ ${curStep.val}`;
      }
      if (errInfo) log.append(h('pre', { class: 'out-err' }, 'ERROR: ' + errInfo));
    }
    const chips = h('div', { class: 'chips' }, presets.map(([n, c]) => h('button', { class: 'chip', onclick: () => { input.value = c; build(); } }, n)));
    setTimeout(build, 0);
    return h('div', { class: 'widget' }, h('div', { class: 'w-title' }, '🌲 Watch the interpreter evaluate an AST'), chips, input, seg,
      h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => { k = Math.max(0, k - 1); render(); } }, '◀'), counter, h('button', { class: 'btn small primary', onclick: () => { k = Math.min(steps.length - 1, k + 1); render(); } }, 'Step ▶'), h('button', { class: 'btn small', onclick: () => { k = steps.length - 1; render(); } }, 'End ⏭'), h('button', { class: 'btn small', onclick: build }, '↺')),
      h('div', { class: 'treescroll' }, svgWrap), log,
      h('div', { class: 'small muted' }, 'Children are evaluated before their parent (recursion). Every result is an LBI VALUE like (const 4), not a Racket number. Try "type error" in both modes.'));
  }

  // ---------- free variables game ----------
  function freeVarsGame() {
    const presets = ['(lambda () (+ x y z))', '(lambda (x) (+ x y z))', '(lambda (x) (if x y z))', '(lambda (x) (let ([y 0]) (+ x y z)))', '(lambda (x y z) (+ x y z))', '(lambda (x) (+ y (let ([y z]) (+ y y))))', '(lambda (f) (lambda (y) (f x y)))', '(lambda (a) (let* ([b a] [c b]) (+ c d)))', '(lambda (n) (letrec ([g (lambda (k) (g (- k n)))]) (g m)))'];
    let idx = 0; const marked = new Set(); let tokens = [];
    const exprEl = h('div', { class: 'fv-expr mono' });
    const fb = h('div', { class: 'small' });
    const prims = new Set(['+', '-', '*', '/', '=', '<', '>', 'if', 'let', 'let*', 'letrec', 'lambda', 'cond', 'else', 'define']);
    function freeOf(d) { // returns Set of free var names at each occurrence (by token index via identity)
      const free = new Set(); const occ = [];
      function walk(x, bound) {
        if (x instanceof R.Sym) { occ.push({ sym: x, free: !bound.has(x.name) && !prims.has(x.name) }); if (!bound.has(x.name) && !prims.has(x.name)) free.add(x.name); return; }
        if (!(x instanceof R.Pair)) return;
        const a = []; let p = x; while (p instanceof R.Pair) { a.push(p.car); p = p.cdr; }
        const hd = a[0] instanceof R.Sym ? a[0].name : null;
        if (hd === 'lambda') {
          occ.push({ sym: a[0], free: false });
          const ps = []; let q = a[1]; while (q instanceof R.Pair) { ps.push(q.car.name); occ.push({ sym: q.car, free: false, binder: true }); q = q.cdr; }
          const nb = new Set([...bound, ...ps]); a.slice(2).forEach(b => walk(b, nb)); return;
        }
        if (hd === 'let' || hd === 'let*' || hd === 'letrec') {
          occ.push({ sym: a[0], free: false });
          let nb = new Set(bound); const bs = []; let q = a[1]; while (q instanceof R.Pair) { bs.push(q.car); q = q.cdr; }
          if (hd === 'letrec') bs.forEach(b => nb.add(b.car.name));
          bs.forEach(b => { occ.push({ sym: b.car, free: false, binder: true }); walk(b.cdr.car, hd === 'let' ? bound : nb); if (hd === 'let*') nb = new Set([...nb, b.car.name]); });
          if (hd === 'let') bs.forEach(b => nb.add(b.car.name));
          a.slice(2).forEach(b => walk(b, nb)); return;
        }
        a.forEach(b => walk(b, bound));
      }
      walk(d, new Set());
      return { free, occ };
    }
    function load() {
      marked.clear(); fb.textContent = '';
      const src = presets[idx];
      const d = R.read(src)[0];
      const { free, occ } = freeOf(d);
      exprEl.innerHTML = '';
      // rebuild the text with tappable identifiers, in reading order
      let oi = 0; tokens = [];
      const parts = src.split(/(\s+|[()\[\]])/).filter(s => s !== '');
      parts.forEach(t => {
        if (/^\s+$/.test(t) || /^[()\[\]]$/.test(t)) { exprEl.append(t); return; }
        const isNum = /^-?\d/.test(t);
        const info = isNum ? {} : (occ[oi++] || {});
        const isIdent = !isNum && !prims.has(t);
        const span = h('span', { class: isIdent ? 'fv-tok' + (info.binder ? ' binder' : '') : 'fv-fixed' }, t);
        if (isIdent && !info.binder) { span.addEventListener('click', () => { span.classList.toggle('on'); }); tokens.push({ span, free: info.free, name: t }); }
        exprEl.append(span);
      });
      exprEl.dataset.answer = [...free].sort().join(', ');
    }
    function check() {
      let ok = true;
      tokens.forEach(t => { const on = t.span.classList.contains('on'); t.span.classList.remove('right', 'wrong'); if (on !== t.free) { ok = false; t.span.classList.add('wrong'); } else if (t.free) t.span.classList.add('right'); });
      fb.innerHTML = (ok ? '✅ Correct! ' : '❌ Not quite (red = wrong). ') + 'Free variables: <b>{' + (exprEl.dataset.answer || '') + '}</b>';
    }
    setTimeout(load, 0);
    return h('div', { class: 'widget' }, h('div', { class: 'w-title' }, '🎯 Tap every FREE variable occurrence'), h('div', { class: 'small muted' }, 'A variable is free if it is not bound by an enclosing lambda parameter or let. Underlined names are binders. (Ignore + etc.)'),
      exprEl, h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => { idx = (idx + presets.length - 1) % presets.length; load(); } }, '◀'), h('button', { class: 'btn small primary', onclick: check }, 'Check'), h('button', { class: 'btn small', onclick: () => { idx = (idx + 1) % presets.length; load(); } }, 'Next ▶')), fb);
  }

  // ---------- soundness / completeness diagram ----------
  function venn() {
    const progs = [
      { t: '1 + 2', bad: false }, { t: '3 + "hi"', bad: true }, { t: 'if true then 0 else 4/"hi"', bad: false },
      { t: 'x (unbound)', bad: true }, { t: 'let f1 x = 4/"hi" (never called)', bad: false }, { t: '(fun x -> x) 5', bad: false }, { t: '"a" ^ 7', bad: true }, { t: 'f (if true then 1 else "hi")', bad: false },
    ];
    const systems = [
      ['Typical (OCaml)', (p) => !p.bad && !/if true|never|f \(if/.test(p.t), 'Sound (no bad program accepted) but INCOMPLETE: it rejects some harmless programs (false positives).'],
      ['Accept everything', () => true, 'Complete (no false positives), but UNSOUND: bad programs get through (false negatives).'],
      ['Buggy checker', (p) => p.t === '1 + 2' || p.t === '"a" ^ 7' || p.t === '(fun x -> x) 5', 'Unsound AND incomplete: rejects some harmless programs and accepts a bad one.'],
      ['Reject everything', () => false, 'Sound (trivially!) but useless and very incomplete.'],
      ['Perfect?', (p) => !p.bad, 'Sound AND complete. Impossible for an always-terminating checker on a Turing-complete language (undecidability).'],
    ];
    let si = 0;
    const list = h('div', { class: 'venn-list' });
    const verdict = h('div', { class: 'venn-verdict' });
    const seg = h('div', { class: 'seg wrap' });
    function draw() {
      const [name, acc, why] = systems[si];
      list.innerHTML = '';
      let fn = 0, fp = 0;
      progs.forEach(p => {
        const a = acc(p);
        const kind = p.bad ? (a ? 'false negative ✗ (unsound)' : 'correctly rejected') : (a ? 'correctly accepted' : 'false positive (incomplete)');
        if (p.bad && a) fn++; if (!p.bad && !a) fp++;
        list.append(h('div', { class: 'vp ' + (p.bad ? 'vbad' : 'vgood') + (a ? ' acc' : ' rej') }, h('span', { class: 'mono' }, p.t), h('span', { class: 'vtag' }, (a ? 'accepted' : 'rejected') + ' · ' + kind)));
      });
      verdict.innerHTML = `<b>${esc(name)}</b>: ${fn ? 'NOT sound' : 'sound'}, ${fp ? 'NOT complete' : 'complete'}.<br>${esc(why)}`;
    }
    systems.forEach((s, i) => seg.append(h('button', { class: 'seg-b' + (i === 0 ? ' on' : ''), onclick: (e) => { si = i; [...seg.children].forEach(b => b.classList.remove('on')); e.target.classList.add('on'); draw(); } }, s[0])));
    setTimeout(draw, 0);
    return h('div', { class: 'widget' }, h('div', { class: 'w-title' }, '⚖️ Sound vs complete: pick a type checker'), h('div', { class: 'small' }, 'X = "misuse a primitive / unbound variable". ', h('span', { class: 'vbad-chip' }, 'red'), ' programs CAN do X; ', h('span', { class: 'vgood-chip' }, 'green'), ' ones never do. Faded = rejected.'), seg, verdict, list,
      h('div', { class: 'small' }, '<b>Remember:</b> sound = never accepts a red one (no false negatives). Complete = never rejects a green one (no false positives).'.replace(/<\/?b>/g, '')));
  }

  // ---------- claims sorter ----------
  function claimsGame() {
    const claims = [
      ['Lets you build a list of numbers and strings, or return a number OR a string, with no extra types.', 'dynamic', '1A'],
      ['Code can assume data has the right type, with no number? checks cluttering it.', 'static', '1B'],
      ['Every sound type system forbids some programs that do nothing wrong.', 'dynamic', '2A'],
      ['You only pay for tags where you need them (variants), not on every value.', 'static', '2B'],
      ['Simple bugs are caught as soon as you compile, so you never test for them.', 'static', '3A'],
      ['It only catches easy bugs, and you have to test anyway.', 'dynamic', '3B'],
      ['No tags to store or check at run time, so it is faster.', 'static', '4A'],
      ['Optimizers remove most tag checks, and you do not code around the type system.', 'dynamic', '4B'],
      ['Cons cells for everything means one library works on all your data.', 'dynamic', '5A'],
      ['Generics + subtyping give reuse, and separate types stop you confusing what represents what.', 'static', '5B'],
      ['Run incomplete programs while prototyping. No premature commitments.', 'dynamic', '6A'],
      ['Types document your evolving data-structure decisions.', 'static', '6B'],
      ['Make a function accept more (int OR string) without touching old callers.', 'dynamic', '7A'],
      ['Change a type and get a TODO list of everything that must change.', 'static', '7B'],
    ];
    let i = 0, score = 0;
    const card = h('div', { class: 'claim-card' });
    const fb = h('div', { class: 'small' });
    const prog = h('div', { class: 'small muted' });
    const btnS = h('button', { class: 'btn', onclick: () => ans('static') }, '🔒 Static');
    const btnD = h('button', { class: 'btn', onclick: () => ans('dynamic') }, '🌀 Dynamic');
    function show() {
      if (i >= claims.length) { card.textContent = `Done! ${score} / ${claims.length}`; btnS.hidden = btnD.hidden = true; fb.append(h('button', { class: 'btn small', onclick: () => { i = 0; score = 0; btnS.hidden = btnD.hidden = false; fb.textContent = ''; show(); } }, 'Again')); return; }
      card.textContent = '“' + claims[i][0] + '”'; prog.textContent = `${i + 1} / ${claims.length}: this argues for…`;
    }
    function ans(a) {
      const [, right, tag] = claims[i]; const ok = a === right; if (ok) score++;
      fb.innerHTML = (ok ? '✅ ' : '❌ ') + `Claim ${tag}: an argument for <b>${right}</b> typing.`;
      i++; setTimeout(show, 50);
    }
    setTimeout(show, 0);
    return h('div', { class: 'widget' }, h('div', { class: 'w-title' }, '🥊 Static or dynamic? Sort the 14 claims'), prog, card, h('div', { class: 'row center' }, btnS, btnD), fb);
  }

  // ---------- workflow diagram ----------
  function workflow() {
    const steps = [['"x ) y / z"', 'concrete syntax: a string'], ['Parser', 'rejects syntax errors'], ['AST', 'a tree (in Racket: structs)'], ['Type checker', 'optional: rejects type errors statically'], ['Interpreter or Compiler', 'runs it, or translates it to language T']];
    return h('div', { class: 'widget flow' }, h('div', { class: 'w-title' }, '🏭 Standard language-implementation workflow'),
      steps.map(([a, b], i) => [h('div', { class: 'flow-box' + (i === 2 ? ' hl' : '') }, h('b', null, a), h('div', { class: 'small muted' }, b)), i < steps.length - 1 ? h('div', { class: 'flow-arrow' }, '↓') : null]),
      h('div', { class: 'small' }, 'In this course we SKIP parsing by writing LBI programs directly as ASTs (structs) in Racket, the metalanguage.'));
  }

  window.Viz = { h, esc, highlight, codeBlock, boxDiagram, STEPS,
    widgets: {
      stepper: (name) => stepper(STEPS[name]),
      box: boxPlayground, parens: parenGallery, ast: astViewer, thunks: thunkCounter, memo: memoWidget,
      streams: streamExplorer, macro: macroExplorer, cpp: cppExpander, lbi: lbiTree, freevars: freeVarsGame,
      venn, claims: claimsGame, workflow,
    } };
})();
