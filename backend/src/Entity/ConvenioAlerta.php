<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Entidad Doctrine: define el estado persistente, relaciones y pequenas reglas del modelo de dominio.
 * Relaciones: Conecta con App/Repository/ConvenioAlertaRepository.
 */

namespace App\Entity;

use App\Repository\ConvenioAlertaRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Punto de entrada anotado por atributos Symfony/Doctrine; el atributo define como se enlaza con framework o persistencia.
 * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
 */
#[ORM\Entity(repositoryClass: ConvenioAlertaRepository::class)]
class ConvenioAlerta
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'alertas')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Convenio $convenio = null;

    #[ORM\Column(length: 255)]
    private string $mensaje;

    #[ORM\Column(length: 20)]
    private string $nivel = 'info';

    #[ORM\Column]
    private bool $activa = true;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $creadaEn;

    /**
     * Recibe las dependencias que necesita este modulo y deja visible su punto de acoplamiento principal.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct()
    {
        $this->creadaEn = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
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

    public function getMensaje(): string
    {
        return $this->mensaje;
    }

    public function setMensaje(string $mensaje): self
    {
        $this->mensaje = $mensaje;

        return $this;
    }

    public function getNivel(): string
    {
        return $this->nivel;
    }

    public function setNivel(string $nivel): self
    {
        $this->nivel = $nivel;

        return $this;
    }

    /**
     * Resume la responsabilidad de isActiva dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function isActiva(): bool
    {
        return $this->activa;
    }

    public function setActiva(bool $activa): self
    {
        $this->activa = $activa;

        return $this;
    }

    public function getCreadaEn(): \DateTimeImmutable
    {
        return $this->creadaEn;
    }

    public function setCreadaEn(\DateTimeImmutable $creadaEn): self
    {
        $this->creadaEn = $creadaEn;

        return $this;
    }
}
