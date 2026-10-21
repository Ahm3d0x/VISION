const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

app.whenReady().then(async () => {
  try {
    const { marked } = await import('marked');

    const markdownRaw = fs.readFileSync(path.join(__dirname, 'solutions_content.md'), 'utf-8');
    const htmlBody = await marked.parse(markdownRaw, { gfm: true, breaks: true });

    const title = 'Cryptography & Data Security — Problem Set 2 Solutions';
    const formattedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const fullHtml = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

    :root {
      --accent: #38bdf8;
      --font-display: 'Outfit', 'Plus Jakarta Sans', sans-serif;
      --font-body: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --font-mono: 'JetBrains Mono', Consolas, 'Courier New', monospace;

      /* THEME: Executive Dark (Luminous Obsidian) */
      --bg-page: #070b14;
      --card-bg: rgba(15, 23, 42, 0.90);
      --card-border: rgba(56, 189, 248, 0.22);
      --card-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.6);
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      --heading-color: #ffffff;
      --badge-bg: linear-gradient(135deg, rgba(56, 189, 248, 0.22), rgba(99, 102, 241, 0.22));
      --badge-text: #38bdf8;
      --badge-border: rgba(56, 189, 248, 0.4);
      --math-bg: #030712;
      --math-text: #38bdf8;
      --math-border: rgba(56, 189, 248, 0.25);
      --header-bg: rgba(15, 23, 42, 0.6);
      --header-border: rgba(56, 189, 248, 0.2);
      --footer-border: rgba(255, 255, 255, 0.08);
    }

    @page {
      size: A4 portrait;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      min-height: 100%;
      background-color: var(--bg-page) !important;
      color: var(--text-main);
      font-family: var(--font-body);
      line-height: 1.65;
      font-size: 10pt;
    }

    .doc-page-wrapper {
      padding: 16mm 18mm 18mm 18mm;
      box-sizing: border-box;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background-color: var(--bg-page);
    }

    .doc-header {
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--header-border);
      position: relative;
    }

    .doc-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }

    .brand-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 4px 12px;
      border-radius: 9999px;
      background: var(--badge-bg);
      color: var(--badge-text);
      border: 1px solid var(--badge-border);
    }

    .brand-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: var(--accent);
      box-shadow: 0 0 8px var(--accent);
    }

    .brand-sep { opacity: 0.5; }

    .doc-date-pill {
      font-size: 8.5pt;
      color: var(--text-muted);
      font-weight: 500;
    }

    .main-title {
      font-family: var(--font-display);
      font-size: 24pt;
      font-weight: 800;
      color: var(--heading-color);
      margin: 6px 0 10px 0;
      line-height: 1.2;
      letter-spacing: -0.5px;
    }

    .title-accent-bar {
      width: 60px;
      height: 4px;
      border-radius: 2px;
      background: linear-gradient(90deg, var(--accent), #818cf8);
    }

    h1, h2, h3, h4 {
      font-family: var(--font-display);
      color: var(--heading-color);
      margin-top: 22px;
      margin-bottom: 10px;
      page-break-after: avoid;
    }

    h3 {
      font-size: 13.5pt;
      color: var(--accent);
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 6px;
      margin-top: 28px;
    }

    p { margin: 0 0 10px 0; }

    strong {
      color: #ffffff;
      font-weight: 700;
    }

    code {
      font-family: var(--font-mono);
      background: var(--math-bg);
      color: var(--math-text);
      border: 1px solid var(--math-border);
      padding: 2px 7px;
      border-radius: 5px;
      font-size: 9pt;
    }

    pre {
      background: var(--math-bg);
      border: 1px solid var(--math-border);
      border-radius: 8px;
      padding: 12px 16px;
      font-family: var(--font-mono);
      font-size: 9pt;
      page-break-inside: avoid;
    }

    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 14px 0;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--card-border);
      background: var(--card-bg);
      page-break-inside: avoid;
    }

    th, td {
      padding: 8px 12px;
      border-bottom: 1px solid var(--card-border);
      text-align: left;
    }

    th {
      background: rgba(56, 189, 248, 0.12);
      color: #ffffff;
      font-weight: 700;
      font-size: 9pt;
    }

    tr:last-child td { border-bottom: none; }

    hr {
      border: none;
      border-top: 1px solid var(--card-border);
      margin: 24px 0;
    }

    ul, ol {
      margin: 0 0 14px 0;
      padding-left: 20px;
    }

    li { margin-bottom: 4px; }

    .doc-footer {
      margin-top: 36px;
      padding-top: 14px;
      border-top: 1px solid var(--footer-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="doc-page-wrapper">
    <div class="doc-body-container">
      <header class="doc-header">
        <div class="doc-top-bar">
          <div class="brand-pill">
            <span class="brand-dot"></span>
            <span>VISION OS</span>
            <span class="brand-sep">•</span>
            <span>INTELLIGENT REPORT</span>
          </div>
          <div class="doc-date-pill">
            <span>${formattedDate}</span>
          </div>
        </div>
        <h1 class="main-title">${title}</h1>
        <div class="title-accent-bar"></div>
      </header>

      <main class="doc-content-area">
        ${htmlBody}
      </main>
    </div>

    <footer class="doc-footer">
      <div>
        <span>Generated by VISION OS</span> • <span>Personal AI Operating System</span>
      </div>
      <div>
        <span>Prepared for Ahmed Mohamed Attia</span>
      </div>
    </footer>
  </div>
</body>
</html>`;

    const tempHtml = path.join(os.tmpdir(), `vision_sol_${Date.now()}.html`);
    fs.writeFileSync(tempHtml, fullHtml, 'utf-8');

    const win = new BrowserWindow({
      show: false,
      width: 1200,
      height: 1600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await win.loadFile(tempHtml);
    await new Promise((r) => setTimeout(r, 800));

    const printOptions = {
      pageSize: 'A4',
      landscape: false,
      printBackground: true,
      margins: { marginType: 'none' },
      displayHeaderFooter: false,
    };

    const pdfBuffer = await win.webContents.printToPDF(printOptions);

    const desktopPath = path.join(os.homedir(), 'Desktop');
    const outputPath = path.join(desktopPath, 'Cryptography_Sheet_2_Solutions.pdf');
    const solPath = path.join(desktopPath, 'Solutions.pdf');

    fs.writeFileSync(outputPath, pdfBuffer);
    fs.writeFileSync(solPath, pdfBuffer);
    console.log('PDF_SUCCESS:', outputPath, pdfBuffer.length);
    console.log('SOL_SUCCESS:', solPath, pdfBuffer.length);

    // Also write to OneDrive desktop if it exists
    const oneDriveDesktop = path.join(os.homedir(), 'OneDrive', 'Desktop');
    if (fs.existsSync(oneDriveDesktop)) {
      const oneDriveOutput = path.join(oneDriveDesktop, 'Cryptography_Sheet_2_Solutions.pdf');
      const oneDriveSol = path.join(oneDriveDesktop, 'Solutions.pdf');
      fs.writeFileSync(oneDriveOutput, pdfBuffer);
      fs.writeFileSync(oneDriveSol, pdfBuffer);
      console.log('ONEDRIVE_SUCCESS:', oneDriveOutput);
      console.log('ONEDRIVE_SOL_SUCCESS:', oneDriveSol);
    }

    try { fs.unlinkSync(tempHtml); } catch {}
    app.quit();
  } catch (err) {
    console.error('ERROR:', err);
    app.quit();
  }
});
