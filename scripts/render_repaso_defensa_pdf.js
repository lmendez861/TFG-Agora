/**
 * Comentario de mantenimiento Agora.
 * Proposito: Genera una version HTML y PDF de la guia personal de repaso para defensa.
 * Relaciones: Reutiliza el navegador Edge/Chrome del sistema para imprimir a PDF.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');
const inputMarkdown = path.join(docsDir, 'repaso-defensa-personal.md');
const outputHtml = path.join(docsDir, 'repaso-defensa-personal-render.html');
const outputPdf = path.join(docsDir, 'repaso-defensa-personal.pdf');

function findPdfBrowser() {
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function toFileUri(filePath) {
  return `file:///${filePath.replace(/\\/g, '/')}`;
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function renderPdfWithBrowser(htmlPath, pdfPath) {
  const browserPath = findPdfBrowser();
  if (!browserPath) {
    console.warn('No se ha encontrado Edge o Chrome para exportar el PDF del repaso.');
    return false;
  }

  if (fs.existsSync(pdfPath)) {
    fs.rmSync(pdfPath, { force: true });
  }

  const escapedBrowserPath = browserPath.replace(/'/g, "''");
  const escapedPdfPath = pdfPath.replace(/'/g, "''");
  const escapedHtmlUri = toFileUri(htmlPath).replace(/'/g, "''");

  execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `& '${escapedBrowserPath}' '--headless=new' '--disable-gpu' '--allow-file-access-from-files' '--print-to-pdf=${escapedPdfPath}' '${escapedHtmlUri}'; Start-Sleep -Seconds 15`,
    ],
    { stdio: 'ignore' },
  );

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (fs.existsSync(pdfPath)) {
      return true;
    }

    sleep(250);
  }

  return false;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(text) {
  let html = escapeHtml(text);
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return html;
}

function buildAnchorId(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').split('\n');
  const parts = [];
  const headings = [];
  let paragraph = [];
  let listType = null;
  let inCodeBlock = false;
  let codeBuffer = [];

  function flushParagraph() {
    if (paragraph.length > 0) {
      parts.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  }

  function closeList() {
    if (listType) {
      parts.push(listType === 'ol' ? '</ol>' : '</ul>');
      listType = null;
    }
  }

  function flushCodeBlock() {
    if (inCodeBlock) {
      parts.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
      inCodeBlock = false;
      codeBuffer = [];
    }
  }

  for (const line of lines) {
    if (line.startsWith('```')) {
      flushParagraph();
      closeList();
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
      continue;
    }

    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      flushParagraph();
      closeList();
      const caption = image[1].trim();
      const src = image[2].trim();
      const figureId = buildAnchorId(caption || src);
      parts.push(
        `<figure id="${figureId}"><img src="${escapeHtml(src)}" alt="${escapeHtml(caption)}">${caption ? `<figcaption>${renderInline(caption)}</figcaption>` : ''}</figure>`
      );
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      const text = heading[2].trim();
      const id = buildAnchorId(text);
      parts.push(`<h${level} id="${id}">${renderInline(text)}</h${level}>`);
      if (level <= 3) {
        headings.push({ level, text, id });
      }
      continue;
    }

    const orderedItem = line.match(/^\d+\.\s+(.*)$/);
    if (orderedItem) {
      flushParagraph();
      if (listType !== 'ol') {
        closeList();
        parts.push('<ol>');
        listType = 'ol';
      }
      parts.push(`<li>${renderInline(orderedItem[1])}</li>`);
      continue;
    }

    const unorderedItem = line.match(/^[-*]\s+(.*)$/);
    if (unorderedItem) {
      flushParagraph();
      if (listType !== 'ul') {
        closeList();
        parts.push('<ul>');
        listType = 'ul';
      }
      parts.push(`<li>${renderInline(unorderedItem[1])}</li>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();
  flushCodeBlock();

  return { body: parts.join('\n'), headings };
}

const markdown = fs.readFileSync(inputMarkdown, 'utf8');
const rendered = markdownToHtml(markdown);

const toc = rendered.headings
  .map((heading) => `<li class="toc-level-${heading.level}"><a href="#${heading.id}">${escapeHtml(heading.text)}</a></li>`)
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Guia personal de repaso para la defensa</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
    }

    :root {
      color-scheme: light;
      --ink: #172033;
      --muted: #55627a;
      --line: #d7dce5;
      --panel: #f5f7fb;
      --accent: #2d5baf;
      --accent-soft: #eef4ff;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Arial, sans-serif;
      color: var(--ink);
      line-height: 1.55;
      background: #fff;
    }

    main {
      max-width: 900px;
      margin: 0 auto;
      padding: 12mm 4mm 12mm 4mm;
    }

    .hero {
      padding: 18px 22px;
      border: 1px solid var(--line);
      background: linear-gradient(135deg, #f8faff 0%, #eef3fb 100%);
      border-radius: 14px;
      margin-bottom: 24px;
    }

    .hero p {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }

    .hero h1 {
      margin: 10px 0 8px;
      font-size: 31px;
      line-height: 1.15;
    }

    .hero .summary {
      margin: 0;
      color: var(--ink);
      font-size: 16px;
    }

    .toc {
      margin: 0 0 28px;
      padding: 18px 20px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
    }

    .toc h2 {
      margin: 0 0 10px;
      font-size: 18px;
    }

    .toc ul {
      margin: 0;
      padding-left: 20px;
      columns: 2;
      column-gap: 28px;
    }

    .toc li {
      margin: 0 0 6px;
      break-inside: avoid;
    }

    .toc a {
      color: var(--accent);
      text-decoration: none;
    }

    h1, h2, h3 {
      line-height: 1.2;
      break-after: avoid;
    }

    h2 {
      margin-top: 30px;
      padding-top: 6px;
      border-top: 1px solid var(--line);
      font-size: 24px;
    }

    h3 {
      margin-top: 22px;
      font-size: 18px;
      color: var(--accent);
    }

    p, li {
      font-size: 14px;
    }

    ul, ol {
      padding-left: 22px;
    }

    code {
      background: #f3f5f9;
      border: 1px solid #e2e7ef;
      border-radius: 4px;
      padding: 1px 4px;
      font-family: Consolas, monospace;
      font-size: 12px;
    }

    pre {
      background: #0f1723;
      color: #e8eef7;
      border-radius: 12px;
      padding: 14px 16px;
      overflow: hidden;
      white-space: pre-wrap;
      border: 1px solid #243247;
      font-size: 12px;
      line-height: 1.45;
    }

    pre code {
      background: transparent;
      border: none;
      padding: 0;
      color: inherit;
      font-size: inherit;
    }

    figure {
      margin: 22px 0;
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: #fff;
      page-break-inside: avoid;
    }

    figure img {
      width: 100%;
      height: auto;
      display: block;
      border-radius: 8px;
    }

    figcaption {
      margin-top: 10px;
      font-size: 12px;
      color: var(--muted);
      text-align: center;
    }

    blockquote {
      margin: 16px 0;
      padding: 12px 16px;
      border-left: 4px solid var(--accent);
      background: var(--accent-soft);
      color: var(--ink);
    }

    @media print {
      main { padding: 0; }
      a { color: inherit; text-decoration: none; }
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <p>Documento de estudio</p>
      <h1>Guia personal de repaso para la defensa</h1>
      <p class="summary">Resumen tecnico y funcional del proyecto para repasar arquitectura, flujo de negocio, tecnologia, comandos, accesos y respuestas rapidas antes de la exposicion.</p>
    </section>
    <nav class="toc">
      <h2>Indice rapido</h2>
      <ul>${toc}</ul>
    </nav>
    ${rendered.body}
  </main>
</body>
</html>`;

fs.writeFileSync(outputHtml, html, 'utf8');

const ok = renderPdfWithBrowser(outputHtml, outputPdf);
if (!ok) {
  console.warn('No se ha podido generar el PDF del repaso, pero el HTML si ha quedado creado.');
}

console.log(`HTML generado: ${outputHtml}`);
if (ok) {
  console.log(`PDF generado: ${outputPdf}`);
}
