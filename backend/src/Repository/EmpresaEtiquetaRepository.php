<?php

namespace App\Repository;

use App\Entity\EmpresaEtiqueta;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<EmpresaEtiqueta>
 */
final class EmpresaEtiquetaRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, EmpresaEtiqueta::class);
    }
}
