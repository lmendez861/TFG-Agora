<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Servicio de aplicacion: concentra reglas reutilizables que no pertenecen a una sola entidad o controlador.
 * Relaciones: Conexiones principales indicadas por imports, inyeccion de dependencias o rutas del propio archivo.
 */

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;

/**
 * Servicio de aplicacion: concentra reglas reutilizables que no pertenecen a una sola entidad o controlador.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
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

    /**
     * Resume la responsabilidad de escapeValue dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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
