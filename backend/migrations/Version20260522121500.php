<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260522121500 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Stores the proposed professional tutor on company requests created from the external portal.';
    }

    public function up(Schema $schema): void
    {
        $platform = $this->connection->getDatabasePlatform()->getName();

        if (!\in_array($platform, ['postgresql', 'sqlite'], true)) {
            $this->abortIf(true, sprintf('Unsupported platform for %s: %s', self::class, $platform));
        }

        $this->addSql('ALTER TABLE empresa_solicitud ADD tutor_profesional_nombre VARCHAR(150) DEFAULT NULL');
        $this->addSql('ALTER TABLE empresa_solicitud ADD tutor_profesional_email VARCHAR(150) DEFAULT NULL');
        $this->addSql('ALTER TABLE empresa_solicitud ADD tutor_profesional_telefono VARCHAR(50) DEFAULT NULL');
        $this->addSql('ALTER TABLE empresa_solicitud ADD tutor_profesional_cargo VARCHAR(120) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $platform = $this->connection->getDatabasePlatform()->getName();

        if ($platform === 'postgresql') {
            $this->addSql('ALTER TABLE empresa_solicitud DROP tutor_profesional_nombre');
            $this->addSql('ALTER TABLE empresa_solicitud DROP tutor_profesional_email');
            $this->addSql('ALTER TABLE empresa_solicitud DROP tutor_profesional_telefono');
            $this->addSql('ALTER TABLE empresa_solicitud DROP tutor_profesional_cargo');

            return;
        }

        $this->throwIrreversibleMigrationException('SQLite does not support dropping these columns safely in this migration.');
    }
}
