<?php

namespace App\Entity;

use App\Repository\EmpresaColaboradoraRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: EmpresaColaboradoraRepository::class)]
class EmpresaColaboradora
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 150)]
    private string $nombre;

    #[ORM\Column(length: 120, nullable: true)]
    private ?string $sector = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $direccion = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $ciudad = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $provincia = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $pais = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $telefono = null;

    #[ORM\Column(length: 150, nullable: true)]
    private ?string $email = null;

    #[ORM\Column(length: 150, nullable: true)]
    private ?string $web = null;

    #[ORM\Column(length: 30)]
    private string $estadoColaboracion = 'pendiente';

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $fechaAlta;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $observaciones = null;

    /**
     * @var Collection<int, ContactoEmpresa>
     */
    #[ORM\OneToMany(mappedBy: 'empresa', targetEntity: ContactoEmpresa::class, cascade: ['persist'], orphanRemoval: true)]
    private Collection $contactos;

    /**
     * @var Collection<int, Convenio>
     */
    #[ORM\OneToMany(mappedBy: 'empresa', targetEntity: Convenio::class, cascade: ['persist'], orphanRemoval: true)]
    private Collection $convenios;

    /**
     * @var Collection<int, TutorProfesional>
     */
    #[ORM\OneToMany(mappedBy: 'empresa', targetEntity: TutorProfesional::class, cascade: ['persist'], orphanRemoval: true)]
    private Collection $tutoresProfesionales;

    /**
     * @var Collection<int, AsignacionPractica>
     */
    #[ORM\OneToMany(mappedBy: 'empresa', targetEntity: AsignacionPractica::class)]
    private Collection $asignaciones;

    #[ORM\OneToMany(mappedBy: 'empresa', targetEntity: EmpresaEtiqueta::class, cascade: ['persist'], orphanRemoval: true)]
    private Collection $etiquetas;

    #[ORM\OneToMany(mappedBy: 'empresa', targetEntity: EmpresaNota::class, cascade: ['persist'], orphanRemoval: true)]
    private Collection $notas;

    #[ORM\OneToMany(mappedBy: 'empresa', targetEntity: EmpresaDocumento::class, cascade: ['persist'], orphanRemoval: true)]
    private Collection $documentos;

    public function __construct()
    {
        $this->fechaAlta = new \DateTimeImmutable();
        $this->contactos = new ArrayCollection();
        $this->convenios = new ArrayCollection();
        $this->tutoresProfesionales = new ArrayCollection();
        $this->asignaciones = new ArrayCollection();
        $this->etiquetas = new ArrayCollection();
        $this->notas = new ArrayCollection();
        $this->documentos = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
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

    public function getSector(): ?string
    {
        return $this->sector;
    }

    public function setSector(?string $sector): self
    {
        $this->sector = $sector;

        return $this;
    }

    public function getDireccion(): ?string
    {
        return $this->direccion;
    }

    public function setDireccion(?string $direccion): self
    {
        $this->direccion = $direccion;

        return $this;
    }

    public function getCiudad(): ?string
    {
        return $this->ciudad;
    }

    public function setCiudad(?string $ciudad): self
    {
        $this->ciudad = $ciudad;

        return $this;
    }

    public function getProvincia(): ?string
    {
        return $this->provincia;
    }

    public function setProvincia(?string $provincia): self
    {
        $this->provincia = $provincia;

        return $this;
    }

    public function getPais(): ?string
    {
        return $this->pais;
    }

    public function setPais(?string $pais): self
    {
        $this->pais = $pais;

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

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(?string $email): self
    {
        $this->email = $email;

        return $this;
    }

    public function getWeb(): ?string
    {
        return $this->web;
    }

    public function setWeb(?string $web): self
    {
        $this->web = $web;

        return $this;
    }

    public function getEstadoColaboracion(): string
    {
        return $this->estadoColaboracion;
    }

    public function setEstadoColaboracion(string $estadoColaboracion): self
    {
        $this->estadoColaboracion = $estadoColaboracion;

        return $this;
    }

    public function getFechaAlta(): \DateTimeImmutable
    {
        return $this->fechaAlta;
    }

    public function setFechaAlta(\DateTimeImmutable $fechaAlta): self
    {
        $this->fechaAlta = $fechaAlta;

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
     * @return Collection<int, ContactoEmpresa>
     */
    public function getContactos(): Collection
    {
        return $this->contactos;
    }

    public function addContacto(ContactoEmpresa $contacto): self
    {
        if (!$this->contactos->contains($contacto)) {
            $this->contactos->add($contacto);
            $contacto->setEmpresa($this);
        }

        return $this;
    }

    public function removeContacto(ContactoEmpresa $contacto): self
    {
        if ($this->contactos->removeElement($contacto)) {
            if ($contacto->getEmpresa() === $this) {
                $contacto->setEmpresa(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Convenio>
     */
    public function getConvenios(): Collection
    {
        return $this->convenios;
    }

    public function addConvenio(Convenio $convenio): self
    {
        if (!$this->convenios->contains($convenio)) {
            $this->convenios->add($convenio);
            $convenio->setEmpresa($this);
        }

        return $this;
    }

    public function removeConvenio(Convenio $convenio): self
    {
        if ($this->convenios->removeElement($convenio)) {
            if ($convenio->getEmpresa() === $this) {
                $convenio->setEmpresa(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, TutorProfesional>
     */
    public function getTutoresProfesionales(): Collection
    {
        return $this->tutoresProfesionales;
    }

    public function addTutorProfesional(TutorProfesional $tutor): self
    {
        if (!$this->tutoresProfesionales->contains($tutor)) {
            $this->tutoresProfesionales->add($tutor);
            $tutor->setEmpresa($this);
        }

        return $this;
    }

    public function removeTutorProfesional(TutorProfesional $tutor): self
    {
        if ($this->tutoresProfesionales->removeElement($tutor)) {
            if ($tutor->getEmpresa() === $this) {
                $tutor->setEmpresa(null);
            }
        }

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
            $asignacion->setEmpresa($this);
        }

        return $this;
    }

    public function removeAsignacion(AsignacionPractica $asignacion): self
    {
        if ($this->asignaciones->removeElement($asignacion)) {
            if ($asignacion->getEmpresa() === $this) {
                $asignacion->setEmpresa(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, EmpresaEtiqueta>
     */
    public function getEtiquetas(): Collection
    {
        return $this->etiquetas;
    }

    public function addEtiqueta(EmpresaEtiqueta $etiqueta): self
    {
        if (!$this->etiquetas->contains($etiqueta)) {
            $this->etiquetas->add($etiqueta);
            $etiqueta->setEmpresa($this);
        }

        return $this;
    }

    public function removeEtiqueta(EmpresaEtiqueta $etiqueta): self
    {
        if ($this->etiquetas->removeElement($etiqueta)) {
            if ($etiqueta->getEmpresa() === $this) {
                $etiqueta->setEmpresa(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, EmpresaNota>
     */
    public function getNotas(): Collection
    {
        return $this->notas;
    }

    public function addNota(EmpresaNota $nota): self
    {
        if (!$this->notas->contains($nota)) {
            $this->notas->add($nota);
            $nota->setEmpresa($this);
        }

        return $this;
    }

    public function removeNota(EmpresaNota $nota): self
    {
        if ($this->notas->removeElement($nota)) {
            if ($nota->getEmpresa() === $this) {
                $nota->setEmpresa(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, EmpresaDocumento>
     */
    public function getDocumentos(): Collection
    {
        return $this->documentos;
    }

    public function addDocumento(EmpresaDocumento $documento): self
    {
        if (!$this->documentos->contains($documento)) {
            $this->documentos->add($documento);
            $documento->setEmpresa($this);
        }

        return $this;
    }

    public function removeDocumento(EmpresaDocumento $documento): self
    {
        if ($this->documentos->removeElement($documento)) {
            if ($documento->getEmpresa() === $this) {
                $documento->setEmpresa(null);
            }
        }

        return $this;
    }
}
