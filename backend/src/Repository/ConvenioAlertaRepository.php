<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Repositorio Doctrine: encapsula consultas y recuperacion de entidades para los controladores y servicios.
 * Relaciones: Conecta con App/Entity/ConvenioAlerta.
 */

namespace App\Repository;

use App\Entity\ConvenioAlerta;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ConvenioAlerta>
 *
 * @method ConvenioAlerta|null find($id, $lockMode = null, $lockVersion = null)
 * @method ConvenioAlerta|null findOneBy(array $criteria, array $orderBy = null)
 * @method ConvenioAlerta[]    findAll()
 * @method ConvenioAlerta[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class ConvenioAlertaRepository extends ServiceEntityRepository
{
    /**
     * Recibe las dependencias que necesita este modulo y deja visible su punto de acoplamiento principal.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ConvenioAlerta::class);
    }
}
