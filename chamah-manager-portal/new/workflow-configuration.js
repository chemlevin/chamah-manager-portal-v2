// TRACK015 temporary snapshot provider. Later tracks may replace this module
// without changing any workbench consumer.
const option = (value, label, extra = "") => ({ value, label, extra });

export const workflowConfiguration = Object.freeze({
  movementTypes: [
    option("INCOME", "הכנסה"),
    option("EXPENSE", "הוצאה"),
    option("INTERNAL", "פנימי"),
    option("EXCLUDE", "לא לחישוב"),
  ],
  departments: [
    option("692c8d30-1ba3-4502-acbc-2424f84f0d9f", "אשקלון", "DAYCARE"),
    option("d9a46d5c-582b-4619-917f-794f3e5c4ca5", "גנון", "DAYCARE"),
    option("fcb8a4a8-9a81-42a4-8a20-af1023c2e04e", "מחנה", "DAYCARE"),
    option("c2cd2659-b965-4ae2-b869-de7c98a606b8", "מרכזי", "DAYCARE"),
    option("fe05de40-2551-4e90-befe-db4253d66e1c", "משרד", "OFFICE"),
    option("1fb2ecb8-2b2d-4838-94e2-25a4291fc8bd", "נאות הכפר", "DAYCARE"),
    option("0db06e9f-c2a5-49e4-bbe6-137ed1ae1613", "סניף", "DAYCARE"),
    option("02f8838a-fb16-4440-8506-4f294388328f", "פיתוח", "DEVELOPMENT"),
  ],
  daycares: [
    option("5c6b4d63-efb6-427c-9785-c62f418daede", "אשקלון", "692c8d30-1ba3-4502-acbc-2424f84f0d9f"),
    option("957805ec-192e-4e1a-a8bd-4a0fc91a63c9", "גנון", "d9a46d5c-582b-4619-917f-794f3e5c4ca5"),
    option("bda6b7c5-05fe-4e2a-a8d5-0e14a5da6453", "מחנה", "fcb8a4a8-9a81-42a4-8a20-af1023c2e04e"),
    option("d38979a2-ba61-4095-84d4-98a6af4160d4", "מרכזי", "c2cd2659-b965-4ae2-b869-de7c98a606b8"),
    option("f596f69b-5163-4db3-8694-34b9147cd48a", "נאות הכפר", "1fb2ecb8-2b2d-4838-94e2-25a4291fc8bd"),
    option("424eed16-3c9f-4e15-8111-339542408da3", "סניף", "0db06e9f-c2a5-49e4-bbe6-137ed1ae1613"),
  ],
  budgetCategories: [
    ["ae94d646-3ea8-4388-8a01-a2f57e76a64c","אוכל"],["0487321e-1311-4110-a994-fb7816f1ae58","ביטוח"],
    ["9f9d69bf-0e36-49f6-9d0a-efc6d8063a9a","גיבושים לילדים"],["70e71814-98fe-43f0-bdfa-d2ab9012a151","גיבושים לצוות"],
    ["697f2a8a-609a-4b10-a601-687b342e8361","גיוס"],["9322ab1e-d86f-422f-805b-1b2580248c34","גיפט קארד חגים"],
    ["ac8f8376-467e-4a9f-9b58-49faca90f499","החזר ביטוח"],["199bf701-2806-4763-8c76-db15a0587536","החזרות מס״ב"],
    ["6df8c8cd-46df-46cb-a336-6c4332a1b0f7","החזרי שכר לימוד להורים"],["d87581c1-6526-4fec-b3a9-9ede604726ec","הנהלת חשבונות"],
    ["8c0b6e2a-6703-45c4-aa35-5f0fc56b53ae","העברות הורים"],["dfd89b16-f69c-4d2a-a024-049ad058fe71","הצטיידות"],
    ["a1dbc5a4-0831-409b-8ebe-48a5f49b6f70","השתלמויות"],["219bf522-c04c-4579-9682-d016f5e71e3e","זיכוי העברה בטעות"],
    ["1972ee2f-06ca-4814-bdfe-a719276080de","חוגים"],["b96cbcd3-5ac3-4961-9022-1e88ed6a389c","חריג לא לחישוב"],
    ["ab5e648d-c280-44ad-a56d-8fc6e825f92a","חשמל"],["972245f1-2b1c-46c7-ad7f-50ea82ea720f","טיול סוף שנה"],
    ["0cee30e3-fcba-47a6-8b98-c2141f0779dd","יועצים ואישורים"],["59a5613e-52d0-4088-9f30-4aa51e5d8f0d","כרטיס גן"],
    ["53ce2941-082e-46f8-bf81-cfe789c1c926","מס״ב"],["48f7cfde-ae51-4d6f-bd47-c73fad620cf4","מערכות"],
    ["d20c064e-f8a1-4c7b-ba1c-8539662cec16","ניקיון ומתכלה"],["17c6b8a8-4866-470a-adb6-bc74bb0509e1","עירייה"],
    ["05c33619-9a4c-454a-83e1-fd08bac4e715","עמלות"],["c6411746-2c24-431e-8750-62c5cd54b797","פיתוח"],
    ["cecb3480-bac3-40a3-ad87-233c7166837d","רווחה"],["b5289c12-b201-454e-ac84-c7d753babf66","שכר לימוד"],
    ["3bb8aeaf-9bb6-40bb-8057-c70aadc60cc2","שכר צוות"],["f96c1a3b-338f-4d2a-986c-ba9020a76530","שכר שאינו צוות"],
    ["8d413da7-f24e-4924-a33e-24f51d604515","תחזוקה"],["41e203e1-1bce-4fca-adfc-79ea54746786","תמ״ת"],
    ["ace56aa5-d905-4cba-9fc6-2522abf7d078","תקורה למשרד"],["e498059a-6278-44b9-899b-9de9870b5635","תקורה מהמעונות"],
    ["3ed1d7c9-ea29-4656-b151-167487ae0fe2","תקציב הכנסה חריג"],
  ].map(([value, label]) => option(value, label)),
  budgetMonths: Array.from({ length: 36 }, (_, index) => {
    const date = new Date(Date.UTC(2025 + Math.floor(index / 12), index % 12, 1));
    const value = date.toISOString().slice(0, 7);
    return option(value, new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric", timeZone: "UTC" }).format(date));
  }),
  accountingStatuses: [
    option("PENDING_SUBMISSION", "ממתין לשליחה"),
    option("SENT_TO_ACCOUNTING", "נשלח להנה״ח"),
    option("MISSING_DOCUMENTS", "חסרים מסמכים"),
    option("NO_SUPPORTING_DOCUMENT_REQUIRED", "לא נדרש מסמך"),
  ],
});

export function workflowOptions(name, predicate = () => true) {
  return (workflowConfiguration[name] || []).filter(predicate);
}
