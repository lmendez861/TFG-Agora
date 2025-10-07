<?php

namespace App\Repository;

use App\Entity\Estudiante;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Estudiante>
 */
class EstudianteRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Estudiante::class);
    }

    /**
     * @return Estudiante[]
     */
    public function findDisponibles(): array
    {
        return $this->createQueryBuilder('e')
            ->andWhere('e.estado = :estado')
            ->setParameter('estado', 'disponible')
            ->orderBy('e.apellido', 'ASC')
            ->addOrderBy('e.nombre', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
