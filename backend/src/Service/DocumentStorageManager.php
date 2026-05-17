<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Servicio de aplicacion: concentra reglas reutilizables que no pertenecen a una sola entidad o controlador.
 * Relaciones: Conexiones principales indicadas por imports, inyeccion de dependencias o rutas del propio archivo.
 */

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

/**
 * Servicio de aplicacion: concentra reglas reutilizables que no pertenecen a una sola entidad o controlador.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
final class DocumentStorageManager
{
    /**
     * Recibe las dependencias que necesita este modulo y deja visible su punto de acoplamiento principal.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct(
        private readonly Filesystem $filesystem,
        private readonly string $storageRoot,
        private readonly string $projectDir,
    ) {
    }

    /**
     * Resume la responsabilidad de resolveAbsolutePath dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function resolveAbsolutePath(string $relativePath): string
    {
        $basePath = str_replace('\\', '/', $this->storageRoot);
        if (!preg_match('/^(?:[A-Za-z]:)?[\/\\\\]/', $basePath)) {
            $basePath = rtrim(str_replace('\\', '/', $this->projectDir), '/') . '/' . ltrim($basePath, '/');
        }

        $normalizedRelativePath = str_replace('\\', '/', $relativePath);
        if (
            $normalizedRelativePath === ''
            || str_starts_with($normalizedRelativePath, '/')
            || preg_match('/^(?:[A-Za-z]:|[\/\\\\]{2})/', $normalizedRelativePath)
            || str_contains('/' . $normalizedRelativePath . '/', '/../')
        ) {
            throw new BadRequestHttpException('La ruta del documento no es valida.');
        }

        $basePath = rtrim($basePath, '/');
        $absolutePath = $basePath . '/' . ltrim($normalizedRelativePath, '/');
        $normalizedAbsolutePath = str_replace('\\', '/', $absolutePath);

        if ($normalizedAbsolutePath !== $basePath && !str_starts_with($normalizedAbsolutePath, $basePath . '/')) {
            throw new BadRequestHttpException('La ruta del documento queda fuera del almacenamiento permitido.');
        }

        return $absolutePath;
    }

    /**
     * Resume la responsabilidad de storeUploadedFile dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function storeUploadedFile(UploadedFile $file, string $relativePath): void
    {
        $absolutePath = $this->resolveAbsolutePath($relativePath);
        $directory = dirname($absolutePath);

        if (!$this->filesystem->exists($directory)) {
            $this->filesystem->mkdir($directory, 0775);
        }

        $file->move($directory, basename($absolutePath));
    }

    /**
     * Resume la responsabilidad de ensureDirectory dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function ensureDirectory(string $relativeDirectory): void
    {
        $absolutePath = $this->resolveAbsolutePath($relativeDirectory);
        if (!$this->filesystem->exists($absolutePath)) {
            $this->filesystem->mkdir($absolutePath, 0775);
        }
    }

    /**
     * Elimina o desactiva el recurso indicado respetando el endpoint/servicio asociado.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function deleteFile(?string $relativePath): void
    {
        if ($relativePath === null || $relativePath === '') {
            return;
        }

        $absolutePath = $this->resolveAbsolutePath($relativePath);
        if ($this->filesystem->exists($absolutePath)) {
            $this->filesystem->remove($absolutePath);
        }
    }
}
