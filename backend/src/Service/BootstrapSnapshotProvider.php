<?php

declare(strict_types=1);

namespace App\Service;

use Doctrine\DBAL\Connection;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class BootstrapSnapshotProvider
{
    private const CACHE_KEY = 'api_bootstrap_snapshot_v1';
    private const CACHE_TTL_SECONDS = 3600;

    public function __construct(
        private readonly Connection $connection,
        #[Autowire(service: 'cache.app')]
        private readonly CacheItemPoolInterface $cache
    ) {
    }

    /**
     * @return array<string, array<int, array<string, mixed>>>
     */
    public function getSnapshot(): array
    {
        $item = $this->cache->getItem(self::CACHE_KEY);
        if ($item->isHit()) {
            $cached = $item->get();

            if (\is_array($cached)) {
                return $cached;
            }
        }

        $snapshot = [
            'empresas' => $this->fetchEmpresas(),
            'estudiantes' => $this->fetchEstudiantes(),
            'convenios' => $this->fetchConvenios(),
            'asignaciones' => $this->fetchAsignaciones(),
        ];

        $item->set($snapshot);
        $item->expiresAfter(self::CACHE_TTL_SECONDS);
        $this->cache->save($item);

        return $snapshot;
    }

    public function invalidate(): void
    {
        $this->cache->deleteItem(self::CACHE_KEY);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function fetchEmpresas(): array
    {
        $rows = $this->connection->fetchAllAssociative(<<<'SQL'
            SELECT
                e.id,
                e.nombre,
                e.sector,
                e.ciudad,
                e.estado_colaboracion AS estadoColaboracion,
                COALESCE(convenios.total, 0) AS conveniosActivos,
                COALESCE(tutores.total, 0) AS tutoresProfesionales,
                COALESCE(contactos.total, 0) AS contactos,
                COALESCE(asignaciones.total, 0) AS asignacionesTotal,
                COALESCE(asignaciones.enCurso, 0) AS asignacionesEnCurso
            FROM empresa_colaboradora e
            LEFT JOIN (
                SELECT empresa_id, COUNT(*) AS total
                FROM convenio
                GROUP BY empresa_id
            ) convenios ON convenios.empresa_id = e.id
            LEFT JOIN (
                SELECT empresa_id, COUNT(*) AS total
                FROM tutor_profesional
                GROUP BY empresa_id
            ) tutores ON tutores.empresa_id = e.id
            LEFT JOIN (
                SELECT empresa_id, COUNT(*) AS total
                FROM contacto_empresa
                GROUP BY empresa_id
            ) contactos ON contactos.empresa_id = e.id
            LEFT JOIN (
                SELECT
                    empresa_id,
                    COUNT(*) AS total,
                    SUM(CASE WHEN estado = 'en_curso' THEN 1 ELSE 0 END) AS enCurso
                FROM asignacion_practica
                GROUP BY empresa_id
            ) asignaciones ON asignaciones.empresa_id = e.id
            ORDER BY e.id ASC
            SQL);

        return array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'nombre' => $row['nombre'],
            'sector' => $row['sector'],
            'ciudad' => $row['ciudad'],
            'estadoColaboracion' => $row['estadoColaboracion'],
            'conveniosActivos' => (int) $row['conveniosActivos'],
            'tutoresProfesionales' => (int) $row['tutoresProfesionales'],
            'contactos' => (int) $row['contactos'],
            'asignaciones' => [
                'total' => (int) $row['asignacionesTotal'],
                'enCurso' => (int) $row['asignacionesEnCurso'],
            ],
        ], $rows);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function fetchEstudiantes(): array
    {
        $rows = $this->connection->fetchAllAssociative(<<<'SQL'
            SELECT
                e.id,
                e.nombre,
                e.apellido,
                e.dni,
                e.email,
                e.grado,
                e.curso,
                e.estado,
                COALESCE(asignaciones.total, 0) AS asignacionesTotal,
                COALESCE(asignaciones.enCurso, 0) AS asignacionesEnCurso
            FROM estudiante e
            LEFT JOIN (
                SELECT
                    estudiante_id,
                    COUNT(*) AS total,
                    SUM(CASE WHEN estado = 'en_curso' THEN 1 ELSE 0 END) AS enCurso
                FROM asignacion_practica
                GROUP BY estudiante_id
            ) asignaciones ON asignaciones.estudiante_id = e.id
            ORDER BY e.id ASC
            SQL);

        return array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'nombre' => $row['nombre'],
            'apellido' => $row['apellido'],
            'dni' => $row['dni'],
            'email' => $row['email'],
            'grado' => $row['grado'],
            'curso' => $row['curso'],
            'estado' => $row['estado'],
            'asignaciones' => [
                'total' => (int) $row['asignacionesTotal'],
                'enCurso' => (int) $row['asignacionesEnCurso'],
            ],
        ], $rows);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function fetchConvenios(): array
    {
        $rows = $this->connection->fetchAllAssociative(<<<'SQL'
            SELECT
                c.id,
                c.titulo,
                c.tipo,
                c.estado,
                c.fecha_inicio AS fechaInicio,
                c.fecha_fin AS fechaFin,
                e.id AS empresaId,
                e.nombre AS empresaNombre,
                COALESCE(asignaciones.total, 0) AS asignacionesAsociadas
            FROM convenio c
            INNER JOIN empresa_colaboradora e
                ON e.id = c.empresa_id
            LEFT JOIN (
                SELECT convenio_id, COUNT(*) AS total
                FROM asignacion_practica
                GROUP BY convenio_id
            ) asignaciones ON asignaciones.convenio_id = c.id
            ORDER BY c.id ASC
            SQL);

        return array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'titulo' => $row['titulo'],
            'empresa' => [
                'id' => (int) $row['empresaId'],
                'nombre' => $row['empresaNombre'],
            ],
            'tipo' => $row['tipo'],
            'estado' => $row['estado'],
            'fechaInicio' => $row['fechaInicio'],
            'fechaFin' => $row['fechaFin'],
            'asignacionesAsociadas' => (int) $row['asignacionesAsociadas'],
        ], $rows);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function fetchAsignaciones(): array
    {
        $rows = $this->connection->fetchAllAssociative(<<<'SQL'
            SELECT
                a.id,
                a.estado,
                a.modalidad,
                a.horas_totales AS horasTotales,
                a.fecha_inicio AS fechaInicio,
                a.fecha_fin AS fechaFin,
                e.id AS empresaId,
                e.nombre AS empresaNombre,
                es.id AS estudianteId,
                es.nombre AS estudianteNombre,
                es.apellido AS estudianteApellido
            FROM asignacion_practica a
            INNER JOIN empresa_colaboradora e
                ON e.id = a.empresa_id
            INNER JOIN estudiante es
                ON es.id = a.estudiante_id
            ORDER BY a.id ASC
            SQL);

        return array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'estado' => $row['estado'],
            'modalidad' => $row['modalidad'],
            'horasTotales' => $row['horasTotales'] !== null ? (int) $row['horasTotales'] : null,
            'fechaInicio' => $row['fechaInicio'],
            'fechaFin' => $row['fechaFin'],
            'empresa' => [
                'id' => (int) $row['empresaId'],
                'nombre' => $row['empresaNombre'],
            ],
            'estudiante' => [
                'id' => (int) $row['estudianteId'],
                'nombre' => $row['estudianteNombre'],
                'apellido' => $row['estudianteApellido'],
            ],
        ], $rows);
    }
}
