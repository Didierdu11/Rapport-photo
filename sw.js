const CACHE='visite-securite-v5';
const APP_FILES=['./','./index-2.html','./manifest.webmanifest'];
const CDN_FILES=[
'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(APP_FILES);
    await Promise.allSettled(CDN_FILES.map(u=>cache.add(u)));
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

  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const net=await fetch(req);
        const cache=await caches.open(CACHE);
        cache.put('./index-2.html',net.clone());
        return net;
      }catch(e){
        const page=await caches.match('./index-2.html');
        if(page) return page;
        throw e;
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(req,{ignoreSearch:true});
    if(cached) return cached;
    try{
      const net=await fetch(req);
      if(net&&net.status===200){
        const cache=await caches.open(CACHE);
        cache.put(req,net.clone());
      }
      return net;
    }catch(e){throw e;}
  })());
});
