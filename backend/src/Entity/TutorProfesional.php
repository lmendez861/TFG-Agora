<?php

namespace App\Entity;

use App\Repository\TutorProfesionalRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TutorProfesionalRepository::class)]
class TutorProfesional
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'tutoresProfesionales')]
    #[ORM\JoinColumn(nullable: false)]
    private ?EmpresaColaboradora $empresa = null;

    #[ORM\Column(length: 150)]
    private string $nombre;

    #[ORM\Column(length: 150, nullable: true)]
    private ?string $email = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $telefono = null;

    #[ORM\Column(length: 120, nullable: true)]
    private ?string $cargo = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $certificaciones = null;

    #[ORM\Column]
    private bool $activo = true;

    /**
     * @var Collection<int, AsignacionPractica>
     */
    #[ORM\OneToMany(mappedBy: 'tutorProfesional', targetEntity: AsignacionPractica::class)]
    private Collection $asignaciones;

    public function __construct()
    {
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

    public function getNombre(): string
    {
        return $this->nombre;
    }

    public function setNombre(string $nombre): self
    {
        $this->nombre = $nombre;

        return $this;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(?string $email): self
    {
        $this->email = $email;

        return $this;
    }

    public function getTelefono(): ?string
    {
        return $this->telefono;
    }

    public function setTelefono(?string $telefono): self
    {
        $this->telefono = $telefono;

        return $this;
    }

    public function getCargo(): ?string
    {
        return $this->cargo;
    }

    public function setCargo(?string $cargo): self
    {
        $this->cargo = $cargo;

        return $this;
    }

    public function getCertificaciones(): ?string
    {
        return $this->certificaciones;
    }

    public function setCertificaciones(?string $certificaciones): self
    {
        $this->certificaciones = $certificaciones;

        return $this;
    }

    public function isActivo(): bool
    {
        return $this->activo;
    }

    public function setActivo(bool $activo): self
    {
        $this->activo = $activo;

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
            $asignacion->setTutorProfesional($this);
        }

        return $this;
    }

    public function removeAsignacion(AsignacionPractica $asignacion): self
    {
        if ($this->asignaciones->removeElement($asignacion)) {
            if ($asignacion->getTutorProfesional() === $this) {
                $asignacion->setTutorProfesional(null);
            }
        }

        return $this;
    }
}
