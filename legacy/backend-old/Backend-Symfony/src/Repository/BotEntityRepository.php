<?php

namespace App\Repository;

use App\Entity\BotEntity;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<BotEntity>
 */
class BotEntityRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, BotEntity::class);
    }

    /**
     * Encontrar bots activos por tipo
     */
    public function findActiveByType(string $tipo): array
    {
        return $this->createQueryBuilder('b')
            ->andWhere('b.tipo = :tipo')
            ->andWhere('b.activo = :activo')
            ->setParameter('tipo', $tipo)
            ->setParameter('activo', true)
            ->orderBy('b.nombre', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Encontrar bots públicos (scope grupo)
     */
    public function findPublicBots(): array
    {
        return $this->createQueryBuilder('b')
            ->andWhere('b.scope = :scope')
            ->andWhere('b.activo = :activo')
            ->setParameter('scope', 'grupo')
            ->setParameter('activo', true)
            ->orderBy('b.nombre', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Encontrar bots de un usuario específico
     */
    public function findByCreator(int $userId): array
    {
        return $this->createQueryBuilder('b')
            ->andWhere('b.creador = :userId')
            ->setParameter('userId', $userId)
            ->orderBy('b.fecha_creacion', 'DESC')
            ->getQuery()
            ->getResult();
    }
}