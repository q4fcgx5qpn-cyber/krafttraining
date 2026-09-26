/* Adapter-driven sync coordinator. Transport must authenticate each request;
   commit must atomically store data + sync metadata before updating the UI. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./sync-core.js'));else root.KraftSyncEngine=factory(root.KraftSync);})(typeof globalThis!=='undefined'?globalThis:this,function(S){
 'use strict';
 function create({readLocal,readMeta,commit,transport,validate,blocked=()=>false}){
  let busy=false;
  async function run(userId){
   if(busy)return {status:'busy'};
   if(!userId)return {status:'signed-out'};
   if(blocked())return {status:'deferred'};
   busy=true;
   try{
    const meta=readMeta();
    if(!meta||meta.userId!==userId)return {status:'setup-required'};
    const local=S.copy(readLocal());
    const remote=await transport.read(userId);
    if(readMeta()?.userId!==userId)return {status:'account-changed'};
    if(blocked()||!S.equal(local,readLocal()))return {status:'deferred'};
    if(!remote){return {status:'cloud-missing'};}
    if(!Number.isSafeInteger(remote.revision)||remote.revision<1||remote.revision<meta.revision)throw Error('Invalid cloud revision');
    const cloud=validate(S.copy(remote.payload));
    const result=S.merge(meta.base,local,cloud);
    if(!result.ok)return {status:'conflict',paths:result.conflicts,local,cloud,revision:remote.revision};
    const merged=validate(result.data);
    if(S.equal(merged,cloud)){
      commit(merged,{userId,base:cloud,revision:remote.revision});
      return {status:'synced'};
    }
    const ack=await transport.write(userId,remote.revision,merged);
    if(readMeta()?.userId!==userId)return {status:'account-changed'};
    if(!ack||ack.revision!==remote.revision+1||!S.equal(ack.payload,merged))throw Error('Invalid cloud acknowledgement');
    // The UI can change while the request is in flight. Never overwrite it
    // with the older snapshot: rebase those edits onto the acknowledged data.
    const latest=S.copy(readLocal());
    const after=S.merge(local,latest,merged);
    if(!after.ok||blocked()){
      // Preserve the prior common ancestor. On the next attempt the known
      // cloud snapshot is merged again, rather than marking edits as synced.
      return {status:'deferred'};
    }
    commit(validate(after.data),{userId,base:merged,revision:ack.revision});
    return {status:S.equal(after.data,merged)?'synced':'pending'};
   }catch(error){return {status:error.code==='40001'?'retry':'error',message:error.message};}
   finally{busy=false;}
  }
  return {run};
 }
 return {create};
});
