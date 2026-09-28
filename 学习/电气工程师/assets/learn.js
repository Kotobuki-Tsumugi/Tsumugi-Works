/* 统一学习中心：今天视图「今日复习」卡 + 全屏弹层（总览 / 词汇 / 数二公式 / 831 / 数二真题 / 错题本）。window.Learn
   公式卡与错题复用 Vocab.schedule（SM-2）；公式卡按路线块解锁章节，每卡组每日新卡上限可调；
   真题按年整套或按章节刷，自评 对/半对/错，错与半对自动进错题本，连续 3 次「会」后移出。
   进度存 localStorage（真实日期）；真题数据与 KaTeX 首次需要时再加载 */
(function(){
  const P = window.Plan, St = window.Store, ic = P.icon;
  const $ = (s, r=document)=>r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const KEY = 'ncepu-ee-learn-v1';
  const DAILY_OPTS = [5, 10, 15, 20, 30];
  const EXAM_SEC = 3 * 3600;
  const GRADE = {3:['对', 'good'], 2:['半对', 'warn'], 1:['错', 'bad']};
  const KIND = {c:'选择', f:'填空', a:'解答'};
  const DECKS = [['math2', window.DECK_MATH2, 'sigma', '数二公式'], ['ee831', window.DECK_EE831, 'bolt', '831 电力系统']]
    .filter(d=>d[1]).map(([id, D, icon, label])=>({id, D, icon, label, byId:new Map(D.cards.map((c, i)=>[c[0], i]))}));
  const deckOf = id => DECKS.find(d=>d.id === id);

  /* S = {decks:{id:{cards:{cid:{e,r,i,d,l}}, extra, daily}}, days:{ymd:{id:{n,rv}, q, w}},
          grades:{qid:{g, t, pick}}, attempts:{year:{acc, run}}, ch:{qid:ch}, wrong:{qid:{e,r,i,d,l,s,note,added}}} */
  const load = ()=>{ try{ return JSON.parse(localStorage.getItem(KEY)) || {}; }catch(e){ return {}; } };
  const S = Object.assign({decks:{}, days:{}, grades:{}, attempts:{}, ch:{}, wrong:{}}, load());
  DECKS.forEach(d=>{ S.decks[d.id] = Object.assign({cards:{}, extra:0, daily:10}, S.decks[d.id]); });
  let warned = false;
  function save(){
    try{ localStorage.setItem(KEY, JSON.stringify(S)); }
    catch(e){ if(!warned){ warned = true; St.toast('学习进度保存失败：浏览器存储空间不足'); } }
  }

  const today = ()=>P.ymd(St.realToday());
  const addDays = (k, n)=>{ const d = P.parse(k); d.setDate(d.getDate() + n); return P.ymd(d); };
  const dayRec = ()=>S.days[today()] || (S.days[today()] = {});
  const fresh = ()=>({e:2.5, r:0, i:0, d:today(), l:0});
  const schedule = (c, g)=>window.Vocab.schedule(c, g, today());
  const clone = o => o ? JSON.parse(JSON.stringify(o)) : null;

  /* ---------- 公式卡：章节按路线块日期解锁（模拟日期 ?today= 也生效，便于预览），可手动提前解锁 ---------- */
  function chapterState(d){
    const t = P.ymd(P.today()), order = d.D.chapters.map((c, i)=>i).sort((a, b)=>d.D.chapters[a].from < d.D.chapters[b].from ? -1 : d.D.chapters[a].from > d.D.chapters[b].from ? 1 : a - b);
    const open = new Set(order.filter(i=>d.D.chapters[i].from <= t));
    let extra = S.decks[d.id].extra;
    for(const i of order){ if(extra <= 0) break; if(!open.has(i)){ open.add(i); extra--; } }
    return {open, next:order.find(i=>!open.has(i))};
  }
  function deckStats(d){
    const st = S.decks[d.id], t = today(), {open} = chapterState(d), rec = (S.days[t] || {})[d.id] || {n:0, rv:0};
    let learned = 0, mature = 0, due = 0, avail = 0;
    d.D.cards.forEach(c=>{
      const p = st.cards[c[0]];
      if(p){ learned++; if(p.i >= 21) mature++; if(p.d <= t) due++; }
      else if(open.has(c[1])) avail++;
    });
    return {learned, mature, due, avail, n:rec.n, rv:rec.rv, total:d.D.cards.length, target:rec.n + Math.min(avail, Math.max(0, st.daily - rec.n))};
  }
  function wrongStats(){
    const t = today(), ids = Object.keys(S.wrong);
    return {total:ids.length, due:ids.filter(k=>S.wrong[k].d <= t).length};
  }
  function bump(id, f){ const r = dayRec(); r[id] = r[id] || {n:0, rv:0}; r[id][f]++; }
  /* ---------- 复习会话（公式卡 / 错题共用）：到期在前，新卡补足；「不会」隔 5 张再来 ---------- */
  let ses = null;   // {type:'deck'|'wrong', id, queue:[{k, kind}], pos, flipped, undo:[]}
  function startDeck(id){
    const d = deckOf(id), st = S.decks[id], t = today(), s = deckStats(d), {open} = chapterState(d);
    const due = d.D.cards.filter(c=>st.cards[c[0]] && st.cards[c[0]].d <= t)
      .sort((a, b)=>st.cards[a[0]].d < st.cards[b[0]].d ? -1 : st.cards[a[0]].d > st.cards[b[0]].d ? 1 : d.byId.get(a[0]) - d.byId.get(b[0]));
    const nw = d.D.cards.filter(c=>!st.cards[c[0]] && open.has(c[1])).slice(0, Math.max(0, s.target - s.n));
    ses = {type:'deck', id, queue:due.map(c=>({k:c[0], kind:'rev'})).concat(nw.map(c=>({k:c[0], kind:'new'}))), pos:0, flipped:false, undo:[]};
  }
  function startWrong(){
    const t = today();
    const due = Object.keys(S.wrong).filter(k=>S.wrong[k].d <= t && Q.has(k)).sort((a, b)=>S.wrong[a].d < S.wrong[b].d ? -1 : 1);
    ses = {type:'wrong', id:'wrong', queue:due.map(k=>({k, kind:'rev'})), pos:0, flipped:false, undo:[]};
  }
  function grade(g){
    const it = ses && ses.queue[ses.pos];
    if(!it || !ses.flipped) return;
    const t = today(), store = ses.type === 'deck' ? S.decks[ses.id].cards : S.wrong;
    const snap = {pos:ses.pos, prev:clone(store[it.k]), day:clone(S.days[t]), dayKey:t, req:null};
    let gone = false;
    if(it.kind !== 'again'){
      const c = store[it.k] || fresh();
      schedule(c, g);
      if(ses.type === 'wrong'){ c.s = g === 3 ? (c.s || 0) + 1 : 0; if(c.s >= 3){ delete store[it.k]; gone = true; } else store[it.k] = c; }
      else store[it.k] = c;
      bump(ses.id, it.kind === 'new' ? 'n' : 'rv');
    }
    if(g === 1 && !gone){ snap.req = Math.min(ses.pos + 5, ses.queue.length); ses.queue.splice(snap.req, 0, {k:it.k, kind:'again'}); }
    ses.undo.push(snap);
    ses.pos++; ses.flipped = false;
    save();
    if(gone) St.toast('连续 3 次会做，已移出错题本');
    if(ses.pos >= ses.queue.length) finished();
    render();
  }
  function undo(){
    const s = ses && ses.undo.pop();
    if(!s) return;
    const it = ses.queue[s.pos], store = ses.type === 'deck' ? S.decks[ses.id].cards : S.wrong;
    if(s.req != null) ses.queue.splice(s.req, 1);
    if(s.prev) store[it.k] = s.prev; else delete store[it.k];
    if(s.day) S.days[s.dayKey] = s.day; else delete S.days[s.dayKey];
    ses.pos = s.pos; ses.flipped = true;
    save(); render();
  }
  function finished(){
    const r = $('#learn .lx-body');
    if(r && ses.queue.length){ const b = r.getBoundingClientRect(); St.confetti(b.left + b.width/2, b.top + b.height/3); }
  }
  function flip(){ if(ses && ses.queue[ses.pos] && !ses.flipped){ ses.flipped = true; render(); } }

  /* 卡片文本：转义 HTML，保留 $…$ / \(…\) 供 KaTeX 渲染 */
  const txt = s => esc(s).replace(/\n/g, '<br>');
  const IMP = {'必背':'bad', '常用':'accent', '技巧':'good', '了解':''};
  function deckCard(d, c, it){
    const [, ch, sec, title, imp, formula, cond, tip, use, err, ex] = c;
    const row = (k, v)=>v ? `<div class="lx-row"><b>${k}</b><div>${txt(v)}</div></div>` : '';
    return `<article class="lx-card${ses.flipped ? ' flipped' : ''}">
        <span class="vx-tag ${it.kind}">${{new:'新卡', rev:'复习', again:'再来一次'}[it.kind]}</span>
        <p class="lx-where">${esc(d.label)} · ${esc(d.D.chapters[ch].name)}${sec ? ` · ${esc(sec)}` : ''}</p>
        <h3 class="lx-title">${txt(title)}${imp ? ` <span class="pill ${IMP[imp] || ''}">${esc(imp)}</span>` : ''}</h3>
        ${ses.flipped ? `<div class="lx-back">
            <div class="lx-formula">${esc(formula)}</div>
            ${row('条件', cond)}${row('要点', tip)}${row('用法', use)}${row('易错', err)}
            ${ex ? `<details class="lx-ex"><summary>例题</summary><div>${txt(ex)}</div></details>` : ''}
          </div>` : `<button class="btn vx-flip" type="button" data-lx="flip"><kbd>空格</kbd>翻面</button>`}
      </article>`;
  }
  function wrongCard(k, it){
    const {q, paper} = Q.get(k), w = S.wrong[k] || {};
    return `<article class="lx-card lx-q${ses.flipped ? ' flipped' : ''}">
        <span class="vx-tag ${it.kind}">${it.kind === 'again' ? '再来一次' : `错题 · 连对 ${w.s || 0}/3`}</span>
        <p class="lx-where">${paper.year} 数二 · 第 ${esc(q[1])} 题 · ${KIND[q[2]]} ${q[3]} 分 · ${esc(chName(q))}</p>
        ${w.note ? `<p class="lx-note">${ic('note')}${esc(w.note)}</p>` : ''}
        <div class="lx-qbody">${q[5]}</div>
        ${ses.flipped ? `<div class="lx-ans">${q[7] ? `<p><b>答案</b> ${esc(q[7])}</p>` : ''}${q[6] || '<p class="muted">此题暂无解析</p>'}</div>`
          : `<button class="btn vx-flip" type="button" data-lx="flip"><kbd>空格</kbd>看答案</button>`}
      </article>`;
  }
  function sessionView(){
    const it = ses.queue[ses.pos];
    if(!it){
      const n = ses.undo.length;
      return `<div class="vx-done">${ic('check')}<h3>${n ? '本轮完成' : '暂无到期内容'}</h3>
        <p class="muted">${n ? `共评 ${n} 次` : ses.type === 'deck' ? '今日新卡已达上限或章节未解锁；返回卡组页可调上限或提前解锁下一章。' : '错题本没有到期题目。'}</p>
        <button class="btn primary" type="button" data-lx="end">返回</button></div>`;
    }
    const body = ses.type === 'deck' ? deckCard(deckOf(ses.id), deckOf(ses.id).D.cards[deckOf(ses.id).byId.get(it.k)], it) : wrongCard(it.k, it);
    return body + (ses.flipped ? `<div class="vx-grades" role="group" aria-label="自评">
        <button class="btn vx-g1" type="button" data-lx="grade" data-g="1"><kbd>1</kbd>不会</button>
        <button class="btn vx-g2" type="button" data-lx="grade" data-g="2"><kbd>2</kbd>模糊</button>
        <button class="btn vx-g3" type="button" data-lx="grade" data-g="3"><kbd>3</kbd>会</button></div>` : '');
  }
  /* ---------- 懒加载：真题数据 + KaTeX ---------- */
  const Q = new Map();   // qid → {q, paper}
  const PM = ()=>window.PAPERS_MATH2;
  const CHS = ()=>window.DECK_MATH2 ? window.DECK_MATH2.chapters : [];
  function loadScript(src){
    return new Promise((res, rej)=>{
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = ()=>{ s.remove(); rej(new Error(src)); };
      document.head.append(s);
    });
  }
  let papersP = null, papersErr = false;
  function index(){ if(!Q.size && PM()) PM().papers.forEach(p=>p.qs.forEach(q=>Q.set(q[0], {q, paper:p}))); }
  function needPapers(){
    if(PM()){ index(); return Promise.resolve(); }
    if(!papersP){
      papersErr = false;
      papersP = loadScript('assets/math2-papers.js').then(()=>{ index(); if(dlg.open) render(); },
        ()=>{ papersP = null; papersErr = true; if(dlg.open) render(); });
    }
    return papersP;
  }
  const loading = ()=>papersErr
    ? `<div class="vx-done">${ic('alert')}<h3>真题数据未生成</h3><p class="muted">在项目目录运行 <code>python math2/build_math2.py</code> 后刷新页面。</p></div>`
    : `<p class="lx-loading muted">正在加载真题…</p>`;
  let katexP = null, mathWarned = false;
  const KX = {delimiters:[{left:'$$', right:'$$', display:true}, {left:'\\[', right:'\\]', display:true},
    {left:'\\(', right:'\\)', display:false}, {left:'$', right:'$', display:false}],
    throwOnError:false, strict:'ignore', ignoredTags:['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option', 'select']};
  function loadKatex(){
    if(window.renderMathInElement) return Promise.resolve();
    if(!katexP){
      if(!$('link[data-katex]')) document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="assets/katex/katex.min.css" data-katex>');
      katexP = loadScript('assets/katex/katex.min.js').then(()=>loadScript('assets/katex/auto-render.min.js')).catch(e=>{ katexP = null; throw e; });
    }
    return katexP;
  }
  function math(el){
    if(el) loadKatex().then(()=>window.renderMathInElement(el, KX),
      ()=>{ if(!mathWarned){ mathWarned = true; St.toast('公式渲染库 assets/katex 加载失败，公式以源码显示'); } });
  }

  /* ---------- 真题：章节（可手动改）、得分、计时 ---------- */
  const chIdx = q => S.ch[q[0]] != null ? S.ch[q[0]] : q[4];
  const chName = q => (CHS()[chIdx(q)] || {name:`第 ${chIdx(q)} 章`}).name;
  const fmt = n => String(+n.toFixed(1));
  const pad = n => String(n).padStart(2, '0');
  function paperScore(p){
    let got = 0, done = 0, pts = 0;
    p.qs.forEach(q=>{ const r = S.grades[q[0]]; if(r){ done++; pts += q[3]; got += q[3] * (r.g === 3 ? 1 : r.g === 2 ? .5 : 0); } });
    return {got, done, pts, n:p.qs.length, full:Math.round(got / (p.total || 150) * 150), est:pts ? Math.round(got / pts * 150) : 0};
  }
  function scoreLine(p){
    const s = paperScore(p);
    if(!s.done) return '在纸上作答，逐题看答案后自评 对 / 半对 / 错；选择题可直接点选项自动判分。';
    return `已评 ${s.done}/${s.n} 题 · 得分 <b>${fmt(s.got)}</b>/${p.total}` + (p.total !== 150 ? ` · 折合 <b>${s.full}</b>/150` : '')
      + (s.done < s.n ? ` · 已评部分得分率 ${Math.round(s.got / s.pts * 100)}%（照此估 ${s.est}/150）` : '');
  }
  const elapsed = a => a.acc + (a.run ? Math.max(0, (Date.now() - a.run) / 1000) : 0);
  function clock(y){
    const a = S.attempts[y];
    const left = EXAM_SEC - (a ? elapsed(a) : 0), s = Math.abs(Math.round(left));
    return (left < 0 ? '超时 ' : '') + `${pad(s / 3600 | 0)}:${pad(s / 60 % 60 | 0)}:${pad(s % 60)}`;
  }
  function timerToggle(y){
    const a = S.attempts[y] || (S.attempts[y] = {acc:0, run:0});
    if(a.run){ a.acc = elapsed(a); a.run = 0; } else a.run = Date.now();
    save(); render();
  }
  let tick = 0;
  function clockTick(){
    clearInterval(tick); tick = 0;
    const a = pv.year && S.attempts[pv.year];
    if(!dlg.open || tab !== 'papers' || !a || !a.run) return;
    tick = setInterval(()=>{
      const el = $('[data-lx-clock]', dlg);
      if(!el){ clearInterval(tick); return; }
      el.textContent = clock(pv.year);
      if(elapsed(a) >= EXAM_SEC && !el.classList.contains('over')){ el.classList.add('over'); St.toast('3 小时到：停笔，开始对答案'); }
    }, 1000);
  }

  const revealed = new Set();
  const pv = {mode:'year', year:null, ch:null, filter:'all', limit:10};
  function qView(q, paper, withYear){
    const [id, label, kind, pts, , qh, ah, key, ref] = q, r = S.grades[id], open = revealed.has(id), w = S.wrong[id];
    const pick = kind === 'c' && /^[A-D]$/.test(key || '') ? `<div class="lx-pick" role="group" aria-label="点选答案自动判分">${[...'ABCD'].map(x=>
      `<button class="btn sm${r && r.pick === x ? (x === key ? ' good' : ' bad') : ''}" type="button" data-lx="pick" data-q="${id}" data-v="${x}">${x}</button>`).join('')}</div>` : '';
    return `<article class="lx-qa${r ? ' g' + r.g : ''}" data-qid="${id}">
      <header><b>${withYear ? `${paper.year} · ` : ''}第 ${esc(label)} 题</b><span class="muted">${KIND[kind] || ''} · ${pts} 分${ref ? ` · ${esc(ref)}` : ''}</span>
        <select data-lx-ch="${id}" aria-label="所属章节（可改）">${CHS().map((c, i)=>`<option value="${i}"${i === chIdx(q) ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
        <span class="grow"></span>${w ? `<span class="pill">${ic('note')}错题本</span>` : ''}${r ? `<span class="pill ${GRADE[r.g][1]}">${GRADE[r.g][0]}</span>` : ''}</header>
      <div class="lx-qbody">${qh}</div>
      ${pick}
      <div class="lx-qact">
        <button class="btn sm" type="button" data-lx="reveal" data-q="${id}" aria-expanded="${open}">${ic(open ? 'fold' : 'file')}${open ? '收起答案' : '看答案'}</button>
        <span class="grow"></span>
        <span class="lx-g" role="group" aria-label="自评">${[3, 2, 1].map(g=>`<button class="btn sm${r && r.g === g ? ' on ' + GRADE[g][1] : ''}" type="button" data-lx="qgrade" data-q="${id}" data-g="${g}" aria-pressed="${!!(r && r.g === g)}">${GRADE[g][0]}</button>`).join('')}</span>
      </div>
      ${w ? `<label class="lx-noteedit">${ic('note')}<input type="text" maxlength="120" placeholder="错因（可选，一句话）" value="${esc(w.note || '')}" data-lx-note="${id}"></label>` : ''}
      ${open ? `<div class="lx-ans">${key ? `<p><b>答案</b> ${esc(key)}</p>` : ''}${ah || '<p class="muted">此题暂无解析</p>'}</div>` : ''}
    </article>`;
  }
  function refreshQ(id){
    const el = dlg.querySelector(`[data-qid="${id}"]`), x = Q.get(id);
    if(!el || !x) return;
    const withYear = pv.mode === 'ch' && !pv.year;
    el.outerHTML = qView(x.q, x.paper, withYear);
    math(dlg.querySelector(`[data-qid="${id}"]`));
    const sc = $('[data-lx-score]', dlg);
    if(sc && pv.year) sc.innerHTML = scoreLine(x.paper);
    badges();
  }
  function setGrade(id, g, pick){
    const cur = S.grades[id], w = S.wrong[id];
    const justAdded = w && w.added === today() && !w.r && !w.note;
    if(cur && cur.g === g && !pick){ delete S.grades[id]; if(justAdded) delete S.wrong[id]; }
    else{
      S.grades[id] = pick ? {g, t:today(), pick} : {g, t:today()};
      if(!cur) bump('q', 'n');
      if(g === 3 && justAdded) delete S.wrong[id];
      if(g < 3 && !S.wrong[id]){
        S.wrong[id] = Object.assign(fresh(), {d:addDays(today(), 1), s:0, note:'', added:today()});
        St.toast('已加入错题本，可在题下写一句错因');
      }
    }
    save(); refreshQ(id);
  }
  function papersView(){
    if(!PM()){ needPapers(); return loading(); }
    const seg = `<div class="filters lx-seg" role="group" aria-label="练习方式">
        <button type="button" data-lx="pmode" data-v="year" aria-pressed="${pv.mode === 'year'}">${ic('calendar')}按年整套</button>
        <button type="button" data-lx="pmode" data-v="ch" aria-pressed="${pv.mode === 'ch'}">${ic('layers')}按章节</button></div>`;
    if(pv.mode === 'year' && pv.year) return paperView(PM().papers.find(p=>p.year === pv.year));
    if(pv.mode === 'year') return seg + `<div class="lx-years">${PM().papers.map(p=>{
      const s = paperScore(p), a = S.attempts[p.year];
      return `<button class="lx-year${s.done ? ' started' : ''}" type="button" data-lx="year" data-v="${p.year}">
        <b>${p.year}</b><span>${esc(p.name.replace(/^\d+\s*/, ''))}</span>
        <small class="muted">${s.done ? `${s.done}/${s.n} 题 · ${s.full}/150` : `${s.n} 题${p.sol ? '' : ' · 无解析'}`}${a && a.run ? ' · 计时中' : ''}</small></button>`;
    }).join('')}</div>`;
    return seg + chapterView();
  }
  function paperView(p){
    if(!p){ pv.year = null; return papersView(); }
    const a = S.attempts[p.year], run = a && a.run;
    return `<div class="lx-ptop">
        <button class="btn sm" type="button" data-lx="back">${ic('left')}全部年份</button>
        <h3>${esc(p.name)}<small class="muted"> · ${p.qs.length} 题 · 满分 ${p.total}</small></h3>
        <span class="grow"></span>
        <span class="lx-clock${a && elapsed(a) >= EXAM_SEC ? ' over' : ''}" data-lx-clock title="3 小时倒计时">${clock(p.year)}</span>
        <button class="btn sm${run ? '' : ' primary'}" type="button" data-lx="timer">${ic(run ? 'pause' : 'play')}${run ? '暂停' : a && a.acc ? '继续计时' : '开始计时'}</button>
        <button class="btn sm" type="button" data-lx="redo" title="清空本卷自评与计时">${ic('reset')}重做</button>
      </div>
      <p class="lx-score" data-lx-score>${scoreLine(p)}</p>
      ${p.sol ? '' : '<p class="muted">本卷来源无解析，仅可对照答案自评。</p>'}
      <div class="lx-qs">${p.qs.map(q=>qView(q, p, false)).join('')}</div>`;
  }
  function chapterView(){
    const all = [...Q.values()], counts = CHS().map((c, i)=>all.filter(x=>chIdx(x.q) === i).length);
    if(pv.ch == null) pv.ch = Math.max(0, counts.findIndex(n=>n));
    const list = all.filter(x=>chIdx(x.q) === pv.ch && (pv.filter === 'all' || (pv.filter === 'todo' ? !S.grades[x.q[0]] : S.wrong[x.q[0]])));
    const F = {all:'全部', todo:'未做', wrong:'在错题本'};
    return `<div class="lx-chips" role="group" aria-label="章节">${CHS().map((c, i)=>counts[i] ? `<button class="chip" type="button" data-lx="pch" data-v="${i}" aria-pressed="${i === pv.ch}">${esc(c.name)}<small>${counts[i]}</small></button>` : '').join('')}</div>
      <div class="lx-filter">${Object.keys(F).map(k=>`<button class="btn sm" type="button" data-lx="pfilter" data-v="${k}" aria-pressed="${pv.filter === k}">${F[k]}</button>`).join('')}
        <span class="muted">${list.length} 题 · 新到旧 · 章节按关键词自动归类，可在题头改</span></div>
      <div class="lx-qs">${list.slice(0, pv.limit).map(x=>qView(x.q, x.paper, true)).join('') || '<p class="muted">没有符合条件的题目。</p>'}</div>
      ${list.length > pv.limit ? `<button class="btn lx-more" type="button" data-lx="more">再显示 10 题（剩 ${list.length - pv.limit}）</button>` : ''}`;
  }
  function wrongView(){
    if(!PM()){ needPapers(); return loading(); }
    const t = today(), ids = Object.keys(S.wrong).filter(k=>Q.has(k)).sort((a, b)=>S.wrong[a].d < S.wrong[b].d ? -1 : S.wrong[a].d > S.wrong[b].d ? 1 : a < b ? 1 : -1);
    const due = ids.filter(k=>S.wrong[k].d <= t).length;
    if(!ids.length) return `<div class="vx-done">${ic('note')}<h3>错题本是空的</h3><p class="muted">真题自评为「错」或「半对」的题会自动进来，连续 3 次会做后移出。</p>
      <button class="btn primary" type="button" data-lx="tab" data-v="papers">去做真题</button></div>`;
    return `<div class="lx-ptop"><h3>${ids.length} 道错题<small class="muted"> · 今日到期 ${due}</small></h3><span class="grow"></span>
        <button class="btn primary" type="button" data-lx="wstart"${due ? '' : ' disabled'}>${ic('play')}复习到期错题</button></div>
      <ul class="lx-wlist">${ids.map(k=>{
        const {q, paper} = Q.get(k), w = S.wrong[k], plain = q[5].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        return `<li>
          <button class="lx-wmain" type="button" data-lx="wopen" data-q="${k}"><b>${paper.year} · 第 ${esc(q[1])} 题</b>
            <span class="muted">${esc(chName(q))} · ${w.d <= t ? '<em>今日到期</em>' : `下次 ${w.d.slice(5)}`} · 连对 ${w.s || 0}/3</span>
            <span class="lx-wq">${esc(plain.slice(0, 80))}${plain.length > 80 ? '…' : ''}</span></button>
          <input type="text" maxlength="120" placeholder="错因（可选）" value="${esc(w.note || '')}" data-lx-note="${k}" aria-label="错因">
          <button class="btn icon sm" type="button" data-lx="wdel" data-q="${k}" aria-label="移出错题本">${ic('x')}</button></li>`;
      }).join('')}</ul>`;
  }
  function deckView(d){
    const s = deckStats(d), st = S.decks[d.id], {open, next} = chapterState(d), t = P.ymd(P.today());
    const left = s.due + Math.max(0, s.target - s.n);
    return `<div class="lx-ptop"><h3>${ic(d.icon)}${esc(d.D.meta.name)}<small class="muted"> · ${s.total} 张</small></h3><span class="grow"></span>
        <button class="btn primary" type="button" data-lx="dstart" data-v="${d.id}">${ic(left ? 'play' : 'check')}${left ? `开始（${left} 张）` : '今日已完成'}</button></div>
      <div class="vc-stats lx-stats">
        <div class="vc-stat"><span>今日新卡</span><b>${s.n}<small>/${s.target}</small></b><div class="bar"><i style="width:${s.target ? Math.min(100, s.n / s.target * 100) : 100}%"></i></div></div>
        <div class="vc-stat"><span>待复习</span><b>${s.due}</b></div>
        <div class="vc-stat"><span>已学</span><b>${s.learned}<small>/${s.total}</small></b></div>
        <div class="vc-stat"><span>已掌握</span><b>${s.mature}</b></div></div>
      <ol class="lx-chs">${d.D.chapters.map((c, i)=>{
        const n = d.D.cards.filter(x=>x[1] === i), got = n.filter(x=>st.cards[x[0]]).length, on = open.has(i);
        return `<li class="${on ? 'on' : 'lock'}"><span>${esc(c.name)}</span><span class="grow"></span>
          <span class="muted">${on ? (c.from > t ? '提前解锁' : '已解锁') : `${c.from.slice(5).replace('-', '/')} 解锁`} · ${got}/${n.length}</span>
          <div class="bar"><i style="width:${n.length ? got / n.length * 100 : 0}%"></i></div></li>`;
      }).join('')}</ol>
      <p class="lx-unlock muted">章节随路线块开放（数学/专业课对应日期）。
        ${next != null ? `<button class="btn sm" type="button" data-lx="unlock" data-v="${d.id}">${ic('plus')}提前解锁「${esc(d.D.chapters[next].name)}」</button>` : '全部章节已开放。'}
        ${st.extra ? `<button class="btn sm" type="button" data-lx="relock" data-v="${d.id}">${ic('undo')}撤回提前解锁（${st.extra}）</button>` : ''}</p>
      <p class="muted lx-src">来源：${esc(d.D.meta.source)}（${esc(d.D.meta.license)}）</p>`;
  }
  /* ---------- 汇总行（今天卡片 + 总览页共用） ---------- */
  function summary(){
    const out = [], V = window.Vocab;
    if(V && V.ready){ const v = V.stats(); out.push({id:'vocab', icon:'cards', name:'英二词汇', left:v.done ? 0 : v.due + Math.max(0, v.target - v.n),
      text:`新词 ${v.n}/${v.target} · 待复习 ${v.due}`, done:v.done, open:'data-vocab-open'}); }
    DECKS.forEach(d=>{ const s = deckStats(d), left = s.due + Math.max(0, s.target - s.n);
      out.push({id:d.id, icon:d.icon, name:d.label, left, text:`新卡 ${s.n}/${s.target} · 待复习 ${s.due} · 已学 ${s.learned}/${s.total}`, done:!left && s.n + s.rv > 0}); });
    const w = wrongStats();
    out.push({id:'wrong', icon:'note', name:'错题本', left:w.due, text:w.total ? `到期 ${w.due} · 共 ${w.total} 题` : '自评错 / 半对的真题会自动进来', done:!w.due && w.total > 0});
    const years = new Set(Object.keys(S.grades).map(k=>k.split('-')[0])), rq = (S.days[today()] || {}).q;
    out.push({id:'papers', icon:'layers', name:'数二真题', left:0, text:`已练 ${years.size} 套 · 自评 ${Object.keys(S.grades).length} 题${rq ? ` · 今日 ${rq.n}` : ''}`});
    return out;
  }
  const rowHTML = r => `<li class="lx-sum${r.done ? ' done' : ''}">
      <span class="lx-sic">${ic(r.done ? 'check' : r.icon)}</span>
      <span class="lx-sname"><b>${esc(r.name)}</b><small class="muted">${r.text}</small></span>
      ${r.left ? `<span class="pill accent">${r.left}</span>` : ''}
      <button class="btn sm${r.left ? ' primary' : ''}" type="button" ${r.open || `data-learn-open="${r.id}"`}>${r.left ? '开始' : '打开'}</button></li>`;

  function card(){
    const rows = summary(), left = rows.reduce((a, r)=>a + r.left, 0), V = window.Vocab;
    return `<h3>${ic('grad')}今日复习<span class="grow"></span><span class="pill ${left ? 'warn' : 'good'}">${left ? `还剩 ${left} 项` : '今日已清空'}</span></h3>
      <ul class="lx-sums">${rows.map(rowHTML).join('')}</ul>
      <div class="lx-cardf"><span class="muted">${V && V.ready ? `背词连续 ${V.streak()} 天 · ` : ''}公式卡按路线块解锁章节，每组每天新卡 ≤ 上限</span><span class="grow"></span>
        <button class="btn" type="button" data-learn-open="home">${ic('grad')}学习中心</button></div>`;
  }
  function renderCards(root){
    (root || document).querySelectorAll('[data-learn]').forEach(el=>{ el.innerHTML = card(); });
  }

  /* ---------- 全屏弹层 ---------- */
  const dlg = $('#learn');
  const TABS = [['home', 'grad', '总览'], ['vocab', 'cards', '词汇'], ...DECKS.map(d=>[d.id, d.icon, d.label]), ['papers', 'layers', '数二真题'], ['wrong', 'note', '错题本']];
  let tab = 'home';
  function shell(){
    dlg.innerHTML = `
      <div class="vx-h"><h2>${ic('grad')}学习中心</h2>
        <nav class="lx-tabs" role="tablist" aria-label="科目">${TABS.map(([id, icon, name])=>
          `<button type="button" role="tab" data-lx="tab" data-v="${id}" aria-label="${name}" aria-controls="lx-panel">${ic(icon)}<span>${name}</span><i class="lx-badge" data-lx-badge="${id}"></i></button>`).join('')}</nav>
        <span class="grow"></span>
        <button class="btn icon" type="button" data-lx="close" aria-label="关闭">${ic('x')}</button></div>
      <div class="vx-prog" aria-hidden="true"><i data-lx-prog></i></div>
      <div class="lx-body" id="lx-panel" role="tabpanel" tabindex="-1" aria-live="polite"></div>
      <div class="vx-f" data-lx-foot></div>`;
  }
  function badges(){
    if(!dlg.open) return;
    const by = Object.fromEntries(summary().map(r=>[r.id, r.left]));
    dlg.querySelectorAll('[data-lx-badge]').forEach(el=>{ const n = by[el.dataset.lxBadge] || 0; el.textContent = n || ''; el.hidden = !n; });
  }
  const inSes = ()=>ses && ses.id === tab;
  function foot(){
    const d = deckOf(tab), keys = `<span class="vx-keys"><kbd>空格</kbd>翻面 <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd>评分 <kbd>U</kbd>撤销 <kbd>Esc</kbd>关闭</span>`;
    const undoB = `<button class="btn sm" type="button" data-lx="undo"${ses && ses.undo.length ? '' : ' disabled'}>${ic('undo')}撤销</button>`;
    if(d) return `<label class="vx-opt">每日新卡<select data-lx-daily="${d.id}">${DAILY_OPTS.map(n=>`<option value="${n}"${n === S.decks[d.id].daily ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      ${inSes() ? `<button class="btn sm" type="button" data-lx="end">${ic('left')}结束本轮</button>` : ''}<span class="grow"></span>${inSes() ? keys + undoB : ''}`;
    if(tab === 'wrong' && inSes()) return `<button class="btn sm" type="button" data-lx="end">${ic('left')}返回列表</button><span class="grow"></span>${keys}${undoB}`;
    if(tab === 'papers' && PM()) return `<span class="muted lx-src">真题：${esc(PM().meta.source)}；「同试卷一」题由 ${esc(PM().meta.xref)} 还原，仅供个人学习</span>`;
    return `<span class="muted">进度只存本机浏览器，按真实日期计算</span>`;
  }
  function render(){
    if(!dlg.open) return;
    dlg.querySelectorAll('[data-lx="tab"]').forEach(b=>b.setAttribute('aria-selected', b.dataset.v === tab));
    badges();
    const body = $('.lx-body', dlg), prog = $('[data-lx-prog]', dlg);
    prog.parentNode.style.visibility = inSes() ? '' : 'hidden';
    if(inSes()) prog.style.width = (ses.queue.length ? ses.pos / ses.queue.length * 100 : 100) + '%';
    const d = deckOf(tab);
    body.innerHTML = tab === 'home' ? `<ul class="lx-sums lx-home">${summary().map(rowHTML).join('')}</ul>`
      : tab === 'vocab' ? `<section class="card b-vocab" data-vocab></section>`
      : d ? (inSes() ? sessionView() : deckView(d))
      : tab === 'papers' ? papersView()
      : inSes() ? sessionView() : wrongView();
    if(tab === 'vocab') window.Vocab.renderCards(body);
    $('[data-lx-foot]', dlg).innerHTML = foot();
    if(tab !== 'home' && tab !== 'vocab') math(body);
    if(inSes()) body.focus({preventScroll:true});
    clockTick();
  }
  function go(t){
    tab = TABS.some(x=>x[0] === t) ? t : 'home';
    if(tab === 'papers' || tab === 'wrong') needPapers();
    render();
    $('.lx-body', dlg).scrollTop = 0;
  }
  function open(t){
    if(!dlg.open){ shell(); dlg.showModal(); }
    go(t || 'home');
  }
  function scrollToQ(id){
    requestAnimationFrame(()=>{ const el = dlg.querySelector(`[data-qid="${id}"]`); if(el) el.scrollIntoView({block:'start'}); });
  }
  async function act(a, b){
    const v = b.dataset.v, id = b.dataset.q;
    if(a === 'close') dlg.close();
    else if(a === 'tab') go(v);
    else if(a === 'flip') flip();
    else if(a === 'grade') grade(+b.dataset.g);
    else if(a === 'undo') undo();
    else if(a === 'end'){ ses = null; render(); }
    else if(a === 'dstart'){ startDeck(v); render(); }
    else if(a === 'unlock'){ S.decks[v].extra++; save(); render(); }
    else if(a === 'relock'){ S.decks[v].extra = 0; save(); render(); }
    else if(a === 'wstart'){ startWrong(); render(); }
    else if(a === 'wdel'){
      const snap = S.wrong[id]; delete S.wrong[id]; save(); render();
      St.toast('已移出错题本', ()=>{ S.wrong[id] = snap; save(); render(); });
    }
    else if(a === 'wopen'){ const x = Q.get(id); pv.mode = 'year'; pv.year = x.paper.year; revealed.add(id); go('papers'); scrollToQ(id); }
    else if(a === 'pmode'){ pv.mode = v; pv.year = null; render(); }
    else if(a === 'year'){ pv.year = +v; render(); $('.lx-body', dlg).scrollTop = 0; }
    else if(a === 'back'){ pv.year = null; render(); }
    else if(a === 'timer') timerToggle(pv.year);
    else if(a === 'redo'){
      const p = PM().papers.find(x=>x.year === pv.year);
      if(!await St.confirmBox({title:`重做 ${p.name}？`, body:'清空本卷的自评与计时；错题本里的题保留。', ok:'重做', danger:true})) return;
      p.qs.forEach(q=>{ delete S.grades[q[0]]; revealed.delete(q[0]); });
      delete S.attempts[p.year]; save(); render();
    }
    else if(a === 'pch'){ pv.ch = +v; pv.limit = 10; render(); }
    else if(a === 'pfilter'){ pv.filter = v; pv.limit = 10; render(); }
    else if(a === 'more'){ pv.limit += 10; render(); }
    else if(a === 'reveal'){ revealed.has(id) ? revealed.delete(id) : revealed.add(id); refreshQ(id); }
    else if(a === 'qgrade') setGrade(id, +b.dataset.g);
    else if(a === 'pick'){ const x = Q.get(id); revealed.add(id); setGrade(id, v === x.q[7] ? 3 : 1, v); }
  }
  dlg.addEventListener('click', e=>{
    if(e.target === dlg){ dlg.close(); return; }
    const b = e.target.closest('[data-lx]');
    if(b){ if(!b.disabled) act(b.dataset.lx, b); return; }
    if(e.target.closest('.lx-card:not(.flipped)')) flip();
  });
  let noteT = 0;
  dlg.addEventListener('change', e=>{
    const t = e.target;
    if(t.matches('[data-lx-ch]')){
      const id = t.dataset.lxCh, x = Q.get(id);
      if(+t.value === x.q[4]) delete S.ch[id]; else S.ch[id] = +t.value;
      save();
      if(pv.mode === 'ch' && !pv.year) render(); else refreshQ(id);
    }
    else if(t.matches('[data-lx-daily]')){
      S.decks[t.dataset.lxDaily].daily = +t.value; save();
      if(inSes()) startDeck(tab);
      render();
    }
  });
  dlg.addEventListener('input', e=>{
    const t = e.target;
    if(!t.matches('[data-lx-note]') || !S.wrong[t.dataset.lxNote]) return;
    S.wrong[t.dataset.lxNote].note = t.value.trim();
    clearTimeout(noteT); noteT = setTimeout(save, 400);
  });
  dlg.addEventListener('keydown', e=>{
    if(e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) || !inSes()) return;
    const k = e.key.toLowerCase();
    if(k === ' '){ e.preventDefault(); flip(); }
    else if(/^[123]$/.test(k) && ses.flipped){ e.preventDefault(); grade(+k); }
    else if(k === 'u') undo();
  });
  dlg.addEventListener('close', ()=>{ clearInterval(tick); clearTimeout(noteT); save(); renderCards(); });
  document.addEventListener('click', e=>{ const b = e.target.closest('[data-learn-open]'); if(b) open(b.dataset.learnOpen); });
  const vd = $('#vocab');
  if(vd) vd.addEventListener('close', ()=>{ renderCards(); if(dlg.open) render(); });

  window.Learn = {open, renderCards, summary, decks:DECKS.map(d=>d.id)};
})();
