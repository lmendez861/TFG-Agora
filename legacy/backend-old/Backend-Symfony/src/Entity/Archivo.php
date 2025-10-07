<?php

namespace App\Entity;

use App\Repository\ArchivoRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ArchivoRepository::class)]
#[ORM\Table(name: 'archivos')]
class Archivo
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'archivos')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Mensaje $mensaje = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $nombreOriginal = null;

    #[ORM\Column(length: 500, nullable: true)]
    private ?string $ruta = null;

    #[ORM\Column(nullable: true)]
    private ?int $tam = null;

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

    public function getMensaje(): ?Mensaje
    {
        return $this->mensaje;
    }

    public function setMensaje(?Mensaje $mensaje): self
    {
        $this->mensaje = $mensaje;
        return $this;
    }

    public function getNombreOriginal(): ?string
    {
        return $this->nombreOriginal;
    }

    public function setNombreOriginal(?string $nombreOriginal): self
    {
        $this->nombreOriginal = $nombreOriginal;
        return $this;
    }

    public function getRuta(): ?string
    {
        return $this->ruta;
    }

    public function setRuta(?string $ruta): self
    {
        $this->ruta = $ruta;
        return $this;
    }

    public function getTam(): ?int
    {
        return $this->tam;
    }

    public function setTam(?int $tam): self
    {
        $this->tam = $tam;
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