'use strict';
const K=window.Kraft, KEY='krafttraining_v4';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
let loadError='', db=load(), editor=null, toastTimer, focusBeforeDialog;
function load(){
  try {
    for(const key of [KEY,'krafttraining_v3','krafttraining_v2','krafttraining_v02']){
      const raw=localStorage.getItem(key);if(!raw)continue;
      let data=JSON.parse(raw);
      if(key==='krafttraining_v2'||key==='krafttraining_v02'){
        const draft=localStorage.getItem(key+'_draft');if(draft)data.activeSession=JSON.parse(draft);
      }
      return K.applyPlanUpdate(K.normalize(data),KraftPlanAdditions);
    }
  }catch(e){loadError='Gespeicherte Daten konnten nicht geladen werden. Sie bleiben unverändert. Bitte ein gültiges Backup importieren. '+e.message;}
  return K.applyPlanUpdate(K.normalize(KraftSeed),KraftPlanAdditions);
}
let writeBlocked=!!loadError, storageOkay=!loadError;
let lastStored=localStorage.getItem(KEY);
function save(){
  if(writeBlocked){warning(loadError);return false;}
  try{if(localStorage.getItem(KEY)!==lastStored){warning('Ein anderes Fenster hat Daten geändert. Bitte diese Seite neu laden; ungesicherte Eingaben vorher als Backup exportieren.');return false;}const raw=JSON.stringify(db);localStorage.setItem(KEY,raw);lastStored=raw;warning('');window.dispatchEvent(new Event('kraft-saved'));return true;}
  catch(e){warning('Speichern nicht möglich. Bitte jetzt ein JSON-Backup exportieren, bevor du die App schließt.');return false;}
}
function warning(message){storageOkay=!message;const n=$('#storageWarning');n.hidden=!message;n.textContent=message;const saved=$('.saved');if(saved)saved.textContent=message?'● Nicht dauerhaft gespeichert':'● Automatisch gespeichert';}
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4500);}
function go(route){if(location.hash==='#'+route)render();else location.hash=route;}
function route(){const [page='home',id='']=location.hash.slice(1).split('/');return {page,id:decodeURIComponent(id)};}
function button(action,text,cls='secondary',attrs=''){return `<button class="btn ${cls}" data-a="${action}" ${attrs}>${text}</button>`;}
function date(value,full=false){const d=new Date(value);return Number.isNaN(d.getTime())?'Datum unbekannt':d.toLocaleDateString('de-DE',{day:'2-digit',month:'short',...(full?{year:'numeric'}:{})});}
function count(exercises){return exercises.reduce((s,e)=>s+(e.values?e.values.length:e.sets),0);}
function done(s){return s.exercises.reduce((n,x)=>n+x.values.filter(v=>v.done).length,0);}
function head(kicker,title,desc='',action=''){return `<div class="page-head"><div><div class="eyebrow">${kicker}</div><h1>${esc(title)}</h1>${desc?`<p class="muted">${desc}</p>`:''}</div>${action}</div>`;}
function empty(title,description,action=''){return `<div class="card empty"><span class="empty-icon">＋</span><h2>${title}</h2><p class="muted">${description}</p>${action}</div>`;}
function back(href,label='Zurück'){return `<a class="back" href="#${href}">← ${label}</a>`;}
function resumeCard(){const s=db.activeSession;return s?`<section class="resume"><div><span class="eyebrow">DEIN TRAINING LÄUFT</span><h2>${esc(s.dayName)}</h2><span>${done(s)} von ${count(s.exercises)} Sätzen erledigt</span></div><a href="#session" class="btn primary">Fortsetzen →</a></section>`:'';}
function home(){
  const last=[...db.history].sort((a,b)=>new Date(b.finishedAt)-new Date(a.finishedAt))[0];
  return head('BEREIT FÜR DEN NÄCHSTEN SATZ?','Dein Training','Wähle einen Tag. Schau dir den Plan an. Leg los.')+resumeCard()+planningCard()+
  `<div class="section-title"><h2>Dein Trainingsplan</h2><a class="text-link" href="#edit/new">+ Trainingstag</a></div><div class="day-grid">`+
  db.trainingDays.map((d,i)=>`<a href="#day/${encodeURIComponent(d.id)}" class="card day-card"><div class="day-top"><span class="eyebrow">TRAINING ${String(i+1).padStart(2,'0')}</span><span class="arrow">↗</span></div><h2>${esc(d.name)}</h2><p class="muted">${d.exercises.length} Übungen <span class="dot">·</span> ${count(d.exercises)} Sätze</p><div class="day-foot"><div class="mini-tags">${K.groups(d.exercises).filter(g=>g.sup).map(g=>`<span class="pill">${g.letter} · Supersatz</span>`).join('')||'<span class="pill">Einzelübungen</span>'}</div><span class="text-link">Ansehen →</span></div></a>`).join('')+`</div>`+
  (!db.trainingDays.length?empty('Dein Plan beginnt hier','Lege deinen ersten Trainingstag an.',`<a href="#edit/new" class="btn primary">Trainingstag anlegen</a>`):'')+
  `<div class="home-bottom"><div class="card stat"><span class="eyebrow">DRANGEBLIEBEN</span><strong>${db.history.length}<small>gespeicherte Trainings</small></strong></div><div class="card recent"><span class="eyebrow">ZULETZT TRAINIERT</span>${last?`<h3>${esc(last.dayName)}</h3><p class="muted">${date(last.finishedAt,true)} · ${done(last)} Sätze</p><a href="#history/${encodeURIComponent(last.id)}" class="text-link">Training ansehen →</a>`:'<h3>Dein nächster Schritt zählt.</h3><p class="muted">Nach deinem ersten Training findest du hier deine letzte Einheit.</p>'}</div></div><p class="footnote">Deine Daten werden lokal gespeichert. Optionaler Cloud-Abgleich und Backups unter Verwalten.</p>`;
}
function overview(d){
  return back('home','Trainingsplan')+head('DEIN PLAN FÜR HEUTE',d.name,`${d.exercises.length} Übungen · ${count(d.exercises)} Sätze`,button('editday','Bearbeiten','secondary',`data-id="${esc(d.id)}"`))+
    `<div class="overview-layout"><div>${K.groups(d.exercises).map((g,i)=>`<section class="card group ${g.sup?'superset':''}">${g.sup?`<div class="group-label"><span>SUPERSATZ ${g.letter}</span><small>Im Wechsel trainieren</small></div>`:''}${g.items.map(x=>`<div class="exercise-row"><span class="badge ${g.sup?'accent':''}">${x.label||i+1}</span><div class="grow"><strong>${esc(x.name)}</strong><p class="muted">${esc(x.setsRange||x.sets)} × ${esc(x.reps)}${x.unit==='seconds'?' · Sekunden':''}</p></div><span class="rest-label">${x.rest} s<br><small>Pause</small></span></div>`).join('')}${g.sup?'<p class="group-hint">Pause nach der Runde · Wechsel nach jedem bestätigten Satz</p>':''}</section>`).join('')||empty('Noch keine Übungen','Ergänze Übungen über „Bearbeiten“.')}</div><aside class="card start-panel"><div class="eyebrow">ALLES BEREIT?</div><h2>Ein Satz nach dem anderen.</h2><p class="muted">Deine letzten Werte stehen direkt bei der Eingabe. Jeder Eintrag wird automatisch gespeichert.</p>${button('start',db.activeSession?'Laufendes Training fortsetzen →':'Training starten →','primary full',`data-id="${esc(d.id)}" ${!d.exercises.length&&!db.activeSession?'disabled':''}`)}<p class="footnote">${db.activeSession?'Es ist bereits eine Einheit offen.':'Änderungen während des Trainings gelten nur für diese Einheit.'}</p></aside></div>`;
}
function session(){
  const s=db.activeSession;if(!s)return empty('Kein Training aktiv','Wähle einen Trainingstag.',`<a href="#home" class="btn primary">Zum Trainingsplan</a>`);
  s.index=Math.max(0,Math.min(s.index,s.exercises.length-1));const x=s.exercises[s.index], total=count(s.exercises);
  const groups=K.groups(s.exercises), partners=x?.groupId?s.exercises.filter(e=>e.groupId===x.groupId):[];
  const previous=x?K.previous(db,x):null;
  return `<div class="session-top">${back('home','Später fortsetzen')}<span class="saved">${storageOkay?'● Automatisch gespeichert':'● Nicht dauerhaft gespeichert'}</span></div>`+
  head('AKTIVES TRAINING',s.dayName,`<span id="progressText">${done(s)} / ${total} Sätze</span> · ${date(s.startedAt)}`)+
  `<div class="progress" role="progressbar" aria-label="Erledigte Sätze" aria-valuenow="${done(s)}" aria-valuemax="${total}"><div style="width:${total?done(s)/total*100:0}%"></div></div><div class="workout-layout"><aside class="workout-outline card"><div class="section-title"><h2>Deine Einheit</h2><span class="muted">${s.exercises.length} Übungen</span></div>${groups.map(g=>`<div class="outline-group ${g.sup?'linked':''}">${g.items.map(e=>button('jump',`<span class="badge">${e.label||s.exercises.indexOf(e)+1}</span><span class="grow">${esc(e.name)}<small>${e.values.filter(v=>v.done).length}/${e.values.length} Sätze</small></span>`,'outline-item '+(e===x?'selected':''),`data-index="${s.exercises.indexOf(e)}" aria-current="${e===x?'step':'false'}"`)).join('')}</div>`).join('')}</aside><div class="workout-main">`+
  (x?`${partners.length>1?`<div class="partner-tabs" aria-label="Supersatzpartner">${partners.map(e=>button('jump',`<span class="pill">${e.label}</span><span>${esc(e.name)}</span>`,'partner '+(e===x?'selected':''),`data-index="${s.exercises.indexOf(e)}" aria-pressed="${e===x}"`)).join('')}</div>`:''}<section class="card exercise-card"><div class="exercise-heading"><div><span class="eyebrow">ÜBUNG ${s.index+1} VON ${s.exercises.length}${x.label?' · SUPERSATZ '+x.label:''}</span><h2>${esc(x.name)}</h2><p class="muted">Ziel: ${esc(x.setsRange||x.sets)} × ${esc(x.reps)} · ${x.rest} s Pause${partners.length>1?' nach der Runde':''}</p></div>${button('remove-run','×','icon danger-ghost','aria-label="Übung aus dieser Einheit entfernen"')}</div>
  <div class="last-performance">↶ <span>${previous?`Letzte Leistung${previous.date?' · '+date(previous.date):' · aus Backup'}<strong>${previous.values.map(v=>`${esc(v.weight)||'–'} kg × ${esc(v.reps)||'–'}`).join(' / ')}</strong>`:'Noch keine Vorwerte. Dein erster Eintrag ist der Anfang.'}</span></div>
  <div class="set-row set-labels"><span>SATZ</span><span>KG</span><span>${x.unit==='seconds'?'SEK.':'WDH.'}</span><span>FERTIG</span></div>
  ${x.values.map((v,i)=>`<div class="set-row ${v.done?'completed':''}"><span class="set-number">${String(i+1).padStart(2,'0')}</span><input aria-label="Satz ${i+1} Gewicht in kg" inputmode="decimal" autocomplete="off" data-set="${i}" data-field="weight" value="${esc(v.weight)}" placeholder="–"><input aria-label="Satz ${i+1} ${x.unit==='seconds'?'Sekunden':'Wiederholungen'}" inputmode="${x.unit==='seconds'?'decimal':'numeric'}" autocomplete="off" data-set="${i}" data-field="reps" value="${esc(v.reps)}" placeholder="–"><button class="check ${v.done?'checked':''}" data-a="toggle" data-index="${i}" aria-label="Satz ${i+1} ${v.done?'wieder öffnen':'abschließen'}" aria-pressed="${v.done}">${v.done?'✓':'○'}</button></div>`).join('')}
  ${button('edit-run-group',partners.length>1?'Supersatz bearbeiten':'Supersatz erstellen','secondary full group-button')}<div class="set-actions">${button('add-set','+ Satz','ghost')}${button('remove-set','− Letzten Satz','ghost',x.values.length<=1?'disabled':'')}</div><label class="note-label">Notiz zur Übung<textarea data-note rows="2" placeholder="Wie hat sich die Übung angefühlt?">${esc(x.note)}</textarea></label></section>
  <div id="restTimer" class="rest-timer" ${!s.restUntil?'hidden':''}></div><div class="session-nav">${button('prev','← Zurück','secondary',s.index===0?'disabled':'')}${button('next','Weiter →','secondary',s.index>=s.exercises.length-1?'disabled':'')}</div>`:empty('Platz für deine nächste Übung','Füge eine Übung für diese Einheit hinzu.'))+
  `<div class="session-actions">${button('add-run','+ Übung hinzufügen','secondary')}${button('finish','Training abschließen','primary')}</div><details class="session-more"><summary>Weitere Optionen</summary><p class="muted">Du kannst jederzeit zur Startseite wechseln und später fortsetzen.</p>${button('discard','Einheit verwerfen','danger')}</details></div></div>`;
}
function history(id){
  const h=id?db.history.find(h=>h.id===id):null;
  if(h)return back('history','Historie')+head('DEIN TRAINING',h.dayName,`${date(h.finishedAt,true)} · ${done(h)} bestätigte Sätze`,button('delete-history','Training löschen','danger',`data-id="${esc(h.id)}"`))+
  `<div class="history-grid">${h.exercises.map(x=>`<section class="card"><div class="section-title"><h2>${x.label?`<span class="pill">${x.label}</span> `:''}${esc(x.name)}</h2><span class="muted">${x.values.filter(v=>v.done).length} Sätze</span></div>${x.values.map((v,i)=>`<div class="history-set ${!v.done?'muted':''}"><span>Satz ${i+1}</span><strong>${esc(v.weight)||'–'} kg × ${esc(v.reps)||'–'} ${x.unit==='seconds'?'s':''}</strong><span>${v.done?'✓':'offen'}</span></div>`).join('')}${x.note?`<p class="muted">${esc(x.note)}</p>`:''}</section>`).join('')}</div>`;
  return head('DEIN FORTSCHRITT','Historie',`${db.history.length} gespeicherte Trainings`)+(db.history.length?`<div class="history-list">${[...db.history].sort((a,b)=>new Date(b.finishedAt)-new Date(a.finishedAt)).map(h=>`<section class="card history-row"><div class="date-tile">${esc(date(h.finishedAt))}</div><a href="#history/${encodeURIComponent(h.id)}" class="grow"><h2>${esc(h.dayName)}</h2><p class="muted">${h.exercises.length} Übungen · ${done(h)} Sätze</p></a><a href="#history/${encodeURIComponent(h.id)}" class="btn secondary">Ansehen</a>${button('delete-history','×','icon danger-ghost',`data-id="${esc(h.id)}" aria-label="${esc(h.dayName)} vom ${date(h.finishedAt)} löschen"`)}</section>`).join('')}</div>`:empty('Hier wächst dein Fortschritt','Deine abgeschlossenen Einheiten erscheinen hier.'));
}
function manage(){return (window.KraftCloudUI?window.KraftCloudUI.panel():'')+head('DEIN TRAINING, DEINE REGELN','Verwalten','Passe deinen Plan an und sichere deine Fortschritte.')+
  `<div class="manage-grid"><section><div class="section-title"><h2>Trainingstage</h2><a href="#edit/new" class="text-link">+ Neu</a></div><div class="card">${db.trainingDays.map(d=>`<div class="list-row"><div class="grow"><strong>${esc(d.name)}</strong><p class="muted">${d.exercises.length} Übungen · ${count(d.exercises)} Sätze</p></div><a href="#edit/${encodeURIComponent(d.id)}" class="btn secondary">Bearbeiten</a></div>`).join('')||'<p class="muted">Noch keine Trainingstage.</p>'}</div><div class="section-title"><h2>Backups</h2><span class="pill">JSON</span></div><section class="card"><h3>Dein Fortschritt bleibt bei dir.</h3><p class="muted">Exportiere Pläne, Historie und dein laufendes Training. Backups aus v0.2 und v0.3.1 werden übernommen.</p><div class="backup-buttons">${button('export','Backup exportieren','primary')}<label class="btn secondary file-label">Backup importieren<input id="import" type="file" accept=".json,application/json"></label></div><p class="footnote">Ein Import ersetzt den lokalen Datenstand nach deiner Bestätigung. Danach den Cloud-Abgleich neu verbinden.</p></section></section><section><div class="section-title"><h2>Übungsbibliothek</h2>${button('new-library','+ Übung','ghost')}</div><div class="card">${db.exerciseLibrary.map(x=>`<div class="list-row"><div class="grow"><strong>${esc(x.name)}</strong><p class="muted">${esc(x.setsRange||x.sets)} × ${esc(x.reps)}</p></div>${button('edit-library','Bearbeiten','secondary',`data-id="${esc(x.id)}"`)}</div>`).join('')||'<p class="muted">Noch keine Übungen.</p>'}</div></section></div>`;}
