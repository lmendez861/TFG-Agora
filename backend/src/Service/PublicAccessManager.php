<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Process\Process;

class PublicAccessManager
{
    private const DEFAULT_TARGET_URL = 'http://127.0.0.1:8000';

    public function __construct(private readonly KernelInterface $kernel)
    {
    }

    public function getSnapshot(): array
    {
        $state = $this->loadState();
        $processId = isset($state['processId']) ? (int) $state['processId'] : null;
        $isRunning = $processId !== null && $processId > 0 && $this->isProcessRunning($processId);
        $publicUrl = $isRunning ? $this->extractPublicUrl() : null;
        $targetUrl = (string) ($state['targetUrl'] ?? $this->resolveTargetUrl());
        $startedAt = $isRunning ? ($state['startedAt'] ?? null) : null;

        if ($isRunning && $publicUrl !== null) {
            return [
                'status' => 'active',
                'detail' => 'Tunel publico operativo. Usa la misma base para /app y /externo.',
                'publicUrl' => $publicUrl,
                'targetUrl' => $targetUrl,
                'startedAt' => $startedAt,
                'processId' => $processId,
            ];
        }

        if ($isRunning) {
            return [
                'status' => 'starting',
                'detail' => 'El acceso externo se esta inicializando. Actualiza el estado en unos segundos.',
                'publicUrl' => null,
                'targetUrl' => $targetUrl,
                'startedAt' => $startedAt,
                'processId' => $processId,
            ];
        }

        if (($state['status'] ?? null) === 'error') {
            return [
                'status' => 'error',
                'detail' => (string) ($state['detail'] ?? 'No se pudo iniciar el acceso externo.'),
                'publicUrl' => null,
                'targetUrl' => $targetUrl,
                'startedAt' => null,
                'processId' => null,
            ];
        }

        return [
            'status' => 'inactive',
            'detail' => 'El acceso externo esta detenido.',
            'publicUrl' => null,
            'targetUrl' => $targetUrl,
            'startedAt' => null,
            'processId' => null,
        ];
    }

