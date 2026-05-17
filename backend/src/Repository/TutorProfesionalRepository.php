<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Repositorio Doctrine: encapsula consultas y recuperacion de entidades para los controladores y servicios.
 * Relaciones: Conecta con App/Entity/TutorProfesional.
 */

namespace App\Repository;

use App\Entity\TutorProfesional;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<TutorProfesional>
 */
class TutorProfesionalRepository extends ServiceEntityRepository
{
    /**
     * Recibe las dependencias que necesita este modulo y deja visible su punto de acoplamiento principal.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TutorProfesional::class);
    }
}
