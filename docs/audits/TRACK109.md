# TRACK109 — החלטות מנהל/ת וארכיטקטורת AI

סטטוס: הושלם ב־2026-11-10; תיעוד בלבד; אין אישור יישום

ענף: `audit/track105-policy-contract`

היקף: חילוץ החלטות מ־TRACK105–108, מיפוי תשתית MCP/OAuth הקיימת, והצעת ארכיטקטורה מאוחדת לפורטל ולסוכני AI חיצוניים. לא בוצעו migration, שינוי נתונים, הרשאות, RLS, grants, פונקציות, Storage או deployment.

## תקציר לאישור המנהל/ת

החלטת היסוד המומלצת היא **בנייה מחדש חלקית סביב הנתונים הקיימים**: לשמר את נתוני הליבה, כללי החישוב, היסטוריית הביקורת, Supabase Auth ותשתית OAuth/MCP המצומצמת; להחליף את מודל ההרשאות החופף בגרעין הרשאות מרכזי אחד שישרת גם את הפורטל וגם כל API/MCP/סוכן AI.

המערכת המתוכננת תתמוך, בכפוף להרשאה, ב־`READ`, `CREATE`, `UPDATE`, `DELETE`, פעולות bulk ואוטומציה משני הממשקים. סוכן AI לא יקבל service role ולא סמכות עצמאית: הוא יפעל תמיד בשם משתמש מאומת, דרך פעולות סמנטיות סגורות, באותן הרשאות תפקיד, מעון ופעולה החלות בפורטל. פעולות רגישות ידרשו אישור אנושי מפורש, עדכני וקשור לגרסה המדויקת של הפעולה.

## 1. טבלת החלטות למנהל/ת

המלצות ברירת המחדל אינן מדיניות מאושרת. עמודת "אישור חובה" מציינת אם אסור להתחיל יישום תלוי־החלטה לפני אישור מפורש.

