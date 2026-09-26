/* Cloud sync never runs until the signed-in user explicitly binds this device. */
(function(){
 'use strict';
 const bridge=window.KraftCloudBridge,S=window.KraftSync,config=window.KraftCloudConfig;
 if(!bridge||!config||!window.KraftCloudClient)return;
 const client=window.KraftCloudClient(config.url,config.key,{auth:{storageKey:'krafttraining-auth',detectSessionInUrl:false}});
 let user=null,status='Nicht angemeldet',busy=false,timer,issue=null;
 const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const transport={
  async read(uid){const {data,error}=await client.from('training_sync').select('revision,payload,updated_at').eq('user_id',uid).maybeSingle();if(error)throw error;return data;},
  async write(uid,revision,payload){const {data,error}=await client.rpc('sync_training',{expected_revision:revision,new_payload:payload});if(error)throw error;return data?.[0];}
 };
 const engine=window.KraftSyncEngine.create({readLocal:bridge.read,readMeta:bridge.meta,commit:bridge.commit,validate:bridge.validate,blocked:bridge.blocked,transport});
 function show(message){status=message;const node=document.getElementById('cloudStatus');if(node)node.textContent=message;bridge.refresh();}
 function bound(){return user&&bridge.meta()?.userId===user.id;}
 function panel(){
  return `<section class="card planning-card"><div class="eyebrow">ZWISCHEN DEINEN GERÄTEN</div><h2>Synchronisierung</h2><p id="cloudStatus" role="status">${safe(status)}</p>${user?`<p class="muted">${safe(user.email)}</p>${bound()?'<button class="btn primary" data-cloud="sync">Jetzt abgleichen</button>':'<button class="btn primary" data-cloud="setup">Dieses Gerät verbinden</button>'}${issue?'<button class="btn secondary" data-cloud="review">Datenstände vergleichen</button>':''}<button class="btn secondary" data-cloud="logout">Abmelden</button>`:`<form id="cloudLogin"><label>E-Mail<input name="email" type="email" autocomplete="username" required></label><label>App-Passwort<input name="password" type="password" autocomplete="current-password" required></label><button type="submit" class="btn primary">Anmelden</button></form><p class="footnote">Dein persönliches App-Konto, nicht das Datenbankpasswort. Die Anmeldung allein überträgt noch keine Trainingsdaten.</p>`}<p class="footnote">Offline bleibt alles lokal gespeichert. Nach Abschluss einer Einheit wird bei bestehender Verbindung abgeglichen. Bei Konflikten entscheidest du. Backups bleiben empfehlenswert.</p></section>`;
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(()=>sync(),1500);}
 async function lock(work){if(!navigator.locks){show('Für sicheren Abgleich bitte einen aktuellen Browser verwenden.');return;}return navigator.locks.request('krafttraining-cloud',{ifAvailable:true},async lock=>{if(!lock){show('Abgleich läuft in einem anderen Fenster.');return;}return work();});}
 async function sync(){
  if(busy||!bound()||issue)return;
  if(!navigator.onLine)return show('Offline · Änderungen warten auf Verbindung');
  if(bridge.blocked())return show('Lokal gespeichert · Abgleich nach Training oder Bearbeitung');
  await lock(async()=>{busy=true;show('Abgleich läuft …');try{
   const result=await engine.run(user?.id);
   if(result.status==='conflict'){issue=result;show('Unterschiedliche Änderungen · bitte vergleichen');}
   else if(result.status==='synced')show('Synchronisiert · '+new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}));
   else if(result.status==='pending'||result.status==='retry'||result.status==='deferred'){show('Änderungen warten auf Abgleich');schedule();}
   else if(result.status==='cloud-missing'){issue={status:'missing'};show('Cloud-Daten fehlen · Erstabgleich prüfen');}
   else show('Abgleich nicht abgeschlossen · lokale Daten bleiben erhalten');
  }catch{show('Keine Verbindung · später erneut versuchen');}finally{busy=false;}});
 }
 function summary(data){return `${data.trainingDays.length} Trainingstage · ${data.history.length} Trainings · ${(data.blocks||[]).length} Blöcke`;}
 function modal(title,body){const dialog=document.getElementById('dialog');dialog.innerHTML=`<div class="dialog-head"><h2 id="dialogTitle">${title}</h2><button class="btn icon" data-cloud="close" aria-label="Schließen">×</button></div>${body}`;dialog.showModal();}
 async function setup(){
  if(busy||!user)return;
  if(bridge.blocked())return show('Bitte Training oder Planbearbeitung erst abschließen.');
  busy=true;
  try{const local=bridge.read(),remote=await transport.read(user.id);const cloud=remote?bridge.validate(remote.payload):null;issue={status:'setup',local,cloud,revision:remote?.revision||0,userId:user.id};
   modal('Ersten Datenabgleich auswählen',`<p>Dieses Gerät: ${summary(local)}</p><p>Cloud: ${cloud?summary(cloud):'Noch keine Trainingsdaten'}</p><p class="muted">Am besten verbindest du zuerst das iPhone mit deinem aktuellen Trainingsstand. Auf dem Mac kannst du anschließend diesen Cloud-Stand übernehmen. Ein Backup des bisherigen lokalen Stands wird vor jeder Auswahl heruntergeladen.</p>${!cloud?'<button class="btn primary full" data-cloud="use-local">Diesen Stand erstmals in die Cloud sichern</button>':'<button class="btn primary full" data-cloud="use-cloud">Cloud-Stand auf dieses Gerät übernehmen</button><p class="footnote">Ersetzt die lokalen Pläne und Trainings nach deiner Bestätigung.</p>'}<button class="btn secondary full" data-cloud="close">Später entscheiden</button>`);
  }catch{show('Cloud nicht erreichbar · lokale Daten unverändert');}finally{busy=false;}
 }
 function review(){
  if(issue?.status==='setup')return setup();
  if(issue?.status==='missing'){issue=null;return setup();}
  if(issue?.status!=='conflict')return;
  const labels={trainingDays:'Trainingstage',history:'Trainings',blocks:'Blöcke',exerciseLibrary:'Übungen',activeSession:'Laufende Einheit',nextBlock:'Nächster Block'};
  modal('Änderungen vergleichen',`<p>Dieses Gerät: ${summary(issue.local)}</p><p>Cloud: ${summary(issue.cloud)}</p><p>Betroffen: ${safe(issue.paths.map(p=>labels[p.split('.')[0]]||p).join(', '))}</p><p class="muted">Änderungen an anderen Einträgen bleiben auf beiden Seiten erhalten. Bei den widersprüchlichen Einträgen wählst du einen Stand. Beide vollständigen Stände kannst du vorher sichern.</p><button class="btn secondary full" data-cloud="backup-both">Beide Datenstände exportieren</button><button class="btn primary full" data-cloud="resolve-local">Bei Konflikten dieses Gerät verwenden</button><button class="btn secondary full" data-cloud="resolve-cloud">Bei Konflikten Cloud verwenden</button>`);
 }
 function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
 async function choose(action){
  if(busy||!issue||!user)return;const captured=issue,uid=user.id;
  if(!S.equal(bridge.read(),captured.local))return show('Lokale Daten haben sich geändert. Bitte Auswahl schließen und neu abgleichen.');
  if(!confirm('Ausgewählten Datenstand übernehmen? Dein bisheriger lokaler Stand wird vorher als Backup heruntergeladen.'))return;
  document.getElementById('dialog').close();
  await lock(async()=>{busy=true;try{
   bridge.backup();
   const current=await transport.read(uid);
   if((current?.revision||0)!==captured.revision||user?.id!==uid)throw Error('changed');
   if(bridge.blocked()||!S.equal(bridge.read(),captured.local))throw Error('changed');
   let value,ack;
   if(action==='use-cloud'){value=bridge.validate(current.payload);ack=current;}
   else{
    if(action==='use-local'){if(current)throw Error('cloud-not-empty');value=captured.local;}
    else{download(captured.cloud,'krafttraining-cloud-vor-abgleich');const meta=bridge.meta();if(!meta||meta.userId!==uid)throw Error('account');const m=action==='resolve-local'?S.merge(meta.base,captured.local,captured.cloud):S.merge(meta.base,captured.cloud,captured.local);value=bridge.validate(m.data);}
    ack=await transport.write(uid,captured.revision,value);
    if(!ack||ack.revision!==captured.revision+1||!S.equal(ack.payload,value))throw Error('ack');
   }
   if(user?.id!==uid||bridge.blocked()||!S.equal(bridge.read(),captured.local))throw Error('changed');
   bridge.commit(value,{userId:uid,base:value,revision:ack.revision});issue=null;show('Synchronisiert · dieses Gerät ist verbunden');
  }catch{issue=null;show('Abgleich nicht übernommen. Datenstände bitte erneut prüfen.');}finally{busy=false;}});
 }
 document.addEventListener('submit',async event=>{
  if(event.target.id!=='cloudLogin')return;event.preventDefault();if(busy)return;busy=true;const f=new FormData(event.target);const email=String(f.get('email')),password=String(f.get('password'));event.target.reset();
  try{const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;user=data.user;show(bound()?'Angemeldet · Abgleich vorbereitet':'Angemeldet · Erstabgleich auswählen');if(bound())schedule();}catch{show('Anmeldung fehlgeschlagen. E-Mail und App-Passwort prüfen.');}finally{busy=false;}
 });
 document.addEventListener('click',async event=>{
  const action=event.target.closest('[data-cloud]')?.dataset.cloud;if(!action)return;
  if(action==='close'){document.getElementById('dialog').close();if(issue?.status==='setup')issue=null;return;}
  if(action==='sync'){issue=null;return sync();}
  if(action==='setup')return setup();if(action==='review')return review();
  if(action==='backup-both'&&issue?.cloud){download(issue.local,'krafttraining-geraet');download(issue.cloud,'krafttraining-cloud');return;}
  if(['use-local','use-cloud','resolve-local','resolve-cloud'].includes(action))return choose(action);
  if(action==='logout'&&!busy){if(!confirm('Abmelden? Lokale Trainingsdaten bleiben auf diesem Gerät. Nicht abgeglichene Änderungen bleiben lokal.'))return;await client.auth.signOut({scope:'local'});user=null;issue=null;show('Abgemeldet · Daten bleiben auf diesem Gerät');}
 });
 client.auth.onAuthStateChange((event,session)=>{user=session?.user||null;if(!user)issue=null;setTimeout(()=>{show(user?(bound()?'Angemeldet · bereit zum Abgleich':'Angemeldet · Erstabgleich auswählen'):'Nicht angemeldet');if(bound())schedule();},0);});
 window.addEventListener('kraft-saved',()=>{if(!busy)schedule();});window.addEventListener('online',schedule);window.addEventListener('offline',()=>show('Offline · lokal gespeichert'));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});setInterval(()=>{if(!document.hidden)sync();},30000);
 window.KraftCloudUI={panel};bridge.refresh();
})();
