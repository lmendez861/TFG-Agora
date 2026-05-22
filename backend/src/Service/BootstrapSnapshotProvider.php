<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Servicio de aplicacion: concentra reglas reutilizables que no pertenecen a una sola entidad o controlador.
 * Relaciones: Conexiones principales indicadas por imports, inyeccion de dependencias o rutas del propio archivo.
 */

declare(strict_types=1);

namespace App\Service;

use Doctrine\DBAL\Connection;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Servicio de aplicacion: concentra reglas reutilizables que no pertenecen a una sola entidad o controlador.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
final class BootstrapSnapshotProvider
{
    private const CACHE_KEY = 'api_bootstrap_snapshot_v2';
    private const CACHE_TTL_SECONDS = 3600;

    /**
     * Recibe las dependencias que necesita este modulo y deja visible su punto de acoplamiento principal.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

    /**
     * Resume la responsabilidad de invalidate dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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
                e.estado_colaboracion AS estado_colaboracion,
                COALESCE(convenios.total, 0) AS convenios_activos,
                COALESCE(tutores.total, 0) AS tutores_profesionales,
                COALESCE(contactos.total, 0) AS contactos,
                COALESCE(asignaciones.total, 0) AS asignaciones_total,
                COALESCE(asignaciones.en_curso, 0) AS asignaciones_en_curso
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
                    SUM(CASE WHEN estado = 'en_curso' THEN 1 ELSE 0 END) AS en_curso
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
            'estadoColaboracion' => $row['estado_colaboracion'],
            'conveniosActivos' => (int) $row['convenios_activos'],
            'tutoresProfesionales' => (int) $row['tutores_profesionales'],
            'contactos' => (int) $row['contactos'],
            'asignaciones' => [
                'total' => (int) $row['asignaciones_total'],
                'enCurso' => (int) $row['asignaciones_en_curso'],
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
                COALESCE(asignaciones.total, 0) AS asignaciones_total,
                COALESCE(asignaciones.en_curso, 0) AS asignaciones_en_curso
            FROM estudiante e
            LEFT JOIN (
                SELECT
                    estudiante_id,
                    COUNT(*) AS total,
                    SUM(CASE WHEN estado = 'en_curso' THEN 1 ELSE 0 END) AS en_curso
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
                'total' => (int) $row['asignaciones_total'],
                'enCurso' => (int) $row['asignaciones_en_curso'],
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
                c.fecha_inicio AS fecha_inicio,
                c.fecha_fin AS fecha_fin,
                e.id AS empresa_id,
                e.nombre AS empresa_nombre,
                COALESCE(asignaciones.total, 0) AS asignaciones_asociadas
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
                'id' => (int) $row['empresa_id'],
                'nombre' => $row['empresa_nombre'],
            ],
            'tipo' => $row['tipo'],
            'estado' => $row['estado'],
            'fechaInicio' => $row['fecha_inicio'],
            'fechaFin' => $row['fecha_fin'],
            'asignacionesAsociadas' => (int) $row['asignaciones_asociadas'],
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
                a.horas_totales AS horas_totales,
                a.fecha_inicio AS fecha_inicio,
                a.fecha_fin AS fecha_fin,
                e.id AS empresa_id,
                e.nombre AS empresa_nombre,
                es.id AS estudiante_id,
                es.nombre AS estudiante_nombre,
                es.apellido AS estudiante_apellido
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
            'horasTotales' => $row['horas_totales'] !== null ? (int) $row['horas_totales'] : null,
            'fechaInicio' => $row['fecha_inicio'],
            'fechaFin' => $row['fecha_fin'],
            'empresa' => [
                'id' => (int) $row['empresa_id'],
                'nombre' => $row['empresa_nombre'],
            ],
            'estudiante' => [
                'id' => (int) $row['estudiante_id'],
                'nombre' => $row['estudiante_nombre'],
                'apellido' => $row['estudiante_apellido'],
            ],
        ], $rows);
    }
}
