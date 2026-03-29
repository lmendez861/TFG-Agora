<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\HttpFoundation\File\UploadedFile;

final class DocumentStorageManager
{
    public function __construct(
        private readonly Filesystem $filesystem,
        private readonly string $storageRoot,
        private readonly string $projectDir,
    ) {
    }

    public function resolveAbsolutePath(string $relativePath): string
    {
        $basePath = str_replace('\\', '/', $this->storageRoot);
        if (!preg_match('/^(?:[A-Za-z]:)?[\/\\\\]/', $basePath)) {
            $basePath = rtrim(str_replace('\\', '/', $this->projectDir), '/') . '/' . ltrim($basePath, '/');
        }

        return rtrim($basePath, '/') . '/' . ltrim(str_replace('\\', '/', $relativePath), '/');
    }

    public function storeUploadedFile(UploadedFile $file, string $relativePath): void
    {
        $absolutePath = $this->resolveAbsolutePath($relativePath);
        $directory = dirname($absolutePath);

        if (!$this->filesystem->exists($directory)) {
            $this->filesystem->mkdir($directory, 0775);
        }

        $file->move($directory, basename($absolutePath));
    }

    public function ensureDirectory(string $relativeDirectory): void
    {
        $absolutePath = $this->resolveAbsolutePath($relativeDirectory);
        if (!$this->filesystem->exists($absolutePath)) {
            $this->filesystem->mkdir($absolutePath, 0775);
        }
    }

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
