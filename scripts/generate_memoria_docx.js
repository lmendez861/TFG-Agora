const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');
const tempDir = path.join(docsDir, '.tmp-docx');
const zipPath = path.join(docsDir, 'memoria-final.zip');
const outputDocx = process.env.OUTPUT_DOCX
  ? path.resolve(rootDir, process.env.OUTPUT_DOCX)
  : path.join(docsDir, 'memoria-final.docx');

const sections = [
  { file: 'memoria-final.md', tocLevels: [1, 2] },
  { file: 'anexo-a-manual-usuario.md', tocLevels: [1, 2] },
  { file: 'anexo-b-manual-tecnico.md', tocLevels: [1, 2] },
  { file: 'anexo-c-capturas-y-evidencias.md', tocLevels: [1, 2] },
  { file: 'anexo-d-codigo-relevante.md', tocLevels: [1, 2] },
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

const memoryDocument = readMarkdownDocument('memoria-final.md');
const metadata = {
  title: memoryDocument.attributes.title || 'Gestion de Empresas Colaboradoras para FP Dual',
  author: memoryDocument.attributes.author || 'Luis Angel',
  tutor: memoryDocument.attributes.tutor || 'Elena',
  reviewDate: memoryDocument.attributes.reviewDate || '23/03/2026',
  repository: memoryDocument.attributes.repository || 'https://github.com/lmendez861/TFG-Agora',
};

const CONTENT_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

let relationshipId = 2;
let imageId = 1;
let drawingId = 1;
let bookmarkId = 1;

const relationships = [
  {
    id: 'rId1',
    type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles',
    target: 'styles.xml',
  },
];

const extraContentTypes = new Set();
const bodyParts = [];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildBookmarkName(sectionFile, index) {
  const prefix = slugify(path.basename(sectionFile, path.extname(sectionFile))).slice(0, 18) || 'section';
  return `bk_${prefix}_${index + 1}`;
}

function buildFigureBookmarkName(sectionFile, index) {
  const prefix = slugify(path.basename(sectionFile, path.extname(sectionFile))).slice(0, 16) || 'figure';
  return `fig_${prefix}_${index + 1}`;
}

function ensureCleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function xmlEscape(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeInline(text) {
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');
}

function textRun(text, options = {}) {
  const { style, bold = false } = options;
  const safe = xmlEscape(text);
  const runProperties = [];

  if (style) {
    runProperties.push(`<w:rStyle w:val="${style}"/>`);
  }
  if (bold) {
    runProperties.push('<w:b/>');
  }

  const rPr = runProperties.length > 0 ? `<w:rPr>${runProperties.join('')}</w:rPr>` : '';
  if (safe === '') {
    return `<w:r>${rPr}<w:t xml:space="preserve"></w:t></w:r>`;
  }
  return `<w:r>${rPr}<w:t xml:space="preserve">${safe}</w:t></w:r>`;
}

function paragraphXml(innerXml = '', options = {}) {
  const { style = 'Normal', align, pageBreakBefore = false, indentLeft, bookmarkName } = options;
  const paragraphProperties = [];

  if (style) {
    paragraphProperties.push(`<w:pStyle w:val="${style}"/>`);
  }
  if (align) {
    paragraphProperties.push(`<w:jc w:val="${align}"/>`);
  }
  if (pageBreakBefore) {
    paragraphProperties.push('<w:pageBreakBefore/>');
  }
  if (indentLeft) {
    paragraphProperties.push(`<w:ind w:left="${indentLeft}"/>`);
  }

  const pPr = paragraphProperties.length > 0 ? `<w:pPr>${paragraphProperties.join('')}</w:pPr>` : '';
  const bookmarkXml = bookmarkName
    ? `<w:bookmarkStart w:id="${bookmarkId}" w:name="${xmlEscape(bookmarkName)}"/>${innerXml}<w:bookmarkEnd w:id="${bookmarkId++}"/>`
    : innerXml;
  return `<w:p>${pPr}${bookmarkXml}</w:p>`;
}

function paragraph(text = '', options = {}) {
  return paragraphXml(textRun(text), options);
}

function hyperlinkParagraph(text, anchor, options = {}) {
  return paragraphXml(
    `<w:hyperlink w:anchor="${xmlEscape(anchor)}" w:history="1">${textRun(text, { style: 'Hyperlink' })}</w:hyperlink>`,
    options
  );
}

function pageBreak() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function getImageSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  const extension = path.extname(filePath).slice(1).toLowerCase();

  if (extension === 'png' && buffer.length >= 24) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  if ((extension === 'jpg' || extension === 'jpeg') && buffer.length > 4) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }

      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + length;
    }
  }

  return { width: 1280, height: 720 };
}

