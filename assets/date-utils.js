(function () {
  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function startOfLocalDay(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function parseIsraeliSheetDate(value) {
    if (value instanceof Date) return startOfLocalDay(value);
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    if (!text) return null;
    const match = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/);
    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
    if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null;
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;

    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  }

  function formatIsraeliDate(date) {
    const normalized = startOfLocalDay(date);
    if (!normalized) return "";
    return pad(normalized.getDate()) + "/" + pad(normalized.getMonth() + 1) + "/" + normalized.getFullYear();
  }

  function formatIsraeliSheetDate(value) {
    const date = parseIsraeliSheetDate(value);
    return date ? formatIsraeliDate(date) : "";
  }

  window.ChamahDates = {
    parseIsraeliSheetDate,
    formatIsraeliDate,
    formatIsraeliSheetDate,
    startOfLocalDay,
  };
})();
