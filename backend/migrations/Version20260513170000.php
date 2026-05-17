<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260513170000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Stores uploaded company private documents inside the database for local/packaged deployments.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE empresa_documento ADD COLUMN file_content_base64 CLOB DEFAULT NULL');
        $this->addSql('ALTER TABLE empresa_documento ADD COLUMN mime_type VARCHAR(120) DEFAULT NULL');
        $this->addSql('ALTER TABLE empresa_documento ADD COLUMN file_size_bytes INTEGER DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->throwIrreversibleMigrationException('SQLite no elimina columnas de forma segura en este proyecto.');
    }
}