function scaleImage(widthPx, heightPx) {
  const emuPerPx = 9525;
  const maxWidth = 6.2 * 914400;
  const maxHeight = 8.1 * 914400;

  let width = widthPx * emuPerPx;
  let height = heightPx * emuPerPx;
  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;
  const ratio = Math.min(1, widthRatio, heightRatio);

  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  return { width, height };
}

function addImage(relativeSourcePath, baseDir, caption, bookmarkName) {
  const sourcePath = path.resolve(baseDir, relativeSourcePath);
  if (!fs.existsSync(sourcePath)) {
    bodyParts.push(paragraph(`[Imagen no encontrada: ${relativeSourcePath}]`, { style: 'Caption', align: 'center' }));
    return;
  }

  const extension = path.extname(sourcePath).slice(1).toLowerCase();
  const mediaName = `image${imageId}.${extension}`;
  const mediaTarget = path.join(tempDir, 'word', 'media', mediaName);
  fs.copyFileSync(sourcePath, mediaTarget);

  relationships.push({
    id: `rId${relationshipId}`,
    type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
    target: `media/${mediaName}`,
  });

  extraContentTypes.add(extension);

  const { width, height } = scaleImage(...Object.values(getImageSize(sourcePath)));
  const relation = `rId${relationshipId}`;
  const name = xmlEscape(path.basename(sourcePath));

  bodyParts.push(`
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r>
        <w:drawing>
          <wp:inline distT="0" distB="0" distL="0" distR="0"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
            <wp:extent cx="${width}" cy="${height}"/>
            <wp:docPr id="${drawingId}" name="${name}"/>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:nvPicPr>
                    <pic:cNvPr id="${drawingId}" name="${name}"/>
                    <pic:cNvPicPr/>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="${relation}"/>
                    <a:stretch><a:fillRect/></a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm>
                      <a:off x="0" y="0"/>
                      <a:ext cx="${width}" cy="${height}"/>
                    </a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>
  `);

  if (caption) {
    bodyParts.push(paragraph(caption, { style: 'Caption', align: 'center', bookmarkName }));
  }

  relationshipId += 1;
  imageId += 1;
  drawingId += 1;
}

function flushParagraph(buffer) {
  if (buffer.length === 0) {
    return;
  }

  bodyParts.push(paragraph(normalizeInline(buffer.join(' ').trim())));
  buffer.length = 0;
}

function addCodeBlock(lines) {
  for (const line of lines) {
    bodyParts.push(paragraph(line, { style: 'Code' }));
  }
}

function extractHeadings(markdown, sectionFile) {
  return markdown
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.match(/^(#{1,6})\s+(.*)$/))
    .filter(Boolean)
    .map((match, index) => ({
      level: Math.min(3, match[1].length),
      text: normalizeInline(match[2].trim()),
      bookmarkName: buildBookmarkName(sectionFile, index),
    }));
}

function extractFigures(markdown, sectionFile) {
  return markdown
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/))
    .filter(Boolean)
    .map((match, index) => ({
      text: normalizeInline(match[1].trim() || match[2].trim()),
      bookmarkName: buildFigureBookmarkName(sectionFile, index),
    }));
}

