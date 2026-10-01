/* Cycle editor keeps all changes in a draft until the user saves. */
let cycleDraft=null,cycleDrag=null,cycleSelectedDay=null,cycleEditingSlot=null,cycleUndo=[],cycleInitialized=false;
const cycleDate=(day,offset)=>{const d=new Date(day+'T12:00:00');d.setDate(d.getDate()+offset);return localDay(d);};
const cycleWeeks=b=>b.durationWeeks||Math.max(3,...b.slots.map(s=>s.plannedDate?Math.floor((Date.parse(s.plannedDate)-Date.parse(b.startDate))/604800000)+1:3));
function cycleCards(){
 const all=[...(db.blocks||[]),...(db.nextBlock?[db.nextBlock]:[])];
 return `<div class="section-title"><div><h2>Deine Trainingszyklen</h2><p class="muted">Ein Plan für die nächsten Wochen.</p></div></div>`+all.map(b=>{const p=K.blockProgress(db,b),weeks=cycleWeeks(b);return `<section class="card planning-card cycle-summary"><div class="section-title"><div><span class="eyebrow">${b.closedAt?'Abgeschlossen':b.queued||b===db.nextBlock?'Geplant':'Aktuell'}</span><h2>${esc(b.name)}</h2></div><span class="pill">${p.completed.size} / ${p.total} erledigt</span></div><p>${date(b.startDate+'T12:00:00',true)} – ${date(cycleDate(b.startDate,weeks*7-1)+'T12:00:00',true)} · ${weeks} Wochen · ${b.sessionsPerWeek||Math.ceil(p.total/weeks)} Einheiten / Woche</p><p class="muted">${b.days.map(d=>esc(d.name)).join(' · ')}</p><progress value="${p.completed.size}" max="${Math.max(1,p.total)}" aria-label="Fortschritt"></progress><div class="cycle-actions">${!b.closedAt?button('cycle-edit','Bearbeiten','secondary',`data-id="${esc(b.id)}"`):''}${b.queued||b===db.nextBlock?button('cycle-activate','Zyklus starten','primary',`data-id="${esc(b.id)}"`):!b.closedAt?button('close-block','Abschließen','ghost'):''}${button('plan-delete-block','Löschen','danger-ghost',`data-id="${esc(b.id)}"`)}</div></section>`;}).join('')+(!all.length?'<section class="card empty"><h3>Platz für deinen nächsten Trainingszyklus</h3><p class="muted">Wähle deine Trainingstage und verteile sie auf deine Wochen.</p></section>':'');
}
function cycleOpen(id){
 const b=id?K.planningBlock(db,id):null;
 if(b&&db.activeSession?.blockId===id)return toast('Bitte zuerst das laufende Training abschließen.');
 cycleDraft=b?K.clone(b):{id:K.uid('block'),name:'Trainingszyklus '+((db.blocks||[]).length+1),startDate:localDay(),durationWeeks:4,sessionsPerWeek:4,days:K.clone(db.trainingDays.filter(d=>d.exercises.length)),slots:[],closedAt:null};
 cycleDraft.durationWeeks=cycleWeeks(cycleDraft);cycleDraft.sessionsPerWeek ||= Math.max(1,Math.ceil(cycleDraft.slots.length/cycleDraft.durationWeeks));cycleDraft.editing=!!b;
 cycleSelectedDay=cycleDraft.days[0]?.id;cycleEditingSlot=null;cycleUndo=[];cycleInitialized=!!b;
 cycleBasics();
}
function cycleBasics(){
 const b=cycleDraft,choices=[...b.days,...db.trainingDays.filter(d=>!b.days.some(x=>x.id===d.id))];
 openDialog(b.editing?'Trainingszyklus bearbeiten':'Neuer Trainingszyklus',`<p class="eyebrow">1 · Grunddaten &nbsp; / &nbsp; 2 · Einheiten verteilen</p><form id="cycleBasics"><label>Name<input name="name" required maxlength="80" value="${esc(b.name)}"></label><div class="form-grid"><label>Startdatum<input name="start" type="date" required value="${b.startDate}"></label><label>Dauer in Wochen<input name="weeks" type="number" min="1" max="52" required value="${b.durationWeeks}"></label><label>Einheiten pro Woche<input name="count" type="number" min="1" max="14" required value="${b.sessionsPerWeek}"></label></div><h3>Trainingstage auswählen</h3><p class="muted">Die ausgewählten Tage wechseln sich im Vorschlag ab.</p><div class="cycle-choices">${choices.map(d=>`<label class="group-choice"><input type="checkbox" name="day" value="${esc(d.id)}" ${b.days.some(x=>x.id===d.id)?'checked':''} ${!d.exercises.length?'disabled':''}><span>${esc(d.name)}${!d.exercises.length?' (ohne Übungen)':''}</span></label>`).join('')}</div><p id="cycleError" role="alert"></p><button class="btn primary full">Weiter zur Wochenplanung →</button></form>`);
 document.querySelector('#dialog').classList.add('cycle-dialog');
}
function cycleLocked(s){return db.history.some(h=>h.blockId===cycleDraft.id&&h.slotId===s.id);}
function cycleBoard(){
 const b=cycleDraft,dialog=document.querySelector('#dialog'),scroll=dialog.scrollTop,onBoard=!!dialog.querySelector('.cycle-board'),focused=document.activeElement?.dataset.cycleFocus;
 if(!b.days.some(d=>d.id===cycleSelectedDay))cycleSelectedDay=b.days[0]?.id;
 const end=cycleDate(b.startDate,b.durationWeeks*7-1),outside=b.slots.filter(s=>!s.plannedDate||s.plannedDate<b.startDate||s.plannedDate>end);
 openDialog('Deine Wochenplanung',`<div class="cycle-intro"><p class="eyebrow">2 · Einheiten verteilen</p><p class="muted">Trainingstag wählen und mit + einsetzen. Zum Verschieben am Griff ziehen oder „Verschieben“ antippen.</p></div><div class="cycle-toolbar"><label>Trainingstag hinzufügen<select id="cycleDayChoice">${b.days.map(d=>`<option value="${esc(d.id)}" ${d.id===cycleSelectedDay?'selected':''}>${esc(d.name)}</option>`).join('')}</select></label><div class="cycle-total" aria-live="polite"><strong>${b.slots.length} Einheiten</strong><small>Ziel: ${b.sessionsPerWeek} pro Woche</small></div></div><div class="cycle-board">${Array.from({length:b.durationWeeks},(_,i)=>{
 const start=cycleDate(b.startDate,i*7),ss=b.slots.filter(s=>s.plannedDate>=start&&s.plannedDate<=cycleDate(start,6));
 return `<section class="cycle-week" data-cycle-week="${i}"><div class="cycle-week-heading"><h3>Woche ${i+1}</h3><span>${date(start+'T12:00:00')} – ${date(cycleDate(start,6)+'T12:00:00')}</span><span class="pill">${ss.length} / ${b.sessionsPerWeek}</span></div><div class="cycle-days">${Array.from({length:7},(_,j)=>{
 const day=cycleDate(start,j),label=new Date(day+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'numeric'});
 return `<section class="cycle-day" data-cycle-drop="${day}" aria-label="${label}"><strong class="cycle-day-heading">${label}</strong><div class="cycle-day-items">${ss.filter(s=>s.plannedDate===day).map(cycleTile).join('')}${button('cycle-add','+','cycle-add',`data-date="${day}" data-cycle-focus="add-${day}" aria-label="Einheit am ${day} hinzufügen"`)}</div></section>`;
 }).join('')}</div></section>`;
 }).join('')}</div>${outside.length?`<details class="cycle-outside" open><summary>${outside.length} ${outside.length===1?'Einheit':'Einheiten'} ohne Termin im Zykluszeitraum</summary><div class="cycle-outside-items">${outside.map(cycleTile).join('')}</div></details>`:''}<div class="cycle-footer"><div>${button('cycle-back','← Grunddaten','secondary')}${cycleUndo.length?button('cycle-undo','↶ Rückgängig','ghost'):''}</div>${button('cycle-save','Zyklus speichern','primary')}</div>`);
 dialog.classList.add('cycle-dialog','cycle-board-dialog');dialog.scrollTop=onBoard?scroll:0;
 if(focused){const target=[...dialog.querySelectorAll('[data-cycle-focus]')].find(n=>n.dataset.cycleFocus===focused);target?.focus({preventScroll:true});}
}
function cycleTile(s){
 const locked=cycleLocked(s),name=cycleDraft.days.find(d=>d.id===s.dayId)?.name||'Training',editing=cycleEditingSlot===s.id;
 return `<div class="cycle-tile ${locked?'cycle-completed':''}" data-cycle-tile="${esc(s.id)}"><div class="cycle-tile-main"><button type="button" class="cycle-grip" draggable="${!locked}" data-cycle-slot="${esc(s.id)}" aria-label="${esc(name)} ziehen" ${locked?'disabled':''}>${locked?'✓':'⠿'}</button><strong>${esc(name)}</strong>${!locked?button('cycle-remove','×','cycle-remove',`data-id="${esc(s.id)}" aria-label="${esc(name)} entfernen"`):''}</div>${locked?'<small>Absolviert</small>':button('cycle-move',editing?'Schließen':'Verschieben','cycle-move',`data-id="${esc(s.id)}" data-cycle-focus="move-${esc(s.id)}" aria-expanded="${editing}"`)}${editing&&!locked?`<label class="cycle-date-editor">Neuer Termin<input type="date" aria-label="Trainingstermin" data-cycle-date="${esc(s.id)}" value="${esc(s.plannedDate||'')}"></label>`:''}</div>`;
}
function cycleRemember(){cycleUndo.push(K.clone(cycleDraft.slots));if(cycleUndo.length>30)cycleUndo.shift();}
function cyclePlace(id,week,day){
 const s=cycleDraft?.slots.find(s=>s.id===id);if(!s||cycleLocked(s))return;
 if(!day){const start=cycleDate(cycleDraft.startDate,Number(week)*7);let n=0;while(n<6&&cycleDraft.slots.some(x=>x.id!==id&&x.plannedDate===cycleDate(start,n)))n++;day=cycleDate(start,n);}
 if(s.plannedDate===day)return;cycleRemember();s.plannedDate=day;cycleEditingSlot=null;cycleBoard();
}
document.addEventListener('submit',e=>{
 if(e.target.id!=='cycleBasics')return;e.preventDefault();
 const f=new FormData(e.target),b=cycleDraft,ids=f.getAll('day'),weeks=Number(f.get('weeks')),count=Number(f.get('count')),start=String(f.get('start'));
 const choices=[...b.days,...db.trainingDays.filter(d=>!b.days.some(x=>x.id===d.id))],days=choices.filter(d=>ids.includes(d.id));
 if(!days.length||!Number.isInteger(weeks)||weeks<1||weeks>52||!Number.isInteger(count)||count<1||count>14||!/^\d{4}-\d{2}-\d{2}$/.test(start)){document.querySelector('#cycleError').textContent='Bitte gültige Grunddaten und mindestens einen Trainingstag auswählen.';return;}
 const locked=b.slots.filter(cycleLocked);if(locked.some(s=>!ids.includes(s.dayId))){document.querySelector('#cycleError').textContent='Absolvierte Einheiten müssen im Zyklus enthalten bleiben. Bitte Trainingstage und Dauer entsprechend wählen.';return;}
 // Generate only once. Returning to the basics must never restore deleted units.
 if(!cycleInitialized){
  b.slots=Array.from({length:weeks*count},(_,index)=>({id:K.uid('slot'),dayId:days[index%days.length].id,round:Math.floor(index/count)+1,plannedDate:cycleDate(start,Math.floor(index/count)*7+Math.floor((index%count)*7/count))}));cycleInitialized=true;
 }else{
  b.slots=b.slots.filter(s=>ids.includes(s.dayId));
  if(start!==b.startDate){const offset=Math.round((Date.parse(start)-Date.parse(b.startDate))/86400000);b.slots.forEach(s=>{if(s.plannedDate&&!cycleLocked(s))s.plannedDate=cycleDate(s.plannedDate,offset);});}
 }
 cycleUndo=[];cycleEditingSlot=null;
 Object.assign(b,{name:String(f.get('name')).trim()||'Trainingszyklus',startDate:start,durationWeeks:weeks,sessionsPerWeek:count,days:K.clone(days)});cycleBoard();
});
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-a]');if(!el)return;const a=el.dataset.a;
 if(a==='create-block'||a==='cycle-new'){e.stopImmediatePropagation();cycleOpen();}
 if(a==='cycle-edit')cycleOpen(el.dataset.id);
 if(a==='cycle-back'){document.querySelector('#dialog').classList.remove('cycle-board-dialog');cycleBasics();}
 if(a==='cycle-add'){
  if(!cycleDraft?.days.some(d=>d.id===cycleSelectedDay))return;
  cycleRemember();cycleDraft.slots.push({id:K.uid('slot'),dayId:cycleSelectedDay,round:Math.min(52,Math.max(1,Math.floor((Date.parse(el.dataset.date)-Date.parse(cycleDraft.startDate))/604800000)+1)),plannedDate:el.dataset.date});cycleBoard();
 }
 if(a==='cycle-remove'){
  const s=cycleDraft?.slots.find(s=>s.id===el.dataset.id);if(!s||cycleLocked(s))return;
  cycleRemember();cycleDraft.slots=cycleDraft.slots.filter(x=>x.id!==s.id);cycleEditingSlot=null;cycleBoard();
  const next=[...document.querySelectorAll('[data-a="cycle-add"]')].find(n=>n.dataset.date===s.plannedDate);next?.focus({preventScroll:true});
 }
 if(a==='cycle-undo'&&cycleUndo.length){cycleDraft.slots=cycleUndo.pop();cycleEditingSlot=null;cycleBoard();}
 if(a==='cycle-move'){cycleEditingSlot=cycleEditingSlot===el.dataset.id?null:el.dataset.id;cycleBoard();}
 if(a==='cycle-save'){
  const previous=K.clone(db),b=K.clone(cycleDraft);delete b.editing;
  b.slots.sort((a,c)=>(a.plannedDate||'9999').localeCompare(c.plannedDate||'9999'));
  if(db.nextBlock?.id===b.id)db.nextBlock=b;
  else {const index=(db.blocks||=[]).findIndex(x=>x.id===b.id);if(index>=0)db.blocks[index]=b;else{b.queued=!!activeBlock();db.blocks.push(b);}}
  if(!save()){db=previous;return;}closeDialog();cycleDraft=null;render();toast('Trainingszyklus gespeichert.');
 }
 if(a==='cycle-activate'){
  if(db.activeSession)return toast('Bitte zuerst das laufende Training abschließen.');
  if(activeBlock()&&!confirm('Aktuellen Zyklus abschließen und diesen Zyklus starten?'))return;
  const previous=K.clone(db),b=K.planningBlock(db,el.dataset.id),active=activeBlock();if(active)active.closedAt=new Date().toISOString();b.queued=false;if(db.nextBlock===b){db.blocks.push(b);delete db.nextBlock;}if(!save()){db=previous;return;}render();
 }
},true);
document.addEventListener('change',e=>{if(e.target.id==='cycleDayChoice'){cycleSelectedDay=e.target.value;return;}const id=e.target.dataset.cycleDate;if(!id)return;const s=cycleDraft.slots.find(s=>s.id===id);if(s&&!cycleLocked(s)){cycleRemember();s.plannedDate=e.target.value;cycleEditingSlot=null;cycleBoard();}});
document.addEventListener('dragstart',e=>{const el=e.target.closest('.cycle-grip');if(!el||el.disabled)return;cycleDrag=el.dataset.cycleSlot;e.dataTransfer.setData('text/plain',cycleDrag);e.dataTransfer.effectAllowed='move';});
function cycleHighlight(target){document.querySelectorAll('.cycle-drop-active').forEach(n=>n.classList.remove('cycle-drop-active'));target?.classList.add('cycle-drop-active');}
document.addEventListener('dragover',e=>{if(cycleDrag&&e.target.closest('[data-cycle-week]')){e.preventDefault();cycleHighlight(e.target.closest('[data-cycle-drop]'));}});
document.addEventListener('drop',e=>{const el=e.target.closest('[data-cycle-week]');if(cycleDrag&&el){e.preventDefault();cyclePlace(cycleDrag,el.dataset.cycleWeek,e.target.closest('[data-cycle-drop]')?.dataset.cycleDrop);}cycleDrag=null;cycleHighlight(null);});
document.addEventListener('dragend',()=>{cycleDrag=null;cycleHighlight(null);});
let cycleTouch=null;
document.addEventListener('pointerdown',e=>{const el=e.target.closest('.cycle-grip');if(!el||el.disabled||e.pointerType==='mouse')return;cycleTouch={id:el.dataset.cycleSlot,pointer:e.pointerId,x:e.clientX,y:e.clientY,moved:false};el.setPointerCapture?.(e.pointerId);});
document.addEventListener('pointermove',e=>{if(!cycleTouch||cycleTouch.pointer!==e.pointerId)return;if(Math.hypot(e.clientX-cycleTouch.x,e.clientY-cycleTouch.y)>8)cycleTouch.moved=true;if(!cycleTouch.moved)return;e.preventDefault();cycleHighlight(document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-cycle-drop]'));const dialog=document.querySelector('#dialog'),r=dialog.getBoundingClientRect();if(e.clientY>r.bottom-80)dialog.scrollTop+=18;if(e.clientY<r.top+80)dialog.scrollTop-=18;});
document.addEventListener('pointerup',e=>{if(!cycleTouch||cycleTouch.pointer!==e.pointerId)return;const target=document.elementFromPoint(e.clientX,e.clientY),el=target?.closest('[data-cycle-week]');if(cycleTouch.moved&&el)cyclePlace(cycleTouch.id,el.dataset.cycleWeek,target?.closest('[data-cycle-drop]')?.dataset.cycleDrop);cycleTouch=null;cycleHighlight(null);});
document.addEventListener('pointercancel',()=>{cycleTouch=null;cycleHighlight(null);});
document.querySelector('#dialog').addEventListener('close',()=>{document.querySelector('#dialog').classList.remove('cycle-dialog','cycle-board-dialog');cycleDrag=null;cycleTouch=null;});
