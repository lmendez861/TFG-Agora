<?php

namespace App\Entity;

use App\Repository\ArchivoCompartidoRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: ArchivoCompartidoRepository::class)]
#[ORM\Table(name: 'archivos_compartidos')]
class ArchivoCompartido
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['archivo:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['archivo:read', 'archivo:write'])]
    private ?string $nombre = null;

    #[ORM\Column(length: 255)]
    #[Groups(['archivo:read'])]
    private ?string $nombreArchivo = null; // Nombre real del archivo en el sistema

    #[ORM\Column(length: 255)]
    #[Groups(['archivo:read'])]
    private ?string $rutaArchivo = null;

    #[ORM\Column(length: 100)]
    #[Groups(['archivo:read'])]
    private ?string $tipoMime = null;

    #[ORM\Column(type: Types::BIGINT)]
    #[Groups(['archivo:read'])]
    private ?string $tamano = null; // En bytes

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['archivo:read', 'archivo:write'])]
    private ?string $descripcion = null;

    #[ORM\ManyToOne(inversedBy: 'archivosCompartidos')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['archivo:read'])]
    private ?Usuario $propietario = null;

    #[ORM\ManyToOne(inversedBy: 'archivosCompartidos')]
    #[Groups(['archivo:read'])]
    private ?Servidor $servidor = null;

    #[ORM\ManyToOne(inversedBy: 'archivosCompartidos')]
    #[Groups(['archivo:read'])]
    private ?Canal $canal = null;

    #[ORM\ManyToOne(targetEntity: self::class, inversedBy: 'subarchivos')]
    #[Groups(['archivo:read'])]
    private ?self $carpetaPadre = null;

    #[ORM\OneToMany(mappedBy: 'carpetaPadre', targetEntity: self::class)]
    #[Groups(['archivo:read'])]
    private Collection $subarchivos;

    #[ORM\Column]
    #[Groups(['archivo:read'])]
    private ?\DateTimeImmutable $fechaSubida = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['archivo:read'])]
    private ?\DateTimeImmutable $fechaActualizacion = null;

    #[ORM\Column]
    #[Groups(['archivo:read', 'archivo:write'])]
    private ?bool $publico = true;

    #[ORM\Column]
    #[Groups(['archivo:read', 'archivo:write'])]
    private ?bool $esCarpeta = false;

    #[ORM\ManyToMany(targetEntity: Usuario::class, inversedBy: 'archivosAcceso')]
    #[ORM\JoinTable(name: 'archivo_usuario_permisos')]
    private Collection $usuariosConAcceso;

    #[ORM\Column(type: Types::JSON, nullable: true)]
    #[Groups(['archivo:read', 'archivo:write'])]
    private ?array $metadatos = null; // Metadatos adicionales del archivo

    #[ORM\Column]
    #[Groups(['archivo:read'])]
    private ?int $numeroDescargas = 0;

    #[ORM\Column(nullable: true)]
    #[Groups(['archivo:read'])]
    private ?\DateTimeImmutable $fechaUltimoAcceso = null;

    #[ORM\OneToMany(mappedBy: 'archivo', targetEntity: ComentarioArchivo::class)]
    private Collection $comentarios;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['archivo:read'])]
    private ?string $hashArchivo = null; // Para verificar integridad

    #[ORM\Column(length: 50)]
    #[Groups(['archivo:read', 'archivo:write'])]
    private ?string $categoria = 'general';

    public function __construct()
    {
        $this->subarchivos = new ArrayCollection();
        $this->usuariosConAcceso = new ArrayCollection();
        $this->comentarios = new ArrayCollection();
        $this->fechaSubida = new \DateTimeImmutable();
        $this->publico = true;
        $this->esCarpeta = false;
        $this->numeroDescargas = 0;
        $this->categoria = 'general';
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

    public function getNombreArchivo(): ?string
    {
        return $this->nombreArchivo;
    }

    public function setNombreArchivo(string $nombreArchivo): static
    {
        $this->nombreArchivo = $nombreArchivo;
        return $this;
    }

    public function getRutaArchivo(): ?string
    {
        return $this->rutaArchivo;
    }

    public function setRutaArchivo(string $rutaArchivo): static
    {
        $this->rutaArchivo = $rutaArchivo;
        return $this;
    }

    public function getTipoMime(): ?string
    {
        return $this->tipoMime;
    }

    public function setTipoMime(string $tipoMime): static
    {
        $this->tipoMime = $tipoMime;
        return $this;
    }

    public function getTamano(): ?string
    {
        return $this->tamano;
    }

    public function setTamano(string $tamano): static
    {
        $this->tamano = $tamano;
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

    public function getPropietario(): ?Usuario
    {
        return $this->propietario;
    }

    public function setPropietario(?Usuario $propietario): static
    {
        $this->propietario = $propietario;
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

    public function getCanal(): ?Canal
    {
        return $this->canal;
    }

    public function setCanal(?Canal $canal): static
    {
        $this->canal = $canal;
        return $this;
    }

    public function getCarpetaPadre(): ?self
    {
        return $this->carpetaPadre;
    }

    public function setCarpetaPadre(?self $carpetaPadre): static
    {
        $this->carpetaPadre = $carpetaPadre;
        return $this;
    }

    /**
     * @return Collection<int, self>
     */
    public function getSubarchivos(): Collection
    {
        return $this->subarchivos;
    }

    public function addSubarchivo(self $subarchivo): static
    {
        if (!$this->subarchivos->contains($subarchivo)) {
            $this->subarchivos->add($subarchivo);
            $subarchivo->setCarpetaPadre($this);
        }

        return $this;
    }

    public function removeSubarchivo(self $subarchivo): static
    {
        if ($this->subarchivos->removeElement($subarchivo)) {
            if ($subarchivo->getCarpetaPadre() === $this) {
                $subarchivo->setCarpetaPadre(null);
            }
        }

        return $this;
    }

    public function getFechaSubida(): ?\DateTimeImmutable
    {
        return $this->fechaSubida;
    }

    public function setFechaSubida(\DateTimeImmutable $fechaSubida): static
    {
        $this->fechaSubida = $fechaSubida;
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

    public function isEsCarpeta(): ?bool
    {
        return $this->esCarpeta;
    }

    public function setEsCarpeta(bool $esCarpeta): static
    {
        $this->esCarpeta = $esCarpeta;
        return $this;
    }

    /**
     * @return Collection<int, Usuario>
     */
    public function getUsuariosConAcceso(): Collection
    {
        return $this->usuariosConAcceso;
    }

    public function addUsuariosConAcceso(Usuario $usuariosConAcceso): static
    {
        if (!$this->usuariosConAcceso->contains($usuariosConAcceso)) {
            $this->usuariosConAcceso->add($usuariosConAcceso);
        }

        return $this;
    }

    public function removeUsuariosConAcceso(Usuario $usuariosConAcceso): static
    {
        $this->usuariosConAcceso->removeElement($usuariosConAcceso);

        return $this;
    }

    public function getMetadatos(): ?array
    {
        return $this->metadatos;
    }

    public function setMetadatos(?array $metadatos): static
    {
        $this->metadatos = $metadatos;
        return $this;
    }

    public function getNumeroDescargas(): ?int
    {
        return $this->numeroDescargas;
    }

    public function setNumeroDescargas(int $numeroDescargas): static
    {
        $this->numeroDescargas = $numeroDescargas;
        return $this;
    }

    public function getFechaUltimoAcceso(): ?\DateTimeImmutable
    {
        return $this->fechaUltimoAcceso;
    }

    public function setFechaUltimoAcceso(?\DateTimeImmutable $fechaUltimoAcceso): static
    {
        $this->fechaUltimoAcceso = $fechaUltimoAcceso;
        return $this;
    }

    /**
     * @return Collection<int, ComentarioArchivo>
     */
    public function getComentarios(): Collection
    {
        return $this->comentarios;
    }

    public function addComentario(ComentarioArchivo $comentario): static
    {
        if (!$this->comentarios->contains($comentario)) {
            $this->comentarios->add($comentario);
            $comentario->setArchivo($this);
        }

        return $this;
    }

    public function removeComentario(ComentarioArchivo $comentario): static
    {
        if ($this->comentarios->removeElement($comentario)) {
            if ($comentario->getArchivo() === $this) {
                $comentario->setArchivo(null);
            }
        }

        return $this;
    }

    public function getHashArchivo(): ?string
    {
        return $this->hashArchivo;
    }

    public function setHashArchivo(?string $hashArchivo): static
    {
        $this->hashArchivo = $hashArchivo;
        return $this;
    }

    public function getCategoria(): ?string
    {
        return $this->categoria;
    }

    public function setCategoria(string $categoria): static
    {
        // Validar categorías permitidas
        $categoriasPermitidas = [
            'general', 'documentos', 'imagenes', 'videos', 'audio', 
            'archivos', 'proyectos', 'recursos', 'backup'
        ];
        
        if (!in_array($categoria, $categoriasPermitidas)) {
            throw new \InvalidArgumentException("Categoría no válida: $categoria");
        }
        
        $this->categoria = $categoria;
        return $this;
    }

    // ===== MÉTODOS HELPER =====

    public function getTamanoHumano(): string
    {
        $bytes = (int) $this->tamano;
        $sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        if ($bytes === 0) return '0 B';
        
        $i = floor(log($bytes) / log(1024));
        return round($bytes / (1024 ** $i), 2) . ' ' . $sizes[$i];
    }

    public function getExtension(): string
    {
        if ($this->esCarpeta) {
            return 'folder';
        }
        
        return strtolower(pathinfo($this->nombre, PATHINFO_EXTENSION));
    }

    public function getIcono(): string
    {
        if ($this->esCarpeta) {
            return 'folder';
        }

        $extension = $this->getExtension();
        
        return match (true) {
            in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']) => 'image',
            in_array($extension, ['mp4', 'avi', 'mkv', 'mov', 'wmv']) => 'video',
            in_array($extension, ['mp3', 'wav', 'flac', 'ogg', 'aac']) => 'music',
            in_array($extension, ['pdf']) => 'file-text',
            in_array($extension, ['doc', 'docx', 'odt']) => 'file-text',
            in_array($extension, ['xls', 'xlsx', 'ods']) => 'file-spreadsheet',
            in_array($extension, ['ppt', 'pptx', 'odp']) => 'presentation',
            in_array($extension, ['zip', 'rar', '7z', 'tar', 'gz']) => 'archive',
            in_array($extension, ['html', 'css', 'js', 'php', 'py', 'java', 'cpp']) => 'code',
            default => 'file'
        };
    }

    public function esImagen(): bool
    {
        return str_starts_with($this->tipoMime, 'image/');
    }

    public function esVideo(): bool
    {
        return str_starts_with($this->tipoMime, 'video/');
    }

    public function esAudio(): bool
    {
        return str_starts_with($this->tipoMime, 'audio/');
    }

    public function esDocumento(): bool
    {
        return in_array($this->tipoMime, [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ]);
    }

    public function tieneAcceso(Usuario $usuario): bool
    {
        // El propietario siempre tiene acceso
        if ($this->propietario === $usuario) {
            return true;
        }

        // Si es público, todos tienen acceso
        if ($this->publico) {
            return true;
        }

        // Verificar acceso específico
        if ($this->usuariosConAcceso->contains($usuario)) {
            return true;
        }

        // Verificar permisos del servidor/canal
        if ($this->servidor && $this->servidor->esMiembro($usuario)) {
            return true;
        }

        if ($this->canal && $this->canal->tienePermisos($usuario)) {
            return true;
        }

        return false;
    }

    public function puedeEditar(Usuario $usuario): bool
    {
        // Solo el propietario puede editar
        if ($this->propietario === $usuario) {
            return true;
        }

        // Administradores del servidor pueden editar
        if ($this->servidor && $this->servidor->esAdministrador($usuario)) {
            return true;
        }

        return false;
    }

    public function incrementarDescargas(): void
    {
        $this->numeroDescargas++;
        $this->fechaUltimoAcceso = new \DateTimeImmutable();
    }

    public function getUrl(): string
    {
        return '/api/archivos/' . $this->id . '/descargar';
    }

    public function getUrlVisualizacion(): ?string
    {
        if ($this->esImagen() || $this->esVideo() || $this->esAudio()) {
            return '/uploads/archivos/' . $this->rutaArchivo;
        }

        return null;
    }

    public function getRutaCompleta(): string
    {
        $ruta = [];
        $actual = $this;
        
        while ($actual) {
            array_unshift($ruta, $actual->getNombre());
            $actual = $actual->getCarpetaPadre();
        }
        
        return implode('/', $ruta);
    }

    public function getEspacioUtilizado(): int
    {
        if (!$this->esCarpeta) {
            return (int) $this->tamano;
        }

        $total = 0;
        foreach ($this->subarchivos as $subarchivo) {
            $total += $subarchivo->getEspacioUtilizado();
        }

        return $total;
    }

    public function __toString(): string
    {
        return $this->nombre;
    }
}