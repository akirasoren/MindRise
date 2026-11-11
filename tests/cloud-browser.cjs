// Run with Playwright available in NODE_PATH; no npm dependency is needed by the app.
const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const rows=new Map(),loads=new Map();let cloud=false;
const server=http.createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/cloud-config.js'&&cloud){res.setHeader('Content-Type','text/javascript');return res.end("window.MINDRISE_CLOUD_CONFIG={url:'https://test.supabase.co',publishableKey:'sb_publishable_test'};");}
  if(pathname==='/oauth-stub'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><title>OAuth stub</title>');}
  if(pathname==='/test-db'){
    let body='';for await(const chunk of req)body+=chunk;
    const data=JSON.parse(body);res.setHeader('Content-Type','application/json');
    if(data.action==='load'){loads.set(data.user,(loads.get(data.user)||0)+1);return res.end(JSON.stringify({data:rows.get(data.user)||null,error:null}));}
    const p=data.params,row=rows.get(p.p_user_id);
    if(p.p_user_id!==data.user)return res.end(JSON.stringify({data:null,error:{code:'42501'}}));
    if(row?.mutation===p.p_mutation_id)return res.end(JSON.stringify({data:{revision:row.revision},error:null}));
    if((row?.revision||0)!==p.p_expected_revision)return res.end(JSON.stringify({data:null,error:{code:'40001'}}));
    const saved={payload:p.p_payload,revision:p.p_expected_revision+1,mutation:p.p_mutation_id};rows.set(p.p_user_id,saved);
    return res.end(JSON.stringify({data:{revision:saved.revision},error:null}));
  }
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404);res.end();}
});
function mockSdk(){
  let callback;window.testUser={id:'user-a',user_metadata:{given_name:'Tester'}};window.failSave=false;window.failLoad=false;window.failSignOut=false;
  const currentUser=()=>{try{return JSON.parse(localStorage.getItem('test-popup-user')||'null')||window.testUser}catch(_){return window.testUser}};
  window.switchAccount=()=>{window.testUser={id:'user-b',user_metadata:{given_name:'Other'}};callback('SIGNED_IN',{user:window.testUser});};
  const request=data=>fetch('/test-db',{method:'POST',body:JSON.stringify(data)}).then(r=>r.json());
  window.supabase={createClient:()=>({
    auth:{onAuthStateChange:fn=>{callback=fn;return {data:{subscription:{unsubscribe(){}}}};},getSession:async()=>{const active=currentUser();return {data:{session:active?{user:active}:null},error:null};},signUp:async options=>{window.signupRequested=options;return {data:{user:{id:'pending-user'},session:null},error:null};},signInWithPassword:async options=>{window.passwordLoginRequested=options;if(!window.passwordLoginSuccess)return {data:{user:null,session:null},error:{message:'Invalid login credentials'}};window.testUser={id:'email-user',user_metadata:{given_name:'Email User'}};callback('SIGNED_IN',{user:window.testUser});return {data:{user:window.testUser,session:{user:window.testUser}},error:null};},signInWithOAuth:async options=>{window.oauthRequested=options;window.oauthCalls=(window.oauthCalls||0)+1;if(window.deferOAuth)await new Promise(resolve=>{window.resolveOAuth=resolve;});const url=location.origin+'/oauth-stub';if(!options.options.skipBrowserRedirect)location.href=url;return {data:{url},error:null};},signOut:async()=>{if(window.failSignOut)return {error:Error('Offline')};window.testUser=null;localStorage.removeItem('test-popup-user');callback('SIGNED_OUT',null);return {error:null};}},
    from:()=>({select:()=>({eq:(_,user)=>({maybeSingle:()=>window.failLoad?Promise.reject(Error('Offline')):request({action:'load',user})})})}),
    rpc:async(name,params)=>{if(window.failSave)throw Error('Disconnected');return request({action:'save',params,user:currentUser().id});}
  })};
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}/`;
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({reducedMotion:'reduce'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',dialog=>dialog.accept());
    await page.goto(url);await page.getByRole('button',{name:'Explore the demo',exact:true}).click();
    await page.getByRole('button',{name:'Add task',exact:true}).click();
    await page.locator('#task-form [name=title]').fill('Browser-only task');await page.locator('#task-form [type=submit]').click();
    const legacy=await page.evaluate(()=>localStorage.getItem('mindrise-prototype-v1'));
    assert.ok(legacy.includes('Browser-only task'));console.log('PASS legacy demo saves');
    cloud=true;await page.addInitScript(mockSdk);await page.reload();
    await page.getByRole('button',{name:'Use browser progress',exact:true}).waitFor();
    assert.equal(rows.size,0);await page.getByRole('button',{name:'Use browser progress',exact:true}).click();
    await page.getByText('Saved to your account',{exact:true}).waitFor();
    assert.equal(await page.getByText('PROTOTYPE',{exact:true}).count(),0);
    assert.ok(rows.get('user-a').payload.tasks.some(t=>t.title==='Browser-only task'));
    assert.equal(await page.evaluate(()=>localStorage.getItem('mindrise-prototype-v1')),legacy);console.log('PASS explicit import preserves browser data');
    await page.getByRole('button',{name:'Add task',exact:true}).click();await page.locator('#task-form [name=title]').fill('Cloud task');await page.locator('#task-form [type=submit]').click();
    await page.getByText('Saved to your account',{exact:true}).waitFor();assert.ok(rows.get('user-a').payload.tasks.some(t=>t.title==='Cloud task'));
    assert.equal(await page.evaluate(()=>localStorage.getItem('mindrise-prototype-v1')),legacy);console.log('PASS account save never modifies demo');
    const secondContext=await browser.newContext({reducedMotion:'reduce'});const second=await secondContext.newPage();await second.addInitScript(mockSdk);await second.goto(url);await second.getByText('Saved to your account',{exact:true}).waitFor();
    await page.evaluate(()=>{window.failSave=true;});
    await page.getByRole('button',{name:'Add task',exact:true}).click();await page.locator('#task-form [name=title]').fill('Retry task');await page.locator('#task-form [type=submit]').click();
    await page.getByRole('button',{name:'Retry save',exact:true}).waitFor();assert.equal(await page.locator('#app').evaluate(el=>el.inert),true);
    await page.evaluate(()=>{window.failSignOut=true;});await page.getByRole('button',{name:'Sign out',exact:true}).first().click();
    await page.getByRole('button',{name:'Retry save',exact:true}).waitFor();await page.getByRole('button',{name:'Download backup',exact:true}).waitFor();
    await page.evaluate(()=>{window.failSignOut=false;});console.log('PASS failed sign-out preserves recovery controls');
    await page.evaluate(()=>{window.failSave=false;});await page.getByRole('button',{name:'Retry save',exact:true}).click();await page.getByText('Saved to your account',{exact:true}).waitFor();console.log('PASS failed save locks edits and retries');
    await second.getByRole('button',{name:'Add task',exact:true}).click();await second.locator('#task-form [name=title]').fill('Conflicting task');await second.locator('#task-form [type=submit]').click();
    await second.getByRole('button',{name:'Load cloud copy',exact:true}).waitFor();assert.equal(rows.get('user-a').payload.tasks.some(t=>t.title==='Conflicting task'),false);console.log('PASS stale device cannot overwrite');
    await second.evaluate(()=>{window.failLoad=true;window.switchAccount();});await second.getByRole('button',{name:'Retry loading',exact:true}).waitFor();
    assert.equal(await second.evaluate(()=>state.tasks.some(t=>t.title==='Cloud task'||t.title==='Conflicting task')),false);console.log('PASS account switch clears previous private state on load failure');
    await page.setViewportSize({width:375,height:812});await page.screenshot({path:path.join(process.env.TEMP||root,'mindrise-cloud-mobile.png'),fullPage:true});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.getByRole('button',{name:'Sign out',exact:true}).first().click();await page.getByRole('button',{name:'Explore the demo',exact:true}).waitFor();
    await page.setViewportSize({width:900,height:800});
    assert.equal(await page.evaluate(()=>localStorage.getItem('mindrise-prototype-v1')),legacy);
    assert.equal(await page.evaluate(()=>state.tasks.some(t=>t.title==='Cloud task')),false);console.log('PASS sign-out clears account state');
    assert.equal(await page.getByText('PRESENTATION PROTOTYPE',{exact:true}).count(),0);
    await page.getByRole('button',{name:'Get started',exact:true}).first().click();
    await page.locator('[data-cloud-email-form][data-mode="signup"]').waitFor();
    await page.evaluate(()=>document.getElementById('toast').classList.remove('show'));
    await page.screenshot({path:path.join(process.env.TEMP||root,'mindrise-auth-desktop.png')});
    await page.locator('[data-cloud-email-form] [name=name]').fill('New Student');
    await page.locator('[data-cloud-email-form] [name=email]').fill('new@example.com');
    await page.locator('[data-cloud-email-form] [name=password]').fill('strong-pass-123');
    await page.locator('[data-cloud-email-form]').evaluate(form=>form.requestSubmit());
    await page.getByText('Check your email to confirm your account.',{exact:true}).waitFor();
    assert.deepEqual(await page.evaluate(()=>window.signupRequested),{email:'new@example.com',password:'strong-pass-123',options:{data:{given_name:'New Student'},emailRedirectTo:url}});
    assert.equal(await page.getByRole('button',{name:'Explore the demo',exact:true}).isVisible(),true);console.log('PASS email account creation is the primary auth path');
    await page.evaluate(()=>{window.deferOAuth=true;window.oauthCalls=0;});
    const popupPromise=page.waitForEvent('popup');await page.getByRole('button',{name:'Continue with Google',exact:true}).click();const popup=await popupPromise;
    await page.getByRole('button',{name:'Continue with Google',exact:true}).click();await page.waitForTimeout(50);
    assert.equal(await page.evaluate(()=>window.oauthCalls),1);assert.equal(await page.locator('[data-cloud-email-form] [type=submit]').isDisabled(),true);
    await page.evaluate(()=>{window.deferOAuth=false;window.resolveOAuth();});
    assert.equal(await page.evaluate(()=>window.oauthRequested.provider),'google');
    assert.equal(await page.evaluate(()=>window.oauthRequested.options.redirectTo),url);
    assert.equal(await page.evaluate(()=>window.oauthRequested.options.skipBrowserRedirect),true);
    await popup.waitForURL(url+'oauth-stub');assert.equal(await popup.url(),url+'oauth-stub');console.log('PASS configured Google login opens one serialized popup with exact return URL');
    await popup.addInitScript(mockSdk);await popup.evaluate(()=>{localStorage.setItem('test-popup-user',JSON.stringify({id:'popup-user',user_metadata:{given_name:'Popup User'}}));window.name='';});
    await popup.goto(url);await popup.waitForEvent('close');
    await page.getByRole('button',{name:'Start fresh',exact:true}).waitFor();assert.equal(loads.get('popup-user'),1);await page.getByRole('button',{name:'Sign out',exact:true}).click();
    await page.getByRole('button',{name:'Log In',exact:true}).click();console.log('PASS callback marker survives a cleared window name and loads the opener once');
    await page.locator('[data-cloud-email-form][data-mode="login"]').waitFor();
    assert.equal(await page.locator('[data-cloud-email-form] [name=password]').evaluate(input=>input.minLength),-1);
    await page.locator('[data-cloud-email-form] [name=email]').fill('student@example.com');
    await page.locator('[data-cloud-email-form] [name=password]').fill('wrong-password');
    await page.locator('[data-cloud-email-form]').evaluate(form=>form.requestSubmit());
    await page.getByText('Email or password is incorrect.',{exact:true}).waitFor();
    assert.deepEqual(await page.evaluate(()=>window.passwordLoginRequested),{email:'student@example.com',password:'wrong-password'});
    await page.evaluate(()=>{window.passwordLoginSuccess=true;});await page.locator('[data-cloud-email-form] [name=password]').fill('six66x');
    await page.locator('[data-cloud-email-form]').evaluate(form=>form.requestSubmit());await page.getByRole('button',{name:'Start fresh',exact:true}).waitFor();
    await page.getByRole('button',{name:'Sign out',exact:true}).click();console.log('PASS a valid existing email account signs in without the signup password policy');
    await page.getByRole('button',{name:'Log In',exact:true}).click();await page.locator('[data-cloud-email-form][data-mode="login"]').waitFor();
    await page.evaluate(()=>document.getElementById('toast').classList.remove('show'));
    await page.setViewportSize({width:375,height:812});await page.screenshot({path:path.join(process.env.TEMP||root,'mindrise-auth-mobile.png'),fullPage:true});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);console.log('PASS existing users get the primary email login form');
    await second.evaluate(()=>{window.failLoad=false;});await second.getByRole('button',{name:'Retry loading',exact:true}).click();
    await second.getByRole('button',{name:'Start fresh',exact:true}).click();await second.getByText('Saved to your account',{exact:true}).waitFor();
    assert.deepEqual(rows.get('user-b').payload.tasks,[]);assert.deepEqual(rows.get('user-b').payload.sleep,[]);assert.deepEqual(rows.get('user-b').payload.moods,[]);
    assert.equal(rows.get('user-b').payload.garden.seeds.succulent,1);console.log('PASS fresh account has empty history and starter seed');
    await second.setViewportSize({width:1440,height:900});await second.screenshot({path:path.join(process.env.TEMP||root,'mindrise-cloud-desktop.png')});
    await second.setViewportSize({width:375,height:812});await second.screenshot({path:path.join(process.env.TEMP||root,'mindrise-cloud-mobile-viewport.png')});
    const fallback=await context.newPage();await fallback.addInitScript(mockSdk);await fallback.goto(url);await fallback.getByText('Saved to your account',{exact:true}).waitFor();
    await fallback.getByRole('button',{name:'Sign out',exact:true}).first().click();await fallback.getByRole('button',{name:'Get started',exact:true}).first().click();
    await fallback.evaluate(()=>{window.open=()=>null;});await fallback.getByRole('button',{name:'Continue with Google',exact:true}).click();
    await fallback.waitForURL(url+'oauth-stub');assert.equal(await fallback.url(),url+'oauth-stub');console.log('PASS blocked Google popup falls back to full-page redirect');
    assert.deepEqual(errors,[]);console.log('PASS no browser JavaScript errors');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
