<?php

namespace App\Entity;

use App\Repository\GrupoBotRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: GrupoBotRepository::class)]
#[ORM\Table(name: 'grupo_bots')]
class GrupoBot
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Grupo::class)]
    #[ORM\JoinColumn(nullable: false)]
    private ?Grupo $grupo = null;

    #[ORM\ManyToOne(targetEntity: BotEntity::class, inversedBy: 'gruposBots')]
    #[ORM\JoinColumn(nullable: false)]
    private ?BotEntity $bot = null;

    #[ORM\ManyToOne(targetEntity: Usuario::class)]
    #[ORM\JoinColumn(nullable: false)]
    private ?Usuario $agregado_por = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $fecha_agregado = null;

    #[ORM\Column]
    private ?bool $activo = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $permisos = null;

    public function __construct()
    {
        $this->fecha_agregado = new \DateTimeImmutable();
        $this->activo = true;
        $this->permisos = [];
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getGrupo(): ?Grupo
    {
        return $this->grupo;
    }

    public function setGrupo(?Grupo $grupo): static
    {
        $this->grupo = $grupo;
        return $this;
    }

    public function getBot(): ?BotEntity
    {
        return $this->bot;
    }

    public function setBot(?BotEntity $bot): static
    {
        $this->bot = $bot;
        return $this;
    }

    public function getAgregadoPor(): ?Usuario
    {
        return $this->agregado_por;
    }

    public function setAgregadoPor(?Usuario $agregado_por): static
    {
        $this->agregado_por = $agregado_por;
        return $this;
    }

    public function getFechaAgregado(): ?\DateTimeImmutable
    {
        return $this->fecha_agregado;
    }

    public function setFechaAgregado(\DateTimeImmutable $fecha_agregado): static
    {
        $this->fecha_agregado = $fecha_agregado;
        return $this;
    }

    public function isActivo(): ?bool
    {
        return $this->activo;
    }

    public function setActivo(bool $activo): static
    {
        $this->activo = $activo;
        return $this;
    }

    public function getPermisos(): ?array
    {
        return $this->permisos;
    }

    public function setPermisos(?array $permisos): static
    {
        $this->permisos = $permisos;
        return $this;
    }
}