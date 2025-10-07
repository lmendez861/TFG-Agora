<?php

namespace App\Repository;

use App\Entity\Membresia;
use App\Entity\Grupo;
use App\Entity\Usuario;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Membresia>
 */
class MembresiaRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Membresia::class);
    }

    /**
     * Verificar si un usuario es miembro de un grupo
     */
    public function isUserMemberOfGroup(Usuario $usuario, Grupo $grupo): bool
    {
        $result = $this->createQueryBuilder('m')
            ->select('count(m.id)')
            ->andWhere('m.usuario = :usuario')
            ->andWhere('m.grupo = :grupo')
            ->setParameter('usuario', $usuario)
            ->setParameter('grupo', $grupo)
            ->getQuery()
            ->getSingleScalarResult();

        return $result > 0;
    }

    /**
     * Obtener miembros de un grupo
     */
    public function getGroupMembers(Grupo $grupo): array
    {
        return $this->createQueryBuilder('m')
            ->innerJoin('m.usuario', 'u')
            ->andWhere('m.grupo = :grupo')
            ->setParameter('grupo', $grupo)
            ->orderBy('m.creadoAt', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Obtener rol de usuario en grupo
     */
    public function getUserRoleInGroup(Usuario $usuario, Grupo $grupo): ?string
    {
        $membresia = $this->createQueryBuilder('m')
            ->andWhere('m.usuario = :usuario')
            ->andWhere('m.grupo = :grupo')
            ->setParameter('usuario', $usuario)
            ->setParameter('grupo', $grupo)
            ->getQuery()
            ->getOneOrNullResult();

        return $membresia ? $membresia->getRolEnGrupo() : null;
    }
}