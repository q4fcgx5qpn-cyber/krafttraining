/* Offline app shell. All paths are relative to this worker's directory,
   including when GitHub Pages serves the app below /repository-name/. */
'use strict';
const VERSION='0.5.0';
const BASE=new URL('./',self.location.href);
const PREFIX='krafttraining-shell-'+encodeURIComponent(BASE.pathname)+'-';
const CACHE=PREFIX+VERSION+'-r3';
const PATHS=[
  'index.html','styles.css?v='+VERSION,'seed.js?v='+VERSION,
  'core.js?v='+VERSION,'app.js?v='+VERSION,'pwa.js?v='+VERSION,
  'manifest.json','icon.svg','icon-192.png','icon-512.png','apple-touch-icon.png'
];
const URLS=PATHS.map(path=>new URL(path,BASE).href);
const INDEX=new URL('index.html',BASE).href;
self.addEventListener('install',event=>{
  // addAll rejects the installation if any asset is unavailable. An older
  // installed version remains usable; never force activation during a workout.
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(URLS.map(url=>new Request(url,{cache:'reload'})))));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    await self.clients.claim();
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==BASE.origin)return;
  const entry=url.pathname===BASE.pathname||url.pathname===new URL('index.html',BASE).pathname;
  if(request.mode==='navigate'&&entry){
    // A release always uses its cached index and matching versioned assets.
    // Search parameters and the home-screen start_url work offline as well.
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      return await cache.match(INDEX)||fetch(request);
    })());
  }else if(URLS.includes(url.href)){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE),cached=await cache.match(request);
      if(cached)return cached;
      const response=await fetch(request);
      if(response.ok)await cache.put(request,response.clone());
      return response;
    })());
  }
  // No arbitrary files, backups, API requests or external resources are cached.
});
self.addEventListener('message',event=>{
  if(event.data?.type==='ACTIVATE_UPDATE'){
    event.waitUntil(self.skipWaiting());
  }else if(event.data?.type==='CHECK_OFFLINE_READY'){
    event.waitUntil((async()=>{
      try{
        const cache=await caches.open(CACHE);
        const complete=(await Promise.all(URLS.map(url=>cache.match(url)))).every(Boolean);
        event.ports[0]?.postMessage({type:'OFFLINE_READY',ready:complete,version:VERSION});
      }catch{event.ports[0]?.postMessage({type:'OFFLINE_READY',ready:false,version:VERSION});}
    })());
  }
});
