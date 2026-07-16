const numberValue = (value) => Number(value || 0);
const monthKey = (value) => String(value || '').slice(0, 7);
const moneyRound = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

function inDateRange(month, from, to) {
  const key = monthKey(month);
  return (!from || key >= monthKey(from)) && (!to || key <= monthKey(to));
}

function inMonthIdRange(monthId, fromId, toId, monthOrder) {
  const value = monthOrder.get(monthId);
  const from = monthOrder.get(fromId);
  const to = monthOrder.get(toId);
  return value != null && (from == null || value >= from) && (to == null || value <= to);
}

// BR-0015: round each age-group staffing requirement upward to the next half position.
export function roundRequiredStaff(value) {
  return Math.ceil(numberValue(value) * 2 - Number.EPSILON) / 2;
}

// Occupancy calculator contract: sum mixed-age fractions before rounding to a whole caregiver.
// Financial Dashboard keeps using roundRequiredStaff above.
export function roundOccupancyCaregivers(value) {
  return Math.ceil(numberValue(value) - Number.EPSILON);
}

export function calculateBudgetModel(data, options) {
  const selectedMonths = [...options.months].sort();
  const selectedUnitIds = new Set(options.unitIds || []);
  const includeAllUnits = !selectedUnitIds.size;
  const issues = [];
  const rows = [];
  const monthRows = data.months.filter((item) => item.school_year_id === options.schoolYearId);
  const monthByKey = new Map(monthRows.map((item) => [monthKey(item.start_date), item]));
  const monthOrder = new Map(monthRows.map((item) => [item.school_year_month_id, item.school_year_sequence]));
  const ageById = new Map(data.ageGroups.map((item) => [item.age_group_id, item]));
  const categoryById = new Map(data.budgetCategories.map((item) => [item.budget_category_id, item]));
  const categoryByCode = new Map(data.budgetCategories.map((item) => [item.budget_category_code, item]));
  const dsyById = new Map(data.dsy.map((item) => [item.daycare_school_year_id, item]));
  const classroomsById = new Map(data.classrooms.map((item) => [item.classroom_id, item]));
  const relevantDaycares = data.daycares.filter((item) => item.lifecycle_status === 'ACTIVE' && (includeAllUnits || selectedUnitIds.has(item.allocation_unit_id)));

  const addIssue = (code, message, context = {}) => issues.push({ code, message, ...context });
  const ruleActive = (rule, key) => rule.lifecycle_status === 'ACTIVE' && inDateRange(key, rule.effective_from, rule.effective_to);

  for (const key of selectedMonths) {
    const monthRow = monthByKey.get(key);
    if (!monthRow) { addIssue('MISSING_MONTH', 'חודש הדיווח אינו מוגדר בשנת הלימודים.', { month: key }); continue; }
    const calendar = data.workCalendars.find((item) => item.school_year_month_id === monthRow.school_year_month_id);
    const workdays = calendar ? numberValue(calendar.sun_thu_workdays) + numberValue(calendar.friday_workdays) : null;
    const operatingHours = calendar ? numberValue(calendar.sun_thu_hours_per_day) * numberValue(calendar.sun_thu_workdays) + numberValue(calendar.friday_hours_per_day) * numberValue(calendar.friday_workdays) : null;
    if (!calendar) addIssue('MISSING_WORK_CALENDAR', 'חסרים ימי עבודה ושעות פעילות לחודש.', { month: key });
    const staffingParameter = data.staffingParameters.find((item) => item.school_year_id === options.schoolYearId && item.lifecycle_status === 'ACTIVE' && inMonthIdRange(monthRow.school_year_month_id, item.effective_from_month_id, item.effective_to_month_id, monthOrder));
    if (!staffingParameter?.hourly_budget_cost) addIssue('MISSING_HOURLY_BUDGET_COST', 'עלות שעת תקציב לצוות לא יובאה מ-Google Sheets v2.', { month: key });

    for (const daycare of relevantDaycares) {
      const dsy = data.dsy.find((item) => item.daycare_id === daycare.daycare_id && item.school_year_id === options.schoolYearId && item.is_operating);
      if (!dsy) { addIssue('MISSING_DAYCARE_YEAR', 'חסרה הגדרת מעון לשנת הלימודים.', { month: key, daycare: daycare.display_name }); continue; }
      const activeClassrooms = data.classrooms.filter((item) => item.daycare_school_year_id === dsy.daycare_school_year_id && item.lifecycle_status === 'ACTIVE' && inDateRange(key, item.effective_from, item.effective_to));
      const daycareEnrollment = data.enrollment.filter((item) => monthKey(item.reporting_month) === key && activeClassrooms.some((room) => room.classroom_id === item.classroom_id));
      const classroomRows = [];
      let children = 0;
      let requiredStaff = 0;
      let requiredHours = 0;
      let tuitionBudget = 0;

      for (const classroom of activeClassrooms) {
        const enrollmentRows = daycareEnrollment.filter((item) => item.classroom_id === classroom.classroom_id);
        let classroomStaff = 0;
        let classroomTuition = 0;
        for (const enrollment of enrollmentRows) {
          const age = ageById.get(enrollment.age_group_id);
          if (!age) { addIssue('MISSING_AGE_GROUP', 'לרשומת הילדים חסרה קבוצת גיל.', { month: key, daycare: daycare.display_name, classroom: classroom.display_name }); continue; }
          const childCount = numberValue(enrollment.children_count);
          children += childCount;
          const staffingRule = data.budgetRules.find((rule) => rule.budget_category_id === categoryByCode.get('CAT-PAYROLL-STAFF')?.budget_category_id && rule.school_year_id === options.schoolYearId && rule.standard_type === dsy.staffing_standard_type && rule.age_group_id === enrollment.age_group_id && ruleActive(rule, key));
          if (!staffingRule?.parameter_1) addIssue('MISSING_STAFFING_RULE', 'חסר כלל תקינה לקבוצת הגיל ולסוג התקינה.', { month: key, daycare: daycare.display_name, classroom: classroom.display_name, ageGroup: age.display_name });
          const ageStaff = staffingRule?.parameter_1 ? Math.max(numberValue(staffingRule.minimum_staff), roundRequiredStaff(childCount / numberValue(staffingRule.parameter_1))) : 0;
          classroomStaff += ageStaff;

          const tuitionRules = data.budgetRules.filter((rule) => rule.budget_category_id === categoryByCode.get('CAT-TUITION')?.budget_category_id && rule.school_year_id === options.schoolYearId && ruleActive(rule, key));
          const tuitionRule = tuitionRules.find((rule) => rule.daycare_id === daycare.daycare_id) || tuitionRules.find((rule) => !rule.daycare_id && rule.standard_type === dsy.tuition_standard_type && rule.age_group_id === enrollment.age_group_id);
          if (!tuitionRule?.numeric_value) addIssue('MISSING_TUITION_RULE', 'חסר כלל שכר לימוד לקבוצת הגיל ולסוג המעון.', { month: key, daycare: daycare.display_name, classroom: classroom.display_name, ageGroup: age.display_name });
          classroomTuition += childCount * numberValue(tuitionRule?.numeric_value);
          classroomRows.push({ type: 'classroom', month: key, allocationUnitId: daycare.allocation_unit_id, daycareId: daycare.daycare_id, daycare: daycare.display_name, classroomId: classroom.classroom_id, classroom: classroom.display_name, ageGroup: age.display_name, children: childCount, requiredCaregivers: ageStaff, operatingHours, requiredHours: operatingHours == null ? null : ageStaff * operatingHours, tuitionBudget: childCount * numberValue(tuitionRule?.numeric_value) });
        }
        requiredStaff += classroomStaff;
        requiredHours += operatingHours == null ? 0 : classroomStaff * operatingHours;
        tuitionBudget += classroomTuition;
      }

      const caregiverBudget = staffingParameter?.hourly_budget_cost && calendar ? requiredHours * numberValue(staffingParameter.hourly_budget_cost) : null;
      const fixedSourceRules = data.budgetRules.filter((rule) => rule.budget_category_id === categoryByCode.get('CAT-PAYROLL-NONSTAFF')?.budget_category_id && rule.daycare_id === daycare.daycare_id && rule.school_year_id === options.schoolYearId);
      const fixedRules = fixedSourceRules.filter((rule) => ruleActive(rule, key));
      const fixedRows = fixedRules.map((rule) => ({ type: 'fixed', month: key, allocationUnitId: daycare.allocation_unit_id, daycareId: daycare.daycare_id, daycare: daycare.display_name, role: rule.parameter_1 || 'תפקיד קבוע', positions: numberValue(rule.parameter_2), monthlyCostPerPosition: numberValue(rule.numeric_value), budget: numberValue(rule.parameter_2) * numberValue(rule.numeric_value), category: categoryById.get(rule.budget_category_id)?.display_name || '' }));
      const fixedBudget = fixedRows.reduce((total, row) => total + row.budget, 0);
      if (!fixedSourceRules.length) addIssue('MISSING_FIXED_STAFF_RULE', 'לא נמצאו כללי עובדים קבועים למעון.', { month: key, daycare: daycare.display_name });
      const budgetStaffFte = staffingParameter?.monthly_hours_per_fte ? requiredHours / numberValue(staffingParameter.monthly_hours_per_fte) : 0;
      const expenseRows = [];
      const expenseRules = data.budgetRules.filter((rule) => categoryById.get(rule.budget_category_id)?.category_type === 'EXPENSE' && !['CAT-PAYROLL-STAFF', 'CAT-PAYROLL-NONSTAFF'].includes(categoryById.get(rule.budget_category_id)?.budget_category_code) && rule.school_year_id === options.schoolYearId && ruleActive(rule, key) && rule.show_budget !== false && (rule.display_scope === 'ALL_DAYCARES' || rule.display_scope === 'SPECIFIC_DAYCARE' && rule.daycare_id === daycare.daycare_id));
      const byCategory = new Map();
      for (const rule of expenseRules) {
        const code = categoryById.get(rule.budget_category_id)?.budget_category_code;
        const current = byCategory.get(code);
        if (!current || rule.daycare_id === daycare.daycare_id) byCategory.set(code, rule);
      }
      for (const rule of byCategory.values()) {
        const rate = numberValue(rule.parameter_1);
        const method = rule.calculation_method;
        let budget = null;
        if (method === 'PER_CHILD') budget = children * rate;
        else if (method === 'PER_CHILD_WORKDAY' && workdays != null) budget = children * workdays * rate;
        else if (method === 'PER_CHILD_ANNUAL') budget = children * rate / 12;
        else if (method === 'PER_CLASSROOM_ANNUAL') budget = activeClassrooms.length * rate / 12;
        else if (method === 'PER_STAFF_ANNUAL') budget = budgetStaffFte * rate / 12;
        else addIssue('UNSUPPORTED_BUDGET_METHOD', `שיטת התקציב ${method || 'ללא קוד'} אינה נתמכת.`, { month: key, daycare: daycare.display_name });
        if (budget != null) expenseRows.push({ type: 'expense', month: key, allocationUnitId: daycare.allocation_unit_id, daycareId: daycare.daycare_id, daycare: daycare.display_name, category: categoryById.get(rule.budget_category_id)?.display_name || '', categoryCode: categoryById.get(rule.budget_category_id)?.budget_category_code || '', method, rate, children, activeClassrooms: activeClassrooms.length, budgetStaffFte, workdays, budget: moneyRound(budget) });
      }
      rows.push(...classroomRows, ...fixedRows, ...expenseRows, { type: 'daycare-month', month: key, allocationUnitId: daycare.allocation_unit_id, daycareId: daycare.daycare_id, daycare: daycare.display_name, children, activeClassrooms: activeClassrooms.length, requiredCaregivers: requiredStaff, operatingHours, requiredHours, hourlyBudgetCost: staffingParameter?.hourly_budget_cost == null ? null : numberValue(staffingParameter.hourly_budget_cost), caregiverBudget: caregiverBudget == null ? null : moneyRound(caregiverBudget), fixedBudget: moneyRound(fixedBudget), payrollBudget: caregiverBudget == null ? null : moneyRound(caregiverBudget + fixedBudget), tuitionBudget: moneyRound(tuitionBudget), expenseBudget: moneyRound(expenseRows.reduce((total, row) => total + row.budget, 0)) });
    }

    const selectedOfficeUnits = (data.allocationUnits || data.units || []).filter((unit) => (includeAllUnits || selectedUnitIds.has(unit.allocation_unit_id)) && unit.lifecycle_status === 'ACTIVE' && unit.allocation_unit_type === 'OFFICE');
    if (selectedOfficeUnits.length) {
      const allActiveClassroomIds = new Set(data.classrooms.filter((room) => room.lifecycle_status === 'ACTIVE' && inDateRange(key, room.effective_from, room.effective_to)).map((room) => room.classroom_id));
      const organizationChildren = data.enrollment.filter((item) => monthKey(item.reporting_month) === key && allActiveClassroomIds.has(item.classroom_id)).reduce((total, item) => total + numberValue(item.children_count), 0);
      for (const office of selectedOfficeUnits) {
        const officeRules = data.budgetRules.filter((rule) => rule.school_year_id === options.schoolYearId && rule.display_scope === 'OFFICE' && rule.allocation_unit_id === office.allocation_unit_id && ruleActive(rule, key));
        for (const rule of officeRules) {
          if (rule.calculation_method !== 'PER_CHILD') { addIssue('UNSUPPORTED_BUDGET_METHOD', `שיטת התקציב ${rule.calculation_method || 'ללא קוד'} אינה נתמכת.`, { month: key, daycare: office.display_name }); continue; }
          rows.push({ type: 'expense', month: key, allocationUnitId: office.allocation_unit_id, daycareId: null, daycare: office.display_name, category: categoryById.get(rule.budget_category_id)?.display_name || '', categoryCode: categoryById.get(rule.budget_category_id)?.budget_category_code || '', method: rule.calculation_method, rate: numberValue(rule.parameter_1), children: organizationChildren, activeClassrooms: allActiveClassroomIds.size, budget: moneyRound(organizationChildren * numberValue(rule.parameter_1)) });
        }
      }
    }
  }

  return { rows, issues };
}

export function summarizeBudget(model) {
  const daycareMonths = model.rows.filter((row) => row.type === 'daycare-month');
  const value = (field) => daycareMonths.some((row) => row[field] == null) ? null : moneyRound(daycareMonths.reduce((total, row) => total + numberValue(row[field]), 0));
  const expenseBudget = moneyRound(model.rows.filter((row) => row.type === 'expense').reduce((total, row) => total + numberValue(row.budget), 0));
  return { tuitionBudget: value('tuitionBudget'), expenseBudget, caregiverBudget: value('caregiverBudget'), fixedBudget: value('fixedBudget'), payrollBudget: value('payrollBudget'), requiredHours: value('requiredHours'), issues: model.issues };
}
