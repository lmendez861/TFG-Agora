<?php

namespace App\Entity;

use App\Repository\MultimediaRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: MultimediaRepository::class)]
#[ORM\Table(name: 'multimedia')]
class Multimedia
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 100)]
    private ?string $nombre = null;

    #[ORM\Column(type: 'string', enumType: MultimediaType::class)]
    private ?MultimediaType $tipo = null;

    #[ORM\Column(length: 255)]
    private ?string $url = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $thumbnail_url = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $tags = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $categoria = null;

    #[ORM\ManyToOne(targetEntity: Usuario::class)]
    #[ORM\JoinColumn(nullable: true)]
    private ?Usuario $subido_por = null;

    #[ORM\Column]
    private ?bool $publico = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $fecha_creacion = null;

    #[ORM\Column(nullable: true)]
    private ?int $tamaño_bytes = null;

    #[ORM\Column(length: 10, nullable: true)]
    private ?string $formato = null;

    public function __construct()
    {
        $this->fecha_creacion = new \DateTimeImmutable();
        $this->publico = true;
        $this->tags = [];
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getNombre(): ?string
    {
        return $this->nombre;
    }

    public function setNombre(string $nombre): static
    {
        $this->nombre = $nombre;
        return $this;
    }

    public function getTipo(): ?MultimediaType
    {
        return $this->tipo;
    }

    public function setTipo(MultimediaType $tipo): static
    {
        $this->tipo = $tipo;
        return $this;
    }

    public function getUrl(): ?string
    {
        return $this->url;
    }

    public function setUrl(string $url): static
    {
        $this->url = $url;
        return $this;
    }

    public function getThumbnailUrl(): ?string
    {
        return $this->thumbnail_url;
    }

    public function setThumbnailUrl(?string $thumbnail_url): static
    {
        $this->thumbnail_url = $thumbnail_url;
        return $this;
    }

    public function getTags(): ?array
    {
        return $this->tags;
    }

    public function setTags(?array $tags): static
    {
        $this->tags = $tags;
        return $this;
    }

    public function getCategoria(): ?string
    {
        return $this->categoria;
    }

    public function setCategoria(?string $categoria): static
    {
        $this->categoria = $categoria;
        return $this;
    }

    public function getSubidoPor(): ?Usuario
    {
        return $this->subido_por;
    }

    public function setSubidoPor(?Usuario $subido_por): static
    {
        $this->subido_por = $subido_por;
        return $this;
    }

    public function isPublico(): ?bool
    {
        return $this->publico;
    }

    public function setPublico(bool $publico): static
    {
        $this->publico = $publico;
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

    public function getTamañoBytes(): ?int
    {
        return $this->tamaño_bytes;
    }

    public function setTamañoBytes(?int $tamaño_bytes): static
    {
        $this->tamaño_bytes = $tamaño_bytes;
        return $this;
    }

    public function getFormato(): ?string
    {
        return $this->formato;
    }

    public function setFormato(?string $formato): static
    {
        $this->formato = $formato;
        return $this;
    }
}