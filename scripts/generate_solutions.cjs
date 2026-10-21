const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// We will load the DocumentService from dist-electron or run chromium printToPDF directly
app.whenReady().then(async () => {
  try {
    const desktopPath = path.join(os.homedir(), 'Desktop');
    const outputPath = path.join(desktopPath, 'Cryptography_Sheet_2_Solutions.pdf');

    // Dynamically import compiled DocumentService
    const serviceModule = await import('../dist-electron/main/index.js');
    console.log('Main bundle loaded');

    // If DocumentService is exported or accessible, we can use BrowserWindow directly
    const win = new BrowserWindow({
      show: false,
      width: 1200,
      height: 1600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const markdownContent = fs.readFileSync(path.join(__dirname, 'solutions_content.md'), 'utf-8');

    // We can use the DocumentService from TypeScript via dynamic import
    const tsService = await import('../src/main/services/DocumentService.ts');
    const docService = tsService.documentService;

    console.log('Calling documentService.createPdf...');
    const result = await docService.createPdf({
      outputPath,
      title: 'Cryptography & Data Security — Problem Set 2 Solutions',
      content: markdownContent,
      language: 'en',
      theme: 'executive_dark',
      options: {
        showPageNumbers: true,
        headerText: 'VISION AI OS • Cryptography & Information Security',
        footerText: 'Confidential & Academic Solution Manual • Prepared for Ahmed',
        pageSize: 'A4',
        accentColor: '#38bdf8',
      },
    });

    console.log('Result:', result);
    app.quit();
  } catch (err) {
    console.error('Error generating PDF:', err);
    app.quit();
  }
});
