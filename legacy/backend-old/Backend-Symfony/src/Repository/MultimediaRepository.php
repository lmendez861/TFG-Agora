<?php

namespace App\Repository;

use App\Entity\Multimedia;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Multimedia>
 */
class MultimediaRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Multimedia::class);
    }

    /**
     * Encontrar multimedia público por tipo
     */
    public function findPublicByType(string $tipo): array
    {
        return $this->createQueryBuilder('m')
            ->andWhere('m.tipo = :tipo')
            ->andWhere('m.publico = :publico')
            ->setParameter('tipo', $tipo)
            ->setParameter('publico', true)
            ->orderBy('m.nombre', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Buscar multimedia por tags
     */
    public function findByTags(array $tags): array
    {
        $qb = $this->createQueryBuilder('m')
            ->andWhere('m.publico = :publico')
            ->setParameter('publico', true);

        foreach ($tags as $index => $tag) {
            $qb->andWhere("JSON_CONTAINS(m.tags, :tag$index) = 1")
               ->setParameter("tag$index", json_encode($tag));
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * Encontrar multimedia por categoría
     */
    public function findByCategory(string $categoria): array
    {
        return $this->createQueryBuilder('m')
            ->andWhere('m.categoria = :categoria')
            ->andWhere('m.publico = :publico')
            ->setParameter('categoria', $categoria)
            ->setParameter('publico', true)
            ->orderBy('m.nombre', 'ASC')
            ->getQuery()
            ->getResult();
    }
}