import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';

const outDir = new URL('./', import.meta.url).pathname.replace(/^\/(.:\/)/, '$1');
mkdirSync(outDir, { recursive: true });

const sources = {
  JEWISH: { path: 'C:/Users/User/Downloads/jewish.pdf', expected: '0ff3cf2173411ce296747b8b4ba9e92d238b354b9a29faef5532ac5185b064d9' },
  HAREDI: { path: 'C:/Users/User/Downloads/haredi (1).pdf', expected: '680e743ccebeebb9f60da64580ae47f7a229e823637c02a227a114356a0796a6' }
};
for (const s of Object.values(sources)) {
  s.filename = basename(s.path);
  s.sha256 = createHash('sha256').update(readFileSync(s.path)).digest('hex');
  if (s.sha256 !== s.expected) throw new Error(`Source digest changed: ${s.filename}`);
}

const sha = value => createHash('sha256').update(value).digest('hex');
const stableUuid = value => {
  const h = sha(value).slice(0, 32).split('');
  h[12] = '5';
  h[16] = ((parseInt(h[16], 16) & 3) | 8).toString(16);
  return `${h.slice(0,8).join('')}-${h.slice(8,12).join('')}-${h.slice(12,16).join('')}-${h.slice(16,20).join('')}-${h.slice(20).join('')}`;
};
const isoDates = (from, to) => {
  const dates=[];
  for (let d=new Date(`${from}T00:00:00Z`), end=new Date(`${to}T00:00:00Z`); d<=end; d.setUTCDate(d.getUTCDate()+1)) dates.push(d.toISOString().slice(0,10));
  return dates;
};
const inRange = (date, from, to) => date >= from && date <= to;

const sourceText = {
  JEWISH: {
    title: 'לוח חופשות במעונות יום בחברה היהודית - שנה״ל תשפ״ז 2026-2027',
    opening: 'פתיחת שנה״ל תשפ״ז: יום שלישי 01.09.2026 י״ט אלול תשפ״ו',
    closing: 'סיום שנה״ל תשפ״ז: יום שני 09.08.2027 ו׳ אב תשפ״ז',
    holidays: [
      ['2026-09-11','2026-09-13','ראש השנה — 11-13.09.2026'],
      ['2026-09-20','2026-09-21','יום כיפור — 20-21.09.2026'],
      ['2026-09-25','2026-09-26','ערב סוכות וסוכות — 25-26.09.2026'],
      ['2026-09-27','2026-09-27','א׳ חול המועד — 27.09.2026'],
      ['2026-10-01','2026-10-03','ה׳ חול המועד, הושענא רבה ושמחת תורה — 1-3.10.2026'],
      ['2026-12-10','2026-12-11','חנוכה — 10-11.12.2026'],
      ['2027-03-23','2027-03-23','פורים — 23.03.2027; פרט לירושלים'],
      ['2027-04-19','2027-04-28','פסח — 19-28.04.2027'],
      ['2027-05-12','2027-05-12','יום העצמאות — 12.05.2027'],
      ['2027-06-10','2027-06-11','שבועות — 10-11.06.2027']
    ],
    partial: [['2027-05-11','יום הזיכרון — 11.05.2027; עובדים עד 12:00',270]]
  },
  HAREDI: {
    title: 'לוח חופשות במעונות יום בחברה החרדית שנה״ל תשפ״ז 2026-2027',
    opening: 'פתיחת שנה״ל תשפ״ז: יום שישי 14.08.2026 א׳ אלול תשפ״ו',
    closing: 'סיום שנה״ל תשפ״ז: יום רביעי 11.08.2027 ח׳ אב תשפ״ז',
    holidays: [
      ['2026-09-11','2026-09-13','ראש השנה — 11-13.09.2026'],
      ['2026-09-20','2026-09-21','יום כיפור — 20-21.09.2026'],
      ['2026-09-25','2026-10-03','סוכות, הושענא רבה ושמחת תורה — 25.09.2026-03.10.2026'],
      ['2026-12-06','2026-12-06','חנוכה — 06.12.2026'],
      ['2027-03-23','2027-03-23','פורים — 23.03.2027; פרט לירושלים'],
      ['2027-04-19','2027-04-28','פסח — 19-28.04.2027'],
      ['2027-05-12','2027-05-12','יום העצמאות — 12.05.2027'],
      ['2027-06-10','2027-06-11','שבועות — 10-11.06.2027'],
      ['2027-08-12','2027-08-12','תשעה באב — 12.08.2027']
    ],
    partial: [['2027-05-11','יום הזיכרון — 11.05.2027; עובדים עד 12:00',270]]
  }
};

