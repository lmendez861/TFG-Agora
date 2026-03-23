const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');
const outputHtml = path.join(docsDir, 'memoria-final-render.html');

const sections = [
  { file: 'memoria-final.md', title: 'Memoria Final', pageBreak: false },
  { file: 'anexo-a-manual-usuario.md', title: 'Anexo A. Manual de usuario', pageBreak: true },
  { file: 'anexo-b-manual-tecnico.md', title: 'Anexo B. Manual tecnico', pageBreak: true },
  { file: 'anexo-c-capturas-y-evidencias.md', title: 'Anexo C. Capturas y evidencias', pageBreak: true },
  { file: 'anexo-d-codigo-relevante.md', title: 'Anexo D. Codigo relevante', pageBreak: true },
];

function parseFrontMatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { attributes: {}, body: markdown };
  }

  const attributes = {};
  match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const separatorIndex = line.indexOf(':');
      if (separatorIndex === -1) {
        return;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      attributes[key] = value;
    });

  return {
    attributes,
    body: markdown.slice(match[0].length),
  };
}

function readMarkdownDocument(fileName) {
  const raw = fs.readFileSync(path.join(docsDir, fileName), 'utf8');
  const { attributes, body } = parseFrontMatter(raw);
  return { file: fileName, attributes, body };
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

function buildAnchorId(text, prefix = '') {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return prefix ? `${prefix}-${slug}` : slug;
}

function markdownToHtml(markdown, idPrefix = '') {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const parts = [];
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
      const figureId = buildAnchorId(caption || src, `${idPrefix}-figure`);
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
      const id = buildAnchorId(text, idPrefix);
      parts.push(`<h${level} id="${id}">${renderInline(text)}</h${level}>`);
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

    const unorderedItem = line.match(/^\-\s+(.*)$/);
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
  return parts.join('\n');
}

function extractHeadings(markdown, idPrefix = '') {
  return markdown
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.match(/^(#{1,3})\s+(.*)$/))
    .filter(Boolean)
    .map((match) => ({
      level: match[1].length,
      text: match[2].trim(),
      id: buildAnchorId(match[2].trim(), idPrefix),
    }));
}

function extractFigures(markdown, idPrefix = '') {
  return markdown
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/))
    .filter(Boolean)
    .map((match) => {
      const caption = match[1].trim();
      const src = match[2].trim();
      return {
        text: caption || src,
        id: buildAnchorId(caption || src, `${idPrefix}-figure`),
      };
    });
}

const memoryDocument = readMarkdownDocument('memoria-final.md');
const metadata = {
  title: memoryDocument.attributes.title || 'Gestion de Empresas Colaboradoras para FP Dual',
  author: memoryDocument.attributes.author || 'Luis Angel',
  tutor: memoryDocument.attributes.tutor || 'Elena',
  reviewDate: memoryDocument.attributes.reviewDate || '23/03/2026',
  repository: memoryDocument.attributes.repository || 'https://github.com/lmendez861/TFG-Agora',
};

const sectionDocuments = sections.map((section) => {
  const document = section.file === 'memoria-final.md'
    ? memoryDocument
    : readMarkdownDocument(section.file);
  const prefix = path.basename(section.file, path.extname(section.file));

  return {
    ...section,
    prefix,
    markdown: document.body,
    headings: extractHeadings(document.body, prefix).filter((item) => item.level <= 2),
    figures: extractFigures(document.body, prefix),
  };
});

const tocItems = sectionDocuments.flatMap((section) => section.headings);
const figureItems = sectionDocuments.flatMap((section) => section.figures);

const renderedSections = sectionDocuments.map((section) => {
  const html = markdownToHtml(section.markdown, section.prefix);
  const className = section.pageBreak ? 'document-section page-break' : 'document-section';
  return `<section class="${className}" data-source="${section.file}">${html}</section>`;
});

const tocHtml = tocItems
  .map((item) => `<li class="toc-level-${item.level}"><a href="#${item.id}">${escapeHtml(item.text)}</a></li>`)
  .join('\n');
const figuresHtml = figureItems
  .map((item) => `<li class="toc-level-2"><a href="#${item.id}">${escapeHtml(item.text)}</a></li>`)
  .join('\n');

const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Memoria final TFG - Gestion de Empresas Colaboradoras</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
    }

    :root {
      color-scheme: light;
      --ink: #1d2430;
      --muted: #546173;
      --line: #d9e0e7;
      --soft: #f6f8fa;
      --accent: #183153;
      --accent-soft: #eaf1f8;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: "Georgia", "Times New Roman", serif;
      color: var(--ink);
      line-height: 1.45;
      font-size: 11pt;
      background: white;
    }

    .cover {
      min-height: 250mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 18mm;
      padding: 12mm 8mm;
      text-align: center;
    }

    .cover__eyebrow {
      font-family: "Arial", sans-serif;
      font-size: 10pt;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--muted);
      margin: 0;
    }

    .cover h1 {
      margin: 0;
      font-size: 26pt;
      line-height: 1.15;
      color: var(--accent);
    }

    .cover__meta {
      max-width: 120mm;
      margin: 0 auto;
      padding: 6mm 8mm;
      border: 1px solid var(--line);
      background: linear-gradient(180deg, #ffffff 0%, var(--accent-soft) 100%);
      border-radius: 3mm;
    }

    .cover__meta p {
      margin: 2mm 0;
    }

    .toc {
      page-break-before: always;
      page-break-after: always;
      min-height: 250mm;
      padding-top: 6mm;
    }

    .toc h2 {
      margin-top: 0;
      color: var(--accent);
    }

    .toc ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .toc li {
      margin: 2.2mm 0;
    }

    .toc .toc-level-2 {
      margin-left: 6mm;
      font-size: 10.5pt;
      color: var(--muted);
    }

    .toc a {
      color: inherit;
      text-decoration: none;
    }

    a {
      color: var(--accent);
      text-decoration: none;
    }

    .document-section {
      padding-top: 2mm;
    }

    .page-break {
      page-break-before: always;
    }

    h1, h2, h3, h4, h5, h6 {
      break-after: avoid;
      color: var(--accent);
      margin: 5mm 0 2.5mm;
      line-height: 1.2;
    }

    h1 {
      font-size: 20pt;
      border-bottom: 1px solid var(--line);
      padding-bottom: 2mm;
    }

    h2 {
      font-size: 15pt;
      margin-top: 7mm;
    }

    h3 {
      font-size: 12pt;
    }

    p, li {
      text-align: justify;
    }

    p {
      margin: 0 0 3mm;
    }

    ul, ol {
      margin: 0 0 4mm 6mm;
      padding-left: 5mm;
    }

    li {
      margin-bottom: 1.5mm;
    }

    code {
      font-family: "Consolas", "Courier New", monospace;
      font-size: 9.5pt;
      background: var(--soft);
      border: 1px solid var(--line);
      border-radius: 1mm;
      padding: 0.3mm 1mm;
    }

    pre {
      background: var(--soft);
      border: 1px solid var(--line);
      border-radius: 2mm;
      padding: 4mm;
      overflow: hidden;
      white-space: pre-wrap;
      word-break: break-word;
    }

    pre code {
      background: transparent;
      border: 0;
      padding: 0;
    }

    figure {
      margin: 5mm 0 6mm;
      text-align: center;
      break-inside: avoid;
    }

    figure img {
      max-width: 100%;
      max-height: 180mm;
      border: 1px solid var(--line);
      border-radius: 2mm;
      box-shadow: 0 2mm 6mm rgba(0, 0, 0, 0.08);
    }

    figcaption {
      margin-top: 2mm;
      font-size: 9.5pt;
      color: var(--muted);
      font-style: italic;
      text-align: center;
    }

  </style>
</head>
<body>
  <section class="cover">
    <p class="cover__eyebrow">Trabajo Final de Grado</p>
    <h1>${escapeHtml(metadata.title)}</h1>
    <div class="cover__meta">
      <p><strong>Autor:</strong> ${escapeHtml(metadata.author)}</p>
      <p><strong>Tutora:</strong> ${escapeHtml(metadata.tutor)}</p>
      <p><strong>Fecha:</strong> ${escapeHtml(metadata.reviewDate)}</p>
      <p><strong>Repositorio:</strong> ${escapeHtml(metadata.repository)}</p>
    </div>
  </section>
  <section class="toc">
    <h2>Indice</h2>
    <ul>
      ${tocHtml}
    </ul>
    ${figureItems.length > 0 ? `<h3>Indice de imagenes</h3><ul>${figuresHtml}</ul>` : ''}
  </section>
  ${renderedSections.join('\n')}
</body>
</html>`;

fs.writeFileSync(outputHtml, html, 'utf8');
console.log(outputHtml);
