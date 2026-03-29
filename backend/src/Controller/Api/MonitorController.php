<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\AsignacionPractica;
use App\Entity\AuditLog;
use App\Entity\Convenio;
use App\Entity\ConvenioDocumento;
use App\Entity\EmpresaColaboradora;
use App\Entity\EmpresaDocumento;
use App\Entity\EmpresaMensaje;
use App\Entity\EmpresaPortalCuenta;
use App\Entity\EmpresaSolicitud;
use App\Entity\Estudiante;
use App\Entity\EvaluacionFinal;
use App\Entity\Seguimiento;
use App\Service\DocumentStorageManager;
use App\Service\InternalMfaManager;
use App\Service\MailConfigurationInspector;
use App\Service\PublicAccessManager;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/monitor', name: 'api_monitor_')]
#[IsGranted('ROLE_MONITOR')]
final class MonitorController extends AbstractController
{
    public function __construct(
        private readonly KernelInterface $kernel,
        private readonly PublicAccessManager $publicAccessManager,
        private readonly MailConfigurationInspector $mailConfigurationInspector,
        private readonly DocumentStorageManager $documentStorageManager,
        private readonly InternalMfaManager $internalMfaManager,
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
        $e2eTests = $this->countFiles(
            $this->frontendAppDir() . '/e2e',
            static fn (string $path): bool => str_ends_with($path, '.spec.ts')
        );
        $publicAccess = $this->publicAccessManager->getSnapshot();
        $mailSnapshot = $this->mailConfigurationInspector->snapshot();
        $mfaStatus = $this->internalMfaManager->getStatus();

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
                'id' => 'mailer',
                'name' => 'Correo saliente',
                'status' => $mailSnapshot['status'],
                'detail' => $mailSnapshot['detail'],
                'target' => null,
            ],
            [
                'id' => 'mfa',
                'name' => 'MFA interno',
                'status' => ($mfaStatus['mailReady'] ?? false) ? 'healthy' : 'warning',
                'detail' => ($mfaStatus['mailReady'] ?? false)
                    ? 'Segundo factor listo para operaciones sensibles del monitor.'
                    : 'El MFA no puede emitir codigos por correo con la configuracion actual.',
                'target' => '/api/mfa/status',
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
                'status' => $frontendTests > 0 && $e2eTests > 0 ? 'healthy' : 'warning',
                'detail' => $frontendTests > 0 && $e2eTests > 0
                    ? 'Hay suites registradas para backend, frontend y navegador.'
                    : 'Falta cobertura frontal completa o pruebas E2E de navegador.',
                'target' => null,
            ],
            [
                'id' => 'document-storage',
                'name' => 'Almacenamiento documental',
                'status' => is_dir(dirname($this->documentStorageManager->resolveAbsolutePath('healthcheck.txt'))) ? 'healthy' : 'warning',
                'detail' => sprintf('Repositorio externo de ficheros en %s.', dirname($this->documentStorageManager->resolveAbsolutePath('healthcheck.txt'))),
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
        $seguimientoRepository = $entityManager->getRepository(Seguimiento::class);
        $evaluacionRepository = $entityManager->getRepository(EvaluacionFinal::class);
        $portalAccountRepository = $entityManager->getRepository(EmpresaPortalCuenta::class);
        $auditRepository = $entityManager->getRepository(AuditLog::class);

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
            [
                'id' => 'seguimientos',
                'label' => 'Seguimientos',
                'value' => $seguimientoRepository->count([]),
                'hint' => 'Entradas de seguimiento operativo registradas por asignacion.',
            ],
            [
                'id' => 'evaluaciones',
                'label' => 'Evaluaciones finales',
                'value' => $evaluacionRepository->count([]),
                'hint' => 'Evaluaciones con notas, conclusiones y cierre.',
            ],
            [
                'id' => 'cuentas-empresa',
                'label' => 'Cuentas empresa',
                'value' => $portalAccountRepository->count([]),
                'hint' => 'Empresas con acceso persistente al portal externo.',
            ],
            [
                'id' => 'auditoria',
                'label' => 'Eventos de auditoria',
                'value' => $auditRepository->count([]),
                'hint' => 'Trazas de acciones sensibles registradas en el sistema.',
            ],
        ];
    }

    private function buildActivitySnapshot(EntityManagerInterface $entityManager): array
    {
        $activity = [];

        foreach ($entityManager->getRepository(AuditLog::class)->findBy([], ['createdAt' => 'DESC'], 6) as $audit) {
            $activity[] = [
                'id' => 'audit-' . $audit->getId(),
                'category' => $audit->getAction(),
                'title' => sprintf('Auditoria %s', $audit->getAction()),
                'description' => $this->truncate(sprintf('%s sobre %s#%s', $audit->getActorIdentifier(), $audit->getTargetType(), $audit->getTargetId() ?? '-'), 140),
                'timestamp' => $audit->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ];
        }

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
        $e2eFiles = $this->listFiles(
            $frontendDir . '/e2e',
            static fn (string $path): bool => str_ends_with($path, '.spec.ts')
        );
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
            [
                'id' => 'e2e',
                'name' => 'Playwright E2E',
                'scope' => 'frontend',
                'status' => $e2eFiles !== [] ? 'healthy' : 'warning',
                'command' => 'npm run test:e2e',
                'totalFiles' => count($e2eFiles),
                'files' => array_slice($e2eFiles, 0, 6),
                'focus' => [
                    'Login interno',
                    'Portal externo',
                    'Monitor privado',
                ],
            ],
        ];
    }

    private function buildDocumentSnapshot(EntityManagerInterface $entityManager): array
    {
        $documents = [];

        foreach ($entityManager->getRepository(EmpresaDocumento::class)->findBy([], ['uploadedAt' => 'DESC'], 5) as $documento) {
            $documentUrl = $documento->getStoragePath() && $documento->getEmpresa()?->getId() && $documento->getId()
                ? sprintf('/api/empresas/%d/documentos/%d/download', $documento->getEmpresa()->getId(), $documento->getId())
                : $documento->getUrl();

            if (!$this->isPdfLike($documento->getTipo(), $documentUrl)) {
                continue;
            }

            $documents[] = [
                'id' => 'empresa-' . $documento->getId(),
                'name' => $documento->getNombre(),
                'type' => $documento->getTipo(),
                'url' => $documentUrl,
                'uploadedAt' => $documento->getUploadedAt()->format(\DateTimeInterface::ATOM),
                'source' => 'empresa',
                'sourceLabel' => sprintf('%s | v%d', $documento->getEmpresa()?->getNombre() ?? 'Empresa', $documento->getVersion()),
            ];
        }

        foreach ($entityManager->getRepository(ConvenioDocumento::class)->findBy([], ['uploadedAt' => 'DESC'], 5) as $documento) {
            $documentUrl = $documento->getStoragePath() && $documento->getConvenio()?->getId() && $documento->getId()
                ? sprintf('/api/convenios/%d/documents/%d/download', $documento->getConvenio()->getId(), $documento->getId())
                : $documento->getUrl();

            if (!$this->isPdfLike($documento->getTipo(), $documentUrl)) {
                continue;
            }

            $documents[] = [
                'id' => 'convenio-' . $documento->getId(),
                'name' => $documento->getNombre(),
                'type' => $documento->getTipo(),
                'url' => $documentUrl,
                'uploadedAt' => $documento->getUploadedAt()->format(\DateTimeInterface::ATOM),
                'source' => 'convenio',
                'sourceLabel' => sprintf('%s | v%d', $documento->getConvenio()?->getTitulo() ?? 'Convenio', $documento->getVersion()),
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
