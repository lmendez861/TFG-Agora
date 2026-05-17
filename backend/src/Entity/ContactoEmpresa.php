<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Entidad Doctrine: define el estado persistente, relaciones y pequenas reglas del modelo de dominio.
 * Relaciones: Conecta con App/Repository/ContactoEmpresaRepository.
 */

namespace App\Entity;

use App\Repository\ContactoEmpresaRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Punto de entrada anotado por atributos Symfony/Doctrine; el atributo define como se enlaza con framework o persistencia.
 * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
 */
#[ORM\Entity(repositoryClass: ContactoEmpresaRepository::class)]
class ContactoEmpresa
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'contactos')]
    #[ORM\JoinColumn(nullable: false)]
    private ?EmpresaColaboradora $empresa = null;

    #[ORM\Column(length: 150)]
    private string $nombre;

    #[ORM\Column(length: 120, nullable: true)]
    private ?string $cargo = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $telefono = null;

    #[ORM\Column(length: 150, nullable: true)]
    private ?string $email = null;

    #[ORM\Column]
    private bool $esTutorProfesional = false;

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

    public function getCargo(): ?string
    {
        return $this->cargo;
    }

    public function setCargo(?string $cargo): self
    {
        $this->cargo = $cargo;

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

    /**
     * Resume la responsabilidad de isTutorProfesional dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function isTutorProfesional(): bool
    {
        return $this->esTutorProfesional;
    }

    public function setEsTutorProfesional(bool $esTutorProfesional): self
    {
        $this->esTutorProfesional = $esTutorProfesional;

        return $this;
    }
}
