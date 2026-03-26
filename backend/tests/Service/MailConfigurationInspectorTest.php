<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\MailConfigurationInspector;
use PHPUnit\Framework\TestCase;

final class MailConfigurationInspectorTest extends TestCase
{
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
