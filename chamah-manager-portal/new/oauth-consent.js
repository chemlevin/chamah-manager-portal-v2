import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const project='https://vyyfuaqmbxvfqgbfqooc.supabase.co';
const key='sb_publishable_4MKSdjf7O1oVS4SWhQ36Qw_QUKW8dyW';
const sessionKey='chamah.portal.session';
const storage={getItem:k=>k==='chamah-oauth-session'?localStorage.getItem(sessionKey):null,setItem:(k,v)=>{if(k==='chamah-oauth-session')localStorage.setItem(sessionKey,v)},removeItem:k=>{if(k==='chamah-oauth-session')localStorage.removeItem(sessionKey)}};
const sb=createClient(project,key,{auth:{storage,storageKey:'chamah-oauth-session',autoRefreshToken:true,detectSessionInUrl:false,persistSession:true}});
const $=id=>document.getElementById(id);
const id=new URLSearchParams(location.search).get('authorization_id');
const fail=msg=>{$('status').textContent=msg};
function diagnostic(step,details={}){
 const payload={step,...details};
 if(payload.state!==undefined){payload.present=Boolean(payload.state);payload.length=payload.state?String(payload.state).length:0;delete payload.state;}
 if(payload.code!==undefined){payload.present=Boolean(payload.code);payload.length=payload.code?String(payload.code).length:0;delete payload.code;}
 fetch('/api/oauth-diagnostics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true}).catch(()=>{});
}
function redirectToPortalLogin(){
 diagnostic('login_resume',{pending:Boolean(id),present:Boolean(id),length:id?String(id).length:0});
 const resume=new URL('/oauth/consent',location.origin);
 resume.searchParams.set('authorization_id',id);
 const login=new URL('/',location.origin);
 login.searchParams.set('oauth_resume',resume.href);
 location.replace(login.href);
}
function navigateToOAuthCallback(redirectUrl){
 try{
  const finalUrl=new URL(redirectUrl);
  const queryNames=[...finalUrl.searchParams.keys()];
  diagnostic('final_redirect_attempt',{host:finalUrl.host,path:finalUrl.pathname,queryNames,code:finalUrl.searchParams.get('code')||'',state:finalUrl.searchParams.get('state')||''});
  if(finalUrl.protocol!=='https:'||finalUrl.host!=='chatgpt.com'||!finalUrl.pathname.startsWith('/connector/oauth/')||!finalUrl.searchParams.has('code')||!finalUrl.searchParams.has('state')) return false;
  location.replace(finalUrl.href);
  return true;
 }catch{return false;}
}
async function main(){
 diagnostic('authorize_request_received',{pending:Boolean(id),present:Boolean(id),length:id?String(id).length:0});
 if(!id||id.length>300||!/^[a-zA-Z0-9._~-]+$/.test(id))return fail('בקשת אישור לא תקינה.');
 const {data:{session},error:sessionError}=await sb.auth.getSession();
 if(sessionError||!session)return redirectToPortalLogin();
 const {data:{user},error:authError}=await sb.auth.getUser();
 if(authError||!user)return redirectToPortalLogin();
 const {data:access,error:accessError}=await sb.rpc('portal_my_access');
 if(accessError||!access?.profile?.is_active)return fail('לא ניתן לאמת הרשאות בפורטל. לא אושר חיבור.');
 const {data,error}=await sb.auth.oauth.getAuthorizationDetails(id);
 if(error||!data)return fail('לא ניתן לקרוא את פרטי בקשת החיבור.');
 diagnostic('redirect_uri',{host:data.redirect_uri?new URL(data.redirect_uri).host:'',path:data.redirect_uri?new URL(data.redirect_uri).pathname:''});
 if(data.state!==undefined)diagnostic('state_presence',{present:Boolean(data.state),length:data.state?String(data.state).length:0});
 if(!('authorization_id' in data)){
  if(typeof data.redirect_url!=='string'||!data.redirect_url.startsWith('https://'))return fail('לא ניתן להשלים את החזרה לאפליקציה המבקשת.');
  if(!navigateToOAuthCallback(data.redirect_url))return fail('לא ניתן להשלים את החזרה לאפליקציה המבקשת.');
  return;
 }
 $('client').textContent=data.client?.name||'אפליקציה ללא שם';
 $('redirect').textContent=data.redirect_uri||'לא ידוע';
 $('scopes').textContent=data.scope||'לא צוינו';
 $('details').hidden=false;
 $('status').textContent='בדוק/י היטב את פרטי האפליקציה לפני אישור.';
 for(const action of ['approve','deny']){
  $(action).disabled=false;
  $(action).addEventListener('click',async()=>{
   $('approve').disabled=$('deny').disabled=true;
   $('status').textContent='מעבד את ההחלטה…';
   const result=action==='approve'?await sb.auth.oauth.approveAuthorization(id):await sb.auth.oauth.denyAuthorization(id);
   diagnostic('consent_approval',{status:result.error?'error':'success'});
   if(result.error||!result.data?.redirect_url){$('status').textContent='הפעולה נכשלה. נסה/י שוב.';$('approve').disabled=$('deny').disabled=false;return;}
   if(!navigateToOAuthCallback(result.data.redirect_url)){$('status').textContent='החזרה לאפליקציה נכשלה: חסרים code או state.';$('approve').disabled=$('deny').disabled=false;return;}
  });
 }
}
main().catch(()=>fail('שגיאה בהכנת בקשת האישור.'));
