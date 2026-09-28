/* 视图渲染：今天 / 路线 / 打卡 / 资料 / 块详情抽屉。window.Views（纯 HTML 生成 + 状态同步） */
(function(){
  const P = window.Plan, D = window.PLAN_DATA, St = window.Store;
  const ic = P.icon, now = St.now;
  const SUBJ = D.SUBJECTS;
  const plain = s => s.replace(/<span class="sub">.*?<\/span>/g,'').replace(/<[^>]+>/g,'');
  const range = b => `${P.md(b.fromD)}–${P.md(b.toD)}`;
  const WD = ['日','一','二','三','四','五','六'];

  const ring = (id, size=132)=>`<div class="ring" style="--size:${size}px" data-ring="${id}">
    <svg viewBox="0 0 120 120"><circle class="trk" cx="60" cy="60" r="52"/><circle class="val" cx="60" cy="60" r="52"
    stroke-dasharray="326.7" stroke-dashoffset="326.7"/></svg><div class="lbl"><b>0%</b><span></span></div></div>`;
  const badges = b => (b.status==='now'?'<span class="pill accent">本块</span>':'') +
    (b.mile?'<span class="pill warn">节点</span>':'') + (b.buf?'<span class="pill">缓冲</span>':'');
  const taskRow = (b, t)=>{
    const s = t.subj ? SUBJ[t.subj] : null;
    return `<label class="row-ck task" style="--c:var(${s?s.color:'--warn'})">
      <input type="checkbox" class="tick" data-task="${b.from}:${t.k}">
      <span class="t"><span class="subj">${s?s.name:'整块任务'}</span>${t.t}</span></label>`;
  };
  const checkRow = b=>`<label class="row-ck task" style="--c:var(--good)">
      <input type="checkbox" class="tick" data-task="${b.from}:check">
      <span class="t"><span class="subj">通关检验</span>${b.check}</span></label>`;
  const planRow = (c, id)=>`<label class="row-ck" data-u${id?` id="ck-${c.k}"`:''}>
      <input type="checkbox" class="tick" data-plan="${c.k}">
      <span class="t">${c.t}${c.isNew?'<span class="new-tag">新增</span>':''}</span>
      <span class="due" data-due="${c.due||''}" title="${c.due?'截止 '+c.due:''}">${c.when}</span></label>`;

  /* ================= 今天 ================= */
  function daySlots(){
    const wd = now.getDay(), weekend = wd === 0 || wd === 6;
    const b = St.current;
    const hint = s => b && b[s] && b[s] !== '—' ? `<span class="sub">${plain(b[s])}</span>` : '';
    const polOn = now >= P.parse('2027-07-01');
    if(!weekend){
      const main = now.getDate() % 2 ? 'math' : 'major';
      const rows = [
        {c:'--c-eng', w:'早晨 0.5h', t:'英语词汇打卡（通勤可做）', h:hint('eng')},
        {c:SUBJ[main].color, w:'晚上 2h', t:`${SUBJ[main].name}（${main==='math'?'单日':'双日'}轮换）`, h:hint(main), hot:true}
      ];
      if(wd === 2 || wd === 4) rows.push({c:'--warn', w:'其中 40′', t:'无计算器手算专项', h:'<span class="sub">潮流 / 导纳矩阵 / 短路 / 频率 / 高斯消元</span>'});
      rows.push({c:'--ink-3', w:'碎片', t:'错题回顾、公式卡片、听冲刺音频', h:''});
      return rows;
    }
    const eve = polOn && wd === 0 ? 'pol' : 'eng';
    const rows = [
      {c:'--c-math', w:'上午 3h', t:'数学二（完整章节 / 套题）', h:hint('math'), hot:true},
      {c:'--c-major', w:'下午 3h', t:'专业课 831（教材 / 真题）', h:hint('major'), hot:true},
      {c:SUBJ[eve].color, w:'晚上 2h', t:eve==='pol'?'政治（按阶段切换）':'英语真题'+(polOn?'（周日换政治）':''), h:hint(eve)}
    ];
    if(wd === 0) rows.push({c:'--good', w:'15 分钟', t:'周复盘：本周完成率 + 下周微调', h:''});
    return rows;
  }

  function today(){
    const b = St.current, left = P.days(now, P.EXAM);
    const ph = b ? b.phaseObj : D.PHASES.find(p=>P.parse(p.from) > now);
    const blockCard = b ? `
      <div class="blk-head"><span class="w">${b.w}</span><span class="d">${range(b)}</span>${badges(b)}
        <span class="grow"></span><span class="left-days">本块剩 <b>${P.days(now, b.toD)+1}</b> 天</span></div>
      <div class="bar" style="margin-bottom:10px"><i data-bprog="${b.from}" style="width:0"></i></div>
      <div class="tasks">${b.tasks.map(t=>taskRow(b,t)).join('')}${checkRow(b)}</div>
      <div class="toolbar" style="margin:12px 0 0"><button class="btn sm" data-open="${b.i}">${ic('arrow')}块详情 · 笔记</button>
        <button class="btn sm" data-go="route:now">${ic('locate')}在路线中定位</button></div>`
      : `<p class="muted">${now < P.W1 ? `W1 于 <b>2026-09-28</b> 开始。` : '全部双周块已结束，祝上岸。'}</p>
         ${St.next ? `<button class="btn sm" data-open="${St.next.i}">${ic('arrow')}查看 ${St.next.w}</button>` : ''}`;
    return `
    <div class="bento">
      <section class="card b-hero reveal" aria-label="倒计时"><canvas id="hero-glow" aria-hidden="true"></canvas>
        <h3>${ic('clock')}距初试（推算 2027-12-18）</h3>
        <div>${left >= 0 ? `<span class="big-num">${left}</span><span class="unit">天</span>` : '<span class="big-num">0</span><span class="unit">初试已结束</span>'}</div>
        <p class="lead">${P.ymd(now)} · 周${WD[now.getDay()]} · 第 <b>${Math.max(P.weekNo(now),1)}</b> 周${ph?` · ${ph.name}`:''}</p>
        <div class="meta"><span class="chip">目标 <b>330+</b></span><span class="chip">复试线 <b>264</b></span>
          <span class="chip danger">${ic('nocalc')} 禁止计算器</span></div>
      </section>

      <section class="card b-block reveal" aria-label="本块任务"><h3>${ic('target')}本块任务<span class="grow"></span>
        ${ph?`<span class="pill" style="color:var(${ph.color})">${ph.name}</span>`:''}</h3>${blockCard}</section>

      <section class="card b-tonight reveal" aria-label="今日安排"><h3>${ic('sun')}今日安排 · 周${WD[now.getDay()]}<span class="grow"></span>
        <span class="muted" style="font-weight:400">按每周模板</span></h3>
        <div class="slots">${daySlots().map(s=>`<div class="slot${s.hot?' hot':''}" style="--c:var(${s.c})">
          <span class="when">${s.w}</span><span class="what">${s.t}${s.h}</span></div>`).join('')}</div>
        <div class="timer" id="timer"><span class="clock" id="timer-clock">00:00</span><span class="grow"></span>
          <button class="btn primary" id="timer-toggle" type="button">${ic('play')}开始专注</button>
          <button class="btn" id="timer-stop" type="button" title="结束并记录">${ic('stop')}记录</button>
          <button class="btn icon" id="timer-add" type="button" title="手动补记 30 分钟" aria-label="补记 30 分钟">${ic('plus')}</button></div>
      </section>

      <section class="card b-ring reveal" aria-label="打卡进度"><h3>${ic('check')}打卡进度</h3>
        <div class="ring-wrap">${ring('plan', 120)}<div class="ring-stats" data-stats></div></div></section>

      <section class="card b-hours reveal" aria-label="本周学习时长"><h3>${ic('clock')}本周时长</h3><div data-hours></div></section>

      <section class="card b-subj reveal" aria-label="四科进度"><h3>${ic('bolt')}四科块任务进度<span class="grow"></span>
        <span class="muted" style="font-weight:400">竖线 = 按日期应完成</span></h3><div class="subj-rows" data-subj></div></section>

      <section class="card b-miles reveal" aria-label="下一个节点"><h3>${ic('flag')}接下来的节点</h3>
        <ul class="mile-list">${St.MS.filter(m=>P.parse(m.date) >= now).slice(0,3).map(m=>`
          <li><span class="dd">${P.days(now, P.parse(m.date))}<small>天</small></span><span>${m.t}</span><span class="muted">${m.date.slice(5).replace('-','/')}</span></li>`).join('')
          || '<li class="muted">全部节点已过</li>'}</ul></section>

      <section class="card b-vocab b-learn reveal" aria-label="今日复习" ${window.Learn ? 'data-learn' : 'data-vocab'}></section>

      <section class="card b-due reveal" aria-label="临近截止"><h3>${ic('alert')}临近截止 / 逾期<span class="grow"></span>
        <button class="btn sm" data-go="check">全部打卡 ${ic('right')}</button></h3><div data-due-list></div></section>

      <section class="card b-strip reveal" aria-label="全程进度"><h3>${ic('map')}全程 · 2026-09-28 → 2027-12-18</h3>${strip()}</section>
    </div>`;
  }
  function strip(){
    const a = P.parse(D.PHASES[0].from), z = P.parse(D.PHASES.at(-1).to), span = P.days(a, z);
    const pos = Math.min(Math.max(P.days(a, now)/span, 0), 1)*100;
    return `<div class="strip">${D.PHASES.map(p=>{
      const w = P.days(P.parse(p.from), P.parse(p.to)) + 1;
      return `<a href="#route/${p.id}" style="--w:${w};--c:var(${p.color})" class="${P.parse(p.to) < now ? 'past' : ''}" data-hc="phase:${p.id}" title="${p.from} → ${p.to}">${p.name}</a>`;
    }).join('')}${now >= a && now <= z ? `<span class="now" style="left:${pos}%"></span>` : ''}</div>
    <div class="strip-cap"><span>2026-09-28</span><span>今天 ${P.md(now)}</span><span>2027-12-18</span></div>`;
  }
  function hours(){
    const mon = new Date(St.realToday()); mon.setDate(mon.getDate() - (mon.getDay()+6)%7);
    const ds = Array.from({length:7}, (_,i)=>{ const d = new Date(mon); d.setDate(d.getDate()+i); return d; });
    const mins = ds.map(d=>+St.S.time[P.ymd(d)] || 0);
    const sum = mins.reduce((a,b)=>a+b, 0), max = Math.max(180, ...mins), tk = P.ymd(St.realToday());
    const [lo, hi] = D.WEEK_BUDGET;
    const tone = sum/60 >= lo ? 'good' : 'warn';
    return `<div class="hours-sum">${(sum/60).toFixed(1)}<small>h / 目标 ${lo}–${hi}h</small></div>
      <div class="hours-bars">${ds.map((d,i)=>`<div class="${P.ymd(d)===tk?'today':''}" data-hc="day:${P.ymd(d)}" title="${P.md(d)} · ${mins[i]} 分钟">
        <i style="height:${Math.round(mins[i]/max*100)}%"></i><span>${'一二三四五六日'[i]}</span></div>`).join('')}</div>
      <span class="pill ${tone}">${sum/60 >= lo ? '已达保底' : `距保底还差 ${(lo - sum/60).toFixed(1)}h`}</span>`;
  }
  function subjRows(){
    return Object.entries(SUBJ).map(([k,s])=>{
      const bl = St.BLOCKS.filter(b=>b.tasks.some(t=>t.k === k));
      const done = bl.filter(b=>St.S.blocks[`${b.from}:${k}`]).length;
      const exp = bl.filter(b=>b.toD < now).length;
      return `<div class="subj-row" style="--c:var(${s.color})"><span><i class="dot" style="--c:var(${s.color})"></i> ${s.name}</span>
        <div class="bar"><i style="width:${bl.length ? done/bl.length*100 : 0}%"></i>${exp ? `<span class="exp" style="left:${exp/bl.length*100}%"></span>` : ''}</div>
        <span class="n">${done} / ${bl.length}</span></div>`;
    }).join('');
  }
  function dueList(){
    const list = St.CHECKS_FLAT.map(c=>Object.assign({u:P.urgency(c.due, !!St.S.plan[c.k])}, c))
      .filter(c=>c.u === 'over' || c.u === 'soon').sort((a,b)=>a.due < b.due ? -1 : 1).slice(0, 6);
    if(list.length) return list.map(c=>planRow(c)).join('');
    const nx = St.CHECKS_FLAT.filter(c=>!St.S.plan[c.k] && c.due).sort((a,b)=>a.due < b.due ? -1 : 1)[0];
    return `<p class="muted" style="margin:4px 0 8px">${ic('check')} 无逾期，两周内没有到期项。</p>${nx ? planRow(nx) : ''}`;
  }

  /* ================= 路线 ================= */
  function gantt(){
    const cur = (()=>{ const i = (now.getFullYear()-2026)*12 + now.getMonth() - 8 + 1; return i>=1 && i<=16 ? i : 0; })();
    let h = '<div></div>' + D.MONTHS.map((m,i)=>`<div class="g-head${i+1===cur?' cur':''}">${m}</div>`).join('');
    D.GROWS.forEach(r=>{
      h += `<div class="g-label"><i class="dot" style="--c:var(${r.dot})"></i>${r.label}</div>`;
      for(let i=1;i<=16;i++){
        if(i === r.from) h += `<div class="g-bar" data-hc="grow:${D.GROWS.indexOf(r)}" style="grid-column:span ${r.to-r.from+1};--c:var(${r.dot})" title="${r.label} · ${D.MONTHS[r.from-1]} → ${D.MONTHS[r.to-1]}">${r.text}</div>`;
        else if(!(i > r.from && i <= r.to)) h += '<div></div>';
      }
    });
    const upcoming = Object.values(D.MILES).map(m=>m.date).filter(d=>P.parse(d) >= now).sort()[0];
    h += '<div class="g-mile"><div class="g-label" style="color:var(--warn)">关键节点</div>';
    for(let i=1;i<=16;i++){
      const m = D.MILES[i];
      h += m ? `<div class="m ${P.parse(m.date) < now ? 'done' : m.date === upcoming ? 'next' : ''}" data-hc="mile:${i}" title="${m.date}">${m.t}</div>` : '<div></div>';
    }
    h += '</div>';
    if(cur){
      const dim = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
      h += `<div class="g-today" data-col="${cur}" data-frac="${(now.getDate()-.5)/dim}"><span>今天 ${P.md(now)}</span></div>`;
    }
    return h;
  }
  function blockCard(b){
    return `<div class="blk ${b.status}${b.mile?' mile':''}" role="button" tabindex="0" data-open="${b.i}" data-hc="blk:${b.i}" id="blk-${b.from}"
        aria-label="${b.w} ${range(b)}，打开详情">
      <div class="top"><span class="w">${b.w}</span><span class="d">${range(b)}</span><span class="grow"></span>${badges(b)}</div>
      <ul>${b.tasks.map(t=>`<li><i class="dot" style="--c:var(${t.subj?SUBJ[t.subj].color:'--warn'})"></i><span>${plain(t.t)}</span></li>`).join('')}</ul>
      <div class="foot"><div class="bar"><i data-bprog="${b.from}" style="width:0"></i></div><span data-bnum="${b.from}"></span></div>
    </div>`;
  }
  function route(){
    const H = D.HOW;
    return `
    <div class="view-head"><div><h1>学习路径 · 31 个双周块</h1>
      <p>把 15 个月拆成双周任务块（含 2 个缓冲块），每块给出四科任务（到章节）与通关检验。点卡片看详情、勾任务、写笔记。</p></div>
      <span class="grow"></span><div class="chips"><span class="chip">节奏 <b>每块 ≈ 40–55h</b></span><span class="chip">专业课 <b>831</b></span></div></div>

    <details class="card how" id="how"><summary>${ic('compass')}使用方法 · 三轮复习法 × 双周节奏</summary>
      <div class="method">${H.rounds.map(r=>`<p><span class="pill accent">${r[0]}</span>${r[1]}</p>`).join('')}
        ${H.notes.map(n=>`<p>${n}</p>`).join('')}</div>
      <ul class="rules">${H.rules.map(r=>`<li>${r}</li>`).join('')}</ul></details>

    <section class="card" id="gantt-sec" style="margin-bottom:var(--s4)"><h3>${ic('calendar')}时间轴甘特图（2026-09 → 2027-12）<span class="grow"></span>
      <span class="muted" style="font-weight:400">红线为今天 · 闪烁为下一节点</span></h3>
      <div class="gantt-box"><div class="gantt" id="gantt">${gantt()}</div></div>
      <div class="legend">${D.GANTT_LEGEND.map(l=>`<span><i class="dot" style="--c:var(${l[0]})"></i>${l[1]}</span>`).join('')}</div></section>

    <div class="toolbar no-print" role="toolbar" aria-label="筛选">
      <div class="filters" id="phase-filter">${[['all','全部'], ...D.PHASES.map(p=>[p.id, p.name.replace(' · ','')])]
        .map(([k,t],i)=>`<button type="button" data-f="${k}" aria-pressed="${i===0}">${t}</button>`).join('')}</div>
      <span class="grow"></span>
      <button class="btn sm" type="button" id="fold-past" aria-pressed="false">${ic('fold')}<span>隐藏已过</span></button>
      ${St.current ? `<button class="btn sm primary" type="button" data-go="route:now">${ic('locate')}定位本块</button>` : ''}
    </div>

    ${D.PHASES.map(p=>{
      const bl = St.BLOCKS.filter(b=>b.phase === p.id), past = bl.filter(b=>b.status === 'past').length;
      return `<section class="phase" id="${p.id}" data-phase="${p.id}">
        <h2 class="sec-title"><i class="dot" style="--c:var(${p.color});width:10px;height:10px"></i>${p.no} ${p.name}
          <span class="range">${p.from} → ${p.to} · ${bl.length} 块</span></h2>
        <p class="sec-desc">${p.goal}</p>
        ${past ? `<p class="fold-note">已隐藏 ${past} 个已过的双周块</p>` : ''}
        <div class="blocks">${bl.map(blockCard).join('')}</div></section>`;
    }).join('')}`;
  }

  /* ================= 块详情抽屉 ================= */
  function drawer(b){
    const inRange = d => d && P.parse(d) >= b.fromD && P.parse(d) <= b.toD;
    const checks = St.CHECKS_FLAT.filter(c=>inRange(c.due));
    const miles = St.MS.filter(m=>inRange(m.date));
    const prev = St.BLOCKS[b.i-1], nxt = St.BLOCKS[b.i+1];
    return `
    <div class="dh"><div class="grow">
        <p>${b.phaseObj.no} ${b.phaseObj.name} · 第 ${b.i+1} / ${St.BLOCKS.length} 块</p>
        <h2>${b.w} <span class="muted" style="font-size:15px;font-weight:400">${b.from} → ${b.to}</span></h2>
        <div class="chips" style="margin-top:6px">${badges(b)}${b.status==='past'?'<span class="pill">已过</span>':''}
          <span class="pill" data-bnum="${b.from}"></span></div></div>
      <button class="btn icon" type="button" data-close aria-label="关闭">${ic('x')}</button></div>
    <div class="db">
      <div><h3>四科任务</h3><div class="tasks">${b.tasks.map(t=>taskRow(b,t)).join('')}</div>
        ${b.phase==='p0'||b.phase==='p1' ? '<p class="muted" style="font-size:12.5px;margin:6px 0 0">政治 2027 年 7 月前不开始，本块不设政治任务。</p>' : ''}</div>
      <div><h3>通关检验</h3><div class="tasks">${checkRow(b)}</div>
        <p class="muted" style="font-size:12.5px;margin:6px 0 0">四科完成 ≥ 80% 算过关；未完成先压缩下周非核心任务，不要无限顺延。</p></div>
      ${miles.length ? `<div><h3>本块关键节点</h3>${miles.map(m=>`<p style="margin:4px 0">${ic('flag')} <b>${m.t}</b> <span class="muted">${m.date}</span></p>`).join('')}</div>` : ''}
      ${checks.length ? `<div><h3>本块到期的打卡项</h3>${checks.map(c=>planRow(c)).join('')}</div>` : ''}
      <div><h3>${ic('pen')} 笔记 <span class="saved" id="note-saved"></span></h3>
        <textarea id="note" placeholder="记录本块完成情况、错题、需要调整的地方……（自动保存在本机）"></textarea></div>
    </div>
    <div class="df">
      <button class="btn" type="button" data-nav="-1" ${prev?'':'disabled'}>${ic('left')}${prev?prev.w:''}</button>
      <span class="grow"></span>
      <button class="btn" type="button" data-nav="1" ${nxt?'':'disabled'}>${nxt?nxt.w:''}${ic('right')}</button>
    </div>`;
  }

  /* ================= 打卡 ================= */
  function check(){
    return `
    <div class="view-head"><div><h1>打卡清单</h1>
      <p>勾选保存在本机浏览器（localStorage），换电脑 / 清缓存前请先「导出」。截止标签：红 = 逾期，橙 = 两周内，灰 = 未到，绿 = 已完成。</p></div></div>
    <div class="card ck-head">${ring('plan2', 132)}
      <div class="grow"><div class="ring-stats" data-stats></div></div>
      <div class="toolbar no-print" style="margin:0">
        <div class="filters" id="ck-filter">${[['all','全部'],['todo','未完成'],['urgent','逾期/临近']]
          .map(([k,t],i)=>`<button type="button" data-f="${k}" aria-pressed="${i===0}">${t}</button>`).join('')}</div>
        <button class="btn sm" type="button" id="pg-export">${ic('download')}导出</button>
        <button class="btn sm" type="button" id="pg-import">${ic('upload')}导入</button>
        <button class="btn sm" type="button" id="pg-reset">${ic('reset')}重置</button>
        <input type="file" id="pg-file" accept="application/json,.json" hidden></div></div>
    <div class="groups">${D.CHECKS.map((g,gi)=>`
      <section class="card group"><h4>${g.group}<span class="grow"></span><span class="pill" data-gcnt="${gi}"></span></h4>
        <div class="gdesc">${g.desc}</div><div class="bar"><i data-gbar="${gi}" style="width:0"></i></div>
        ${St.CHECKS_FLAT.filter(c=>c.gi === gi).map(c=>planRow(c, true)).join('')}</section>`).join('')}</div>`;
  }

  /* ================= 资料 ================= */
  function docs(){
    const N = D.NOCALC;
    const nav = [['facts','关键事实'],['weekly','每周模板'],['targets','策略与目标'],['milestones','节点日程'],['unknowns','待核实'],['noc','无计算器专项'],['sources','来源']];
    const tl = D.TIMELINE.map(t=>{
      const a = P.parse(t.from), z = P.parse(t.to), st = z < now ? 'past' : a <= now ? 'now' : '';
      return `<div class="tl-item${t.key?' key':''} ${st}"><div class="dt">${t.date}</div>
        <div><b>${t.t}${st==='now'?' <span class="pill accent">进行中</span>':''}</b><span>${t.d}</span></div></div>`;
    }).join('');
    return `
    <div class="view-head"><div><h1>${D.HERO.title}</h1><p>${D.HERO.intro}</p></div></div>
    <div class="chips" style="margin-bottom:var(--s3)">${D.HERO.chips.map(c=>`<span class="chip">${c.k}：<b>${c.v}</b></span>`).join('')}
      <span class="chip danger">${ic('nocalc')} <b>禁止使用计算器</b></span></div>
    <div class="links" style="margin-bottom:var(--s4)">${D.HERO.links.map(l=>`<a href="${l.href}">${ic(l.ic)}${l.t}</a>`).join('')}</div>
    <nav class="subnav no-print" aria-label="资料目录">${nav.map(([id,t])=>`<a class="chip" href="#docs/${id}">${t}</a>`).join('')}</nav>

    <h2 class="sec-title" id="facts">关键事实（已核实）</h2>
    <p class="sec-desc">数据抓取于 2026-09，均附年份；未核实项在「待核实」单独列出。</p>
    <div class="grid-2">${D.FACTS.map(f=>`<div class="card fact reveal"><h4>${f.h} <span class="pill ${f.tone}">${f.pill}</span></h4>
      ${f.big?`<div class="big">${f.big}</div><div class="muted" style="font-size:13px">${f.sub}</div>`:''}
      ${f.notes.map(n=>`<p>${n}</p>`).join('')}</div>`).join('')}</div>

    <h2 class="sec-title" id="weekly">每周固定模板（20–30h）</h2>
    <p class="sec-desc">工作日碎片 + 整块周末，保证数学和专业课各有整块时间；加班周至少保住下限 20h。</p>
    <div class="grid-3">${D.WEEKLY.map(w=>`<div class="card week reveal"><h4>${ic(w.ic)}${w.h}</h4>
      ${w.rows.map(r=>`<div class="r"><b>${r[0]}</b><span>${r[1]}</span></div>`).join('')}<div class="total">${w.total}</div></div>`).join('')}</div>

    <h2 class="sec-title" id="targets">各科策略与目标分数（总目标 330+）</h2>
    <p class="sec-desc">两门 150 分是拉分主力，政治英语是过线保障。</p>
    <div class="grid-2">${D.TARGETS.map(t=>`<div class="card target reveal" style="--c:var(${SUBJ[t.subj].color})">
      <h4>${t.name}</h4>${t.why?`<span class="muted" style="font-size:12.5px">${t.why}</span>`:''}
      <div class="goal">${t.goal}</div><span class="k">策略重心</span><p style="margin-top:2px">${t.how}</p>
      <span class="k">参考资料</span><p style="margin-top:2px">${t.ref}</p></div>`).join('')}</div>

    <h2 class="sec-title" id="milestones">关键节点日程</h2>
    <p class="sec-desc">日期为研招网惯例推算，以官方公告为准。已过的节点变淡，当前阶段高亮。</p>
    <div class="card"><div class="tl">${tl}</div></div>

    <h2 class="sec-title" id="unknowns">已核实 / 待核实事项</h2>
    <div class="stack">${D.ALERTS.map(a=>`<div class="card alert ${a.tone} reveal"><h4>${ic(a.ic)}${a.h}</h4>
      <ul>${a.items.map(i=>`<li>${i}</li>`).join('')}</ul></div>`).join('')}</div>

    <h2 class="sec-title" id="noc">无计算器专项（全阶段）</h2>
    <p class="sec-desc">${N.desc}</p>
    <div class="card method reveal">${N.rows.map((r,i)=>`<p><span class="pill accent">${r[0]}</span>${r[1]}</p>
      ${i===N.constsAfter?`<div class="const-grid">${N.consts.map(c=>`<span>${c}</span>`).join('')}</div>`:''}`).join('')}</div>

    <h2 class="sec-title" id="sources">资料来源</h2>
    <div class="card src"><h4 style="margin:0 0 6px">${D.SOURCES.h}</h4>
      <ul>${D.SOURCES.items.map(i=>`<li>${i}</li>`).join('')}</ul>${D.SOURCES.notes.map(n=>`<p>${n}</p>`).join('')}</div>`;
  }

  /* ================= 状态同步（任何勾选变化后调用） ================= */
  function setRing(el, pct, label){
    if(!el) return;
    el.querySelector('.val').style.strokeDashoffset = 326.7 * (1 - pct/100);
    const b = el.querySelector('.lbl b'), from = +b.dataset.v || 0;
    el.querySelector('.lbl span').textContent = label;
    b.dataset.v = pct;
    if(St.reduce || from === pct){ b.textContent = pct + '%'; return; }
    const t0 = performance.now();
    (function step(t){
      const k = Math.min((t - t0)/800, 1), e = 1 - Math.pow(1-k, 3);
      b.textContent = Math.round(from + (pct - from)*e) + '%';
      if(k < 1) requestAnimationFrame(step);
    })(t0);
  }
  function sync(root){
    root = root || document;
    const S = St.S;
    root.querySelectorAll('[data-plan]').forEach(i=>{ i.checked = !!S.plan[i.dataset.plan]; });
    root.querySelectorAll('[data-task]').forEach(i=>{ i.checked = !!S.blocks[i.dataset.task]; });
    root.querySelectorAll('.due[data-due]').forEach(el=>{
      const k = el.closest('label').querySelector('[data-plan]').dataset.plan;
      const u = P.urgency(el.dataset.due || null, !!S.plan[k]);
      el.className = 'due ' + u; el.closest('label').dataset.u = u;
    });
    St.BLOCKS.forEach(b=>{
      const p = St.blockProg(b);
      root.querySelectorAll(`[data-bprog="${b.from}"]`).forEach(el=>{ el.style.width = p.pct + '%'; });
      root.querySelectorAll(`[data-bnum="${b.from}"]`).forEach(el=>{ el.textContent = `${p.done}/${p.total}`; });
    });
    D.CHECKS.forEach((g,gi)=>{
      const n = g.items.filter((_,ii)=>S.plan[`${gi}-${ii}`]).length;
      root.querySelectorAll(`[data-gcnt="${gi}"]`).forEach(el=>{ el.textContent = `${n} / ${g.items.length}`; });
      root.querySelectorAll(`[data-gbar="${gi}"]`).forEach(el=>{ el.style.width = n/g.items.length*100 + '%'; });
    });
    const s = St.stats();
    root.querySelectorAll('[data-ring]').forEach(el=>setRing(el, s.pct, `${s.done} / ${s.all}`));
    root.querySelectorAll('[data-stats]').forEach(el=>{ el.innerHTML =
      `<span><b>${s.done}</b> / ${s.all} 项已完成</span>` +
      (s.over ? `<span class="pill bad">${s.over} 项已逾期</span>` : '') +
      (s.soon ? `<span class="pill warn">${s.soon} 项两周内到期</span>` : '') +
      (!s.over && !s.soon ? '<span class="pill good">无逾期</span>' : '') +
      (el.closest('#view-today') ? `<button class="btn sm" data-go="check">去打卡 ${ic('right')}</button>` : ''); });
    root.querySelectorAll('[data-hours]').forEach(el=>{ el.innerHTML = hours(); });
    root.querySelectorAll('[data-subj]').forEach(el=>{ el.innerHTML = subjRows(); });
    root.querySelectorAll('[data-due-list]').forEach(el=>{ el.innerHTML = dueList(); sync(el); });
    if(window.Learn) Learn.renderCards(root);
    else if(window.Vocab) Vocab.renderCards(root);
  }

  window.Views = { today, route, check, docs, drawer, sync };
})();
