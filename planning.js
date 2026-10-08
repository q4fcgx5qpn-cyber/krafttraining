/* Calendar edits use the same local record and cloud conflict protection as training. */
(function(){
 let drag=null,suppressClick=false;
 const blocks=()=>[...(db.blocks||[]),...(db.nextBlock?[db.nextBlock]:[])];
 const extras=()=> (db.plannedExtras||[]).filter(x=>!db.history.some(h=>h.plannedExtraId===x.id));
 const attrs=x=>`data-plan-kind="${x.kind}" data-plan-id="${esc(x.id)}" data-plan-slot="${esc(x.slot||'')}"`;
 function entry(x,label,sub=''){return `<div class="plan-item" ${attrs(x)}><button class="plan-grip" draggable="true" aria-label="${esc(label)} ziehen" ${attrs(x)}>⠿</button><button class="plan-label" data-a="plan-edit" ${attrs(x)}>${esc(label)}${sub?`<small>${esc(sub)}</small>`:''}</button></div>`;}
 function completedEntry(h){
  const linked=K.historyAssignment(db,h),x={kind:'history',id:h.id};
  return `<div class="plan-item history-plan-item complete">${!linked?`<button class="plan-grip" draggable="false" aria-label="${esc(h.dayName)} vom ${date(h.finishedAt||h.date)} zuordnen durch Ziehen" ${attrs(x)}>⠿</button>`:''}<div class="history-plan-body"><a href="#history/${encodeURIComponent(h.id)}">✓ ${esc(h.dayName)}</a>${button('history-link',linked?'✓ Zugeordnet':'Zuordnen','ghost',`data-id="${esc(h.id)}" aria-label="${esc(h.dayName)} vom ${date(h.finishedAt||h.date)}: ${linked?'Zuordnung ansehen':'Zyklus zuordnen'}"`)}</div></div>`;
 }
 function slotLabel(slot){return `${slot.plannedDate?date(slot.plannedDate+'T12:00:00',true):'Ohne Termin'} · Einheit ${slot.round}`;}
 function chooseSlot(historyId,blockId){
  const h=db.history.find(h=>h.id===historyId);if(!h)return toast('Training nicht gefunden.');
  const linked=K.historyAssignment(db,h),targets=K.historyTargets(db,h).filter(t=>!blockId||t.block.id===blockId);
  openDialog('Training zuordnen',`<p><strong>${esc(h.dayName)}</strong> · ${date(h.finishedAt||h.date,true)}</p>${linked?`<div class="link-current"><p>✓ Zugeordnet zu <strong>${esc(linked.block.name)}</strong><br>${slotLabel(linked.slot)}</p>${button('history-unlink','Zuordnung lösen','secondary full',`data-id="${esc(h.id)}"`)}<p class="muted">Das Training bleibt gespeichert. Die Zykluseinheit wird wieder offen.</p></div>`:`<p class="muted link-intro">Welche geplante Einheit hast du damit absolviert? Datum, Übungen und eingetragene Werte bleiben erhalten.</p><div class="link-choices">${[...new Set(targets.map(t=>t.block))].map(b=>`<section><h3>${esc(b.name)}</h3>${targets.filter(t=>t.block===b).map(t=>button('history-assign',`${esc(h.dayName)}<small>${slotLabel(t.slot)}</small>`,'secondary full link-choice',`data-history="${esc(h.id)}" data-block="${esc(b.id)}" data-slot="${esc(t.slot.id)}"`)).join('')}</section>`).join('')||'<p class="muted">Keine passende offene Einheit gefunden. Der Trainingstag muss übereinstimmen und das Training darf nicht vor dem Zyklusbeginn liegen. Belegte und gerade laufende Einheiten sind ausgeschlossen.</p>'}</div>`}<a class="text-link" href="#history/${encodeURIComponent(h.id)}" data-a="close-dialog">Training ansehen →</a>`);
 }
 function chooseHistory(blockId,slotId){
  const b=K.planningBlock(db,blockId),slot=slotId?b.slots.find(s=>s.id===slotId):null;
  const candidates=db.history.filter(h=>K.historyTargets(db,h).some(t=>t.block.id===blockId&&(!slotId||t.slot.id===slotId))).sort((a,c)=>new Date(c.finishedAt||c.date)-new Date(a.finishedAt||a.date));
  openDialog('Absolviertes Training zuordnen',`<p><strong>${esc(b.name)}</strong>${slot?'<br>'+esc(b.days.find(d=>d.id===slot.dayId)?.name)+' · '+slotLabel(slot):''}</p><p class="muted link-intro">Wähle das bereits gespeicherte Training.</p><div class="link-choices">${candidates.map(h=>button(slot?'history-assign':'history-choose-slot',`${esc(h.dayName)}<small>${date(h.finishedAt||h.date,true)} · ${done(h)} bestätigte Sätze</small>`,'secondary full link-choice',`data-history="${esc(h.id)}" data-block="${esc(b.id)}" ${slot?`data-slot="${esc(slot.id)}"`:''}`)).join('')||'<p class="muted">Keine passenden, noch nicht zugeordneten Trainings gefunden.</p>'}</div>`);
 }
 function assign(historyId,blockId,slotId){
  if(mutate(()=>K.linkHistory(db,historyId,blockId,slotId))){closeDialog();render();toast('Training zugeordnet. Über „Zugeordnet“ kannst du die Verbindung wieder lösen.');}
 }
 function dropTarget(source,node){
  if(source?.kind==='history')return node?.closest('[data-plan-kind="slot"], [data-history-block]');
  return node?.closest('[data-plan-drop]');
 }
 function dropOn(source,target){
  if(source.kind==='history'){
   if(target.dataset.planKind==='slot')assign(source.id,target.dataset.planId,target.dataset.planSlot);
   else chooseSlot(source.id,target.dataset.historyBlock);
  }else if(place(source,target.dataset.planDrop))render();
 }
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
  return head('DEIN RHYTHMUS','Planung','Plane deine Trainingszyklen und behalte deine Woche im Blick.')+resumeCard()+`<div class="cycle-create">${button('cycle-new','+ Trainingszyklus anlegen','primary')}</div>`+
   `<section class="card planning-card"><div class="section-title">${button('week-prev','←','secondary','aria-label="Vorherige Woche"')}<div><h2>${date(week[0]+'T12:00:00')} – ${date(week[6]+'T12:00:00')}</h2><p>${completed} erledigt · ${planned.filter(x=>week.includes(x.date)).length} noch geplant</p></div>${button('week-next','→','secondary','aria-label="Nächste Woche"')}</div>${button('week-today','Diese Woche','ghost')}<p class="muted link-calendar-hint">Erledigtes Training am Griff auf eine geplante Einheit oder einen Zyklus ziehen. Oder „Zuordnen“ antippen.</p><div class="calendar-week">${week.map(day=>`<section class="calendar-day ${day===localDay()?'today':''}" data-plan-drop="${day}"><strong>${new Date(day+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'numeric'})}</strong>${db.history.filter(h=>localDay(h.finishedAt||h.date)===day).map(completedEntry).join('')}${planned.filter(x=>x.date===day).map(x=>entry(x,x.label,x.sub)).join('')}${button('plan-add','+ Einheit','ghost',`data-day="${day}" aria-label="Einheit am ${day} hinzufügen"`)}</section>`).join('')}</div></section>`+
   cycleCards()+ (extras().some(x=>!x.plannedDate)?`<details class="card"><summary>Zusätzliche Einheiten ohne Datum (${extras().filter(x=>!x.plannedDate).length})</summary>${extras().filter(x=>!x.plannedDate).map(x=>entry({kind:'extra',id:x.id},x.day.name)).join('')}</details>`:'');
 };
 function edit(x,day){
  const b=x.kind==='slot'?K.planningBlock(db,x.id):null,s=b?.slots.find(s=>s.id===x.slot),extra=x.kind==='extra'?extras().find(p=>p.id===x.id):null;
  const d=b?b.days.find(d=>d.id===s.dayId):extra?.day||db.trainingDays.find(d=>d.id===x.id);if(!d)return;
  openDialog(d.name,`<form id="flexPlanForm" ${attrs(x)}><label>Termin<input name="day" type="date" value="${esc(day??s?.plannedDate??extra?.plannedDate??localDay())}"></label><p class="footnote">Ohne Datum findest du die Einheit über „Bearbeiten“ im Trainingszyklus. Termine verändern nicht die Reihenfolge im Block.</p><button class="btn primary full">${x.kind==='day'?'Einheit hinzufügen':'Termin speichern'}</button></form>${x.kind!=='day'?button('plan-start','Training ansehen / starten','secondary full',attrs(x)):''}${x.kind==='slot'?button('slot-link-history','Absolviertes Training zuordnen','secondary full',`data-id="${esc(b.id)}" data-slot="${esc(s.id)}"`):''}${x.kind==='extra'?button('plan-remove-extra','Zusätzliche Einheit löschen','danger-ghost full',attrs(x)):''}`);
 }
 document.addEventListener('click',e=>{
  if(suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;return;}
  const el=e.target.closest('[data-a]');if(!el)return;const a=el.dataset.a;
  if(a==='history-link')chooseSlot(el.dataset.id);
  if(a==='cycle-link-history')chooseHistory(el.dataset.id);
  if(a==='slot-link-history')chooseHistory(el.dataset.id,el.dataset.slot);
  if(a==='history-choose-slot')chooseSlot(el.dataset.history,el.dataset.block);
  if(a==='history-assign')assign(el.dataset.history,el.dataset.block,el.dataset.slot);
  if(a==='history-unlink'&&mutate(()=>K.unlinkHistory(db,el.dataset.id))){closeDialog();render();toast('Zuordnung gelöst. Dein Training bleibt gespeichert.');}
  if(a==='plan-edit')edit(from(el));
  if(a==='plan-add')openDialog('Einheit hinzufügen',`<p>Trainingstag für ${date(el.dataset.day+'T12:00:00',true)} wählen.</p>${db.trainingDays.map(d=>button('plan-day-choice',esc(d.name),'secondary full',`data-id="${esc(d.id)}" data-day="${el.dataset.day}"`)).join('')}`);
  if(a==='plan-day-choice'){if(place({kind:'day',id:el.dataset.id},el.dataset.day)){closeDialog();render();}}
  if(a==='plan-move-block'){const b=K.planningBlock(db,el.dataset.id);openDialog('Block verschieben',`<form id="moveBlockForm" data-id="${esc(b.id)}"><label>Neuer Beginn<input type="date" name="day" required value="${b.startDate}"></label><p>Offene Termine werden um dieselbe Anzahl Tage verschoben. Absolvierte Trainings bleiben unverändert.</p><button class="btn primary full">Block verschieben</button></form>`);}
  if(a==='plan-delete-block'&&confirm('Block und seine offenen Planungen löschen? Absolvierte Trainings bleiben in der Historie.')){if(mutate(()=>K.deleteBlock(db,el.dataset.id)))render();}
  if(a==='plan-remove-extra'&&confirm('Diese geplante Zusatzeinheit löschen?')){if(mutate(()=>{if(db.activeSession?.plannedExtraId===el.dataset.planId)throw Error('Bitte zuerst das laufende Training abschließen.');db.plannedExtras=db.plannedExtras.filter(x=>x.id!==el.dataset.planId);})){closeDialog();render();}}
  if(a==='plan-start'){
   const x=from(el);if(x.kind==='slot'){const b=K.planningBlock(db,x.id);if(b===db.nextBlock||b.queued)return toast('Bitte diesen vorbereiteten Block zuerst starten.');return slotDialog(b,b.slots.find(s=>s.id===x.slot));}
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
 document.addEventListener('dragover',e=>{const target=dropTarget(drag,e.target);if(drag&&target){e.preventDefault();highlight(target);}});
 document.addEventListener('drop',e=>{const target=dropTarget(drag,e.target);if(!drag||!target)return;e.preventDefault();const x=drag;drag=null;highlight(null);dropOn(x,target);});
 document.addEventListener('dragend',()=>{drag=null;highlight(null);});
 let touch=null;
 window.KraftPlanningBusy=()=>!!drag||!!touch;
 document.addEventListener('pointerdown',e=>{const el=e.target.closest('.plan-grip');if(!el||(e.pointerType==='mouse'&&el.dataset.planKind!=='history'))return;if(el.dataset.planKind==='history')e.preventDefault();touch={id:e.pointerId,x:e.clientX,y:e.clientY,source:from(el),moved:false};el.setPointerCapture?.(e.pointerId);});
 document.addEventListener('pointermove',e=>{if(!touch||touch.id!==e.pointerId)return;if(Math.hypot(e.clientX-touch.x,e.clientY-touch.y)>8)touch.moved=true;if(!touch.moved)return;e.preventDefault();highlight(dropTarget(touch.source,document.elementFromPoint(e.clientX,e.clientY)));if(e.clientY<90)window.scrollBy(0,-14);else if(e.clientY>window.innerHeight-100)window.scrollBy(0,14);});
 document.addEventListener('pointerup',e=>{if(!touch||touch.id!==e.pointerId)return;const t=touch;touch=null;const target=dropTarget(t.source,document.elementFromPoint(e.clientX,e.clientY));highlight(null);if(t.moved){suppressClick=true;setTimeout(()=>suppressClick=false,400);if(target)dropOn(t.source,target);}else if(t.source.kind==='history')chooseSlot(t.source.id);else edit(t.source);});
 document.addEventListener('pointercancel',()=>{touch=null;highlight(null);});
 if(route().page==='calendar')render();
})();
