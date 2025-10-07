<?php

namespace App\Repository;

use App\Entity\Usuario;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Usuario>
 */
class UsuarioRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Usuario::class);
    }

    /**
     * Buscar usuario por email o username
     */
    public function findByEmailOrUsername(string $identifier): ?Usuario
    {
        return $this->createQueryBuilder('u')
            ->andWhere('u.email = :identifier OR u.username = :identifier')
            ->setParameter('identifier', $identifier)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Buscar usuarios activos
     */
    public function findActiveUsers(): array
    {
        return $this->createQueryBuilder('u')
            ->andWhere('u.activo = :activo')
            ->setParameter('activo', true)
            ->orderBy('u.username', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Contar usuarios por rol
     */
    public function countUsersByRole(int $rolId): int
    {
        return $this->createQueryBuilder('u')
            ->select('count(u.id)')
            ->andWhere('u.rol = :rolId')
            ->setParameter('rolId', $rolId)
            ->getQuery()
            ->getSingleScalarResult();
    }
}