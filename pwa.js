/* Connectivity is separate from workout persistence in app.js. */
(function(){
  'use strict';
  const status=document.getElementById('offlineStatus');
  const updateButton=document.getElementById('installUpdate');
  const VERSION='0.4.2';
  let registration,ready=false,reloading=false,checkId=0;
  function show(message,kind='pending'){
    status.textContent=message;status.dataset.state=kind;
  }
  function networkStatus(){
    if(ready)show(navigator.onLine?'Bereit für Offline-Start':'Offline · Training verfügbar','ready');
    else show(navigator.onLine?'Offline-Start wird vorbereitet …':'Offline-Start noch nicht bestätigt','pending');
  }
  async function verify(){
    const id=++checkId;
    waiting();
    ready=false;
    if(!navigator.serviceWorker.controller){networkStatus();return;}
    try{
      const result=await new Promise((resolve,reject)=>{
        const channel=new MessageChannel();
        const timeout=setTimeout(()=>{channel.port1.close();reject(Error('timeout'));},7000);
        channel.port1.onmessage=event=>{clearTimeout(timeout);channel.port1.close();resolve(event.data);};
        navigator.serviceWorker.controller.postMessage({type:'CHECK_OFFLINE_READY'},[channel.port2]);
      });
      if(id!==checkId)return;
      ready=result.type==='OFFLINE_READY'&&result.ready===true&&result.version===VERSION;
      if(ready)networkStatus();else show('Offline-Start nicht bereit · bitte online neu laden','error');
    }catch{if(id===checkId)show('Offline-Start nicht bestätigt · bitte online neu laden','error');}
  }
  function waiting(){updateButton.hidden=!registration?.waiting;}
  if(!('serviceWorker' in navigator)||!window.isSecureContext){
    show('Offline-Start: bitte die veröffentlichte HTTPS-App öffnen','unavailable');return;
  }
  window.addEventListener('online',()=>{verify();registration?.update().catch(()=>{});});
  window.addEventListener('offline',verify);
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(reloading)location.reload();else verify();
  });
  updateButton.addEventListener('click',()=>{
    if(!registration?.waiting)return;
    if(!confirm('Neue App-Version laden? Deine lokal gespeicherte Einheit bleibt erhalten.'))return;
    reloading=true;updateButton.disabled=true;
    registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
  });
  (async()=>{
    try{
      registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
      waiting();registration.addEventListener('updatefound',()=>{
        const worker=registration.installing;
        worker?.addEventListener('statechange',()=>{if(worker.state==='installed'||worker.state==='activated')waiting();if(worker.state==='redundant'&&!ready)show('Offline-Vorbereitung fehlgeschlagen · bitte online neu laden','error');});
      });
      await navigator.serviceWorker.ready;
      await verify();
    }catch{show('Offline-Vorbereitung fehlgeschlagen · bitte online neu laden','error');}
  })();
})();
