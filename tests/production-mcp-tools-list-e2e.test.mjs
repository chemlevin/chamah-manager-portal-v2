import test from 'node:test';
import assert from 'node:assert/strict';

process.env.CHAMAH_ENVIRONMENT='production';
process.env.CHAMAH_SUPABASE_URL='https://vyyfuaqmbxvfqgbfqooc.supabase.co';
process.env.CHAMAH_SUPABASE_PROJECT_ID='vyyfuaqmbxvfqgbfqooc';
process.env.CHAMAH_OAUTH_ISSUER='https://vyyfuaqmbxvfqgbfqooc.supabase.co/auth/v1';
process.env.CHAMAH_PORTAL_ORIGIN='https://chamah-portal.vercel.app';
process.env.CHAMAH_MCP_ORIGIN='https://chamah-portal.vercel.app';
process.env.CHAMAH_SUPABASE_PUBLISHABLE_KEY='sb_publishable_test';
process.env.CHAMAH_BUILD_COMMIT='test';

const handler=(await import('../api/mcp.js?production-tools-list')).default;
function response(){return {statusCode:0,headers:{},body:'',status(n){this.statusCode=n;return this;},setHeader(k,v){this.headers[k]=v;return this;},end(v=''){this.body=v;return this;}};}
async function invoke(roles){const old=globalThis.fetch;globalThis.fetch=async(url)=>({ok:true,status:200,async json(){if(String(url).includes('/auth/v1/user'))return {id:'director-id',email:'director@example.com'};if(String(url).includes('/rpc/portal_my_access'))return {profile:{is_active:true}};if(String(url).includes('/rpc/portal_my_authorization'))return {active:true,roles};return {};}});try{const res=response();await handler({method:'POST',headers:{authorization:'Bearer session'},body:{jsonrpc:'2.0',id:1,method:'tools/list'}},res);return JSON.parse(res.body);}finally{globalThis.fetch=old;}}
test('Production Director tools/list exposes the scan through the live handler',async()=>{const out=await invoke(['DIRECTOR']);assert.ok(out.result.tools.some(t=>t.name==='production_inventory_scan'));const tool=out.result.tools.find(t=>t.name==='production_inventory_scan');assert.equal(tool.inputSchema.properties.project_id.const,'vyyfuaqmbxvfqgbfqooc');});
test('Production non-Director tools/list excludes the scan',async()=>{const out=await invoke(['MANAGER']);assert.equal(out.result.tools.some(t=>t.name==='production_inventory_scan'),false);});
