<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\AsignacionPractica;
use App\Entity\Convenio;
use App\Entity\ConvenioDocumento;
use App\Entity\EmpresaColaboradora;
use App\Entity\EmpresaDocumento;
use App\Entity\EmpresaMensaje;
use App\Entity\EmpresaSolicitud;
use App\Entity\Estudiante;
use App\Service\PublicAccessManager;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/monitor', name: 'api_monitor_')]
#[IsGranted('ROLE_API')]
final class MonitorController extends AbstractController
{
    public function __construct(
        private readonly KernelInterface $kernel,
        private readonly PublicAccessManager $publicAccessManager,
    )
    {
    }

    #[Route('', name: 'overview', methods: ['GET'])]
    public function overview(EntityManagerInterface $entityManager): JsonResponse
    {
        return $this->json([
            'generatedAt' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            'environment' => [
                'appEnv' => $this->kernel->getEnvironment(),
                'debug' => $this->kernel->isDebug(),
                'phpVersion' => PHP_VERSION,
                'timezone' => date_default_timezone_get(),
            ],
            'services' => $this->buildServicesSnapshot(),
            'metrics' => $this->buildMetricsSnapshot($entityManager),
            'activity' => $this->buildActivitySnapshot($entityManager),
            'logs' => $this->buildLogSnapshot(),
            'tests' => $this->buildTestSnapshot(),
            'documents' => $this->buildDocumentSnapshot($entityManager),
        ], Response::HTTP_OK);
    }

    private function buildServicesSnapshot(): array
    {
        $projectDir = $this->kernel->getProjectDir();
        $panelBuild = is_file($projectDir . '/public/app/index.html');
        $portalBuild = is_file($projectDir . '/public/externo/index.html');
        $frontendTests = $this->countFiles(
            $this->frontendAppDir() . '/tests',
            static fn (string $path): bool => str_ends_with($path, '.test.ts')
        );
        $publicAccess = $this->publicAccessManager->getSnapshot();

        return [
            [
                'id' => 'api',
                'name' => 'API Symfony',
                'status' => 'healthy',
                'detail' => 'Endpoint autenticado y operativo para supervision interna.',
                'target' => '/api/monitor',
            ],
            [
                'id' => 'panel',
                'name' => 'Panel interno React',
                'status' => $panelBuild ? 'healthy' : 'warning',
                'detail' => $panelBuild
                    ? 'Build del panel disponible bajo /app.'
                    : 'No se ha generado aun la build del panel para backend/public/app.',
                'target' => '/app',
            ],
            [
                'id' => 'portal',
                'name' => 'Portal externo',
                'status' => $portalBuild ? 'healthy' : 'warning',
                'detail' => $portalBuild
                    ? 'Build del portal disponible bajo /externo.'
                    : 'No se ha generado aun la build del portal para backend/public/externo.',
                'target' => '/externo',
            ],
            [
                'id' => 'public-access',
                'name' => 'Acceso externo',
                'status' => $publicAccess['status'] === 'active' ? 'healthy' : 'warning',
                'detail' => $publicAccess['status'] === 'active'
                    ? sprintf('Tunel publico operativo en %s.', $publicAccess['publicUrl'])
                    : $publicAccess['detail'],
                'target' => $publicAccess['publicUrl'] ?? $publicAccess['targetUrl'],
            ],
            [
                'id' => 'tests',
                'name' => 'Supervision automatizada',
                'status' => $frontendTests > 0 ? 'healthy' : 'warning',
                'detail' => $frontendTests > 0
                    ? 'Hay suites registradas para backend y frontend.'
                    : 'Solo se han detectado pruebas backend; falta cobertura frontend.',
                'target' => null,
            ],
        ];
    }

    private function buildMetricsSnapshot(EntityManagerInterface $entityManager): array
    {
        $empresaRepository = $entityManager->getRepository(EmpresaColaboradora::class);
        $convenioRepository = $entityManager->getRepository(Convenio::class);
        $estudianteRepository = $entityManager->getRepository(Estudiante::class);
        $asignacionRepository = $entityManager->getRepository(AsignacionPractica::class);
        $solicitudRepository = $entityManager->getRepository(EmpresaSolicitud::class);
        $empresaDocumentoRepository = $entityManager->getRepository(EmpresaDocumento::class);
        $convenioDocumentoRepository = $entityManager->getRepository(ConvenioDocumento::class);

        $pendingSolicitudes = $solicitudRepository->count(['estado' => EmpresaSolicitud::ESTADO_PENDIENTE])
            + $solicitudRepository->count(['estado' => EmpresaSolicitud::ESTADO_EMAIL_VERIFICADO]);

        return [
            [
                'id' => 'empresas',
                'label' => 'Empresas',
                'value' => $empresaRepository->count([]),
                'hint' => 'Empresas colaboradoras disponibles en la base de datos.',
            ],
            [
                'id' => 'convenios',
                'label' => 'Convenios',
                'value' => $convenioRepository->count([]),
                'hint' => 'Convenios con workflow y documentos asociados.',
            ],
            [
                'id' => 'estudiantes',
                'label' => 'Estudiantes',
                'value' => $estudianteRepository->count([]),
                'hint' => 'Estudiantes listados en el panel.',
            ],
            [
                'id' => 'asignaciones',
                'label' => 'Asignaciones',
                'value' => $asignacionRepository->count([]),
                'hint' => 'Asignaciones de practicas registradas.',
            ],
            [
                'id' => 'solicitudes',
                'label' => 'Solicitudes activas',
                'value' => $pendingSolicitudes,
                'hint' => 'Solicitudes de empresa pendientes o verificadas por email.',
            ],
            [
                'id' => 'documentos',
                'label' => 'Documentos',
                'value' => $empresaDocumentoRepository->count([]) + $convenioDocumentoRepository->count([]),
                'hint' => 'Adjuntos empresariales y de convenio almacenados.',
            ],
        ];
    }

