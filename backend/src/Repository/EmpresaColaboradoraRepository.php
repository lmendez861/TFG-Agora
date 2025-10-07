<?php

namespace App\Repository;

use App\Entity\EmpresaColaboradora;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<EmpresaColaboradora>
 */
class EmpresaColaboradoraRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, EmpresaColaboradora::class);
    }

    /**
     * @return EmpresaColaboradora[]
     */
    public function findByEstado(string $estado): array
    {
        return $this->createQueryBuilder('e')
            ->andWhere('e.estadoColaboracion = :estado')
            ->setParameter('estado', $estado)
            ->orderBy('e.nombre', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
