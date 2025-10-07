<?php

namespace App\Entity;

use App\Repository\MembresiaRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: MembresiaRepository::class)]
#[ORM\Table(name: 'membresias')]
#[ORM\UniqueConstraint(columns: ['grupo_id', 'usuario_id'])]
class Membresia
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'membresias')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Grupo $grupo = null;

    #[ORM\ManyToOne(inversedBy: 'membresias')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Usuario $usuario = null;

    #[ORM\Column(length: 30)]
    private string $rolEnGrupo = 'miembro';

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $creadoAt;

    public function __construct()
    {
        $this->creadoAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getGrupo(): ?Grupo
    {
        return $this->grupo;
    }

    public function setGrupo(?Grupo $grupo): self
    {
        $this->grupo = $grupo;
        return $this;
    }

    public function getUsuario(): ?Usuario
    {
        return $this->usuario;
    }

    public function setUsuario(?Usuario $usuario): self
    {
        $this->usuario = $usuario;
        return $this;
    }

    public function getRolEnGrupo(): string
    {
        return $this->rolEnGrupo;
    }

    public function setRolEnGrupo(string $rolEnGrupo): self
    {
        $this->rolEnGrupo = $rolEnGrupo;
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
}