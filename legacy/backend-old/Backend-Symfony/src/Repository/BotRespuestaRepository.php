<?php

namespace App\Repository;

use App\Entity\BotRespuesta;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<BotRespuesta>
 */
class BotRespuestaRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, BotRespuesta::class);
    }

    /**
     * Encontrar respuestas activas de un bot por prioridad
     */
    public function findActiveByBot(int $botId): array
    {
        return $this->createQueryBuilder('br')
            ->andWhere('br.bot = :botId')
            ->andWhere('br.activo = :activo')
            ->setParameter('botId', $botId)
            ->setParameter('activo', true)
            ->orderBy('br.prioridad', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Buscar respuesta por keyword
     */
    public function findByKeyword(int $botId, string $keyword): ?BotRespuesta
    {
        return $this->createQueryBuilder('br')
            ->andWhere('br.bot = :botId')
            ->andWhere('br.keyword = :keyword OR br.keyword LIKE :keywordLike')
            ->andWhere('br.activo = :activo')
            ->setParameter('botId', $botId)
            ->setParameter('keyword', $keyword)
            ->setParameter('keywordLike', '%' . $keyword . '%')
            ->setParameter('activo', true)
            ->orderBy('br.prioridad', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }
}