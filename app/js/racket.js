// racket.js — a small interpreter for the subset of Racket used in CSC 330.
// It runs a whole program like a Racket module (all top-level names known up front),
// prints top-level expression results the way DrRacket does, and copies Racket's
// error messages closely so the errors you see here look like the real thing.
(function (global) {
  'use strict';

  // ---------- data types ----------
  class Sym { constructor(name) { this.name = name; } }
  const symtab = new Map();
  function sym(n) { let s = symtab.get(n); if (!s) { s = new Sym(n); symtab.set(n, s); } return s; }

  class Keyword { constructor(name) { this.name = name; } }
  class Pair { constructor(car, cdr) { this.car = car; this.cdr = cdr; } }
  class MPair { constructor(car, cdr) { this.car = car; this.cdr = cdr; } }
  const NIL = { kind: 'null' };
  const VOID = { kind: 'void' };
  const UNDEF_TOP = { kind: 'undef-top' };     // top-level name not defined yet
  const UNDEF_LOCAL = { kind: 'undef-local' }; // letrec / local define not initialised yet

  class Closure { constructor(params, rest, body, env, name) { this.params = params; this.rest = rest; this.body = body; this.env = env; this.name = name; } }
  class Prim { constructor(name, fn, min, max) { this.name = name; this.fn = fn; this.min = min; this.max = max; } }
  class Macro { constructor(name, literals, rules, env) { this.name = name; this.literals = literals; this.rules = rules; this.env = env; } }
  class StructType { constructor(name, fields, transparent, mutable) { this.name = name; this.fields = fields; this.transparent = transparent; this.mutable = mutable; } }
  class StructVal { constructor(type, vals) { this.type = type; this.vals = vals; } }
  class Promise_ { constructor(thunk) { this.done = false; this.value = thunk; } }
  // A renamed identifier made by macro expansion (this is how hygiene works).
  let renameCounter = 0;
  class Rename { constructor(s, env) { this.sym = s; this.env = env; this.id = ++renameCounter; } }

  class RacketError extends Error { constructor(msg) { super(msg); this.racket = true; } }
  const err = (m) => new RacketError(m);

  // ---------- environments ----------
  class Env {
    constructor(parent, label) { this.vars = new Map(); this.parent = parent; this.label = label; }
  }
  function findBinding(env, id) {
    for (let e = env; e; e = e.parent) if (e.vars.has(id)) return { frame: e, key: id };
    if (id instanceof Rename) return findBinding(id.env, id.sym);
    return null;
  }
  function idName(id) { return id instanceof Rename ? idName(id.sym) : id.name; }
  const isId = (x) => x instanceof Sym || x instanceof Rename;

  // ---------- reader ----------
  function read(src) {
    let i = 0; const n = src.length; const out = [];
    const DELIM = /[\s()\[\]{}";'`,]/;
    function skipWs() {
      for (;;) {
        while (i < n && /\s/.test(src[i])) i++;
        if (src[i] === ';') { while (i < n && src[i] !== '\n') i++; continue; }
        if (src.startsWith('#|', i)) { const j = src.indexOf('|#', i + 2); i = j < 0 ? n : j + 2; continue; }
        if (src.startsWith('#;', i)) { i += 2; readOne(); continue; }
        if (src.startsWith('#lang', i)) { while (i < n && src[i] !== '\n') i++; continue; }
        break;
      }
    }
    function readOne() {
      skipWs();
      if (i >= n) throw err('read-syntax: unexpected end of file');
      const c = src[i];
      if (c === '(' || c === '[' || c === '{') {
        const close = c === '(' ? ')' : c === '[' ? ']' : '}';
        i++; const items = []; let tail = NIL;
        for (;;) {
          skipWs();
          if (i >= n) throw err(`read-syntax: expected a \`${close}\` to close \`${c}\``);
          const d = src[i];
          if (d === ')' || d === ']' || d === '}') {
            if (d !== close) throw err(`read-syntax: missing \`${close}\` to close preceding \`${c}\`, found instead \`${d}\``);
            i++; break;
          }
          if (d === '.' && i + 1 < n && DELIM.test(src[i + 1]) && items.length) {
            i++; tail = readOne(); skipWs();
            if (src[i] !== close) throw err('read-syntax: illegal use of `.`');
            i++; break;
          }
          items.push(readOne());
        }
        let r = tail; for (let k = items.length - 1; k >= 0; k--) r = new Pair(items[k], r);
        return r;
      }
      if (c === ')' || c === ']' || c === '}') { i++; throw err(`read-syntax: unexpected \`${c}\``); }
      if (c === "'") { i++; return list(sym('quote'), readOne()); }
      if (c === '`') { i++; return list(sym('quasiquote'), readOne()); }
      if (c === ',') {
        i++; if (src[i] === '@') { i++; return list(sym('unquote-splicing'), readOne()); }
        return list(sym('unquote'), readOne());
      }
      if (c === '"') {
        i++; let s = '';
        while (i < n && src[i] !== '"') {
          if (src[i] === '\\') { i++; const e = src[i]; s += e === 'n' ? '\n' : e === 't' ? '\t' : e; i++; }
          else s += src[i++];
        }
        if (i >= n) throw err('read-syntax: expected a closing `"`');
        i++; return s;
      }
      let j = i; while (j < n && !DELIM.test(src[j])) j++;
      if (src[j] === '"' || j === i) j = Math.max(j, i + 1);
      const tok = src.slice(i, j); i = j;
      if (tok === '#t' || tok === '#true') return true;
      if (tok === '#f' || tok === '#false') return false;
      if (tok.startsWith('#:')) return new Keyword(tok.slice(2));
      if (tok.startsWith('#\\')) return tok.slice(2);
      if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(tok)) return Number(tok);
      if (/^[+-]?\d+\/\d+$/.test(tok)) { const [a, b] = tok.split('/'); return Number(a) / Number(b); }
      return sym(tok);
    }
    for (;;) { skipWs(); if (i >= n) break; out.push(readOne()); }
    return out;
  }

  // ---------- list helpers ----------
  function list(...xs) { let r = NIL; for (let k = xs.length - 1; k >= 0; k--) r = new Pair(xs[k], r); return r; }
  function arrToList(a, tail = NIL) { let r = tail; for (let k = a.length - 1; k >= 0; k--) r = new Pair(a[k], r); return r; }
  function isList(x) { while (x instanceof Pair) x = x.cdr; return x === NIL; }
  function listToArr(x, who) {
    const a = []; while (x instanceof Pair) { a.push(x.car); x = x.cdr; }
    if (x !== NIL) throw err(`${who || 'list'}: bad syntax`);
    return a;
  }
  function strip(x) { // syntax -> plain datum (remove macro renames)
    if (x instanceof Rename) return strip(x.sym);
    if (x instanceof Pair) { const a = strip(x.car), d = strip(x.cdr); return (a === x.car && d === x.cdr) ? x : new Pair(a, d); }
    return x;
  }

  // ---------- printing ----------
  function fmtNum(v) {
    if (Number.isInteger(v)) return Math.abs(v) < 1e21 ? String(v) : v.toExponential().replace('e+', 'e');
    if (v === Infinity) return '+inf.0'; if (v === -Infinity) return '-inf.0'; if (Number.isNaN(v)) return '+nan.0';
    return String(v);
  }
  function fmtStr(s) { return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"'; }
  function quotable(v) {
    if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean' || v instanceof Sym || v === NIL || v instanceof Keyword) return true;
    if (v instanceof Pair) { while (v instanceof Pair) { if (!quotable(v.car)) return false; v = v.cdr; } return quotable(v); }
    if (v instanceof Closure || v instanceof Prim || v === VOID || v instanceof Promise_ || v instanceof Macro) return true;
    if (v instanceof StructVal) return !v.type.transparent;
    return false;
  }
  const QUOTE_ABBR = { quote: "'", quasiquote: '`', unquote: ',', 'unquote-splicing': ',@' };
  function datum(v) {
    if (typeof v === 'number') return fmtNum(v);
    if (typeof v === 'string') return fmtStr(v);
    if (v === true) return '#t'; if (v === false) return '#f';
    if (v instanceof Sym) return v.name;
    if (v instanceof Keyword) return '#:' + v.name;
    if (v === NIL) return '()';
    if (v instanceof Pair) {
      if (v.car instanceof Sym && QUOTE_ABBR[v.car.name] && v.cdr instanceof Pair && v.cdr.cdr === NIL) return QUOTE_ABBR[v.car.name] + datum(v.cdr.car);
      const parts = []; let p = v;
      while (p instanceof Pair) { parts.push(datum(p.car)); p = p.cdr; }
      return '(' + parts.join(' ') + (p === NIL ? '' : ' . ' + datum(p)) + ')';
    }
    return opaque(v);
  }
  function opaque(v) {
    if (v instanceof Closure || v instanceof Prim) return procName(v);
    if (v === VOID) return '#<void>';
    if (v instanceof Promise_) return '#<promise>';
    if (v instanceof Macro) return '#<macro:' + v.name + '>';
    if (v instanceof StructVal) return '#<' + v.type.name + '>';
    if (v === undefined) return '#<undefined>';
    return printValue(v);
  }
  function procName(f) { return f.name ? '#<procedure:' + f.name + '>' : '#<procedure>'; }
  // print = how DrRacket shows a value
  function printValue(v) {
    if (quotable(v)) {
      const needsQuote = v instanceof Sym || v === NIL || v instanceof Pair;
      return (needsQuote ? "'" : '') + datum(v);
    }
    if (v instanceof Pair) {
      if (isList(v)) { const a = []; for (let p = v; p !== NIL; p = p.cdr) a.push(printValue(p.car)); return '(list ' + a.join(' ') + ')'; }
      const a = []; let p = v; while (p instanceof Pair) { a.push(printValue(p.car)); p = p.cdr; }
      return a.length === 1 ? '(cons ' + a[0] + ' ' + printValue(p) + ')' : '(list* ' + a.join(' ') + ' ' + printValue(p) + ')';
    }
    if (v instanceof MPair) return '(mcons ' + printValue(v.car) + ' ' + printValue(v.cdr) + ')';
    if (v instanceof StructVal) {
      if (!v.type.transparent) return '#<' + v.type.name + '>';
      return '(' + v.type.name + (v.vals.length ? ' ' + v.vals.map(printValue).join(' ') : '') + ')';
    }
    if (v instanceof Closure || v instanceof Prim) return procName(v);
    if (v === VOID) return '#<void>';
    if (v instanceof Promise_) return '#<promise>';
    if (v instanceof Macro) return '#<macro:' + v.name + '>';
    if (v === undefined) return '#<undefined>';
    return String(v);
  }
  // display = no quotes on strings / symbols
  function displayValue(v) {
    if (typeof v === 'string') return v;
    if (v instanceof Sym) return v.name;
    if (v instanceof Pair) {
      const parts = []; let p = v;
      while (p instanceof Pair) { parts.push(displayValue(p.car)); p = p.cdr; }
      return '(' + parts.join(' ') + (p === NIL ? '' : ' . ' + displayValue(p)) + ')';
    }
    if (v === NIL) return '()';
    if (v instanceof MPair) return '{' + displayValue(v.car) + ' . ' + displayValue(v.cdr) + '}';
    if (v instanceof StructVal) return v.type.transparent ? '#(struct:' + v.type.name + (v.vals.length ? ' ' + v.vals.map(displayValue).join(' ') : '') + ')' : '#<' + v.type.name + '>';
    if (typeof v === 'number' || typeof v === 'boolean') return datum(v);
    return printValue(v);
  }
  function showSyntax(x) { return datum(strip(x)); }

  // ---------- run state ----------
  let steps = 0, LIMIT = 3000000, out = '';
  const STEP_MSG = 'STOPPED: this program ran for too long, so it probably never terminates (an infinite loop).';
  function emit(s) { out += s; if (out.length > 200000) throw err('STOPPED: too much output.'); }

  // ---------- evaluation ----------
  class Tail { constructor(x, env) { this.x = x; this.env = env; } }
  const truthy = (v) => v !== false;

  function lookupValue(env, id) {
    const b = findBinding(env, id);
    if (!b) throw err(`${idName(id)}: unbound identifier\n  in: ${idName(id)}`);
    const v = b.frame.vars.get(b.key);
    if (v === UNDEF_TOP) throw err(`${idName(id)}: undefined;\n cannot reference an identifier before its definition`);
    if (v === UNDEF_LOCAL) throw err(`${idName(id)}: undefined;\n cannot use before initialization`);
    if (v instanceof Macro) throw err(`${idName(id)}: bad syntax\n  in: ${idName(id)}`);
    return v;
  }

  function evaluate(x, env) {
    for (;;) {
      if (++steps > LIMIT) throw err(STEP_MSG);
      if (isId(x)) return lookupValue(env, x);
      if (!(x instanceof Pair)) {
        if (x === NIL) throw err('#%app: missing procedure expression;\n probably originally (), which is an illegal empty application');
        if (x instanceof Keyword) throw err('#%datum: keyword misused as an expression\n  at: #:' + x.name);
        return x;
      }
      const head = x.car;
      if (isId(head)) {
        const b = findBinding(env, head);
        if (!b) {
          const sf = SPECIAL[idName(head)];
          if (sf) {
            const r = sf(x, env);
            if (r instanceof Tail) { x = r.x; env = r.env; continue; }
            return r;
          }
        } else {
          const v = b.frame.vars.get(b.key);
          if (v instanceof Macro) { x = expandMacro(v, x); continue; }
        }
      }
      const f = evaluate(head, env);
      const args = [];
      for (let p = x.cdr; p !== NIL; p = p.cdr) {
        if (!(p instanceof Pair)) throw err('#%app: bad syntax\n  in: ' + showSyntax(x));
        args.push(evaluate(p.car, env));
      }
      if (f instanceof Closure) {
        env = bindArgs(f, args);
        const body = f.body; env = prepareBody(body, env);
        for (let k = 0; k < body.length - 1; k++) evaluate(body[k], env);
        x = body[body.length - 1];
        continue;
      }
      return applyNonClosure(f, args);
    }
  }

  function applyNonClosure(f, args) {
    if (f instanceof Prim) {
      if (args.length < f.min || (f.max >= 0 && args.length > f.max)) throw arityErr(f.name, f.min === f.max ? String(f.min) : f.max < 0 ? 'at least ' + f.min : f.min + ' to ' + f.max, args);
      return f.fn(...args);
    }
    throw err('application: not a procedure;\n expected a procedure that can be applied to arguments\n  given: ' + printValue(f));
  }
  function arityErr(name, expected, args) {
    return err(`${name || '#<procedure>'}: arity mismatch;\n the expected number of arguments does not match the given number\n  expected: ${expected}\n  given: ${args.length}` + (args.length ? '\n  arguments...:\n' + args.map(a => '   ' + printValue(a)).join('\n') : ''));
  }
  function bindArgs(f, args) {
    const ps = f.params;
    if (args.length < ps.length || (!f.rest && args.length > ps.length))
      throw arityErr(f.name, f.rest ? 'at least ' + ps.length : String(ps.length), args);
    const e = new Env(f.env, f.name ? 'call to ' + f.name : 'call');
    for (let k = 0; k < ps.length; k++) e.vars.set(ps[k], args[k]);
    if (f.rest) e.vars.set(f.rest, arrToList(args.slice(ps.length)));
    return e;
  }
  function applyProc(f, args) {
    if (f instanceof Closure) {
      let env = bindArgs(f, args); const body = f.body; env = prepareBody(body, env);
      for (let k = 0; k < body.length - 1; k++) evaluate(body[k], env);
      return evaluate(body[body.length - 1], env);
    }
    return applyNonClosure(f, args);
  }
  function checkProc(who, f, pos) { if (!(f instanceof Closure || f instanceof Prim)) throw contract(who, 'procedure?', f, pos); }

  // Internal defines get their own scope (they behave like letrec*).
  function headIs(form, name, env) {
    return form instanceof Pair && isId(form.car) && idName(form.car) === name && !findBinding(env, form.car);
  }
  function definedNames(form, env) {
    if (headIs(form, 'define', env)) {
      let t = form.cdr.car; while (t instanceof Pair) t = t.car;
      return [t];
    }
    if (headIs(form, 'struct', env)) return structNames(form).map(n => n.key);
    if (headIs(form, 'define-syntax', env)) return [];
    return [];
  }
  function prepareBody(body, env) {
    let needs = false;
    for (const f of body) if (headIs(f, 'define', env) || headIs(f, 'struct', env) || headIs(f, 'define-syntax', env)) { needs = true; break; }
    if (!needs) return env;
    const e = new Env(env, 'body');
    for (const f of body) for (const nm of definedNames(f, env)) {
      if (e.vars.has(nm)) throw err('define-values: duplicate binding name\n  name: ' + idName(nm));
      e.vars.set(nm, UNDEF_LOCAL);
    }
    return e;
  }
  function bodyArr(x, who, whole) {
    const a = listToArr(x, who);
    if (!a.length) throw err(`${who}: bad syntax (no expressions for procedure body)\n  in: ${showSyntax(whole)}`);
    return a;
  }
  function evalSeqTail(arr, env) { for (let k = 0; k < arr.length - 1; k++) evaluate(arr[k], env); return new Tail(arr[arr.length - 1], env); }

  function parseParams(p, whole) {
    const params = []; let rest = null;
    if (isId(p)) return { params, rest: p };
    while (p instanceof Pair) {
      if (!isId(p.car)) throw err('lambda: not an identifier\n  at: ' + showSyntax(p.car) + '\n  in: ' + showSyntax(whole));
      params.push(p.car); p = p.cdr;
    }
    if (p !== NIL) { if (isId(p)) rest = p; else throw err('lambda: bad syntax\n  in: ' + showSyntax(whole)); }
    return { params, rest };
  }
  function makeLambda(paramSpec, bodyList, env, whole, name) {
    const { params, rest } = parseParams(paramSpec, whole);
    return new Closure(params, rest, bodyArr(bodyList, 'lambda', whole), env, name || null);
  }
  // Racket names a procedure only when the lambda is written directly in the binding.
  function nameIt(v, id, rhs) {
    if (v instanceof Closure && !v.name && lambdaShaped(rhs)) v.name = idName(id);
    return v;
  }
  function lambdaShaped(rhs) { // a lambda, or a let/letrec/begin whose result is a lambda
    if (!(rhs instanceof Pair) || !isId(rhs.car)) return false;
    const h = idName(rhs.car);
    if (h === 'lambda' || h === 'λ') return true;
    if (['let', 'let*', 'letrec', 'begin'].includes(h)) { let p = rhs; while (p.cdr instanceof Pair) p = p.cdr; return p !== rhs && lambdaShaped(p.car); }
    return false;
  }

  function parseBindings(bs, who, whole) {
    const out = [];
    for (const b of listToArr(bs, who)) {
      if (!(b instanceof Pair) || !isId(b.car) || !(b.cdr instanceof Pair) || b.cdr.cdr !== NIL)
        throw err(`${who}: bad syntax (not an identifier and expression for a binding)\n  at: ${showSyntax(b)}\n  in: ${showSyntax(whole)}`);
      out.push([b.car, b.cdr.car]);
    }
    return out;
  }

  const SPECIAL = {
    quote(x) { if (!(x.cdr instanceof Pair) || x.cdr.cdr !== NIL) throw err('quote: bad syntax\n  in: ' + showSyntax(x)); return strip(x.cdr.car); },
    quasiquote(x, env) { return qq(x.cdr.car, 1, env); },
    unquote(x) { throw err('unquote: not in quasiquote\n  in: ' + showSyntax(x)); },
    lambda(x, env) { return makeLambda(x.cdr.car, x.cdr.cdr, env, x); },
    'λ'(x, env) { return makeLambda(x.cdr.car, x.cdr.cdr, env, x); },
    define(x, env) {
      let target = x.cdr.car, body = x.cdr.cdr;
      if (target instanceof Pair) { // (define (f args) body...) possibly curried
        while (target.car instanceof Pair) { body = list(new Pair(sym('lambda'), new Pair(target.cdr, body))); target = target.car; }
        const name = target.car;
        const v = makeLambda(target.cdr, body, env, x, idName(name));
        env.vars.set(name, v); return VOID;
      }
      if (!isId(target)) throw err('define: bad syntax\n  in: ' + showSyntax(x));
      if (!(body instanceof Pair)) throw err('define: bad syntax (missing expression after identifier)\n  in: ' + showSyntax(x));
      if (body.cdr !== NIL) throw err('define: bad syntax (multiple expressions after identifier)\n  in: ' + showSyntax(x));
      const v = nameIt(evaluate(body.car, env), target, body.car);
      env.vars.set(target, v); return VOID;
    },
    'set!'(x, env) {
      const id = x.cdr.car;
      if (!isId(id) || !(x.cdr.cdr instanceof Pair)) throw err('set!: bad syntax\n  in: ' + showSyntax(x));
      const b = findBinding(env, id);
      if (!b) throw err(`set!: unbound identifier\n  in: ${idName(id)}`);
      const v = evaluate(x.cdr.cdr.car, env);
      const old = b.frame.vars.get(b.key);
      if (old === UNDEF_TOP) throw err(`${idName(id)}: assignment disallowed;\n cannot set variable before its definition`);
      if (old === UNDEF_LOCAL) throw err(`${idName(id)}: assignment disallowed;\n cannot set variable before its definition`);
      if (b.frame === BASE) throw err(`set!: cannot mutate module-required identifier\n  in: ${idName(id)}`);
      b.frame.vars.set(b.key, v); return VOID;
    },
    if(x, env) {
      const a = listToArr(x, 'if');
      if (a.length !== 4) throw err('if: bad syntax\n  in: ' + showSyntax(x));
      return new Tail(truthy(evaluate(a[1], env)) ? a[2] : a[3], env);
    },
    cond(x, env) {
      for (let c = x.cdr; c !== NIL; c = c.cdr) {
        const cl = c.car;
        if (!(cl instanceof Pair)) throw err('cond: bad syntax (clause is not a test-value pair)\n  at: ' + showSyntax(cl) + '\n  in: ' + showSyntax(x));
        const isElse = isId(cl.car) && idName(cl.car) === 'else' && !findBinding(env, cl.car);
        const t = isElse ? true : evaluate(cl.car, env);
        if (truthy(t)) {
          if (cl.cdr === NIL) return t;
          return evalSeqTail(listToArr(cl.cdr, 'cond'), env);
        }
      }
      return VOID;
    },
    else(x) { throw err('else: not allowed as an expression\n  in: ' + showSyntax(x)); },
    and(x, env) {
      const a = listToArr(x.cdr, 'and'); if (!a.length) return true;
      for (let k = 0; k < a.length - 1; k++) if (evaluate(a[k], env) === false) return false;
      return new Tail(a[a.length - 1], env);
    },
    or(x, env) {
      const a = listToArr(x.cdr, 'or'); if (!a.length) return false;
      for (let k = 0; k < a.length - 1; k++) { const v = evaluate(a[k], env); if (v !== false) return v; }
      return new Tail(a[a.length - 1], env);
    },
    when(x, env) { if (truthy(evaluate(x.cdr.car, env))) return evalSeqTail(listToArr(x.cdr.cdr), env); return VOID; },
    unless(x, env) { if (!truthy(evaluate(x.cdr.car, env))) return evalSeqTail(listToArr(x.cdr.cdr), env); return VOID; },
    begin(x, env) {
      const a = listToArr(x.cdr, 'begin');
      if (!a.length) throw err('begin: bad syntax (empty form)\n  in: (begin)');
      return evalSeqTail(a, env);
    },
    let(x, env) {
      if (isId(x.cdr.car)) { // named let
        const name = x.cdr.car; const bs = parseBindings(x.cdr.cdr.car, 'let', x);
        const loopEnv = new Env(env, 'named let');
        const f = new Closure(bs.map(b => b[0]), null, bodyArr(x.cdr.cdr.cdr, 'let', x), loopEnv, idName(name));
        loopEnv.vars.set(name, f);
        const args = bs.map(b => evaluate(b[1], env));
        let e = bindArgs(f, args); e = prepareBody(f.body, e);
        return evalSeqTail(f.body, e);
      }
      const bs = parseBindings(x.cdr.car, 'let', x);
      const vals = bs.map(b => evaluate(b[1], env));       // all right-hand sides use the OUTER env
      const e = new Env(env, 'let');
      bs.forEach((b, k) => { if (e.vars.has(b[0])) throw err('let: duplicate identifier\n  at: ' + idName(b[0])); e.vars.set(b[0], nameIt(vals[k], b[0], b[1])); });
      const body = bodyArr(x.cdr.cdr, 'let', x);
      return evalSeqTail(body, prepareBody(body, e));
    },
    'let*'(x, env) {
      const bs = parseBindings(x.cdr.car, 'let*', x);
      let e = env;
      for (const [id, rhs] of bs) { const v = evaluate(rhs, e); e = new Env(e, 'let*'); e.vars.set(id, nameIt(v, id, rhs)); }
      if (!bs.length) e = new Env(env, 'let*');
      const body = bodyArr(x.cdr.cdr, 'let*', x);
      return evalSeqTail(body, prepareBody(body, e));
    },
    letrec(x, env) {
      const bs = parseBindings(x.cdr.car, 'letrec', x);
      const e = new Env(env, 'letrec');
      for (const [id] of bs) e.vars.set(id, UNDEF_LOCAL);
      for (const [id, rhs] of bs) e.vars.set(id, nameIt(evaluate(rhs, e), id, rhs)); // evaluated in order
      const body = bodyArr(x.cdr.cdr, 'letrec', x);
      return evalSeqTail(body, prepareBody(body, e));
    },
    'define-syntax'(x, env) {
      const name = x.cdr.car; const spec = x.cdr.cdr.car;
      env.vars.set(name, makeMacro(name, spec, env, x)); return VOID;
    },
    'syntax-rules'(x) { throw err('syntax-rules: only allowed inside define-syntax\n  in: ' + showSyntax(x)); },
    struct(x, env) {
      for (const { key, val } of structNames(x)) env.vars.set(key, val);
      return VOID;
    },
    delay(x, env) { const body = listToArr(x.cdr); return new Promise_(new Closure([], null, body, env, null)); },
  };
  SPECIAL['letrec*'] = SPECIAL.letrec;

  function structNames(x) {
    const nameId = x.cdr.car; const name = idName(nameId);
    const fields = listToArr(x.cdr.cdr.car, 'struct').map(f => idName(f instanceof Pair ? f.car : f));
    let transparent = false, mutable = false;
    for (let o = x.cdr.cdr.cdr; o instanceof Pair; o = o.cdr) {
      if (o.car instanceof Keyword) { if (o.car.name === 'transparent') transparent = true; if (o.car.name === 'mutable') mutable = true; }
    }
    const T = new StructType(name, fields, transparent, mutable);
    const res = [];
    const k = fields.length;
    res.push({ key: sym(name), val: new Prim(name, (...a) => new StructVal(T, a), k, k) });
    res.push({ key: sym(name + '?'), val: new Prim(name + '?', (v) => v instanceof StructVal && v.type === T, 1, 1) });
    fields.forEach((f, idx) => {
      const acc = name + '-' + f;
      res.push({ key: sym(acc), val: new Prim(acc, (v) => { if (!(v instanceof StructVal && v.type === T)) throw contract(acc, name + '?', v); return v.vals[idx]; }, 1, 1) });
      if (mutable) {
        const st = 'set-' + name + '-' + f + '!';
        res.push({ key: sym(st), val: new Prim(st, (v, nv) => { if (!(v instanceof StructVal && v.type === T)) throw contract(st, name + '?', v, 1); v.vals[idx] = nv; return VOID; }, 2, 2) });
      }
    });
    return res;
  }

  function qq(t, depth, env) {
    if (!(t instanceof Pair)) return strip(t);
    if (isId(t.car) && idName(t.car) === 'unquote') {
      if (depth === 1) return evaluate(t.cdr.car, env);
      return list(sym('unquote'), qq(t.cdr.car, depth - 1, env));
    }
    if (isId(t.car) && idName(t.car) === 'quasiquote') return list(sym('quasiquote'), qq(t.cdr.car, depth + 1, env));
    if (t.car instanceof Pair && isId(t.car.car) && idName(t.car.car) === 'unquote-splicing' && depth === 1) {
      const spliced = evaluate(t.car.cdr.car, env);
      const rest = qq(t.cdr, depth, env);
      return arrToList(listToArr(spliced, 'unquote-splicing'), rest);
    }
    return new Pair(qq(t.car, depth, env), qq(t.cdr, depth, env));
  }

  // ---------- macros (syntax-rules) ----------
  const ELLIPSIS = '...';
  function makeMacro(name, spec, env, whole) {
    if (!(spec instanceof Pair) || !isId(spec.car) || idName(spec.car) !== 'syntax-rules')
      throw err('define-syntax: only syntax-rules is supported here\n  in: ' + showSyntax(whole));
    const lits = new Set(listToArr(spec.cdr.car).map(idName));
    const rules = listToArr(spec.cdr.cdr).map(r => { const a = listToArr(r); return { pat: a[0], tmpl: a[1] }; });
    return new Macro(idName(name), lits, rules, env);
  }
  class Seq { constructor(items) { this.items = items; } }
  function patVars(p, lits, acc = []) {
    if (isId(p)) { const n = idName(p); if (n !== ELLIPSIS && n !== '_' && !lits.has(n)) acc.push(n); }
    else if (p instanceof Pair) { patVars(p.car, lits, acc); patVars(p.cdr, lits, acc); }
    return acc;
  }
  function splitList(x) { const a = []; while (x instanceof Pair) { a.push(x.car); x = x.cdr; } return { a, tail: x }; }
  function match(p, f, lits, b) {
    if (isId(p)) {
      const n = idName(p);
      if (n === '_') return true;
      if (lits.has(n)) return isId(f) && idName(f) === n;
      b.set(n, f); return true;
    }
    if (p instanceof Pair) {
      const { a: pa, tail: pt } = splitList(p);
      const { a: fa, tail: ft } = splitList(f);
      const ei = pa.findIndex((q, k) => k > 0 && isId(q) && idName(q) === ELLIPSIS);
      if (ei < 0) {
        if (pt === NIL) { if (fa.length !== pa.length || ft !== NIL) return false; }
        else if (fa.length < pa.length) return false;
        for (let k = 0; k < pa.length; k++) if (!match(pa[k], fa[k], lits, b)) return false;
        if (pt !== NIL) return match(pt, arrToList(fa.slice(pa.length), ft), lits, b);
        return true;
      }
      const before = pa.slice(0, ei - 1), rep = pa[ei - 1], after = pa.slice(ei + 1);
      if (ft !== NIL || fa.length < before.length + after.length) return false;
      for (let k = 0; k < before.length; k++) if (!match(before[k], fa[k], lits, b)) return false;
      const mid = fa.slice(before.length, fa.length - after.length);
      const vars = patVars(rep, lits); const seqs = vars.map(() => []);
      for (const item of mid) {
        const bb = new Map(); if (!match(rep, item, lits, bb)) return false;
        vars.forEach((v, k) => seqs[k].push(bb.get(v)));
      }
      vars.forEach((v, k) => b.set(v, new Seq(seqs[k])));
      for (let k = 0; k < after.length; k++) if (!match(after[k], fa[fa.length - after.length + k], lits, b)) return false;
      return true;
    }
    if (p === NIL) return f === NIL;
    return equalP(p, f);
  }
  function tmplVars(t, b, acc = new Set()) {
    if (isId(t)) { if (b.has(idName(t))) acc.add(idName(t)); }
    else if (t instanceof Pair) { tmplVars(t.car, b, acc); tmplVars(t.cdr, b, acc); }
    return acc;
  }
  function instantiate(t, b, renames, menv) {
    if (isId(t)) {
      const n = idName(t);
      if (b.has(n)) { const v = b.get(n); if (v instanceof Seq) throw err(`syntax: missing ellipsis with pattern variable in template\n  at: ${n}`); return v; }
      if (!renames.has(t)) renames.set(t, new Rename(t, menv));
      return renames.get(t);
    }
    if (t instanceof Pair) {
      const { a, tail } = splitList(t); const res = [];
      for (let k = 0; k < a.length; k++) {
        if (k + 1 < a.length && isId(a[k + 1]) && idName(a[k + 1]) === ELLIPSIS) {
          const vars = [...tmplVars(a[k], b)].filter(v => b.get(v) instanceof Seq);
          if (!vars.length) throw err('syntax: no pattern variables before ellipsis in template');
          const len = b.get(vars[0]).items.length;
          for (let r = 0; r < len; r++) {
            const bb = new Map(b); vars.forEach(v => bb.set(v, b.get(v).items[r]));
            res.push(instantiate(a[k], bb, renames, menv));
          }
          k++;
        } else res.push(instantiate(a[k], b, renames, menv));
      }
      return arrToList(res, tail === NIL ? NIL : instantiate(tail, b, renames, menv));
    }
    return t;
  }
  function expandMacro(m, form) {
    for (const { pat, tmpl } of m.rules) {
      const b = new Map();
      if (match(pat.cdr, form.cdr, m.literals, b)) return instantiate(tmpl, b, new Map(), m.env);
    }
    throw err(`${m.name}: bad syntax\n  in: ${showSyntax(form)}`);
  }

  // ---------- compile-time style checks (so errors appear before anything runs, like Racket) ----------
  function checkSyntax(x, env, macros, depth = 0) {
    if (depth > 200) return;
    if (isId(x)) { if (idName(x) === 'else' && !findBinding(env, x)) throw err('else: not allowed as an expression\n  in: else'); return; }
    if (!(x instanceof Pair)) return;
    const h = x.car;
    const n = isId(h) ? idName(h) : null;
    const sub = (y) => checkSyntax(y, env, macros, depth + 1);
    const each = (lst) => { for (let p = lst; p instanceof Pair; p = p.cdr) sub(p.car); };
    if (n && macros.has(n)) { sub(expandMacro(macros.get(n), x)); return; }
    if (n && SPECIAL[n] && !findBinding(env, h)) {
      const a = splitList(x).a;
      switch (n) {
        case 'quote': case 'quasiquote': case 'define-syntax': case 'struct': return;
        case 'if': if (a.length !== 4) throw err('if: bad syntax\n  in: ' + showSyntax(x)); each(x.cdr); return;
        case 'define':
          if (a.length < 2) throw err('define: bad syntax\n  in: ' + showSyntax(x));
          if (isId(a[1])) {
            if (a.length === 2) throw err('define: bad syntax (missing expression after identifier)\n  in: ' + showSyntax(x));
            if (a.length > 3) throw err('define: bad syntax (multiple expressions after identifier)\n  in: ' + showSyntax(x));
            sub(a[2]); return;
          }
          if (a.length < 3) throw err('define: bad syntax (no expressions for procedure body)\n  in: ' + showSyntax(x));
          a.slice(2).forEach(sub); return;
        case 'lambda': case 'λ':
          if (a.length < 3) throw err('lambda: bad syntax\n  in: ' + showSyntax(x));
          parseParams(a[1], x); a.slice(2).forEach(sub); return;
        case 'let': case 'let*': case 'letrec': case 'letrec*': {
          let k = 1; if (n === 'let' && isId(a[1])) k = 2;
          if (a.length < k + 2) throw err(`${n}: bad syntax\n  in: ` + showSyntax(x));
          parseBindings(a[k], n, x).forEach(bd => sub(bd[1])); a.slice(k + 1).forEach(sub); return;
        }
        case 'cond':
          for (const cl of a.slice(1)) {
            if (!(cl instanceof Pair)) throw err('cond: bad syntax (clause is not a test-value pair)\n  at: ' + showSyntax(cl) + '\n  in: ' + showSyntax(x));
            if (!(isId(cl.car) && idName(cl.car) === 'else')) sub(cl.car);
            each(cl.cdr);
          }
          return;
        case 'set!': if (a.length !== 3 || !isId(a[1])) throw err('set!: bad syntax\n  in: ' + showSyntax(x)); sub(a[2]); return;
        default: each(x.cdr); return;
      }
    }
    each(x);
  }

  // ---------- equality & contracts ----------
  function equalP(a, b) {
    if (a === b) return true;
    if (a instanceof Pair && b instanceof Pair) return equalP(a.car, b.car) && equalP(a.cdr, b.cdr);
    if (a instanceof MPair && b instanceof MPair) return equalP(a.car, b.car) && equalP(a.cdr, b.cdr);
    if (a instanceof StructVal && b instanceof StructVal) return a.type === b.type && a.type.transparent && a.vals.every((v, k) => equalP(v, b.vals[k]));
    if (typeof a === 'number' && typeof b === 'number') return a === b;
    return false;
  }
  function contract(who, expected, given, pos, all) {
    let m = `${who}: contract violation\n  expected: ${expected}\n  given: ${printValue(given)}`;
    if (all && all.length > 1) m += `\n  argument position: ${ordinal(pos + 1)}\n  other arguments...:\n` + all.filter((_, k) => k !== pos).map(v => '   ' + printValue(v)).join('\n');
    return err(m);
  }
  function ordinal(k) { return k + (k === 1 ? 'st' : k === 2 ? 'nd' : k === 3 ? 'rd' : 'th'); }

  // ---------- primitives ----------
  const BASE = new Env(null, 'built-ins');
  function def(name, min, max, fn) { BASE.vars.set(sym(name), new Prim(name, fn, min, max)); }
  const num = (who, args) => args.forEach((v, k) => { if (typeof v !== 'number') throw contract(who, 'number?', v, k, args); });
  const reqList = (who, v, pos, all) => { if (!isList(v)) throw contract(who, 'list?', v, pos, all); return v; };
  const reqPair = (who, v) => { if (!(v instanceof Pair)) throw contract(who, 'pair?', v); return v; };

  def('+', 0, -1, (...a) => { num('+', a); return a.reduce((x, y) => x + y, 0); });
  def('*', 0, -1, (...a) => { num('*', a); return a.reduce((x, y) => x * y, 1); });
  def('-', 1, -1, (...a) => { num('-', a); return a.length === 1 ? -a[0] : a.slice(1).reduce((x, y) => x - y, a[0]); });
  def('/', 1, -1, (...a) => {
    num('/', a); if (a.length === 1) a = [1, a[0]];
    return a.slice(1).reduce((x, y) => { if (y === 0) throw err('/: division by zero'); return x / y; }, a[0]);
  });
  const cmp = (name, op) => def(name, 1, -1, (...a) => { num(name, a); for (let k = 0; k + 1 < a.length; k++) if (!op(a[k], a[k + 1])) return false; return true; });
  cmp('=', (x, y) => x === y); cmp('<', (x, y) => x < y); cmp('>', (x, y) => x > y); cmp('<=', (x, y) => x <= y); cmp('>=', (x, y) => x >= y);
  const int2 = (name, f) => def(name, 2, 2, (a, b) => { num(name, [a, b]); if (b === 0) throw err(name + ': undefined for 0'); return f(a, b); });
  int2('quotient', (a, b) => Math.trunc(a / b)); int2('remainder', (a, b) => a % b); int2('modulo', (a, b) => ((a % b) + b) % b);
  def('abs', 1, 1, (a) => { num('abs', [a]); return Math.abs(a); });
  def('max', 1, -1, (...a) => { num('max', a); return Math.max(...a); });
  def('min', 1, -1, (...a) => { num('min', a); return Math.min(...a); });
  def('add1', 1, 1, (a) => { num('add1', [a]); return a + 1; });
  def('sub1', 1, 1, (a) => { num('sub1', [a]); return a - 1; });
  def('expt', 2, 2, (a, b) => { num('expt', [a, b]); return Math.pow(a, b); });
  def('sqrt', 1, 1, (a) => { num('sqrt', [a]); return Math.sqrt(a); });
  def('floor', 1, 1, (a) => Math.floor(a)); def('ceiling', 1, 1, (a) => Math.ceil(a)); def('round', 1, 1, (a) => Math.round(a));
  def('exact->inexact', 1, 1, (a) => a); def('exact-round', 1, 1, (a) => Math.round(a));
  const pred = (name, f) => def(name, 1, 1, f);
  pred('zero?', (a) => { num('zero?', [a]); return a === 0; });
  pred('positive?', (a) => { num('positive?', [a]); return a > 0; });
  pred('negative?', (a) => { num('negative?', [a]); return a < 0; });
  pred('even?', (a) => { if (!Number.isInteger(a)) throw contract('even?', 'integer?', a); return a % 2 === 0; });
  pred('odd?', (a) => { if (!Number.isInteger(a)) throw contract('odd?', 'integer?', a); return a % 2 !== 0; });
  pred('number?', (a) => typeof a === 'number'); pred('integer?', (a) => Number.isInteger(a));
  pred('string?', (a) => typeof a === 'string'); pred('boolean?', (a) => typeof a === 'boolean');
  pred('symbol?', (a) => a instanceof Sym); pred('procedure?', (a) => a instanceof Closure || a instanceof Prim);
  pred('null?', (a) => a === NIL); pred('empty?', (a) => a === NIL);
  pred('pair?', (a) => a instanceof Pair); pred('cons?', (a) => a instanceof Pair);
  pred('list?', (a) => isList(a)); pred('mpair?', (a) => a instanceof MPair);
  pred('void?', (a) => a === VOID); pred('promise?', (a) => a instanceof Promise_);
  def('not', 1, 1, (a) => a === false);
  def('eq?', 2, 2, (a, b) => a === b); def('eqv?', 2, 2, (a, b) => a === b); def('equal?', 2, 2, equalP);
  def('cons', 2, 2, (a, b) => new Pair(a, b));
  def('car', 1, 1, (p) => reqPair('car', p).car); def('cdr', 1, 1, (p) => reqPair('cdr', p).cdr);
  def('first', 1, 1, (p) => { if (!(p instanceof Pair) || !isList(p)) throw contract('first', '(and/c list? (not/c empty?))', p); return p.car; });
  def('rest', 1, 1, (p) => { if (!(p instanceof Pair) || !isList(p)) throw contract('rest', '(and/c list? (not/c empty?))', p); return p.cdr; });
  ['second', 'third', 'fourth'].forEach((nm, k) => def(nm, 1, 1, (p) => {
    let q = p; for (let j = 0; j <= k; j++) { if (!(q instanceof Pair)) throw contract(nm, 'list?', p); if (j < k) q = q.cdr; }
    return q.car;
  }));
  // cadr, cddr, caddr ... (up to 4 letters)
  (function cxr() {
    const combos = []; const gen = (s) => { if (s.length) combos.push(s); if (s.length < 4) { gen(s + 'a'); gen(s + 'd'); } }; gen('');
    combos.filter(s => s.length >= 2).forEach(s => {
      const nm = 'c' + s + 'r';
      def(nm, 1, 1, (v) => {
        let cur = v;
        for (let k = s.length - 1; k >= 0; k--) { if (!(cur instanceof Pair)) throw contract(nm, describeCxr(s), v); cur = s[k] === 'a' ? cur.car : cur.cdr; }
        return cur;
      });
    });
    function describeCxr(s) { let d = 'pair?'; for (let k = 1; k < s.length; k++) d = `(cons/c ${s[s.length - 1 - k] === 'a' ? d : 'any/c'} ${s[s.length - 1 - k] === 'd' ? d : 'any/c'})`; return s.length === 2 ? `(cons/c ${s[0] === 'a' ? 'pair?' : 'any/c'} ${s[0] === 'd' ? 'pair?' : 'any/c'})` : d; }
  })();
  BASE.vars.set(sym('null'), NIL); BASE.vars.set(sym('empty'), NIL);
  def('list', 0, -1, (...a) => arrToList(a));
  def('list*', 1, -1, (...a) => arrToList(a.slice(0, -1), a[a.length - 1]));
  def('length', 1, 1, (l) => { reqList('length', l); let k = 0; for (; l !== NIL; l = l.cdr) k++; return k; });
  def('append', 0, -1, (...ls) => {
    if (!ls.length) return NIL;
    let res = ls[ls.length - 1];
    for (let k = ls.length - 2; k >= 0; k--) { reqList('append', ls[k], k, ls); res = arrToList(listToArr(ls[k]), res); }
    return res;
  });
  def('reverse', 1, 1, (l) => { reqList('reverse', l); return arrToList(listToArr(l).reverse()); });
  def('list-ref', 2, 2, (l, k) => { let p = l; for (let j = 0; j < k; j++) { if (!(p instanceof Pair)) throw err('list-ref: index too large for list\n  index: ' + k + '\n  in: ' + printValue(l)); p = p.cdr; } if (!(p instanceof Pair)) throw err('list-ref: index too large for list\n  index: ' + k + '\n  in: ' + printValue(l)); return p.car; });
  def('last', 1, 1, (l) => { if (!(l instanceof Pair)) throw contract('last', '(and/c list? (not/c empty?))', l); while (l.cdr instanceof Pair) l = l.cdr; return l.car; });
  def('range', 1, 3, (a, b, s) => { if (b === undefined) { b = a; a = 0; } s = s || 1; const r = []; for (let k = a; s > 0 ? k < b : k > b; k += s) r.push(k); return arrToList(r); });
  def('map', 2, -1, (f, ...ls) => {
    checkProc('map', f, 0); ls.forEach((l, k) => reqList('map', l, k + 1, [f, ...ls]));
    const arrs = ls.map(l => listToArr(l)); const len = arrs[0].length;
    if (arrs.some(a => a.length !== len)) throw err('map: all lists must have same size');
    const r = []; for (let k = 0; k < len; k++) r.push(applyProc(f, arrs.map(a => a[k]))); return arrToList(r);
  });
  def('for-each', 2, -1, (f, ...ls) => { const arrs = ls.map(l => listToArr(reqList('for-each', l))); for (let k = 0; k < arrs[0].length; k++) applyProc(f, arrs.map(a => a[k])); return VOID; });
  def('filter', 2, 2, (f, l) => { checkProc('filter', f, 0); reqList('filter', l, 1); return arrToList(listToArr(l).filter(x => truthy(applyProc(f, [x])))); });
  def('remove', 2, 2, (x, l) => { const a = listToArr(reqList('remove', l)); const k = a.findIndex(y => equalP(x, y)); if (k >= 0) a.splice(k, 1); return arrToList(a); });
  def('foldl', 3, 3, (f, acc, l) => { checkProc('foldl', f, 0); for (const x of listToArr(reqList('foldl', l, 2))) acc = applyProc(f, [x, acc]); return acc; });
  def('foldr', 3, 3, (f, acc, l) => { checkProc('foldr', f, 0); const a = listToArr(reqList('foldr', l, 2)); for (let k = a.length - 1; k >= 0; k--) acc = applyProc(f, [a[k], acc]); return acc; });
  def('andmap', 2, 2, (f, l) => { let r = true; for (const x of listToArr(reqList('andmap', l))) { r = applyProc(f, [x]); if (r === false) return false; } return r; });
  def('ormap', 2, 2, (f, l) => { for (const x of listToArr(reqList('ormap', l))) { const r = applyProc(f, [x]); if (r !== false) return r; } return false; });
  def('build-list', 2, 2, (k, f) => { const r = []; for (let j = 0; j < k; j++) r.push(applyProc(f, [j])); return arrToList(r); });
  def('assoc', 2, 2, (x, l) => { for (let p = l; p instanceof Pair; p = p.cdr) { if (!(p.car instanceof Pair)) throw contract('assoc', 'pair?', p.car); if (equalP(p.car.car, x)) return p.car; } return false; });
  def('member', 2, 2, (x, l) => { for (let p = l; p instanceof Pair; p = p.cdr) if (equalP(p.car, x)) return p; return false; });
  def('memq', 2, 2, (x, l) => { for (let p = l; p instanceof Pair; p = p.cdr) if (p.car === x) return p; return false; });
  def('sort', 2, 2, (l, f) => arrToList(listToArr(reqList('sort', l)).sort((a, b) => truthy(applyProc(f, [a, b])) ? -1 : truthy(applyProc(f, [b, a])) ? 1 : 0)));
  def('apply', 2, -1, (f, ...a) => { const last = a.pop(); return applyProc(f, [...a, ...listToArr(reqList('apply', last))]); });
  def('identity', 1, 1, (x) => x);
  def('void', 0, -1, () => VOID);
  def('mcons', 2, 2, (a, b) => new MPair(a, b));
  def('mcar', 1, 1, (p) => { if (!(p instanceof MPair)) throw contract('mcar', 'mpair?', p); return p.car; });
  def('mcdr', 1, 1, (p) => { if (!(p instanceof MPair)) throw contract('mcdr', 'mpair?', p); return p.cdr; });
  def('set-mcar!', 2, 2, (p, v) => { if (!(p instanceof MPair)) throw contract('set-mcar!', 'mpair?', p, 0, [p, v]); p.car = v; return VOID; });
  def('set-mcdr!', 2, 2, (p, v) => { if (!(p instanceof MPair)) throw contract('set-mcdr!', 'mpair?', p, 0, [p, v]); p.cdr = v; return VOID; });
  def('string-append', 0, -1, (...a) => { a.forEach((s, k) => { if (typeof s !== 'string') throw contract('string-append', 'string?', s, k, a); }); return a.join(''); });
  def('string-length', 1, 1, (s) => { if (typeof s !== 'string') throw contract('string-length', 'string?', s); return s.length; });
  def('substring', 2, 3, (s, a, b) => s.substring(a, b === undefined ? s.length : b));
  def('string=?', 2, -1, (...a) => a.every(s => s === a[0]));
  def('string-upcase', 1, 1, (s) => s.toUpperCase());
  def('number->string', 1, 1, (v) => { num('number->string', [v]); return fmtNum(v); });
  def('string->number', 1, 1, (s) => { const v = Number(s); return s.trim() === '' || Number.isNaN(v) ? false : v; });
  def('symbol->string', 1, 1, (s) => s.name); def('string->symbol', 1, 1, (s) => sym(s));
  def('error', 1, -1, (a, ...rest) => {
    if (a instanceof Sym) throw err(`${a.name}: ${rest.length ? (typeof rest[0] === 'string' ? formatStr(rest[0], rest.slice(1)) : rest.map(printValue).join(' ')) : 'error'}`);
    throw err(String(typeof a === 'string' ? a : printValue(a)) + rest.map(v => ' ' + printValue(v)).join(''));
  });
  function formatStr(f, args) {
    let k = 0;
    return f.replace(/~([avsn%~])/g, (_, c) => c === 'n' || c === '%' ? '\n' : c === '~' ? '~' : c === 'a' ? displayValue(args[k++]) : printValue(args[k++]));
  }
  def('print', 1, 1, (v) => { emit(printValue(v)); return VOID; });
  def('println', 1, 1, (v) => { emit(printValue(v) + '\n'); return VOID; });
  def('write', 1, 1, (v) => { emit(typeof v === 'string' ? fmtStr(v) : displayValue(v)); return VOID; });
  def('display', 1, 1, (v) => { emit(displayValue(v)); return VOID; });
  def('displayln', 1, 1, (v) => { emit(displayValue(v) + '\n'); return VOID; });
  def('newline', 0, 0, () => { emit('\n'); return VOID; });
  def('printf', 1, -1, (f, ...a) => { emit(formatStr(f, a)); return VOID; });
  def('format', 1, -1, (f, ...a) => formatStr(f, a));
  def('force', 1, 1, (p) => { if (!(p instanceof Promise_)) return p; if (!p.done) { const v = applyProc(p.value, []); p.done = true; p.value = v; } return p.value; });
  def('eval', 1, 1, (d) => evaluate(d, new Env(BASE, 'eval')));

  // ---------- running a program ----------
  // Runs `src` like a Racket module. Returns {output, error, results}.
  function run(src, opts = {}) {
    steps = 0; out = ''; LIMIT = opts.limit || 3000000;
    const results = [];
    let error = null;
    try {
      const forms = [];
      const flatten = (f) => { // a top-level (begin ...) is spliced into the module, like Racket
        if (f instanceof Pair && f.car === sym('begin') && isList(f) && f.cdr !== NIL) listToArr(f.cdr).forEach(flatten);
        else forms.push(f);
      };
      read(src).forEach(flatten);
      const G = new Env(BASE, 'top level');
      // 1. collect every top-level definition (forward references are allowed)
      const seen = new Set(); const macros = new Map();
      for (const f of forms) {
        if (headIs(f, 'define-syntax', G)) { macros.set(idName(f.cdr.car), makeMacro(f.cdr.car, f.cdr.cdr.car, G, f)); continue; }
        for (const nm of definedNames(f, G)) {
          const name = idName(nm);
          if (seen.has(name)) throw err('module: identifier already defined\n  in: ' + name);
          seen.add(name); G.vars.set(nm, UNDEF_TOP);
        }
      }
      for (const [k, m] of macros) G.vars.set(sym(k), m);
      // 2. check syntax of the whole program before running anything
      for (const f of forms) checkSyntax(f, G, macros);
      // 3. run each form; print the value of top-level expressions
      for (const f of forms) {
        if (headIs(f, 'define-syntax', G)) continue;
        const v = evaluate(f, G);
        const isDef = headIs(f, 'define', G) || headIs(f, 'struct', G);
        if (!isDef && v !== VOID) { if (out.length && !out.endsWith('\n') && false) out += '\n'; emit(printValue(v) + '\n'); results.push(v); }
      }
      if (opts.capture) opts.capture(G);
    } catch (e) {
      if (e instanceof RangeError || /call stack|too much recursion/i.test(String(e && e.message))) error = 'The program ran out of memory.\n(Infinite recursion: a function kept calling itself without ever reaching a base case.)';
      else if (e && e.racket) error = e.message;
      else error = 'internal error: ' + (e && e.message);
    }
    return { output: out, error, results, steps };
  }

  // iPhones type "smart quotes" — turn them back into plain ASCII so code still reads.
  function cleanSource(src) { return src.replace(/[‘’`´]/g, (c) => c === '`' ? '`' : "'").replace(/[“”]/g, '"').replace(/ /g, ' '); }

  // Call a Racket procedure value from JavaScript (used by the stream explorer).
  function call(f, args) {
    steps = 0; out = '';
    try { return { value: applyProc(f, args || []), output: out }; }
    catch (e) {
      const msg = e instanceof RangeError || /call stack|too much recursion/i.test(String(e && e.message)) ? 'The program ran out of memory.' : (e && e.racket ? e.message : 'internal error: ' + (e && e.message));
      return { error: msg, output: out };
    }
  }

  // ---------- macro expansion explorer ----------
  // Shows how a macro use expands, step by step, marking identifiers the macro renamed (hygiene).
  function expandInfo(defSrc, useSrc) {
    defSrc = cleanSource(defSrc); useSrc = cleanSource(useSrc);
    const G = new Env(BASE, 'top level'); const macros = new Map();
    for (const f of read(defSrc)) if (headIs(f, 'define-syntax', G)) { const m = makeMacro(f.cdr.car, f.cdr.cdr.car, G, f); macros.set(m.name, m); G.vars.set(f.cdr.car, m); }
    if (!macros.size) throw err('No define-syntax found in the macro definition box.');
    let form = read(useSrc)[0];
    const stepsOut = []; let firstBindings = null;
    const renameIds = new Map(); const binderRenames = new Set();
    const findBinders = (x) => { // renamed identifiers that the expansion BINDS (could capture user variables)
      if (!(x instanceof Pair)) return;
      const h = isId(x.car) ? idName(x.car) : null;
      if ((h === 'let' || h === 'let*' || h === 'letrec') && x.cdr instanceof Pair) {
        for (let b = x.cdr.car; b instanceof Pair; b = b.cdr) if (b.car instanceof Pair && b.car.car instanceof Rename) binderRenames.add(b.car.car);
      }
      if ((h === 'lambda' || h === 'λ') && x.cdr instanceof Pair) for (let p = x.cdr.car; p instanceof Pair; p = p.cdr) if (p.car instanceof Rename) binderRenames.add(p.car);
      for (let p = x; p instanceof Pair; p = p.cdr) findBinders(p.car);
    };
    function expandOnce(x) { // expand the leftmost-outermost macro use; returns [newForm, didExpand]
      if (!(x instanceof Pair)) return [x, false];
      if (isId(x.car) && idName(x.car) === 'quote') return [x, false];
      if (isId(x.car) && macros.has(idName(x.car))) {
        const m = macros.get(idName(x.car));
        for (const { pat, tmpl } of m.rules) {
          const b = new Map();
          if (match(pat.cdr, x.cdr, m.literals, b)) {
            if (!firstBindings) firstBindings = [...b.entries()].map(([k, v]) => [k, v instanceof Seq ? v.items.map(i => showSyntax(i)).join('  ') + '  (repeated)' : showSyntax(v)]);
            return [instantiate(tmpl, b, new Map(), m.env), true];
          }
        }
        throw err(`${m.name}: bad syntax\n  in: ${showSyntax(x)}\n(no pattern matched this use)`);
      }
      const items = []; let p = x, done = false;
      while (p instanceof Pair) { if (!done) { const [n, d] = expandOnce(p.car); items.push(n); done = d; } else items.push(p.car); p = p.cdr; }
      return [arrToList(items, p), done];
    }
    for (let k = 0; k < 40; k++) {
      const [n, d] = expandOnce(form); if (!d) break;
      form = n; findBinders(form); stepsOut.push(form);
    }
    const SUB = '₀₁₂₃₄₅₆₇₈₉';
    const sub = (k) => String(k).split('').map(c => SUB[+c]).join('');
    function show(x, marked) {
      if (x instanceof Rename) {
        if (marked && binderRenames.has(x)) { if (!renameIds.has(x)) renameIds.set(x, renameIds.size + 1); return '⟦' + idName(x) + sub(renameIds.get(x)) + '⟧'; }
        return idName(x);
      }
      if (x instanceof Pair) {
        if (isId(x.car) && QUOTE_ABBR[idName(x.car)] && x.cdr instanceof Pair && x.cdr.cdr === NIL) return QUOTE_ABBR[idName(x.car)] + show(x.cdr.car, marked);
        const h = isId(x.car) ? idName(x.car) : '';
        const br = (y) => y instanceof Pair ? '[' + show(y, marked).slice(1, -1) + ']' : show(y, marked);
        if ((h === 'let' || h === 'let*' || h === 'letrec') && x.cdr instanceof Pair && (x.cdr.car instanceof Pair || x.cdr.car === NIL)) {
          const bs = []; for (let b = x.cdr.car; b instanceof Pair; b = b.cdr) bs.push(br(b.car));
          const rest = []; for (let r = x.cdr.cdr; r instanceof Pair; r = r.cdr) rest.push(show(r.car, marked));
          return '(' + h + ' (' + bs.join(' ') + ')' + (rest.length ? ' ' + rest.join(' ') : '') + ')';
        }
        if (h === 'cond') { const cs = []; for (let c = x.cdr; c instanceof Pair; c = c.cdr) cs.push(br(c.car)); return '(cond ' + cs.join(' ') + ')'; }
        const parts = []; let p = x; while (p instanceof Pair) { parts.push(show(p.car, marked)); p = p.cdr; }
        return '(' + parts.join(' ') + (p === NIL ? '' : ' . ' + show(p, marked)) + ')';
      }
      return datum(x);
    }
    return {
      bindings: firstBindings || [],
      steps: stepsOut.map(s => show(s, true)),
      hygienic: stepsOut.length ? show(form, true) : null,
      naive: stepsOut.length ? show(form, false) : null,
    };
  }

  global.Racket = {
    run: (src, opts) => run(cleanSource(src), opts), call, expandInfo, cleanSource,
    lookup: (G, name) => G.vars.get(sym(name)),
    read, printValue, displayValue, datum,
    Sym, Pair, MPair, StructVal, Closure, Prim, Promise_, NIL, VOID, sym, isList,
  };
  if (typeof module !== 'undefined') module.exports = global.Racket;
})(typeof window !== 'undefined' ? window : globalThis);