function parseMarkdown(markdown, baseDir, headings = [], figures = []) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const paragraphBuffer = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  const headingQueue = [...headings];
  const figureQueue = [...figures];

  for (const line of lines) {
    if (line.startsWith('```')) {
      flushParagraph(paragraphBuffer);
      if (inCodeBlock) {
        addCodeBlock(codeBuffer);
        codeBuffer = [];
        inCodeBlock = false;
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
      flushParagraph(paragraphBuffer);
      continue;
    }

    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      flushParagraph(paragraphBuffer);
      const figureMeta = figureQueue.shift();
      addImage(image[2].trim(), baseDir, normalizeInline(image[1].trim()), figureMeta?.bookmarkName);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph(paragraphBuffer);
      const level = Math.min(3, heading[1].length);
      const headingMeta = headingQueue.shift();
      bodyParts.push(
        paragraph(normalizeInline(heading[2].trim()), {
          style: `Heading${level}`,
          bookmarkName: headingMeta?.bookmarkName,
        })
      );
      continue;
    }

    const orderedItem = line.match(/^(\d+\.)\s+(.*)$/);
    if (orderedItem) {
      flushParagraph(paragraphBuffer);
      bodyParts.push(paragraph(`${orderedItem[1]} ${normalizeInline(orderedItem[2])}`, { style: 'List' }));
      continue;
    }

    const unorderedItem = line.match(/^\-\s+(.*)$/);
    if (unorderedItem) {
      flushParagraph(paragraphBuffer);
      bodyParts.push(paragraph(`- ${normalizeInline(unorderedItem[1])}`, { style: 'List' }));
      continue;
    }

    paragraphBuffer.push(line.trim());
  }

  flushParagraph(paragraphBuffer);
  if (codeBuffer.length > 0) {
    addCodeBlock(codeBuffer);
  }
}

function buildCoverPage() {
  bodyParts.push(paragraph('Trabajo Final de Grado', { style: 'CoverKicker', align: 'center' }));
  bodyParts.push(paragraph(metadata.title, { style: 'Title', align: 'center' }));
  bodyParts.push(paragraph(`Autor: ${metadata.author}`, { style: 'CoverMeta', align: 'center' }));
  bodyParts.push(paragraph(`Tutora: ${metadata.tutor}`, { style: 'CoverMeta', align: 'center' }));
  bodyParts.push(paragraph(`Fecha de revision: ${metadata.reviewDate}`, { style: 'CoverMeta', align: 'center' }));
  bodyParts.push(paragraph(`Repositorio: ${metadata.repository}`, { style: 'CoverMeta', align: 'center' }));
  bodyParts.push(pageBreak());
}

function buildToc(sectionData) {
  bodyParts.push(paragraph('Indice', { style: 'Heading1' }));

  const tocEntries = sectionData.flatMap(({ section, headings }) =>
    headings.filter((heading) => section.tocLevels.includes(heading.level))
  );

  for (const item of tocEntries) {
    bodyParts.push(hyperlinkParagraph(item.text, item.bookmarkName, { style: 'TocEntry', indentLeft: (item.level - 1) * 360 }));
  }

  const figureEntries = sectionData.flatMap(({ figures = [] }) => figures);
  if (figureEntries.length > 0) {
    bodyParts.push(paragraph('Indice de imagenes', { style: 'Heading2' }));
    for (const item of figureEntries) {
      bodyParts.push(hyperlinkParagraph(item.text, item.bookmarkName, { style: 'TocEntry', indentLeft: 360 }));
    }
  }

  bodyParts.push(pageBreak());
}

