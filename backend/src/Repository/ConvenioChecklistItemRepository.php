<?php

namespace App\Repository;

use App\Entity\ConvenioChecklistItem;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ConvenioChecklistItem>
 *
 * @method ConvenioChecklistItem|null find($id, $lockMode = null, $lockVersion = null)
 * @method ConvenioChecklistItem|null findOneBy(array $criteria, array $orderBy = null)
 * @method ConvenioChecklistItem[]    findAll()
 * @method ConvenioChecklistItem[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class ConvenioChecklistItemRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ConvenioChecklistItem::class);
    }
}
