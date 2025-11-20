<?php

namespace App\Repository;

use App\Entity\ConvenioAlerta;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ConvenioAlerta>
 *
 * @method ConvenioAlerta|null find($id, $lockMode = null, $lockVersion = null)
 * @method ConvenioAlerta|null findOneBy(array $criteria, array $orderBy = null)
 * @method ConvenioAlerta[]    findAll()
 * @method ConvenioAlerta[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class ConvenioAlertaRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ConvenioAlerta::class);
    }
}
