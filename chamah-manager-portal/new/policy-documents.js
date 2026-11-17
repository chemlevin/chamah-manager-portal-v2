const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export async function mountPolicyDocuments(root, request, permissions) {
  const canEdit = permissions.manage === 'EDIT';
  const canPublish = permissions.publish === 'EDIT';
  let documents = [], selectedId = '', historyVisible = false;
  root.innerHTML = `<section class="panel" style="padding:20px"><h2>מסמכים ונהלים</h2><p>נהלים מפורסמים זמינים לצפייה. טיוטות זמינות למורשים בלבד.</p><div id="policy-message" role="status"></div>
  <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:12px 0">
  <input id="policy-filter" placeholder="חיפוש נוהל" aria-label="חיפוש נהלים" style="flex:1;min-width:160px">
  ${canEdit ? '<button id="policy-new" type="button">נוהל חדש</button>' : ''}</div>
  <div style="display:grid;grid-template-columns:minmax(190px,1fr) minmax(0,3fr);gap:16px;align-items:start">
  <div id="policy-list" aria-label="רשימת נהלים"></div><div id="policy-detail"></div></div></section>`;
  const list = root.querySelector('#policy-list'), detail = root.querySelector('#policy-detail'), message = root.querySelector('#policy-message');
  const showError = (err) => { message.textContent = err?.message || String(err); };
  const load = async () => {
    documents = await request('portal_policy_list');
    if (!Array.isArray(documents)) throw new Error('תשובת שרת לא תקינה');
    if (selectedId && !documents.some((d) => d.id === selectedId)) selectedId = '';
    drawList(); drawDetail();
  };
  const drawList = () => {
    const filter = root.querySelector('#policy-filter').value.trim().toLowerCase();
    const visible = documents.filter((d) => `${d.title} ${d.category}`.toLowerCase().includes(filter));
    list.innerHTML = visible.length ? visible.map((d) => `<button type="button" data-policy-id="${escape(d.id)}" style="display:block;width:100%;margin:5px 0;text-align:right;white-space:normal" aria-pressed="${d.id===selectedId}">${escape(d.title)} <small>${escape(d.category)} · ${d.status==='PUBLISHED'?'פורסם':d.status==='RETIRED'?'בוטל':'טיוטה'}</small></button>`).join('') : '<p>אין נהלים להצגה.</p>';
  };
  const drawDetail = () => {
    const d = documents.find((row) => row.id === selectedId);
    if (!d) { detail.innerHTML = '<p>בחרו נוהל להצגה או צרו נוהל חדש.</p>'; return; }
    const editable = canEdit;
    detail.innerHTML = `<article><h3>${escape(d.title)}</h3><p>גרסה מפורסמת: ${Number(d.published_version)||0}</p>
    ${editable ? `<form id="policy-form"><label>שם הנוהל<input name="title" maxlength="200" required value="${escape(d.title)}"></label><label>קטגוריה<input name="category" maxlength="120" value="${escape(d.category)}"></label><label>תוכן הנוהל<textarea name="body" rows="18" maxlength="100000" style="width:100%;min-height:320px;direction:rtl">${escape(d.body)}</textarea></label><button type="submit">שמירת טיוטה</button></form>` : `<div style="white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8">${escape(d.body)}</div>`}
    ${canPublish ? `<div style="display:flex;gap:8px;margin-top:12px"><button type="button" id="policy-publish">פרסום גרסה חדשה</button><button type="button" id="policy-retire">ביטול פרסום</button></div>` : ''}
    ${(canEdit||canPublish) ? '<button type="button" id="policy-history" style="margin-top:12px">היסטוריית גרסאות</button><div id="policy-history-content"></div>' : ''}
    ${editable && d.published_body ? `<details><summary>תוכן הגרסה המפורסמת</summary><div style="white-space:pre-wrap">${escape(d.published_body)}</div></details>` : ''}</article>`;
    detail.querySelector('#policy-form')?.addEventListener('submit', async (event) => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      try { await request('portal_policy_save',{p_id:d.id,p_title:form.get('title'),p_category:form.get('category'),p_body:form.get('body'),p_expected_updated_at:d.updated_at});message.textContent='הטיוטה נשמרה';await load(); } catch(e){showError(e);}
    });
    const publish = async (retire) => {
      if (!confirm(retire?'לבטל את פרסום הנוהל?':'לפרסם את הטיוטה כגרסה מחייבת?')) return;
      try { await request('portal_policy_publish',{p_id:d.id,p_retire:retire});message.textContent=retire?'הנוהל בוטל':'הנוהל פורסם';await load(); } catch(e){showError(e);}
    };
    detail.querySelector('#policy-publish')?.addEventListener('click',()=>publish(false));
    detail.querySelector('#policy-retire')?.addEventListener('click',()=>publish(true));
    detail.querySelector('#policy-history')?.addEventListener('click',async()=>{
      const container=detail.querySelector('#policy-history-content');
      try { const versions=await request('portal_policy_history',{p_id:d.id});container.innerHTML=versions.length?versions.map(v=>`<details><summary>גרסה ${Number(v.version)} — ${escape(v.title)}</summary><div style="white-space:pre-wrap">${escape(v.body)}</div></details>`).join(''):'<p>אין גרסאות קודמות.</p>'; }catch(e){showError(e);}
    });
  };
  list.addEventListener('click', (event) => {const button=event.target.closest('[data-policy-id]');if(button){selectedId=button.dataset.policyId;historyVisible=false;drawList();drawDetail();}});
  root.querySelector('#policy-filter').addEventListener('input',drawList);
  root.querySelector('#policy-new')?.addEventListener('click',async()=>{
    const title=prompt('שם הנוהל החדש');if(!title?.trim())return;
    try {selectedId=await request('portal_policy_create',{p_title:title.trim(),p_category:'כללי'});message.textContent='נוצרה טיוטה חדשה';await load();}catch(e){showError(e);}
  });
  try {await load();}catch(e){showError(e);}
}