| החלטה נדרשת | מצב מאומת כיום | ברירת מחדל מומלצת | סיכונים | אישור מנהל/ת חובה |
|---|---|---|---|---|
| זהות המנהל/ת היחיד/ה | UUID אחד הוא מועמד טכני יחיד; הזהות העסקית לא אושרה | לאשר מחוץ לריפו UUID מדויק אחד ולשמור הגנת "מנהל/ת אחרון/ה" | שיוך שגוי מעניק שליטה מלאה או נועל את הארגון | כן |
| סיווג ריקי, שרון ולאה | שלוש זהויות פעילות; התפקיד העסקי אינו מוכח | לאשר לכל אחת תפקיד והיקף; ברירת מחדל ללא כתיבה עד אישור | עודף גישה או חסימת עבודה | כן |
| מודל ההרשאות הקנוני | flags, scope ו־`HIDDEN/VIEW/EDIT` חופפים | `identity + role + resource scope + semantic action`; מסכים לניווט בלבד | המשך confused-deputy וחוסר יכולת לבקר הרשאות | כן |
| סמכות כתיבה של מי שאינו מנהל/ת | 35 שורות `EDIT` אפקטיביות מגיעות למסלולי service role | להמיר ל־`VIEW`/`HIDDEN`; להעניק בעתיד רק capability פעולה מפורשת | פגיעה תפעולית אם ההמרה אינה ממופה; סיכון קריטי אם נשאר `EDIT` כללי | כן |
| היסטוריית הרשאות ישנה | 23 שורות `EDIT` נוספות הן היסטוריה לא־אפקטיבית | לשמר בארכיון ביקורת לתקופה מאושרת, לא למחוק אוטומטית | אובדן ראיות מול אגירת יתר | כן |
| מיפוי חמשת חשבונות הבנק | אין קשר סמכותי חשבון→ארגון/מעון/יחידה | מיפוי מפורש, מתוארך; חסימה כברירת מחדל כשחסר/עמום | דליפת מידע כספי או חסימה של 2,437 תנועות לא משויכות | כן |
| תנועות לא משויכות ושדות מוסתרים | כמעט כל התנועות אינן מוקצות | צפייה רק למי שמורשה לחשבון; צמצום/השחרת שדות לפי תפקיד | PII ופרטי בנק עלולים להיחשף | כן |
| מטריצת פעולות מזכירה/מנהל/ת כספים/מנהל/ת מעון | אין מטריצה קנונית; flags קיימים רחבים | מזכירה: טיוטה/שיוך/מסמך/שליחה; אישור כספי למנהל/ת כברירת מחדל | שיבוש תהליך או הפרת הפרדת תפקידים | כן |
| הפרדת תפקידים בתשלום | המודל הקיים מאפשר חפיפה רחבה | איסור self-approval; אישור, ביצוע ואימות כשלבים נפרדים | הונאה, טעות או הכחשה ללא ראיה | כן |
| ספים, מחליף/ה ו־break-glass | לא הוגדרו | כללים כנתונים מתוארכים; break-glass מוגבל, מנומק ומבוקר | עצירת תשלומים או עקיפת בקרה | כן |
| שינוי מהותי המבטל אישור | לא הוגדר | סכום, יעד תשלום, שיוכים, מסמכים, קטגוריה/חודש ומועד מבטלים אישור | שימוש באישור ישן לפעולה שונה | כן |
| מצבי בקשת תשלום וחריגים | `bank_transfers` אינו מודל אישור מלא | aggregate נפרד; לתמוך בדחייה/ביטול/פתיחה מחדש/חלקי לפי מדיניות | מצבים חשבונאיים עמומים ואובדן עקיבות | כן |
| בעלות ופרטיות ספקים | אין מודל ספק מאושר | בעל נתונים מוגדר, אימות פרטי בנק, הצגת מינימום נדרש | תשלום ליעד שגוי וחשיפת מידע רגיש | כן |
| קבצים, סריקה, שמירה ומחיקה | bucket פרטי יחיד, ללא MIME allowlist או policies לאובייקטים | buckets לפי מטרה, sniffing/סריקה, digest, retention ו־legal hold מאושרים | malware, דליפה, מחיקה לא ניתנת לשחזור | כן |
| שמירת קובצי/שורות ייבוא והיסטוריה חסרת actor | שני batches ללא actor; כללי retention חסרים | לא להמציא בעלות; מינימיזציה, כלל קריאה ושמירה מאושרים | חוסר תאימות ביקורת או אגירת מידע רגיש | כן |
| חריג duplicate מדויק | unique fingerprint קיים ועלול להתנגש במקרה לגיטימי | לא להחליש; מסלול חריג נפרד, מנומק ומאושר | כפילות כספית או חסימת תנועה אמיתית | כן |
| פעולות AI מותרות | MCP קיים הוא allowlist לקריאה בלבד | לפתוח לפי שלבים: קריאה, טיוטה, הצעה, ואז commit מאושר; deny-by-default | prompt injection או פעולה מעבר לכוונת המשתמש | כן |
| פעולות רגישות הדורשות אישור מפורש | אין מנגנון אחיד | DELETE, bulk commit, תשלום, שינוי הרשאה/היקף, ייבוא קנוני ופעולה בלתי־הפיכה דורשים approval artifact קצר־חיים | אישור עמום, replay או אישור לגרסה שונה | כן |
| אוטומציות | אין מודל delegated automation מאושר | הרשאה נפרדת עם יוצר, פעולות/היקף, לוח זמנים, תפוגה, מגבלות ו־kill switch | פעולה מתמשכת אחרי ביטול תפקיד או שינוי צורך | כן |
| מדיניות מחיקה | לא הוגדרה לכל domain | soft-delete/ביטול כברירת מחדל; hard delete חריג, דו־שלבי ומבוקר | אובדן ראיות/נתונים או צבירת מידע אסור | כן |
| audit ותקופת שמירה | מבני audit קיימים אך ההבטחות אינן אחידות | append-only, actor אנושי + client/agent, before/after ממוזערים, correlation ו־approval ID | חוסר יכולת חקירה או חשיפת PII בלוג | כן |
| leaked-password והחלמת מנהל/ת | ההגנה כבויה; recovery סופי לא אושר | להפעיל אחרי בדיקה; נוהל recovery עם MFA ובקרת שני אנשים | takeover או נעילה תפעולית | כן |
| service role בתקופת מעבר | פונקציות workbench משתמשות בו כ־data plane | שימוש זמני בלבד מאחורי פקודות סגורות; יעד וקריטריוני יציאה מאושרים | עקיפת RLS בגלל שגיאת route אחת | כן |
| ריבוי ספקי AI | אין שכבת provider קנונית | MCP/OpenAPI ניטרליים; adapters דקים; schema/authorization/audit בבעלות המערכת | lock-in והתנהגות הרשאה לא עקבית בין ספקים | כן |
| פרישת Sheets ונתיבים ישנים | שימוש בפועל לא הוכח | לפרוש רק אחרי telemetry, parity ואישור בעלים | שבירת צרכן לא ידוע או כפילות מקורות אמת | כן |
| Preview, בדיקות ו־Production | אין אישור ליישום | Preview מבודד וחבילת DB+Functions אטומית; Production רק אחרי מטריצה מלאה | rollout חלקי או פגיעה בנתונים חיים | כן |

