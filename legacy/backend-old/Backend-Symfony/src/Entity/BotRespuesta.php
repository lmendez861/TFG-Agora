<?php

namespace App\Entity;

use App\Repository\BotRespuestaRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: BotRespuestaRepository::class)]
#[ORM\Table(name: 'bot_respuestas')]
class BotRespuesta
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: BotEntity::class, inversedBy: 'respuestas')]
    #[ORM\JoinColumn(nullable: false)]
    private ?BotEntity $bot = null;

    #[ORM\Column(length: 255)]
    private ?string $keyword = null;

    #[ORM\Column(type: 'text')]
    private ?string $respuesta = null;

    #[ORM\Column]
    private ?int $prioridad = null;

    #[ORM\Column]
    private ?bool $es_regex = null;

    #[ORM\Column]
    private ?bool $activo = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $fecha_creacion = null;

    public function __construct()
    {
        $this->fecha_creacion = new \DateTimeImmutable();
        $this->activo = true;
        $this->es_regex = false;
        $this->prioridad = 1;
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

    public function getKeyword(): ?string
    {
        return $this->keyword;
    }

    public function setKeyword(string $keyword): static
    {
        $this->keyword = $keyword;
        return $this;
    }

    public function getRespuesta(): ?string
    {
        return $this->respuesta;
    }

    public function setRespuesta(string $respuesta): static
    {
        $this->respuesta = $respuesta;
        return $this;
    }

    public function getPrioridad(): ?int
    {
        return $this->prioridad;
    }

    public function setPrioridad(int $prioridad): static
    {
        $this->prioridad = $prioridad;
        return $this;
    }

    public function isEsRegex(): ?bool
    {
        return $this->es_regex;
    }

    public function setEsRegex(bool $es_regex): static
    {
        $this->es_regex = $es_regex;
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

    public function getFechaCreacion(): ?\DateTimeImmutable
    {
        return $this->fecha_creacion;
    }

    public function setFechaCreacion(\DateTimeImmutable $fecha_creacion): static
    {
        $this->fecha_creacion = $fecha_creacion;
        return $this;
    }
}