<?php

namespace App\Entity;

use App\Repository\BotConfigRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: BotConfigRepository::class)]
#[ORM\Table(name: 'bot_config')]
class BotConfig
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: BotEntity::class, inversedBy: 'configuraciones')]
    #[ORM\JoinColumn(nullable: false)]
    private ?BotEntity $bot = null;

    #[ORM\ManyToOne(targetEntity: Usuario::class)]
    #[ORM\JoinColumn(nullable: true)]
    private ?Usuario $usuario = null;

    #[ORM\ManyToOne(targetEntity: Grupo::class)]
    #[ORM\JoinColumn(nullable: true)]
    private ?Grupo $grupo = null;

    #[ORM\Column(length: 10, nullable: true)]
    private ?string $idioma = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $tono = null;

    #[ORM\Column]
    private ?bool $respuestas_automaticas = null;

    #[ORM\Column(nullable: true)]
    private ?float $threshold_ia = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $configuracion_personalizada = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $fecha_actualizacion = null;

    public function __construct()
    {
        $this->fecha_actualizacion = new \DateTimeImmutable();
        $this->respuestas_automaticas = true;
        $this->threshold_ia = 0.7;
        $this->idioma = 'es';
        $this->tono = 'amigable';
        $this->configuracion_personalizada = [];
    }

    public function getId(): ?int
    {
        return $this->id;
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

    public function getUsuario(): ?Usuario
    {
        return $this->usuario;
    }

    public function setUsuario(?Usuario $usuario): static
    {
        $this->usuario = $usuario;
        return $this;
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

    public function getIdioma(): ?string
    {
        return $this->idioma;
    }

    public function setIdioma(?string $idioma): static
    {
        $this->idioma = $idioma;
        return $this;
    }

    public function getTono(): ?string
    {
        return $this->tono;
    }

    public function setTono(?string $tono): static
    {
        $this->tono = $tono;
        return $this;
    }

    public function isRespuestasAutomaticas(): ?bool
    {
        return $this->respuestas_automaticas;
    }

    public function setRespuestasAutomaticas(bool $respuestas_automaticas): static
    {
        $this->respuestas_automaticas = $respuestas_automaticas;
        return $this;
    }

    public function getThresholdIa(): ?float
    {
        return $this->threshold_ia;
    }

    public function setThresholdIa(?float $threshold_ia): static
    {
        $this->threshold_ia = $threshold_ia;
        return $this;
    }

    public function getConfiguracionPersonalizada(): ?array
    {
        return $this->configuracion_personalizada;
    }

    public function setConfiguracionPersonalizada(?array $configuracion_personalizada): static
    {
        $this->configuracion_personalizada = $configuracion_personalizada;
        return $this;
    }

    public function getFechaActualizacion(): ?\DateTimeImmutable
    {
        return $this->fecha_actualizacion;
    }

    public function setFechaActualizacion(\DateTimeImmutable $fecha_actualizacion): static
    {
        $this->fecha_actualizacion = $fecha_actualizacion;
        return $this;
    }
}