const environments = {
  preview: {
    project_id:'iwsbjudahtjyigecymzd', school_year_id:'c9ccbcd3-2810-43dd-9b9d-677e099ff4db',
    daycares:{'DC-MAHANE':'ae000854-ba01-40d8-8fd6-b02bea5e014c','DC-MERKAZI':'4de11847-b4f6-4aaa-8242-c8101a6ddff6','DC-SNIF':'1c0a2dba-bb82-442e-b9c7-d6e9ca62da35','DC-NEOT':'e75e7675-d0aa-4068-8b4d-575be5c596a6','DC-ASHKELON':'868d9317-85f0-4365-aec6-3300a5734bdd'},
    months:{}
  },
  production: {
    project_id:'vyyfuaqmbxvfqgbfqooc', school_year_id:'c9ccbcd3-2810-43dd-9b9d-677e099ff4db',
    daycares:{'DC-MAHANE':'bda6b7c5-05fe-4e2a-a8d5-0e14a5da6453','DC-MERKAZI':'d38979a2-ba61-4095-84d4-98a6af4160d4','DC-SNIF':'424eed16-3c9f-4e15-8111-339542408da3','DC-NEOT':'f596f69b-5163-4db3-8694-34b9147cd48a','DC-ASHKELON':'5c6b4d63-efb6-427c-9785-c62f418daede'},
    months:{'2026-09':'4975d8ef-dfd7-4577-9d1c-0429b16fb6b2','2026-10':'e80e9044-5d0b-4606-9f0d-71b663346a99','2026-11':'9fc35f7f-adfe-4243-956a-a3a9d9dfdecc','2026-12':'94431b99-e186-4b5d-921a-0ed6d3149495','2027-01':'f110211f-06e7-4101-87fa-43ded3e6b0db','2027-02':'277296a5-7be2-452e-8008-7bfc0fddd528','2027-03':'b287b7e2-6a91-4b24-b060-932fa0857aec','2027-04':'7dd95979-9d5d-4e75-bf3a-958a45f36882','2027-05':'ccc5cfc0-7dd5-4724-95e1-decf5bc26330','2027-06':'f4fc838b-1073-4538-992f-86211dd970a5','2027-07':'eb0c2002-338f-4351-8b66-26b165e8a697','2027-08':'461d6bf8-e1a8-4cfa-a07f-163f4fc2d6b5'}
  }
};
const jewishCodes=['DC-MAHANE','DC-MERKAZI','DC-SNIF','DC-NEOT'];
const months=['2026-09','2026-10','2026-11','2026-12','2027-01','2027-02','2027-03','2027-04','2027-05','2027-06','2027-07','2027-08'];
for (const month of months) environments.preview.months[month]=stableUuid(`preview-school-year-month|${month}`);

function baseDecision(type,date){
  const spec=sourceText[type], dow=new Date(`${date}T00:00:00Z`).getUTCDay();
  if(dow===6) return {status:'CLOSED',reason:'שבת'};
  for(const [from,to,text] of spec.holidays) if(inRange(date,from,to)) return {status:'CLOSED',reason:text};
  for(const [d,text,minutes] of spec.partial) if(date===d) return {status:'PARTIAL',reason:text,minutes};
  if(date>spec.closing.match(/\d{2}\.\d{2}\.\d{4}/)[0].split('.').reverse().join('-')) return {status:'CLOSED',reason:spec.closing};
  return {status:'OPEN',reason:`${spec.title}; ${spec.opening}; התאריך אינו רשום כיום חופשה`};
}
function monthResult(type,month,exceptions){
  let operating_days=0,regular_minutes=0,short_day_minutes=0;
  for(const date of isoDates(`${month}-01`,new Date(Date.UTC(+month.slice(0,4),+month.slice(5,7),0)).toISOString().slice(0,10))){
    const dow=new Date(`${date}T00:00:00Z`).getUTCDay();
    let d=baseDecision(type,date); if(exceptions[date]) d=exceptions[date];
    if(d.status==='CLOSED') continue;
    const minutes=d.status==='PARTIAL'?d.minutes:(dow===5?270:510);
    operating_days++; if(dow===5) short_day_minutes+=minutes; else regular_minutes+=minutes;
  }
  return {operating_days,regular_minutes,short_day_minutes};
}