## 2. ארכיטקטורת הרשאות מאוחדת — Portal + AI/MCP/API

### 2.1 עיקרון מחייב

כל ערוץ נכנס — פורטל, API ישיר, MCP, ספק AI או אוטומציה — עובר אותו מסלול לוגי:

`אימות זהות → בניית הקשר מבקש → החלטת הרשאה → אימות קלט/גרסה → אישור רגיש אם נדרש → Query/Command סמנטי → transaction → audit`

אין הרשאות "של AI" בנפרד מהרשאות המשתמש. ההחלטה נקבעת בצד השרת מהזהות המאומתת, התפקידים המוגנים, היקף המשאב והפעולה המדויקת. טקסט prompt, שם כלי, שדות actor מהלקוח או טענת "אני המנהל/ת" אינם מקור סמכות.

### 2.2 רכיבים מוצעים

| רכיב | אחריות |
|---|---|
| Identity gateway | אימות Supabase Auth/OAuth, סטטוס משתמש, token audience/session; ללא service-role אצל לקוח או סוכן |
| Request context | `actor_user_id`, ערוץ (`PORTAL/API/MCP/AUTOMATION`), client/provider, session/delegation ID, correlation ID; actor נגזר מה־JWT |
| Authorization kernel | החלטה קנונית לפי `action_code`, סוג/מזהה משאב, תפקיד, daycare/unit/account scope, זמן ותנאי workflow; default deny |
| Policy data | תפקידים, capabilities, שיוכים מתוארכים, scope לחשבונות, ספים והפרדת תפקידים; כתיבה רק דרך פעולות ניהול מאושרות |
| Query services | קריאות מצומצמות ושדה־לפי־הרשאה; pagination, masking והגנת cross-scope |
| Command services | `CREATE/UPDATE/DELETE/BULK/AUTOMATION` כפקודות domain סגורות; ללא table name, SQL, bucket path או RPC שרירותיים |
| Validation layer | schema, כללי domain, row version, digest, idempotency, מגבלות bulk וקבצים; preview יבש לפני פעולות מורכבות |
| Approval service | artifact קצר־חיים הקשור ל־actor, action, target set, payload digest, גרסה, סכום ותפוגה; חד־פעמי ומבוטל בשינוי |
| Transaction boundary | RPC/transaction אטומי לפעולה קנונית, נעילות/optimistic concurrency ו־rollback מלא |
| Audit/outbox | רישום append-only של בקשה, החלטת הרשאה, אישור, תוצאה ושינויים; event/outbox לאוטומציה אמינה |
| Provider adapters | MCP Streamable HTTP ו־REST/OpenAPI/SDK ממפים לאותו action catalog; אין לוגיקה עסקית או הרשאה ייחודית לספק |

### 2.3 מודל פעולה

כל פעולה מוגדרת בקטלוג יציב, למשל `EMPLOYEE.READ`, `PAYMENT_REQUEST.CREATE`, `PAYMENT_REQUEST.SUBMIT`, `PAYMENT.APPROVE`, `BANK_IMPORT.COMMIT`, `USER.ROLE_ASSIGN`. לכל פעולה מוגדרים:

- סוגי משאב והיקפים מותרים;
- schema קלט/פלט ורמת redaction;
- האם היא קוראת, יוצרת, משנה, מוחקת, bulk או automation;
- האם נדרשים preview, אישור אנושי, הפרדת תפקידים, סף כספי או reauthentication;
- מגבלת פריטים/זמן, idempotency ו־concurrency policy;
- אירועי audit מחייבים.

הפורטל וכלי AI קוראים לאותו Query/Command. ה־UI רשאי להסתיר כפתור לפי introspection, אך השרת ומסד הנתונים אוכפים מחדש בזמן הפעולה. פקודה רגישה נבדקת שוב מיד לפני commit כדי שביטול תפקיד/היקף ייכנס לתוקף גם מול session קיים.

