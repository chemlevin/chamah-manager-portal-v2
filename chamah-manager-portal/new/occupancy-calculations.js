import { roundOccupancyCaregivers } from './budget-calculations.js';

const value = (input) => Number(input || 0);
const active = (row) => row.lifecycle_status === 'ACTIVE';

export function calculateOccupancyModel({ composition, area, standardType, hourlyWage, budgetRules, licensingRules, tuitionRules = [], monthlyOperatingHours = 0 }) {
  const parts = Object.entries(composition || {}).filter(([, children]) => value(children) > 0);
  const licensing = new Map(licensingRules.filter(active).map((row) => [row.age_group, row]));
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
  const compliant = validMix && children <= allowed && value(area) >= Math.floor(requiredSqm);
  const staffingHours = requiredStaff == null ? null : requiredStaff * value(monthlyOperatingHours);
  const payrollCost = hourlyWage === '' || hourlyWage == null ? null : staffingHours * value(hourlyWage);
  const surplus = payrollCost == null ? null : revenue - payrollCost;
  return { validMix, compliant, children, allowedChildren: allowed, remainingChildren: allowed - children, requiredSqm, remainingSqm: value(area) - requiredSqm, requiredStaff, revenue, staffingHours, revenuePerStaffingHour: staffingHours ? revenue / staffingHours : null, revenuePerCaregiver: requiredStaff ? revenue / requiredStaff : null, efficiencyScore: allowed ? children / allowed * 100 : null, payrollCost, surplus, surplusPercent: payrollCost == null || !revenue ? null : surplus / revenue * 100, details };
}
