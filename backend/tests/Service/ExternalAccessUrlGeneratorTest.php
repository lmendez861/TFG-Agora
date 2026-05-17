<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\ExternalAccessUrlGenerator;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Process\Process;

final class ExternalAccessUrlGeneratorTest extends KernelTestCase
{
    private string $runtimeDir;
    private ?string $stateBackup = null;
    private ?string $stdoutBackup = null;
    private ?string $stderrBackup = null;
    private ?Process $sleepProcess = null;

    protected function setUp(): void
    {
        self::bootKernel();
        $projectDir = self::getContainer()->getParameter('kernel.project_dir');
        $this->runtimeDir = $projectDir . '/var/public-access';

        if (!is_dir($this->runtimeDir)) {
            mkdir($this->runtimeDir, 0777, true);
        }

        $this->stateBackup = $this->readIfExists($this->runtimeDir . '/state.json');
        $this->stdoutBackup = $this->readIfExists($this->runtimeDir . '/cloudflared.out.log');
        $this->stderrBackup = $this->readIfExists($this->runtimeDir . '/cloudflared.err.log');
    }

    protected function tearDown(): void
    {
        if ($this->sleepProcess !== null && $this->sleepProcess->isRunning()) {
            $this->sleepProcess->stop(0);
        }

        $this->restoreFile($this->runtimeDir . '/state.json', $this->stateBackup);
        $this->restoreFile($this->runtimeDir . '/cloudflared.out.log', $this->stdoutBackup);
        $this->restoreFile($this->runtimeDir . '/cloudflared.err.log', $this->stderrBackup);

        parent::tearDown();
    }

    public function testUsesPublicTunnelOriginWhenLocalRequestAndTunnelIsActive(): void
    {
        $process = new Process(['powershell.exe', '-NoProfile', '-Command', 'Start-Sleep -Seconds 60']);
        $process->start();
        $this->sleepProcess = $process;

        usleep(250000);
        self::assertTrue($process->isRunning());

        file_put_contents($this->runtimeDir . '/cloudflared.out.log', 'https://agora-demo.trycloudflare.com' . PHP_EOL);
        file_put_contents($this->runtimeDir . '/cloudflared.err.log', '');
        file_put_contents($this->runtimeDir . '/state.json', json_encode([
            'status' => 'active',
            'detail' => 'Tunel publico operativo.',
            'publicUrl' => 'https://agora-demo.trycloudflare.com',
            'targetUrl' => 'http://127.0.0.1:8000',
            'startedAt' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            'processId' => $process->getPid(),
        ], JSON_THROW_ON_ERROR));

        /** @var ExternalAccessUrlGenerator $generator */
        $generator = self::getContainer()->get(ExternalAccessUrlGenerator::class);
        $request = Request::create('http://127.0.0.1:8000/registro-empresa');

        $verificationUrl = $generator->buildRouteUrl('registro_empresa_confirm', ['token' => 'abc123'], $request);
        $activationUrl = $generator->buildPortalUrl('/activar-cuenta', ['token' => 'setup123'], $request);

        self::assertSame(
            'https://agora-demo.trycloudflare.com/registro-empresa/confirmar?token=abc123',
            $verificationUrl
        );
        self::assertSame(
            'https://agora-demo.trycloudflare.com/externo/activar-cuenta?token=setup123',
            $activationUrl
        );
    }

    public function testUsesForwardedRequestOriginWhenRequestAlreadyComesFromExternalHost(): void
    {
        /** @var ExternalAccessUrlGenerator $generator */
        $generator = self::getContainer()->get(ExternalAccessUrlGenerator::class);
        $request = Request::create('https://demo.agora.example/registro-empresa');

        $verificationUrl = $generator->buildRouteUrl('registro_empresa_confirm', ['token' => 'abc123'], $request);

        self::assertSame(
            'https://demo.agora.example/registro-empresa/confirmar?token=abc123',
            $verificationUrl
        );
    }

    private function readIfExists(string $path): ?string
    {
        return is_file($path) ? (string) file_get_contents($path) : null;
    }

    private function restoreFile(string $path, ?string $contents): void
    {
        if ($contents === null) {
            @unlink($path);

            return;
        }

        file_put_contents($path, $contents);
    }
}
