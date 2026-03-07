<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20251113203450 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Baseline schema for the Gestion de Empresas Colaboradoras project.';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE asignacion_practica (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              estudiante_id INTEGER NOT NULL,
              convenio_id INTEGER NOT NULL,
              empresa_id INTEGER NOT NULL,
              tutor_academico_id INTEGER NOT NULL,
              tutor_profesional_id INTEGER DEFAULT NULL,
              fecha_inicio DATE NOT NULL --(DC2Type:date_immutable)
              ,
              fecha_fin DATE DEFAULT NULL --(DC2Type:date_immutable)
              ,
              modalidad VARCHAR(20) NOT NULL,
              horas_totales INTEGER DEFAULT NULL,
              estado VARCHAR(20) NOT NULL,
              CONSTRAINT FK_9774186459590C39 FOREIGN KEY (estudiante_id) REFERENCES estudiante (id) NOT DEFERRABLE INITIALLY IMMEDIATE,
              CONSTRAINT FK_97741864F9D43F2A FOREIGN KEY (convenio_id) REFERENCES convenio (id) NOT DEFERRABLE INITIALLY IMMEDIATE,
              CONSTRAINT FK_97741864521E1991 FOREIGN KEY (empresa_id) REFERENCES empresa_colaboradora (id) NOT DEFERRABLE INITIALLY IMMEDIATE,
              CONSTRAINT FK_9774186431F6068A FOREIGN KEY (tutor_academico_id) REFERENCES tutor_academico (id) NOT DEFERRABLE INITIALLY IMMEDIATE,
              CONSTRAINT FK_97741864DD48975E FOREIGN KEY (tutor_profesional_id) REFERENCES tutor_profesional (id) NOT DEFERRABLE INITIALLY IMMEDIATE
            )
        SQL);
        $this->addSql('CREATE INDEX IDX_9774186459590C39 ON asignacion_practica (estudiante_id)');
        $this->addSql('CREATE INDEX IDX_97741864F9D43F2A ON asignacion_practica (convenio_id)');
        $this->addSql('CREATE INDEX IDX_97741864521E1991 ON asignacion_practica (empresa_id)');
        $this->addSql('CREATE INDEX IDX_9774186431F6068A ON asignacion_practica (tutor_academico_id)');
        $this->addSql('CREATE INDEX IDX_97741864DD48975E ON asignacion_practica (tutor_profesional_id)');
        $this->addSql(<<<'SQL'
            CREATE TABLE contacto_empresa (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              empresa_id INTEGER NOT NULL,
              nombre VARCHAR(150) NOT NULL,
              cargo VARCHAR(120) DEFAULT NULL,
              telefono VARCHAR(50) DEFAULT NULL,
              email VARCHAR(150) DEFAULT NULL,
              es_tutor_profesional BOOLEAN NOT NULL,
              CONSTRAINT FK_788BE768521E1991 FOREIGN KEY (empresa_id) REFERENCES empresa_colaboradora (id) NOT DEFERRABLE INITIALLY IMMEDIATE
            )
        SQL);
        $this->addSql('CREATE INDEX IDX_788BE768521E1991 ON contacto_empresa (empresa_id)');
        $this->addSql(<<<'SQL'
            CREATE TABLE convenio (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              empresa_id INTEGER NOT NULL,
              titulo VARCHAR(180) NOT NULL,
              descripcion CLOB DEFAULT NULL,
              fecha_inicio DATE NOT NULL --(DC2Type:date_immutable)
              ,
              fecha_fin DATE DEFAULT NULL --(DC2Type:date_immutable)
              ,
              tipo VARCHAR(80) NOT NULL,
              estado VARCHAR(30) NOT NULL,
              documento_url VARCHAR(255) DEFAULT NULL,
              observaciones CLOB DEFAULT NULL,
              CONSTRAINT FK_25577244521E1991 FOREIGN KEY (empresa_id) REFERENCES empresa_colaboradora (id) NOT DEFERRABLE INITIALLY IMMEDIATE
            )
        SQL);
        $this->addSql('CREATE INDEX IDX_25577244521E1991 ON convenio (empresa_id)');
        $this->addSql(<<<'SQL'
            CREATE TABLE convenio_alerta (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              convenio_id INTEGER NOT NULL,
              mensaje VARCHAR(255) NOT NULL,
              nivel VARCHAR(20) NOT NULL,
              activa BOOLEAN NOT NULL,
              creada_en DATETIME NOT NULL --(DC2Type:datetime_immutable)
              ,
              CONSTRAINT FK_1681E7D7F9D43F2A FOREIGN KEY (convenio_id) REFERENCES convenio (id) NOT DEFERRABLE INITIALLY IMMEDIATE
            )
        SQL);
        $this->addSql('CREATE INDEX IDX_1681E7D7F9D43F2A ON convenio_alerta (convenio_id)');
        $this->addSql(<<<'SQL'
            CREATE TABLE convenio_checklist_item (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              convenio_id INTEGER NOT NULL,
              label VARCHAR(180) NOT NULL,
              completed BOOLEAN NOT NULL,
              created_at DATETIME NOT NULL --(DC2Type:datetime_immutable)
              ,
              CONSTRAINT FK_FA7F8941F9D43F2A FOREIGN KEY (convenio_id) REFERENCES convenio (id) NOT DEFERRABLE INITIALLY IMMEDIATE
            )
        SQL);
        $this->addSql('CREATE INDEX IDX_FA7F8941F9D43F2A ON convenio_checklist_item (convenio_id)');
        $this->addSql(<<<'SQL'
            CREATE TABLE convenio_documento (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              convenio_id INTEGER NOT NULL,
              nombre VARCHAR(150) NOT NULL,
              tipo VARCHAR(60) DEFAULT NULL,
              url VARCHAR(255) DEFAULT NULL,
              uploaded_at DATETIME NOT NULL --(DC2Type:datetime_immutable)
              ,
              CONSTRAINT FK_704F2FB7F9D43F2A FOREIGN KEY (convenio_id) REFERENCES convenio (id) NOT DEFERRABLE INITIALLY IMMEDIATE
            )
        SQL);
        $this->addSql('CREATE INDEX IDX_704F2FB7F9D43F2A ON convenio_documento (convenio_id)');
        $this->addSql(<<<'SQL'
            CREATE TABLE convenio_workflow_evento (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              convenio_id INTEGER NOT NULL,
              estado VARCHAR(40) NOT NULL,
              comentario CLOB DEFAULT NULL,
              registrado_en DATETIME NOT NULL --(DC2Type:datetime_immutable)
              ,
              CONSTRAINT FK_A35A1ED1F9D43F2A FOREIGN KEY (convenio_id) REFERENCES convenio (id) NOT DEFERRABLE INITIALLY IMMEDIATE
            )
        SQL);
        $this->addSql('CREATE INDEX IDX_A35A1ED1F9D43F2A ON convenio_workflow_evento (convenio_id)');
        $this->addSql(<<<'SQL'
            CREATE TABLE empresa_colaboradora (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              nombre VARCHAR(150) NOT NULL,
              sector VARCHAR(120) DEFAULT NULL,
              direccion VARCHAR(255) DEFAULT NULL,
              ciudad VARCHAR(100) DEFAULT NULL,
              provincia VARCHAR(100) DEFAULT NULL,
              pais VARCHAR(100) DEFAULT NULL,
              telefono VARCHAR(50) DEFAULT NULL,
              email VARCHAR(150) DEFAULT NULL,
              web VARCHAR(150) DEFAULT NULL,
              estado_colaboracion VARCHAR(30) NOT NULL,
              fecha_alta DATE NOT NULL --(DC2Type:date_immutable)
              ,
              observaciones CLOB DEFAULT NULL
            )
        SQL);
        $this->addSql(<<<'SQL'
            CREATE TABLE empresa_documento (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              empresa_id INTEGER NOT NULL,
              nombre VARCHAR(150) NOT NULL,
              tipo VARCHAR(80) DEFAULT NULL,
              url VARCHAR(255) DEFAULT NULL,
              uploaded_at DATETIME NOT NULL --(DC2Type:datetime_immutable)
              ,
              CONSTRAINT FK_BA07BCB8521E1991 FOREIGN KEY (empresa_id) REFERENCES empresa_colaboradora (id) NOT DEFERRABLE INITIALLY IMMEDIATE
            )
        SQL);
        $this->addSql('CREATE INDEX IDX_BA07BCB8521E1991 ON empresa_documento (empresa_id)');
        $this->addSql(<<<'SQL'
            CREATE TABLE empresa_etiqueta (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              empresa_id INTEGER NOT NULL,
              nombre VARCHAR(80) NOT NULL,
              color_hex VARCHAR(32) DEFAULT NULL,
              created_at DATETIME NOT NULL --(DC2Type:datetime_immutable)
              ,
              CONSTRAINT FK_6DD5E1F1521E1991 FOREIGN KEY (empresa_id) REFERENCES empresa_colaboradora (id) NOT DEFERRABLE INITIALLY IMMEDIATE
            )
        SQL);
        $this->addSql('CREATE INDEX IDX_6DD5E1F1521E1991 ON empresa_etiqueta (empresa_id)');
        $this->addSql(<<<'SQL'
            CREATE TABLE empresa_mensaje (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              solicitud_id INTEGER NOT NULL,
              autor VARCHAR(20) NOT NULL,
              texto CLOB NOT NULL,
              created_at DATETIME NOT NULL --(DC2Type:datetime_immutable)
              ,
              CONSTRAINT FK_1224D6011CB9D6E4 FOREIGN KEY (solicitud_id) REFERENCES empresa_solicitud (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
            )
        SQL);
        $this->addSql('CREATE INDEX IDX_1224D6011CB9D6E4 ON empresa_mensaje (solicitud_id)');
        $this->addSql(<<<'SQL'
            CREATE TABLE empresa_nota (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              empresa_id INTEGER NOT NULL,
              autor VARCHAR(120) NOT NULL,
              contenido CLOB NOT NULL,
              created_at DATETIME NOT NULL --(DC2Type:datetime_immutable)
              ,
              CONSTRAINT FK_AD8C691E521E1991 FOREIGN KEY (empresa_id) REFERENCES empresa_colaboradora (id) NOT DEFERRABLE INITIALLY IMMEDIATE
            )
        SQL);
        $this->addSql('CREATE INDEX IDX_AD8C691E521E1991 ON empresa_nota (empresa_id)');
        $this->addSql(<<<'SQL'
            CREATE TABLE empresa_solicitud (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              nombre_empresa VARCHAR(150) NOT NULL,
              cif VARCHAR(32) DEFAULT NULL,
              sector VARCHAR(120) DEFAULT NULL,
              ciudad VARCHAR(100) DEFAULT NULL,
              web VARCHAR(150) DEFAULT NULL,
              descripcion CLOB DEFAULT NULL,
              contacto_nombre VARCHAR(150) NOT NULL,
              contacto_email VARCHAR(150) NOT NULL,
              contacto_telefono VARCHAR(50) DEFAULT NULL,
              token VARCHAR(64) NOT NULL,
              estado VARCHAR(30) NOT NULL,
              created_at DATETIME NOT NULL --(DC2Type:datetime_immutable)
              ,
              updated_at DATETIME NOT NULL --(DC2Type:datetime_immutable)
              ,
              email_verificado_en DATETIME DEFAULT NULL --(DC2Type:datetime_immutable)
              ,
              aprobado_en DATETIME DEFAULT NULL --(DC2Type:datetime_immutable)
              ,
              rejection_reason CLOB DEFAULT NULL,
              portal_token VARCHAR(64) NOT NULL
            )
        SQL);
        $this->addSql('CREATE UNIQUE INDEX UNIQ_9A64EEBF5F37A13B ON empresa_solicitud (token)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_9A64EEBFF7DA88A9 ON empresa_solicitud (portal_token)');
        $this->addSql(<<<'SQL'
            CREATE TABLE estudiante (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              nombre VARCHAR(120) NOT NULL,
              apellido VARCHAR(120) NOT NULL,
              dni VARCHAR(16) NOT NULL,
              email VARCHAR(150) NOT NULL,
              telefono VARCHAR(50) DEFAULT NULL,
              grado VARCHAR(120) DEFAULT NULL,
              curso VARCHAR(30) DEFAULT NULL,
              expediente VARCHAR(30) DEFAULT NULL,
              estado VARCHAR(30) NOT NULL
            )
        SQL);
        $this->addSql('CREATE UNIQUE INDEX UNIQ_3B3F3FAD7F8F253B ON estudiante (dni)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_3B3F3FADE7927C74 ON estudiante (email)');
        $this->addSql(<<<'SQL'
            CREATE TABLE evaluacion_final (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              asignacion_id INTEGER NOT NULL,
              fecha DATE NOT NULL --(DC2Type:date_immutable)
              ,
              valoracion_empresa CLOB DEFAULT NULL,
              valoracion_estudiante CLOB DEFAULT NULL,
              valoracion_tutor_academico CLOB DEFAULT NULL,
              conclusiones CLOB DEFAULT NULL,
              CONSTRAINT FK_EC50BBA6D3B92F9E FOREIGN KEY (asignacion_id) REFERENCES asignacion_practica (id) NOT DEFERRABLE INITIALLY IMMEDIATE
            )
        SQL);
        $this->addSql('CREATE UNIQUE INDEX UNIQ_EC50BBA6D3B92F9E ON evaluacion_final (asignacion_id)');
        $this->addSql(<<<'SQL'
            CREATE TABLE seguimiento (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              asignacion_id INTEGER NOT NULL,
              fecha DATE NOT NULL --(DC2Type:date_immutable)
              ,
              tipo VARCHAR(50) NOT NULL,
              descripcion CLOB DEFAULT NULL,
              accion_requerida CLOB DEFAULT NULL,
              documento_url VARCHAR(255) DEFAULT NULL,
              CONSTRAINT FK_1B2181DD3B92F9E FOREIGN KEY (asignacion_id) REFERENCES asignacion_practica (id) NOT DEFERRABLE INITIALLY IMMEDIATE
            )
        SQL);
        $this->addSql('CREATE INDEX IDX_1B2181DD3B92F9E ON seguimiento (asignacion_id)');
        $this->addSql(<<<'SQL'
            CREATE TABLE tutor_academico (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              nombre VARCHAR(120) NOT NULL,
              apellido VARCHAR(120) NOT NULL,
              email VARCHAR(150) NOT NULL,
              telefono VARCHAR(50) DEFAULT NULL,
              departamento VARCHAR(120) DEFAULT NULL,
              especialidad VARCHAR(120) DEFAULT NULL,
              activo BOOLEAN NOT NULL
            )
        SQL);
        $this->addSql('CREATE UNIQUE INDEX UNIQ_1C78E9DFE7927C74 ON tutor_academico (email)');
        $this->addSql(<<<'SQL'
            CREATE TABLE tutor_profesional (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              empresa_id INTEGER NOT NULL,
              nombre VARCHAR(150) NOT NULL,
              email VARCHAR(150) DEFAULT NULL,
              telefono VARCHAR(50) DEFAULT NULL,
              cargo VARCHAR(120) DEFAULT NULL,
              certificaciones CLOB DEFAULT NULL,
              activo BOOLEAN NOT NULL,
              CONSTRAINT FK_F9766148521E1991 FOREIGN KEY (empresa_id) REFERENCES empresa_colaboradora (id) NOT DEFERRABLE INITIALLY IMMEDIATE
            )
        SQL);
        $this->addSql('CREATE INDEX IDX_F9766148521E1991 ON tutor_profesional (empresa_id)');
        $this->addSql(<<<'SQL'
            CREATE TABLE users (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              username VARCHAR(180) NOT NULL,
              roles CLOB NOT NULL --(DC2Type:json)
              ,
              password VARCHAR(255) NOT NULL,
              full_name VARCHAR(255) DEFAULT NULL
            )
        SQL);
        $this->addSql('CREATE UNIQUE INDEX UNIQ_1483A5E9F85E0677 ON users (username)');
        $this->addSql(<<<'SQL'
            CREATE TABLE messenger_messages (
              id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
              body CLOB NOT NULL,
              headers CLOB NOT NULL,
              queue_name VARCHAR(190) NOT NULL,
              created_at DATETIME NOT NULL --(DC2Type:datetime_immutable)
              ,
              available_at DATETIME NOT NULL --(DC2Type:datetime_immutable)
              ,
              delivered_at DATETIME DEFAULT NULL --(DC2Type:datetime_immutable)
            )
        SQL);
        $this->addSql('CREATE INDEX IDX_75EA56E0FB7336F0 ON messenger_messages (queue_name)');
        $this->addSql('CREATE INDEX IDX_75EA56E0E3BD61CE ON messenger_messages (available_at)');
        $this->addSql('CREATE INDEX IDX_75EA56E016BA31DB ON messenger_messages (delivered_at)');
    }

    public function down(Schema $schema): void
    {
        $this->throwIrreversibleMigrationException(
            'Initial schema migration should not be rolled back automatically.',
        );
    }
}