    public function start(): array
    {
        $snapshot = $this->getSnapshot();
        if (in_array($snapshot['status'], ['active', 'starting'], true)) {
            return $snapshot;
        }

        $targetUrl = $this->resolveTargetUrl();
        $this->assertTargetReachable($targetUrl);

        $cloudflaredPath = $this->cloudflaredPath();
        if (!is_file($cloudflaredPath)) {
            throw new \RuntimeException('No se encontro tools/cloudflared.exe. Ejecuta start-public-url.bat una vez o copia el binario.');
        }

        $runtimeDir = $this->runtimeDir();
        if (!is_dir($runtimeDir) && !mkdir($runtimeDir, 0777, true) && !is_dir($runtimeDir)) {
            throw new \RuntimeException('No se pudo preparar el directorio temporal del acceso externo.');
        }

        @unlink($this->stdoutLogPath());
        @unlink($this->stderrLogPath());

        $command = sprintf(
            "\$process = Start-Process -FilePath %s -ArgumentList @('tunnel', '--url', %s, '--ha-connections', '1') -RedirectStandardOutput %s -RedirectStandardError %s -PassThru -WindowStyle Hidden; \$process.Id",
            $this->quotePowerShell($cloudflaredPath),
            $this->quotePowerShell($targetUrl),
            $this->quotePowerShell($this->stdoutLogPath()),
            $this->quotePowerShell($this->stderrLogPath()),
        );

        $process = new Process(
            ['powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $command],
            $this->repoDir()
        );
        $process->mustRun();

        $processId = (int) trim($process->getOutput());
        if ($processId <= 0) {
            throw new \RuntimeException('No se pudo obtener el proceso del tunel publico.');
        }

        $this->saveState([
            'status' => 'starting',
            'detail' => 'El acceso externo se esta inicializando.',
            'targetUrl' => $targetUrl,
            'publicUrl' => null,
            'startedAt' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            'processId' => $processId,
        ]);

        $deadline = microtime(true) + 12.0;
        do {
            usleep(250000);
            $snapshot = $this->getSnapshot();

            if ($snapshot['status'] === 'active') {
                $this->saveState([
                    ...$snapshot,
                    'detail' => 'Tunel publico operativo. Usa la misma base para /app y /externo.',
                ]);

                return $snapshot;
            }
        } while (microtime(true) < $deadline && $this->isProcessRunning($processId));

        $detail = $this->readLastLogLine() ?? 'El tunel no devolvio una URL publica valida.';
        $this->saveState([
            'status' => 'error',
            'detail' => $detail,
            'targetUrl' => $targetUrl,
            'publicUrl' => null,
            'startedAt' => null,
            'processId' => null,
        ]);

        if ($this->isProcessRunning($processId)) {
            $this->stopProcess($processId);
        }

        return $this->getSnapshot();
    }

    public function stop(): array
    {
        $state = $this->loadState();
        $processId = isset($state['processId']) ? (int) $state['processId'] : null;

        if ($processId !== null && $processId > 0 && $this->isProcessRunning($processId)) {
            $this->stopProcess($processId);
        }

        $snapshot = [
            'status' => 'inactive',
            'detail' => 'El acceso externo esta detenido.',
            'publicUrl' => null,
            'targetUrl' => (string) ($state['targetUrl'] ?? $this->resolveTargetUrl()),
            'startedAt' => null,
            'processId' => null,
        ];

        $this->saveState($snapshot);

        return $snapshot;
    }

    private function assertTargetReachable(string $targetUrl): void
    {
        $parts = parse_url($targetUrl);
        $host = $parts['host'] ?? null;
        $scheme = $parts['scheme'] ?? 'http';
        $port = isset($parts['port']) ? (int) $parts['port'] : ($scheme === 'https' ? 443 : 80);

        if (!is_string($host) || $host === '') {
            throw new \RuntimeException(sprintf('La URL objetivo %s no es valida.', $targetUrl));
        }

        $socket = @fsockopen($host, $port, $errno, $errorMessage, 2.0);
        if ($socket === false) {
            throw new \RuntimeException(sprintf(
                'El servidor local no responde en %s (%s). Arranca la pagina antes de activar el acceso externo.',
                $targetUrl,
                $errorMessage !== '' ? $errorMessage : ('codigo ' . $errno)
            ));
        }

        fclose($socket);
    }

    private function extractPublicUrl(): ?string
    {
        foreach ([$this->stderrLogPath(), $this->stdoutLogPath()] as $path) {
            if (!is_file($path)) {
                continue;
            }

            $contents = @file_get_contents($path);
            if ($contents === false) {
                continue;
            }

            if (preg_match('/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i', $contents, $matches) === 1) {
                return $matches[0];
            }
        }

        return null;
    }

    private function readLastLogLine(): ?string
    {
        foreach ([$this->stderrLogPath(), $this->stdoutLogPath()] as $path) {
            if (!is_file($path)) {
                continue;
            }

            $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if ($lines === false || $lines === []) {
                continue;
            }

            return trim((string) end($lines));
        }

        return null;
    }

    private function stopProcess(int $processId): void
    {
        $command = sprintf('Stop-Process -Id %d -Force -ErrorAction SilentlyContinue', $processId);
        $process = new Process(['powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $command]);
        $process->run();
        usleep(250000);
    }

    private function isProcessRunning(int $processId): bool
    {
        $command = sprintf(
            "\$process = Get-Process -Id %d -ErrorAction SilentlyContinue; if (\$null -ne \$process) { '1' } else { '0' }",
            $processId
        );
        $process = new Process(['powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $command]);
        $process->run();

        return trim($process->getOutput()) === '1';
    }

    private function loadState(): array
    {
        $path = $this->statePath();
        if (!is_file($path)) {
            return [];
        }

        $contents = @file_get_contents($path);
        if ($contents === false || trim($contents) === '') {
            return [];
        }

        try {
            $decoded = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return [];
        }

        return is_array($decoded) ? $decoded : [];
    }

    private function saveState(array $state): void
    {
        $runtimeDir = $this->runtimeDir();
        if (!is_dir($runtimeDir) && !mkdir($runtimeDir, 0777, true) && !is_dir($runtimeDir)) {
            throw new \RuntimeException('No se pudo persistir el estado del acceso externo.');
        }

        file_put_contents($this->statePath(), json_encode($state, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
    }

    private function statePath(): string
    {
        return $this->runtimeDir() . '/state.json';
    }

    private function stdoutLogPath(): string
    {
        return $this->runtimeDir() . '/cloudflared.out.log';
    }

    private function stderrLogPath(): string
    {
        return $this->runtimeDir() . '/cloudflared.err.log';
    }

    private function runtimeDir(): string
    {
        return $this->kernel->getProjectDir() . '/var/public-access';
    }

    private function repoDir(): string
    {
        return dirname($this->kernel->getProjectDir());
    }

    private function cloudflaredPath(): string
    {
        return $this->repoDir() . '/tools/cloudflared.exe';
    }

    private function resolveTargetUrl(): string
    {
        $targetUrl = (string) ($_ENV['APP_PUBLIC_URL_TARGET'] ?? $_SERVER['APP_PUBLIC_URL_TARGET'] ?? self::DEFAULT_TARGET_URL);

        return rtrim($targetUrl, '/');
    }

    private function quotePowerShell(string $value): string
    {
        return "'" . str_replace("'", "''", $value) . "'";
    }
}
