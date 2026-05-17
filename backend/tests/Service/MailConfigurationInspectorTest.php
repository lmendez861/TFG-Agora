<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Servicio de aplicacion: concentra reglas reutilizables que no pertenecen a una sola entidad o controlador.
 * Relaciones: Conecta con App/Service/MailConfigurationInspector.
 */

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\MailConfigurationInspector;
use PHPUnit\Framework\TestCase;

/**
 * Servicio de aplicacion: concentra reglas reutilizables que no pertenecen a una sola entidad o controlador.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
final class MailConfigurationInspectorTest extends TestCase
{
    /**
     * Caso de prueba que fija el comportamiento esperado de esta funcionalidad.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testDetectaCredencialesPlaceholder(): void
    {
        $inspector = new MailConfigurationInspector(
            'smtp://usuario:clave@smtp.centro.edu:587',
            'Practicas <practicas@centro.edu>'
        );

        $snapshot = $inspector->snapshot();

        self::assertFalse($snapshot['canSend']);
        self::assertSame('warning', $snapshot['status']);
    }

    /**
     * Caso de prueba que fija el comportamiento esperado de esta funcionalidad.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testAceptaConfiguracionNoPlaceholderConRemitenteValido(): void
    {
        $inspector = new MailConfigurationInspector(
            'smtp://mailer_user:secret-2026@smtp.real-centro.es:587',
            'Practicas <practicas@real-centro.es>'
        );

        $snapshot = $inspector->snapshot();

        self::assertTrue($snapshot['canSend']);
        self::assertSame('healthy', $snapshot['status']);
    }

    /**
     * Caso de prueba que fija el comportamiento esperado de esta funcionalidad.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testDetectaBrevoApiPlaceholderComoPendiente(): void
    {
        $inspector = new MailConfigurationInspector(
            'brevo+api://BREVO_API_KEY@default',
            'Agora <sender-verificado@tu-dominio.com>'
        );

        $snapshot = $inspector->snapshot();

        self::assertFalse($snapshot['canSend']);
        self::assertSame('warning', $snapshot['status']);
        self::assertSame('brevo', $snapshot['provider']);
    }

    /**
     * Caso de prueba que fija el comportamiento esperado de esta funcionalidad.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testAceptaBrevoApiConClaveReal(): void
    {
        $inspector = new MailConfigurationInspector(
            'brevo+api://xkeysib-123456789-real@default',
            'Agora <sender@midominio.com>'
        );

        $snapshot = $inspector->snapshot();

        self::assertTrue($snapshot['canSend']);
        self::assertSame('healthy', $snapshot['status']);
        self::assertSame('brevo', $snapshot['provider']);
    }
}
