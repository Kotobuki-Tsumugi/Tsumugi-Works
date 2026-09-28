/* 离线缓存（仅 http/https 下由 extras.js 注册）：预缓存外壳，之后 stale-while-revalidate。修改资源后递增 VERSION */
const VERSION = 'ncepu-ee-v3';
const SHELL = [
  '华电电气考研备考计划.html', '学习路径-双周细化.html', 'manifest.webmanifest',
  'assets/boot.js', 'assets/app.css', 'assets/views.css', 'assets/common.js', 'assets/data.js',
  'assets/store.js', 'assets/views.js', 'assets/app.js', 'assets/extras.js', 'assets/icon.svg',
  'assets/vocab.js', 'assets/vocab-data.js', 'assets/learn.css', 'assets/learn.js',
  'assets/deck-math2.js', 'assets/deck-ee831.js'
];  // math2-papers.js、katex/、math2-img/ 首次打开时按需加载并进入运行时缓存

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k !== VERSION).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e=>{
  const req = e.request, url = new URL(req.url);
  if(req.method !== 'GET' || url.origin !== location.origin || req.headers.has('range')) return;
  const key = url.origin + url.pathname;
  e.respondWith(caches.open(VERSION).then(async c=>{
    const hit = await c.match(key);
    const net = fetch(req).then(res=>{
      if(res.ok && res.status === 200) c.put(key, res.clone()).catch(()=>{});
      return res;
    });
    if(hit){ net.catch(()=>{}); return hit; }
    return net.catch(async ()=>(req.mode === 'navigate' && await c.match(new URL('华电电气考研备考计划.html', location).href)) || Response.error());
  }));
});
