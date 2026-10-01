/* Data model: v0.3.1 trainingDays, extended with independent session snapshots. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Kraft = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const clone = x => JSON.parse(JSON.stringify(x));
  const uid = p => p + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  const text = x => String(x ?? '');
  function integer(x, fallback, max=100) {
    const n = Number(x); return Number.isInteger(n) && n >= 1 && n <= max ? n : fallback;
  }
  function exercise(x) {
    if (!x || typeof x !== 'object' || Array.isArray(x)) throw Error('Ungültige Übung.');
    return {...clone(x), id:text(x.id || uid('ex')), name:text(x.name || 'Übung'), sets:integer(x.sets,3),
      reps:text(x.reps), rest:Number.isFinite(+x.rest) && +x.rest >= 0 ? Math.min(3600,+x.rest) : 90,
      groupId:x.groupId ? text(x.groupId) : null, label:text(x.label || x.supersetLabel), unit:x.unit === 'seconds' || (!x.unit && /\b(s|sek|sekunden)\b/i.test(text(x.reps))) ? 'seconds' : 'reps'};
  }
  function groups(exercises) {
    const out=[];
    for (const x of exercises) {
      let g=x.groupId && out.find(g=>g.id===x.groupId);
      if (!g) { g={id:x.groupId || null,items:[]}; out.push(g); }
      g.items.push(x);
    }
    let n=0;
    return out.map(g=>({...g, sup:g.items.length>1 && !!g.id, letter:g.items.length>1 && g.id ? String.fromCharCode(65+n++) : ''}));
  }
  function arrange(exercises) {
    return groups(exercises).flatMap(g=>g.items.map((x,i)=>({...x,groupId:g.sup?g.id:null,label:g.sup?g.letter+(i+1):''})));
  }
  function sets(values, count=0) {
    if (values !== undefined && !Array.isArray(values)) throw Error('Ungültige Satzdaten.');
    return (values || Array.from({length:count},()=>({}))).map(s=>{
      if (!s || typeof s!=='object') throw Error('Ungültiger Satz.');
      return {...clone(s),weight:text(s.weight),reps:text(s.reps),done:s.done === true};
    });
  }
  function migrateV2(p) {
    const library=p.exercises.map(exercise), byId=id=>library.find(x=>x.id===String(id));
    const trainingDays=p.days.map(d=>{
      if (!Array.isArray(d.exerciseIds)) throw Error('Trainingstag ohne Übungsliste.');
      return {...clone(d),id:text(d.id||uid('day')),name:text(d.name||'Training'),exercises:d.exerciseIds.map(id=>{
        const x=byId(id); if(!x) throw Error('Übung im alten Backup fehlt: '+id); return clone(x);
      })};
    });
    const snapshot=items=>(items||[]).map(item=>{
      const x=byId(item.exerciseId) || exercise({id:item.exerciseId,name:item.name||'Frühere Übung'});
      return {...clone(x),note:text(item.note),values:sets(item.sets)};
    });
    return {version:4,trainingDays,exerciseLibrary:library,history:(p.history||[]).map(h=>({
      ...clone(h),id:text(h.id||uid('history')),dayName:trainingDays.find(d=>d.id===h.dayId)?.name||'Training',
      finishedAt:h.date||h.finishedAt,exercises:snapshot(h.exercises)
    })),activeSession:p.activeSession ? {...clone(p.activeSession),exercises:snapshot(p.activeSession.exercises)} : null};
  }
  function normalize(input) {
    if (!input || typeof input!=='object' || Array.isArray(input)) throw Error('Kein gültiges Backup.');
    if (Number(input.version)>4) throw Error('Dieses Backup stammt aus einer neueren App-Version.');
    let p=clone(input);
    if (Array.isArray(p.days) && Array.isArray(p.exercises)) p=migrateV2(p);
    if (!Array.isArray(p.trainingDays)) throw Error('Trainingstage fehlen im Backup.');
    if (p.history!==undefined && !Array.isArray(p.history)) throw Error('Ungültige Historie.');
    const dayIds=new Set();
    p.trainingDays=p.trainingDays.map(d=>{
      if (!d || !Array.isArray(d.exercises)) throw Error('Ungültiger Trainingstag.');
      const id=text(d.id||uid('day'));
      if(dayIds.has(id)) throw Error('Doppelte Trainingstag-ID.'); dayIds.add(id);
      const ids=new Set();
      const exercises=d.exercises.map(x=>{const e=exercise(x);if(ids.has(e.id))throw Error('Doppelte Übung in einem Trainingstag.');ids.add(e.id);return e;});
      return {...d,id,name:text(d.name||'Training'),exercises:arrange(exercises)};
    });
    if(p.blocks!==undefined){
      if(!Array.isArray(p.blocks)) throw Error('Ungültige Trainingsblöcke.');
      const ids=new Set();
      p.blocks=p.blocks.map(b=>{
        if(!b||!b.id||ids.has(b.id)||!Array.isArray(b.days)||!b.days.length||!Array.isArray(b.slots)||!/^\d{4}-\d{2}-\d{2}$/.test(b.startDate)) throw Error('Ungültiger Trainingsblock.');
        ids.add(b.id);
        const days=b.days.map(d=>({...d,exercises:arrange(d.exercises.map(exercise))}));
        const slots=new Set();
        for(const slot of b.slots){if(!slot.id||slots.has(slot.id)||!days.some(d=>d.id===slot.dayId)||(!Number.isInteger(slot.round)||slot.round<1||slot.round>52)||slot.plannedDate&&!/^\d{4}-\d{2}-\d{2}$/.test(slot.plannedDate))throw Error('Ungültige Blockeinheit.');slots.add(slot.id);}
        return {...b,days};
      });
      if(p.blocks.filter(b=>!b.closedAt&&!b.queued).length>1)throw Error('Mehrere aktive Trainingsblöcke.');
    }
    if(p.nextBlock){const draft=normalize({trainingDays:[],history:[],blocks:[p.nextBlock]});p.nextBlock=draft.blocks[0];if(p.nextBlock.closedAt)throw Error('Ungültige Blockvorbereitung.');}
    if(p.plannedExtras!==undefined){
      if(!Array.isArray(p.plannedExtras))throw Error('Ungültige Zusatzplanung.');
      const ids=new Set();p.plannedExtras=p.plannedExtras.map(x=>{
        if(!x||!x.id||ids.has(x.id)||!x.day||!Array.isArray(x.day.exercises)||x.plannedDate&&!validPlanDate(x.plannedDate))throw Error('Ungültige Zusatzeinheit.');
        ids.add(x.id);return {...x,day:{...x.day,exercises:arrange(x.day.exercises.map(exercise))}};
      });
    }
    const find=id=>p.trainingDays.flatMap(d=>d.exercises).find(x=>x.id===id);
    function session(s, active=false) {
      const d=p.trainingDays.find(d=>d.id===s.dayId);
      let exercises;
      if (Array.isArray(s.exercises)) exercises=s.exercises.map(x=>({...exercise(x),values:sets(x.values),note:text(x.note)}));
      else {
        const entries=s.entries||{};
        const originals=active ? d?.exercises || [] : Object.keys(entries).map(id=>find(id)||{id,name:'Frühere Übung',sets:entries[id]?.length});
        exercises=originals.map(x=>({...exercise(x),values:sets(entries[x.id],active?x.sets:0),note:''}));
        if(!active) exercises.forEach(x=>x.values.forEach(v=>{if(v.weight!==''||v.reps!=='')v.done=true;}));
      }
      return {...s,id:text(s.id||uid(active?'session':'history')),dayName:text(s.dayName||d?.name||'Training'),
        exercises:arrange(exercises),index:Math.max(0,Math.min(Number(s.index)||0,exercises.length-1))};
    }
    p.history=(p.history||[]).map(h=>session(h));
    p.activeSession=p.activeSession ? session(p.activeSession,true) : null;
    const library=[];
    for (let x of p.exerciseLibrary||[]) {
      if(typeof x==='string')x={name:x};
      const e=exercise(x); if(!library.some(y=>y.id===e.id||y.name===e.name))library.push(e);
    }
    for(const x of p.trainingDays.flatMap(d=>d.exercises)) if(!library.some(y=>y.id===x.id||y.name===x.name)) library.push(clone(x));
    return {...p,version:4,exerciseLibrary:library};
  }
  function previous(db, ex) {
    const hs=[...db.history].sort((a,b)=>new Date(b.finishedAt||b.date)-new Date(a.finishedAt||a.date));
    for(const h of hs) {
      const found=h.exercises.find(x=>x.id===ex.id||x.name===ex.name);
      if(found && found.values.some(v=>v.done))return {date:h.finishedAt||h.date,values:found.values.filter(v=>v.done)};
    }
    return ex.last ? {date:null,values:[{weight:text(ex.last.weight),reps:text(ex.last.reps),done:true}]} : null;
  }
  function item(db,x) {
    const prev=previous(db,x);
    return {...clone(x),note:'',values:Array.from({length:x.sets},(_,i)=>({
      weight:prev?.values[i]?.weight ?? prev?.values.at(-1)?.weight ?? '',
      reps:prev?.values[i]?.reps ?? prev?.values.at(-1)?.reps ?? '',done:false
    }))};
  }
  function start(db,day) {
    return {id:uid('session'),dayId:day.id,dayName:day.name,startedAt:new Date().toISOString(),index:0,exercises:day.exercises.map(x=>item(db,x))};
  }
  function nextPartner(session,index) {
    const current=session.exercises[index];
    if(!current?.groupId)return index;
    const members=session.exercises.map((x,i)=>({x,i})).filter(o=>o.x.groupId===current.groupId);
    const at=members.findIndex(o=>o.i===index);
    for(let step=1;step<=members.length;step++) {
      const o=members[(at+step)%members.length];
      if(o.x.values.some(v=>!v.done)) return o.i;
    }
    return index;
  }
  function setSessionGroup(session, memberIds) {
    const current=session.exercises[session.index];
    if(!current) throw Error('Keine aktuelle Übung.');
    const selected=new Set(memberIds);
    if(!selected.has(current.id) || [...selected].some(id=>!session.exercises.some(x=>x.id===id))) throw Error('Ungültige Supersatz-Auswahl.');
    const oldGroup=current.groupId, groupId=selected.size>1 ? oldGroup||uid('superset') : null;
    for(const x of session.exercises) {
      if(selected.has(x.id)) x.groupId=groupId;
      else if(oldGroup && x.groupId===oldGroup) x.groupId=null;
    }
    session.exercises=arrange(session.exercises);
    session.index=session.exercises.findIndex(x=>x.id===current.id);
    delete session.restUntil;
  }
  function applyPlanUpdate(db, additions) {
    const update='lower-upper-b-2026-09';
    if(Array.isArray(db.appliedUpdates)&&db.appliedUpdates.includes(update))return db;
    for(const day of additions) {
      const token=day.id==='lower-b' ? /\blower[\s_-]*b\b/i : /\bupper[\s_-]*b\b/i;
      if(!db.trainingDays.some(d=>d.id===day.id || token.test(d.name))) {
        const copy=clone(day);copy.exercises=arrange(copy.exercises.map(exercise));
        db.trainingDays.push(copy);
        for(const x of copy.exercises) if(!db.exerciseLibrary.some(e=>e.id===x.id||e.name===x.name))db.exerciseLibrary.push(clone(x));
      }
    }
    db.appliedUpdates=[...(Array.isArray(db.appliedUpdates)?db.appliedUpdates:[]),update];
    return db;
  }
  function newBlock(days, name, startDate) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(startDate)||Number.isNaN(new Date(startDate+'T12:00:00').getTime())) throw Error('Bitte ein gültiges Startdatum wählen.');
    if(!days.length || days.some(d=>!d.exercises.length)) throw Error('Bitte Trainingstage mit Übungen auswählen.');
    return {id:uid('block'),name:name||'Trainingsblock',startDate,days:clone(days),slots:Array.from({length:3},(_,round)=>days.map(d=>({id:uid('slot'),dayId:d.id,round:round+1,plannedDate:''}))).flat(),closedAt:null};
  }
  function blockProgress(db,b) {
    const completed=new Map();
    for(const h of db.history) if(h.blockId===b.id && b.slots.some(s=>s.id===h.slotId)) completed.set(h.slotId,h);
    return {completed,next:b.slots.find(s=>!completed.has(s.id)),total:b.slots.length};
  }
  function planningBlock(db,id){const b=(db.blocks||[]).find(b=>b.id===id)|| (db.nextBlock?.id===id?db.nextBlock:null);if(!b)throw Error('Block nicht gefunden.');return b;}
  function validPlanDate(day){return /^\d{4}-\d{2}-\d{2}$/.test(day)&&!Number.isNaN(Date.parse(day))&&new Date(day).toISOString().slice(0,10)===day;}
  function moveBlock(db,id,day){
    const b=planningBlock(db,id);if(!validPlanDate(day))throw Error('Bitte ein gültiges Datum wählen.');
    if(db.activeSession?.blockId===id)throw Error('Bitte zuerst die laufende Einheit abschließen.');
    const offset=Date.parse(day)-Date.parse(b.startDate),done=blockProgress(db,b).completed;
    for(const s of b.slots)if(s.plannedDate&&!done.has(s.id))s.plannedDate=new Date(Date.parse(s.plannedDate)+offset).toISOString().slice(0,10);
    b.startDate=day;return b;
  }
  function deleteBlock(db,id){
    planningBlock(db,id);if(db.activeSession?.blockId===id)throw Error('Bitte zuerst die laufende Einheit abschließen.');
    if(db.nextBlock?.id===id)delete db.nextBlock;else db.blocks=db.blocks.filter(b=>b.id!==id);
  }
  function planSlot(db,id,slotId,day){
    const b=planningBlock(db,id),slot=b.slots.find(s=>s.id===slotId);
    if(!slot||b.closedAt||blockProgress(db,b).completed.has(slotId)||db.activeSession?.slotId===slotId)throw Error('Diese Einheit kann nicht verschoben werden.');
    if(day&&!validPlanDate(day))throw Error('Bitte ein gültiges Datum wählen.');slot.plannedDate=day;
  }
  function startSlot(db,b,slotId) {
    if(db.activeSession) throw Error('Bitte zuerst die laufende Einheit abschließen oder verwerfen.');
    const slot=b.slots.find(s=>s.id===slotId);
    if(b.closedAt||b.queued||!slot||blockProgress(db,b).completed.has(slotId)) throw Error('Diese Einheit ist nicht offen.');
    return {...start(db,b.days.find(d=>d.id===slot.dayId)),blockId:b.id,slotId:slot.id};
  }
  return {clone,uid,exercise,groups,arrange,normalize,migrateV2,previous,item,start,nextPartner,setSessionGroup,applyPlanUpdate,newBlock,blockProgress,startSlot,planningBlock,moveBlock,deleteBlock,planSlot};
});
