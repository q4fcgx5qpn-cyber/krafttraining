/* Pure three-way merge: no clocks, credentials, browser or network dependency. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KraftSync=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
 const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 function equal(a,b){if(a===b)return true;if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((x,i)=>equal(x,b[i]));if(object(a)&&object(b)){const ak=Object.keys(a),bk=Object.keys(b);return ak.length===bk.length&&ak.every(k=>Object.hasOwn(b,k)&&equal(a[k],b[k]));}return false;}
 const collectionPaths=new Set(['trainingDays','exerciseLibrary','history','blocks','plannedExtras']);
 const forbidden=new Set(['__proto__','constructor','prototype']);
 function merge(base,local,remote){
   const conflicts=[];
   function visit(b,l,r,path){
     if(equal(l,r))return copy(l);
     if(equal(l,b))return copy(r);
     if(equal(r,b))return copy(l);
     // Deletion versus modification is a conflict, never resurrect silently.
     if(l===undefined||r===undefined){conflicts.push(path.join('.'));return copy(l);}
     if(collectionPaths.has(path.join('.'))&&[b,l,r].every(Array.isArray)){
       const valid=arr=>arr.every(x=>object(x)&&typeof x.id==='string')&&new Set(arr.map(x=>x.id)).size===arr.length;
       if(![b,l,r].every(valid)){conflicts.push(path.join('.'));return copy(l);}
       const bm=new Map(b.map(x=>[x.id,x])),lm=new Map(l.map(x=>[x.id,x])),rm=new Map(r.map(x=>[x.id,x]));
       const result=new Map();
       for(const id of new Set([...bm.keys(),...lm.keys(),...rm.keys()])){const value=visit(bm.get(id),lm.get(id),rm.get(id),[...path,id]);if(value!==undefined)result.set(id,value);}
       const shared=b.map(x=>x.id).filter(id=>lm.has(id)&&rm.has(id));
       const order=arr=>arr.map(x=>x.id).filter(id=>shared.includes(id));
       const lo=order(l),ro=order(r);let preferred=l;
       if(equal(lo,shared))preferred=r;
       else if(!equal(ro,shared)&&!equal(lo,ro))conflicts.push(path.join('.')+'.order');
       const ids=[...new Set([...preferred.map(x=>x.id),...l.map(x=>x.id),...r.map(x=>x.id)])];
       return ids.filter(id=>result.has(id)).map(id=>result.get(id));
     }
     // Training/block/session records are atomic: combining interdependent
     // exercise arrays, slot state or set counts could create an invalid plan.
     if(path.length===1&&object(b)&&object(l)&&object(r)){
       conflicts.push(path.join('.'));return copy(l);
     }
     if(path.length===0&&object(b)&&object(l)&&object(r)){
       const out={};for(const key of new Set([...Object.keys(b),...Object.keys(l),...Object.keys(r)])){
         if(forbidden.has(key)){conflicts.push(key);continue;}
         const value=visit(b[key],l[key],r[key],[key]);if(value!==undefined)out[key]=value;
       }return out;
     }
     conflicts.push(path.join('.'));return copy(l);
   }
   const data=visit(base,local,remote,[]);
   // A conflict result is only a preview. Callers must not upload it.
   return {data,conflicts,ok:conflicts.length===0};
 }
 return {merge,equal,copy};
});
