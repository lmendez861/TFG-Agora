<?php

namespace App\Repository;

use App\Entity\GrupoBot;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<GrupoBot>
 */
class GrupoBotRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, GrupoBot::class);
    }

    /**
     * Encontrar bots activos de un grupo
     */
    public function findActiveByGroup(int $groupId): array
    {
        return $this->createQueryBuilder('gb')
            ->join('gb.bot', 'b')
            ->andWhere('gb.grupo = :groupId')
            ->andWhere('gb.activo = :activo')
            ->andWhere('b.activo = :botActivo')
            ->setParameter('groupId', $groupId)
            ->setParameter('activo', true)
            ->setParameter('botActivo', true)
            ->getQuery()
            ->getResult();
    }

    /**
     * Verificar si un bot está en un grupo
     */
    public function isBotInGroup(int $botId, int $groupId): bool
    {
        $result = $this->createQueryBuilder('gb')
            ->select('COUNT(gb.id)')
            ->andWhere('gb.bot = :botId')
            ->andWhere('gb.grupo = :groupId')
            ->andWhere('gb.activo = :activo')
            ->setParameter('botId', $botId)
            ->setParameter('groupId', $groupId)
            ->setParameter('activo', true)
            ->getQuery()
            ->getSingleScalarResult();

        return $result > 0;
    }
}