<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Prueba automatizada: documenta el comportamiento esperado y protege integraciones entre piezas.
 * Relaciones: Conecta con App/Service/DocumentStorageManager.
 */

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\DocumentStorageManager;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

/**
 * Prueba automatizada: documenta el comportamiento esperado y protege integraciones entre piezas.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
final class DocumentStorageManagerTest extends TestCase
{
    /**
     * Caso de prueba que fija el comportamiento esperado de esta funcionalidad.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testResolveRutaRelativaDentroDelAlmacenamiento(): void
    {
        $manager = new DocumentStorageManager(new Filesystem(), 'var/documentos', '/app');

        self::assertSame('/app/var/documentos/empresas/1/manual.pdf', $manager->resolveAbsolutePath('empresas/1/manual.pdf'));
    }

    /**
     * Caso de prueba que fija el comportamiento esperado de esta funcionalidad.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testRechazaRutasConTraversal(): void
    {
        $manager = new DocumentStorageManager(new Filesystem(), 'var/documentos', '/app');

        $this->expectException(BadRequestHttpException::class);

        $manager->resolveAbsolutePath('../.env.local');
    }

    /**
     * Caso de prueba que fija el comportamiento esperado de esta funcionalidad.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testRechazaRutasAbsolutas(): void
    {
        $manager = new DocumentStorageManager(new Filesystem(), 'var/documentos', '/app');

        $this->expectException(BadRequestHttpException::class);

        $manager->resolveAbsolutePath('/tmp/fuera.pdf');
    }
}
