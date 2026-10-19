const CACHE='visite-securite-v4';
const APP_FILES=['./','./index-2.html','./manifest.webmanifest'];
const CDN_FILES=[
'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js'
];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(APP_FILES);
    await Promise.allSettled(CDN_FILES.map(url=>cache.add(url)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  event.respondWith((async()=>{
    const cached=await caches.match(req,{ignoreSearch:true});
    if(cached) return cached;
    try{
      const reseau=await fetch(req);
      if(reseau && reseau.status===200 && (req.url.startsWith(self.location.origin)||req.url.startsWith('https://cdn.jsdelivr.net'))){
        const cache=await caches.open(CACHE);
        cache.put(req,reseau.clone());
      }
      return reseau;
    }catch(e){
      if(req.destination==='document'){
        const page=await caches.match('./index-2.html');
        if(page) return page;
      }
      throw e;
    }
  })());
});
