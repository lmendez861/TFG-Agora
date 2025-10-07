<?php

namespace App\Entity;

use App\Repository\ConversacionRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ConversacionRepository::class)]
#[ORM\Table(name: 'conversaciones')]
class Conversacion
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(type: 'string', enumType: TipoConversacion::class)]
    private TipoConversacion $tipo;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $creadoAt;

    #[ORM\OneToMany(mappedBy: 'conversacion', targetEntity: Mensaje::class)]
    private Collection $mensajes;

    public function __construct()
    {
        $this->mensajes = new ArrayCollection();
        $this->creadoAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTipo(): TipoConversacion
    {
        return $this->tipo;
    }

    public function setTipo(TipoConversacion $tipo): self
    {
        $this->tipo = $tipo;
        return $this;
    }

    public function getCreadoAt(): \DateTimeInterface
    {
        return $this->creadoAt;
    }

    public function setCreadoAt(\DateTimeInterface $creadoAt): self
    {
        $this->creadoAt = $creadoAt;
        return $this;
    }

    public function getMensajes(): Collection
    {
        return $this->mensajes;
    }

    public function addMensaje(Mensaje $mensaje): self
    {
        if (!$this->mensajes->contains($mensaje)) {
            $this->mensajes->add($mensaje);
            $mensaje->setConversacion($this);
        }

        return $this;
    }

    public function removeMensaje(Mensaje $mensaje): self
    {
        if ($this->mensajes->removeElement($mensaje)) {
            if ($mensaje->getConversacion() === $this) {
                $mensaje->setConversacion(null);
            }
        }

        return $this;
    }
}

enum TipoConversacion: string
{
    case PRIVADO = 'privado';
    case GRUPO = 'grupo';
}