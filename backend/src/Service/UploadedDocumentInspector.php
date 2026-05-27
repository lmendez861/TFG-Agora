<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\HttpFoundation\File\UploadedFile;

final class UploadedDocumentInspector
{
    public function validate(UploadedFile $file, string $documentType, string $extension): ?string
    {
        $absolutePath = $file->getRealPath();
        if (!is_string($absolutePath) || $absolutePath === '' || !is_file($absolutePath) || !is_readable($absolutePath)) {
            return 'No se ha podido leer el archivo subido. Vuelve a adjuntarlo.';
        }

        $fileSize = $file->getSize();
        if ($fileSize !== null && $fileSize <= 0) {
            return 'El archivo subido esta vacio o incompleto.';
        }

        $normalizedExtension = strtolower($extension);

        return match ($documentType) {
            'PDF' => $this->validatePdf($absolutePath),
            'WORD' => $normalizedExtension === 'docx'
                ? $this->validateOpenXmlDocument(
                    $absolutePath,
                    ['[Content_Types].xml', 'word/document.xml'],
                    'El documento Word subido parece estar danado o no tiene una estructura valida.'
                )
                : $this->validateOleDocument(
                    $absolutePath,
                    'El documento Word subido parece estar danado o no tiene una estructura valida.'
                ),
            'EXCEL' => $normalizedExtension === 'xlsx'
                ? $this->validateOpenXmlDocument(
                    $absolutePath,
                    ['[Content_Types].xml', 'xl/workbook.xml'],
                    'La hoja Excel subida parece estar danada o no tiene una estructura valida.'
                )
                : $this->validateOleDocument(
                    $absolutePath,
                    'La hoja Excel subida parece estar danada o no tiene una estructura valida.'
                ),
            default => null,
        };
    }

    private function validatePdf(string $absolutePath): ?string
    {
        $message = 'El PDF subido parece estar danado o no tiene una estructura valida.';
        $head = $this->readRange($absolutePath, 0, 1024);
        if ($head === null || !str_contains($head, '%PDF-')) {
            return $message;
        }

        $tail = $this->readTail($absolutePath, 2048);
        if ($tail === null || !str_contains($tail, '%%EOF')) {
            return $message;
        }

        return null;
    }

    /**
     * @param list<string> $requiredEntries
     */
    private function validateOpenXmlDocument(string $absolutePath, array $requiredEntries, string $message): ?string
    {
        $head = $this->readRange($absolutePath, 0, 4);
        if ($head === null || $head !== "PK\x03\x04") {
            return $message;
        }

        $tail = $this->readTail($absolutePath, 65557);
        if ($tail === null || !str_contains($tail, "PK\x05\x06")) {
            return $message;
        }

        $contents = @file_get_contents($absolutePath);
        if (!is_string($contents) || $contents === '') {
            return 'El archivo subido esta vacio o incompleto.';
        }

        foreach ($requiredEntries as $entry) {
            if (!str_contains($contents, $entry)) {
                return $message;
            }
        }

        return null;
    }

    private function validateOleDocument(string $absolutePath, string $message): ?string
    {
        $header = $this->readRange($absolutePath, 0, 8);
        if ($header === null || $header !== hex2bin('D0CF11E0A1B11AE1')) {
            return $message;
        }

        return null;
    }

    private function readRange(string $absolutePath, int $offset, int $length): ?string
    {
        $handle = @fopen($absolutePath, 'rb');
        if ($handle === false) {
            return null;
        }

        try {
            if ($offset > 0 && fseek($handle, $offset) !== 0) {
                return null;
            }

            $data = fread($handle, $length);
            if (!is_string($data)) {
                return null;
            }

            return $data;
        } finally {
            fclose($handle);
        }
    }

    private function readTail(string $absolutePath, int $length): ?string
    {
        $size = @filesize($absolutePath);
        if (!is_int($size) || $size <= 0) {
            return null;
        }

        $offset = max(0, $size - $length);

        return $this->readRange($absolutePath, $offset, $length);
    }
}
