// Checks every question's answers against REAL Racket and against the app's interpreter (racket.js).
// Usage:  node tools/verify.js            (all questions)
//         node tools/verify.js s-wi23     (only ids containing "s-wi23")
// Needs Racket installed (racket.exe on PATH).
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const appJs = path.join(__dirname, '..', 'app', 'js');
global.window = globalThis;
const R = require(path.join(appJs, 'racket.js'));
for (const f of fs.readdirSync(appJs).filter(f => /^questions\d*\.js$/.test(f)).sort()) require(path.join(appJs, f));
const filter = process.argv[2] || '';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rkt-verify-'));

// Builds the program text and the exact output we expect from it.
function buildPrograms(q) {
  const pre = [].concat(q.prelude || []).map(k => window.PRELUDES[k]).join('\n');
  if (q.type === 'predict') {
    // independent questions run each part on its own; otherwise parts run in order in one program
    const groups = q.independent ? q.parts.map(p => [p]) : [q.parts];
    return groups.map(parts => {
      const lines = []; let err = null, nonterm = false; const asks = [];
      for (const p of parts) {
        asks.push(p.ask);
        if (p.a === 'error') { err = p.err || ''; break; }
        if (p.nonterm) { nonterm = true; break; }
        lines.push(p.shows !== undefined ? p.shows : p.a);
      }
      return { src: [pre, q.code || '', ...asks].join('\n'), expect: lines.filter(l => l !== '').map(l => l + '\n').join(''), err, nonterm };
    });
  }
  if (q.type === 'write') {
    const body = q.template ? q.template.replace('<<ANSWER>>', q.answer) : q.answer;
    const src = [pre, body, ...q.tests.map(t => t.run)].join('\n');
    return [{ src, expect: q.tests.map(t => t.expect + '\n').join(''), err: null }];
  }
  return null;
}
// In a file, Racket's eval needs a namespace; this gives it the module's one (like the DrRacket REPL the slides use).
const EVAL_NS = '(define-namespace-anchor eval-anchor)\n(current-namespace (namespace-anchor->namespace eval-anchor))\n';

function runRacket(src, nonterm, file) {
  fs.writeFileSync(file, '#lang racket\n' + (/\(eval /.test(src) ? EVAL_NS : '') + src);
  try { return { out: cp.execFileSync('racket', [file], { encoding: 'utf8', timeout: nonterm ? 8000 : 60000, stdio: ['ignore', 'pipe', 'pipe'] }), err: '', timedOut: false }; }
  catch (e) { return { out: e.stdout || '', err: e.stderr || '', timedOut: !!(e.killed || /ETIMEDOUT/.test(String(e))) }; }
}
const norm = s => s.replace(/\r/g, '').replace(/#<(procedure|promise):\.\.\.[^>]*>/g, '#<$1>');

let checked = 0, bad = 0;
for (const q of window.QUESTIONS) {
  if (filter && !q.id.includes(filter)) continue;
  const progs = buildPrograms(q);
  if (!progs) continue;
  checked++;
  const problems = [];
  progs.forEach((prog, gi) => {
  const file = path.join(tmp, q.id.replace(/\W/g, '_') + '_' + gi + '.rkt');
  let rout, rerr, timedOut;
  if (prog.nonterm) {
    // output is lost when a looping program is killed, so check the terminating prefix separately
    const prefix = prog.src.split('\n').slice(0, -1).join('\n');
    const a = runRacket(prefix, false, file); rout = a.out; rerr = a.err;
    const b = runRacket(prog.src, true, file); timedOut = b.timedOut || /out of memory/.test(b.err);
    if (!timedOut) problems.push('RACKET should not terminate on the last part');
    rerr = ''; timedOut = false;
  } else ({ out: rout, err: rerr, timedOut } = runRacket(prog.src, false, file));
  const js = R.run(prog.src);
  // real Racket vs expected answers
  if (norm(rout) !== prog.expect) problems.push(`RACKET OUTPUT differs\n  expected: ${JSON.stringify(prog.expect)}\n  racket:   ${JSON.stringify(norm(rout))}`);
  if (prog.err !== null) { if (!rerr || !rerr.includes(prog.err)) problems.push(`RACKET should error with "${prog.err}" but stderr was: ${JSON.stringify(rerr.split('\n')[0])}`); }
  else if (rerr) problems.push('RACKET unexpected error: ' + rerr.split('\n')[0] + (timedOut ? ' (timed out)' : ''));
  else if (timedOut) problems.push('RACKET timed out');
  // app interpreter vs expected answers
  if (norm(js.output) !== prog.expect) problems.push(`JS OUTPUT differs\n  expected: ${JSON.stringify(prog.expect)}\n  js:       ${JSON.stringify(norm(js.output))}`);
  if (prog.err !== null) { if (!js.error || !js.error.includes(prog.err)) problems.push(`JS should error with "${prog.err}" but got: ${JSON.stringify(js.error)}`); }
  else if (prog.nonterm) { if (!js.error || !/out of memory|STOPPED/.test(js.error)) problems.push('JS should not terminate, got ' + js.error); }
  else if (js.error) problems.push('JS unexpected error: ' + js.error.split('\n')[0]);
  });
  if (problems.length) { bad++; console.log(`✗ ${q.id}\n  ` + problems.join('\n  ')); }
  else console.log(`✓ ${q.id}`);
}
console.log(`\n${checked} checked, ${bad} with problems`);
process.exit(bad ? 1 : 0);
