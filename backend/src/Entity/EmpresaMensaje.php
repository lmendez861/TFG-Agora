<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\EmpresaMensajeRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: EmpresaMensajeRepository::class)]
class EmpresaMensaje
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'mensajes')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?EmpresaSolicitud $solicitud = null;

    #[ORM\Column(length: 20)]
    private string $autor;

    #[ORM\Column(type: 'text')]
    private string $texto;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getSolicitud(): ?EmpresaSolicitud
    {
        return $this->solicitud;
    }

    public function setSolicitud(EmpresaSolicitud $solicitud): self
    {
        $this->solicitud = $solicitud;
        return $this;
    }

    public function getAutor(): string
    {
        return $this->autor;
    }

    public function setAutor(string $autor): self
    {
        $this->autor = $autor;
        return $this;
    }

    public function getTexto(): string
    {
        return $this->texto;
    }

    public function setTexto(string $texto): self
    {
        $this->texto = $texto;
        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
