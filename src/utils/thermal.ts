/**
 * Utility for printing in 80mm POS thermal receipt format
 */

export function printThermalHtml(html: string): void {
  const w = window.open('', '_blank', 'width=380,height=640');
  if (!w) {
    alert('পপ-আপ ব্লক করা আছে বলে থার্মাল প্রিন্ট উইন্ডো খোলা যায়নি — ব্রাউজারে এই সাইটের জন্য পপ-আপ অনুমতি দিন।');
    return;
  }
  w.document.write(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>থার্মাল প্রিন্ট (৮০mm)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: 80mm auto; margin: 3mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Noto Sans Bengali', sans-serif;
      width: 74mm;
      margin: 0 auto;
      padding: 6px 4px;
      color: #000;
      font-size: 12px;
      line-height: 1.55;
      background: #fff;
    }
    .t-center { text-align: center; }
    .t-bold { font-weight: 700; }
    .t-lg { font-size: 15px; font-family: 'Noto Serif Bengali', serif; }
    .t-row { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; }
    .t-dashed { border-top: 1px dashed #000; margin: 6px 0; }
    .t-item { margin-bottom: 5px; }
    .t-item-name { font-weight: 600; }
    .t-item-sub { display: flex; justify-content: space-between; font-size: 11.5px; color: #333; }
    .t-item-comment { font-size: 10.5px; color: #555; }
    .t-note { font-size: 11px; margin: 4px 0; }
    .t-thanks { margin-top: 8px; font-style: italic; font-size: 11px; }
    .t-pre { white-space: pre-wrap; word-break: break-word; font-size: 12px; margin: 2px 0; }
    .t-small { font-size: 10.5px; color: #444; }
    .t-note-block { page-break-inside: avoid; break-inside: avoid; }
    .t-block { page-break-inside: avoid; break-inside: avoid; margin-bottom: 4px; }
    .t-title { font-weight: 700; font-size: 12px; }
    .t-row span:last-child { text-align: right; word-break: break-word; }
    .t-row span:first-child { flex: none; max-width: 55%; }
    .t-group { font-weight: 700; text-align: center; border-top: 1px solid #000; border-bottom: 1px solid #000; margin: 6px 0 4px; padding: 2px 0; }
  </style>
</head>
<body>${html}</body>
</html>`);
  w.document.close();
  setTimeout(() => {
    try {
      w.focus();
      w.print();
    } catch {
      // ignore
    }
  }, 350);
}
