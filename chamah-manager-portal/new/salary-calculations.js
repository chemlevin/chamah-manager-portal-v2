const REQUIRED_FACTORS = ['SENIORITY', 'PERSISTENCE', 'CLASS_MANAGEMENT', 'CERTIFICATE', 'DEGREE', 'EXCELLENCE', 'TRAVEL'];
const FACTOR_LABELS = {
  SENIORITY: 'תוספת ותק',
  PERSISTENCE: 'מענק התמדה',
  CLASS_MANAGEMENT: 'אחריות כיתה',
  CERTIFICATE: 'תוספת תעודה',
  DEGREE: 'תוספת תואר',
  EXCELLENCE: 'מענק מצוינות',
  TRAVEL: 'נסיעות'
};

const factorKey = (row) => String(row.compensation_factor_code || '').toUpperCase().replace(/[-_](HOURLY|GLOBAL_MONTHLY|MONTHLY)$/g, '');
const isActive = (row) => String(row.lifecycle_status || 'ACTIVE').toUpperCase() === 'ACTIVE';

export function salaryRuleIssues(factors, rules, schoolYears) {
  const year = schoolYears.find((item) => item.is_default) || schoolYears.find((item) => item.is_selectable);
  if (!year) return ['לא נמצאה שנת לימודים פעילה לכללי השכר.'];
  const activeRules = rules.filter((rule) => isActive(rule) && rule.school_year_id === year.school_year_id);
  const byId = new Map(factors.filter(isActive).map((factor) => [factor.compensation_factor_id, factor]));
  const keys = new Set(activeRules.map((rule) => factorKey(byId.get(rule.compensation_factor_id) || {})));
  const issues = REQUIRED_FACTORS.filter((key) => !keys.has(key)).map((key) => `חסר כלל שכר פעיל עבור ${key}.`);
  return issues;
}

function selectRule(rows, seniorityYears) {
  return rows.find((rule) => seniorityYears >= Number(rule.minimum_seniority_years || 0)
    && (rule.maximum_seniority_years === null || rule.maximum_seniority_years === undefined || seniorityYears <= Number(rule.maximum_seniority_years)));
}

function amount(rule, hours) { return String(rule.factor?.value_type || rule.value_type).toUpperCase() === 'HOURLY' ? Number(rule.amount) * hours : Number(rule.amount); }

function persistenceAmount(seniorityYears, hours) {
  if (seniorityYears <= 1) return hours;
  if (seniorityYears <= 4) return hours * 2;
  if (seniorityYears <= 7) return hours * 3;
  if (seniorityYears <= 10) return 550;
  if (seniorityYears <= 20) return 600;
  return 700;
}

export function calculateSalary(inputs, factors, rules, schoolYears) {
  const issues = salaryRuleIssues(factors, rules, schoolYears);
  if (issues.length) return { issues, components: [], gross: null };
  const year = schoolYears.find((item) => item.is_default) || schoolYears.find((item) => item.is_selectable);
  const byId = new Map(factors.map((factor) => [factor.compensation_factor_id, factor]));
  const grouped = new Map();
  rules.filter((rule) => isActive(rule) && rule.school_year_id === year.school_year_id).forEach((rule) => { const key = factorKey(byId.get(rule.compensation_factor_id) || {}); grouped.set(key, [...(grouped.get(key) || []), { ...rule, factor: byId.get(rule.compensation_factor_id) }]); });
  const seniorityYears = Math.max(0, Math.floor(Number(inputs.seniorityYears) || 0));
  const hours = Number(inputs.monthlyHours);
  const component = (key, eligible = true) => { const rule = selectRule(grouped.get(key) || [], seniorityYears); return { key, name: FACTOR_LABELS[key] || rule?.factor?.display_name || key, amount: eligible && rule ? amount(rule, hours) : 0, rule }; };
  const certificate = component('CERTIFICATE', inputs.certificate !== 'NO');
  const persistence = { key: 'PERSISTENCE', name: FACTOR_LABELS.PERSISTENCE, amount: persistenceAmount(seniorityYears, hours), rule: null };
  const components = [
    { key: 'BASE', name: 'שכר בסיס', amount: Number(inputs.hourlyRate) * hours },
    component('SENIORITY'), persistence, component('CLASS_MANAGEMENT', inputs.classManager === true || inputs.classManager === 'true'), certificate,
    component('DEGREE', inputs.degree), component('EXCELLENCE', inputs.excellence), component('TRAVEL', inputs.travel)
  ];
  const gross = components.reduce((total, item) => total + item.amount, 0);
  return { issues: [], year, components, gross, effectiveHourly: gross / hours, netMin: gross * .78, netMax: gross * .82 };
}
