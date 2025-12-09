<?php

namespace App\Entity;

use App\Repository\EmpresaSolicitudRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use App\Entity\EmpresaMensaje;

#[ORM\Entity(repositoryClass: EmpresaSolicitudRepository::class)]
#[ORM\HasLifecycleCallbacks]
class EmpresaSolicitud
{
    public const ESTADO_PENDIENTE = 'pendiente';
    public const ESTADO_EMAIL_VERIFICADO = 'email_verificado';
    public const ESTADO_APROBADA = 'aprobada';
    public const ESTADO_RECHAZADA = 'rechazada';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 150)]
    private string $nombreEmpresa;

    #[ORM\Column(length: 32, nullable: true)]
    private ?string $cif = null;

    #[ORM\Column(length: 120, nullable: true)]
    private ?string $sector = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $ciudad = null;

    #[ORM\Column(length: 150, nullable: true)]
    private ?string $web = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $descripcion = null;

    #[ORM\Column(length: 150)]
    private string $contactoNombre;

    #[ORM\Column(length: 150)]
    private string $contactoEmail;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $contactoTelefono = null;

    #[ORM\Column(length: 64, unique: true)]
    private string $token;

    #[ORM\Column(length: 30)]
    private string $estado = self::ESTADO_PENDIENTE;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $emailVerificadoEn = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $aprobadoEn = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $rejectionReason = null;

    #[ORM\Column(length: 64, unique: true)]
    private string $portalToken;

    #[ORM\OneToMany(mappedBy: 'solicitud', targetEntity: EmpresaMensaje::class, cascade: ['persist'], orphanRemoval: true)]
    private Collection $mensajes;

    public function __construct()
    {
        $this->token = bin2hex(random_bytes(32));
        $this->portalToken = bin2hex(random_bytes(32));
        $now = new \DateTimeImmutable();
        $this->createdAt = $now;
        $this->updatedAt = $now;
        $this->mensajes = new ArrayCollection();
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

    public function getNombreEmpresa(): string
    {
        return $this->nombreEmpresa;
    }

    public function setNombreEmpresa(string $nombreEmpresa): self
    {
        $this->nombreEmpresa = $nombreEmpresa;

        return $this;
    }

    public function getCif(): ?string
    {
        return $this->cif;
    }

    public function setCif(?string $cif): self
    {
        $this->cif = $cif;

        return $this;
    }

    public function getSector(): ?string
    {
        return $this->sector;
    }

    public function setSector(?string $sector): self
    {
        $this->sector = $sector;

        return $this;
    }

    public function getCiudad(): ?string
    {
        return $this->ciudad;
    }

    public function setCiudad(?string $ciudad): self
    {
        $this->ciudad = $ciudad;

        return $this;
    }

    public function getWeb(): ?string
    {
        return $this->web;
    }

    public function setWeb(?string $web): self
    {
        $this->web = $web;

        return $this;
    }

    public function getDescripcion(): ?string
    {
        return $this->descripcion;
    }

    public function setDescripcion(?string $descripcion): self
    {
        $this->descripcion = $descripcion;

        return $this;
    }

    public function getContactoNombre(): string
    {
        return $this->contactoNombre;
    }

    public function setContactoNombre(string $contactoNombre): self
    {
        $this->contactoNombre = $contactoNombre;

        return $this;
    }

    public function getContactoEmail(): string
    {
        return $this->contactoEmail;
    }

    public function setContactoEmail(string $contactoEmail): self
    {
        $this->contactoEmail = $contactoEmail;

        return $this;
    }

    public function getContactoTelefono(): ?string
    {
        return $this->contactoTelefono;
    }

    public function setContactoTelefono(?string $contactoTelefono): self
    {
        $this->contactoTelefono = $contactoTelefono;

        return $this;
    }

    public function getToken(): string
    {
        return $this->token;
    }

    public function getEstado(): string
    {
        return $this->estado;
    }

    public function setEstado(string $estado): self
    {
        $this->estado = $estado;

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

    public function getEmailVerificadoEn(): ?\DateTimeImmutable
    {
        return $this->emailVerificadoEn;
    }

    public function markEmailVerified(): void
    {
        $this->emailVerificadoEn = new \DateTimeImmutable();
        $this->estado = self::ESTADO_EMAIL_VERIFICADO;
    }

    public function getAprobadoEn(): ?\DateTimeImmutable
    {
        return $this->aprobadoEn;
    }

    public function markApproved(): void
    {
        $this->aprobadoEn = new \DateTimeImmutable();
        $this->estado = self::ESTADO_APROBADA;
        $this->rejectionReason = null;
    }

    public function reject(string $reason): void
    {
        $this->estado = self::ESTADO_RECHAZADA;
        $this->rejectionReason = $reason;
    }

    public function getRejectionReason(): ?string
    {
        return $this->rejectionReason;
    }

    public function isEmailVerified(): bool
    {
        return $this->estado === self::ESTADO_EMAIL_VERIFICADO || $this->estado === self::ESTADO_APROBADA;
    }

    public function isPending(): bool
    {
        return $this->estado === self::ESTADO_PENDIENTE || $this->estado === self::ESTADO_EMAIL_VERIFICADO;
    }

    /**
     * @return Collection<int, EmpresaMensaje>
     */
    public function getMensajes(): Collection
    {
        return $this->mensajes;
    }

    public function addMensaje(EmpresaMensaje $mensaje): void
    {
        if (!$this->mensajes->contains($mensaje)) {
            $this->mensajes->add($mensaje);
            $mensaje->setSolicitud($this);
        }
    }

    public function getPortalToken(): string
    {
        return $this->portalToken;
    }
}
