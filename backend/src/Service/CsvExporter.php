<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;

final class CsvExporter
{
    /**
     * @param list<array<string, scalar|null>> $rows
     */
    public function createResponse(string $filename, array $rows, string $delimiter = ';'): Response
    {
        $response = new Response($this->encode($rows, $delimiter));
        $disposition = $response->headers->makeDisposition(
            ResponseHeaderBag::DISPOSITION_ATTACHMENT,
            $filename
        );

        $response->headers->set('Content-Type', 'text/csv; charset=UTF-8');
        $response->headers->set('Content-Disposition', $disposition);

        return $response;
    }

    /**
     * @param list<array<string, scalar|null>> $rows
     */
    public function encode(array $rows, string $delimiter = ';'): string
    {
        if ($rows === []) {
            return "\xEF\xBB\xBF";
        }

        $headers = array_keys($rows[0]);
        $lines = [
            $this->encodeRow($headers, $delimiter),
        ];

        foreach ($rows as $row) {
            $values = [];
            foreach ($headers as $header) {
                $values[] = $row[$header] ?? null;
            }

            $lines[] = $this->encodeRow($values, $delimiter);
        }

        return "\xEF\xBB\xBF" . implode("\r\n", $lines);
    }

    /**
     * @param list<scalar|null> $values
     */
    private function encodeRow(array $values, string $delimiter): string
    {
        return implode($delimiter, array_map(
            fn (string|int|float|bool|null $value): string => $this->escapeValue($value, $delimiter),
            $values
        ));
    }

    private function escapeValue(string|int|float|bool|null $value, string $delimiter): string
    {
        if ($value === null) {
            return '';
        }

        $normalized = is_bool($value) ? ($value ? 'true' : 'false') : (string) $value;

        if (
            str_contains($normalized, '"')
            || str_contains($normalized, "\n")
            || str_contains($normalized, "\r")
            || str_contains($normalized, $delimiter)
        ) {
            return '"' . str_replace('"', '""', $normalized) . '"';
        }

        return $normalized;
    }
}
