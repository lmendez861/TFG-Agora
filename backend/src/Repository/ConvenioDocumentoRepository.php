<?php

namespace App\Repository;

use App\Entity\ConvenioDocumento;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ConvenioDocumento>
 *
 * @method ConvenioDocumento|null find($id, $lockMode = null, $lockVersion = null)
 * @method ConvenioDocumento|null findOneBy(array $criteria, array $orderBy = null)
 * @method ConvenioDocumento[]    findAll()
 * @method ConvenioDocumento[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class ConvenioDocumentoRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ConvenioDocumento::class);
    }
}