    private function buildActivitySnapshot(EntityManagerInterface $entityManager): array
    {
        $activity = [];

        foreach ($entityManager->getRepository(EmpresaSolicitud::class)->findBy([], ['updatedAt' => 'DESC'], 4) as $solicitud) {
            $activity[] = [
                'id' => 'solicitud-' . $solicitud->getId(),
                'category' => 'pendiente',
                'title' => sprintf('Solicitud de %s', $solicitud->getNombreEmpresa()),
                'description' => sprintf('Estado actual: %s.', $solicitud->getEstado()),
                'timestamp' => $solicitud->getUpdatedAt()->format(\DateTimeInterface::ATOM),
            ];
        }

        foreach ($entityManager->getRepository(EmpresaMensaje::class)->findBy([], ['createdAt' => 'DESC'], 4) as $mensaje) {
            $solicitud = $mensaje->getSolicitud();
            $empresa = $solicitud?->getNombreEmpresa() ?? 'empresa desconocida';
            $activity[] = [
                'id' => 'mensaje-' . $mensaje->getId(),
                'category' => 'email_verificado',
                'title' => sprintf('Mensaje %s para %s', $mensaje->getAutor(), $empresa),
                'description' => $this->truncate($mensaje->getTexto(), 140),
                'timestamp' => $mensaje->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ];
        }

        foreach ($entityManager->getRepository(EmpresaDocumento::class)->findBy([], ['uploadedAt' => 'DESC'], 4) as $documento) {
            $empresa = $documento->getEmpresa()?->getNombre() ?? 'empresa';
            $activity[] = [
                'id' => 'empresa-documento-' . $documento->getId(),
                'category' => 'aprobada',
                'title' => sprintf('Documento de empresa: %s', $documento->getNombre()),
                'description' => sprintf('Adjunto vinculado a %s.', $empresa),
                'timestamp' => $documento->getUploadedAt()->format(\DateTimeInterface::ATOM),
            ];
        }

        foreach ($entityManager->getRepository(ConvenioDocumento::class)->findBy([], ['uploadedAt' => 'DESC'], 4) as $documento) {
            $convenio = $documento->getConvenio()?->getTitulo() ?? 'convenio';
            $activity[] = [
                'id' => 'convenio-documento-' . $documento->getId(),
                'category' => 'email_verificado',
                'title' => sprintf('Documento de convenio: %s', $documento->getNombre()),
                'description' => sprintf('Adjunto asociado a %s.', $convenio),
                'timestamp' => $documento->getUploadedAt()->format(\DateTimeInterface::ATOM),
            ];
        }

        usort(
            $activity,
            static fn (array $left, array $right): int => strcmp($right['timestamp'], $left['timestamp'])
        );

        return array_slice($activity, 0, 8);
    }

    private function buildLogSnapshot(): array
    {
        $logsDir = $this->kernel->getLogDir();
        if (!is_dir($logsDir)) {
            return [];
        }

        $logFiles = glob($logsDir . '/*.log') ?: [];
        usort(
            $logFiles,
            static fn (string $left, string $right): int => (filemtime($right) ?: 0) <=> (filemtime($left) ?: 0)
        );

        $snapshot = [];
        foreach (array_slice($logFiles, 0, 3) as $path) {
            $lines = $this->tailLines($path, 8);
            if ($lines === []) {
                continue;
            }

            $snapshot[] = [
                'file' => basename($path),
                'updatedAt' => ($mtime = filemtime($path)) ? date(\DateTimeInterface::ATOM, $mtime) : null,
                'lines' => $lines,
            ];
        }

        return $snapshot;
    }

