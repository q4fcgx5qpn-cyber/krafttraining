/* Cycle editor keeps all changes in a draft until the user saves. */
let cycleDraft=null,cycleDrag=null;
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
 cycleBasics();
}
function cycleBasics(){
 const b=cycleDraft,choices=[...b.days,...db.trainingDays.filter(d=>!b.days.some(x=>x.id===d.id))];
 openDialog(b.editing?'Trainingszyklus bearbeiten':'Neuer Trainingszyklus',`<p class="eyebrow">1 · Grunddaten &nbsp; / &nbsp; 2 · Einheiten verteilen</p><form id="cycleBasics"><label>Name<input name="name" required maxlength="80" value="${esc(b.name)}"></label><div class="form-grid"><label>Startdatum<input name="start" type="date" required value="${b.startDate}"></label><label>Dauer in Wochen<input name="weeks" type="number" min="1" max="52" required value="${b.durationWeeks}"></label><label>Einheiten pro Woche<input name="count" type="number" min="1" max="14" required value="${b.sessionsPerWeek}"></label></div><h3>Trainingstage auswählen</h3><p class="muted">Die ausgewählten Tage wechseln sich im Vorschlag ab.</p><div class="cycle-choices">${choices.map(d=>`<label class="group-choice"><input type="checkbox" name="day" value="${esc(d.id)}" ${b.days.some(x=>x.id===d.id)?'checked':''} ${!d.exercises.length?'disabled':''}><span>${esc(d.name)}${!d.exercises.length?' (ohne Übungen)':''}</span></label>`).join('')}</div><p id="cycleError" role="alert"></p><button class="btn primary full">Weiter zur Wochenplanung →</button></form>`);
 document.querySelector('#dialog').classList.add('cycle-dialog');
}
function cycleLocked(s){return db.history.some(h=>h.blockId===cycleDraft.id&&h.slotId===s.id);}
function cycleBoard(){
 const b=cycleDraft;
 openDialog('Einheiten verteilen',`<p class="eyebrow">2 · Wochenplanung</p><p class="muted">${esc(b.name)} · Ziehe am Griff ⠿, um Einheiten zu verschieben. Alternativ wähle direkt an der Einheit ein Datum.</p><div class="cycle-board">${Array.from({length:b.durationWeeks},(_,i)=>{const start=cycleDate(b.startDate,i*7),end=cycleDate(start,6),ss=b.slots.filter(s=>s.plannedDate>=start&&s.plannedDate<=end);return `<section class="cycle-week" data-cycle-week="${i}"><div class="section-title"><h3>Woche ${i+1}</h3><span class="pill">${ss.length} / ${b.sessionsPerWeek}</span></div><p class="muted">${date(start+'T12:00:00')} – ${date(end+'T12:00:00')}</p>${ss.map(cycleTile).join('')||'<p class="cycle-empty">Einheiten hier ablegen</p>'}</section>`;}).join('')}</div>${b.slots.some(s=>!s.plannedDate||s.plannedDate<b.startDate||s.plannedDate>cycleDate(b.startDate,b.durationWeeks*7-1))?`<details open><summary>Weitere Einheiten zuordnen</summary>${b.slots.filter(s=>!s.plannedDate||s.plannedDate<b.startDate||s.plannedDate>cycleDate(b.startDate,b.durationWeeks*7-1)).map(cycleTile).join('')}</details>`:''}<div class="cycle-footer">${button('cycle-back','← Grunddaten','secondary')}${button('cycle-save','Trainingszyklus speichern','primary')}</div>`);
 document.querySelector('#dialog').classList.add('cycle-dialog');
}
function cycleTile(s){const locked=cycleLocked(s);return `<div class="cycle-tile"><button type="button" class="cycle-grip" draggable="${!locked}" data-cycle-slot="${s.id}" aria-label="Einheit verschieben" ${locked?'disabled':''}>${locked?'✓':'⠿'}</button><div><strong>${esc(cycleDraft.days.find(d=>d.id===s.dayId)?.name||'Training')}</strong><label>${locked?'Absolviert':'Trainingstermin'}<input type="date" aria-label="Trainingstermin" data-cycle-date="${s.id}" value="${s.plannedDate||''}" ${locked?'disabled':''}></label></div></div>`;}
function cyclePlace(id,week){const s=cycleDraft?.slots.find(s=>s.id===id);if(!s||cycleLocked(s))return;const start=cycleDate(cycleDraft.startDate,Number(week)*7);let n=0;while(n<6&&cycleDraft.slots.some(x=>x.id!==id&&x.plannedDate===cycleDate(start,n)))n++;s.plannedDate=cycleDate(start,n);cycleBoard();}
document.addEventListener('submit',e=>{
 if(e.target.id!=='cycleBasics')return;e.preventDefault();
 const f=new FormData(e.target),b=cycleDraft,ids=f.getAll('day'),weeks=Number(f.get('weeks')),count=Number(f.get('count')),start=String(f.get('start'));
 const choices=[...b.days,...db.trainingDays.filter(d=>!b.days.some(x=>x.id===d.id))],days=choices.filter(d=>ids.includes(d.id));
 if(!days.length||!Number.isInteger(weeks)||weeks<1||weeks>52||!Number.isInteger(count)||count<1||count>14||!/^\d{4}-\d{2}-\d{2}$/.test(start)){document.querySelector('#cycleError').textContent='Bitte gültige Grunddaten und mindestens einen Trainingstag auswählen.';return;}
 const locked=b.slots.filter(cycleLocked);if(locked.some(s=>!ids.includes(s.dayId))||locked.length>weeks*count){document.querySelector('#cycleError').textContent='Absolvierte Einheiten müssen im Zyklus enthalten bleiben. Bitte Trainingstage und Dauer entsprechend wählen.';return;}
 const changed=weeks!==b.durationWeeks||count!==b.sessionsPerWeek||days.map(d=>d.id).join()!==b.days.map(d=>d.id).join();
 if(changed||!b.slots.length){const old=b.slots.filter(s=>!cycleLocked(s)&&ids.includes(s.dayId));b.slots=[...locked,...Array.from({length:weeks*count-locked.length},(_,i)=>{const prior=old[i],index=i+locked.length;return {id:prior?.id||K.uid('slot'),dayId:prior?.dayId||days[index%days.length].id,round:Math.floor(index/count)+1,plannedDate:cycleDate(start,Math.floor(index/count)*7+Math.floor((index%count)*7/count))};})];}
 else if(start!==b.startDate){const offset=Math.round((Date.parse(start)-Date.parse(b.startDate))/86400000);b.slots.forEach(s=>{if(s.plannedDate&&!cycleLocked(s))s.plannedDate=cycleDate(s.plannedDate,offset);});}
 Object.assign(b,{name:String(f.get('name')).trim()||'Trainingszyklus',startDate:start,durationWeeks:weeks,sessionsPerWeek:count,days:K.clone(days)});cycleBoard();
});
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-a]');if(!el)return;const a=el.dataset.a;
 if(a==='create-block'||a==='cycle-new'){e.stopImmediatePropagation();cycleOpen();}
 if(a==='cycle-edit')cycleOpen(el.dataset.id);
 if(a==='cycle-back')cycleBasics();
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
document.addEventListener('change',e=>{const id=e.target.dataset.cycleDate;if(!id)return;const s=cycleDraft.slots.find(s=>s.id===id);if(!cycleLocked(s)){s.plannedDate=e.target.value;cycleBoard();}});
document.addEventListener('dragstart',e=>{const el=e.target.closest('.cycle-grip');if(!el||el.disabled)return;cycleDrag=el.dataset.cycleSlot;e.dataTransfer.setData('text/plain',cycleDrag);e.dataTransfer.effectAllowed='move';});
document.addEventListener('dragover',e=>{if(cycleDrag&&e.target.closest('[data-cycle-week]'))e.preventDefault();});
document.addEventListener('drop',e=>{const el=e.target.closest('[data-cycle-week]');if(cycleDrag&&el){e.preventDefault();cyclePlace(cycleDrag,el.dataset.cycleWeek);}cycleDrag=null;});
document.addEventListener('dragend',()=>cycleDrag=null);
let cycleTouch=null;
document.addEventListener('pointerdown',e=>{const el=e.target.closest('.cycle-grip');if(!el||el.disabled||e.pointerType==='mouse')return;cycleTouch={id:el.dataset.cycleSlot,pointer:e.pointerId};el.setPointerCapture?.(e.pointerId);});
document.addEventListener('pointermove',e=>{if(!cycleTouch)return;e.preventDefault();const dialog=document.querySelector('#dialog'),r=dialog.getBoundingClientRect();if(e.clientY>r.bottom-80)dialog.scrollTop+=18;if(e.clientY<r.top+80)dialog.scrollTop-=18;});
document.addEventListener('pointerup',e=>{if(!cycleTouch)return;const el=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-cycle-week]');if(el)cyclePlace(cycleTouch.id,el.dataset.cycleWeek);cycleTouch=null;});
document.addEventListener('pointercancel',()=>cycleTouch=null);
document.querySelector('#dialog').addEventListener('close',()=>{document.querySelector('#dialog').classList.remove('cycle-dialog');cycleDrag=null;cycleTouch=null;});
