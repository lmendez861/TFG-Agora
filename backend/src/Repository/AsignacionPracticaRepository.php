<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Repositorio Doctrine: encapsula consultas y recuperacion de entidades para los controladores y servicios.
 * Relaciones: Conecta con App/Entity/AsignacionPractica.
 */

namespace App\Repository;

use App\Entity\AsignacionPractica;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<AsignacionPractica>
 */
class AsignacionPracticaRepository extends ServiceEntityRepository
{
    private const ACTIVE_STATES = ['planificada', 'en_curso', 'en_revision'];

    /**
     * Recibe las dependencias que necesita este modulo y deja visible su punto de acoplamiento principal.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AsignacionPractica::class);
    }

    /**
     * @return AsignacionPractica[]
     */
    public function findActivas(): array
    {
        return $this->createQueryBuilder('a')
            ->andWhere('a.estado = :estado')
            ->setParameter('estado', 'en_curso')
            ->orderBy('a.fechaInicio', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @return AsignacionPractica[]
     */
    public function findOverlappingActiveAssignmentsForStudent(
        int $estudianteId,
        \DateTimeImmutable $fechaInicio,
        ?\DateTimeImmutable $fechaFin,
        ?int $excludeAssignmentId = null,
    ): array {
        $qb = $this->createQueryBuilder('a')
            ->join('a.empresa', 'e')->addSelect('e')
            ->andWhere('IDENTITY(a.estudiante) = :estudianteId')
            ->andWhere('a.estado IN (:activeStates)')
            ->andWhere('a.fechaInicio <= :candidateEnd')
            ->andWhere('(a.fechaFin IS NULL OR a.fechaFin >= :candidateStart)')
            ->setParameter('estudianteId', $estudianteId)
            ->setParameter('activeStates', self::ACTIVE_STATES)
            ->setParameter('candidateStart', $fechaInicio)
            ->setParameter('candidateEnd', $fechaFin ?? new \DateTimeImmutable('9999-12-31'))
            ->orderBy('a.fechaInicio', 'ASC');

        if ($excludeAssignmentId !== null) {
            $qb
                ->andWhere('a.id != :excludeAssignmentId')
                ->setParameter('excludeAssignmentId', $excludeAssignmentId);
        }

        return $qb->getQuery()->getResult();
    }
}
