<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260518011500 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Allows company portal accounts to exist before an approved company record is created.';
    }

    public function up(Schema $schema): void
    {
        $platform = $this->connection->getDatabasePlatform()->getName();

        if ($platform === 'postgresql') {
            $this->addSql('ALTER TABLE empresa_portal_cuenta ALTER COLUMN empresa_id DROP NOT NULL');

            return;
        }

        if ($platform !== 'sqlite') {
            $this->abortIf(true, sprintf('Unsupported platform for %s: %s', self::class, $platform));
        }

        $this->addSql('PRAGMA foreign_keys=OFF');
        $this->addSql(<<<'SQL'
            CREATE TABLE __temp__empresa_portal_cuenta (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              empresa_id INTEGER DEFAULT NULL,
              solicitud_id INTEGER DEFAULT NULL,
              email VARCHAR(180) NOT NULL,
              roles CLOB NOT NULL,
              password VARCHAR(255) DEFAULT NULL,
              display_name VARCHAR(160) DEFAULT NULL,
              active BOOLEAN NOT NULL,
              setup_token VARCHAR(64) DEFAULT NULL,
              setup_token_expires_at DATETIME DEFAULT NULL,
              password_reset_token VARCHAR(64) DEFAULT NULL,
              password_reset_token_expires_at DATETIME DEFAULT NULL,
              activated_at DATETIME DEFAULT NULL,
              last_login_at DATETIME DEFAULT NULL,
              created_at DATETIME NOT NULL,
              updated_at DATETIME NOT NULL,
              CONSTRAINT FK_598C39CF521E1991 FOREIGN KEY (empresa_id) REFERENCES empresa_colaboradora (id) ON DELETE CASCADE,
              CONSTRAINT FK_598C39CF1CB9D6E4 FOREIGN KEY (solicitud_id) REFERENCES empresa_solicitud (id) ON DELETE SET NULL
            )
        SQL);
        $this->addSql(<<<'SQL'
            INSERT INTO __temp__empresa_portal_cuenta (
              id,
              empresa_id,
              solicitud_id,
              email,
              roles,
              password,
              display_name,
              active,
              setup_token,
              setup_token_expires_at,
              password_reset_token,
              password_reset_token_expires_at,
              activated_at,
              last_login_at,
              created_at,
              updated_at
            )
            SELECT
              id,
              empresa_id,
              solicitud_id,
              email,
              roles,
              password,
              display_name,
              active,
              setup_token,
              setup_token_expires_at,
              password_reset_token,
              password_reset_token_expires_at,
              activated_at,
              last_login_at,
              created_at,
              updated_at
            FROM empresa_portal_cuenta
        SQL);
        $this->addSql('DROP TABLE empresa_portal_cuenta');
        $this->addSql('ALTER TABLE __temp__empresa_portal_cuenta RENAME TO empresa_portal_cuenta');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_598C39CFE7927C74 ON empresa_portal_cuenta (email)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_598C39CFFAD37B28 ON empresa_portal_cuenta (setup_token)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_598C39CF6B7BA4B6 ON empresa_portal_cuenta (password_reset_token)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_598C39CF521E1991 ON empresa_portal_cuenta (empresa_id)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_598C39CF1CB9D6E4 ON empresa_portal_cuenta (solicitud_id)');
        $this->addSql('PRAGMA foreign_keys=ON');
    }

    public function down(Schema $schema): void
    {
        $this->throwIrreversibleMigrationException('This migration relaxes a portal account constraint and is not rolled back automatically.');
    }
}