function editPage(id){
  if(!editor||editor.source!==id){const d=db.trainingDays.find(d=>d.id===id);editor={source:id,day:d?K.clone(d):{id:K.uid('day'),name:'',exercises:[]}};}
  const d=editor.day;
  return back('manage','Verwalten')+head('PLAN GESTALTEN',id==='new'?'Neuer Trainingstag':'Trainingstag bearbeiten','Übungen mit demselben Buchstaben bilden einen Supersatz.')+
  `<form id="dayForm"><section class="card"><label>Name des Trainingstags<input name="dayName" data-day-name required maxlength="100" value="${esc(d.name)}" placeholder="z. B. Donnerstag – Lower B"></label></section><div class="editor-list">${d.exercises.map((x,i)=>`<section class="card editor-ex" data-edit-index="${i}"><div class="editor-ex-top"><span class="badge">${i+1}</span><label class="grow"><span class="sr-only">Name der Übung ${i+1}</span><input data-prop="name" required maxlength="100" value="${esc(x.name)}"></label>${button('edit-up','↑','icon',`data-index="${i}" aria-label="Übung nach oben" ${i===0?'disabled':''}`)}${button('edit-down','↓','icon',`data-index="${i}" aria-label="Übung nach unten" ${i===d.exercises.length-1?'disabled':''}`)}${button('edit-remove','×','icon danger-ghost',`data-index="${i}" aria-label="Übung aus Plan entfernen"`)}</div><div class="editor-fields"><label>Sätze<input data-prop="sets" type="number" min="1" max="100" required value="${x.sets}"></label><label>Ziel<input data-prop="reps" maxlength="60" value="${esc(x.reps)}" placeholder="8–12"></label><label>Pause (s)<input data-prop="rest" type="number" min="0" max="3600" required value="${x.rest}"></label><label>Erfassung<select data-prop="unit"><option value="reps" ${x.unit!=='seconds'?'selected':''}>Wdh.</option><option value="seconds" ${x.unit==='seconds'?'selected':''}>Sekunden</option></select></label><label>Supersatz<select data-prop="groupId"><option value="">Einzeln</option>${Array.from({length:26},(_,j)=>String.fromCharCode(65+j)).map(letter=>`<option value="${letter}" ${x.groupId===letter?'selected':''}>${letter}</option>`).join('')}</select></label></div></section>`).join('')}</div><div class="editor-toolbar">${button('edit-add','+ Aus Bibliothek','secondary')}${button('edit-new','+ Neue Übung','secondary')}<button type="submit" class="btn primary">Plan speichern</button></div><p class="footnote">Gleiche Supersatz-Buchstaben werden beim Speichern zusammengefasst. Ein einzelner Buchstabe ohne Partner wird zur Einzelübung.</p></form>${id!=='new'?button('delete-day','Trainingstag löschen','danger',`data-id="${esc(d.id)}"`):''}`;
}
function render(){
  const r=route();if(r.page!=='edit')editor=null;
  let html;
  if(r.page==='day'){const d=db.trainingDays.find(d=>d.id===r.id);html=d?overview(d):home();}
  else if(r.page==='calendar')html=calendar();
  else if(r.page==='session')html=session();
  else if(r.page==='history')html=history(r.id);
  else if(r.page==='manage')html=manage();
  else if(r.page==='edit'){
    if(!editor||editor.source!==r.id){const d=db.trainingDays.find(d=>d.id===r.id);if(d){editor={source:r.id,day:K.clone(d)};K.groups(editor.day.exercises).forEach(g=>g.items.forEach(x=>x.groupId=g.sup?g.letter:null));}}
    html=editPage(r.id);
  }else html=home();
  $('#app').innerHTML=html;
  document.querySelectorAll('[data-nav]').forEach(a=>{const active=a.dataset.nav===(['manage','edit'].includes(r.page)?'manage':r.page==='history'?'history':r.page==='calendar'?'calendar':'home');a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  document.querySelectorAll('#dayForm button:not([type])').forEach(b=>b.type='button');
  document.title=(r.page==='session'?'Training läuft':'Krafttraining')+' · v0.7.0';updateTimer();
}
function openDialog(title,body){focusBeforeDialog=document.activeElement;$('#dialog').innerHTML=`<div class="dialog-head"><h2 id="dialogTitle">${title}</h2>${button('close-dialog','×','icon','aria-label="Schließen"')}</div>${body}`;$('#dialog').showModal();}
function closeDialog(){$('#dialog').close();focusBeforeDialog?.focus();}
function libraryForm(id,context='library'){
  const x=id?db.exerciseLibrary.find(x=>x.id===id):K.exercise({name:'',sets:3,reps:'8–12',rest:90});
  openDialog(id?'Übung bearbeiten':'Neue Übung',`<form id="exerciseForm" data-id="${esc(id||'')}" data-context="${context}"><label>Name<input name="name" required maxlength="100" value="${id?esc(x.name):''}" autofocus></label><div class="form-grid"><label>Sätze<input name="sets" type="number" min="1" max="100" required value="${x.sets}"></label><label>Wiederholungsziel / Zeit<input name="reps" maxlength="60" value="${esc(x.reps)}"></label><label>Pause in Sekunden<input name="rest" type="number" min="0" max="3600" required value="${x.rest}"></label><label>Erfassung<select name="unit"><option value="reps">Wiederholungen</option><option value="seconds" ${x.unit==='seconds'?'selected':''}>Sekunden</option></select></label></div><p class="muted">${id?'Änderungen gelten für die Bibliothek. Vorhandene Pläne und Trainings behalten ihre Werte.':'Die Übung wird in deiner Bibliothek gespeichert.'}</p><button type="submit" class="btn primary full">Übung speichern</button></form>`);
}
function pickExercise(context){
  const used=(context==='run'?db.activeSession.exercises:editor.day.exercises).map(x=>x.id);
  openDialog('Übung hinzufügen',`<p class="muted">${context==='run'?'Nur für diese Einheit. Dein Trainingsplan bleibt erhalten.':'Wähle eine Übung für deinen Plan.'}</p><input id="exerciseSearch" type="search" placeholder="Übung suchen …" aria-label="Übung suchen"><div class="picker-list">${db.exerciseLibrary.filter(x=>!used.includes(x.id)).map(x=>button('pick-exercise',`<span class="grow">${esc(x.name)}<small>${esc(x.setsRange||x.sets)} × ${esc(x.reps)}</small></span><span>＋</span>`,'picker-item',`data-id="${esc(x.id)}" data-context="${context}"`)).join('')||'<p class="muted">Alle Bibliotheksübungen sind bereits enthalten.</p>'}</div>${button('new-from-picker','+ Neue Übung erstellen','secondary full',`data-context="${context}"`)}`);
}
function addExercise(x,context){
  if(context==='run'){
    const s=db.activeSession;const copy=K.item(db,{...x,groupId:null,label:''});s.exercises.splice(s.index+1,0,copy);s.index=s.exercises.indexOf(copy);save();
  }else if(context==='edit')editor.day.exercises.push({...K.clone(x),groupId:null,label:''});
}
function editRunGroup(){
  const s=db.activeSession,x=s?.exercises[s.index];if(!x)return;
  openDialog(x.groupId?'Supersatz bearbeiten':'Supersatz erstellen',`<p class="muted">Wähle die Übungen, die du im Wechsel trainieren möchtest. Gilt nur für diese Einheit; alle eingetragenen Sätze bleiben erhalten.</p><form id="runGroupForm"><div class="group-choices">${s.exercises.map(e=>`<label class="group-choice"><input type="checkbox" name="member" value="${esc(e.id)}" ${e.id===x.id||x.groupId&&e.groupId===x.groupId?'checked':''} ${e.id===x.id?'disabled':''}><span><strong>${esc(e.name)}</strong><small>${e.id===x.id?'Aktuelle Übung':e.groupId?'Bisher Supersatz '+esc(e.label):'Einzelübung'}</small></span></label>`).join('')}</div><p class="footnote">Ausgewählte Übungen wechseln gemeinsam in diesen Supersatz. Zum Auflösen alle Partner abwählen.</p><button type="submit" class="btn primary full">Übernehmen</button></form>`);
}
function validateNumber(value,integer=false){const n=Number(String(value).replace(',','.'));return String(value).trim()!==''&&Number.isFinite(n)&&n>=0&&(!integer||Number.isInteger(n));}
function updateTimer(){
  const box=$('#restTimer');if(!box)return;const s=db.activeSession;if(!s?.restUntil){box.hidden=true;return;}
  const remaining=Math.max(0,Math.ceil((s.restUntil-Date.now())/1000));box.hidden=false;
  box.innerHTML=`<div><span class="eyebrow">${remaining?'PAUSE':'BEREIT FÜR DIE NÄCHSTE RUNDE'}</span><strong>${remaining?Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0'):'Weiter geht’s'}</strong></div>${button('skip-rest',remaining?'Überspringen':'Okay','ghost')}`;
}
function exportBackup(value,name='krafttraining-v0.7.0'){
  try{
    const blob=new Blob([JSON.stringify(cloudPayload(value),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.appendChild(a);
    try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
    toast('Download gestartet. Bitte die JSON-Datei in Downloads prüfen.');
  }catch{toast('Backup konnte nicht gestartet werden. Bitte erneut versuchen.');}
}
function exportData(){exportBackup(db);}

async function importFile(file){
  if(!file)return;
  try{
    const next=K.applyPlanUpdate(K.normalize(JSON.parse(await file.text())),KraftPlanAdditions);
    if(!confirm(`Backup importieren? ${next.trainingDays.length} Trainingstage und ${next.history.length} Trainings ersetzen den aktuellen Datenstand einschließlich einer laufenden Einheit. Vorher bei Bedarf ein Backup exportieren.`))return;
    // Persist the complete, validated replacement before changing the running application.
    if(localStorage.getItem(KEY)!==lastStored)throw Error('Ein anderes Fenster hat Daten geändert. Bitte neu laden.');delete next._sync;localStorage.setItem(KEY,JSON.stringify(next));lastStored=localStorage.getItem(KEY);db=next;writeBlocked=false;loadError='';warning('');editor=null;go('home');toast('✓ Backup importiert – Pläne, Historie und Vorwerte übernommen.');
  }catch(e){toast('Import fehlgeschlagen: '+e.message);}
}
window.addEventListener('hashchange',()=>{closeDialog();render();window.scrollTo(0,0);});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.matches('[data-set]')&&db.activeSession){const x=db.activeSession.exercises[db.activeSession.index],v=x.values[+t.dataset.set];v[t.dataset.field]=t.value;if(v.done){v.done=false;const row=t.closest('.set-row'),check=row.querySelector('.check');row.classList.remove('completed');check.classList.remove('checked');check.textContent='○';check.setAttribute('aria-pressed','false');check.setAttribute('aria-label','Satz '+(+t.dataset.set+1)+' abschließen');$('#progressText').textContent=done(db.activeSession)+' / '+count(db.activeSession.exercises)+' Sätze';$('.progress').setAttribute('aria-valuenow',done(db.activeSession));$('.progress>div').style.width=(done(db.activeSession)/count(db.activeSession.exercises)*100)+'%';}save();}
  if(t.matches('[data-note]')&&db.activeSession){db.activeSession.exercises[db.activeSession.index].note=t.value;save();}
  if(t.matches('[data-day-name]')&&editor)editor.day.name=t.value;
  if(t.matches('[data-prop]')&&editor){const x=editor.day.exercises[+t.closest('[data-edit-index]').dataset.editIndex];x[t.dataset.prop]=['sets','rest'].includes(t.dataset.prop)?+t.value:t.value;if(t.dataset.prop==='sets')delete x.setsRange;}
  if(t.id==='exerciseSearch')document.querySelectorAll('.picker-item').forEach(b=>b.hidden=!b.textContent.toLowerCase().includes(t.value.toLowerCase()));
});
document.addEventListener('change',e=>{if(e.target.id==='import'){importFile(e.target.files[0]);e.target.value='';}});
document.addEventListener('submit',e=>{
  if(e.target.id==='runGroupForm'){
    e.preventDefault();const ids=[...e.target.querySelectorAll('input[name="member"]:checked')].map(n=>n.value);
    K.setSessionGroup(db.activeSession,ids);save();closeDialog();render();toast(ids.length>1?'Supersatz für diese Einheit gespeichert.':'Supersatz aufgelöst.');return;
  }
  if(e.target.id==='dayForm'){
    e.preventDefault();if(!editor.day.name.trim())return toast('Bitte einen Namen eingeben.');
    const d=K.clone(editor.day);d.name=d.name.trim();d.exercises=K.arrange(d.exercises.map(K.exercise));
    const i=db.trainingDays.findIndex(x=>x.id===d.id);if(i<0)db.trainingDays.push(d);else db.trainingDays[i]=d;
    d.exercises.forEach(x=>{if(!db.exerciseLibrary.some(e=>e.id===x.id))db.exerciseLibrary.push(K.clone(x));});
    save();go('day/'+encodeURIComponent(d.id));toast('Trainingsplan gespeichert.');
  }
  if(e.target.id==='exerciseForm'){
    e.preventDefault();const f=e.target, values=Object.fromEntries(new FormData(f));if(!values.name.trim())return;
    const id=f.dataset.id||K.uid('ex'),x=K.exercise({...values,id,name:values.name.trim()});
    const i=db.exerciseLibrary.findIndex(x=>x.id===id);if(i<0)db.exerciseLibrary.push(x);else db.exerciseLibrary[i]=x;
    if(f.dataset.context!=='library')addExercise(x,f.dataset.context);save();closeDialog();render();toast('Übung gespeichert.');
  }
});
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-a]');if(!b||b.disabled)return;const a=b.dataset.a,id=b.dataset.id,index=+b.dataset.index;
  const s=db.activeSession,x=s?.exercises[s.index];
  if(a==='close-dialog')return closeDialog();
  if(a==='editday')return go('edit/'+encodeURIComponent(id));
  if(a==='start'){if(!s){const active=(db.blocks||[]).find(b=>!b.closedAt&&!b.queued);if(active){const slot=K.blockProgress(db,active).next;if(slot?.dayId===id){db.activeSession=K.startSlot(db,active,slot.id);save();return go('session');}if(!confirm('Als zusätzliches Training starten? Der Fortschritt im Block bleibt unverändert. Für eine vorgezogene Blockeinheit wähle sie unter Planung.'))return;}const d=db.trainingDays.find(d=>d.id===id);if(!d?.exercises.length)return;db.activeSession=K.start(db,d);save();}return go('session');}
  if(a==='prev'||a==='next'||a==='jump'){if(!s)return;s.index=a==='jump'?index:s.index+(a==='prev'?-1:1);s.index=Math.max(0,Math.min(s.index,s.exercises.length-1));save();render();return;}
  if(a==='toggle'){
    const v=x.values[index];if(!v.done&&(!validateNumber(v.reps,x.unit!=='seconds')||(+v.reps.replace(',','.')<=0)||(v.weight!==''&&!validateNumber(v.weight))))return toast('Bitte gültige Werte eingeben: Gewicht ab 0 und Wiederholungen / Zeit größer als 0.');
    v.done=!v.done;
    if(v.done){
      const old=s.index, partners=s.exercises.filter(e=>e.groupId&&e.groupId===x.groupId);
      const completed=x.values.filter(v=>v.done).length;
      const roundComplete=!partners.length||partners.every(e=>e.values.filter(v=>v.done).length>=Math.min(completed,e.values.length));
      if(roundComplete&&x.rest>0)s.restUntil=Date.now()+x.rest*1000;
      s.index=K.nextPartner(s,old);
      if(s.index!==old)toast('Weiter mit '+s.exercises[s.index].label+' · '+s.exercises[s.index].name);
    }
    save();render();return;
  }
  if(a==='add-set'){x.values.push({weight:x.values.at(-1)?.weight||'',reps:x.values.at(-1)?.reps||'',done:false});save();render();return;}
  if(a==='remove-set'){if(x.values.length>1&&confirm('Letzten Satz samt Eingaben entfernen?')){x.values.pop();save();render();}return;}
  if(a==='remove-run'){if(confirm('Übung nur aus dieser Einheit entfernen? Dein Trainingsplan bleibt erhalten.')){s.exercises.splice(s.index,1);s.exercises=K.arrange(s.exercises);s.index=Math.max(0,Math.min(s.index,s.exercises.length-1));save();render();}return;}
  if(a==='add-run')return pickExercise('run');
  if(a==='edit-run-group')return editRunGroup();
  if(a==='finish'){
    if(!s||!done(s))return toast('Bestätige zuerst mindestens einen Satz.');
    const open=count(s.exercises)-done(s);if(!confirm(open?`${open} Sätze sind noch offen. Training trotzdem speichern? Offene Sätze bleiben als offen markiert.`:'Training abschließen und in der Historie speichern?'))return;
    const h={...K.clone(s),id:K.uid('history'),finishedAt:new Date().toISOString()};delete h.restUntil;db.history.push(h);db.activeSession=null;save();go('history/'+encodeURIComponent(h.id));toast('Training gespeichert. Gut gemacht.');return;
  }
  if(a==='discard'){if(confirm('Laufende Einheit und alle Eingaben verwerfen?')){db.activeSession=null;save();go('home');}return;}
  if(a==='skip-rest'){delete s.restUntil;save();updateTimer();return;}
  if(a==='delete-history'){if(confirm('Dieses Training dauerhaft aus der Historie löschen?')){db.history=db.history.filter(h=>h.id!==id);save();go('history');}return;}
  if(a==='export')return exportData();
  if(a==='new-library')return libraryForm();
  if(a==='edit-library')return libraryForm(id);
  if(a==='edit-add')return pickExercise('edit');
  if(a==='edit-new')return libraryForm(null,'edit');
  if(a==='new-from-picker'){closeDialog();return libraryForm(null,b.dataset.context);}
  if(a==='pick-exercise'){addExercise(db.exerciseLibrary.find(x=>x.id===id),b.dataset.context);closeDialog();render();return;}
  if(a==='edit-remove'){editor.day.exercises.splice(index,1);render();return;}
  if(a==='edit-up'||a==='edit-down'){const es=editor.day.exercises,other=index+(a==='edit-up'?-1:1);[es[index],es[other]]=[es[other],es[index]];render();return;}
  if(a==='delete-day'){if(confirm('Trainingstag löschen? Historie und laufende Einheit bleiben erhalten.')){db.trainingDays=db.trainingDays.filter(d=>d.id!==id);save();go('manage');}return;}
});
$('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
warning(loadError);if(!writeBlocked)save();render();setInterval(updateTimer,1000);

function localDay(value=new Date()){const d=new Date(value);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function activeBlock(){return (db.blocks||[]).find(b=>!b.closedAt&&!b.queued);}
function planningCard(){
 const b=activeBlock();if(!b)return `<section class="card planning-card"><div class="eyebrow">FLEXIBEL PLANEN</div><h2>Dein nächster Trainingsblock</h2><p class="muted">Drei Durchläufe, dein Tempo. Starte mit deinen aktuellen Trainingstagen.</p>${button('create-block','Block anlegen','primary')} <a href="#calendar" class="btn secondary">Kalender ansehen</a></section>`;
 const p=K.blockProgress(db,b),s=p.next,d=b.days.find(d=>d.id===s?.dayId);const monday=new Date();monday.setHours(0,0,0,0);monday.setDate(monday.getDate()-(monday.getDay()+6)%7);const end=new Date(monday);end.setDate(end.getDate()+7);const weekly=db.history.filter(h=>new Date(h.finishedAt||h.date)>=monday&&new Date(h.finishedAt||h.date)<end).length;
 return `<section class="card planning-card"><div class="eyebrow">${esc(b.name)} · seit ${date(b.startDate+'T12:00:00')}</div><h2>${p.completed.size} von ${p.total} Einheiten erledigt</h2><p class="muted">Diese Woche: ${weekly} von 4 Einheiten</p>${(Date.now()-new Date(b.startDate+'T00:00:00').getTime()>=21*86400000||!s)?'<p class="muted">Zeit für einen Blockwechsel? Du kannst den Block abschließen oder weitertrainieren.</p>':''}<p>${d?'Als Nächstes: <strong>'+esc(d.name)+'</strong> · Durchlauf '+s.round:'Alle Einheiten erledigt. Du kannst den nächsten Block beginnen.'}</p>${s?button('block-slot','Nächste Einheit ansehen →','primary',`data-id="${esc(b.id)}" data-slot="${esc(s.id)}"`):''} <a href="#calendar" class="btn secondary">Planung öffnen →</a></section>`;
}
function calendar(){
 const b=activeBlock();const now=new Date();now.setHours(12,0,0,0);now.setDate(now.getDate()-((now.getDay()+6)%7)+(window.planWeekOffset||0)*7);
 const week=Array.from({length:7},(_,i)=>{const d=new Date(now);d.setDate(d.getDate()+i);return localDay(d);});
 const weekCount=db.history.filter(h=>week.includes(localDay(h.finishedAt||h.date))).length;
 const blockView=block=>{const p=K.blockProgress(db,block);return `<section class="card planning-card"><div class="section-title"><div><span class="eyebrow">${block.closedAt?'ABGESCHLOSSENER BLOCK':'AKTUELLER BLOCK'}</span><h2>${esc(block.name)}</h2></div><span>${p.completed.size} / ${p.total}</span></div><p class="muted">Seit ${date(block.startDate+'T12:00:00',true)} · Ziel: drei Wochen, Wechsel nach deiner Bestätigung</p><div class="block-grid" style="--days:${block.days.length}"><span></span>${block.days.map(d=>`<strong>${esc(d.name.replace(/^[^–]*–\s*/,''))}</strong>`).join('')}${[1,2,3].map(round=>`<strong>Runde ${round}</strong>${block.slots.filter(s=>s.round===round).map(s=>{const h=p.completed.get(s.id),d=block.days.find(d=>d.id===s.dayId);return h?`<a class="block-cell complete" href="#history/${encodeURIComponent(h.id)}" aria-label="${esc(d.name)} Durchlauf ${round}, erledigt">✓<small>${date(h.finishedAt)}</small></a>`:button('block-slot',`${s.id===p.next?.id&&!block.closedAt?'Als Nächstes':'○'}<small>${s.plannedDate?date(s.plannedDate+'T12:00:00'):block.closedAt?'Nicht absolviert':'Offen'}</small>`,'block-cell '+(s.id===p.next?.id&&!block.closedAt?'next':''),`data-id="${esc(block.id)}" data-slot="${esc(s.id)}" aria-label="${esc(d.name)} Durchlauf ${round}" ${block.closedAt?'disabled':''}`);}).join('')}`).join('')}</div>${!block.closedAt?`<p class="footnote">Tippe eine offene Einheit an, um sie anzusehen, vorzuziehen oder auf einen Tag zu legen.</p>${button('create-block','Nächsten Block vorbereiten','secondary')} ${button('close-block','Block abschließen','secondary')}`:''}</section>`;};
 return head('DEIN RHYTHMUS','Planung','Vier Einheiten pro Woche als Ziel. Die Reihenfolge läuft flexibel weiter.')+resumeCard()+`<section class="card planning-card"><div class="section-title">${button('week-prev','←','secondary','aria-label="Vorherige Woche"')}<div><h2>${date(week[0]+'T12:00:00')} – ${date(week[6]+'T12:00:00')}</h2><span>${weekCount} von 4 geplanten Einheiten</span></div>${button('week-next','→','secondary','aria-label="Nächste Woche"')}</div>${button('week-today','Diese Woche','ghost')}<div class="calendar-week">${week.map(day=>`<section class="calendar-day ${day===localDay()?'today':''}"><strong>${new Date(day+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'numeric'})}${day===localDay()?' · Heute':''}</strong>${db.history.filter(h=>localDay(h.finishedAt||h.date)===day).map(h=>`<a class="calendar-entry complete" href="#history/${encodeURIComponent(h.id)}">✓ ${esc(h.dayName)}</a>`).join('')}${b?b.slots.filter(s=>s.plannedDate===day&&!K.blockProgress(db,b).completed.has(s.id)).map(s=>button('block-slot',esc(b.days.find(d=>d.id===s.dayId).name),'calendar-entry',`data-id="${esc(b.id)}" data-slot="${esc(s.id)}"`)).join(''):''}</section>`).join('')}</div></section>`+(b?blockView(b):planningCard())+(db.nextBlock?`<section class="card planning-card"><h2>Vorbereitet: ${esc(db.nextBlock.name)}</h2><p>${db.nextBlock.days.length} Trainingstage · drei Durchläufe</p>${button('activate-block','Diesen Block starten','primary')} ${button('create-block','Vorbereitung bearbeiten','secondary')}</section>`:'')+(db.blocks||[]).filter(b=>b.closedAt).slice().reverse().map(blockView).join('');
}
function blockForm(){
 const draft=db.nextBlock;
 openDialog(draft?'Nächsten Block bearbeiten':'Trainingsblock vorbereiten',`<form id="blockForm"><label>Blockname<input name="name" required maxlength="80" value="${esc(draft?.name||'Block '+((db.blocks||[]).length+1))}"></label><label>Beginn<input name="startDate" type="date" required value="${draft?.startDate||localDay()}"></label><p class="muted">Wähle die Trainingstage in der angezeigten Reihenfolge. Für neue Übungen oder Satzvorgaben zuerst unter Verwalten die Pläne bearbeiten. Der laufende Block behält seine bisherigen Vorgaben.</p>${db.trainingDays.map(d=>`<label class="group-choice"><input type="checkbox" name="day" value="${esc(d.id)}" ${!draft||draft.days.some(x=>x.id===d.id)?'checked':''}><span>${esc(d.name)}</span></label>`).join('')}<p class="footnote">Beim Speichern werden die aktuellen Pläne kopiert. Bisherige Trainings bleiben in der Historie und im Kalender.</p><button class="btn primary full" type="submit">${activeBlock()?'Nächsten Block speichern':'Block starten'}</button></form>`);
}
function slotDialog(block,slot){const d=block.days.find(d=>d.id===slot.dayId);openDialog(d.name,`<p>Durchlauf ${slot.round} · ${d.exercises.length} Übungen</p><div class="slot-exercises">${K.groups(d.exercises).map(g=>`<p>${g.sup?'<strong>Supersatz '+g.letter+'</strong><br>':''}${g.items.map(x=>`${esc(x.label)} ${esc(x.name)} · ${esc(x.setsRange||x.sets)} × ${esc(x.reps)}`).join('<br>')}</p>`).join('')}</div><form id="slotForm" data-block="${esc(block.id)}" data-slot="${esc(slot.id)}"><label>Optionaler Termin<input type="date" name="plannedDate" value="${esc(slot.plannedDate)}"></label><p class="footnote">Zum Entfernen den Termin leeren. Ein Termin ändert nicht die Trainingsreihenfolge.</p><button type="submit" class="btn secondary">Termin speichern</button></form><hr>${button('start-slot',db.activeSession?'Laufendes Training fortsetzen':'Diese Einheit starten','primary full',`data-id="${esc(block.id)}" data-slot="${esc(slot.id)}"`)}`);}
document.addEventListener('submit',e=>{
 if(e.target.id==='blockForm'){e.preventDefault();if(!activeBlock()&&db.activeSession)return toast('Bitte zuerst die laufende Einheit abschließen oder verwerfen.');const f=new FormData(e.target),ids=f.getAll('day');try{const b=K.newBlock(db.trainingDays.filter(d=>ids.includes(d.id)),String(f.get('name')).trim(),String(f.get('startDate')));if(activeBlock())db.nextBlock=b;else{(db.blocks||=[]).push(b);delete db.nextBlock;}save();closeDialog();go('calendar');render();}catch(err){toast(err.message);}}
 if(e.target.id==='slotForm'){e.preventDefault();const b=db.blocks.find(b=>b.id===e.target.dataset.block),s=b.slots.find(s=>s.id===e.target.dataset.slot);s.plannedDate=String(new FormData(e.target).get('plannedDate'));save();closeDialog();render();}
});
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-a]');if(!el||el.disabled)return;const a=el.dataset.a;
 if(a==='create-block')return blockForm();
 if(a==='week-prev'||a==='week-next'||a==='week-today'){window.planWeekOffset=a==='week-today'?0:(window.planWeekOffset||0)+(a==='week-prev'?-1:1);render();}
 if(a==='block-slot'){const b=db.blocks.find(b=>b.id===el.dataset.id);slotDialog(b,b.slots.find(s=>s.id===el.dataset.slot));}
 if(a==='start-slot'){if(db.activeSession){closeDialog();return go('session');}try{db.activeSession=K.startSlot(db,db.blocks.find(b=>b.id===el.dataset.id),el.dataset.slot);save();closeDialog();go('session');}catch(err){toast(err.message);}}
 if(a==='close-block'||a==='activate-block'){
   if(db.activeSession)return toast('Bitte zuerst die laufende Einheit abschließen oder verwerfen.');
   const b=activeBlock(),p=b&&K.blockProgress(db,b);
   if(!confirm(`${b?`${p.total-p.completed.size} Einheiten bleiben nicht absolviert. `:''}${a==='activate-block'?'Vorbereiteten Block jetzt starten?':'Block abschließen? Die bisherigen Pläne bleiben erhalten.'}`))return;
   if(b)b.closedAt=new Date().toISOString();
   if(a==='activate-block'&&db.nextBlock){(db.blocks||=[]).push(db.nextBlock);delete db.nextBlock;}
   save();render();
 }
});

function cloudPayload(value){const out=K.clone(value);delete out._sync;return out;}
window.KraftCloudBridge={read:()=>cloudPayload(db),meta:()=>db._sync,blocked:()=>!!window.KraftPlanningBusy?.()||!!db.activeSession||!!editor||$('#dialog').open||writeBlocked||!storageOkay,validate:value=>cloudPayload(K.normalize(value)),commit:(value,meta)=>{const old=db;db={...K.normalize(value),_sync:meta};if(!save()){db=old;throw Error('Lokal konnte nicht gespeichert werden. Bitte Backup exportieren.');}render();},refresh:()=>{if(route().page==='manage'&&!$('#dialog').open)render();},backup:exportData,exportBackup};
