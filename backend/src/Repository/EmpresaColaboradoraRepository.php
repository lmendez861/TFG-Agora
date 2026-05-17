<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Repositorio Doctrine: encapsula consultas y recuperacion de entidades para los controladores y servicios.
 * Relaciones: Conecta con App/Entity/EmpresaColaboradora.
 */

namespace App\Repository;

use App\Entity\EmpresaColaboradora;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<EmpresaColaboradora>
 */
class EmpresaColaboradoraRepository extends ServiceEntityRepository
{
    /**
     * Recibe las dependencias que necesita este modulo y deja visible su punto de acoplamiento principal.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, EmpresaColaboradora::class);
    }

    /**
     * @return EmpresaColaboradora[]
     */
    public function findByEstado(string $estado): array
    {
        return $this->createQueryBuilder('e')
            ->andWhere('e.estadoColaboracion = :estado')
            ->setParameter('estado', $estado)
            ->orderBy('e.nombre', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
