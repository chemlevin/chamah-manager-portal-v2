import { roundOccupancyCaregivers } from './budget-calculations.js';

const value = (input) => Number(input || 0);
const active = (row) => row.lifecycle_status === 'ACTIVE';

const roundCapacity = (capacity, method) => {
  if (method === 'CEIL') return Math.ceil(capacity);
  if (method === 'ROUND') return Math.round(capacity);
  return Math.floor(capacity);
};

export function calculateOccupancyModel({ composition, area, capacityAge, standardType, hourlyWage, budgetRules, licensingRules, tuitionRules = [], monthlyOperatingHours = 0 }) {
  const licensing = new Map(licensingRules.filter(active).map((row) => [row.age_group, row]));
  const suppliedComposition = Object.fromEntries(Object.entries(composition || {}).map(([age, children]) => [age, value(children)]));
  const suppliedChildren = Object.values(suppliedComposition).reduce((sum, children) => sum + children, 0);
  const capacityLicense = licensing.get(capacityAge);
  const inferredChildren = !suppliedChildren && value(area) > 0 && capacityLicense
    ? Math.min(roundCapacity(value(area) / value(capacityLicense.sqm_per_child), capacityLicense.rounding_method), value(capacityLicense.max_children))
    : 0;
  const resolvedComposition = inferredChildren ? { ...suppliedComposition, [capacityAge]: inferredChildren } : suppliedComposition;
  const parts = Object.entries(resolvedComposition).filter(([, children]) => value(children) > 0);
  const activeAges = parts.map(([age]) => age);
  const validMix = activeAges.length <= 1 || (activeAges.length === 2 && activeAges.every((age) => (licensing.get(age)?.allowed_mixed_with || []).includes(activeAges.find((other) => other !== age))));
  const details = parts.map(([age, children]) => {
    const license = licensing.get(age);
    const rule = budgetRules.find((item) => active(item) && item.standard_type === standardType && item.age_group === age);
    const tuition = tuitionRules.find((item) => active(item) && item.age_group === age)?.numeric_value || 0;
    return { age, children: value(children), license, ratio: value(rule?.parameter_1), fraction: rule ? value(children) / value(rule.parameter_1) : null, requiredSqm: value(children) * value(license?.sqm_per_child), revenue: value(children) * value(tuition), maxChildren: value(license?.max_children) };
  });
  const children = details.reduce((sum, row) => sum + row.children, 0);
  const requiredSqm = details.reduce((sum, row) => sum + row.requiredSqm, 0);
  const requiredStaff = details.some((row) => row.fraction == null) ? null : roundOccupancyCaregivers(details.reduce((sum, row) => sum + row.fraction, 0));
  const revenue = details.reduce((sum, row) => sum + row.revenue, 0);
  const allowed = details.reduce((sum, row) => sum + row.maxChildren, 0);
  const childrenCompliant = details.length > 0 && details.every((row) => row.children <= row.maxChildren);
  const compositionCompliant = details.length > 0 && validMix;
  const hasArea = value(area) > 0;
  const areaCompliant = !hasArea || value(area) >= requiredSqm;
  const compliant = childrenCompliant && compositionCompliant && areaCompliant;
  const staffingHours = requiredStaff == null ? null : requiredStaff * value(monthlyOperatingHours);
  const payrollCost = hourlyWage === '' || hourlyWage == null ? null : staffingHours * value(hourlyWage);
  const surplus = payrollCost == null ? null : revenue - payrollCost;
  const constraints = [
    { key: 'composition', ok: compositionCompliant, difference: compositionCompliant ? 0 : -1 },
    { key: 'children', ok: childrenCompliant, difference: allowed - children },
    ...(hasArea ? [{ key: 'area', ok: areaCompliant, difference: value(area) - requiredSqm }] : [])
  ];
  const limitingFactor = constraints.find((item) => !item.ok)?.key || constraints.sort((a, b) => a.difference - b.difference)[0]?.key || 'children';
  return { validMix, compliant, childrenCompliant, areaCompliant, compositionCompliant, inputMethod: inferredChildren ? 'area-to-children' : hasArea ? 'validation' : 'children-to-area', inferredChildren, children, allowedChildren: allowed, remainingChildren: allowed - children, requiredSqm, actualSqm: hasArea ? value(area) : requiredSqm, remainingSqm: hasArea ? value(area) - requiredSqm : 0, requiredStaff, revenue, staffingHours, revenuePerStaffingHour: staffingHours ? revenue / staffingHours : null, revenuePerCaregiver: requiredStaff ? revenue / requiredStaff : null, efficiencyScore: allowed ? children / allowed * 100 : null, payrollCost, surplus, surplusPercent: payrollCost == null || !revenue ? null : surplus / revenue * 100, limitingFactor, details };
}
