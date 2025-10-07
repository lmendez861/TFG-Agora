<?php

namespace App\Repository;

use App\Entity\Mensaje;
use App\Entity\Grupo;
use App\Entity\Conversacion;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Mensaje>
 */
class MensajeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Mensaje::class);
    }

    /**
     * Obtener mensajes de un grupo con paginación
     */
    public function findGroupMessages(Grupo $grupo, int $limit = 50, ?int $before = null): array
    {
        $qb = $this->createQueryBuilder('m')
            ->andWhere('m.grupo = :grupo')
            ->andWhere('m.eliminado = :eliminado')
            ->setParameter('grupo', $grupo)
            ->setParameter('eliminado', false)
            ->orderBy('m.creadoAt', 'DESC')
            ->setMaxResults($limit);

        if ($before) {
            $qb->andWhere('m.id < :before')
               ->setParameter('before', $before);
        }

        return array_reverse($qb->getQuery()->getResult());
    }

    /**
     * Obtener mensajes de una conversación privada
     */
    public function findConversationMessages(Conversacion $conversacion, int $limit = 50, ?int $before = null): array
    {
        $qb = $this->createQueryBuilder('m')
            ->andWhere('m.conversacion = :conversacion')
            ->andWhere('m.eliminado = :eliminado')
            ->setParameter('conversacion', $conversacion)
            ->setParameter('eliminado', false)
            ->orderBy('m.creadoAt', 'DESC')
            ->setMaxResults($limit);

        if ($before) {
            $qb->andWhere('m.id < :before')
               ->setParameter('before', $before);
        }

        return array_reverse($qb->getQuery()->getResult());
    }

    /**
     * Contar mensajes de un grupo
     */
    public function countGroupMessages(Grupo $grupo): int
    {
        return $this->createQueryBuilder('m')
            ->select('count(m.id)')
            ->andWhere('m.grupo = :grupo')
            ->andWhere('m.eliminado = :eliminado')
            ->setParameter('grupo', $grupo)
            ->setParameter('eliminado', false)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Buscar mensajes por contenido
     */
    public function searchMessages(string $query, ?Grupo $grupo = null): array
    {
        $qb = $this->createQueryBuilder('m')
            ->andWhere('m.contenido LIKE :query')
            ->andWhere('m.eliminado = :eliminado')
            ->setParameter('query', '%' . $query . '%')
            ->setParameter('eliminado', false)
            ->orderBy('m.creadoAt', 'DESC')
            ->setMaxResults(100);

        if ($grupo) {
            $qb->andWhere('m.grupo = :grupo')
               ->setParameter('grupo', $grupo);
        }

        return $qb->getQuery()->getResult();
    }
}