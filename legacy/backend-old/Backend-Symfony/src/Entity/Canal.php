<?php

namespace App\Entity;

use App\Repository\CanalRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: CanalRepository::class)]
#[ORM\Table(name: 'canales')]
class Canal
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['canal:read', 'servidor:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['canal:read', 'canal:write', 'servidor:read'])]
    private ?string $nombre = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['canal:read', 'canal:write'])]
    private ?string $descripcion = null;

    #[ORM\Column(length: 50)]
    #[Groups(['canal:read', 'canal:write'])]
    private ?string $tipo = null; // 'texto', 'voz', 'video', 'categoria'

    #[ORM\ManyToOne(inversedBy: 'canales')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['canal:read'])]
    private ?Servidor $servidor = null;

    #[ORM\ManyToOne(targetEntity: self::class, inversedBy: 'subcanales')]
    #[Groups(['canal:read'])]
    private ?self $canalPadre = null;

    #[ORM\OneToMany(mappedBy: 'canalPadre', targetEntity: self::class)]
    #[Groups(['canal:read'])]
    private Collection $subcanales;

    #[ORM\OneToMany(mappedBy: 'canal', targetEntity: Mensaje::class)]
    private Collection $mensajes;

    #[ORM\Column]
    #[Groups(['canal:read', 'canal:write'])]
    private ?int $posicion = null;

    #[ORM\Column]
    #[Groups(['canal:read'])]
    private ?\DateTimeImmutable $fechaCreacion = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['canal:read'])]
    private ?\DateTimeImmutable $fechaActualizacion = null;

    #[ORM\Column]
    #[Groups(['canal:read', 'canal:write'])]
    private ?bool $privado = false;

    #[ORM\Column(type: Types::JSON, nullable: true)]
    #[Groups(['canal:read', 'canal:write'])]
    private ?array $configuracion = null; // Configuraciones específicas del canal

    #[ORM\ManyToMany(targetEntity: Usuario::class, inversedBy: 'canalesPermitidos')]
    #[ORM\JoinTable(name: 'canal_usuario_permisos')]
    private Collection $usuariosPermitidos;

    #[ORM\OneToMany(mappedBy: 'canal', targetEntity: LlamadaVideo::class)]
    private Collection $llamadasVideo;

    public function __construct()
    {
        $this->subcanales = new ArrayCollection();
        $this->mensajes = new ArrayCollection();
        $this->usuariosPermitidos = new ArrayCollection();
        $this->llamadasVideo = new ArrayCollection();
        $this->fechaCreacion = new \DateTimeImmutable();
        $this->posicion = 0;
        $this->privado = false;
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

    public function getDescripcion(): ?string
    {
        return $this->descripcion;
    }

    public function setDescripcion(?string $descripcion): static
    {
        $this->descripcion = $descripcion;
        return $this;
    }

    public function getTipo(): ?string
    {
        return $this->tipo;
    }

    public function setTipo(string $tipo): static
    {
        // Validar tipos permitidos
        $tiposPermitidos = ['texto', 'voz', 'video', 'categoria', 'anuncios', 'general'];
        if (!in_array($tipo, $tiposPermitidos)) {
            throw new \InvalidArgumentException("Tipo de canal no válido: $tipo");
        }
        
        $this->tipo = $tipo;
        return $this;
    }

    public function getServidor(): ?Servidor
    {
        return $this->servidor;
    }

    public function setServidor(?Servidor $servidor): static
    {
        $this->servidor = $servidor;
        return $this;
    }

    public function getCanalPadre(): ?self
    {
        return $this->canalPadre;
    }

    public function setCanalPadre(?self $canalPadre): static
    {
        $this->canalPadre = $canalPadre;
        return $this;
    }

    /**
     * @return Collection<int, self>
     */
    public function getSubcanales(): Collection
    {
        return $this->subcanales;
    }

    public function addSubcanale(self $subcanale): static
    {
        if (!$this->subcanales->contains($subcanale)) {
            $this->subcanales->add($subcanale);
            $subcanale->setCanalPadre($this);
        }

        return $this;
    }

    public function removeSubcanale(self $subcanale): static
    {
        if ($this->subcanales->removeElement($subcanale)) {
            if ($subcanale->getCanalPadre() === $this) {
                $subcanale->setCanalPadre(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Mensaje>
     */
    public function getMensajes(): Collection
    {
        return $this->mensajes;
    }

    public function addMensaje(Mensaje $mensaje): static
    {
        if (!$this->mensajes->contains($mensaje)) {
            $this->mensajes->add($mensaje);
            $mensaje->setCanal($this);
        }

        return $this;
    }

    public function removeMensaje(Mensaje $mensaje): static
    {
        if ($this->mensajes->removeElement($mensaje)) {
            if ($mensaje->getCanal() === $this) {
                $mensaje->setCanal(null);
            }
        }

        return $this;
    }

    public function getPosicion(): ?int
    {
        return $this->posicion;
    }

    public function setPosicion(int $posicion): static
    {
        $this->posicion = $posicion;
        return $this;
    }

    public function getFechaCreacion(): ?\DateTimeImmutable
    {
        return $this->fechaCreacion;
    }

    public function setFechaCreacion(\DateTimeImmutable $fechaCreacion): static
    {
        $this->fechaCreacion = $fechaCreacion;
        return $this;
    }

    public function getFechaActualizacion(): ?\DateTimeImmutable
    {
        return $this->fechaActualizacion;
    }

    public function setFechaActualizacion(?\DateTimeImmutable $fechaActualizacion): static
    {
        $this->fechaActualizacion = $fechaActualizacion;
        return $this;
    }

    public function isPrivado(): ?bool
    {
        return $this->privado;
    }

    public function setPrivado(bool $privado): static
    {
        $this->privado = $privado;
        return $this;
    }

    public function getConfiguracion(): ?array
    {
        return $this->configuracion;
    }

    public function setConfiguracion(?array $configuracion): static
    {
        $this->configuracion = $configuracion;
        return $this;
    }

    /**
     * @return Collection<int, Usuario>
     */
    public function getUsuariosPermitidos(): Collection
    {
        return $this->usuariosPermitidos;
    }

    public function addUsuariosPermitido(Usuario $usuariosPermitido): static
    {
        if (!$this->usuariosPermitidos->contains($usuariosPermitido)) {
            $this->usuariosPermitidos->add($usuariosPermitido);
        }

        return $this;
    }

    public function removeUsuariosPermitido(Usuario $usuariosPermitido): static
    {
        $this->usuariosPermitidos->removeElement($usuariosPermitido);

        return $this;
    }

    /**
     * @return Collection<int, LlamadaVideo>
     */
    public function getLlamadasVideo(): Collection
    {
        return $this->llamadasVideo;
    }

    public function addLlamadasVideo(LlamadaVideo $llamadasVideo): static
    {
        if (!$this->llamadasVideo->contains($llamadasVideo)) {
            $this->llamadasVideo->add($llamadasVideo);
            $llamadasVideo->setCanal($this);
        }

        return $this;
    }

    public function removeLlamadasVideo(LlamadaVideo $llamadasVideo): static
    {
        if ($this->llamadasVideo->removeElement($llamadasVideo)) {
            if ($llamadasVideo->getCanal() === $this) {
                $llamadasVideo->setCanal(null);
            }
        }

        return $this;
    }

    // ===== MÉTODOS HELPER =====

    public function esCategoria(): bool
    {
        return $this->tipo === 'categoria';
    }

    public function esTexto(): bool
    {
        return $this->tipo === 'texto';
    }

    public function esVoz(): bool
    {
        return $this->tipo === 'voz';
    }

    public function esVideo(): bool
    {
        return $this->tipo === 'video';
    }

    public function tienePermisos(Usuario $usuario): bool
    {
        if (!$this->privado) {
            return true;
        }
        
        return $this->usuariosPermitidos->contains($usuario) || 
               $this->servidor->esAdministrador($usuario) ||
               $this->servidor->esPropietario($usuario);
    }

    public function getIcono(): string
    {
        return match ($this->tipo) {
            'texto' => 'hash',
            'voz' => 'volume-2',
            'video' => 'video',
            'categoria' => 'folder',
            'anuncios' => 'megaphone',
            default => 'hash'
        };
    }

    public function getUltimoMensaje(): ?Mensaje
    {
        $ultimoMensaje = $this->mensajes->last();
        return $ultimoMensaje ?: null;
    }

    public function getNumeroMensajes(): int
    {
        return $this->mensajes->count();
    }

    public function getMensajesRecientes(int $limite = 50): array
    {
        $mensajes = $this->mensajes->toArray();
        usort($mensajes, fn($a, $b) => $b->getFechaCreacion() <=> $a->getFechaCreacion());
        
        return array_slice($mensajes, 0, $limite);
    }

    public function __toString(): string
    {
        return sprintf('%s (%s)', $this->nombre, $this->tipo);
    }
}