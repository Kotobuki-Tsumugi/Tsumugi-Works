/* 应用外壳：路由（#today / #route / #check / #docs）、事件委托、抽屉、计时器、背景光斑 */
(function(){
  const P = window.Plan, St = window.Store, V = window.Views;
  const $ = (s, r=document)=>r.querySelector(s), $$ = (s, r=document)=>[...r.querySelectorAll(s)];
  const VIEWS = ['today','route','check','docs'];
  /* 旧页面锚点兼容 */
  const LEGACY = {how:'route', p0:'route', p1:'route', p2:'route', p3:'route', 'gantt-sec':'route',
    noc:'docs', facts:'docs', weekly:'docs', targets:'docs', milestones:'docs', unknowns:'docs', sources:'docs', checklist:'check'};

  VIEWS.forEach(v=>{ $('#view-'+v).innerHTML = V[v](); });
  P.hydrateIcons();
  V.sync();
  if(P.simDate){ const s = $('#sim'); s.hidden = false; s.textContent = `模拟日期 ${P.simDate}`; }

  /* ---------- 路由 ---------- */
  function parseHash(){
    const h = decodeURIComponent(location.hash.slice(1));
    const def = window.Settings && VIEWS.includes(Settings.get('view')) ? Settings.get('view') : 'today';
    if(!h) return {view:def};
    const [a, b] = h.split('/');
    if(VIEWS.includes(a)) return {view:a, target:b};
    if(LEGACY[a]) return {view:LEGACY[a], target:a === 'checklist' ? null : a};
    return {view:'today'};
  }
  let curView = null;
  /* 状态同步更新，DOM 切换可能在视图过渡回调里异步完成；返回 DOM 就绪的 Promise */
  function show(view){
    if(view === curView) return Promise.resolve();
    const animate = document.startViewTransition && curView && !St.reduce;
    curView = view;
    const swap = ()=>{
      VIEWS.forEach(v=>{ $('#view-'+v).hidden = v !== curView; });
      $$('.seg [role=tab]').forEach(t=>{ const on = t.dataset.view === curView; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
      document.title = `${$(`.seg [data-view=${curView}]`).textContent.trim()} · 华电电气考研`;
    };
    if(animate){
      /* swap 幂等；过渡回调迟迟不执行（后台标签、无渲染帧）时兜底直接切换 */
      const vt = document.startViewTransition(swap);
      return Promise.race([vt.updateCallbackDone, new Promise(r=>setTimeout(r, 350))]).catch(()=>{}).then(swap);
    }
    swap(); return Promise.resolve();
  }
  function goto(el, flash){
    if(!el) return;
    el.scrollIntoView({behavior: St.reduce ? 'auto' : 'smooth', block: flash ? 'center' : 'start'});
    if(flash){ el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  }
  function route(){
    const {view, target} = parseHash();
    show(view).then(()=>{ if(view === curView) land(view, target); });
  }
  function land(view, target){
    if(view === 'route' && target === 'now' && St.current){
      setFilter('all');
      goto($('#blk-' + St.current.from), true);
    } else if(target){
      const el = document.getElementById(target);
      if(view === 'route' && el && el.classList.contains('phase')) setFilter('all');
      if(view === 'check' && el){
        $$('#ck-filter button').forEach(b=>b.setAttribute('aria-pressed', b.dataset.f === 'all'));
        applyCkFilter();
      }
      goto(el, !!el && el.classList.contains('row-ck'));
    }
    else scrollTo({top:0});
    if(view === 'route') placeToday();
  }
  addEventListener('hashchange', route);

  const tabs = $$('.seg [role=tab]');
  tabs.forEach((t,i)=>{
    t.addEventListener('click', ()=>{ location.hash = t.dataset.view; });
    t.addEventListener('keydown', e=>{
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if(!d) return;
      const n = tabs[(i + d + tabs.length) % tabs.length];
      n.focus(); location.hash = n.dataset.view;
    });
  });

  /* ---------- 勾选 ---------- */
  document.addEventListener('change', e=>{
    const t = e.target;
    if(t.dataset.plan){
      const k = t.dataset.plan, on = t.checked;
      St.setPlan(k, on);
      if(on) St.toast(`已打卡：${St.checkByKey[k].t.slice(0, 18)}…`, ()=>St.setPlan(k, false));
    } else if(t.dataset.task){
      const k = t.dataset.task, on = t.checked;
      St.setTask(k, on);
      const b = St.BLOCKS.find(x=>x.from === k.split(':')[0]);
      if(on && b){
        const p = St.blockProg(b);
        if(p.done === p.total){
          const r = t.getBoundingClientRect();
          St.confetti(r.left + r.width/2, r.top);
          St.toast(`${b.w} 全部完成，本块过关`);
        }
      }
    } else if(t.id === 'pg-file'){
      const f = t.files[0]; t.value = '';
      if(f) St.importFile(f);
    }
  });
  St.subscribe(()=>V.sync());

  /* ---------- 点击委托 ---------- */
  document.addEventListener('click', e=>{
    const el = e.target.closest('[data-open],[data-go],[data-nav],[data-close],#pg-export,#pg-import,#pg-reset,#fold-past,#print,[data-f]');
    if(!el) return;
    if(el.dataset.open != null) openBlock(+el.dataset.open);
    else if(el.dataset.go){
      const [v, t] = el.dataset.go.split(':');
      if(drawer.open) drawer.close();
      location.hash = t ? `${v}/${t}` : v;
      if(parseHash().view === v) route();
    }
    else if(el.dataset.nav) openBlock(openIdx + +el.dataset.nav);
    else if(el.dataset.close != null) drawer.close();
    else if(el.id === 'pg-export') St.exportAll();
    else if(el.id === 'pg-import') $('#pg-file').click();
    else if(el.id === 'pg-reset') St.resetAll();
    else if(el.id === 'fold-past') setFold(!document.body.classList.contains('hide-past'));
    else if(el.id === 'print') print();
    else if(el.dataset.f){
      const box = el.parentElement;
      $$('button', box).forEach(b=>b.setAttribute('aria-pressed', b === el));
      if(box.id === 'phase-filter') setFilter(el.dataset.f);
      if(box.id === 'ck-filter') applyCkFilter();
    }
  });
  document.addEventListener('keydown', e=>{
    const b = e.target.closest && e.target.closest('.blk[data-open]');
    if(b && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); openBlock(+b.dataset.open); }
  });

  function setFilter(f){
    $$('#phase-filter button').forEach(b=>b.setAttribute('aria-pressed', b.dataset.f === f));
    $$('.phase').forEach(s=>{ s.hidden = f !== 'all' && s.dataset.phase !== f; });
  }
  function setFold(on){
    document.body.classList.toggle('hide-past', on);
    const b = $('#fold-past');
    b.setAttribute('aria-pressed', on); b.querySelector('span').textContent = on ? '显示已过' : '隐藏已过';
    try{ localStorage.setItem(St.K.fold, on ? '1' : ''); }catch(e){}
  }
  let savedFold = false; try{ savedFold = !!localStorage.getItem(St.K.fold); }catch(e){}
  setFold(savedFold);

  function applyCkFilter(){
    const f = ($('#ck-filter [aria-pressed=true]') || {}).dataset.f || 'all';
    $$('#view-check .row-ck').forEach(r=>{
      const u = r.dataset.u;
      r.classList.toggle('hide', f === 'todo' ? u === 'done' : f === 'urgent' ? !(u === 'over' || u === 'soon') : false);
    });
  }
  St.subscribe(applyCkFilter);

  /* ---------- 甘特今日线（按月份列实际宽度定位） ---------- */
  function placeToday(){
    const line = $('.g-today');
    if(!line) return;
    const head = $$('#gantt .g-head')[line.dataset.col - 1];
    if(head && head.offsetWidth) line.style.left = head.offsetLeft + head.offsetWidth * +line.dataset.frac + 'px';
  }
  addEventListener('resize', placeToday);

  /* ---------- 块详情抽屉（原生 dialog：Esc 关闭、焦点受限、关闭后焦点回到触发处） ---------- */
  const drawer = $('#drawer');
  let openIdx = -1, noteTimer = null;
  function flushNote(){
    const ta = $('#note', drawer);
    if(ta && openIdx >= 0){ clearTimeout(noteTimer); St.setNote(St.BLOCKS[openIdx].from, ta.value); }
  }
  function openBlock(i){
    const b = St.BLOCKS[i];
    if(!b) return;
    flushNote();
    const focusNav = drawer.open && document.activeElement && document.activeElement.dataset.nav;
    openIdx = i;
    drawer.innerHTML = V.drawer(b);
    drawer.setAttribute('aria-label', `${b.w} 块详情`);
    V.sync(drawer);
    const ta = $('#note', drawer), saved = $('#note-saved', drawer);
    ta.value = St.S.notes[b.from] || '';
    ta.addEventListener('input', ()=>{
      clearTimeout(noteTimer); saved.textContent = '编辑中…';
      noteTimer = setTimeout(()=>{ St.setNote(b.from, ta.value); saved.textContent = '已保存'; }, 400);
    });
    if(!drawer.open) drawer.showModal();
    const nav = focusNav && $(`[data-nav="${focusNav}"]:not([disabled])`, drawer);
    (nav || $('[data-close]', drawer)).focus();
  }
  drawer.addEventListener('close', ()=>{ flushNote(); openIdx = -1; });
  drawer.addEventListener('click', e=>{ if(e.target === drawer) drawer.close(); });
  drawer.addEventListener('keydown', e=>{
    if(e.target.tagName === 'TEXTAREA') return;
    if(e.key === 'ArrowRight' || e.key === 'ArrowDown' && e.altKey) openBlock(openIdx + 1);
    if(e.key === 'ArrowLeft' || e.key === 'ArrowUp' && e.altKey) openBlock(openIdx - 1);
  });
  addEventListener('beforeunload', flushNote);

  /* ---------- 专注计时 ---------- */
  const T = St.timer;
  function renderTimer(){
    const box = $('#timer');
    if(!box) return;
    const s = Math.floor(T.elapsed()/1000), h = Math.floor(s/3600), m = Math.floor(s/60)%60;
    $('#timer-clock').textContent = h ? `${h}:${P.pad(m)}:${P.pad(s%60)}` : `${P.pad(m)}:${P.pad(s%60)}`;
    box.classList.toggle('run', T.running());
    $('#timer-toggle').innerHTML = T.running() ? `${P.icon('pause')}暂停` : `${P.icon('play')}${T.elapsed() ? '继续' : '开始专注'}`;
  }
  $('#timer-toggle').addEventListener('click', ()=>{ T.toggle(); renderTimer(); });
  $('#timer-stop').addEventListener('click', ()=>{ T.finish(); renderTimer(); });
  $('#timer-add').addEventListener('click', ()=>St.addTime(30));
  renderTimer();
  setInterval(()=>{ if(T.running()) renderTimer(); }, 1000);

  /* ---------- 倒计时卡背景光斑（轻量 2D，离屏/后台/减少动态时停止） ---------- */
  (function glow(){
    const c = $('#hero-glow');
    if(!c) return;
    const g = c.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2);
    const vars = ['--accent','--accent-2','--c-eng'];
    const readCols = ()=>{ const css = getComputedStyle(document.documentElement); return vars.map(v=>css.getPropertyValue(v).trim()); };
    const blobs = readCols().map((col,i)=>({col, x:Math.random(), y:Math.random(), vx:(Math.random()-.5)*.0012, vy:(Math.random()-.5)*.0012, r:.45 + i*.08}));
    const dots = Array.from({length:40}, ()=>({x:Math.random(), y:Math.random(), s:Math.random()*1.4 + .4, v:Math.random()*.0006 + .0002}));
    let w = 0, h = 0, vis = true, idle = false;
    if(window.Settings) Settings.subscribe(k=>{ if(k === 'theme') readCols().forEach((col,i)=>{ blobs[i].col = col; }); });
    const size = ()=>{ w = c.clientWidth; h = c.clientHeight; c.width = w*dpr; c.height = h*dpr; g.setTransform(dpr,0,0,dpr,0,0); };
    new ResizeObserver(size).observe(c); size();
    new IntersectionObserver(([en])=>{ vis = en.isIntersecting; }).observe(c);
    (function frame(){
      requestAnimationFrame(frame);
      if(St.reduce){ if(!idle){ g.clearRect(0, 0, w, h); idle = true; } return; }
      idle = false;
      if(!vis || document.hidden || !w || curView !== 'today') return;
      g.clearRect(0, 0, w, h);
      g.globalCompositeOperation = 'lighter';
      blobs.forEach(b=>{
        b.x += b.vx; b.y += b.vy;
        if(b.x < 0 || b.x > 1) b.vx *= -1; if(b.y < 0 || b.y > 1) b.vy *= -1;
        const R = b.r * Math.max(w, h), gr = g.createRadialGradient(b.x*w, b.y*h, 0, b.x*w, b.y*h, R);
        gr.addColorStop(0, b.col + '38'); gr.addColorStop(1, b.col + '00');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      });
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = 'rgba(255,255,255,.5)';
      dots.forEach(d=>{ d.y -= d.v; if(d.y < 0) d.y = 1; g.beginPath(); g.arc(d.x*w, d.y*h, d.s, 0, 7); g.fill(); });
    })();
  })();

  /* 供 extras.js（命令面板 / 设置 / 悬停卡片）调用 */
  window.App = {
    go(hash){
      if(drawer.open) drawer.close();
      if(location.hash.slice(1) === hash) route(); else location.hash = hash;
    },
    openBlock, setFold, renderTimer,
    view: ()=>curView,
    drawerOpen: ()=>drawer.open
  };

  route();
})();
