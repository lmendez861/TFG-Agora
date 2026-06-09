/**
 * Genera HTML y PDF del boceto de defensa con enfoque IA y tecnologias actuales.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');
const baseName = process.argv[2] || 'boceto-defensa-enfoque-ia';
const inputMarkdown = path.join(docsDir, `${baseName}.md`);
const outputHtml = path.join(docsDir, `${baseName}.html`);
const outputPdf = path.join(docsDir, `${baseName}.pdf`);

function findPdfBrowser() {
  return [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].find((candidate) => fs.existsSync(candidate)) || null;
}

function toFileUri(filePath) {
  return `file:///${filePath.replace(/\\/g, '/')}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function slug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').split('\n');
  const body = [];
  const headings = [];
  let paragraph = [];
  let list = null;
  let quote = [];
  let inCodeBlock = false;
  let codeBuffer = [];

  function flushParagraph() {
    if (paragraph.length > 0) {
      body.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  }

  function closeList() {
    if (list) {
      body.push(`</${list}>`);
      list = null;
    }
  }

  function flushQuote() {
    if (quote.length > 0) {
      body.push(`<blockquote>${quote.map((line) => `<p>${renderInline(line)}</p>`).join('')}</blockquote>`);
      quote = [];
    }
  }

  function flushCodeBlock() {
    if (inCodeBlock) {
      body.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
      inCodeBlock = false;
      codeBuffer = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim() === '<!-- pagebreak -->') {
      flushParagraph();
      closeList();
      flushQuote();
      flushCodeBlock();
      body.push('<div class="page-break"></div>');
      continue;
    }

    if (line.startsWith('```')) {
      flushParagraph();
      closeList();
      flushQuote();
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      flushQuote();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      flushQuote();
      const level = heading[1].length;
      const text = heading[2].trim();
      const id = slug(text);
      body.push(`<h${level} id="${id}">${renderInline(text)}</h${level}>`);
      if (level <= 2) {
        headings.push({ level, text, id });
      }
      continue;
    }

    const quoteLine = line.match(/^>\s?(.*)$/);
    if (quoteLine) {
      flushParagraph();
      closeList();
      quote.push(quoteLine[1]);
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.*)$/);
    if (ordered) {
      flushParagraph();
      flushQuote();
      if (list !== 'ol') {
        closeList();
        body.push('<ol>');
        list = 'ol';
      }
      body.push(`<li>${renderInline(ordered[1])}</li>`);
      continue;
    }

    const unordered = line.match(/^[-*]\s+(.*)$/);
    if (unordered) {
      flushParagraph();
      flushQuote();
      if (list !== 'ul') {
        closeList();
        body.push('<ul>');
        list = 'ul';
      }
      body.push(`<li>${renderInline(unordered[1])}</li>`);
      continue;
    }

    closeList();
    flushQuote();
    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();
  flushQuote();
  flushCodeBlock();
  return { body: body.join('\n'), headings };
}

const markdown = fs.readFileSync(inputMarkdown, 'utf8');
const rendered = markdownToHtml(markdown);
const toc = rendered.headings
  .filter((heading) => heading.level === 2)
  .map((heading) => `<li><a href="#${heading.id}">${escapeHtml(heading.text)}</a></li>`)
  .join('\n');

const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Agora - enfoque IA</title>
  <style>
    @page { size: A4; margin: 16mm 15mm; }
    body {
      margin: 0;
      color: #172033;
      font-family: "Segoe UI", Arial, sans-serif;
      line-height: 1.52;
      background: #fff;
    }
    main { max-width: 920px; margin: 0 auto; }
    .cover {
      padding: 22px 24px;
      margin: 0 0 22px;
      border: 1px solid #d7dce5;
      border-radius: 12px;
      background: #f5f8fc;
    }
    .cover .eyebrow {
      margin: 0 0 8px;
      color: #2d5baf;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    h1 { margin: 0; font-size: 30px; line-height: 1.15; }
    .cover p:last-child { margin: 12px 0 0; color: #4c5a70; }
    .toc {
      padding: 15px 18px;
      margin: 0 0 24px;
      border: 1px solid #d7dce5;
      border-radius: 10px;
      background: #fbfcff;
      break-inside: avoid;
    }
    .toc h2 { margin-top: 0; font-size: 18px; border: 0; }
    .toc ul { columns: 2; column-gap: 28px; margin-bottom: 0; }
    h2 {
      margin: 26px 0 10px;
      padding-top: 8px;
      border-top: 1px solid #d7dce5;
      font-size: 21px;
      color: #163a70;
      break-after: avoid;
    }
    h3 {
      margin: 18px 0 8px;
      font-size: 17px;
      color: #22324d;
      break-after: avoid;
    }
    p { margin: 0 0 10px; }
    ul, ol { margin: 0 0 12px 22px; padding: 0; }
    li { margin: 4px 0; }
    blockquote {
      margin: 10px 0 14px;
      padding: 10px 14px;
      border-left: 4px solid #2d5baf;
      background: #eef4ff;
      color: #1b2b44;
      break-inside: avoid;
    }
    blockquote p { margin: 0; }
    code {
      padding: 1px 4px;
      border-radius: 4px;
      background: #edf1f7;
      font-family: Consolas, "Courier New", monospace;
      font-size: .94em;
    }
    pre {
      margin: 10px 0 14px;
      padding: 12px 14px;
      border: 1px solid #d7dce5;
      border-radius: 8px;
      background: #f7f9fd;
      white-space: pre-wrap;
      font-family: Consolas, "Courier New", monospace;
      font-size: 12px;
      line-height: 1.42;
      break-inside: avoid;
    }
    pre code {
      padding: 0;
      background: transparent;
      font-size: inherit;
    }
    .page-break {
      break-after: page;
      page-break-after: always;
      height: 0;
    }
    a { color: #2d5baf; text-decoration: none; }
    strong { color: #111827; }
  </style>
</head>
<body>
  <main>
    <section class="cover">
      <p class="eyebrow">Boceto de enfoque</p>
      <h1>Agora como proyecto desarrollado con IA y tecnologias actuales</h1>
      <p>Propuesta para orientar la defensa hacia el proceso de desarrollo, integracion, despliegue y aprendizaje.</p>
    </section>
    <nav class="toc">
      <h2>Indice</h2>
      <ul>${toc}</ul>
    </nav>
    ${rendered.body}
  </main>
</body>
</html>`;

fs.writeFileSync(outputHtml, html, 'utf8');

const browser = findPdfBrowser();
if (!browser) {
  throw new Error('No se ha encontrado Chrome o Edge para exportar a PDF.');
}

if (fs.existsSync(outputPdf)) {
  fs.rmSync(outputPdf, { force: true });
}

execFileSync(browser, [
  '--headless=new',
  '--disable-gpu',
  '--allow-file-access-from-files',
  '--no-pdf-header-footer',
  `--print-to-pdf=${outputPdf}`,
  toFileUri(outputHtml),
], { stdio: 'inherit' });

if (!fs.existsSync(outputPdf)) {
  throw new Error(`No se ha generado ${outputPdf}`);
}

console.log(`PDF generado: ${outputPdf}`);
