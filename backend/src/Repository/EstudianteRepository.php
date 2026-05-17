<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Repositorio Doctrine: encapsula consultas y recuperacion de entidades para los controladores y servicios.
 * Relaciones: Conecta con App/Entity/Estudiante.
 */

namespace App\Repository;

use App\Entity\Estudiante;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Estudiante>
 */
class EstudianteRepository extends ServiceEntityRepository
{
    /**
     * Recibe las dependencias que necesita este modulo y deja visible su punto de acoplamiento principal.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Estudiante::class);
    }

    /**
     * @return Estudiante[]
     */
    public function findDisponibles(): array
    {
        return $this->createQueryBuilder('e')
            ->andWhere('e.estado = :estado')
            ->setParameter('estado', 'disponible')
            ->orderBy('e.apellido', 'ASC')
            ->addOrderBy('e.nombre', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
