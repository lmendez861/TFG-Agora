<?php

namespace App\Entity;

use App\Repository\ConvenioDocumentoRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ConvenioDocumentoRepository::class)]
class ConvenioDocumento
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'documentos')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Convenio $convenio = null;

    #[ORM\Column(length: 150)]
    private string $nombre;

    #[ORM\Column(length: 60, nullable: true)]
    private ?string $tipo = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $url = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $storagePath = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $originalFilename = null;

    #[ORM\Column(length: 40)]
    private string $storageProvider = 'external_fs';

    #[ORM\Column]
    private int $version = 1;

    #[ORM\Column]
    private bool $active = true;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $deletedAt = null;

    #[ORM\Column(length: 190, nullable: true)]
    private ?string $deletedBy = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $uploadedAt;

    public function __construct()
    {
        $this->uploadedAt = new \DateTimeImmutable();
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

    public function markDeleted(?string $deletedBy = null): self
    {
        $this->deletedAt = new \DateTimeImmutable();
        $this->deletedBy = $deletedBy;
        $this->active = false;

        return $this;
    }

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
