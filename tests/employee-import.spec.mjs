import { test, expect } from "@playwright/test";
import { suggestEmployeeMapping, validateEmployeeImport } from "../chamah-manager-portal/new/employee-import.js";

globalThis.window ??= {};

test("employee import recognizes Hebrew and English headings and reuses saved mapping", () => {
  const headers = ["Worker No", "National ID", "First Name", "Surname"];
  const mapping = suggestEmployeeMapping(headers, { employee_number:"Worker No" });
  expect(mapping.employee_number).toBe("Worker No");
  expect(mapping.identity_number).toBe("National ID");
  expect(mapping.first_name).toBe("First Name");
  expect(mapping.last_name).toBe("Surname");
});

test("employee import validates every row, matches safely, and blocks duplicates", () => {
  const parsed = {
    rows:[
      { source_row_number:2, values:{ code:"100", identity:"111", first:"שרה", last:"כהן", email:"sara@example.com" } },
      { source_row_number:3, values:{ code:"200", identity:"222", first:"דנה", last:"לוי", email:"bad" } },
      { source_row_number:4, values:{ code:"200", identity:"333", first:"נועה", last:"ישראלי", email:"noa@example.com" } },
      { source_row_number:5, values:{ code:"", identity:"444", first:"מיכל", last:"אברהם", email:"m@example.com" } },
    ],
  };
  const mapping={employee_number:"code",identity_number:"identity",first_name:"first",last_name:"last",email:"email"};
  const employees=[
    {employee_id:"existing",employee_code:"100",national_id:"111",lifecycle_status:"ARCHIVED"},
    {employee_id:"identity-only",employee_code:"900",national_id:"444",lifecycle_status:"ACTIVE"},
  ];
  const rows=validateEmployeeImport(parsed,mapping,employees);
  expect(rows[0]).toMatchObject({valid:true,action:"UPDATE",archived:true});
  expect(rows[1].errors).toContain("כתובת דוא״ל אינה תקינה");
  expect(rows[2].errors.some((error)=>error.includes("כפילות בקובץ"))).toBeTruthy();
  expect(rows[3]).toMatchObject({valid:true,action:"UPDATE"});
});

test("employee import requires names and one stable identifier", () => {
  const rows=validateEmployeeImport({rows:[{source_row_number:2,values:{first:""}}]},{first_name:"first"},[]);
  expect(rows[0].valid).toBeFalsy();
  expect(rows[0].errors).toEqual(expect.arrayContaining(["נדרש מספר עובד או מספר זהות","חסר שם פרטי","חסר שם משפחה"]));
});
