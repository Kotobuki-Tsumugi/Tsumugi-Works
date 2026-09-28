/* 首屏前应用个人设置（主题 / 动效），避免闪烁。window.Settings */
(function(){
  const KEY = 'ncepu-ee-settings-v1';
  const DEF = {theme:'auto', motion:'auto', view:'today', hover:true};
  let s = Object.assign({}, DEF);
  try{ Object.assign(s, JSON.parse(localStorage.getItem(KEY)) || {}); }catch(e){}
  const mqDark = matchMedia('(prefers-color-scheme:dark)'), mqMotion = matchMedia('(prefers-reduced-motion:reduce)');
  const root = document.documentElement, subs = [];

  function apply(){
    const theme = s.theme === 'auto' ? (mqDark.matches ? 'dark' : 'light') : s.theme;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    root.dataset.motion = s.motion === 'reduce' || (s.motion === 'auto' && mqMotion.matches) ? 'reduce' : 'full';
    const m = document.querySelector('meta[name=theme-color]');
    if(m) m.content = theme === 'dark' ? '#0b0f1a' : '#eef1f8';
  }
  function set(k, v){
    s[k] = v;
    try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch(e){}
    apply(); subs.forEach(f=>f(k));
  }
  mqDark.addEventListener('change', ()=>{ if(s.theme === 'auto'){ apply(); subs.forEach(f=>f('theme')); } });
  mqMotion.addEventListener('change', ()=>{ if(s.motion === 'auto'){ apply(); subs.forEach(f=>f('motion')); } });
  apply();

  window.Settings = {
    KEY, DEF, set,
    get: k=>s[k],
    get reduce(){ return root.dataset.motion === 'reduce'; },
    subscribe: f=>subs.push(f)
  };
})();
