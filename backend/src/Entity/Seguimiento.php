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

    #[ORM\Column(length: 20)]
    private string $estado = 'abierto';

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $evidenciaNombre = null;

    #[ORM\Column(length: 80, nullable: true)]
    private ?string $evidenciaTipo = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $evidenciaUrl = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $cerradoEn = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $cierreComentario = null;

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

    public function getEstado(): string
    {
        return $this->estado;
    }

    public function setEstado(string $estado): self
    {
        $this->estado = $estado;

        return $this;
    }

    public function getEvidenciaNombre(): ?string
    {
        return $this->evidenciaNombre;
    }

    public function setEvidenciaNombre(?string $evidenciaNombre): self
    {
        $this->evidenciaNombre = $evidenciaNombre;

        return $this;
    }

    public function getEvidenciaTipo(): ?string
    {
        return $this->evidenciaTipo;
    }

    public function setEvidenciaTipo(?string $evidenciaTipo): self
    {
        $this->evidenciaTipo = $evidenciaTipo;

        return $this;
    }

    public function getEvidenciaUrl(): ?string
    {
        return $this->evidenciaUrl;
    }

    public function setEvidenciaUrl(?string $evidenciaUrl): self
    {
        $this->evidenciaUrl = $evidenciaUrl;

        return $this;
    }

    public function getCerradoEn(): ?\DateTimeImmutable
    {
        return $this->cerradoEn;
    }

    public function getCierreComentario(): ?string
    {
        return $this->cierreComentario;
    }

    public function close(?string $comment = null): self
    {
        $this->estado = 'cerrado';
        $this->cerradoEn = new \DateTimeImmutable();
        $this->cierreComentario = $comment;

        return $this;
    }

    public function reopen(): self
    {
        $this->estado = 'abierto';
        $this->cerradoEn = null;
        $this->cierreComentario = null;

        return $this;
    }
}
