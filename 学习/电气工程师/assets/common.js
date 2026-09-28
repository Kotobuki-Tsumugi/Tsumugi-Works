/* 华电电气考研 · 共享工具（经典脚本，file:// 双击可用）
   window.Plan：线性图标（Lucide 风格）、日期工具（?today=YYYY-MM-DD 模拟日期）、截止紧迫度 */
(function(){
  const ICONS = {
    compass:'<circle cx="12" cy="12" r="10"/><path d="M16.2 7.8l-2.1 6.3-6.3 2.1 2.1-6.3z"/>',
    book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    file:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
    alert:'<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    check:'<circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/>',
    flag:'<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>',
    bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    reset:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>',
    target:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    locate:'<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/>',
    fold:'<path d="M4 6h16M4 12h10M4 18h6"/>',
    print:'<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    work:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>',
    nocalc:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M2 2l20 20"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    map:'<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    list:'<path d="M11 6h10M11 12h10M11 18h10"/><path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>',
    x:'<path d="M18 6 6 18M6 6l12 12"/>',
    left:'<path d="m15 18-6-6 6-6"/>',
    right:'<path d="m9 18 6-6-6-6"/>',
    arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
    play:'<path d="M7 4.5v15l12-7.5z"/>',
    pause:'<rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/>',
    stop:'<rect x="5" y="5" width="14" height="14" rx="2"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    pen:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    spark:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17v4M17 19h4"/>',
    ext:'<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    monitor:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    keys:'<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    volume:'<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
    undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    cards:'<rect x="3" y="7" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/>',
    flame:'<path d="M12 22c4 0 7-2.7 7-7 0-3.5-2.2-6-4-8 .2 2.3-.8 3.7-2 4.3C13 8 11.5 5 9 2c.3 3.3-4 6.3-4 11.5C5 18.5 8 22 12 22z"/>',
    sigma:'<path d="M18 7V4H6l6 8-6 8h12v-3"/>',
    layers:'<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 12 10 5 10-5M2 17l10 5 10-5"/>',
    note:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    grad:'<path d="M22 10 12 5 2 10l10 5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>'
  };

  function injectSprite(){
    if(document.getElementById('plan-icons')) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.id = 'plan-icons'; svg.setAttribute('aria-hidden','true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    svg.innerHTML =
      '<defs><linearGradient id="g-accent" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs>' +
      Object.entries(ICONS).map(([k,v])=>`<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('');
    document.body.prepend(svg);
  }
  const icon = name => `<svg class="ic" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  function hydrateIcons(root){
    (root||document).querySelectorAll('i[data-ic]').forEach(el=>{ el.outerHTML = icon(el.dataset.ic); });
  }

  const parse = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
  const simDate = (()=>{
    const q = new URLSearchParams(location.search).get('today');
    return q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : null;
  })();
  function today(){
    if(simDate) return parse(simDate);
    const d = new Date(); d.setHours(0,0,0,0); return d;
  }
  const days = (a,b) => Math.round((b - a) / 864e5);
  const pad = n => String(n).padStart(2,'0');
  const md = d => `${pad(d.getMonth()+1)}/${pad(d.getDate())}`;
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const W1 = parse('2026-09-28');
  const weekNo = d => Math.floor(days(W1, d) / 7) + 1;
  const EXAM = parse('2027-12-18');

  /* 截止日紧急度：done / over / soon(≤14 天) / later */
  function urgency(due, done){
    if(done) return 'done';
    if(!due) return 'later';
    const left = days(today(), parse(due));
    return left < 0 ? 'over' : left <= 14 ? 'soon' : 'later';
  }

  window.Plan = { icon, hydrateIcons, parse, today, simDate, days, pad, md, ymd, weekNo, W1, EXAM, urgency };

  injectSprite();
  hydrateIcons();
})();
