<?php

namespace App\Entity;

use App\Repository\ConvenioRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ConvenioRepository::class)]
class Convenio
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'convenios')]
    #[ORM\JoinColumn(nullable: false)]
    private ?EmpresaColaboradora $empresa = null;

    #[ORM\Column(length: 180)]
    private string $titulo;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $descripcion = null;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $fechaInicio;

    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $fechaFin = null;

    #[ORM\Column(length: 80)]
    private string $tipo;

    #[ORM\Column(length: 30)]
    private string $estado = 'vigente';

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $documentoUrl = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $observaciones = null;

    /**
     * @var Collection<int, AsignacionPractica>
     */
    #[ORM\OneToMany(mappedBy: 'convenio', targetEntity: AsignacionPractica::class, cascade: ['persist'], orphanRemoval: true)]
    private Collection $asignaciones;

    public function __construct()
    {
        $this->fechaInicio = new \DateTimeImmutable();
        $this->asignaciones = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmpresa(): ?EmpresaColaboradora
    {
        return $this->empresa;
    }

    public function setEmpresa(?EmpresaColaboradora $empresa): self
    {
        $this->empresa = $empresa;

        return $this;
    }

    public function getTitulo(): string
    {
        return $this->titulo;
    }

    public function setTitulo(string $titulo): self
    {
        $this->titulo = $titulo;

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

    public function getFechaInicio(): \DateTimeImmutable
    {
        return $this->fechaInicio;
    }

    public function setFechaInicio(\DateTimeImmutable $fechaInicio): self
    {
        $this->fechaInicio = $fechaInicio;

        return $this;
    }

    public function getFechaFin(): ?\DateTimeImmutable
    {
        return $this->fechaFin;
    }

    public function setFechaFin(?\DateTimeImmutable $fechaFin): self
    {
        $this->fechaFin = $fechaFin;

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

    public function getEstado(): string
    {
        return $this->estado;
    }

    public function setEstado(string $estado): self
    {
        $this->estado = $estado;

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

    public function getObservaciones(): ?string
    {
        return $this->observaciones;
    }

    public function setObservaciones(?string $observaciones): self
    {
        $this->observaciones = $observaciones;

        return $this;
    }

    /**
     * @return Collection<int, AsignacionPractica>
     */
    public function getAsignaciones(): Collection
    {
        return $this->asignaciones;
    }

    public function addAsignacion(AsignacionPractica $asignacion): self
    {
        if (!$this->asignaciones->contains($asignacion)) {
            $this->asignaciones->add($asignacion);
            $asignacion->setConvenio($this);
        }

        return $this;
    }

    public function removeAsignacion(AsignacionPractica $asignacion): self
    {
        if ($this->asignaciones->removeElement($asignacion)) {
            if ($asignacion->getConvenio() === $this) {
                $asignacion->setConvenio(null);
            }
        }

        return $this;
    }
}
