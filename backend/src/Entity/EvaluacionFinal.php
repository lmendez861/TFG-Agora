<?php

namespace App\Entity;

use App\Repository\EvaluacionFinalRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: EvaluacionFinalRepository::class)]
class EvaluacionFinal
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\OneToOne(inversedBy: 'evaluacionFinal')]
    #[ORM\JoinColumn(nullable: false)]
    private ?AsignacionPractica $asignacion = null;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $fecha;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $valoracionEmpresa = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $valoracionEstudiante = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $valoracionTutorAcademico = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $conclusiones = null;

    #[ORM\Column(nullable: true)]
    private ?int $notaEmpresa = null;

    #[ORM\Column(nullable: true)]
    private ?int $notaEstudiante = null;

    #[ORM\Column(nullable: true)]
    private ?int $notaTutorAcademico = null;

    #[ORM\Column(length: 20)]
    private string $estado = 'borrador';

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $cerradaEn = null;

    public function __construct()
    {
        $this->fecha = new \DateTimeImmutable();
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

    public function getValoracionEmpresa(): ?string
    {
        return $this->valoracionEmpresa;
    }

    public function setValoracionEmpresa(?string $valoracionEmpresa): self
    {
        $this->valoracionEmpresa = $valoracionEmpresa;

        return $this;
    }

    public function getValoracionEstudiante(): ?string
    {
        return $this->valoracionEstudiante;
    }

    public function setValoracionEstudiante(?string $valoracionEstudiante): self
    {
        $this->valoracionEstudiante = $valoracionEstudiante;

        return $this;
    }

    public function getValoracionTutorAcademico(): ?string
    {
        return $this->valoracionTutorAcademico;
    }

    public function setValoracionTutorAcademico(?string $valoracionTutorAcademico): self
    {
        $this->valoracionTutorAcademico = $valoracionTutorAcademico;

        return $this;
    }

    public function getConclusiones(): ?string
    {
        return $this->conclusiones;
    }

    public function setConclusiones(?string $conclusiones): self
    {
        $this->conclusiones = $conclusiones;

        return $this;
    }

    public function getNotaEmpresa(): ?int
    {
        return $this->notaEmpresa;
    }

    public function setNotaEmpresa(?int $notaEmpresa): self
    {
        $this->notaEmpresa = $notaEmpresa;

        return $this;
    }

    public function getNotaEstudiante(): ?int
    {
        return $this->notaEstudiante;
    }

    public function setNotaEstudiante(?int $notaEstudiante): self
    {
        $this->notaEstudiante = $notaEstudiante;

        return $this;
    }

    public function getNotaTutorAcademico(): ?int
    {
        return $this->notaTutorAcademico;
    }

    public function setNotaTutorAcademico(?int $notaTutorAcademico): self
    {
        $this->notaTutorAcademico = $notaTutorAcademico;

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

    public function getCerradaEn(): ?\DateTimeImmutable
    {
        return $this->cerradaEn;
    }

    public function markClosed(): self
    {
        $this->estado = 'cerrada';
        $this->cerradaEn = new \DateTimeImmutable();

        return $this;
    }
}
