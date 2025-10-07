<?php

namespace App\Entity;

use App\Repository\AsignacionPracticaRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: AsignacionPracticaRepository::class)]
class AsignacionPractica
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'asignaciones')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Estudiante $estudiante = null;

    #[ORM\ManyToOne(inversedBy: 'asignaciones')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Convenio $convenio = null;

    #[ORM\ManyToOne(inversedBy: 'asignaciones')]
    #[ORM\JoinColumn(nullable: false)]
    private ?EmpresaColaboradora $empresa = null;

    #[ORM\ManyToOne(inversedBy: 'asignaciones')]
    #[ORM\JoinColumn(nullable: false)]
    private ?TutorAcademico $tutorAcademico = null;

    #[ORM\ManyToOne(inversedBy: 'asignaciones')]
    private ?TutorProfesional $tutorProfesional = null;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $fechaInicio;

    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $fechaFin = null;

    #[ORM\Column(length: 20)]
    private string $modalidad = 'presencial';

    #[ORM\Column(nullable: true)]
    private ?int $horasTotales = null;

    #[ORM\Column(length: 20)]
    private string $estado = 'en_curso';

    /**
     * @var Collection<int, Seguimiento>
     */
    #[ORM\OneToMany(mappedBy: 'asignacion', targetEntity: Seguimiento::class, cascade: ['persist'], orphanRemoval: true)]
    private Collection $seguimientos;

    #[ORM\OneToOne(mappedBy: 'asignacion', targetEntity: EvaluacionFinal::class, cascade: ['persist', 'remove'])]
    private ?EvaluacionFinal $evaluacionFinal = null;

    public function __construct()
    {
        $this->fechaInicio = new \DateTimeImmutable();
        $this->seguimientos = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEstudiante(): ?Estudiante
    {
        return $this->estudiante;
    }

    public function setEstudiante(?Estudiante $estudiante): self
    {
        $this->estudiante = $estudiante;

        return $this;
    }

    public function getConvenio(): ?Convenio
    {
        return $this->convenio;
    }

    public function setConvenio(?Convenio $convenio): self
    {
        $this->convenio = $convenio;

        return $this;
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

    public function getTutorAcademico(): ?TutorAcademico
    {
        return $this->tutorAcademico;
    }

    public function setTutorAcademico(?TutorAcademico $tutorAcademico): self
    {
        $this->tutorAcademico = $tutorAcademico;

        return $this;
    }

    public function getTutorProfesional(): ?TutorProfesional
    {
        return $this->tutorProfesional;
    }

    public function setTutorProfesional(?TutorProfesional $tutorProfesional): self
    {
        $this->tutorProfesional = $tutorProfesional;

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

    public function getModalidad(): string
    {
        return $this->modalidad;
    }

    public function setModalidad(string $modalidad): self
    {
        $this->modalidad = $modalidad;

        return $this;
    }

    public function getHorasTotales(): ?int
    {
        return $this->horasTotales;
    }

    public function setHorasTotales(?int $horasTotales): self
    {
        $this->horasTotales = $horasTotales;

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

    /**
     * @return Collection<int, Seguimiento>
     */
    public function getSeguimientos(): Collection
    {
        return $this->seguimientos;
    }

    public function addSeguimiento(Seguimiento $seguimiento): self
    {
        if (!$this->seguimientos->contains($seguimiento)) {
            $this->seguimientos->add($seguimiento);
            $seguimiento->setAsignacion($this);
        }

        return $this;
    }

    public function removeSeguimiento(Seguimiento $seguimiento): self
    {
        if ($this->seguimientos->removeElement($seguimiento)) {
            if ($seguimiento->getAsignacion() === $this) {
                $seguimiento->setAsignacion(null);
            }
        }

        return $this;
    }

    public function getEvaluacionFinal(): ?EvaluacionFinal
    {
        return $this->evaluacionFinal;
    }

    public function setEvaluacionFinal(?EvaluacionFinal $evaluacionFinal): self
    {
        if ($evaluacionFinal && $evaluacionFinal->getAsignacion() !== $this) {
            $evaluacionFinal->setAsignacion($this);
        }

        $this->evaluacionFinal = $evaluacionFinal;

        return $this;
    }
}
