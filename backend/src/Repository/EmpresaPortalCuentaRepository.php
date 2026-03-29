<?php

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
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, EmpresaPortalCuenta::class);
    }

    public function findOneBySetupToken(string $token): ?EmpresaPortalCuenta
    {
        return $this->findOneBy(['setupToken' => $token]);
    }

    public function findOneByPasswordResetToken(string $token): ?EmpresaPortalCuenta
    {
        return $this->findOneBy(['passwordResetToken' => $token]);
    }
}
