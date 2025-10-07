<?php

namespace App\Repository;

use App\Entity\Grupo;
use App\Entity\Usuario;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Grupo>
 */
class GrupoRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Grupo::class);
    }

    /**
     * Buscar grupos públicos
     */
    public function findPublicGroups(): array
    {
        return $this->createQueryBuilder('g')
            ->andWhere('g.privado = :privado')
            ->setParameter('privado', false)
            ->orderBy('g.creadoAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Buscar grupos de un usuario (donde es miembro)
     */
    public function findUserGroups(Usuario $usuario): array
    {
        return $this->createQueryBuilder('g')
            ->innerJoin('g.membresias', 'm')
            ->andWhere('m.usuario = :usuario')
            ->setParameter('usuario', $usuario)
            ->orderBy('g.nombre', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Buscar grupos por nombre
     */
    public function searchByName(string $nombre): array
    {
        return $this->createQueryBuilder('g')
            ->andWhere('g.nombre LIKE :nombre')
            ->andWhere('g.privado = :privado')
            ->setParameter('nombre', '%' . $nombre . '%')
            ->setParameter('privado', false)
            ->orderBy('g.nombre', 'ASC')
            ->getQuery()
            ->getResult();
    }
}