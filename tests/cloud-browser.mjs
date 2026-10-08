import { chromium as playwright } from 'playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const project = fileURLToPath(new URL('../', import.meta.url));
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5175'],{cwd:project,stdio:'ignore',env:{...process.env,VITE_SUPABASE_URL:'https://prepbloom-test.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'}});
(async()=>{
  for(let i=0;i<50;i++){try{await fetch('http://127.0.0.1:5175');break}catch{await new Promise(r=>setTimeout(r,100))}}
  const browser=await playwright.launch({headless:true});
  const user={id:'550e8400-e29b-41d4-a716-446655440000',aud:'authenticated',role:'authenticated',email:'test@example.com',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};
  let rows=[], rewards=[], denySave=false;
  async function route(request){
    const req=request.request(),url=new URL(req.url()),method=req.method();
    const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*','content-type':'application/json'};
    if(method==='OPTIONS')return request.fulfill({status:200,headers,body:''});
    const send=(body,status=200)=>request.fulfill({status,headers,body:JSON.stringify(body)});
    if(url.pathname.includes('/auth/v1/token'))return send({access_token:'test-access',refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user});
    if(url.pathname.includes('/auth/v1/user'))return send(user);
    if(url.pathname.endsWith('/tracker_entries')){
      if(method==='GET')return send(rows);
      if(denySave)return send({message:'Simulated save rejection'},403);
      if(method==='POST'){for(const row of JSON.parse(req.postData())){const old=rows.findIndex(r=>r.id===row.id);const saved={...row,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};if(old<0)rows.push(saved);else rows[old]=saved;}return send([],201)}
    }
    if(url.pathname.endsWith('/tracker_rewards'))return send(rewards);
    if(url.pathname.includes('/rpc/claim_tracker_reward')){
      const {reward_kind:kind,reward_period:period}=JSON.parse(req.postData());const targets=rows.filter(r=>r.period===period&&r.kind===(kind==='daily'?'task':'weekly')&&(kind!=='daily'||r.payload.target));
      if(targets.length&&targets.every(r=>r.payload.done)&&!rewards.some(r=>r.kind===kind&&r.period===period))rewards.push({id:crypto.randomUUID(),kind,period,stars:kind==='daily'?1:5,created_at:new Date().toISOString()});return send(null);
    }
    return send({});
  }
  const context1=await browser.newContext(), context2=await browser.newContext();
  await context1.route('https://prepbloom-test.supabase.co/**',route);await context2.route('https://prepbloom-test.supabase.co/**',route);
  const p1=await context1.newPage(),p2=await context2.newPage();
  for(const page of [p1,p2]){await page.goto('http://127.0.0.1:5175');await page.waitForFunction(()=>document.querySelector('input[name=email]')||[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Add task'));if(await page.getByLabel('Email',{exact:true}).count()){await page.getByLabel('Email',{exact:true}).fill('test@example.com');await page.getByLabel('Password',{exact:true}).fill('test-password');await page.locator('form').getByRole('button',{name:'Sign in',exact:true}).click();}await page.getByRole('button',{name:'Add task',exact:true}).waitFor();}
  await p1.getByRole('button',{name:'Add task',exact:true}).click();await p1.getByRole('dialog').getByLabel('Title',{exact:true}).fill('Cloud target');await p1.getByRole('dialog').getByRole('button',{name:'Save task'}).click();
  await p2.getByRole('button',{name:'Refresh cloud progress'}).click();await p2.getByRole('checkbox',{name:/Cloud target/}).waitFor();
  await p2.getByRole('checkbox',{name:/Cloud target/}).click();await p2.waitForFunction(()=>document.querySelector('.star-balance strong').textContent==='1');
  await p1.getByRole('button',{name:'Refresh cloud progress'}).click();await p1.waitForFunction(()=>document.querySelector('.star-balance strong').textContent==='1');assert.equal(await p1.getByRole('checkbox',{name:/Cloud target/}).isChecked(),true);
  denySave=true;await p1.getByRole('button',{name:'Add task',exact:true}).click();await p1.getByRole('dialog').getByLabel('Title',{exact:true}).fill('Keep my failed draft');await p1.getByRole('dialog').getByRole('button',{name:'Save task'}).click();await p1.getByRole('dialog').getByText('Simulated save rejection',{exact:true}).waitFor();assert.equal(await p1.getByRole('dialog').getByLabel('Title',{exact:true}).inputValue(),'Keep my failed draft');
  console.log('PASS: mocked email login, per-entry cloud writes, cross-context refresh, reward sync, and failed-save draft retention. Does not validate a live Supabase service or SQL policies.');
  await browser.close();server.kill();
})().catch(e=>{server.kill();console.error(e);process.exit(1)});
