<?php

namespace App\Entity;

use App\Repository\ServidorRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: ServidorRepository::class)]
#[ORM\Table(name: 'servidores')]
class Servidor
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['servidor:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['servidor:read', 'servidor:write'])]
    private ?string $nombre = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['servidor:read', 'servidor:write'])]
    private ?string $descripcion = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['servidor:read', 'servidor:write'])]
    private ?string $icono = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['servidor:read', 'servidor:write'])]
    private ?string $banner = null;

    #[ORM\ManyToOne(inversedBy: 'servidoresPropios')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['servidor:read'])]
    private ?Usuario $propietario = null;

    #[ORM\OneToMany(mappedBy: 'servidor', targetEntity: Canal::class, cascade: ['persist', 'remove'])]
    #[Groups(['servidor:read'])]
    private Collection $canales;

    #[ORM\ManyToMany(targetEntity: Usuario::class, inversedBy: 'servidores')]
    #[ORM\JoinTable(name: 'servidor_miembros')]
    private Collection $miembros;

    #[ORM\OneToMany(mappedBy: 'servidor', targetEntity: RolServidor::class, cascade: ['persist', 'remove'])]
    private Collection $roles;

    #[ORM\Column]
    #[Groups(['servidor:read'])]
    private ?\DateTimeImmutable $fechaCreacion = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['servidor:read'])]
    private ?\DateTimeImmutable $fechaActualizacion = null;

    #[ORM\Column]
    #[Groups(['servidor:read', 'servidor:write'])]
    private ?bool $publico = true;

    #[ORM\Column(type: Types::JSON, nullable: true)]
    #[Groups(['servidor:read', 'servidor:write'])]
    private ?array $configuracion = null;

    #[ORM\Column]
    #[Groups(['servidor:read'])]
    private ?int $numeroMiembros = 0;

    #[ORM\Column(nullable: true)]
    #[Groups(['servidor:read', 'servidor:write'])]
    private ?int $limiteMembers = null;

    #[ORM\OneToMany(mappedBy: 'servidor', targetEntity: InvitacionServidor::class)]
    private Collection $invitaciones;

    #[ORM\OneToMany(mappedBy: 'servidor', targetEntity: ArchivoCompartido::class)]
    private Collection $archivosCompartidos;

    public function __construct()
    {
        $this->canales = new ArrayCollection();
        $this->miembros = new ArrayCollection();
        $this->roles = new ArrayCollection();
        $this->invitaciones = new ArrayCollection();
        $this->archivosCompartidos = new ArrayCollection();
        $this->fechaCreacion = new \DateTimeImmutable();
        $this->publico = true;
        $this->numeroMiembros = 0;
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

    public function getIcono(): ?string
    {
        return $this->icono;
    }

    public function setIcono(?string $icono): static
    {
        $this->icono = $icono;
        return $this;
    }

    public function getBanner(): ?string
    {
        return $this->banner;
    }

    public function setBanner(?string $banner): static
    {
        $this->banner = $banner;
        return $this;
    }

    public function getPropietario(): ?Usuario
    {
        return $this->propietario;
    }

    public function setPropietario(?Usuario $propietario): static
    {
        $this->propietario = $propietario;
        return $this;
    }

    /**
     * @return Collection<int, Canal>
     */
    public function getCanales(): Collection
    {
        return $this->canales;
    }

    public function addCanale(Canal $canale): static
    {
        if (!$this->canales->contains($canale)) {
            $this->canales->add($canale);
            $canale->setServidor($this);
        }

        return $this;
    }

    public function removeCanale(Canal $canale): static
    {
        if ($this->canales->removeElement($canale)) {
            if ($canale->getServidor() === $this) {
                $canale->setServidor(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Usuario>
     */
    public function getMiembros(): Collection
    {
        return $this->miembros;
    }

    public function addMiembro(Usuario $miembro): static
    {
        if (!$this->miembros->contains($miembro)) {
            $this->miembros->add($miembro);
            $this->numeroMiembros = $this->miembros->count();
        }

        return $this;
    }

    public function removeMiembro(Usuario $miembro): static
    {
        if ($this->miembros->removeElement($miembro)) {
            $this->numeroMiembros = $this->miembros->count();
        }

        return $this;
    }

    /**
     * @return Collection<int, RolServidor>
     */
    public function getRoles(): Collection
    {
        return $this->roles;
    }

    public function addRole(RolServidor $role): static
    {
        if (!$this->roles->contains($role)) {
            $this->roles->add($role);
            $role->setServidor($this);
        }

        return $this;
    }

    public function removeRole(RolServidor $role): static
    {
        if ($this->roles->removeElement($role)) {
            if ($role->getServidor() === $this) {
                $role->setServidor(null);
            }
        }

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

    public function isPublico(): ?bool
    {
        return $this->publico;
    }

    public function setPublico(bool $publico): static
    {
        $this->publico = $publico;
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

    public function getNumeroMiembros(): ?int
    {
        return $this->numeroMiembros;
    }

    public function setNumeroMiembros(int $numeroMiembros): static
    {
        $this->numeroMiembros = $numeroMiembros;
        return $this;
    }

    public function getLimiteMembers(): ?int
    {
        return $this->limiteMembers;
    }

    public function setLimiteMembers(?int $limiteMembers): static
    {
        $this->limiteMembers = $limiteMembers;
        return $this;
    }

    /**
     * @return Collection<int, InvitacionServidor>
     */
    public function getInvitaciones(): Collection
    {
        return $this->invitaciones;
    }

    public function addInvitacione(InvitacionServidor $invitacione): static
    {
        if (!$this->invitaciones->contains($invitacione)) {
            $this->invitaciones->add($invitacione);
            $invitacione->setServidor($this);
        }

        return $this;
    }

    public function removeInvitacione(InvitacionServidor $invitacione): static
    {
        if ($this->invitaciones->removeElement($invitacione)) {
            if ($invitacione->getServidor() === $this) {
                $invitacione->setServidor(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, ArchivoCompartido>
     */
    public function getArchivosCompartidos(): Collection
    {
        return $this->archivosCompartidos;
    }

    public function addArchivosCompartido(ArchivoCompartido $archivosCompartido): static
    {
        if (!$this->archivosCompartidos->contains($archivosCompartido)) {
            $this->archivosCompartidos->add($archivosCompartido);
            $archivosCompartido->setServidor($this);
        }

        return $this;
    }

    public function removeArchivosCompartido(ArchivoCompartido $archivosCompartido): static
    {
        if ($this->archivosCompartidos->removeElement($archivosCompartido)) {
            if ($archivosCompartido->getServidor() === $this) {
                $archivosCompartido->setServidor(null);
            }
        }

        return $this;
    }

    // ===== MÉTODOS HELPER =====

    public function esPropietario(Usuario $usuario): bool
    {
        return $this->propietario === $usuario;
    }

    public function esAdministrador(Usuario $usuario): bool
    {
        if ($this->esPropietario($usuario)) {
            return true;
        }

        foreach ($this->roles as $rol) {
            if ($rol->tienePermiso('ADMIN') && $rol->getUsuarios()->contains($usuario)) {
                return true;
            }
        }

        return false;
    }

    public function esMiembro(Usuario $usuario): bool
    {
        return $this->miembros->contains($usuario) || $this->esPropietario($usuario);
    }

    public function puedeUnirse(): bool
    {
        if ($this->limiteMembers === null) {
            return true;
        }

        return $this->numeroMiembros < $this->limiteMembers;
    }

    public function getCanalGeneral(): ?Canal
    {
        foreach ($this->canales as $canal) {
            if ($canal->getNombre() === 'general' && $canal->getTipo() === 'texto') {
                return $canal;
            }
        }

        return $this->canales->first() ?: null;
    }

    public function getCanalesPorTipo(string $tipo): array
    {
        return $this->canales->filter(fn(Canal $canal) => $canal->getTipo() === $tipo)->toArray();
    }

    public function getCanalTexto(): array
    {
        return $this->getCanalesPorTipo('texto');
    }

    public function getCanalesVoz(): array
    {
        return $this->getCanalesPorTipo('voz');
    }

    public function getCanalesVideo(): array
    {
        return $this->getCanalesPorTipo('video');
    }

    public function getCategorias(): array
    {
        return $this->getCanalesPorTipo('categoria');
    }

    public function getCanalesOrdenados(): array
    {
        $canales = $this->canales->toArray();
        usort($canales, fn(Canal $a, Canal $b) => $a->getPosicion() <=> $b->getPosicion());
        return $canales;
    }

    public function crearCanalesDefecto(): void
    {
        // Crear canal general por defecto
        $canalGeneral = new Canal();
        $canalGeneral->setNombre('general')
                    ->setTipo('texto')
                    ->setDescripcion('Canal general del servidor')
                    ->setPosicion(0);
        
        $this->addCanale($canalGeneral);

        // Crear canal de voz por defecto
        $canalVoz = new Canal();
        $canalVoz->setNombre('Sala General')
                ->setTipo('voz')
                ->setDescripcion('Sala de voz general')
                ->setPosicion(1);
        
        $this->addCanale($canalVoz);
    }

    public function getIconoUrl(): string
    {
        if ($this->icono) {
            return '/uploads/servidores/iconos/' . $this->icono;
        }

        // Generar icono por defecto basado en el nombre
        return $this->generateDefaultIcon();
    }

    public function getBannerUrl(): ?string
    {
        if ($this->banner) {
            return '/uploads/servidores/banners/' . $this->banner;
        }

        return null;
    }

    private function generateDefaultIcon(): string
    {
        $initials = strtoupper(substr($this->nombre, 0, 2));
        return "data:image/svg+xml;base64," . base64_encode(
            "<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>" .
            "<rect width='64' height='64' fill='#667eea' rx='50%'/>" .
            "<text x='32' y='40' text-anchor='middle' fill='white' font-size='24' font-weight='bold'>{$initials}</text>" .
            "</svg>"
        );
    }

    public function getEstadisticas(): array
    {
        return [
            'miembros' => $this->numeroMiembros,
            'canales' => $this->canales->count(),
            'canales_texto' => count($this->getCanalTexto()),
            'canales_voz' => count($this->getCanalesVoz()),
            'mensajes_recientes' => $this->contarMensajesRecientes(),
            'activo_desde' => $this->fechaCreacion->format('Y-m-d'),
        ];
    }

    private function contarMensajesRecientes(): int
    {
        $hace24h = new \DateTimeImmutable('-24 hours');
        $count = 0;

        foreach ($this->canales as $canal) {
            foreach ($canal->getMensajes() as $mensaje) {
                if ($mensaje->getFechaCreacion() >= $hace24h) {
                    $count++;
                }
            }
        }

        return $count;
    }

    public function __toString(): string
    {
        return $this->nombre;
    }
}