### 2.4 AI, bulk ואוטומציה

- כלי AI מקבלים JSON schema מצומצם ולא גישה כללית למסד. תוצאות קריאה מסוננות וממוזערות לפני שהן מגיעות לספק.
- כתיבה מתחילה כ־draft/preview. הכלי מחזיר סיכום שינוי ו־digest; אישור אנושי נעשה בערוץ מאומת ואינו טקסט חופשי בתוך prompt.
- bulk מחייב רשימת targets סופית, מגבלה, dry-run, סיכום שגיאות ואטומיות מוגדרת (`all-or-nothing` או תוצאות פר־פריט מאושרות מראש).
- automation היא delegation מפורשת, לא session אנושי אינסופי: actions/scopes קבועים, תוקף, תדירות, quota, owner, ביטול מיידי ואישור מחדש לפעולה רגישה.
- prompt injection מטופל כקלט לא מהימן. מודל אינו יכול להוסיף כלי, לשנות action code או להרחיב scope.
- תמיכה במספר ספקים נשענת על schemas ופרוטוקולים פתוחים. provider adapter מטפל בפורמט tool-calling בלבד; תוצאות הרשאה, approvals, validation ו־audit נשארים בצד המערכת.

## 3. תשתית MCP קיימת שניתן לשמר

| רכיב קיים | מצב מאומת | שימוש מומלץ |
|---|---|---|
| Supabase Auth + OAuth/PKCE | OAuth פועל עם callback relay מוצפן וקצר־חיים | לשמר כ־identity gateway; להקשיח recovery והגדרות Auth בנפרד |
| Protected-resource metadata ו־bearer challenge | קיים בכתובת הקנונית ונבדק ב־Production | לשמר לגילוי endpoint ואימות לקוחות |
| `portal-mcp-server` | MCP Streamable HTTP סטטלס, גרסה `2025-03-26`, allowlist סגור | לשמר את מעטפת הפרוטוקול; להחליף routing ידני ב־action catalog משותף |
| JWT של המשתמש מועבר ל־RPC | אין service-role key בשרת MCP; `auth.uid()` נשמר | זהו הדפוס המחייב גם לכלי כתיבה עתידיים |
| RPCs מצומצמים | `portal_mcp_list_daycares`, `portal_mcp_staff_by_daycare`, policy list/read | לשמר זמנית; להעביר לגרעין ההרשאות החדש ולבטל תלות ב־flags הישנים |
| כלים נוכחיים | קריאה בלבד; כלי כתיבה מומצא נדחה | לשמר עד מעבר מבוקר; לא להרחיב לכתיבה לפני Phase 1–2 |
| אימות active user ו־gateway JWT | קיים בשכבת Edge Function | לשמר ולהוסיף בדיקת action/scope ורה־אימות לפעולות רגישות |
| בדיקות OAuth/MCP | חוזים קיימים ב־`tests/oauth-mcp-reconciliation.test.mjs` ובדיקות relay | להרחיב למטריצת role/scope/action/provider, revocation וכתיבה |
| Audit קיים | טבלאות/שדות actor קיימים אך לא חוזה אחיד לכל MCP call | לשמר נתונים; להוסיף audit envelope אחיד ללא prompt/PII גולמי |

אין לעשות שימוש חוזר ב־`mcp_full_read_access`, ב־screen `EDIT`, ב־`is_super_admin` או ב־service-role workbench כגרעין החדש. אלו מנגנוני תאימות זמניים בלבד.

## 4. שלבי יישום מומלצים

אף שלב אינו מאושר על ידי TRACK109.

### Phase 0 — החלטות וחוזים

- לאשר את כל שורות טבלת ההחלטות הרלוונטיות לגל הראשון.
- להקפיא action catalog ראשון לקריאה, זהויות/תפקידים, scopes ומיפויי חשבון.
- לכתוב חוזי deny-by-default, redaction, audit, approval ו־transaction לפני migration.

**שער:** אישור מנהל/ת, עסקי ואבטחה; חבילת Preview נפרדת תאושר רק לאחר מכן.

### Phase 1 — גרעין הרשאות וקריאה מאוחדת

