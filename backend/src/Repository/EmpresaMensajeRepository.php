<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\EmpresaMensaje;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<EmpresaMensaje>
 */
class EmpresaMensajeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, EmpresaMensaje::class);
    }
}
