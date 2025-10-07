<?php

namespace App\Repository;

use App\Entity\AsignacionPractica;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<AsignacionPractica>
 */
class AsignacionPracticaRepository extends ServiceEntityRepository
{
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
}
