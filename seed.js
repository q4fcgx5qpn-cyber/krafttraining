/* Trainingsplan aus v0.3.1. */
window.KraftSeed={version:3,trainingDays:[
{id:"lower-a",name:"Montag – Lower A",exercises:[
{id:"skater",name:"Skater Jump",sets:3,reps:"4/Seite",rest:90,groupId:null,label:""},
{id:"swing",name:"Kettlebell Swing",sets:3,reps:"8–12",rest:90,groupId:null,label:""},
{id:"squat",name:"Back Squat",sets:4,reps:"4–6",rest:150,groupId:null,label:""},
{id:"bss",name:"Bulgarian Split Squat",sets:3,reps:"8–12/Bein",rest:120,groupId:null,label:""},
{id:"lunge",name:"Walking Lunges",sets:2,reps:"8–12/Bein",rest:90,groupId:null,label:""},
{id:"pallof",name:"Pallof Press",sets:3,reps:"10–15/Seite",rest:60,groupId:null,label:""}]},
{id:"upper-a",name:"Dienstag – Upper A",exercises:[
{id:"incline",name:"Schrägbank-KH",sets:4,reps:"8–12",rest:90,groupId:"ssa",label:"A1"},
{id:"row",name:"Langhantelrudern",sets:3,reps:"6–10",rest:90,groupId:"ssa",label:"A2"},
{id:"chin",name:"Chin-ups",sets:3,reps:"6–10",rest:90,groupId:"ssb",label:"B1"},
{id:"bench",name:"KH-Bankdrücken",sets:3,reps:"8–12",rest:90,groupId:"ssb",label:"B2"},
{id:"cable",name:"Einarmiges Kabelrudern",sets:2,reps:"10–15",rest:60,groupId:null,label:""},
{id:"dips",name:"Dips",sets:2,reps:"6–12",rest:90,groupId:null,label:""},
{id:"face",name:"Face Pull / Reverse Fly",sets:2,reps:"12–20",rest:60,groupId:null,label:""}]}],
exerciseLibrary:[],history:[],activeSession:null};

/* Aus „Krafttrainingsprogramm designen“: abschließende Tagestabelle,
   ergänzt um den später gewünschten Kabelrudern-Tausch für Upper B.
   Bei Satzspannen wird die Untergrenze als Anzahl der Eingabezeilen genutzt. */
window.KraftPlanAdditions=[
 {id:'lower-b',name:'Donnerstag – Lower B',exercises:[
  {id:'single-leg-bound',name:'Single-Leg Bound',sets:3,reps:'3/Bein',rest:90},
  {id:'hang-power-clean',name:'Hang Power Clean',sets:3,setsRange:'3–4',reps:'2–3',rest:150},
  {id:'deadlift',name:'Deadlift',sets:3,setsRange:'3–4',reps:'3–5',rest:180},
  {id:'front-squat',name:'Front Squat',sets:3,reps:'6–8',rest:120},
  {id:'single-leg-rdl',name:'Single-Leg RDL',sets:3,reps:'8–10/Bein',rest:90},
  {id:'hanging-leg-raise',name:'Hanging Leg Raise',sets:3,reps:'8–15',rest:60},
  {id:'side-plank',name:'Side Plank',sets:2,setsRange:'2–3',reps:'30–45 s/Seite',rest:60,unit:'seconds'}
 ]},
 {id:'upper-b',name:'Samstag – Upper B',exercises:[
  {id:'skater',name:'Skater Jump',sets:3,reps:'4/Seite',rest:90},
  {id:'swing',name:'Kettlebell Swing',sets:3,reps:'8–12',rest:90},
  {id:'incline',name:'Schrägbank-KH',sets:4,reps:'8–12',rest:90,groupId:'upper-b-a'},
  {id:'cable-row',name:'Kabelrudern',sets:3,reps:'6–10',rest:90,groupId:'upper-b-a'},
  {id:'chin',name:'Chin-ups',sets:3,setsRange:'3–4',reps:'6–10',rest:90,groupId:'upper-b-b'},
  {id:'bench',name:'KH-Bankdrücken',sets:3,reps:'8–12',rest:90,groupId:'upper-b-b'},
  {id:'cable',name:'Einarmiges Kabelrudern',sets:2,setsRange:'2–3',reps:'10–15/Seite',rest:60},
  {id:'dips',name:'Dips',sets:2,setsRange:'2–3',reps:'6–12',rest:90},
  {id:'face',name:'Face Pull / Reverse Fly',sets:2,reps:'12–20',rest:60},
  {id:'suitcase-carry',name:'Suitcase Carry',sets:3,reps:'30–40 s/Seite',rest:60,unit:'seconds'}
 ]}
];
