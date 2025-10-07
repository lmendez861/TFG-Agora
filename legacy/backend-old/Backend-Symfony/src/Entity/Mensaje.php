<?php

namespace App\Entity;

use App\Repository\MensajeRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: MensajeRepository::class)]
#[ORM\Table(name: 'mensajes')]
class Mensaje
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(type: 'bigint')]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'mensajes')]
    private ?Conversacion $conversacion = null;

    #[ORM\ManyToOne(inversedBy: 'mensajes')]
    private ?Grupo $grupo = null;

    #[ORM\ManyToOne(inversedBy: 'mensajes')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Usuario $usuario = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $contenido = null;

    #[ORM\Column(type: 'string', enumType: TipoMensaje::class)]
    private TipoMensaje $tipo = TipoMensaje::TEXTO;

    #[ORM\Column(type: 'string', enumType: AutorTipo::class)]
    private AutorTipo $autorTipo = AutorTipo::USUARIO;

    #[ORM\ManyToOne(targetEntity: BotEntity::class)]
    #[ORM\JoinColumn(nullable: true)]
    private ?BotEntity $bot = null;

    #[ORM\ManyToOne(targetEntity: Multimedia::class)]
    #[ORM\JoinColumn(nullable: true)]
    private ?Multimedia $multimedia = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $creadoAt;

    #[ORM\Column(type: 'boolean')]
    private bool $eliminado = false;

    #[ORM\OneToMany(mappedBy: 'mensaje', targetEntity: Archivo::class, orphanRemoval: true)]
    private Collection $archivos;

    public function __construct()
    {
        $this->archivos = new ArrayCollection();
        $this->creadoAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getConversacion(): ?Conversacion
    {
        return $this->conversacion;
    }

    public function setConversacion(?Conversacion $conversacion): self
    {
        $this->conversacion = $conversacion;
        return $this;
    }

    public function getGrupo(): ?Grupo
    {
        return $this->grupo;
    }

    public function setGrupo(?Grupo $grupo): self
    {
        $this->grupo = $grupo;
        return $this;
    }

    public function getUsuario(): ?Usuario
    {
        return $this->usuario;
    }

    public function setUsuario(?Usuario $usuario): self
    {
        $this->usuario = $usuario;
        return $this;
    }

    public function getContenido(): ?string
    {
        return $this->contenido;
    }

    public function setContenido(?string $contenido): self
    {
        $this->contenido = $contenido;
        return $this;
    }

    public function getTipo(): TipoMensaje
    {
        return $this->tipo;
    }

    public function setTipo(TipoMensaje $tipo): self
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

    public function isEliminado(): bool
    {
        return $this->eliminado;
    }

    public function setEliminado(bool $eliminado): self
    {
        $this->eliminado = $eliminado;
        return $this;
    }

    public function getArchivos(): Collection
    {
        return $this->archivos;
    }

    public function addArchivo(Archivo $archivo): self
    {
        if (!$this->archivos->contains($archivo)) {
            $this->archivos->add($archivo);
            $archivo->setMensaje($this);
        }

        return $this;
    }

    public function removeArchivo(Archivo $archivo): self
    {
        if ($this->archivos->removeElement($archivo)) {
            if ($archivo->getMensaje() === $this) {
                $archivo->setMensaje(null);
            }
        }

        return $this;
    }

    public function getAutorTipo(): AutorTipo
    {
        return $this->autorTipo;
    }

    public function setAutorTipo(AutorTipo $autorTipo): self
    {
        $this->autorTipo = $autorTipo;
        return $this;
    }

    public function getBot(): ?BotEntity
    {
        return $this->bot;
    }

    public function setBot(?BotEntity $bot): self
    {
        $this->bot = $bot;
        return $this;
    }

    public function getMultimedia(): ?Multimedia
    {
        return $this->multimedia;
    }

    public function setMultimedia(?Multimedia $multimedia): self
    {
        $this->multimedia = $multimedia;
        return $this;
    }
}