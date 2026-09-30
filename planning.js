/* Calendar edits use the same local record and cloud conflict protection as training. */
(function(){
 let drag=null,suppressClick=false;
 const blocks=()=>[...(db.blocks||[]),...(db.nextBlock?[db.nextBlock]:[])];
 const extras=()=> (db.plannedExtras||[]).filter(x=>!db.history.some(h=>h.plannedExtraId===x.id));
 const attrs=x=>`data-plan-kind="${x.kind}" data-plan-id="${esc(x.id)}" data-plan-slot="${esc(x.slot||'')}"`;
 function entry(x,label,sub=''){return `<div class="plan-item" ${attrs(x)}><button class="plan-grip" draggable="true" aria-label="${esc(label)} ziehen" ${attrs(x)}>⠿</button><button class="plan-label" data-a="plan-edit" ${attrs(x)}>${esc(label)}${sub?`<small>${esc(sub)}</small>`:''}</button></div>`;}
 function slots(){return blocks().filter(b=>!b.closedAt).flatMap(b=>b.slots.filter(s=>!K.blockProgress(db,b).completed.has(s.id)).map(s=>({kind:'slot',id:b.id,slot:s.id,date:s.plannedDate,label:b.days.find(d=>d.id===s.dayId).name,sub:b.name+' · Runde '+s.round})));}
 const from=el=>({kind:el.dataset.planKind,id:el.dataset.planId,slot:el.dataset.planSlot});
 function mutate(work){const previous=K.clone(db);try{work();if(!save()){db=previous;return false;}return true;}catch(error){db=previous;toast(error.message);return false;}}
 function place(x,day){return mutate(()=>{
  if(day&&!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('Bitte ein Datum wählen.');
  if(x.kind==='slot')K.planSlot(db,x.id,x.slot,day);
  else if(x.kind==='day'){const d=db.trainingDays.find(d=>d.id===x.id);if(!d?.exercises.length)throw Error('Dieser Trainingstag hat keine Übungen.');(db.plannedExtras||=[]).push({id:K.uid('planned'),day:K.clone(d),plannedDate:day});}
  else {const p=(db.plannedExtras||[]).find(p=>p.id===x.id);if(!p||db.activeSession?.plannedExtraId===x.id||db.history.some(h=>h.plannedExtraId===x.id))throw Error('Diese Einheit ist nicht offen.');p.plannedDate=day;}
 });}
 calendar=function(){
  const monday=new Date();monday.setHours(12,0,0,0);monday.setDate(monday.getDate()-(monday.getDay()+6)%7+(window.planWeekOffset||0)*7);
  const week=Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(d.getDate()+i);return localDay(d);});
  const planned=[...slots(),...extras().map(x=>({kind:'extra',id:x.id,date:x.plannedDate,label:x.day.name,sub:'Zusätzliche Einheit'}))];
  const completed=db.history.filter(h=>week.includes(localDay(h.finishedAt||h.date))).length;
  return head('DEIN RHYTHMUS','Planung','Ziehe Einheiten auf einen Tag oder tippe sie an, um einen Termin auszuwählen.')+resumeCard()+
   `<section class="card planning-card"><div class="section-title">${button('week-prev','←','secondary','aria-label="Vorherige Woche"')}<div><h2>${date(week[0]+'T12:00:00')} – ${date(week[6]+'T12:00:00')}</h2><p>${completed} erledigt · ${planned.filter(x=>week.includes(x.date)).length} noch geplant · Wochenziel 4</p></div>${button('week-next','→','secondary','aria-label="Nächste Woche"')}</div>${button('week-today','Diese Woche','ghost')}<div class="calendar-week">${week.map(day=>`<section class="calendar-day ${day===localDay()?'today':''}" data-plan-drop="${day}"><strong>${new Date(day+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'numeric'})}</strong>${db.history.filter(h=>localDay(h.finishedAt||h.date)===day).map(h=>`<a class="calendar-entry complete" href="#history/${encodeURIComponent(h.id)}">✓ ${esc(h.dayName)}</a>`).join('')}${planned.filter(x=>x.date===day).map(x=>entry(x,x.label,x.sub)).join('')}${button('plan-add','+ Einheit','ghost',`data-day="${day}" aria-label="Einheit am ${day} hinzufügen"`)}</section>`).join('')}</div></section>`+
   `<section class="card planning-card" data-plan-drop=""><h2>Noch ohne Termin</h2><p class="footnote">Hier ablegen, um einen Termin zu entfernen. Am Griff ⠿ ziehen; durch Antippen ist auch eine andere Woche erreichbar.</p><div class="plan-pool">${planned.filter(x=>!x.date).map(x=>entry(x,x.label,x.sub)).join('')||'<p class="muted">Alle offenen Einheiten haben einen Termin.</p>'}</div></section>`+
   `<section class="card planning-card"><h2>Zusätzliche Einheit einfügen</h2><p class="muted">Ziehe einen Trainingstag in den Kalender. Jede Einfügung erstellt eine eigene Einheit.</p><div class="plan-pool">${db.trainingDays.map(d=>entry({kind:'day',id:d.id},d.name)).join('')}</div></section>`+
   `<section class="card planning-card"><div class="section-title"><h2>Trainingsblöcke</h2>${button('create-block','+ Block','primary')}</div>${blocks().map(b=>{const p=K.blockProgress(db,b);return `<article class="plan-block"><h3>${esc(b.name)}</h3><p>${b===db.nextBlock?'Vorbereitet':b.closedAt?'Abgeschlossen':'Aktuell'} · Beginn ${date(b.startDate+'T12:00:00',true)} · ${p.completed.size}/${p.total} erledigt</p>${button('plan-move-block','Block verschieben','secondary',`data-id="${esc(b.id)}"`)} ${button('plan-delete-block','Block löschen','danger-ghost',`data-id="${esc(b.id)}"`)} ${b===db.nextBlock?button('activate-block','Block starten','primary'):!b.closedAt?button('close-block','Block abschließen','secondary'):''}</article>`;}).join('')||'<p>Noch kein Block angelegt.</p>'}</section>`;
 };
 function edit(x,day){
  const b=x.kind==='slot'?K.planningBlock(db,x.id):null,s=b?.slots.find(s=>s.id===x.slot),extra=x.kind==='extra'?extras().find(p=>p.id===x.id):null;
  const d=b?b.days.find(d=>d.id===s.dayId):extra?.day||db.trainingDays.find(d=>d.id===x.id);if(!d)return;
  openDialog(d.name,`<form id="flexPlanForm" ${attrs(x)}><label>Termin<input name="day" type="date" value="${esc(day??s?.plannedDate??extra?.plannedDate??localDay())}"></label><p class="footnote">Ohne Datum bleibt die Einheit unter „Noch ohne Termin“. Termine verändern nicht die Reihenfolge im Block.</p><button class="btn primary full">${x.kind==='day'?'Einheit hinzufügen':'Termin speichern'}</button></form>${x.kind!=='day'?button('plan-start','Training ansehen / starten','secondary full',attrs(x)):''}${x.kind==='extra'?button('plan-remove-extra','Zusätzliche Einheit löschen','danger-ghost full',attrs(x)):''}`);
 }
 document.addEventListener('click',e=>{
  if(suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;return;}
  const el=e.target.closest('[data-a]');if(!el)return;const a=el.dataset.a;
  if(a==='plan-edit')edit(from(el));
  if(a==='plan-add')openDialog('Einheit hinzufügen',`<p>Trainingstag für ${date(el.dataset.day+'T12:00:00',true)} wählen.</p>${db.trainingDays.map(d=>button('plan-day-choice',esc(d.name),'secondary full',`data-id="${esc(d.id)}" data-day="${el.dataset.day}"`)).join('')}`);
  if(a==='plan-day-choice'){if(place({kind:'day',id:el.dataset.id},el.dataset.day)){closeDialog();render();}}
  if(a==='plan-move-block'){const b=K.planningBlock(db,el.dataset.id);openDialog('Block verschieben',`<form id="moveBlockForm" data-id="${esc(b.id)}"><label>Neuer Beginn<input type="date" name="day" required value="${b.startDate}"></label><p>Offene Termine werden um dieselbe Anzahl Tage verschoben. Absolvierte Trainings bleiben unverändert.</p><button class="btn primary full">Block verschieben</button></form>`);}
  if(a==='plan-delete-block'&&confirm('Block und seine offenen Planungen löschen? Absolvierte Trainings bleiben in der Historie.')){if(mutate(()=>K.deleteBlock(db,el.dataset.id)))render();}
  if(a==='plan-remove-extra'&&confirm('Diese geplante Zusatzeinheit löschen?')){if(mutate(()=>{if(db.activeSession?.plannedExtraId===el.dataset.planId)throw Error('Bitte zuerst das laufende Training abschließen.');db.plannedExtras=db.plannedExtras.filter(x=>x.id!==el.dataset.planId);})){closeDialog();render();}}
  if(a==='plan-start'){
   const x=from(el);if(x.kind==='slot'){const b=K.planningBlock(db,x.id);if(b===db.nextBlock)return toast('Bitte diesen vorbereiteten Block zuerst starten.');return slotDialog(b,b.slots.find(s=>s.id===x.slot));}
   if(db.activeSession){closeDialog();return go('session');}
   if(mutate(()=>{const p=extras().find(p=>p.id===x.id);if(!p)throw Error('Einheit nicht gefunden.');db.activeSession={...K.start(db,p.day),plannedExtraId:p.id};})){closeDialog();go('session');}
  }
 },true);
 document.addEventListener('submit',e=>{
  if(e.target.id==='flexPlanForm'){e.preventDefault();if(place(from(e.target),String(new FormData(e.target).get('day')))){closeDialog();render();}}
  if(e.target.id==='moveBlockForm'){e.preventDefault();if(mutate(()=>K.moveBlock(db,e.target.dataset.id,String(new FormData(e.target).get('day'))))){closeDialog();render();}}
 });
 const highlight=el=>{document.querySelectorAll('.plan-drop-active').forEach(n=>n.classList.remove('plan-drop-active'));el?.classList.add('plan-drop-active');};
 document.addEventListener('dragstart',e=>{const el=e.target.closest('.plan-grip');if(!el)return;drag=from(el);e.dataTransfer.setData('text/plain','krafttraining-plan');e.dataTransfer.effectAllowed=drag.kind==='day'?'copy':'move';});
 document.addEventListener('dragover',e=>{const target=e.target.closest('[data-plan-drop]');if(drag&&target){e.preventDefault();highlight(target);}});
 document.addEventListener('drop',e=>{const target=e.target.closest('[data-plan-drop]');if(!drag||!target)return;e.preventDefault();const x=drag;drag=null;highlight(null);if(place(x,target.dataset.planDrop))render();});
 document.addEventListener('dragend',()=>{drag=null;highlight(null);});
 let touch=null;
 window.KraftPlanningBusy=()=>!!drag||!!touch;
 document.addEventListener('pointerdown',e=>{const el=e.target.closest('.plan-grip');if(!el||e.pointerType==='mouse')return;touch={id:e.pointerId,x:e.clientX,y:e.clientY,source:from(el),moved:false};el.setPointerCapture?.(e.pointerId);});
 document.addEventListener('pointermove',e=>{if(!touch||touch.id!==e.pointerId)return;if(Math.hypot(e.clientX-touch.x,e.clientY-touch.y)>8)touch.moved=true;if(!touch.moved)return;e.preventDefault();highlight(document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-plan-drop]'));if(e.clientY<90)window.scrollBy(0,-14);else if(e.clientY>window.innerHeight-100)window.scrollBy(0,14);});
 document.addEventListener('pointerup',e=>{if(!touch||touch.id!==e.pointerId)return;const t=touch;touch=null;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-plan-drop]');highlight(null);if(t.moved){suppressClick=true;setTimeout(()=>suppressClick=false,400);if(target&&place(t.source,target.dataset.planDrop))render();}else edit(t.source);});
 document.addEventListener('pointercancel',()=>{touch=null;highlight(null);});
 if(route().page==='calendar')render();
})();