- להוסיף role/action/scope קנוניים ו־authorization decision API פרטי.
- להעביר תחילה קריאות MCP והפורטל לאותם Query Services לפי domain.
- לבדוק אנונימי, inactive, revoked, cross-daycare/account, organization ו־Director.
- להשאיר writes קיימים ללא הרחבת AI; unresolved mapping נחסם.

**עדיפות:** זהו גל ה־AI המאובטח הראשון—קריאה שימושית ומצומצמת ללא service role.

### Phase 2 — פקודות draft לא־רגישות

- להוסיף `CREATE/UPDATE` לטיוטות בלבד, validation, versioning, idempotency ו־audit.
- לחשוף אותן לפורטל ול־MCP דרך אותם schemas.
- לאפשר AI להציע/לשמור draft; לא לאשר תשלום, לא commit קנוני, לא DELETE.

### Phase 3 — אישורים וכתיבה רגישה

- להוסיף approval artifacts, reauthentication, separation-of-duties ו־commit אטומי.
- לפתוח בהדרגה submit/approve/import/bulk למשתמשים ופעולות מאושרים בלבד.
- כל domain עובר Preview עם disposable identities, revocation, replay, tamper ו־rollback tests.

### Phase 4 — DELETE, bulk ואוטומציה

- להפעיל תחילה cancel/soft-delete; hard delete רק היכן שמדיניות השמירה מתירה.
- להוסיף bulk dry-run וגבולות אטומיות.
- להוסיף delegated automations קצרות־טווח עם kill switch, quotas ו־approval מחדש לרגישות.

### Phase 5 — ריבוי ספקים ופרישת legacy

- לאמת לפחות שני clients/providers מול אותו MCP/action contract ותוצאות הרשאה זהות.
- להסיר סמכות mutation מ־screen `EDIT`, flags ישנים ו־service-role workbenches לאחר parity.
- לפרוש Sheets/נתיבים ישנים רק לאחר telemetry, reconciliation ואישור מפורש.

## 5. חסמים מדויקים לפני יישום

1. לא אושר ה־Auth UUID של המנהל/ת היחיד/ה ולא אושר נוהל final-Director/break-glass.
2. לא אושרו התפקידים וההיקפים של שלוש הזהויות הפעילות האחרות.
3. אין החלטה לכל 35 הרשאות `EDIT` האפקטיביות ול־23 שורות ההיסטוריה.
4. אין מיפוי מאושר לחמשת חשבונות הבנק ואין מדיניות לתנועות לא משויכות ול־default deny.
5. אין action matrix מאושרת לפורטל ול־AI, לרבות secretary/finance/manager/director.
6. לא הוגדרו הפרדת תפקידים, ספים, מחליף/ה, self-approval ופעולות רגישות.
7. לא הוגדרו approval artifact, תוקף, payload digest, reauthentication ו־replay policy.
8. לא אושרו מחיקה, retention, legal hold, backup, קבצים, MIME/scan ו־signed URL lifetime.
9. לא אושר תהליך duplicate מדויק והחריג להתנגשות לגיטימית.
10. אין חוזה automation delegation: owner, scope, actions, expiry, quotas, kill switch ו־approval renewal.
11. אין schema מאושר לגרעין roles/actions/scopes, ACL/RLS, object owners ו־catalog assertions.
12. אין מיפוי מלא של כל mutation route קיים לפעולה סמנטית ולגבול transaction/audit.
13. אין החלטה על תקופת המעבר והדדליין להוצאת service role ממסלול הנתונים היישומי.
14. אין runtime acceptance מאושר עם disposable identities לכל role/scope, revocation, stale token, cross-scope ו־confused deputy.
15. אין אישור לחבילת migration + Edge Functions אטומית בסביבת Preview מבודדת; אין אישור Production.

## 6. מסקנה

הכיוון המומלץ הוא לא "MCP עם כלי כתיבה" כשכבה נפרדת, אלא פלטפורמת פעולות מורשות אחת שלה שני לקוחות שווי־מעמד: הפורטל וסוכני AI. תשתית OAuth/MCP הקיימת מקצרת את הדרך לזיהוי ולקריאה מאובטחת, אך כתיבה מלאה תיפתח רק דרך גרעין הרשאות משותף, פקודות domain סגורות, validation, transactions, audit ואישור אנושי לפעולות רגישות. עד לאישור החסמים לעיל, מצב ה־MCP צריך להישאר read-only ומצומצם.
