<?php

namespace App\Entity;

use App\Repository\GrupoRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: GrupoRepository::class)]
#[ORM\Table(name: 'grupos')]
class Grupo
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 150)]
    private string $nombre;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $descripcion = null;

    #[ORM\ManyToOne(inversedBy: 'gruposCreados')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Usuario $creadoPor = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $creadoAt;

    #[ORM\Column(type: 'boolean')]
    private bool $privado = false;

    #[ORM\OneToMany(mappedBy: 'grupo', targetEntity: Membresia::class, orphanRemoval: true)]
    private Collection $membresias;

    #[ORM\OneToMany(mappedBy: 'grupo', targetEntity: Mensaje::class)]
    private Collection $mensajes;

    public function __construct()
    {
        $this->membresias = new ArrayCollection();
        $this->mensajes = new ArrayCollection();
        $this->creadoAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getNombre(): string
    {
        return $this->nombre;
    }

    public function setNombre(string $nombre): self
    {
        $this->nombre = $nombre;
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

    public function getCreadoPor(): ?Usuario
    {
        return $this->creadoPor;
    }

    public function setCreadoPor(?Usuario $creadoPor): self
    {
        $this->creadoPor = $creadoPor;
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

    public function isPrivado(): bool
    {
        return $this->privado;
    }

    public function setPrivado(bool $privado): self
    {
        $this->privado = $privado;
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
            $membresia->setGrupo($this);
        }

        return $this;
    }

    public function removeMembresia(Membresia $membresia): self
    {
        if ($this->membresias->removeElement($membresia)) {
            if ($membresia->getGrupo() === $this) {
                $membresia->setGrupo(null);
            }
        }

        return $this;
    }

    public function getMensajes(): Collection
    {
        return $this->mensajes;
    }

    public function addMensaje(Mensaje $mensaje): self
    {
        if (!$this->mensajes->contains($mensaje)) {
            $this->mensajes->add($mensaje);
            $mensaje->setGrupo($this);
        }

        return $this;
    }

    public function removeMensaje(Mensaje $mensaje): self
    {
        if ($this->mensajes->removeElement($mensaje)) {
            if ($mensaje->getGrupo() === $this) {
                $mensaje->setGrupo(null);
            }
        }

        return $this;
    }
}