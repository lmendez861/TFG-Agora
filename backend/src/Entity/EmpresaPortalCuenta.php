<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Entidad Doctrine: define el estado persistente, relaciones y pequenas reglas del modelo de dominio.
 * Relaciones: Conecta con App/Repository/EmpresaPortalCuentaRepository.
 */

declare(strict_types=1);

namespace App\Entity;

use App\Repository\EmpresaPortalCuentaRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Punto de entrada anotado por atributos Symfony/Doctrine; el atributo define como se enlaza con framework o persistencia.
 * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
 */
#[ORM\Entity(repositoryClass: EmpresaPortalCuentaRepository::class)]
#[ORM\HasLifecycleCallbacks]
class EmpresaPortalCuenta implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180, unique: true)]
    private string $email;

    #[ORM\Column(type: Types::JSON)]
    private array $roles = ['ROLE_COMPANY_PORTAL'];

    #[ORM\Column(nullable: true)]
    private ?string $password = null;

    #[ORM\Column(length: 160, nullable: true)]
    private ?string $displayName = null;

    #[ORM\Column]
    private bool $active = true;

    #[ORM\Column(length: 64, unique: true, nullable: true)]
    private ?string $setupToken = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $setupTokenExpiresAt = null;

    #[ORM\Column(length: 64, unique: true, nullable: true)]
    private ?string $passwordResetToken = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $passwordResetTokenExpiresAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $activatedAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $lastLoginAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    #[ORM\OneToOne(inversedBy: 'portalCuenta')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?EmpresaColaboradora $empresa = null;

    #[ORM\OneToOne(inversedBy: 'portalCuenta')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?EmpresaSolicitud $solicitud = null;

    /**
     * Recibe las dependencias que necesita este modulo y deja visible su punto de acoplamiento principal.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct()
    {
        $now = new \DateTimeImmutable();
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    /**
     * Resume la responsabilidad de touch dentro de este modulo y facilita seguir el flujo al revisarlo.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[ORM\PrePersist]
    #[ORM\PreUpdate]
    public function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function setEmail(string $email): self
    {
        $this->email = mb_strtolower(trim($email));

        return $this;
    }

    public function getDisplayName(): ?string
    {
        return $this->displayName;
    }

    public function setDisplayName(?string $displayName): self
    {
        $this->displayName = $displayName !== null ? trim($displayName) : null;

        return $this;
    }

    /**
     * @return list<string>
     */
    public function getRoles(): array
    {
        $roles = $this->roles;
        if (!in_array('ROLE_COMPANY_PORTAL', $roles, true)) {
            $roles[] = 'ROLE_COMPANY_PORTAL';
        }

        return array_values(array_unique($roles));
    }

    /**
     * @param list<string> $roles
     */
    public function setRoles(array $roles): self
    {
        $this->roles = $roles;

        return $this;
    }

    public function getPassword(): string
    {
        return $this->password ?? '';
    }

    public function setPassword(?string $password): self
    {
        $this->password = $password;

        return $this;
    }

    public function getUserIdentifier(): string
    {
        return $this->email;
    }

    /**
     * Resume la responsabilidad de eraseCredentials dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function eraseCredentials(): void
    {
        // No temporal credentials stored.
    }

    /**
     * Resume la responsabilidad de isActive dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function isActive(): bool
    {
        return $this->active;
    }

    public function setActive(bool $active): self
    {
        $this->active = $active;

        return $this;
    }

    public function getSetupToken(): ?string
    {
        return $this->setupToken;
    }

    public function getSetupTokenExpiresAt(): ?\DateTimeImmutable
    {
        return $this->setupTokenExpiresAt;
    }

    /**
     * Resume la responsabilidad de issueSetupToken dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function issueSetupToken(?\DateTimeImmutable $expiresAt = null): string
    {
        $this->setupToken = bin2hex(random_bytes(32));
        $this->setupTokenExpiresAt = $expiresAt ?? (new \DateTimeImmutable('+7 days'));

        return $this->setupToken;
    }

    /**
     * Resume la responsabilidad de clearSetupToken dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function clearSetupToken(): self
    {
        $this->setupToken = null;
        $this->setupTokenExpiresAt = null;

        return $this;
    }

    /**
     * Resume la responsabilidad de isSetupTokenValid dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function isSetupTokenValid(string $token): bool
    {
        return $this->setupToken !== null
            && hash_equals($this->setupToken, $token)
            && $this->setupTokenExpiresAt !== null
            && $this->setupTokenExpiresAt >= new \DateTimeImmutable();
    }

    public function getPasswordResetToken(): ?string
    {
        return $this->passwordResetToken;
    }

    public function getPasswordResetTokenExpiresAt(): ?\DateTimeImmutable
    {
        return $this->passwordResetTokenExpiresAt;
    }

    /**
     * Resume la responsabilidad de issuePasswordResetToken dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function issuePasswordResetToken(?\DateTimeImmutable $expiresAt = null): string
    {
        $this->passwordResetToken = bin2hex(random_bytes(32));
        $this->passwordResetTokenExpiresAt = $expiresAt ?? (new \DateTimeImmutable('+2 hours'));

        return $this->passwordResetToken;
    }

    /**
     * Resume la responsabilidad de clearPasswordResetToken dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function clearPasswordResetToken(): self
    {
        $this->passwordResetToken = null;
        $this->passwordResetTokenExpiresAt = null;

        return $this;
    }

    /**
     * Resume la responsabilidad de isPasswordResetTokenValid dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function isPasswordResetTokenValid(string $token): bool
    {
        return $this->passwordResetToken !== null
            && hash_equals($this->passwordResetToken, $token)
            && $this->passwordResetTokenExpiresAt !== null
            && $this->passwordResetTokenExpiresAt >= new \DateTimeImmutable();
    }

    public function getActivatedAt(): ?\DateTimeImmutable
    {
        return $this->activatedAt;
    }

    /**
     * Resume la responsabilidad de hasPassword dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function hasPassword(): bool
    {
        return $this->password !== null && $this->password !== '';
    }

    /**
     * Resume la responsabilidad de markActivated dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function markActivated(): self
    {
        $this->activatedAt = new \DateTimeImmutable();
        $this->clearSetupToken();
        $this->clearPasswordResetToken();

        return $this;
    }

    public function getLastLoginAt(): ?\DateTimeImmutable
    {
        return $this->lastLoginAt;
    }

    /**
     * Resume la responsabilidad de markLoggedIn dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function markLoggedIn(): self
    {
        $this->lastLoginAt = new \DateTimeImmutable();

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function getEmpresa(): ?EmpresaColaboradora
    {
        return $this->empresa;
    }

    public function setEmpresa(?EmpresaColaboradora $empresa): self
    {
        $this->empresa = $empresa;

        if ($empresa !== null && $empresa->getPortalCuenta() !== $this) {
            $empresa->setPortalCuenta($this);
        }

        return $this;
    }

    public function getSolicitud(): ?EmpresaSolicitud
    {
        return $this->solicitud;
    }

    public function setSolicitud(?EmpresaSolicitud $solicitud): self
    {
        $this->solicitud = $solicitud;

        if ($solicitud !== null && $solicitud->getPortalCuenta() !== $this) {
            $solicitud->setPortalCuenta($this);
        }

        return $this;
    }
}
