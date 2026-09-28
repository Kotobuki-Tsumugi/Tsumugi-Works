/* 状态层：本机存储、派生数据、提示/确认/庆祝、计时器。window.Store */
(function(){
  const P = window.Plan, D = window.PLAN_DATA;
  const K = {
    plan:'ncepu-ee-plan-v1',      // 打卡：{ "组-项": 1 }，与旧版完全兼容，勿改
    blocks:'ncepu-ee-blocks-v1',  // 块任务：{ "2027-03-08:math": 1 }
    notes:'ncepu-ee-notes-v1',    // 块笔记：{ "2027-03-08": "..." }
    time:'ncepu-ee-time-v1',      // 学习分钟：{ "2026-09-28": 120 }
    timer:'ncepu-ee-timer-v1',
    fold:'ncepu-ee-path-fold'
  };
  const read = (k, def)=>{ try{ const v = JSON.parse(localStorage.getItem(k)); return v == null ? def : v; }catch(e){ return def; } };
  const write = (k, v)=>{ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };
  const now = P.today();
  const SUBJ_KEYS = ['math','major','eng','pol'];

  const BLOCKS = D.BLOCKS.map((b,i)=>{
    const fromD = P.parse(b.from), toD = P.parse(b.to);
    const tasks = [];
    if(b.goal) tasks.push({k:'goal', subj:null, t:b.goal});
    SUBJ_KEYS.forEach(s=>{ if(b[s] && b[s] !== '—') tasks.push({k:s, subj:s, t:b[s]}); });
    return Object.assign({}, b, {i, fromD, toD, tasks,
      status: toD < now ? 'past' : fromD <= now ? 'now' : 'future',
      phaseObj: D.PHASES.find(p=>p.id === b.phase)});
  });
  const current = BLOCKS.find(b=>b.status === 'now') || null;
  const next = BLOCKS.find(b=>b.status === 'future') || null;

  const CHECKS_FLAT = D.CHECKS.flatMap((g,gi)=>g.items.map((it,ii)=>Object.assign({}, it, {k:`${gi}-${ii}`, gi, ii})));
  const checkByKey = Object.fromEntries(CHECKS_FLAT.map(c=>[c.k, c]));

  /* 关键节点：甘特节点 + 时间线关键项（日期相差 ≤1 天视为同一节点） */
  const MS = (()=>{
    const list = Object.values(D.MILES).map(m=>({t:m.t, date:m.date}));
    D.TIMELINE.filter(t=>t.key).forEach(t=>{
      if(!list.some(m=>Math.abs(P.days(P.parse(m.date), P.parse(t.to))) <= 1)) list.push({t:t.t, date:t.to});
    });
    return list.sort((a,b)=>a.date < b.date ? -1 : 1);
  })();

  const S = { plan:read(K.plan,{}), blocks:read(K.blocks,{}), notes:read(K.notes,{}), time:read(K.time,{}) };
  const subs = [];
  const emit = ()=>subs.forEach(f=>f());
  const persist = ()=>{ write(K.plan,S.plan); write(K.blocks,S.blocks); write(K.notes,S.notes); write(K.time,S.time); };

  function setPlan(k, on){ if(on) S.plan[k] = 1; else delete S.plan[k]; write(K.plan, S.plan); emit(); }
  function setTask(k, on){ if(on) S.blocks[k] = 1; else delete S.blocks[k]; write(K.blocks, S.blocks); emit(); }
  function setNote(from, text){ if(text.trim()) S.notes[from] = text; else delete S.notes[from]; write(K.notes, S.notes); }

  function blockProg(b){
    const keys = b.tasks.map(t=>`${b.from}:${t.k}`).concat(`${b.from}:check`);
    const done = keys.filter(k=>S.blocks[k]).length;
    return {done, total:keys.length, pct:Math.round(done/keys.length*100)};
  }
  function stats(){
    let done = 0, over = 0, soon = 0;
    CHECKS_FLAT.forEach(c=>{
      const u = P.urgency(c.due, !!S.plan[c.k]);
      if(u === 'done') done++; else if(u === 'over') over++; else if(u === 'soon') soon++;
    });
    const all = CHECKS_FLAT.length;
    return {done, all, over, soon, pct: all ? Math.round(done/all*100) : 0};
  }

  /* ---------- 学习时长（按真实日期记录，不受 ?today= 影响） ---------- */
  const realToday = ()=>{ const d = new Date(); d.setHours(0,0,0,0); return d; };
  function addTime(min, quiet){
    const k = P.ymd(realToday());
    S.time[k] = (+S.time[k] || 0) + min;
    if(S.time[k] <= 0) delete S.time[k];
    write(K.time, S.time); emit();
    if(!quiet) toast(`已记录 ${min} 分钟学习`, ()=>addTime(-min, true));
  }
  const T = read(K.timer, {start:null, acc:0});
  const timer = {
    running: ()=>!!T.start,
    elapsed: ()=>T.acc + (T.start ? Date.now() - T.start : 0),
    toggle(){ if(T.start){ T.acc += Date.now() - T.start; T.start = null; } else T.start = Date.now(); write(K.timer, T); },
    finish(){
      const min = Math.round(timer.elapsed()/60000);
      T.start = null; T.acc = 0; write(K.timer, T);
      if(min >= 1) addTime(min); else toast('不足 1 分钟，未记录');
    }
  };

  /* ---------- 提示 / 确认 / 庆祝 ---------- */
  const reduced = ()=>window.Settings ? window.Settings.reduce : matchMedia('(prefers-reduced-motion:reduce)').matches;
  function toast(msg, undo){
    const box = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast'; el.setAttribute('role','status');
    el.innerHTML = `<span></span>`;
    el.firstChild.textContent = msg;
    const kill = ()=>{ el.classList.add('out'); setTimeout(()=>el.remove(), 260); };
    if(undo){
      const b = document.createElement('button');
      b.className = 'btn sm'; b.type = 'button'; b.textContent = '撤销';
      b.onclick = ()=>{ undo(); kill(); };
      el.append(b);
    }
    box.append(el);
    while(box.children.length > 3) box.firstChild.remove();
    setTimeout(kill, undo ? 6000 : 3000);
  }
  function confirmBox({title, body, ok='确定', danger=false}){
    const dlg = document.getElementById('confirm');
    dlg.innerHTML = `<h2></h2><p></p><form method="dialog" class="acts">
      <button class="btn" value="no">取消</button><button class="btn ${danger?'danger':'primary'}" value="yes"></button></form>`;
    dlg.querySelector('h2').textContent = title;
    dlg.querySelector('p').textContent = body;
    dlg.querySelector('[value=yes]').textContent = ok;
    dlg.returnValue = '';
    dlg.showModal();
    dlg.querySelector('[value=no]').focus();
    return new Promise(res=>dlg.addEventListener('close', ()=>res(dlg.returnValue === 'yes'), {once:true}));
  }
  function confetti(x, y){
    if(reduced()) return;
    const c = document.createElement('canvas'); c.className = 'confetti';
    const dpr = Math.min(devicePixelRatio || 1, 2);
    c.width = innerWidth*dpr; c.height = innerHeight*dpr; document.body.append(c);
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    const css = getComputedStyle(document.documentElement);
    const cols = ['--c-math','--c-major','--c-eng','--c-pol','--c-p3','--accent-2'].map(v=>css.getPropertyValue(v).trim());
    const ps = Array.from({length:90}, ()=>{
      const a = Math.random()*Math.PI*2, v = 4 + Math.random()*7;
      return {x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v - 5, r:3 + Math.random()*4, c:cols[Math.random()*cols.length|0], rot:Math.random()*6, life:1};
    });
    (function frame(){
      g.clearRect(0, 0, innerWidth, innerHeight);
      let alive = 0;
      ps.forEach(p=>{
        p.vy += .28; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.rot += .2; p.life -= .011;
        if(p.life <= 0) return; alive++;
        g.save(); g.globalAlpha = p.life; g.fillStyle = p.c; g.translate(p.x, p.y); g.rotate(p.rot);
        g.fillRect(-p.r, -p.r/2, p.r*2, p.r); g.restore();
      });
      if(alive) requestAnimationFrame(frame); else c.remove();
    })();
  }

  /* ---------- 导出 / 导入 / 重置 ---------- */
  function exportAll(){
    const payload = {key:K.plan, exported:new Date().toISOString(), data:S.plan, blocks:S.blocks, notes:S.notes, time:S.time};
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `华电考研打卡-${P.ymd(realToday())}.json`;
    a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
    toast('已导出备份 JSON');
  }
  const pick = (obj, re, fn)=>{
    const out = {};
    if(obj && typeof obj === 'object') Object.keys(obj).forEach(k=>{ if(re.test(k)){ const v = fn(obj[k]); if(v !== undefined) out[k] = v; } });
    return out;
  };
  async function importFile(file){
    let obj;
    try{ obj = JSON.parse(await file.text()); }catch(e){ toast('文件无法解析：请选择本页导出的 JSON'); return; }
    if(!obj || typeof obj !== 'object'){ toast('文件内容不是有效的打卡记录'); return; }
    const plan = pick(obj && typeof obj.data === 'object' ? obj.data : obj, /^\d+-\d+$/, v=>v ? 1 : undefined);
    const hasExtra = ['blocks','notes','time'].some(k=>obj[k] && typeof obj[k] === 'object');
    const blocks = pick(obj.blocks, /^\d{4}-\d{2}-\d{2}:(math|major|eng|pol|goal|check)$/, v=>v ? 1 : undefined);
    const notes = pick(obj.notes, /^\d{4}-\d{2}-\d{2}$/, v=>typeof v === 'string' && v.trim() ? v.slice(0, 20000) : undefined);
    const time = pick(obj.time, /^\d{4}-\d{2}-\d{2}$/, v=>Number.isFinite(+v) && +v > 0 ? Math.round(+v) : undefined);
    const body = `当前已完成 ${Object.keys(S.plan).length} 项打卡，导入后为 ${Object.keys(plan).length} 项。` +
      (hasExtra ? `块任务 ${Object.keys(blocks).length} 项、笔记 ${Object.keys(notes).length} 条、学习时长 ${Object.keys(time).length} 天也会一并覆盖。`
                : '此文件只含打卡记录，块任务、笔记与学习时长保持不变。');
    if(!await confirmBox({title:'导入并覆盖当前记录？', body, ok:'导入'})) return;
    const snap = JSON.parse(JSON.stringify(S));
    S.plan = plan;
    if(hasExtra){ S.blocks = blocks; S.notes = notes; S.time = time; }
    persist(); emit();
    toast('导入完成', ()=>{ Object.assign(S, snap); persist(); emit(); });
  }
  async function resetAll(){
    const ok = await confirmBox({title:'清空打卡记录？', danger:true, ok:'清空',
      body:'将清空全部打卡与块任务勾选；笔记和学习时长保留。清空后 6 秒内可撤销，建议先「导出」备份。'});
    if(!ok) return;
    const snap = {plan:S.plan, blocks:S.blocks};
    S.plan = {}; S.blocks = {}; persist(); emit();
    toast('已清空', ()=>{ S.plan = snap.plan; S.blocks = snap.blocks; persist(); emit(); });
  }

  window.Store = { K, S, now, get reduce(){ return reduced(); }, BLOCKS, current, next, CHECKS_FLAT, checkByKey, MS,
    subscribe:f=>subs.push(f), setPlan, setTask, setNote, blockProg, stats, addTime, timer, realToday,
    toast, confirmBox, confetti, exportAll, importFile, resetAll };
})();
