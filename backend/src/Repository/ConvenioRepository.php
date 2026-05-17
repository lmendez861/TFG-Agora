<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Repositorio Doctrine: encapsula consultas y recuperacion de entidades para los controladores y servicios.
 * Relaciones: Conecta con App/Entity/Convenio.
 */

namespace App\Repository;

use App\Entity\Convenio;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Convenio>
 */
class ConvenioRepository extends ServiceEntityRepository
{
    /**
     * Recibe las dependencias que necesita este modulo y deja visible su punto de acoplamiento principal.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Convenio::class);
    }

    /**
     * @return Convenio[]
     */
    public function findVigentes(): array
    {
        return $this->createQueryBuilder('c')
            ->andWhere('c.estado = :estado')
            ->setParameter('estado', 'vigente')
            ->orderBy('c.fechaInicio', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
