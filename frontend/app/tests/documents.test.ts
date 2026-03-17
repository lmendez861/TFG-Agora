import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canPreviewDocument,
  isPdfDocument,
  resolveDocumentUrl,
} from '../src/utils/documents.ts';

test('isPdfDocument detecta PDFs por tipo MIME o extension', () => {
  assert.equal(isPdfDocument({ url: 'https://example.com/convenio.pdf', type: null }), true);
  assert.equal(isPdfDocument({ url: '/api/empresas/1/documentos/manual', type: 'application/pdf' }), true);
  assert.equal(isPdfDocument({ url: 'https://example.com/plan.docx', type: 'DOCX' }), false);
});

test('resolveDocumentUrl convierte rutas relativas de la API en URLs absolutas', () => {
  assert.equal(
    resolveDocumentUrl('/api/empresas/7/documentos/manual.pdf', 'http://localhost:8000/api'),
    'http://localhost:8000/api/empresas/7/documentos/manual.pdf',
  );
  assert.equal(
    resolveDocumentUrl('https://docs.example.com/manual.pdf', 'http://localhost:8000/api'),
    'https://docs.example.com/manual.pdf',
  );
});

test('canPreviewDocument solo habilita vista previa cuando existe URL resoluble y el archivo es PDF', () => {
  assert.equal(
    canPreviewDocument({ url: '/api/empresas/7/documentos/manual.pdf', type: 'PDF' }, 'http://localhost:8000/api'),
    true,
  );
  assert.equal(
    canPreviewDocument({ url: null, type: 'PDF' }, 'http://localhost:8000/api'),
    false,
  );
  assert.equal(
    canPreviewDocument({ url: '/api/empresas/7/documentos/manual.docx', type: 'DOCX' }, 'http://localhost:8000/api'),
    false,
  );
});
