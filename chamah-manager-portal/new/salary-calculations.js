const REQUIRED_FACTORS = ['SENIORITY', 'PERSISTENCE', 'CLASS_MANAGEMENT', 'CERTIFICATE', 'DEGREE', 'EXCELLENCE', 'TRAVEL', 'HAVRAA'];

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

function selectRule(rows, seniorityMonths) {
  return rows.find((rule) => seniorityMonths >= Number(rule.minimum_seniority_months || 0) && (rule.maximum_seniority_months === null || rule.maximum_seniority_months === undefined || seniorityMonths <= Number(rule.maximum_seniority_months)));
}

function amount(rule, hours) { return String(rule.factor?.value_type || rule.value_type).toUpperCase() === 'HOURLY' ? Number(rule.amount) * hours : Number(rule.amount); }

export function calculateSalary(inputs, factors, rules, schoolYears) {
  const issues = salaryRuleIssues(factors, rules, schoolYears);
  if (issues.length) return { issues, components: [], gross: null };
  const year = schoolYears.find((item) => item.is_default) || schoolYears.find((item) => item.is_selectable);
  const byId = new Map(factors.map((factor) => [factor.compensation_factor_id, factor]));
  const grouped = new Map();
  rules.filter((rule) => isActive(rule) && rule.school_year_id === year.school_year_id).forEach((rule) => { const key = factorKey(byId.get(rule.compensation_factor_id) || {}); grouped.set(key, [...(grouped.get(key) || []), { ...rule, factor: byId.get(rule.compensation_factor_id) }]); });
  const seniorityMonths = Number(inputs.seniorityMonths);
  const hours = Number(inputs.monthlyHours);
  const component = (key, eligible = true) => { const rule = selectRule(grouped.get(key) || [], seniorityMonths); return { key, name: rule?.factor?.display_name || key, amount: eligible && rule ? amount(rule, hours) : 0, rule }; };
  const certificate = component('CERTIFICATE', inputs.certificate !== 'NO');
  const havraa = component('HAVRAA');
  if (havraa.rule) havraa.amount = Number(havraa.rule.amount) * Math.min(hours / 182, 1);
  const components = [
    { key: 'BASE', name: 'שכר בסיס', amount: Number(inputs.hourlyRate) * hours },
    component('SENIORITY'), component('PERSISTENCE'), component('CLASS_MANAGEMENT', inputs.classManager === true || inputs.classManager === 'true'), certificate,
    component('DEGREE', inputs.degree), component('EXCELLENCE', inputs.excellence), component('TRAVEL', inputs.travel), havraa
  ];
  const gross = components.reduce((total, item) => total + item.amount, 0);
  return { issues: [], year, components, gross, effectiveHourly: gross / hours, netMin: gross * .78, netMax: gross * .82 };
}
