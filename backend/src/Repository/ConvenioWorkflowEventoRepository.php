<?php

namespace App\Repository;

use App\Entity\ConvenioWorkflowEvento;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ConvenioWorkflowEvento>
 *
 * @method ConvenioWorkflowEvento|null find($id, $lockMode = null, $lockVersion = null)
 * @method ConvenioWorkflowEvento|null findOneBy(array $criteria, array $orderBy = null)
 * @method ConvenioWorkflowEvento[]    findAll()
 * @method ConvenioWorkflowEvento[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class ConvenioWorkflowEventoRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ConvenioWorkflowEvento::class);
    }
}
