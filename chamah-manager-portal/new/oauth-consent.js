import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const project='__CHAMAH_SUPABASE_URL__';
const allowedPortalOrigins=new Set(['__CHAMAH_PORTAL_ORIGIN__','__CHAMAH_MCP_ORIGIN__']);
const canonicalOrigin=location.origin;
const key='__CHAMAH_PUBLISHABLE_KEY__';
const sessionKey='chamah.portal.session';
const storage={getItem:k=>k==='chamah-oauth-session'?localStorage.getItem(sessionKey):null,setItem:(k,v)=>{if(k==='chamah-oauth-session')localStorage.setItem(sessionKey,v)},removeItem:k=>{if(k==='chamah-oauth-session')localStorage.removeItem(sessionKey)}};
const sb=createClient(project,key,{auth:{storage,storageKey:'chamah-oauth-session',autoRefreshToken:true,detectSessionInUrl:false,persistSession:true}});
const $=id=>document.getElementById(id);
const id=new URLSearchParams(location.search).get('authorization_id');
const correlationId=crypto.randomUUID();
const fail=msg=>{$('status').textContent=msg};
function report(stage,extra={}){fetch('/api/oauth-diagnostics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({step:stage,correlation_id:correlationId,...extra}),keepalive:true}).catch(()=>{});}
function diagnostic(stage,error,extra={}){
 const safe={stage,project,origin:location.origin,status:Number(error?.status)||null,code:String(error?.code||error?.error_code||''),message:String(error?.message||error?.msg||'').slice(0,240),...extra};
 console.warn('[oauth-consent]',safe);
 report(stage==='approve-authorization'||stage==='deny-authorization'?'consent_approval':'oauth_error',{status:safe.status,host:location.host,path:location.pathname});
}
if(!allowedPortalOrigins.has(location.origin)) fail('סביבת החיבור אינה מורשית.');
function readPortalSession(){
 try{
  const value=JSON.parse(localStorage.getItem(sessionKey)||'null');
  if(!value?.access_token||!value?.refresh_token)return null;
  return {access_token:value.access_token,refresh_token:value.refresh_token};
 }catch(error){diagnostic('session-storage',error);return null;}
}
async function restorePortalSession(){
 const portalSession=readPortalSession();
 if(!portalSession)return {session:null,error:null};
 const result=await sb.auth.setSession(portalSession);
 if(result.error)diagnostic('session-bind',result.error);
 return result;
}
function redirectToPortalLogin(){
 const resume=new URL('/oauth/consent',canonicalOrigin);
 resume.searchParams.set('authorization_id',id);
 const login=new URL('/',canonicalOrigin);
 login.searchParams.set('oauth_resume',resume.href);
 location.replace(login.href);
}
function navigateToOAuthCallback(redirectUrl){
 try{
  const finalUrl=new URL(redirectUrl);
  if(finalUrl.protocol!=='https:'||finalUrl.host!=='chatgpt.com'||!finalUrl.pathname.startsWith('/connector/oauth/')||!finalUrl.searchParams.has('code')||!finalUrl.searchParams.has('state')) return false;
  location.replace(finalUrl.href);
  return true;
 }catch{return false;}
}
async function main(){
 if(!id||id.length>300||!/^[a-zA-Z0-9._~-]+$/.test(id)){report('authorize_request_received',{present:Boolean(id),length:id?.length||0});return fail('בקשת אישור לא תקינה.');}
 if(location.origin!==canonicalOrigin)return location.replace(`${canonicalOrigin}/oauth/consent?authorization_id=${encodeURIComponent(id)}`);
 const {data:{session},error:sessionError}=await restorePortalSession();
 if(sessionError)diagnostic('session-restore',sessionError);
 if(sessionError||!session)return redirectToPortalLogin();
 const {data:{user},error:authError}=await sb.auth.getUser();
 if(authError)diagnostic('session-user',authError);
 if(authError||!user)return redirectToPortalLogin();
 const {data:access,error:accessError}=await sb.rpc('portal_my_access');
 if(accessError)diagnostic('portal-access',accessError);
 if(accessError||!access?.profile?.is_active)return fail('לא ניתן לאמת הרשאות בפורטל. לא אושר חיבור.');
 const {data,error}=await sb.auth.oauth.getAuthorizationDetails(id);
 if(error||!data){diagnostic('authorization-details',error,{authorizationIdPresent:Boolean(id),authorizationIdLength:id?.length||0});return fail('לא ניתן לקרוא את פרטי בקשת החיבור.');}
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
   if(result.error||!result.data?.redirect_url){diagnostic(action==='approve'?'approve-authorization':'deny-authorization',result.error,{authorizationIdPresent:Boolean(id),authorizationIdLength:id?.length||0});$('status').textContent='הפעולה נכשלה. נסה/י שוב.';$('approve').disabled=$('deny').disabled=false;return;}
   if(!navigateToOAuthCallback(result.data.redirect_url)){$('status').textContent='החזרה לאפליקציה נכשלה: חסרים code או state.';$('approve').disabled=$('deny').disabled=false;return;}
  });
 }
}
main().catch(error=>{diagnostic('consent-unhandled',error,{authorizationIdPresent:Boolean(id),authorizationIdLength:id?.length||0});fail('שגיאה בהכנת בקשת האישור.');});
