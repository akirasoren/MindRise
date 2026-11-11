/* Browser integration. Account progress lives in memory; the demo keeps its original key. */
(() => {
  'use strict';
  const config=window.MINDRISE_CLOUD_CONFIG || {};
  const enabled=!!(config.url && config.publishableKey);
  const {SaveController,validState}=window.MindRiseCloudStore;
  let app,client,user=null,mode='demo',phase='idle',generation=0,notice='',store;
  let popupTimer=null,authPending=null,activePopup=null;
  const popupName='mindrise-google-auth';
  const popupMarker='mindrise-auth-popup-v1';
  let isAuthPopup=window.name===popupName;
  try {isAuthPopup=isAuthPopup||sessionStorage.getItem(popupMarker)==='1';}catch(_){}
  const authChannel=typeof BroadcastChannel==='function'?new BroadcastChannel('mindrise-auth-v1'):null;
  const bar=document.createElement('section');
  bar.className='cloud-status';bar.hidden=true;bar.setAttribute('aria-label','Account and save status');
  document.body.prepend(bar);
  const locked=()=>mode!=='demo' && (phase!=='ready'||!store||store.status!=='saved'||navigator.onLine===false);
  const dirty=()=>!!store?.pending||store?.status==='invalid';
  function paint() {
    if(!app)return;
    const status=store?.status;
    const authMessage=document.querySelector('[data-cloud-auth-message]');
    bar.hidden=mode==='demo'&&(!notice||!!authMessage);
    let message=notice||({loading:'Loading your account…',setup:'Choose how to begin your account.',failed:'Could not load your account. Retry when connected.'}[phase]);
    if(phase==='ready')message={saved:'Saved to your account',saving:'Saving…',error:'Couldn’t save. Keep this page open and retry.',conflict:'Progress changed on another device. Download your changes before loading the cloud copy.',invalid:'This progress cannot be saved. Download a backup before reloading.'}[status];
    if(phase==='ready'&&notice)message=notice+' '+message;
    if(phase==='ready'&&status==='saved'&&navigator.onLine===false)message='You are offline. Reconnect to edit account progress.';
    bar.replaceChildren();
    const label=document.createElement('span');label.setAttribute('role','status');label.textContent=bar.hidden?'':message||'';bar.append(label);
    const button=(label,action)=>{const b=document.createElement('button');b.type='button';b.className='btn small secondary';b.textContent=label;b.addEventListener('click',action);bar.append(b);};
    if(mode==='demo'&&notice)button('Dismiss',()=>{notice='';paint();});
    if(phase==='failed')button('Retry loading',()=>loadUser(user));
    if(phase==='setup') {
      if(app.browserProgress())button('Use browser progress',()=>start(true));
      button('Start fresh',()=>start(false));
    }
    if(phase==='ready') {
      if(status==='error')button('Retry save',()=>store.retry());
      if(['error','conflict','invalid'].includes(status))button('Load cloud copy',reload);
      if(status!=='saving')button('Download backup',backup);
    }
    if(user && status!=='saving' && phase!=='loading')button('Sign out',signOut);
    document.querySelectorAll('[data-cloud-auth-message]').forEach(element=>{element.textContent=notice||'';});
    document.querySelectorAll('[data-cloud-email-form] [type=submit]').forEach(element=>{element.disabled=!!authPending;});
    document.querySelectorAll('[data-cloud-login]').forEach(element=>{element.setAttribute('aria-busy',String(authPending==='google'));});
    document.getElementById('app').inert=locked();
    const dialog=document.getElementById('dialog');
    if(dialog)dialog.inert=locked();
  }
  async function sdk() {
    if(client)return client;
    if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.url)||!config.publishableKey.startsWith('sb_publishable_'))throw Error('Invalid public configuration');
    if(!window.supabase)await new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.js';
      script.crossOrigin='anonymous';
      const timer=setTimeout(()=>{script.remove();reject(Error('SDK timeout'));},15000);
      script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('SDK unavailable'));};
      document.head.append(script);
    });
    client=window.supabase.createClient(config.url,config.publishableKey,{
      auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'mindrise-auth-v1'},
      global:{fetch:(url,options={})=>fetch(url,{...options,signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)})}
    });
    client.auth.onAuthStateChange((event,session)=>{
      // Do not await Supabase calls inside its auth callback (the SDK holds an auth lock).
      setTimeout(()=>{
        if(event==='SIGNED_OUT'){leave();return;}
        if(isAuthPopup&&session?.user){signalAuthComplete();return;}
        if(session?.user && user?.id!==session.user.id)loadUser(session.user);
      },0);
    });
    return client;
  }
  function signalAuthComplete() {
    try {sessionStorage.removeItem(popupMarker);}catch(_){}
    authChannel?.postMessage({type:'mindrise-auth-complete'});
    try {window.opener?.postMessage({type:'mindrise-auth-complete'},location.origin);}catch(_){}
    setTimeout(()=>window.close(),50);
  }
  async function acceptAuthComplete() {
    if(!app||isAuthPopup)return;
    clearInterval(popupTimer);popupTimer=null;authPending=null;activePopup=null;paint();
    try {const c=await sdk();const {data,error}=await c.auth.getSession();if(error)throw error;if(data.session?.user&&user?.id!==data.session.user.id)await loadUser(data.session.user);}
    catch(_){notice='Google sign-in finished, but the session could not be loaded. Refresh and try again.';paint();}
  }
  authChannel?.addEventListener('message',event=>{if(event.data?.type==='mindrise-auth-complete')void acceptAuthComplete();});
  window.addEventListener('message',event=>{if(event.origin===location.origin&&event.data?.type==='mindrise-auth-complete')void acceptAuthComplete();});
  async function login() {
    if(authPending){if(authPending==='google'&&activePopup&&!activePopup.closed)activePopup.focus();return;}
    authPending='google';
    const usePopup=matchMedia('(min-width:641px)').matches;
    let popup=null;
    if(usePopup)popup=window.open('about:blank',popupName,'popup=yes,width=500,height=680,resizable=yes,scrollbars=yes');
    activePopup=popup;
    if(popup)try {popup.sessionStorage.setItem(popupMarker,'1');}catch(_){}
    notice=popup?'Complete Google sign-in in the popup window…':'Opening Google sign-in…';paint();
    try {
      if(!/^https?:$/.test(location.protocol))throw Error('Use the hosted website');
      const c=await sdk();
      const options={redirectTo:location.origin+location.pathname,queryParams:{prompt:'select_account'}};
      if(popup)options.skipBrowserRedirect=true;
      const {data,error}=await c.auth.signInWithOAuth({provider:'google',options});
      if(error)throw error;
      if(popup){
        if(!data?.url)throw Error('Missing OAuth URL');
        popup.location.href=data.url;
        clearInterval(popupTimer);popupTimer=setInterval(()=>{if(popup.closed){clearInterval(popupTimer);popupTimer=null;activePopup=null;authPending=null;if(!user)notice='Google sign-in was closed. You can try again.';paint();}},500);
      }
    }catch(_){popup?.close();activePopup=null;authPending=null;notice='Sign-in is unavailable. Check your connection and try again on the hosted website.';paint();}
  }
  function friendlyAuthError(error) {
    const message=String(error?.message||'').toLowerCase();
    if(message.includes('invalid login credentials'))return 'Email or password is incorrect.';
    if(message.includes('already registered')||message.includes('already exists'))return 'An account with this email already exists.';
    if(message.includes('password'))return 'Use a password with at least 8 characters.';
    return 'Authentication is unavailable right now. Check your details and try again.';
  }
  async function emailAuth(form) {
    if(authPending)return;
    if(!form.reportValidity())return;
    const values=Object.fromEntries(new FormData(form));
    const email=String(values.email||'').trim(),password=String(values.password||''),authMode=form.dataset.mode;
    authPending='email';notice=authMode==='signup'?'Creating your account…':'Signing in…';paint();
    const submit=form.querySelector('[type=submit]');submit.disabled=true;
    try {
      const c=await sdk();
      if(authMode==='signup'){
        const name=String(values.name||'').trim();
        const {data,error}=await c.auth.signUp({email,password,options:{data:{given_name:name},emailRedirectTo:location.origin+location.pathname}});
        if(error)throw error;
        if(data.session?.user){notice='';await loadUser(data.session.user);}
        else {notice='Check your email to confirm your account.';paint();}
      }else{
        const {data,error}=await c.auth.signInWithPassword({email,password});
        if(error)throw error;
        if(!data.session?.user)throw Error('Session unavailable');
        notice='';await loadUser(data.session.user);
      }
    }catch(error){notice=friendlyAuthError(error);paint();}
    finally{if(authPending==='email')authPending=null;if(submit.isConnected)submit.disabled=false;paint();}
  }
  async function loadUser(nextUser) {
    if(!nextUser)return;
    clearInterval(popupTimer);popupTimer=null;authPending=null;activePopup=null;
    const ticket=++generation;
    user=nextUser;mode='account';phase='loading';notice='';store?.close();app.closeDialog();
    // Never leave another account's journal visible behind a loading/error state.
    app.setState(app.freshState(nextUser));app.showWelcome();paint();
    try {
      const {data,error}=await client.from('mindrise_progress').select('payload,revision').eq('user_id',nextUser.id).maybeSingle();
      if(ticket!==generation)return;
      if(error)throw error;
      if(!data){phase='setup';app.showWelcome();paint();return;}
      if(!validState(data.payload)||!Number.isSafeInteger(data.revision)||data.revision<1)throw Error('Invalid account progress');
      app.setState(data.payload);store.open(user.id,data.revision);phase='ready';app.showHome();paint();
    }catch(_){if(ticket===generation){phase='failed';paint();}}
  }
  async function start(importBrowser) {
    if(phase!=='setup')return;
    const next=importBrowser?app.browserProgress():app.freshState(user);
    if(!validState(next)){notice='Browser progress could not be read. Your original copy has been kept.';paint();return;}
    if(importBrowser&&!confirm('Copy this browser’s tasks, notes, logs and garden into your account? Existing sample entries will also be included. The browser copy will be kept.'))return;
    app.setState(next);store.open(user.id,0);phase='ready';
    // Normalize older garden defaults while writes are suspended, then save exactly once.
    phase='loading';app.showHome();phase='ready';await store.save(app.getState());paint();
  }
  function save() {
    if(mode!=='account'||phase!=='ready')return;
    void store.save(app.getState());
  }
  function backup() {
    const payload=store?.pending?.payload||app.getState();
    const blob=new Blob([JSON.stringify({format:'mindrise-progress-backup',exportedAt:new Date().toISOString(),progress:payload},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mindrise-progress-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function reload() {
    if(dirty()&&!confirm('Discard changes that have not synced and load the cloud copy? Download a backup first if you want to keep them.'))return;
    void loadUser(user);
  }
  function leave() {
    clearInterval(popupTimer);popupTimer=null;authPending=null;activePopup=null;generation++;user=null;mode='demo';phase='idle';notice='';store?.close();app.closeDialog();app.restoreDemo();app.showWelcome();paint();
  }
  async function signOut() {
    if(dirty()&&!confirm('Sign out and discard changes that have not synced? Download a backup first to keep them.'))return;
    const previousPhase=phase;generation++;phase='loading';paint();
    try {const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;leave();}
    catch(_){phase=previousPhase;notice='Could not sign out. Please reconnect and try again.';paint();}
  }
  async function attach(bridge) {
    app=bridge;
    store=new SaveController(async request=>{
      if(request.userId!==user?.id)throw Error('Account changed');
      const {data,error}=await client.rpc('save_mindrise_progress',{p_user_id:request.userId,p_payload:request.payload,p_expected_revision:request.expectedRevision,p_mutation_id:request.mutationId});
      if(error)throw error;return data;
    },controller=>{if(controller.status==='saved')notice='';paint();});
    if(!enabled)return;
    mode='loading';phase='loading';paint();
    try {
      const c=await sdk();const {data,error}=await c.auth.getSession();if(error)throw error;
      if(data.session?.user){if(isAuthPopup){signalAuthComplete();return;}if(!user)await loadUser(data.session.user);}
      else if(!user){mode='demo';phase='idle';paint();}
    }catch(_){mode='demo';phase='idle';notice='Cloud sign-in is unavailable. You can still explore the local demo.';paint();}
  }
  window.addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue='';}});
  window.addEventListener('offline',paint);
  window.addEventListener('online',paint);
  // Capture before legacy handlers so no mutation runs while loading/saving/blocked.
  for(const name of ['click','change','submit','input'])document.addEventListener(name,event=>{
    if(!event.target.closest?.('#app,#dialog'))return;
    if(locked()){event.preventDefault();event.stopImmediatePropagation();return;}
    const b=event.target.closest?.('button');
    const authForm=event.target.closest?.('[data-cloud-email-form]');
    if(name==='submit'&&authForm){event.preventDefault();event.stopImmediatePropagation();void emailAuth(authForm);return;}
    if(name==='click'&&b?.hasAttribute('data-cloud-login')){event.preventDefault();event.stopImmediatePropagation();void login();}
    if(name==='click'&&b?.hasAttribute('data-cloud-backup')){event.preventDefault();event.stopImmediatePropagation();backup();}
    if(name==='click'&&b?.dataset.action==='logout'&&mode==='account'){event.preventDefault();event.stopImmediatePropagation();void signOut();}
    if(name==='click'&&['reset','confirm-reset'].includes(b?.dataset.action)&&mode==='account'){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  window.MindRiseAccount={enabled,attach,save,paint,backup,get active(){return mode!=='demo';},get signedIn(){return mode==='account';}};
})();
