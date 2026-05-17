<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Migracion Doctrine: versiona cambios de esquema que deben aplicarse sobre la base de datos.
 * Relaciones: Conexiones principales indicadas por imports, inyeccion de dependencias o rutas del propio archivo.
 */

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260329171817 extends AbstractMigration
{
    private const SQLITE_AUTOINCREMENT = 'INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL';

    public function getDescription(): string
    {
        return 'Adds company portal accounts, audit logs, hardened document metadata, and follow-up/evaluation lifecycle fields.';
    }

    /**
     * Paso de migracion Doctrine que modifica el esquema de base de datos al ejecutar migrations.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function up(Schema $schema): void
    {
        $this->addPortableSql(<<<'SQL'
            CREATE TABLE audit_log (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              actor_type VARCHAR(60) NOT NULL,
              actor_identifier VARCHAR(190) NOT NULL,
              "action" VARCHAR(120) NOT NULL,
              target_type VARCHAR(120) NOT NULL,
              target_id VARCHAR(120) DEFAULT NULL,
              context CLOB DEFAULT NULL,
              ip_address VARCHAR(64) DEFAULT NULL,
              user_agent VARCHAR(255) DEFAULT NULL,
              created_at DATETIME NOT NULL --(DC2Type:datetime_immutable)
            )
        SQL);
        $this->addPortableSql(<<<'SQL'
            CREATE TABLE empresa_portal_cuenta (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              empresa_id INTEGER DEFAULT NULL,
              solicitud_id INTEGER DEFAULT NULL,
              email VARCHAR(180) NOT NULL,
              roles CLOB NOT NULL --(DC2Type:json)
              ,
              password VARCHAR(255) DEFAULT NULL,
              display_name VARCHAR(160) DEFAULT NULL,
              active BOOLEAN NOT NULL,
              setup_token VARCHAR(64) DEFAULT NULL,
              setup_token_expires_at DATETIME DEFAULT NULL --(DC2Type:datetime_immutable)
              ,
              password_reset_token VARCHAR(64) DEFAULT NULL,
              password_reset_token_expires_at DATETIME DEFAULT NULL --(DC2Type:datetime_immutable)
              ,
              activated_at DATETIME DEFAULT NULL --(DC2Type:datetime_immutable)
              ,
              last_login_at DATETIME DEFAULT NULL --(DC2Type:datetime_immutable)
              ,
              created_at DATETIME NOT NULL --(DC2Type:datetime_immutable)
              ,
              updated_at DATETIME NOT NULL --(DC2Type:datetime_immutable)
              ,
              CONSTRAINT FK_598C39CF521E1991 FOREIGN KEY (empresa_id) REFERENCES empresa_colaboradora (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE,
              CONSTRAINT FK_598C39CF1CB9D6E4 FOREIGN KEY (solicitud_id) REFERENCES empresa_solicitud (id) ON DELETE
              SET
                NULL NOT DEFERRABLE INITIALLY IMMEDIATE
            )
        SQL);
        $this->addPortableSql('CREATE UNIQUE INDEX UNIQ_598C39CFE7927C74 ON empresa_portal_cuenta (email)');
        $this->addPortableSql('CREATE UNIQUE INDEX UNIQ_598C39CFFAD37B28 ON empresa_portal_cuenta (setup_token)');
        $this->addPortableSql('CREATE UNIQUE INDEX UNIQ_598C39CF6B7BA4B6 ON empresa_portal_cuenta (password_reset_token)');
        $this->addPortableSql('CREATE UNIQUE INDEX UNIQ_598C39CF521E1991 ON empresa_portal_cuenta (empresa_id)');
        $this->addPortableSql('CREATE UNIQUE INDEX UNIQ_598C39CF1CB9D6E4 ON empresa_portal_cuenta (solicitud_id)');
        $this->addPortableSql("ALTER TABLE empresa_documento ADD COLUMN storage_path VARCHAR(255) DEFAULT NULL");
        $this->addPortableSql("ALTER TABLE empresa_documento ADD COLUMN original_filename VARCHAR(255) DEFAULT NULL");
        $this->addPortableSql("ALTER TABLE empresa_documento ADD COLUMN storage_provider VARCHAR(40) NOT NULL DEFAULT 'external_fs'");
        $this->addPortableSql("ALTER TABLE empresa_documento ADD COLUMN version INTEGER NOT NULL DEFAULT 1");
        $this->addPortableSql("ALTER TABLE empresa_documento ADD COLUMN active BOOLEAN NOT NULL DEFAULT 1");
        $this->addPortableSql("ALTER TABLE empresa_documento ADD COLUMN deleted_at DATETIME DEFAULT NULL");
        $this->addPortableSql("ALTER TABLE empresa_documento ADD COLUMN deleted_by VARCHAR(190) DEFAULT NULL");
        $this->addPortableSql("ALTER TABLE convenio_documento ADD COLUMN storage_path VARCHAR(255) DEFAULT NULL");
        $this->addPortableSql("ALTER TABLE convenio_documento ADD COLUMN original_filename VARCHAR(255) DEFAULT NULL");
        $this->addPortableSql("ALTER TABLE convenio_documento ADD COLUMN storage_provider VARCHAR(40) NOT NULL DEFAULT 'external_fs'");
        $this->addPortableSql("ALTER TABLE convenio_documento ADD COLUMN version INTEGER NOT NULL DEFAULT 1");
        $this->addPortableSql("ALTER TABLE convenio_documento ADD COLUMN active BOOLEAN NOT NULL DEFAULT 1");
        $this->addPortableSql("ALTER TABLE convenio_documento ADD COLUMN deleted_at DATETIME DEFAULT NULL");
        $this->addPortableSql("ALTER TABLE convenio_documento ADD COLUMN deleted_by VARCHAR(190) DEFAULT NULL");
        $this->addPortableSql("ALTER TABLE seguimiento ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'abierto'");
        $this->addPortableSql("ALTER TABLE seguimiento ADD COLUMN evidencia_nombre VARCHAR(255) DEFAULT NULL");
        $this->addPortableSql("ALTER TABLE seguimiento ADD COLUMN evidencia_tipo VARCHAR(80) DEFAULT NULL");
        $this->addPortableSql("ALTER TABLE seguimiento ADD COLUMN evidencia_url VARCHAR(255) DEFAULT NULL");
        $this->addPortableSql("ALTER TABLE seguimiento ADD COLUMN cerrado_en DATETIME DEFAULT NULL");
        $this->addPortableSql("ALTER TABLE seguimiento ADD COLUMN cierre_comentario CLOB DEFAULT NULL");
        $this->addPortableSql("ALTER TABLE evaluacion_final ADD COLUMN nota_empresa INTEGER DEFAULT NULL");
        $this->addPortableSql("ALTER TABLE evaluacion_final ADD COLUMN nota_estudiante INTEGER DEFAULT NULL");
        $this->addPortableSql("ALTER TABLE evaluacion_final ADD COLUMN nota_tutor_academico INTEGER DEFAULT NULL");
        $this->addPortableSql("ALTER TABLE evaluacion_final ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'borrador'");
        $this->addPortableSql("ALTER TABLE evaluacion_final ADD COLUMN cerrada_en DATETIME DEFAULT NULL");
    }

    /**
     * Paso de migracion Doctrine que modifica el esquema de base de datos al ejecutar migrations.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function down(Schema $schema): void
    {
        $this->throwIrreversibleMigrationException('This migration adds operational tables and SQLite column changes that are not rolled back automatically.');
    }

    private function addPortableSql(string $sql): void
    {
        $this->addSql($this->normalizeForPlatform($sql));
    }

    private function normalizeForPlatform(string $sql): string
    {
        if ($this->connection->getDatabasePlatform()->getName() !== 'postgresql') {
            return $sql;
        }

        $sql = str_replace(self::SQLITE_AUTOINCREMENT, 'SERIAL PRIMARY KEY', $sql);
        $sql = preg_replace('/\bCLOB\b/', 'TEXT', $sql) ?? $sql;
        $sql = preg_replace('/\bDATETIME\b/', 'TIMESTAMP(0) WITHOUT TIME ZONE', $sql) ?? $sql;
        $sql = str_replace('BOOLEAN NOT NULL DEFAULT 1', 'BOOLEAN NOT NULL DEFAULT TRUE', $sql);

        return $sql;
    }
}
