<?php

namespace App\Entity;

use App\Repository\BotEntityRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: BotEntityRepository::class)]
#[ORM\Table(name: 'bots')]
class BotEntity
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 100)]
    private ?string $nombre = null;

    #[ORM\Column(type: 'string', enumType: BotType::class)]
    private ?BotType $tipo = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $personalidad = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $modelo_asociado = null;

    #[ORM\Column(type: 'string', enumType: BotScope::class)]
    private ?BotScope $scope = null;

    #[ORM\ManyToOne(targetEntity: Usuario::class)]
    #[ORM\JoinColumn(nullable: false)]
    private ?Usuario $creador = null;

    #[ORM\Column]
    private ?bool $activo = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $fecha_creacion = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $fecha_actualizacion = null;

    #[ORM\OneToMany(mappedBy: 'bot', targetEntity: BotRespuesta::class, orphanRemoval: true)]
    private Collection $respuestas;

    #[ORM\OneToMany(mappedBy: 'bot', targetEntity: GrupoBot::class, orphanRemoval: true)]
    private Collection $gruposBots;

    #[ORM\OneToMany(mappedBy: 'bot', targetEntity: BotConfig::class, orphanRemoval: true)]
    private Collection $configuraciones;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $descripcion = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $avatar_url = null;

    public function __construct()
    {
        $this->respuestas = new ArrayCollection();
        $this->gruposBots = new ArrayCollection();
        $this->configuraciones = new ArrayCollection();
        $this->fecha_creacion = new \DateTimeImmutable();
        $this->activo = true;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getNombre(): ?string
    {
        return $this->nombre;
    }

    public function setNombre(string $nombre): static
    {
        $this->nombre = $nombre;
        return $this;
    }

    public function getTipo(): ?BotType
    {
        return $this->tipo;
    }

    public function setTipo(BotType $tipo): static
    {
        $this->tipo = $tipo;
        return $this;
    }

    public function getPersonalidad(): ?string
    {
        return $this->personalidad;
    }

    public function setPersonalidad(?string $personalidad): static
    {
        $this->personalidad = $personalidad;
        return $this;
    }

    public function getModeloAsociado(): ?string
    {
        return $this->modelo_asociado;
    }

    public function setModeloAsociado(?string $modelo_asociado): static
    {
        $this->modelo_asociado = $modelo_asociado;
        return $this;
    }

    public function getScope(): ?BotScope
    {
        return $this->scope;
    }

    public function setScope(BotScope $scope): static
    {
        $this->scope = $scope;
        return $this;
    }

    public function getCreador(): ?Usuario
    {
        return $this->creador;
    }

    public function setCreador(?Usuario $creador): static
    {
        $this->creador = $creador;
        return $this;
    }

    public function isActivo(): ?bool
    {
        return $this->activo;
    }

    public function setActivo(bool $activo): static
    {
        $this->activo = $activo;
        return $this;
    }

    public function getFechaCreacion(): ?\DateTimeImmutable
    {
        return $this->fecha_creacion;
    }

    public function setFechaCreacion(\DateTimeImmutable $fecha_creacion): static
    {
        $this->fecha_creacion = $fecha_creacion;
        return $this;
    }

    public function getFechaActualizacion(): ?\DateTimeImmutable
    {
        return $this->fecha_actualizacion;
    }

    public function setFechaActualizacion(?\DateTimeImmutable $fecha_actualizacion): static
    {
        $this->fecha_actualizacion = $fecha_actualizacion;
        return $this;
    }

    /**
     * @return Collection<int, BotRespuesta>
     */
    public function getRespuestas(): Collection
    {
        return $this->respuestas;
    }

    public function addRespuesta(BotRespuesta $respuesta): static
    {
        if (!$this->respuestas->contains($respuesta)) {
            $this->respuestas->add($respuesta);
            $respuesta->setBot($this);
        }

        return $this;
    }

    public function removeRespuesta(BotRespuesta $respuesta): static
    {
        if ($this->respuestas->removeElement($respuesta)) {
            if ($respuesta->getBot() === $this) {
                $respuesta->setBot(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, GrupoBot>
     */
    public function getGruposBots(): Collection
    {
        return $this->gruposBots;
    }

    public function addGruposBot(GrupoBot $gruposBot): static
    {
        if (!$this->gruposBots->contains($gruposBot)) {
            $this->gruposBots->add($gruposBot);
            $gruposBot->setBot($this);
        }

        return $this;
    }

    public function removeGruposBot(GrupoBot $gruposBot): static
    {
        if ($this->gruposBots->removeElement($gruposBot)) {
            if ($gruposBot->getBot() === $this) {
                $gruposBot->setBot(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, BotConfig>
     */
    public function getConfiguraciones(): Collection
    {
        return $this->configuraciones;
    }

    public function addConfiguracion(BotConfig $configuracion): static
    {
        if (!$this->configuraciones->contains($configuracion)) {
            $this->configuraciones->add($configuracion);
            $configuracion->setBot($this);
        }

        return $this;
    }

    public function removeConfiguracion(BotConfig $configuracion): static
    {
        if ($this->configuraciones->removeElement($configuracion)) {
            if ($configuracion->getBot() === $this) {
                $configuracion->setBot(null);
            }
        }

        return $this;
    }

    public function getDescripcion(): ?string
    {
        return $this->descripcion;
    }

    public function setDescripcion(?string $descripcion): static
    {
        $this->descripcion = $descripcion;
        return $this;
    }

    public function getAvatarUrl(): ?string
    {
        return $this->avatar_url;
    }

    public function setAvatarUrl(?string $avatar_url): static
    {
        $this->avatar_url = $avatar_url;
        return $this;
    }
}