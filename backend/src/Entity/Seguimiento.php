<?php

namespace App\Entity;

use App\Repository\SeguimientoRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: SeguimientoRepository::class)]
class Seguimiento
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'seguimientos')]
    #[ORM\JoinColumn(nullable: false)]
    private ?AsignacionPractica $asignacion = null;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $fecha;

    #[ORM\Column(length: 50)]
    private string $tipo;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $descripcion = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $accionRequerida = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $documentoUrl = null;

    public function __construct()
    {
        $this->fecha = new \DateTimeImmutable();
        $this->tipo = 'reunion';
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getAsignacion(): ?AsignacionPractica
    {
        return $this->asignacion;
    }

    public function setAsignacion(?AsignacionPractica $asignacion): self
    {
        $this->asignacion = $asignacion;

        return $this;
    }

    public function getFecha(): \DateTimeImmutable
    {
        return $this->fecha;
    }

    public function setFecha(\DateTimeImmutable $fecha): self
    {
        $this->fecha = $fecha;

        return $this;
    }

    public function getTipo(): string
    {
        return $this->tipo;
    }

    public function setTipo(string $tipo): self
    {
        $this->tipo = $tipo;

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

    public function getAccionRequerida(): ?string
    {
        return $this->accionRequerida;
    }

    public function setAccionRequerida(?string $accionRequerida): self
    {
        $this->accionRequerida = $accionRequerida;

        return $this;
    }

    public function getDocumentoUrl(): ?string
    {
        return $this->documentoUrl;
    }

    public function setDocumentoUrl(?string $documentoUrl): self
    {
        $this->documentoUrl = $documentoUrl;

        return $this;
    }
}
