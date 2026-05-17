<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Entidad Doctrine: define el estado persistente, relaciones y pequenas reglas del modelo de dominio.
 * Relaciones: Conecta con App/Repository/EmpresaDocumentoRepository.
 */

namespace App\Entity;

use App\Repository\EmpresaDocumentoRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Punto de entrada anotado por atributos Symfony/Doctrine; el atributo define como se enlaza con framework o persistencia.
 * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
 */
#[ORM\Entity(repositoryClass: EmpresaDocumentoRepository::class)]
class EmpresaDocumento
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'documentos')]
    #[ORM\JoinColumn(nullable: false)]
    private ?EmpresaColaboradora $empresa = null;

    #[ORM\Column(length: 150)]
    private string $nombre;

    #[ORM\Column(length: 80, nullable: true)]
    private ?string $tipo = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $url = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $storagePath = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $originalFilename = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $fileContentBase64 = null;

    #[ORM\Column(length: 120, nullable: true)]
    private ?string $mimeType = null;

    #[ORM\Column(nullable: true)]
    private ?int $fileSizeBytes = null;

    #[ORM\Column(length: 40)]
    private string $storageProvider = 'external_fs';

    #[ORM\Column]
    private int $version = 1;

    #[ORM\Column]
    private bool $active = true;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $deletedAt = null;

    #[ORM\Column(length: 190, nullable: true)]
    private ?string $deletedBy = null;

    #[ORM\Column]
    private \DateTimeImmutable $uploadedAt;

    /**
     * Recibe las dependencias que necesita este modulo y deja visible su punto de acoplamiento principal.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct()
    {
        $this->uploadedAt = new \DateTimeImmutable();
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

    public function getTipo(): ?string
    {
        return $this->tipo;
    }

    public function setTipo(?string $tipo): self
    {
        $this->tipo = $tipo;

        return $this;
    }

    public function getUrl(): ?string
    {
        return $this->url;
    }

    public function setUrl(?string $url): self
    {
        $this->url = $url;

        return $this;
    }

    public function getStoragePath(): ?string
    {
        return $this->storagePath;
    }

    public function setStoragePath(?string $storagePath): self
    {
        $this->storagePath = $storagePath;

        return $this;
    }

    public function getOriginalFilename(): ?string
    {
        return $this->originalFilename;
    }

    public function setOriginalFilename(?string $originalFilename): self
    {
        $this->originalFilename = $originalFilename;

        return $this;
    }

    public function getFileContentBase64(): ?string
    {
        return $this->fileContentBase64;
    }

    public function setFileContentBase64(?string $fileContentBase64): self
    {
        $this->fileContentBase64 = $fileContentBase64;

        return $this;
    }

    public function hasEmbeddedContent(): bool
    {
        return $this->fileContentBase64 !== null && $this->fileContentBase64 !== '';
    }

    public function getDecodedFileContent(): ?string
    {
        if (!$this->hasEmbeddedContent()) {
            return null;
        }

        $decoded = base64_decode($this->fileContentBase64, true);

        return $decoded === false ? null : $decoded;
    }

    public function getMimeType(): ?string
    {
        return $this->mimeType;
    }

    public function setMimeType(?string $mimeType): self
    {
        $this->mimeType = $mimeType;

        return $this;
    }

    public function getFileSizeBytes(): ?int
    {
        return $this->fileSizeBytes;
    }

    public function setFileSizeBytes(?int $fileSizeBytes): self
    {
        $this->fileSizeBytes = $fileSizeBytes;

        return $this;
    }

    public function getStorageProvider(): string
    {
        return $this->storageProvider;
    }

    public function setStorageProvider(string $storageProvider): self
    {
        $this->storageProvider = $storageProvider;

        return $this;
    }

    public function getVersion(): int
    {
        return $this->version;
    }

    public function setVersion(int $version): self
    {
        $this->version = max(1, $version);

        return $this;
    }

    /**
     * Resume la responsabilidad de isActive dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function isActive(): bool
    {
        return $this->active;
    }

    public function setActive(bool $active): self
    {
        $this->active = $active;

        return $this;
    }

    public function getDeletedAt(): ?\DateTimeImmutable
    {
        return $this->deletedAt;
    }

    public function getDeletedBy(): ?string
    {
        return $this->deletedBy;
    }

    /**
     * Resume la responsabilidad de markDeleted dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function markDeleted(?string $deletedBy = null): self
    {
        $this->deletedAt = new \DateTimeImmutable();
        $this->deletedBy = $deletedBy;
        $this->active = false;

        return $this;
    }

    /**
     * Resume la responsabilidad de restore dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function restore(): self
    {
        $this->deletedAt = null;
        $this->deletedBy = null;
        $this->active = true;

        return $this;
    }

    public function getUploadedAt(): \DateTimeImmutable
    {
        return $this->uploadedAt;
    }

    public function setUploadedAt(\DateTimeImmutable $uploadedAt): self
    {
        $this->uploadedAt = $uploadedAt;

        return $this;
    }
}