function buildDocumentXml() {
  const sectionProperties = `
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  `;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>
    ${bodyParts.join('\n')}
    ${sectionProperties}
  </w:body>
</w:document>`;
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="40"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="CoverKicker">
    <w:name w:val="CoverKicker"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="CoverMeta">
    <w:name w:val="CoverMeta"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:rPr><w:sz w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:b/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="List">
    <w:name w:val="List"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:ind w:left="360" w:hanging="180"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Caption">
    <w:name w:val="Caption"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr><w:i/><w:sz w:val="18"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Code">
    <w:name w:val="Code"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr>
      <w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>
      <w:sz w:val="18"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="TocEntry">
    <w:name w:val="TocEntry"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr><w:sz w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="character" w:styleId="Hyperlink">
    <w:name w:val="Hyperlink"/>
    <w:unhideWhenUsed/>
    <w:rPr>
      <w:color w:val="0563C1"/>
      <w:u w:val="single"/>
    </w:rPr>
  </w:style>
</w:styles>`;
}

function buildContentTypesXml() {
  const defaults = Object.entries(CONTENT_TYPES)
    .filter(([extension]) => extraContentTypes.has(extension))
    .map(([extension, contentType]) => `<Default Extension="${extension}" ContentType="${contentType}"/>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${defaults}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
}

function buildRootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function buildDocumentRelsXml() {
  const entries = relationships
    .map((rel) => `<Relationship Id="${rel.id}" Type="${rel.type}" Target="${rel.target}"/>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${entries}
</Relationships>`;
}

function buildCoreXml() {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties
  xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:dcmitype="http://purl.org/dc/dcmitype/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Memoria final TFG</dc:title>
  <dc:creator>Luis Angel</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

function buildAppXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties
  xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
  xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex</Application>
</Properties>`;
}

function writeStructure() {
  ensureCleanDir(tempDir);
  fs.mkdirSync(path.join(tempDir, '_rels'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'word', '_rels'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'word', 'media'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'docProps'), { recursive: true });

  const sectionData = sections.map((section) => {
    const document = section.file === 'memoria-final.md'
      ? memoryDocument
      : readMarkdownDocument(section.file);
    const filePath = path.join(docsDir, section.file);
    const markdown = document.body;
    return {
      section,
      filePath,
      markdown,
      headings: extractHeadings(markdown, section.file),
      figures: extractFigures(markdown, section.file),
    };
  });

  buildCoverPage();
  buildToc(sectionData);

  for (const [index, entry] of sectionData.entries()) {
    if (index > 0) {
      bodyParts.push(pageBreak());
    }

    parseMarkdown(entry.markdown, path.dirname(entry.filePath), entry.headings, entry.figures);
  }

  fs.writeFileSync(path.join(tempDir, '[Content_Types].xml'), buildContentTypesXml(), 'utf8');
  fs.writeFileSync(path.join(tempDir, '_rels', '.rels'), buildRootRelsXml(), 'utf8');
  fs.writeFileSync(path.join(tempDir, 'word', 'document.xml'), buildDocumentXml(), 'utf8');
  fs.writeFileSync(path.join(tempDir, 'word', 'styles.xml'), buildStylesXml(), 'utf8');
  fs.writeFileSync(path.join(tempDir, 'word', '_rels', 'document.xml.rels'), buildDocumentRelsXml(), 'utf8');
  fs.writeFileSync(path.join(tempDir, 'docProps', 'core.xml'), buildCoreXml(), 'utf8');
  fs.writeFileSync(path.join(tempDir, 'docProps', 'app.xml'), buildAppXml(), 'utf8');
}

function packageDocx() {
  fs.rmSync(zipPath, { force: true });
  fs.rmSync(outputDocx, { force: true });

  const psCommand = `Compress-Archive -Path '${tempDir.replace(/'/g, "''")}\\*' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force`;
  execFileSync('powershell.exe', ['-NoLogo', '-NoProfile', '-Command', psCommand], { stdio: 'inherit' });
  fs.renameSync(zipPath, outputDocx);
  fs.rmSync(tempDir, { recursive: true, force: true });
}

writeStructure();
packageDocx();
console.log(outputDocx);
