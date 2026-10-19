// Visite sécurité - v1.4.0
const CACHE='visite-securite-v6';
const APP_FILES=[
  './','./index.html','./manifest.webmanifest',
  './icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png','./favicon.png'
];
const FONT_CSS='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
const CDN_FILES=[
  'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js'
];
// Seuls ces hôtes sont mis en cache (jamais l'API Supabase : données toujours fraîches)
const CACHEABLE_HOSTS=['cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com'];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(APP_FILES);
    await Promise.allSettled(CDN_FILES.map(u=>cache.add(u)));
    // Polices : CSS + fichiers de police référencés, pour un rendu identique hors ligne
    try{
      const res=await fetch(FONT_CSS);
      if(res.ok){
        await cache.put(FONT_CSS,res.clone());
        const css=await res.text();
        const urls=[...css.matchAll(/url\((https:[^)]+)\)/g)].map(m=>m[1]);
        await Promise.allSettled(urls.map(u=>cache.add(u)));
      }
    }catch(e){}
    self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

function fetchTimeout(req,ms){
  return new Promise((resolve,reject)=>{
    const t=setTimeout(()=>reject(new Error('timeout')),ms);
    fetch(req).then(r=>{clearTimeout(t);resolve(r);},e=>{clearTimeout(t);reject(e);});
  });
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  const sameOrigin=url.origin===self.location.origin;
  if(!sameOrigin && !CACHEABLE_HOSTS.includes(url.hostname)) return;

  // Ouverture de l'appli : réseau d'abord (4 s max), sinon page en cache -> démarre hors ligne
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try{
        const net=await fetchTimeout(req,4000);
        if(net&&net.ok&&net.type==='basic') cache.put('./index.html',net.clone());
        return net;
      }catch(e){
        return (await cache.match('./index.html'))||(await cache.match('./'))||Response.error();
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(req,{ignoreSearch:true});
    const refresh=fetch(req).then(net=>{
      if(net&&(net.status===200||net.type==='opaque')) cache.put(req,net.clone());
      return net;
    });
    if(cached){
      // Fichiers de l'appli : on renouvelle en arrière-plan ; bibliothèques versionnées : cache direct
      if(sameOrigin) event.waitUntil(refresh.catch(()=>{}));
      return cached;
    }
    return refresh;
  })());
});