function build(envName,env){
  const rows=[], calendarIds={JEWISH:stableUuid('calendar|JEWISH|SY-2026-2027|v1'),HAREDI:stableUuid('calendar|HAREDI|SY-2026-2027|v1')};
  const sourceBatchId=stableUuid(`source-batch|${sources.JEWISH.sha256}|${sources.HAREDI.sha256}`);
  for(const type of ['JEWISH','HAREDI']) rows.push({entity:'holiday_calendars',values:{holiday_calendar_id:calendarIds[type],calendar_code:`${type}-SY-2026-2027`,calendar_type:type,school_year_id:env.school_year_id,version:1,effective_from:'2026-09-01',effective_to:'2027-08-31',source_batch_id:sourceBatchId,lifecycle_status:'DRAFT'}});
  for(const type of ['JEWISH','HAREDI']) for(const date of isoDates('2026-09-01','2027-08-31')){
    const d=baseDecision(type,date), source=`${sourceText[type].title} | ${d.reason}`;
    rows.push({entity:'holiday_calendar_days',values:{holiday_calendar_day_id:stableUuid(`calendar-day|${type}|${date}|v1`),holiday_calendar_id:calendarIds[type],calendar_date:date,day_status:d.status,reason:d.reason,source_row_id:stableUuid(`source-row|${sources[type].sha256}|page-1|${date}|${source}`),source_page:1,source_text:source,source_fingerprint:sha(`${sources[type].filename}|${sources[type].sha256}|1|${date}|${source}`)}});
  }
  const assignments=[...jewishCodes.map(c=>[c,'JEWISH']),['DC-ASHKELON','HAREDI']];
  for(const [code,type] of assignments){
    const daycare_id=env.daycares[code];
    const lineage={source_file:sources[type].filename,source_sha256:sources[type].sha256,source_page:1,calendar_type:type,daycare_code:code};
    rows.push({entity:'daycare_calendar_assignments',values:{daycare_calendar_assignment_id:stableUuid(`assignment|${envName}|${code}|SY-2026-2027|v1`),daycare_id,holiday_calendar_id:calendarIds[type],school_year_id:env.school_year_id,effective_from:'2026-09-01',effective_to:'2027-08-31',version:1,source_lineage:lineage,lifecycle_status:'DRAFT'}});
    for(let weekday=0;weekday<=5;weekday++) rows.push({entity:'daycare_operating_hours',values:{operating_hours_id:stableUuid(`hours|${envName}|${code}|${weekday}|2026-09-01|v1`),daycare_id,weekday,opens_at:'07:30:00',closes_at:weekday===5?'12:00:00':'16:00:00',is_short_day:weekday===5,effective_from:'2026-09-01',effective_to:'2027-08-31',version:1,source_lineage:{rule:'BR-0025 Daycare Licensing Hours',source:'docs/handbook/staffing-rules.md',daycare_code:code},lifecycle_status:'DRAFT'}});
  }
  const exceptionDates={'2026-09-27':{status:'CLOSED',reason:'Director decision: five full Sukkot closure days 27.09-01.10.2026'},'2026-09-28':{status:'CLOSED',reason:'Director decision: five full Sukkot closure days 27.09-01.10.2026'},'2026-09-29':{status:'CLOSED',reason:'Director decision: five full Sukkot closure days 27.09-01.10.2026'},'2026-09-30':{status:'CLOSED',reason:'Director decision: five full Sukkot closure days 27.09-01.10.2026'},'2026-10-01':{status:'CLOSED',reason:'Director decision: five full Sukkot closure days 27.09-01.10.2026'},'2026-08-28':{status:'OPEN',reason:'Director decision: replacement operating day before school-year opening'},'2026-08-30':{status:'OPEN',reason:'Director decision: replacement operating day before school-year opening'},'2026-08-31':{status:'OPEN',reason:'Director decision: replacement operating day before school-year opening'}};
  for(const code of jewishCodes) for(const [date,d] of Object.entries(exceptionDates)) rows.push({entity:'daycare_calendar_exceptions',values:{calendar_exception_id:stableUuid(`exception|${envName}|${code}|${date}|v1`),daycare_id:env.daycares[code],exception_date:date,day_status:d.status,reason:d.reason,source_lineage:{authority:'Director',decision:'5 full Sukkot closure days and 3 replacement operating days',calendar_file:sources.JEWISH.filename,calendar_sha256:sources.JEWISH.sha256},version:1,lifecycle_status:'DRAFT'}});
  for(const [code,type] of assignments){
    const applied={}; if(type==='JEWISH') for(const [date,d] of Object.entries(exceptionDates)) if(date>='2026-09-01') applied[date]=d;
    for(const month of months){const calc=monthResult(type,month,applied); rows.push({entity:'daycare_monthly_operating_results',values:{monthly_operating_result_id:stableUuid(`monthly-result|${envName}|${code}|${month}|v1`),daycare_id:env.daycares[code],school_year_month_id:env.months[month],holiday_calendar_id:calendarIds[type],calendar_version:1,...calc,calculation_rule_key:'calendar-days-plus-effective-exceptions',calculation_rule_version:'1.0.0',source_lineage:{calendar_file:sources[type].filename,calendar_sha256:sources[type].sha256,calendar_page:1,operating_hours_rule:'BR-0025',exceptions:type==='JEWISH'?'Director decision: 5 Sukkot closure + 3 pre-opening replacement days':'none'},calculation_status:'CALCULATED'}});}
  }
  const counts=Object.fromEntries([...new Set(rows.map(r=>r.entity))].map(e=>[e,rows.filter(r=>r.entity===e).length]));
  if(rows.length!==859) throw new Error(`Expected 859 rows, got ${rows.length}`);
  const rowsDigest=sha(JSON.stringify(rows));
  const payload={contract_version:'1.0.0',idempotency_key:`calendar-sy-2026-2027-${rowsDigest.slice(0,32)}`,rows,source_name:'Governed calendar SY 2026-2027',source_provenance:{task_id:'CHAMAH-CALENDAR-GOVERNED-PREVIEW-COMPLETION-2026-11-25-001',source_system:'authoritative attached Ministry of Education calendar PDFs',source_files:[{filename:sources.JEWISH.filename,sha256:sources.JEWISH.sha256,page_count:1,applies_to:jewishCodes},{filename:sources.HAREDI.filename,sha256:sources.HAREDI.sha256,page_count:1,applies_to:['DC-ASHKELON']}],operating_rules:{school_year:'2026-09-01/2027-08-31',sun_thu:'07:30-16:00',fri:'07:30-12:00',jewish_sukkot_closure:'2026-09-27/2026-10-01',jewish_replacement_days:['2026-08-28','2026-08-30','2026-08-31']},payload_rows:859,payload_rows_sha256:rowsDigest,target_project_id:env.project_id}};
  writeFileSync(join(outDir,`${envName}-calendar-859.json`),JSON.stringify(payload,null,2));
  return {environment:envName,project_id:env.project_id,row_count:rows.length,entity_counts:counts,rows_sha256:rowsDigest,payload_sha256:sha(JSON.stringify(payload)),idempotency_key:payload.idempotency_key};
}
const summary=Object.entries(environments).map(([n,e])=>build(n,e));
writeFileSync(join(outDir,'summary.json'),JSON.stringify({sources,summary},null,2));
console.log(JSON.stringify({sources,summary},null,2));
