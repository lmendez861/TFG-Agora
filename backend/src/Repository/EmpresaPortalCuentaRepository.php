<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Repositorio Doctrine: encapsula consultas y recuperacion de entidades para los controladores y servicios.
 * Relaciones: Conecta con App/Entity/EmpresaPortalCuenta.
 */

declare(strict_types=1);

namespace App\Repository;

use App\Entity\EmpresaPortalCuenta;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<EmpresaPortalCuenta>
 */
final class EmpresaPortalCuentaRepository extends ServiceEntityRepository
{
    /**
     * Recibe las dependencias que necesita este modulo y deja visible su punto de acoplamiento principal.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, EmpresaPortalCuenta::class);
    }

    /**
     * Encapsula una consulta reutilizable para que la capa superior no dependa de SQL/Doctrine.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function findOneBySetupToken(string $token): ?EmpresaPortalCuenta
    {
        return $this->findOneBy(['setupToken' => $token]);
    }

    /**
     * Encapsula una consulta reutilizable para que la capa superior no dependa de SQL/Doctrine.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function findOneByPasswordResetToken(string $token): ?EmpresaPortalCuenta
    {
        return $this->findOneBy(['passwordResetToken' => $token]);
    }
}
