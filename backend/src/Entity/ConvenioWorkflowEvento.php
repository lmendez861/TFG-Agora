<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Entidad Doctrine: define el estado persistente, relaciones y pequenas reglas del modelo de dominio.
 * Relaciones: Conecta con App/Repository/ConvenioWorkflowEventoRepository.
 */

namespace App\Entity;

use App\Repository\ConvenioWorkflowEventoRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Punto de entrada anotado por atributos Symfony/Doctrine; el atributo define como se enlaza con framework o persistencia.
 * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
 */
#[ORM\Entity(repositoryClass: ConvenioWorkflowEventoRepository::class)]
class ConvenioWorkflowEvento
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'workflowEventos')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Convenio $convenio = null;

    #[ORM\Column(length: 40)]
    private string $estado;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $comentario = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $registradoEn;

    /**
     * Recibe las dependencias que necesita este modulo y deja visible su punto de acoplamiento principal.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct()
    {
        $this->registradoEn = new \DateTimeImmutable();
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

    public function getEstado(): string
    {
        return $this->estado;
    }

    public function setEstado(string $estado): self
    {
        $this->estado = $estado;

        return $this;
    }

    public function getComentario(): ?string
    {
        return $this->comentario;
    }

    public function setComentario(?string $comentario): self
    {
        $this->comentario = $comentario;

        return $this;
    }

    public function getRegistradoEn(): \DateTimeImmutable
    {
        return $this->registradoEn;
    }

    public function setRegistradoEn(\DateTimeImmutable $registradoEn): self
    {
        $this->registradoEn = $registradoEn;

        return $this;
    }
}
