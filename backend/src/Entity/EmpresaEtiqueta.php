<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Entidad Doctrine: define el estado persistente, relaciones y pequenas reglas del modelo de dominio.
 * Relaciones: Conecta con App/Repository/EmpresaEtiquetaRepository.
 */

namespace App\Entity;

use App\Repository\EmpresaEtiquetaRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Punto de entrada anotado por atributos Symfony/Doctrine; el atributo define como se enlaza con framework o persistencia.
 * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
 */
#[ORM\Entity(repositoryClass: EmpresaEtiquetaRepository::class)]
class EmpresaEtiqueta
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'etiquetas')]
    #[ORM\JoinColumn(nullable: false)]
    private ?EmpresaColaboradora $empresa = null;

    #[ORM\Column(length: 80)]
    private string $nombre;

    #[ORM\Column(length: 32, nullable: true)]
    private ?string $colorHex = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    /**
     * Recibe las dependencias que necesita este modulo y deja visible su punto de acoplamiento principal.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmpresa(): ?EmpresaColaboradora
    {
        return $this->empresa;
    }

    public function setEmpresa(EmpresaColaboradora $empresa): self
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

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): self
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    public function getColorHex(): ?string
    {
        return $this->colorHex;
    }

    public function setColorHex(?string $colorHex): self
    {
        $this->colorHex = $colorHex;

        return $this;
    }
}
