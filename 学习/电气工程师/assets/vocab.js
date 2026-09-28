/* 背词小程序：考研大纲词（window.VOCAB，由 vocab/build_vocab.py 生成）+ SM-2 间隔重复。window.Vocab
   进度存本机 localStorage，按真实日期计算（不受 ?today= 模拟日期影响） */
(function(){
  const P = window.Plan, St = window.Store, ic = P.icon;
  const $ = (s, r=document)=>r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const KEY = 'ncepu-ee-vocab-v1';      // {cards:{word:{e,r,i,d,l}}, days:{"YYYY-MM-DD":{n,rv,done}}, cfg:{daily,auto}}
  const PLAN_DAILY = 50;                 // 计划节奏：每天 50 新词，用于计算「计划应在 Unit」
  const DAILY_OPTS = [20, 30, 50, 75, 100];
  const VD = window.VOCAB;
  const W = VD ? VD.words : [];
  const N = W.length, UNITS = VD ? VD.meta.units : 22, USIZE = VD ? VD.meta.unitSize : 1;
  const RANK = new Map(W.map((w, i)=>[w[0], i]));

  const load = ()=>{ try{ return JSON.parse(localStorage.getItem(KEY)) || {}; }catch(e){ return {}; } };
  const S = Object.assign({cards:{}, days:{}}, load());
  S.cfg = Object.assign({daily:PLAN_DAILY, auto:false}, S.cfg);
  let warned = false;
  function save(){
    try{ localStorage.setItem(KEY, JSON.stringify(S)); }
    catch(e){ if(!warned){ warned = true; St.toast('背词进度保存失败：浏览器存储空间不足'); } }
  }

  const today = ()=>P.ymd(St.realToday());
  const addDays = (k, n)=>{ const d = P.parse(k); d.setDate(d.getDate() + n); return P.ymd(d); };
  const dayRec = k => S.days[k] || {n:0, rv:0};
  const unitOf = i => Math.min(UNITS, Math.floor(i / USIZE) + 1);

  function stats(){
    const t = today();
    let learned = 0, mature = 0, due = 0;
    for(const w in S.cards){
      if(!RANK.has(w)) continue;
      const c = S.cards[w];
      learned++;
      if(c.i >= 21) mature++;
      if(c.d <= t) due++;
    }
    const d = dayRec(t);
    return {learned, mature, due, n:d.n, rv:d.rv, done:!!d.done, target:Math.min(S.cfg.daily, d.n + N - learned)};
  }
  function streak(){
    let k = today();
    if(!dayRec(k).done) k = addDays(k, -1);
    let n = 0;
    while(dayRec(k).done){ n++; k = addDays(k, -1); }
    return n;
  }
  function plan(learned){
    const expected = Math.min(N, Math.max(1, P.days(P.W1, St.realToday()) + 1) * PLAN_DAILY);
    return {expected, cur:unitOf(Math.min(learned, N - 1)), want:Math.max(1, Math.ceil(expected / USIZE))};
  }

  /* ---------- SM-2（3 档：1 不认识 / 2 模糊 / 3 认识） ---------- */
  function schedule(c, g, t){
    if(g === 1){ c.e = Math.max(1.3, c.e - .2); c.r = 0; c.l++; c.i = 1; }
    else{
      c.e = g === 3 ? Math.min(3, c.e + .05) : Math.max(1.3, c.e - .15);
      const prev = c.i;
      c.r++;
      if(c.r === 1) c.i = g === 3 ? 3 : 1;
      else if(c.r === 2) c.i = g === 3 ? 7 : 3;
      else c.i = Math.max(prev + 1, Math.round(prev * (g === 3 ? c.e : 1.2)));
      c.i = Math.min(c.i, 120);
    }
    c.d = addDays(t, c.i);
  }

  /* ---------- 会话队列：到期复习在前，今日新词补足配额；「不认识」隔几张再来一次 ---------- */
  let queue = [], pos = 0, flipped = false, undoStack = [], spoken = null;
  function buildQueue(){
    const t = today(), st = stats();
    const due = Object.keys(S.cards).filter(w=>RANK.has(w) && S.cards[w].d <= t)
      .sort((a, b)=>S.cards[a].d < S.cards[b].d ? -1 : S.cards[a].d > S.cards[b].d ? 1 : RANK.get(a) - RANK.get(b));
    const fresh = [];
    for(let i = 0, need = Math.max(0, st.target - st.n); i < N && fresh.length < need; i++) if(!S.cards[W[i][0]]) fresh.push(W[i][0]);
    queue = due.map(w=>({w, kind:'rev'})).concat(fresh.map(w=>({w, kind:'new'})));
    pos = 0; flipped = false; undoStack = []; spoken = null;
  }
  function grade(g){
    const it = queue[pos];
    if(!it || !flipped) return;
    const t = today();
    const snap = {pos, dayKey:t, card:S.cards[it.w] ? Object.assign({}, S.cards[it.w]) : null, day:S.days[t] ? Object.assign({}, S.days[t]) : null, reqIdx:null};
    if(it.kind !== 'again'){
      const c = S.cards[it.w] || {e:2.5, r:0, i:0, d:t, l:0};
      schedule(c, g, t);
      S.cards[it.w] = c;
      const d = S.days[t] || (S.days[t] = {n:0, rv:0});
      if(it.kind === 'new') d.n++; else d.rv++;
    }
    if(g === 1){ snap.reqIdx = Math.min(pos + 5, queue.length); queue.splice(snap.reqIdx, 0, {w:it.w, kind:'again'}); }
    undoStack.push(snap);
    pos++; flipped = false;
    save();
    checkDone();
    render();
  }
  function undo(){
    const s = undoStack.pop();
    if(!s) return;
    const it = queue[s.pos];
    if(s.reqIdx != null) queue.splice(s.reqIdx, 1);
    if(s.card) S.cards[it.w] = s.card; else delete S.cards[it.w];
    if(s.day) S.days[s.dayKey] = s.day; else delete S.days[s.dayKey];
    pos = s.pos; flipped = true;
    save(); render();
  }

  /* ---------- 完成判定 + 自动打卡（只自动勾选，从不自动取消） ---------- */
  function checkDone(){
    const t = today(), st = stats();
    if(st.done || pos < queue.length || st.due || st.n < st.target || !(st.n + st.rv)) return;
    S.days[t].done = 1;
    save();
    const ticked = [];
    const tick = id =>{ const c = St.CHECKS_FLAT.find(x=>x.auto === id); if(c && !St.S.plan[c.k]){ St.setPlan(c.k, true); ticked.push(c.k); } };
    tick('vocab-start');
    if(streak() >= 14) tick('vocab-streak14');
    const r = $('#vocab .vx-stage');
    if(r){ const b = r.getBoundingClientRect(); St.confetti(b.left + b.width/2, b.top + b.height/3); }
    St.toast(`今日背词完成 · 连续 ${streak()} 天` + (ticked.length ? `，已自动打卡 ${ticked.length} 项` : ''),
      ticked.length ? ()=>ticked.forEach(k=>St.setPlan(k, false)) : null);
  }

  /* ---------- 发音（浏览器 TTS） ---------- */
  const TTS = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  let voice = null;
  const pickVoice = ()=>{ const vs = speechSynthesis.getVoices(); voice = vs.find(v=>/^en[-_]US/i.test(v.lang)) || vs.find(v=>/^en/i.test(v.lang)) || null; };
  if(TTS){ pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(w){
    if(!TTS || !w) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(w);
    u.lang = voice ? voice.lang : 'en-US';
    if(voice) u.voice = voice;
    u.rate = .9;
    speechSynthesis.speak(u);
  }

  /* ---------- 全屏弹层 ---------- */
  const dlg = $('#vocab');
  function shell(){
    dlg.innerHTML = `
      <div class="vx-h"><h2>${ic('cards')}背词</h2><span class="vx-count" data-vx-count></span>
        <span class="grow"></span><span class="pill" data-vx-unit></span>
        <button class="btn icon" type="button" data-vx="close" aria-label="关闭">${ic('x')}</button></div>
      <div class="vx-prog" aria-hidden="true"><i data-vx-prog></i></div>
      <div class="vx-stage" data-vx-stage tabindex="-1" aria-live="polite"></div>
      <div class="vx-f">
        <label class="vx-opt">每日新词<select data-vx-daily>${DAILY_OPTS.map(n=>`<option value="${n}"${n === S.cfg.daily ? ' selected' : ''}>${n}${n === PLAN_DAILY ? '（计划）' : ''}</option>`).join('')}</select></label>
        <label class="vx-opt"${TTS ? '' : ' hidden'}><input type="checkbox" data-vx-auto${S.cfg.auto ? ' checked' : ''}>自动发音</label>
        <span class="grow"></span>
        <span class="vx-keys"><kbd>空格</kbd>翻面 <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd>评分 <kbd>R</kbd>发音 <kbd>U</kbd>撤销 <kbd>Esc</kbd>关闭</span>
        <button class="btn sm" type="button" data-vx="undo">${ic('undo')}撤销</button>
      </div>`;
  }
  function lines(trans){
    return trans.split('\n').map(l=>{
      const m = l.match(/^([a-z]+\.(?:\s*&\s*[a-z]+\.)?)\s*(.*)$/i);
      return `<li>${m ? `<b class="pos">${esc(m[1])}</b>${esc(m[2])}` : esc(l)}</li>`;
    }).join('');
  }
  function render(){
    if(!dlg.open) return;
    const st = stats(), pl = plan(st.learned), stage = $('[data-vx-stage]', dlg);
    $('[data-vx-count]', dlg).textContent = `今日 ${st.n}/${st.target} 新 · 复习 ${st.rv}/${st.rv + st.due}`;
    const u = $('[data-vx-unit]', dlg);
    u.textContent = `当前 Unit ${pl.cur} · 计划应在 Unit ${pl.want}`;
    u.className = 'pill ' + (pl.cur < pl.want ? 'warn' : 'good');
    $('[data-vx-prog]', dlg).style.width = (queue.length ? pos / queue.length * 100 : 100) + '%';
    $('[data-vx="undo"]', dlg).disabled = !undoStack.length;
    const it = queue[pos];
    if(!it){ stage.innerHTML = doneView(st); stage.focus(); return; }
    const i = RANK.get(it.w), [w, ph, trans, forms, collins] = W[i];
    const tier = i < N/3 ? ['高频', 'good'] : i < N*2/3 ? ['中频', 'accent'] : ['低频', ''];
    stage.innerHTML = `
      <article class="vx-card${flipped ? ' flipped' : ''}">
        <span class="vx-tag ${it.kind}">${{new:'新词', rev:'复习', again:'再来一次'}[it.kind]}</span>
        <div class="vx-word" lang="en">${esc(w)}</div>
        <div class="vx-ph">${ph ? `<span lang="en">${esc(ph)}</span>` : ''}
          ${TTS ? `<button class="btn icon sm" type="button" data-vx="speak" aria-label="发音（R）">${ic('volume')}</button>` : ''}</div>
        ${flipped ? `<div class="vx-back">
            <ul class="vx-tr">${lines(trans)}</ul>
            ${forms ? `<p class="vx-forms">${esc(forms)}</p>` : ''}
            <p class="vx-meta">${collins ? `<span class="stars" aria-label="柯林斯 ${collins} 星">${'★'.repeat(collins)}<span>${'★'.repeat(5 - collins)}</span></span>` : ''}
              <span class="pill ${tier[1]}">${tier[0]}</span><span class="muted">#${i + 1} · Unit ${unitOf(i)}</span></p>
          </div>` : `<button class="btn vx-flip" type="button" data-vx="flip"><kbd>空格</kbd>翻面</button>`}
      </article>
      ${flipped ? `<div class="vx-grades" role="group" aria-label="自评">
        <button class="btn vx-g1" type="button" data-vx="grade" data-g="1"><kbd>1</kbd>不认识</button>
        <button class="btn vx-g2" type="button" data-vx="grade" data-g="2"><kbd>2</kbd>模糊</button>
        <button class="btn vx-g3" type="button" data-vx="grade" data-g="3"><kbd>3</kbd>认识</button></div>` : ''}`;
    stage.focus();
    if(!flipped && S.cfg.auto && spoken !== it){ spoken = it; speak(w); }
  }
  function doneView(st){
    if(!st.done && !(st.n + st.rv) && st.learned >= N) return `<div class="vx-done">${ic('check')}<h3>词表已全部学完</h3>
      <p class="muted">没有到期的复习，明天再来。</p><button class="btn primary" type="button" data-vx="close">返回今天</button></div>`;
    const t = today(), tomorrow = addDays(t, 1);
    const next = Object.keys(S.cards).filter(w=>RANK.has(w) && S.cards[w].d <= tomorrow).length;
    return `<div class="vx-done">${ic('check')}<h3>${st.done ? '今日背词完成' : '本轮已背完'}</h3>
      <p>新词 <b>${st.n}</b> · 复习 <b>${st.rv}</b> · 连续 <b>${streak()}</b> 天</p>
      <p class="muted">明天待复习 ${next} 词</p>
      <button class="btn primary" type="button" data-vx="close">返回今天</button></div>`;
  }
  function open(){
    if(!VD){ St.toast('词库未生成：请先运行 python vocab/build_vocab.py'); return; }
    if(dlg.open) return;
    buildQueue();
    shell();
    dlg.showModal();
    checkDone();
    render();
  }
  function flip(){ if(queue[pos] && !flipped){ flipped = true; render(); } }

  dlg.addEventListener('click', e=>{
    if(e.target === dlg){ dlg.close(); return; }
    const b = e.target.closest('[data-vx]');
    if(!b){ if(e.target.closest('.vx-card:not(.flipped)')) flip(); return; }
    const a = b.dataset.vx;
    if(a === 'close') dlg.close();
    else if(a === 'flip') flip();
    else if(a === 'grade') grade(+b.dataset.g);
    else if(a === 'speak'){ const it = queue[pos]; if(it) speak(it.w); }
    else if(a === 'undo') undo();
  });
  dlg.addEventListener('change', e=>{
    const t = e.target;
    if(t.matches('[data-vx-daily]')){ S.cfg.daily = +t.value; save(); buildQueue(); render(); renderCards(); }
    else if(t.matches('[data-vx-auto]')){ S.cfg.auto = t.checked; save(); if(t.checked && queue[pos]) speak(queue[pos].w); }
  });
  dlg.addEventListener('keydown', e=>{
    if(e.ctrlKey || e.metaKey || e.altKey || e.target.tagName === 'SELECT') return;
    const k = e.key.toLowerCase();
    if(k === ' ' && e.target.type !== 'checkbox'){ e.preventDefault(); flip(); }
    else if(/^[123]$/.test(k) && flipped){ e.preventDefault(); grade(+k); }
    else if(k === 'r'){ const it = queue[pos]; if(it) speak(it.w); }
    else if(k === 'u') undo();
  });
  dlg.addEventListener('close', ()=>{ if(TTS) speechSynthesis.cancel(); renderCards(); });
  document.addEventListener('click', e=>{ if(e.target.closest('[data-vocab-open]')) open(); });

  /* ---------- 今天视图 Bento 卡片 ---------- */
  function heat(){
    const t = St.realToday(), start = new Date(t);
    start.setDate(t.getDate() - (t.getDay() + 6) % 7 - 49);
    let h = '';
    for(let i = 0; i < 56; i++){
      const d = new Date(start); d.setDate(start.getDate() + i);
      const k = P.ymd(d);
      if(d > t){ h += '<i class="fut"></i>'; continue; }
      const r = dayRec(k), n = r.n + r.rv;
      const lv = !n ? 0 : n >= 150 ? 4 : n >= 100 ? 3 : r.done ? 2 : 1;
      h += `<i class="l${lv}" title="${k} · 新词 ${r.n} · 复习 ${r.rv}${r.done ? ' · 已完成' : ''}"></i>`;
    }
    return h;
  }
  function card(){
    const head = `<h3>${ic('cards')}考研词汇 · 英二<span class="grow"></span>`;
    if(!VD) return `${head}<span class="pill warn">词库未生成</span></h3>
      <p class="muted">在项目目录运行 <code>python vocab/build_vocab.py</code> 生成词库（vocab.db → assets/vocab-data.js）后刷新页面。</p>`;
    const st = stats(), pl = plan(st.learned), sk = streak(), lag = pl.expected - st.learned;
    return `${head}<span class="pill ${lag > 0 ? 'warn' : 'good'}">${lag > 0 ? `落后计划 ${lag} 词` : '符合计划'}</span></h3>
      <div class="vc-body">
        <div class="vc-stats">
          <div class="vc-stat"><span>今日新词</span><b>${st.n}<small>/${st.target}</small></b><div class="bar"><i style="width:${st.target ? Math.min(100, st.n / st.target * 100) : 100}%"></i></div></div>
          <div class="vc-stat"><span>待复习</span><b>${st.due}</b></div>
          <div class="vc-stat"><span>连续打卡</span><b>${sk}<small>天</small></b></div>
          <div class="vc-stat"><span>已掌握</span><b>${st.mature}<small>/${N}</small></b></div>
        </div>
        <div class="vc-heat-wrap"><div class="vc-heat" role="img" aria-label="近 8 周背词热力图">${heat()}</div>
          <div class="vc-legend muted">近 8 周<span class="grow"></span>少<i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i>多</div></div>
        <div class="vc-go">
          <p class="muted">已学 ${st.learned}/${N} · 当前 Unit ${pl.cur} / ${UNITS} · 计划 Unit ${pl.want}</p>
          <button class="btn primary" type="button" data-vocab-open>${ic(st.done ? 'check' : 'play')}${st.done ? '今日已完成' : st.n || st.rv ? '继续背词' : '开始背词'}</button>
        </div>
      </div>`;
  }
  function renderCards(root){
    (root || document).querySelectorAll('[data-vocab]').forEach(el=>{ el.innerHTML = card(); });
  }
  function summary(){
    if(!VD) return '词库未生成';
    const st = stats();
    return `今日 ${st.n}/${st.target} 新 · 待复习 ${st.due} · 连续 ${streak()} 天`;
  }

  window.Vocab = {open, renderCards, summary, stats, streak, schedule, get ready(){ return !!VD; }};
})();