    private function buildTestSnapshot(): array
    {
        $projectDir = $this->kernel->getProjectDir();
        $frontendDir = $this->frontendAppDir();
        $backendFiles = $this->listFiles(
            $projectDir . '/tests',
            static fn (string $path): bool => str_ends_with($path, '.php')
        );
        $frontendFiles = $this->listFiles(
            $frontendDir . '/tests',
            static fn (string $path): bool => str_ends_with($path, '.test.ts')
        );

        return [
            [
                'id' => 'backend',
                'name' => 'PHPUnit backend',
                'scope' => 'backend',
                'status' => $backendFiles !== [] ? 'healthy' : 'warning',
                'command' => 'php bin/phpunit',
                'totalFiles' => count($backendFiles),
                'files' => array_slice($backendFiles, 0, 6),
                'focus' => [
                    'API segura',
                    'Documentos inline PDF',
                    'Monitor operativo',
                ],
            ],
            [
                'id' => 'frontend',
                'name' => 'Node test frontend',
                'scope' => 'frontend',
                'status' => $frontendFiles !== [] ? 'healthy' : 'warning',
                'command' => 'npm test',
                'totalFiles' => count($frontendFiles),
                'files' => array_slice($frontendFiles, 0, 6),
                'focus' => [
                    'Serializacion CSV',
                    'Resolucion de URLs PDF',
                    'Vista previa de documentos',
                ],
            ],
        ];
    }

    private function buildDocumentSnapshot(EntityManagerInterface $entityManager): array
    {
        $documents = [];

        foreach ($entityManager->getRepository(EmpresaDocumento::class)->findBy([], ['uploadedAt' => 'DESC'], 5) as $documento) {
            if (!$this->isPdfLike($documento->getTipo(), $documento->getUrl())) {
                continue;
            }

            $documents[] = [
                'id' => 'empresa-' . $documento->getId(),
                'name' => $documento->getNombre(),
                'type' => $documento->getTipo(),
                'url' => $documento->getUrl(),
                'uploadedAt' => $documento->getUploadedAt()->format(\DateTimeInterface::ATOM),
                'source' => 'empresa',
                'sourceLabel' => $documento->getEmpresa()?->getNombre() ?? 'Empresa',
            ];
        }

        foreach ($entityManager->getRepository(ConvenioDocumento::class)->findBy([], ['uploadedAt' => 'DESC'], 5) as $documento) {
            if (!$this->isPdfLike($documento->getTipo(), $documento->getUrl())) {
                continue;
            }

            $documents[] = [
                'id' => 'convenio-' . $documento->getId(),
                'name' => $documento->getNombre(),
                'type' => $documento->getTipo(),
                'url' => $documento->getUrl(),
                'uploadedAt' => $documento->getUploadedAt()->format(\DateTimeInterface::ATOM),
                'source' => 'convenio',
                'sourceLabel' => $documento->getConvenio()?->getTitulo() ?? 'Convenio',
            ];
        }

        usort(
            $documents,
            static fn (array $left, array $right): int => strcmp($right['uploadedAt'], $left['uploadedAt'])
        );

        return array_slice($documents, 0, 6);
    }

    private function frontendAppDir(): string
    {
        return dirname($this->kernel->getProjectDir()) . '/frontend/app';
    }

    private function countFiles(string $directory, callable $matcher): int
    {
        return count($this->listFiles($directory, $matcher));
    }

    private function listFiles(string $directory, callable $matcher): array
    {
        if (!is_dir($directory)) {
            return [];
        }

        $files = [];
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($directory, \FilesystemIterator::SKIP_DOTS)
        );

        foreach ($iterator as $fileInfo) {
            if (!$fileInfo->isFile()) {
                continue;
            }

            $path = $fileInfo->getPathname();
            if (!$matcher($path)) {
                continue;
            }

            $files[] = str_replace('\\', '/', substr($path, strlen($directory) + 1));
        }

        sort($files);

        return $files;
    }

    private function tailLines(string $path, int $limit): array
    {
        $handle = @fopen($path, 'rb');
        if ($handle === false) {
            return [];
        }

        fseek($handle, 0, SEEK_END);
        $fileSize = ftell($handle);
        if ($fileSize === false || $fileSize === 0) {
            fclose($handle);

            return [];
        }

        $buffer = '';
        $chunkSize = 4096;
        $newlineCount = 0;
        $position = $fileSize;

        while ($position > 0 && $newlineCount <= $limit) {
            $readSize = min($chunkSize, $position);
            $position -= $readSize;
            fseek($handle, $position);
            $chunk = fread($handle, $readSize);
            if ($chunk === false) {
                break;
            }

            $buffer = $chunk . $buffer;
            $newlineCount = substr_count($buffer, "\n");
        }

        fclose($handle);

        $contents = preg_split("/\r\n|\n|\r/", $buffer) ?: [];
        $lines = array_values(array_filter(
            array_slice($contents, -$limit),
            static fn (string $line): bool => trim($line) !== ''
        ));

        return array_map(fn (string $line): string => $this->truncate($line, 220), $lines);
    }

    private function truncate(string $value, int $limit): string
    {
        return mb_strlen($value) > $limit
            ? mb_substr($value, 0, $limit - 1) . '...'
            : $value;
    }

    private function isPdfLike(?string $type, ?string $url): bool
    {
        $normalizedType = strtolower(trim((string) $type));
        if ($normalizedType !== '' && (str_contains($normalizedType, 'pdf') || $normalizedType === 'application/pdf')) {
            return true;
        }

        $normalizedUrl = trim((string) $url);
        if ($normalizedUrl === '') {
            return false;
        }

        $urlWithoutQuery = explode('?', $normalizedUrl, 2)[0];

        return str_ends_with(strtolower($urlWithoutQuery), '.pdf');
    }
}
