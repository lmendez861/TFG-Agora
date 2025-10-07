<?php

namespace App\Entity;

use App\Repository\UsuarioRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity(repositoryClass: UsuarioRepository::class)]
#[ORM\Table(name: 'usuarios')]
class Usuario implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 50, unique: true)]
    private string $username;

    #[ORM\Column(length: 120, unique: true)]
    private string $email;

    #[ORM\Column(length: 255)]
    private string $passwordHash;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $nombre = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $creadoAt;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $ultimoLogin = null;

    #[ORM\ManyToOne(inversedBy: 'usuarios')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Rol $rol = null;

    #[ORM\Column(type: 'boolean')]
    private bool $activo = true;

    #[ORM\Column(type: 'boolean')]
    private bool $isBot = false;

    #[ORM\OneToMany(mappedBy: 'usuario', targetEntity: Mensaje::class)]
    private Collection $mensajes;

    #[ORM\OneToMany(mappedBy: 'creadoPor', targetEntity: Grupo::class)]
    private Collection $gruposCreados;

    #[ORM\OneToMany(mappedBy: 'usuario', targetEntity: Membresia::class)]
    private Collection $membresias;

    public function __construct()
    {
        $this->mensajes = new ArrayCollection();
        $this->gruposCreados = new ArrayCollection();
        $this->membresias = new ArrayCollection();
        $this->creadoAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUsername(): string
    {
        return $this->username;
    }

    public function setUsername(string $username): self
    {
        $this->username = $username;
        return $this;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function setEmail(string $email): self
    {
        $this->email = $email;
        return $this;
    }

    public function getPasswordHash(): string
    {
        return $this->passwordHash;
    }

    public function setPasswordHash(string $passwordHash): self
    {
        $this->passwordHash = $passwordHash;
        return $this;
    }

    public function getNombre(): ?string
    {
        return $this->nombre;
    }

    public function setNombre(?string $nombre): self
    {
        $this->nombre = $nombre;
        return $this;
    }

    public function getCreadoAt(): \DateTimeInterface
    {
        return $this->creadoAt;
    }

    public function setCreadoAt(\DateTimeInterface $creadoAt): self
    {
        $this->creadoAt = $creadoAt;
        return $this;
    }

    public function getUltimoLogin(): ?\DateTimeInterface
    {
        return $this->ultimoLogin;
    }

    public function setUltimoLogin(?\DateTimeInterface $ultimoLogin): self
    {
        $this->ultimoLogin = $ultimoLogin;
        return $this;
    }

    public function getRol(): ?Rol
    {
        return $this->rol;
    }

    public function setRol(?Rol $rol): self
    {
        $this->rol = $rol;
        return $this;
    }

    public function isActivo(): bool
    {
        return $this->activo;
    }

    public function setActivo(bool $activo): self
    {
        $this->activo = $activo;
        return $this;
    }

    // Implementación de UserInterface
    public function getUserIdentifier(): string
    {
        return (string) $this->username;
    }

    public function getRoles(): array
    {
        return ['ROLE_USER'];
    }

    public function eraseCredentials(): void
    {
        // Si guardas datos temporales sensibles en el usuario, límpialos aquí
    }

    public function getPassword(): string
    {
        return $this->passwordHash;
    }

    public function getMensajes(): Collection
    {
        return $this->mensajes;
    }

    public function addMensaje(Mensaje $mensaje): self
    {
        if (!$this->mensajes->contains($mensaje)) {
            $this->mensajes->add($mensaje);
            $mensaje->setUsuario($this);
        }

        return $this;
    }

    public function removeMensaje(Mensaje $mensaje): self
    {
        if ($this->mensajes->removeElement($mensaje)) {
            if ($mensaje->getUsuario() === $this) {
                $mensaje->setUsuario(null);
            }
        }

        return $this;
    }

    public function getGruposCreados(): Collection
    {
        return $this->gruposCreados;
    }

    public function addGruposCreado(Grupo $gruposCreado): self
    {
        if (!$this->gruposCreados->contains($gruposCreado)) {
            $this->gruposCreados->add($gruposCreado);
            $gruposCreado->setCreadoPor($this);
        }

        return $this;
    }

    public function removeGruposCreado(Grupo $gruposCreado): self
    {
        if ($this->gruposCreados->removeElement($gruposCreado)) {
            if ($gruposCreado->getCreadoPor() === $this) {
                $gruposCreado->setCreadoPor(null);
            }
        }

        return $this;
    }

    public function getMembresias(): Collection
    {
        return $this->membresias;
    }

    public function addMembresia(Membresia $membresia): self
    {
        if (!$this->membresias->contains($membresia)) {
            $this->membresias->add($membresia);
            $membresia->setUsuario($this);
        }

        return $this;
    }

    public function removeMembresia(Membresia $membresia): self
    {
        if ($this->membresias->removeElement($membresia)) {
            if ($membresia->getUsuario() === $this) {
                $membresia->setUsuario(null);
            }
        }

        return $this;
    }

    public function isBot(): bool
    {
        return $this->isBot;
    }

    public function setIsBot(bool $isBot): self
    {
        $this->isBot = $isBot;
        return $this;
    }
}