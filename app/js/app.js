// app.js: navigation, lessons, practice engine, map, playground, flash cards. Works fully offline.
(function () {
  'use strict';
  const { h, highlight, codeBlock } = window.Viz;
  const R = window.Racket;
  const TOPICS = window.TOPICS, QUESTIONS = window.QUESTIONS, PRELUDES = window.PRELUDES;
  const topicById = Object.fromEntries(TOPICS.map(t => [t.id, t]));
  const qById = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));
  const main = document.getElementById('main');

  // ---------- storage (works even if localStorage is blocked) ----------
  const mem = {};
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return mem[k] ?? d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { mem[k] = v; } },
  };
  const P = store.get('rr.progress', { q: {}, read: {}, known: {} });
  const save = () => store.set('rr.progress', P);
  function record(id, ok) { const r = P.q[id] || { n: 0 }; r.n++; r.ok = ok; r.t = Date.now(); P.q[id] = r; save(); }
  const topicQs = (tid) => QUESTIONS.filter(q => q.topic === tid);
  const statsFor = (qs) => ({ total: qs.length, tried: qs.filter(q => P.q[q.id]).length, ok: qs.filter(q => P.q[q.id] && P.q[q.id].ok).length });

  // ---------- helpers ----------
  const preludeOf = (q) => [].concat(q.prelude || []).map(k => PRELUDES[k]).join('\n');
  const pct = (a, b) => (b ? Math.round(100 * a / b) : 0);
  function bar(value, cls = '') { return h('div', { class: 'pbar ' + cls }, h('div', { style: `width:${value}%` })); }
  const normAns = (s) => R.cleanSource(String(s)).trim().replace(/\s+/g, ' ').replace(/^'/, '').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').toLowerCase();
  function answerMatches(input, part) {
    const u = normAns(input); if (!u) return false;
    if (part.a === 'error') return /err|fail|exception/.test(u);
    if (part.nonterm) return /loop|infinite|never|forever|terminat|memory|hang|doesn.?t end|does not end/.test(u);
    const accepted = [part.a, ...(part.alt || [])];
    for (const a of accepted) {
      const e = normAns(a);
      if (u === e) return true;
      if (/\n|""/.test(a) && u.replace(/\s/g, '') === e.replace(/\s/g, '')) return true;
    }
    return false;
  }
  function srcBadge(q) { return q.src ? h('span', { class: 'src' + (/final|midterm/i.test(q.src) ? ' exam' : '') }, q.src) : null; }
  function mdInline(s) { // `code` and **bold** in prompts
    return Viz.esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  }

  // ---------- question renderer ----------
  function renderQuestion(q, opts = {}) {
    const card = h('div', { class: 'qcard' + (opts.inline ? ' inline' : '') });
    const head = h('div', { class: 'qhead' }, h('span', { class: 'qtype t-' + q.type }, { predict: 'Predict', mcq: 'Choose', write: 'Write code', explain: 'Explain' }[q.type]), srcBadge(q),
      P.q[q.id] ? h('span', { class: 'qprev ' + (P.q[q.id].ok ? 'ok' : 'bad') }, P.q[q.id].ok ? '✓ done before' : '✗ missed before') : null);
    card.append(head, h('div', { class: 'qtext', html: mdInline(q.q) }));
    const pre = preludeOf(q);
    if (pre && q.type !== 'write') {
      const box = h('pre', { class: 'code small', hidden: true, html: highlight(pre) });
      card.append(h('button', { class: 'link small', onclick: () => { box.hidden = !box.hidden; } }, '⊕ show helper definitions'), box);
    }
    if (q.code && q.code.trim()) card.append(h('pre', { class: 'code', html: highlight(q.code) }));
    const fb = h('div', { class: 'qfb' });
    const done = (ok) => { record(q.id, ok); if (opts.onAnswer) opts.onAnswer(ok); };
    const explainEl = () => q.explain ? h('div', { class: 'explain', html: '💡 ' + mdInline(q.explain) }) : null;

    if (q.type === 'mcq') {
      const opts_ = h('div', { class: 'opts' });
      q.options.forEach((o, i) => opts_.append(h('button', { class: 'opt', onclick: (e) => {
        if (opts_.dataset.done) return; opts_.dataset.done = '1';
        const ok = i === q.answer;
        [...opts_.children].forEach((b, j) => { if (j === q.answer) b.classList.add('right'); else if (j === i) b.classList.add('wrong'); b.disabled = true; });
        fb.innerHTML = ''; fb.append(h('div', { class: ok ? 'good-t' : 'bad-t' }, ok ? '✅ Correct' : '❌ Not quite'), explainEl());
        done(ok);
      } }, h('span', { class: 'optl' }, String.fromCharCode(65 + i)), h('span', { html: mdInline(o) }))));
      card.append(opts_, fb);
    }

    if (q.type === 'predict') {
      const rows = q.parts.map((p) => {
        const inp = h('input', { class: 'inp mono', placeholder: 'value, error, or loops forever', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off', autocomplete: 'off' });
        const res = h('div', { class: 'pres' });
        const row = h('div', { class: 'prow' }, h('div', { class: 'pask', html: highlight(p.ask) }), h('div', { class: 'parrow' }, '⇒'), inp, res);
        return { p, inp, res, row };
      });
      const tbl = h('div', { class: 'parts' }, rows.map(r => r.row));
      const runOut = h('div', { class: 'run-out', hidden: true });
      const check = h('button', { class: 'btn primary', onclick: () => {
        let all = true;
        rows.forEach(({ p, inp, res, row }) => {
          const ok = answerMatches(inp.value, p); all = all && ok;
          row.classList.toggle('right', ok); row.classList.toggle('wrong', !ok);
          res.innerHTML = '';
          res.append(h('span', { class: ok ? 'good-t' : 'bad-t' }, ok ? '✓ ' : '✗ '), h('span', { class: 'mono ans' }, p.a === 'error' ? 'error' + (p.err ? ` (${p.err}…)` : '') : p.nonterm ? 'loops forever (never terminates)' : p.a));
        });
        fb.innerHTML = '';
        fb.append(h('div', { class: all ? 'good-t' : 'bad-t' }, all ? '✅ All correct!' : '❌ Some answers differ. Compare above, then run it to see exactly what Racket prints.'), explainEl());
        if (!all) fb.append(h('button', { class: 'link small', onclick: (e) => { record(q.id, true); e.target.replaceWith(h('span', { class: 'small muted' }, 'Marked as correct.')); if (opts.onAnswer) opts.onAnswer(true); } }, 'I was actually right (typo/format): mark correct'));
        done(all);
      } }, 'Check');
      const runBtn = h('button', { class: 'btn', onclick: () => {
        runOut.hidden = false; runOut.innerHTML = '';
        const groups = q.independent ? q.parts.map(p => [p]) : [q.parts];
        groups.forEach(parts => {
          const nonterm = parts.some(p => p.nonterm);
          const r = R.run(pre + '\n' + (q.code || '') + '\n' + parts.map(p => p.ask).join('\n'), { limit: nonterm ? 400000 : 3000000 });
          if (q.independent) runOut.append(h('div', { class: 'small mono muted' }, '> ' + parts[0].ask));
          if (r.output) runOut.append(h('pre', { class: 'out-text' }, r.output));
          if (r.error) runOut.append(h('pre', { class: 'out-err' }, r.error));
        });
      } }, '▶ Run it');
      card.append(tbl, h('div', { class: 'qactions' }, check, runBtn), runOut, fb);
    }

    if (q.type === 'write') {
      const ta = h('textarea', { class: 'code-edit', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off', autocomplete: 'off', rows: Math.max(4, (q.starter || '').split('\n').length + 2) });
      const key = 'rr.draft.' + q.id; ta.value = store.get(key, q.starter || '');
      ta.addEventListener('input', () => store.set(key, ta.value));
      const results = h('div', { class: 'tests' });
      if (q.template) {
        const tpl = h('pre', { class: 'code small', hidden: true, html: highlight(q.template.replace('<<ANSWER>>', ';; <<< YOUR CASE GOES HERE >>>')) });
        card.append(h('button', { class: 'link small', onclick: () => { tpl.hidden = !tpl.hidden; } }, '⊕ show the full interpreter your case is inserted into'), tpl);
      } else if (pre) {
        const box = h('pre', { class: 'code small', hidden: true, html: highlight(pre) });
        card.append(h('button', { class: 'link small', onclick: () => { box.hidden = !box.hidden; } }, '⊕ show helper definitions (already loaded)'), box);
      }
      const runTests = h('button', { class: 'btn primary', onclick: () => {
        results.innerHTML = ''; let all = true;
        const body = q.template ? q.template.replace('<<ANSWER>>', ta.value) : pre + '\n' + ta.value;
        q.tests.forEach(t => {
          const r = R.run(body + '\n' + t.run);
          const got = r.error ? 'error: ' + r.error.split('\n')[0] : r.output.trim();
          const ok = !r.error && got === t.expect; all = all && ok;
          results.append(h('div', { class: 'test ' + (ok ? 'pass' : 'fail') }, h('div', { class: 'mono small' }, (ok ? '✓ ' : '✗ ') + t.run), ok ? null : h('div', { class: 'mono small' }, 'expected: ' + t.expect), ok ? null : h('div', { class: 'mono small' }, 'got: ' + got)));
        });
        fb.innerHTML = ''; fb.append(h('div', { class: all ? 'good-t' : 'bad-t' }, all ? '✅ All tests pass!' : '❌ Some tests fail.'));
        if (all) fb.append(explainEl());
        done(all);
      } }, '▶ Run tests');
      const showAns = h('button', { class: 'btn', onclick: () => {
        fb.innerHTML = ''; fb.append(h('div', { class: 'small b' }, 'Model answer:'), h('pre', { class: 'code', html: highlight(q.answer) }), explainEl());
        if (!P.q[q.id]) record(q.id, false);
      } }, 'Show answer');
      card.append(ta, h('div', { class: 'qactions' }, runTests, showAns, h('button', { class: 'btn ghost small', onclick: () => { ta.value = q.starter || ''; store.set(key, ta.value); } }, 'Reset')), results, fb);
    }

    if (q.type === 'explain') {
      const ta = h('textarea', { class: 'notes', rows: 3, placeholder: 'Write your answer first (optional), then reveal.' });
      const reveal = h('button', { class: 'btn primary', onclick: () => {
        reveal.remove();
        fb.append(h('div', { class: 'model' }, h('div', { class: 'small b' }, 'Model answer'), h('div', { html: mdInline(q.answer) })), explainEl(),
          h('div', { class: 'qactions' }, h('button', { class: 'btn good', onclick: (e) => { done(true); e.target.parentNode.replaceWith(h('div', { class: 'good-t small' }, 'Marked as got it ✓')); } }, '✓ I got it'),
            h('button', { class: 'btn bad', onclick: (e) => { done(false); e.target.parentNode.replaceWith(h('div', { class: 'bad-t small' }, 'Marked for review')); } }, '✗ Not yet')));
      } }, 'Reveal answer');
      card.append(ta, h('div', { class: 'qactions' }, reveal), fb);
    }
    return card;
  }

  // ---------- views ----------
  function setActiveTab(name) { document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === name)); }
  function header(title, back) {
    return h('div', { class: 'vhead' }, back ? h('a', { class: 'back', href: back }, '‹') : null, h('h1', null, title));
  }

  function viewHome() {
    setActiveTab('learn');
    const all = statsFor(QUESTIONS);
    const readCount = Object.keys(P.read).length, secTotal = TOPICS.reduce((a, t) => a + t.sections.length, 0);
    const standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    const wrap = h('div', { class: 'view' },
      h('div', { class: 'hero' }, h('div', { class: 'hero-t' }, 'Racket Revision'), h('div', { class: 'hero-s' }, 'CSC 330 · Racket midterm · works offline'),
        h('div', { class: 'hero-stats' },
          h('div', null, h('b', null, `${readCount}/${secTotal}`), h('span', null, 'sections understood')),
          h('div', null, h('b', null, `${all.ok}/${all.total}`), h('span', null, 'questions correct')),
          h('div', null, h('b', null, `${pct(all.ok, all.tried)}%`), h('span', null, 'accuracy')))),
      !standalone ? h('div', { class: 'install' }, '📲 To use this offline while camping: open this page in ', h('b', null, 'Safari'), ', tap ', h('b', null, 'Share'), ' → ', h('b', null, 'Add to Home Screen'), ', then open it once from the home screen while you still have signal.') : null,
      h('div', { class: 'quick' },
        h('a', { class: 'qbtn', href: '#/quiz?mode=exam' }, '🎯', h('span', null, 'Exam mix')),
        h('a', { class: 'qbtn', href: '#/tips' }, '🧭', h('span', null, 'Exam tips')),
        h('a', { class: 'qbtn', href: '#/map' }, '🕸', h('span', null, 'Connections')),
        h('a', { class: 'qbtn', href: '#/cards' }, '🃏', h('span', null, 'Flashcards'))),
      h('h2', { class: 'sec-t' }, 'Topics (in lecture order)'),
      TOPICS.map((t, i) => {
        const s = statsFor(topicQs(t.id)); const rd = t.sections.filter(x => P.read[t.id + '/' + x.id]).length;
        return h('a', { class: 'tcard', href: '#/learn/' + t.id },
          h('div', { class: 'ticon c' + i }, t.icon),
          h('div', { class: 'tbody' }, h('div', { class: 'tt' }, t.title), h('div', { class: 'tb small muted' }, t.blurb),
            h('div', { class: 'tprog small' }, h('span', null, `📖 ${rd}/${t.sections.length}`), bar(pct(rd, t.sections.length), 'read'), h('span', null, `✅ ${s.ok}/${s.total}`), bar(pct(s.ok, s.total)))));
      }),
      h('div', { class: 'foot small muted' }, 'Slides: Racket Slides folder · ', h('a', { href: '#/about' }, 'about this app')));
    return wrap;
  }

  function hydrate(container, topicId) {
    container.querySelectorAll('pre[data-run]').forEach(pre => {
      const code = pre.textContent.replace(/^\n/, '');
      const preludeKey = pre.dataset.prelude;
      pre.replaceWith(codeBlock(code, { draw: pre.hasAttribute('data-draw'), prelude: preludeKey ? PRELUDES[preludeKey] : '' }));
    });
    container.querySelectorAll('[data-widget]').forEach(div => {
      const [name, arg] = div.dataset.widget.split(':');
      const fn = window.Viz.widgets[name];
      div.replaceWith(fn ? fn(arg) : h('div', null, 'missing widget ' + name));
    });
    container.querySelectorAll('[data-quiz]').forEach(div => {
      const q = qById[div.dataset.quiz];
      div.replaceWith(q ? h('div', { class: 'checkq' }, h('div', { class: 'checkq-l small' }, '✏️ Check yourself'), renderQuestion(q, { inline: true })) : h('div'));
    });
    container.querySelectorAll('a[data-map]').forEach(a => { a.href = '#/map/' + a.dataset.map; a.classList.add('maplink'); });
  }

  function viewTopic(tid, secId) {
    setActiveTab('learn');
    const t = topicById[tid]; if (!t) return viewHome();
    const idx = TOPICS.indexOf(t);
    const wrap = h('div', { class: 'view' }, header(t.icon + ' ' + t.title, '#/'),
      h('div', { class: 'small muted slides-ref' }, '📄 Slides: ', h('span', { class: 'mono' }, t.slides), ' · ', h('a', { href: '#/quiz?topic=' + t.id }, `Practise this topic (${topicQs(t.id).length} questions) →`)));
    t.sections.forEach((s, i) => {
      const key = t.id + '/' + s.id;
      const body = h('div', { class: 'sbody' });
      let built = false;
      const markBtn = h('button', { class: 'btn small ' + (P.read[key] ? 'good' : ''), onclick: () => { P.read[key] = !P.read[key]; if (!P.read[key]) delete P.read[key]; save(); markBtn.className = 'btn small ' + (P.read[key] ? 'good' : ''); markBtn.textContent = P.read[key] ? '✓ Understood' : 'Mark as understood'; chk.textContent = P.read[key] ? '✓' : String(i + 1); chk.classList.toggle('done', !!P.read[key]); } }, P.read[key] ? '✓ Understood' : 'Mark as understood');
      const chk = h('span', { class: 'snum' + (P.read[key] ? ' done' : '') }, P.read[key] ? '✓' : String(i + 1));
      const sec = h('section', { class: 'lsec', id: 'sec-' + s.id });
      const toggle = () => {
        const open = sec.classList.toggle('open');
        if (open && !built) { built = true; body.innerHTML = s.body; hydrate(body, t.id); body.append(h('div', { class: 'sfoot' }, markBtn)); }
      };
      sec.append(h('button', { class: 'shead', onclick: toggle }, chk, h('span', { class: 'stitle' }, s.title), h('span', { class: 'chev' }, '›')), body);
      wrap.append(sec);
      if ((secId && s.id === secId) || (!secId && i === 0)) setTimeout(() => { toggle(); if (secId) sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 0);
    });
    const nav = h('div', { class: 'tnav' },
      idx > 0 ? h('a', { class: 'btn', href: '#/learn/' + TOPICS[idx - 1].id }, '‹ ' + TOPICS[idx - 1].title) : h('span'),
      idx < TOPICS.length - 1 ? h('a', { class: 'btn', href: '#/learn/' + TOPICS[idx + 1].id }, TOPICS[idx + 1].title + ' ›') : h('span'));
    wrap.append(nav);
    return wrap;
  }

  // ---------- practice ----------
  function viewPractice() {
    setActiveTab('practice');
    const sel = new Set(store.get('rr.topicsel', []));
    const wrong = QUESTIONS.filter(q => P.q[q.id] && !P.q[q.id].ok);
    const fresh = QUESTIONS.filter(q => !P.q[q.id]);
    const examQs = QUESTIONS.filter(q => /final|midterm/i.test(q.src || ''));
    const chips = h('div', { class: 'chips' });
    const draw = () => {
      chips.innerHTML = '';
      chips.append(h('button', { class: 'chip' + (sel.size === 0 ? ' on' : ''), onclick: () => { sel.clear(); store.set('rr.topicsel', []); draw(); } }, 'All topics'));
      TOPICS.forEach(t => chips.append(h('button', { class: 'chip' + (sel.has(t.id) ? ' on' : ''), onclick: () => { sel.has(t.id) ? sel.delete(t.id) : sel.add(t.id); store.set('rr.topicsel', [...sel]); draw(); } }, t.icon + ' ' + t.title.split(' ')[0].replace(/,$/, ''))));
    };
    draw();
    const tq = () => [...sel].join(',');
    const mode = (m, icon, title, sub) => h('a', { class: 'mode', href: '#', onclick: (e) => { e.preventDefault(); location.hash = `#/quiz?mode=${m}&topic=${tq()}`; } }, h('span', { class: 'mode-i' }, icon), h('span', null, h('b', null, title), h('div', { class: 'small muted' }, sub)));
    return h('div', { class: 'view' }, header('Practice'),
      h('div', { class: 'small muted' }, 'Filter by topic (optional):'), chips,
      mode('order', '📚', 'Work through questions', 'In lesson order, skipping ones you have already got right'),
      mode('exam', '🎯', 'Exam mix (15 random)', 'Mixed topics, like the real thing'),
      mode('pastexam', '📝', `Past-exam questions (${examQs.length})`, 'Racket questions adapted from the old finals'),
      mode('wrong', '🔁', `Review mistakes (${wrong.length})`, 'Questions you got wrong last time'),
      mode('new', '🆕', `Not tried yet (${fresh.length})`, 'Fresh questions only'),
      mode('all', '🗂', 'Browse everything', 'All questions, including ones you got right'),
      h('h2', { class: 'sec-t' }, 'Your progress'),
      TOPICS.map(t => { const s = statsFor(topicQs(t.id)); return h('div', { class: 'prog-row' }, h('span', null, t.icon + ' ' + t.title), bar(pct(s.ok, s.total)), h('span', { class: 'small muted' }, `${s.ok}/${s.total}`)); }),
      h('button', { class: 'btn ghost small', onclick: () => { if (confirm('Reset ALL progress (answers, sections, flashcards)?')) { P.q = {}; P.read = {}; P.known = {}; save(); route(); } } }, 'Reset progress'));
  }

  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  let session = null;
  function viewQuiz(params) {
    setActiveTab('practice');
    const topics = (params.get('topic') || '').split(',').filter(Boolean);
    const m = params.get('mode') || 'order';
    const key = m + '|' + topics.join(',');
    if (!session || session.key !== key) {
      let qs = QUESTIONS.filter(q => !topics.length || topics.includes(q.topic));
      if (m === 'order') { const rest = qs.filter(q => !(P.q[q.id] && P.q[q.id].ok)); qs = rest.length ? rest : qs; }
      if (m === 'exam') qs = shuffle(qs).slice(0, 15);
      if (m === 'pastexam') qs = qs.filter(q => /final|midterm/i.test(q.src || ''));
      if (m === 'wrong') qs = qs.filter(q => P.q[q.id] && !P.q[q.id].ok);
      if (m === 'new') qs = qs.filter(q => !P.q[q.id]);
      session = { key, qs, i: 0, results: {} };
    }
    const S = session;
    const wrap = h('div', { class: 'view' }, header({ order: 'Practice', exam: 'Exam mix', pastexam: 'Past-exam questions', wrong: 'Review mistakes', new: 'New questions', all: 'All questions' }[m] || 'Practice', '#/practice'));
    if (!S.qs.length) { wrap.append(h('div', { class: 'empty' }, m === 'wrong' ? '🎉 No mistakes to review!' : 'No questions here.'), h('a', { class: 'btn', href: '#/practice' }, 'Back')); return wrap; }
    const body = h('div');
    const top = h('div', { class: 'qnav-top' });
    function show() {
      body.innerHTML = ''; top.innerHTML = '';
      if (S.i >= S.qs.length) return summary();
      const q = S.qs[S.i];
      const answered = Object.keys(S.results).length;
      top.append(h('span', { class: 'small' }, `Question ${S.i + 1} of ${S.qs.length}`), h('span', { class: 'small muted' }, (topicById[q.topic] || {}).title || ''), bar(pct(answered, S.qs.length)));
      body.append(renderQuestion(q, { onAnswer: (ok) => { S.results[q.id] = ok; } }),
        h('div', { class: 'qnav' },
          h('button', { class: 'btn', disabled: S.i === 0, onclick: () => { S.i--; show(); window.scrollTo(0, 0); } }, '‹ Prev'),
          h('a', { class: 'small', href: '#/learn/' + q.topic }, 'lesson'),
          h('button', { class: 'btn primary', onclick: () => { S.i++; show(); window.scrollTo(0, 0); } }, S.i === S.qs.length - 1 ? 'Finish' : 'Next ›')));
    }
    function summary() {
      const ids = Object.keys(S.results); const ok = ids.filter(id => S.results[id]).length;
      body.append(h('div', { class: 'summary' }, h('div', { class: 'big' }, `${ok} / ${ids.length}`), h('div', { class: 'muted' }, `answered correctly (${S.qs.length - ids.length} skipped)`),
        h('div', { class: 'sumlist' }, S.qs.map((q, i) => h('button', { class: 'sumq ' + (S.results[q.id] === true ? 'ok' : S.results[q.id] === false ? 'bad' : ''), onclick: () => { S.i = i; show(); } }, `${i + 1}. ${q.q.replace(/`/g, '').slice(0, 60)}…`))),
        h('div', { class: 'qactions' }, h('button', { class: 'btn primary', onclick: () => { session = null; route(); } }, 'New round'), h('a', { class: 'btn', href: '#/practice' }, 'Practice menu'))));
    }
    show();
    wrap.append(top, body);
    return wrap;
  }

  // ---------- connections map ----------
  function viewMap(nodeId) {
    setActiveTab('map');
    const { nodes, edges } = window.MAP;
    const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
    const topicIdx = Object.fromEntries(TOPICS.map((t, i) => [t.id, i]));
    const W = 380, H = 760, NW = 112, NH = 30;
    let svg = `<svg viewBox="0 0 ${W} ${H}" class="mapsvg" role="img" aria-label="concept map">`;
    edges.forEach((e, i) => {
      const a = byId[e.a], b = byId[e.b];
      const mx = (a.x + b.x) / 2 + (a.y === b.y ? 0 : (i % 2 ? 18 : -18)), my = (a.y + b.y) / 2 + (a.y === b.y ? -22 : 0);
      svg += `<path d="M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}" class="medge" data-a="${e.a}" data-b="${e.b}"/>`;
    });
    nodes.forEach(n => {
      svg += `<g class="mnode c${topicIdx[n.topic]}" data-id="${n.id}" transform="translate(${n.x - NW / 2},${n.y - NH / 2})"><rect width="${NW}" height="${NH}" rx="15"/><text x="${NW / 2}" y="${NH / 2}" text-anchor="middle" dominant-baseline="central">${Viz.esc(n.label)}</text></g>`;
    });
    svg += '</svg>';
    const mapEl = h('div', { class: 'mapwrap', html: svg });
    const panel = h('div', { class: 'mpanel' }, h('div', { class: 'muted small' }, 'Tap a concept to see how it connects to the others.'));
    function select(id) {
      const n = byId[id]; if (!n) return;
      mapEl.querySelectorAll('.mnode').forEach(g => { const rel = g.dataset.id === id || edges.some(e => (e.a === id && e.b === g.dataset.id) || (e.b === id && e.a === g.dataset.id)); g.classList.toggle('sel', g.dataset.id === id); g.classList.toggle('dim', !rel); });
      mapEl.querySelectorAll('.medge').forEach(p => { const on = p.dataset.a === id || p.dataset.b === id; p.classList.toggle('on', on); p.classList.toggle('dim', !on); });
      const rel = edges.filter(e => e.a === id || e.b === id);
      const [tid, sid] = n.lesson.split('/');
      panel.innerHTML = '';
      panel.append(h('div', { class: 'mp-h' }, h('b', null, n.label), h('a', { class: 'btn small', href: `#/learn/${tid}/${sid}` }, 'Open lesson →')),
        h('div', { class: 'small muted' }, `${rel.length} connections:`),
        ...rel.map(e => { const other = byId[e.a === id ? e.b : e.a]; return h('button', { class: 'mp-rel', onclick: () => { select(other.id); history.replaceState(null, '', '#/map/' + other.id); } }, h('span', { class: 'mp-o' }, (e.a === id ? '→ ' : '← ') + other.label), h('span', { class: 'small' }, e.why)); }));
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    mapEl.addEventListener('click', (e) => { const g = e.target.closest('.mnode'); if (g) { select(g.dataset.id); history.replaceState(null, '', '#/map/' + g.dataset.id); } });
    const legend = h('div', { class: 'mlegend' }, TOPICS.map((t, i) => h('span', { class: 'lgt c' + i }, t.icon + ' ' + t.title.split(/[ ,&]/)[0])));
    const cmp = h('div', null, h('h2', { class: 'sec-t' }, 'Side-by-side comparisons'), window.COMPARE.map(c => {
      const d = h('details', { class: 'cmpbox' }, h('summary', null, c.title), h('div', { html: c.html })); return d;
    }));
    const wrap = h('div', { class: 'view' }, header('Connections'), legend, mapEl, panel, cmp);
    if (nodeId) setTimeout(() => select(nodeId), 0);
    return wrap;
  }

  // ---------- playground ----------
  const EXAMPLES = [
    ['Hello / basics', `(define (square x) (* x x))\n(square 7)\n(map square (list 1 2 3))\n(list 1 "two" #t 'four)`],
    ['let forms', `(define x 15)\n(define y 17)\n(let ([x y] [y x]) (cons x y))\n(let* ([x y] [y x]) (cons x y))\n(letrec ([x y] [y x]) (cons x y))`],
    ['closures + set!', `(define (make-counter)\n  (let ([c 0])\n    (lambda () (begin (set! c (+ c 1)) c))))\n(define c1 (make-counter))\n(c1)\n(c1)\n((make-counter))`],
    ['mcons aliasing', `(define p (mcons 1 2))\n(define q p)\n(set-mcar! q 100)\np`],
    ['streams', `(define nats\n  (letrec ([f (lambda (x) (cons x (lambda () (f (+ x 1)))))])\n    (lambda () (f 0))))\n(define (take-stream n s)\n  (if (= n 0) null\n      (let ([p (s)]) (cons (car p) (take-stream (- n 1) (cdr p))))))\n(take-stream 10 nats)`],
    ['promises', `(define (my-delay th) (mcons #f th))\n(define (my-force p)\n  (if (mcar p) (mcdr p)\n      (begin (set-mcar! p #t) (set-mcdr! p ((mcdr p))) (mcdr p))))\n(define p (my-delay (lambda () (begin (println "computing!") 42))))\n(my-force p)\n(my-force p)\np`],
    ['macros', `(define-syntax my-if\n  (syntax-rules (then else)\n    [(my-if e1 then e2 else e3) (if e1 e2 e3)]))\n(my-if #t then 'yes else (car null))\n(define-syntax dbl (syntax-rules () [(dbl x) (+ x x)]))\n(dbl (begin (println "Yo!") 21))`],
    ['structs / eval-exp', `(struct const (int) #:transparent)\n(struct add (e1 e2) #:transparent)\n(struct multiply (e1 e2) #:transparent)\n(define (eval-exp e)\n  (cond [(const? e) e]\n        [(add? e) (const (+ (const-int (eval-exp (add-e1 e))) (const-int (eval-exp (add-e2 e)))))]\n        [(multiply? e) (const (* (const-int (eval-exp (multiply-e1 e))) (const-int (eval-exp (multiply-e2 e)))))]))\n(eval-exp (multiply (add (const 2) (const 3)) (const 4)))`],
    ['MUPL interpreter', PRELUDES.mupl + `\n\n(eval-exp (mlet "x" (int 5) (add (var "x") (var "x"))))`],
  ];
  function viewPlay() {
    setActiveTab('play');
    const ta = h('textarea', { class: 'code-edit play', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off', autocomplete: 'off', rows: 14 });
    ta.value = store.get('rr.play', EXAMPLES[0][1]);
    ta.addEventListener('input', () => store.set('rr.play', ta.value));
    const outEl = h('div', { class: 'run-out' }, h('div', { class: 'muted small' }, 'Output appears here.'));
    let last = null;
    function ins(text, back = 0) {
      const s = ta.selectionStart, e = ta.selectionEnd;
      ta.value = ta.value.slice(0, s) + text + ta.value.slice(e);
      ta.selectionStart = ta.selectionEnd = s + text.length - back; ta.focus(); store.set('rr.play', ta.value);
    }
    const keys = [['(', '(', 0], [')', ')', 0], ['[', '[', 0], [']', ']', 0], ["'", "'", 0], ['"', '""', 1], ['λ', '(lambda () )', 4], ['define', '(define )', 1], ['let', '(let ([ ]) )', 6], ['cond', '(cond [ ]\n      [#t ])', 13], ['⏎', '\n  ', 0]];
    const kb = h('div', { class: 'kbar' }, keys.map(([l, t, b]) => h('button', { class: 'key', onmousedown: (e) => e.preventDefault(), onclick: () => ins(t, b) }, l)));
    const run = () => {
      const r = R.run(ta.value); outEl.innerHTML = '';
      if (r.output) outEl.append(h('pre', { class: 'out-text' }, r.output));
      if (r.error) outEl.append(h('pre', { class: 'out-err' }, r.error));
      if (!r.output && !r.error) outEl.append(h('div', { class: 'muted small' }, '(no output)'));
      last = r.results[r.results.length - 1];
    };
    const sel = h('select', { class: 'inp', onchange: () => { const ex = EXAMPLES[+sel.value]; if (ex) { ta.value = ex[1]; store.set('rr.play', ta.value); run(); } } },
      h('option', { value: '' }, 'Load an example…'), EXAMPLES.map(([n], i) => h('option', { value: i }, n)));
    const ref = h('details', { class: 'cmpbox' }, h('summary', null, 'What this mini-Racket supports'), h('div', { class: 'small', html:
      '<p>Special forms: define (incl. curried sugar), lambda/λ (incl. rest args), let, let*, letrec, named let, if, cond, and, or, when, unless, begin, set!, quote, quasiquote/unquote, define-syntax + syntax-rules (with ..., literals and hygiene), struct (#:transparent, #:mutable), delay.</p><p>Functions: + - * / = &lt; &gt; &lt;= &gt;= quotient remainder modulo abs max min add1 sub1 expt sqrt zero? even? odd? number? string? symbol? boolean? procedure? null? pair? list? cons car cdr c[ad]+r first rest second third last list list* length append reverse list-ref range map filter foldl foldr andmap ormap assoc member memq sort apply build-list remove eq? eqv? equal? not mcons mcar mcdr set-mcar! set-mcdr! mpair? string-append string-length substring number-&gt;string string-&gt;number symbol-&gt;string string-&gt;symbol print println display displayln newline printf format error eval force void.</p><p>Programs run like a Racket module, with the same error messages. Differences: numbers are JavaScript floats (huge integers lose precision; (/ 1 2) gives 0.5, not 1/2), and anything that runs too long is stopped.</p>' }));
    return h('div', { class: 'view' }, header('Code playground'),
      h('div', { class: 'small muted' }, 'A Racket interpreter running on your phone. Edit, then ▶ Run.'),
      h('div', { class: 'row' }, sel), kb, ta,
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: run }, '▶ Run'), h('button', { class: 'btn', onclick: () => { run(); if (last !== undefined && last !== null) outEl.append(h('div', { class: 'boxwrap', html: Viz.boxDiagram(last) })); } }, '▦ Run & draw'), h('button', { class: 'btn ghost', onclick: () => { ta.value = ''; store.set('rr.play', ''); ta.focus(); } }, 'Clear')),
      outEl, ref);
  }

  // ---------- flash cards ----------
  function viewCards() {
    setActiveTab('cards');
    const cards = window.CARDS;
    let order = shuffle(cards.map((_, i) => i).filter(i => !P.known[i]));
    if (!order.length) order = shuffle(cards.map((_, i) => i));
    let k = 0, flipped = false;
    const front = h('div', { class: 'cf' }); const back = h('div', { class: 'cb' });
    const card = h('div', { class: 'flash', onclick: () => { flipped = !flipped; card.classList.toggle('flipped', flipped); } }, front, back);
    const info = h('div', { class: 'small muted center' });
    function show() {
      if (k >= order.length) { front.textContent = '🎉 Deck done!'; back.textContent = 'Tap "Shuffle" to go again.'; info.textContent = ''; return; }
      const c = cards[order[k]]; flipped = false; card.classList.remove('flipped');
      front.textContent = c.front; back.textContent = c.back;
      const known = Object.keys(P.known).length;
      info.textContent = `Card ${k + 1} of ${order.length} · ${known}/${cards.length} known · tap the card to flip`;
    }
    const again = h('button', { class: 'btn bad', onclick: () => { if (k < order.length) { order.push(order[k]); k++; show(); } } }, '↺ Again');
    const got = h('button', { class: 'btn good', onclick: () => { if (k < order.length) { P.known[order[k]] = true; save(); k++; show(); } } }, '✓ Knew it');
    show();
    return h('div', { class: 'view' }, header('Flashcards'), info, card, h('div', { class: 'row center' }, again, got),
      h('div', { class: 'row center' }, h('button', { class: 'btn ghost small', onclick: () => { P.known = {}; save(); order = shuffle(cards.map((_, i) => i)); k = 0; show(); } }, 'Shuffle & reset')));
  }

  function viewTips() {
    setActiveTab('learn');
    return h('div', { class: 'view' }, header('Exam technique', '#/'), h('div', { class: 'tips', html: window.EXAM_TIPS }),
      h('a', { class: 'btn primary', href: '#/quiz?mode=pastexam' }, 'Practise past-exam questions →'));
  }
  function viewAbout() {
    return h('div', { class: 'view' }, header('About', '#/'), h('div', { class: 'tips', html: `
<p>Built from the CSC 330 Racket lecture slides (racket-01 to racket7) and the Racket parts of the old CSE341 finals in <span class="mono">Racket Slides/Previous Racket</span>. OOP classes and subtyping are left out: they are not in the Racket slides.</p>
<p>The code runner is a small Racket interpreter written in JavaScript. Every "predict" answer and every "write code" test in the question bank was checked against real Racket (v8) and against this interpreter.</p>
<p>Progress is saved on this device only.</p>
<p>${QUESTIONS.length} questions · ${window.CARDS.length} flashcards · ${TOPICS.reduce((a, t) => a + t.sections.length, 0)} lesson sections.</p>` }));
  }

  // ---------- router ----------
  function route() {
    const hash = location.hash || '#/';
    const [path, qs] = hash.slice(1).split('?');
    const parts = path.split('/').filter(Boolean);
    const params = new URLSearchParams(qs || '');
    let view;
    if (!parts.length) view = viewHome();
    else if (parts[0] === 'learn') view = viewTopic(parts[1], parts[2]);
    else if (parts[0] === 'practice') { session = null; view = viewPractice(); }
    else if (parts[0] === 'quiz') view = viewQuiz(params);
    else if (parts[0] === 'map') view = viewMap(parts[1]);
    else if (parts[0] === 'play') view = viewPlay();
    else if (parts[0] === 'cards') view = viewCards();
    else if (parts[0] === 'tips') view = viewTips();
    else if (parts[0] === 'about') view = viewAbout();
    else view = viewHome();
    main.innerHTML = ''; main.append(view);
    if (!(parts[0] === 'learn' && parts[2])) window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();

  // Offline support. Skipped on localhost so edits show up immediately while developing.
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
    else navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
