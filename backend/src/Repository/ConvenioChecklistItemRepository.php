<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Repositorio Doctrine: encapsula consultas y recuperacion de entidades para los controladores y servicios.
 * Relaciones: Conecta con App/Entity/ConvenioChecklistItem.
 */

namespace App\Repository;

use App\Entity\ConvenioChecklistItem;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ConvenioChecklistItem>
 *
 * @method ConvenioChecklistItem|null find($id, $lockMode = null, $lockVersion = null)
 * @method ConvenioChecklistItem|null findOneBy(array $criteria, array $orderBy = null)
 * @method ConvenioChecklistItem[]    findAll()
 * @method ConvenioChecklistItem[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class ConvenioChecklistItemRepository extends ServiceEntityRepository
{
    /**
     * Recibe las dependencias que necesita este modulo y deja visible su punto de acoplamiento principal.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ConvenioChecklistItem::class);
    }
}
