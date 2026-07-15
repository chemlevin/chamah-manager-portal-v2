const SUPABASE_URL = 'https://vyyfuaqmbxvfqgbfqooc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4MKSdjf7O1oVS4SWhQ36Qw_QUKW8dyW';
const SESSION_KEY = 'chamah.portal.session';
// Temporary Preview-only authentication bypass. Remove before launch.
const TEMP_PREVIEW_AUTH_BYPASS_HOSTNAME = 'chamah-manager-portal-v2-preview.vercel.app';
const isTemporaryPreviewAuthBypass = () => location.hostname === TEMP_PREVIEW_AUTH_BYPASS_HOSTNAME;
const $ = (selector) => document.querySelector(selector);

const modules = [
  { route: 'dashboards', icon: '📊', title: 'דשבורדים', description: 'תמונת מצב ניהולית ברורה, מדדים מרכזיים ונושאים הדורשים תשומת לב.' },
  { route: 'calculators', icon: '🧮', title: 'מחשבונים', description: 'כלי חישוב ותכנון שיסייעו בקבלת החלטות מהירה ומדויקת.' },
  { route: 'tasks', icon: '✅', title: 'משימות', description: 'ריכוז משימות, מעקב אחר ביצוע ותיעדוף העבודה השוטפת.' },
  { route: 'maintenance', icon: '🔧', title: 'תחזוקה', description: 'דיווח תקלות, מעקב טיפול וניהול תחזוקת המעונות.' },
  { route: 'knowledge', icon: '📚', title: 'מרכז ידע והנחיות', description: 'נהלים, הנחיות מקצועיות ומידע ארגוני במקום אחד.' }
];

const routes = Object.fromEntries(modules.map((module) => [module.route, module]));
routes.home = { route: 'home', title: 'עמוד הבית' };

function readSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}

function saveSession(value) {
  value ? localStorage.setItem(SESSION_KEY, JSON.stringify(value)) : localStorage.removeItem(SESSION_KEY);
}

function parseCallback() {
  const hash = new URLSearchParams(location.hash.slice(1));
  if (hash.get('access_token')) {
    saveSession({ access_token: hash.get('access_token'), refresh_token: hash.get('refresh_token'), expires_at: Math.floor(Date.now() / 1000) + Number(hash.get('expires_in') || 3600) });
    history.replaceState({}, '', location.pathname);
  }
  const error = new URLSearchParams(location.search).get('error_description');
  if (error) $('#login-message').textContent = error;
}

async function sendLoginLink(email) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, create_user: true, options: { email_redirect_to: location.href.split(/[?#]/)[0] } })
  });
  if (!response.ok) throw new Error((await response.json()).msg || 'שליחת הקישור נכשלה. אפשר לנסות שוב בעוד רגע.');
}

function getRoute() {
  const route = location.hash.slice(1).split('?')[0];
  return routes[route] ? route : 'home';
}

function homeTemplate() {
  return `<section class="page-heading">
    <div><p class="eyebrow">סביבת העבודה שלך</p><h1>שלום, ברוכה הבאה לפורטל חמ״ה</h1><p>מכאן ניתן להגיע לכל כלי הניהול, המעקב והידע של הארגון.</p></div>
    <span class="status-badge status-success"><span aria-hidden="true">●</span> המערכת זמינה</span>
  </section>
  <section class="attention-panel panel" aria-labelledby="attention-title"><div class="attention-icon" aria-hidden="true">i</div><div><h2 id="attention-title">הפורטל החדש בהקמה</h2><p>מעטפת העבודה מוכנה. המודולים ייפתחו בהדרגה בספרינטים הבאים.</p></div><a class="button button-secondary" href="#knowledge">למידע נוסף</a></section>
  <section aria-labelledby="modules-title"><div class="section-heading"><div><h2 id="modules-title">לאן תרצי להמשיך?</h2><p>בחרי תחום כדי לפתוח את סביבת העבודה המתאימה.</p></div></div>
    <div class="module-grid">${modules.map((module) => `<a class="module-card card" href="#${module.route}"><span class="module-icon" aria-hidden="true">${module.icon}</span><div><h3>${module.title}</h3><p>${module.description}</p></div><span class="card-action">פתיחה <span aria-hidden="true">←</span></span></a>`).join('')}</div>
  </section>`;
}

function comingSoonTemplate(module) {
  return `<section class="page-heading"><div><p class="eyebrow">${module.title}</p><h1>${module.title}</h1><p>${module.description}</p></div><span class="status-badge status-neutral">בתכנון</span></section>
  <section class="coming-soon panel"><span class="coming-icon" aria-hidden="true">${module.icon}</span><span class="status-badge status-info">בקרוב</span><h2>המודול נמצא בהכנה</h2><p>אנחנו בונים עבורך סביבת עבודה מקצועית, מהירה וברורה. היא תתווסף לפורטל באחד הספרינטים הקרובים.</p><div class="next-action"><strong>הפעולה הבאה</strong><span>אפשר לחזור לעמוד הבית ולבחור תחום אחר.</span></div><a class="button button-primary" href="#home">חזרה לעמוד הבית</a></section>`;
}

function render() {
  const route = getRoute();
  const current = routes[route];
  document.title = `${current.title} | פורטל חמ״ה`;
  $('#page-content').innerHTML = route === 'home' ? homeTemplate() : comingSoonTemplate(current);
  $('#breadcrumbs').innerHTML = route === 'home' ? '<span aria-current="page">עמוד הבית</span>' : `<a href="#home">עמוד הבית</a><span aria-hidden="true">/</span><span aria-current="page">${current.title}</span>`;
  document.querySelectorAll('[data-route]').forEach((item) => item.classList.toggle('active', item.dataset.route === route));
  closeMenu();
  $('#main-content').focus({ preventScroll: true });
}

function openMenu() {
  $('#sidebar').classList.add('open');
  $('#sidebar-backdrop').classList.add('open');
  $('#menu-toggle').setAttribute('aria-expanded', 'true');
  document.body.classList.add('menu-open');
}

function closeMenu() {
  $('#sidebar').classList.remove('open');
  $('#sidebar-backdrop').classList.remove('open');
  $('#menu-toggle').setAttribute('aria-expanded', 'false');
  document.body.classList.remove('menu-open');
}

function formatToday() {
  return new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
}

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = $('#email');
  const message = $('#login-message');
  if (!email.validity.valid) { message.textContent = 'יש להזין כתובת דוא״ל תקינה.'; email.focus(); return; }
  message.textContent = 'שולח קישור כניסה…';
  try { await sendLoginLink(email.value.trim()); message.textContent = 'הקישור נשלח. יש לפתוח אותו מאותו דפדפן.'; }
  catch (error) { message.textContent = error.message; }
});

$('#logout').addEventListener('click', () => { saveSession(null); location.reload(); });
$('#menu-toggle').addEventListener('click', () => $('#sidebar').classList.contains('open') ? closeMenu() : openMenu());
$('#mobile-more').addEventListener('click', openMenu);
$('#sidebar-backdrop').addEventListener('click', closeMenu);
window.addEventListener('hashchange', render);
window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });

parseCallback();
const session = readSession();
if (session?.access_token || isTemporaryPreviewAuthBypass()) {
  $('#login-view').style.display = 'none';
  $('#app-view').hidden = false;
  $('#israeli-date').textContent = formatToday();
  if (isTemporaryPreviewAuthBypass()) $('#preview-auth-banner').hidden = false;
  render();
}
