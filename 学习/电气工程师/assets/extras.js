/* 增强层：Ctrl+K 命令面板、设置面板、悬停卡片、PWA 注册（仅 http/https） */
(function(){
  const P = window.Plan, D = window.PLAN_DATA, St = window.Store, A = window.App, SET = window.Settings;
  const $ = (s, r=document)=>r.querySelector(s), $$ = (s, r=document)=>[...r.querySelectorAll(s)];
  const ic = P.icon;
  const plain = s => String(s).replace(/<span class="sub">.*?<\/span>/g,'').replace(/<[^>]+>/g,'');
  const esc = s => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const range = b => `${P.md(b.fromD)}–${P.md(b.toD)}`;
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const pal = $('#palette'), setDlg = $('#settings');

  /* ================= 命令面板 ================= */
  function items(){
    const L = [];
    const add = (g, icon, t, sub, run, kw='', hot=false)=>L.push({g, icon, t, sub, run, hot, text:(t + ' ' + sub + ' ' + kw).toLowerCase()});
    [['today','sun','今天','倒计时 · 本块任务 · 专注计时','jintian'], ['route','map','路线','甘特图 · 31 个双周块','luxian gantt'],
     ['check','list','打卡','打卡清单 · 导出导入','daka checklist'], ['docs','book','资料','考试事实 · 周模板 · 目标分','ziliao']]
      .forEach(([v, i, t, s, k])=>add('视图', i, t, s, ()=>A.go(v), k));

    const T = St.timer;
    add('操作', T.running() ? 'pause' : 'play', T.running() ? '暂停专注计时' : '开始专注计时', '今天视图 · 今晚时段', ()=>{
      T.toggle(); A.renderTimer(); St.toast(T.running() ? '专注计时已开始' : '专注计时已暂停');
    }, 'timer jishi zhuanzhu');
    if(T.elapsed()) add('操作', 'stop', '结束计时并记录', '写入本周学习时长', ()=>{ T.finish(); A.renderTimer(); }, 'timer jilu');
    if(window.Vocab) add('操作', 'cards', '打开词汇', `背词闪卡 · ${Vocab.summary()}`, ()=>Vocab.open(), 'vocab cihui beici word danci yingyu');
    if(window.Learn){
      add('操作', 'grad', '学习中心', '今日复习总览 · 词汇 / 公式卡 / 真题 / 错题本', ()=>Learn.open('home'), 'learn xuexi zhongxin fuxi review');
      if(Learn.decks.includes('math2')) add('操作', 'sigma', '数二公式卡', '按路线块解锁的数学公式闪卡', ()=>Learn.open('math2'), 'math2 shuer gongshi formula shuxue');
      if(Learn.decks.includes('ee831')) add('操作', 'bolt', '831 知识点卡', '电力系统分析基础公式卡', ()=>Learn.open('ee831'), '831 dianli xitong zhuanyeke formula');
      add('操作', 'layers', '数二真题', '按年整套 / 按章节刷题，自评估分', ()=>Learn.open('papers'), 'zhenti paper exam shuer lianian');
      add('操作', 'note', '错题本', '真题错题间隔复习', ()=>Learn.open('wrong'), 'cuoti wrong mistake');
    }
    add('操作', 'plus', '补记 30 分钟学习', '写入今天的学习时长（可撤销）', ()=>St.addTime(30), 'buji time');
    if(St.current) add('操作', 'locate', '定位本块', `${St.current.w} · ${range(St.current)}`, ()=>A.go('route/now'), 'dingwei now', true);
    const folded = document.body.classList.contains('hide-past');
    add('操作', 'fold', folded ? '显示已过的双周块' : '隐藏已过的双周块', '路线视图', ()=>{ A.setFold(!folded); A.go('route'); }, 'fold zhedie');
    add('操作', 'download', '导出备份', '打卡 + 块任务 + 笔记 + 时长 → JSON', ()=>St.exportAll(), 'export daochu backup');
    add('操作', 'upload', '导入备份', '从导出的 JSON 恢复（可撤销）', ()=>$('#pg-file').click(), 'import daoru');
    add('操作', 'print', '打印 / 导出 PDF', '全部视图顺序分页', ()=>print(), 'print dayin pdf');
    add('操作', 'gear', '设置', '主题 · 动效 · 默认视图 · 快捷键', openSettings, 'settings shezhi theme');
    const th = SET.get('theme'), nx = {auto:'dark', dark:'light', light:'auto'}[th] || 'auto';
    add('操作', nx === 'light' ? 'sun' : nx === 'dark' ? 'moon' : 'monitor', `主题切换为「${THEMES[nx]}」`, `当前：${THEMES[th]}`, ()=>{
      SET.set('theme', nx); St.toast(`主题：${THEMES[nx]}`);
    }, 'theme zhuti dark light');

    D.PHASES.forEach(p=>add('阶段', 'flag', `${p.no} ${p.name}`, `${p.from} → ${p.to}`, ()=>A.go('route/' + p.id), plain(p.goal)));
    add('阶段', 'calendar', '时间轴甘特图', '2026-09 → 2027-12', ()=>A.go('route/gantt-sec'), 'gantt ganter');

    St.BLOCKS.forEach(b=>{
      const p = St.blockProg(b), st = b.status === 'now' ? '本块 · ' : b.status === 'past' ? '已过 · ' : '';
      add('双周块', b.status === 'now' ? 'target' : 'calendar', `${b.w} · ${range(b)}`,
        `${st}${b.phaseObj.name} · ${p.done}/${p.total} · ${plain(b.tasks[0] ? b.tasks[0].t : '')}`,
        ()=>A.openBlock(b.i), b.tasks.map(t=>plain(t.t)).join(' ') + ' ' + plain(b.check || '') + ' ' + (St.S.notes[b.from] || ''), b.status === 'now');
    });
    St.CHECKS_FLAT.forEach(c=>{
      const done = !!St.S.plan[c.k];
      add('打卡', done ? 'check' : 'list', plain(c.t), `${D.CHECKS[c.gi].group} · ${done ? '已完成' : c.when}`, ()=>A.go('check/ck-' + c.k), c.due || '');
    });
    $$('#view-docs .subnav a').forEach(a=>{
      const id = a.getAttribute('href').split('/')[1];
      add('资料', 'book', a.textContent.trim(), '资料视图小节', ()=>A.go('docs/' + id), id);
    });
    return L;
  }
  const THEMES = {auto:'跟随系统', dark:'深色', light:'浅色'};

  let list = [], sel = 0;
  function search(q){
    const all = items(), toks = q.toLowerCase().split(/\s+/).filter(Boolean);
    if(!toks.length) return all.filter(x=>x.g === '视图' || x.g === '操作' || x.hot);
    return all.map(x=>{
      let s = 0;
      for(const t of toks){
        const i = x.text.indexOf(t);
        if(i < 0) return null;
        s += x.t.toLowerCase().startsWith(t) ? 30 : x.t.toLowerCase().includes(t) ? 20 : 5;
      }
      return {x, s: s + (x.hot ? 3 : 0) - x.t.length * .01};
    }).filter(Boolean).sort((a,b)=>b.s - a.s).slice(0, 40).map(r=>r.x);
  }
  function hl(t, q){
    let h = esc(t);
    q.toLowerCase().split(/\s+/).filter(Boolean).forEach(tk=>{
      const re = new RegExp(esc(tk).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
      h = h.replace(re, m=>`<mark>${m}</mark>`);
    });
    return h;
  }
  function render(){
    const q = $('#pal-q').value.trim(), box = $('#pal-list');
    list = search(q); sel = Math.min(sel, Math.max(list.length - 1, 0));
    if(!list.length){ box.innerHTML = `<li class="pal-empty" role="presentation">没有匹配「${esc(q)}」的结果</li>`; $('#pal-q').removeAttribute('aria-activedescendant'); return; }
    let g = null, h = '';
    list.forEach((x, i)=>{
      if(x.g !== g){ g = x.g; h += `<li class="pal-g" role="presentation">${g}</li>`; }
      h += `<li class="pal-it" role="option" id="pal-${i}" data-i="${i}" aria-selected="${i === sel}">${ic(x.icon)}
        <span class="pal-t">${hl(x.t, q)}<span class="pal-s">${hl(x.sub, q)}</span></span>${x.hot ? '<span class="pill accent">本块</span>' : ''}</li>`;
    });
    box.innerHTML = h;
    mark();
  }
  function mark(){
    $$('#pal-list .pal-it').forEach(li=>li.setAttribute('aria-selected', +li.dataset.i === sel));
    const cur = $(`#pal-${sel}`);
    if(cur){ $('#pal-q').setAttribute('aria-activedescendant', cur.id); cur.scrollIntoView({block:'nearest'}); }
  }
  function runSel(i){
    const x = list[i];
    if(!x) return;
    pal.close();
    x.run();
  }
  function openPalette(){
    if(pal.open){ pal.close(); return; }
    hideCard();
    pal.innerHTML = `
      <div class="pal-head">${ic('search')}
        <input id="pal-q" type="text" placeholder="搜索视图、双周块、打卡项、资料，或输入命令…" autocomplete="off" spellcheck="false"
          role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" aria-label="命令面板搜索">
        <kbd>Esc</kbd></div>
      <ul id="pal-list" class="pal-list" role="listbox" aria-label="结果"></ul>
      <div class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> 选择</span><span><kbd>Enter</kbd> 打开</span><span><kbd>${isMac ? '⌘' : 'Ctrl'} K</kbd> 开关</span>
        <span class="grow"></span><span>支持多个关键词，如「w12 数学」「逾期」</span></div>`;
    sel = 0;
    const q = $('#pal-q');
    q.addEventListener('input', ()=>{ sel = 0; render(); });
    q.addEventListener('keydown', e=>{
      if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
        e.preventDefault();
        if(list.length){ sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length; mark(); }
      } else if(e.key === 'Enter'){ e.preventDefault(); runSel(sel); }
    });
    const box = $('#pal-list');
    box.addEventListener('click', e=>{ const li = e.target.closest('.pal-it'); if(li) runSel(+li.dataset.i); });
    box.addEventListener('pointermove', e=>{ const li = e.target.closest('.pal-it'); if(li && +li.dataset.i !== sel){ sel = +li.dataset.i; mark(); } });
    render();
    pal.showModal();
    q.focus();
  }
  pal.addEventListener('click', e=>{ if(e.target === pal) pal.close(); });

  /* ================= 设置面板 ================= */
  function radios(name, opts){
    return `<div class="opt-seg" role="radiogroup">${opts.map(([v, t, i])=>`<label>
      <input type="radio" name="${name}" value="${v}"${String(SET.get(name)) === v ? ' checked' : ''}>${i ? ic(i) : ''}${t}</label>`).join('')}</div>`;
  }
  function openSettings(){
    if(pal.open) pal.close();
    hideCard();
    const http = /^https?:$/.test(location.protocol);
    const sw = http && 'serviceWorker' in navigator && navigator.serviceWorker.controller;
    const mod = isMac ? '⌘' : 'Ctrl';
    setDlg.innerHTML = `
      <div class="set-h"><h2>${ic('gear')} 设置</h2><span class="grow"></span>
        <button class="btn icon" type="button" data-set-close aria-label="关闭">${ic('x')}</button></div>
      <div class="set-b">
        <section><h3>外观</h3>
          <div class="set-row"><span>主题</span>${radios('theme', [['auto','跟随系统','monitor'],['dark','深色','moon'],['light','浅色','sun']])}</div>
          <div class="set-row"><span>动效<small>关闭后停用背景光斑、彩屑、视图过渡与滚动入场</small></span>
            ${radios('motion', [['auto','跟随系统'],['full','开启'],['reduce','减少']])}</div>
          <div class="set-row"><span>悬停卡片<small>鼠标悬停 / 键盘聚焦双周块、甘特、节点时显示详情</small></span>
            ${radios('hover', [['true','开启'],['false','关闭']])}</div></section>
        <section><h3>启动</h3>
          <div class="set-row"><span>默认视图<small>直接打开页面（不带 #）时进入</small></span>
            ${radios('view', [['today','今天'],['route','路线'],['check','打卡'],['docs','资料']])}</div></section>
        <section><h3>数据（仅存于本机浏览器）</h3>
          <div class="set-acts"><button class="btn sm" type="button" data-set-act="export">${ic('download')}导出备份</button>
            <button class="btn sm" type="button" data-set-act="import">${ic('upload')}导入备份</button>
            <button class="btn sm danger" type="button" data-set-act="reset">${ic('reset')}清空打卡</button></div>
          <p class="muted set-note">${http ? (sw ? '已启用离线缓存，可「安装」为应用。' : '通过 http(s) 打开时会启用离线缓存（首次加载后生效）。')
            : '当前为本地文件（file://）打开：无需网络即可使用；离线缓存 / 安装为应用需通过本地服务器访问。'}</p></section>
        <section><h3>${ic('keys')} 快捷键</h3>
          <dl class="keys">
            <dt><kbd>${mod} K</kbd> / <kbd>/</kbd></dt><dd>命令面板：搜索并跳转</dd>
            <dt><kbd>1</kbd>–<kbd>4</kbd></dt><dd>切换 今天 / 路线 / 打卡 / 资料</dd>
            <dt><kbd>,</kbd></dt><dd>打开设置</dd>
            <dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>顶栏视图切换；块详情中切换上 / 下一块</dd>
            <dt><kbd>Esc</kbd></dt><dd>关闭面板 / 抽屉 / 悬停卡片</dd>
            <dt><kbd>空格</kbd> <kbd>1</kbd>–<kbd>3</kbd></dt><dd>背词：翻面；不认识 / 模糊 / 认识（<kbd>R</kbd> 发音，<kbd>U</kbd> 撤销）</dd>
          </dl></section>
      </div>`;
    setDlg.showModal();
    ($('input:checked', setDlg) || $('[data-set-close]', setDlg)).focus();
  }
  setDlg.addEventListener('change', e=>{
    const t = e.target;
    if(t.type !== 'radio') return;
    SET.set(t.name, t.name === 'hover' ? t.value === 'true' : t.value);
  });
  setDlg.addEventListener('click', e=>{
    if(e.target === setDlg || e.target.closest('[data-set-close]')){ setDlg.close(); return; }
    const b = e.target.closest('[data-set-act]');
    if(!b) return;
    const act = b.dataset.setAct;
    if(act === 'export') St.exportAll();
    else if(act === 'import') $('#pg-file').click();
    else if(act === 'reset') St.resetAll();
  });

  /* ================= 顶栏按钮与全局快捷键 ================= */
  $('#open-palette').addEventListener('click', openPalette);
  $('#open-settings').addEventListener('click', openSettings);
  $('#open-palette kbd').textContent = `${isMac ? '⌘' : 'Ctrl'} K`;

  const typing = el => el && (el.isContentEditable || /^(TEXTAREA|SELECT)$/.test(el.tagName) ||
    el.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|reset|file)$/.test(el.type));
  document.addEventListener('keydown', e=>{
    if((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k'){ e.preventDefault(); openPalette(); return; }
    if(e.key === 'Escape') hideCard();
    if(e.ctrlKey || e.metaKey || e.altKey || typing(e.target) || $('dialog[open]')) return;
    if(e.key === '/'){ e.preventDefault(); openPalette(); }
    else if(e.key === ','){ e.preventDefault(); openSettings(); }
    else if(/^[1-4]$/.test(e.key)) A.go(['today','route','check','docs'][+e.key - 1]);
  });

  /* ================= 悬停卡片 ================= */
  const card = document.createElement('div');
  card.className = 'hovercard'; card.id = 'hovercard'; card.setAttribute('role', 'tooltip'); card.hidden = true;
  document.body.append(card);
  const now = St.now;
  const dleft = d =>{ const n = P.days(now, P.parse(d)); return n > 0 ? `还有 ${n} 天` : n === 0 ? '就是今天' : `已过 ${-n} 天`; };
  const blockAt = d =>{ const x = P.parse(d); return St.BLOCKS.find(b=>b.fromD <= x && x <= b.toD); };

  const HC = {
    blk(i){
      const b = St.BLOCKS[+i]; if(!b) return '';
      const p = St.blockProg(b), note = St.S.notes[b.from];
      return `<div class="hc-h"><b>${b.w}</b><span>${b.from} → ${b.to}</span><span class="pill">${p.done}/${p.total}</span></div>
        <ul class="hc-tasks">${b.tasks.map(t=>{
          const on = St.S.blocks[`${b.from}:${t.k}`], s = t.subj ? D.SUBJECTS[t.subj] : null;
          return `<li class="${on ? 'on' : ''}"><i class="dot" style="--c:var(${s ? s.color : '--warn'})"></i><span>${esc(plain(t.t))}</span></li>`;
        }).join('')}</ul>
        ${b.check ? `<p class="hc-k"><b>通关检验</b>${esc(plain(b.check))}</p>` : ''}
        ${note ? `<p class="hc-note">${ic('pen')} ${esc(note.length > 80 ? note.slice(0, 80) + '…' : note)}</p>` : ''}
        <p class="hc-tip">点击或 Enter 打开详情</p>`;
    },
    grow(i){
      const r = D.GROWS[+i]; if(!r) return '';
      return `<div class="hc-h"><i class="dot" style="--c:var(${r.dot})"></i><b>${r.label}</b></div>
        <p>${D.MONTHS[r.from - 1]} → ${D.MONTHS[r.to - 1]} · ${r.to - r.from + 1} 个月</p><p class="muted">${esc(plain(r.text))}</p>`;
    },
    mile(i){
      const m = D.MILES[+i]; if(!m) return '';
      const b = blockAt(m.date);
      return `<div class="hc-h">${ic('flag')}<b>${m.t}</b></div><p>${m.date} · <b>${dleft(m.date)}</b></p>
        ${b ? `<p class="muted">位于 ${b.w}（${range(b)}）</p>` : ''}`;
    },
    phase(id){
      const p = D.PHASES.find(x=>x.id === id); if(!p) return '';
      const bl = St.BLOCKS.filter(b=>b.phase === id);
      const pr = bl.reduce((a, b)=>{ const x = St.blockProg(b); return [a[0] + x.done, a[1] + x.total]; }, [0, 0]);
      return `<div class="hc-h"><i class="dot" style="--c:var(${p.color})"></i><b>${p.no} ${p.name}</b></div>
        <p>${p.from} → ${p.to} · ${bl.length} 块 · 任务 ${pr[0]}/${pr[1]}</p><p class="muted">${plain(p.goal)}</p>`;
    },
    day(d){
      const min = +St.S.time[d] || 0, x = P.parse(d);
      return `<div class="hc-h"><b>${P.md(x)} 周${'日一二三四五六'[x.getDay()]}</b></div><p>${min ? `学习 <b>${(min/60).toFixed(1)}</b> 小时（${min} 分钟）` : '未记录'}</p>`;
    }
  };

  let hcTimer = null, hcEl = null;
  function place(el){
    const r = el.getBoundingClientRect(), W = innerWidth, H = innerHeight;
    card.style.left = '0px'; card.style.top = '0px';
    const cw = card.offsetWidth, ch = card.offsetHeight;
    let x = r.left + r.width/2 - cw/2, y = r.bottom + 10;
    if(y + ch > H - 8) y = r.top - ch - 10;
    x = Math.max(8, Math.min(x, W - cw - 8));
    y = Math.max(8, y);
    card.style.left = x + 'px'; card.style.top = y + 'px';
  }
  function showCard(el){
    if(!SET.get('hover') || A.drawerOpen() || $('dialog[open]')) return;
    const [kind, arg] = el.dataset.hc.split(':');
    const html = HC[kind] && HC[kind](arg);
    if(!html) return;
    if(el.title){ el.dataset.title = el.title; el.removeAttribute('title'); }
    card.innerHTML = html;
    card.hidden = false;
    place(el);
    hcEl = el;
    el.setAttribute('aria-describedby', 'hovercard');
  }
  function hideCard(){
    clearTimeout(hcTimer);
    if(!hcEl) return;
    hcEl.removeAttribute('aria-describedby');
    if(hcEl.dataset.title){ hcEl.title = hcEl.dataset.title; delete hcEl.dataset.title; }
    hcEl = null; card.hidden = true;
  }
  document.addEventListener('pointerover', e=>{
    if(e.pointerType === 'touch') return;
    const el = e.target.closest('[data-hc]');
    if(!el || el === hcEl) return;
    hideCard();
    if(el.title){ el.dataset.title = el.title; el.removeAttribute('title'); }
    hcTimer = setTimeout(()=>showCard(el), 280);
  });
  document.addEventListener('pointerout', e=>{
    const el = e.target.closest('[data-hc]');
    if(!el || el.contains(e.relatedTarget)) return;
    clearTimeout(hcTimer);
    if(el.dataset.title && el !== hcEl){ el.title = el.dataset.title; delete el.dataset.title; }
    if(el === hcEl) hideCard();
  });
  document.addEventListener('focusin', e=>{
    const el = e.target.closest && e.target.closest('[data-hc]');
    if(el && el.matches(':focus-visible')){ hideCard(); showCard(el); }
  });
  document.addEventListener('focusout', e=>{ if(e.target === hcEl || (hcEl && hcEl.contains(e.target))) hideCard(); });
  addEventListener('scroll', hideCard, {passive:true, capture:true});
  document.addEventListener('pointerdown', hideCard);
  addEventListener('hashchange', hideCard);
  St.subscribe(hideCard);

  /* ================= PWA（file:// 下跳过；http/https 下注册清单与离线缓存） ================= */
  if(/^https?:$/.test(location.protocol)){
    const l = document.createElement('link'); l.rel = 'manifest'; l.href = 'manifest.webmanifest';
    document.head.append(l);
    if('serviceWorker' in navigator){
      const had = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.register('sw.js').catch(()=>{});
      navigator.serviceWorker.addEventListener('controllerchange', ()=>{ if(had) St.toast('离线缓存已更新，刷新后生效'); });
    }
  }
})();
