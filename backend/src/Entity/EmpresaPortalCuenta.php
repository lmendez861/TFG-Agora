<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\EmpresaPortalCuentaRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

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
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?EmpresaColaboradora $empresa = null;

    #[ORM\OneToOne(inversedBy: 'portalCuenta')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?EmpresaSolicitud $solicitud = null;

    public function __construct()
    {
        $now = new \DateTimeImmutable();
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

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

    public function eraseCredentials(): void
    {
        // No temporal credentials stored.
    }

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

    public function issueSetupToken(?\DateTimeImmutable $expiresAt = null): string
    {
        $this->setupToken = bin2hex(random_bytes(32));
        $this->setupTokenExpiresAt = $expiresAt ?? (new \DateTimeImmutable('+7 days'));

        return $this->setupToken;
    }

    public function clearSetupToken(): self
    {
        $this->setupToken = null;
        $this->setupTokenExpiresAt = null;

        return $this;
    }

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

    public function issuePasswordResetToken(?\DateTimeImmutable $expiresAt = null): string
    {
        $this->passwordResetToken = bin2hex(random_bytes(32));
        $this->passwordResetTokenExpiresAt = $expiresAt ?? (new \DateTimeImmutable('+2 hours'));

        return $this->passwordResetToken;
    }

    public function clearPasswordResetToken(): self
    {
        $this->passwordResetToken = null;
        $this->passwordResetTokenExpiresAt = null;

        return $this;
    }

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

    public function hasPassword(): bool
    {
        return $this->password !== null && $this->password !== '';
    }

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
