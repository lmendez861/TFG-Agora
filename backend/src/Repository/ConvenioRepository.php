<?php

namespace App\Repository;

use App\Entity\Convenio;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Convenio>
 */
class ConvenioRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Convenio::class);
    }

    /**
     * @return Convenio[]
     */
    public function findVigentes(): array
    {
        return $this->createQueryBuilder('c')
            ->andWhere('c.estado = :estado')
            ->setParameter('estado', 'vigente')
            ->orderBy('c.fechaInicio', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
