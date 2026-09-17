# Portal UX Standards

## Asynchronous loading and processing

The portal must never appear frozen while an asynchronous operation is active.
Use the shared lightweight indeterminate loading pattern in
`chamah-manager-portal/new/async-feedback.js` whenever real percentage progress
is unavailable.

- Show an animated indicator with concise contextual Hebrew, such as `טוען...`,
  `טוען תנועות נוספות...`, `מעלה קובץ...`, `מעבד קובץ...`, or `שומר...`.
- Disable the initiating control while a submission, upload, import, or other
  non-idempotent operation is active so it cannot be submitted twice.
- End the loading state immediately on both success and failure, while retaining
  the operation's existing success or error feedback.
- Do not display invented percentage progress. Use the indeterminate spinner
  unless the underlying operation reports real measurable progress.
- Prefer `setLoadingFeedback` for regions and `withBusyControl` for controls so
  new portal flows remain visually and behaviorally consistent.
