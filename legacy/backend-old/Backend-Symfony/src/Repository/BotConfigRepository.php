<?php

namespace App\Repository;

use App\Entity\BotConfig;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<BotConfig>
 */
class BotConfigRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, BotConfig::class);
    }

    /**
     * Encontrar configuración de bot para usuario específico
     */
    public function findByBotAndUser(int $botId, int $userId): ?BotConfig
    {
        return $this->createQueryBuilder('bc')
            ->andWhere('bc.bot = :botId')
            ->andWhere('bc.usuario = :userId')
            ->setParameter('botId', $botId)
            ->setParameter('userId', $userId)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Encontrar configuración de bot para grupo específico
     */
    public function findByBotAndGroup(int $botId, int $groupId): ?BotConfig
    {
        return $this->createQueryBuilder('bc')
            ->andWhere('bc.bot = :botId')
            ->andWhere('bc.grupo = :groupId')
            ->setParameter('botId', $botId)
            ->setParameter('groupId', $groupId)
            ->getQuery()
            ->getOneOrNullResult();
    }
}