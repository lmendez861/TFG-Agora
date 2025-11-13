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
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE asignacion_practica (id INT AUTO_INCREMENT NOT NULL, estudiante_id INT NOT NULL, convenio_id INT NOT NULL, empresa_id INT NOT NULL, tutor_academico_id INT NOT NULL, tutor_profesional_id INT DEFAULT NULL, fecha_inicio DATE NOT NULL COMMENT \'(DC2Type:date_immutable)\', fecha_fin DATE DEFAULT NULL COMMENT \'(DC2Type:date_immutable)\', modalidad VARCHAR(20) NOT NULL, horas_totales INT DEFAULT NULL, estado VARCHAR(20) NOT NULL, INDEX IDX_9774186459590C39 (estudiante_id), INDEX IDX_97741864F9D43F2A (convenio_id), INDEX IDX_97741864521E1991 (empresa_id), INDEX IDX_9774186431F6068A (tutor_academico_id), INDEX IDX_97741864DD48975E (tutor_profesional_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE contacto_empresa (id INT AUTO_INCREMENT NOT NULL, empresa_id INT NOT NULL, nombre VARCHAR(150) NOT NULL, cargo VARCHAR(120) DEFAULT NULL, telefono VARCHAR(50) DEFAULT NULL, email VARCHAR(150) DEFAULT NULL, es_tutor_profesional TINYINT(1) NOT NULL, INDEX IDX_788BE768521E1991 (empresa_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE convenio (id INT AUTO_INCREMENT NOT NULL, empresa_id INT NOT NULL, titulo VARCHAR(180) NOT NULL, descripcion LONGTEXT DEFAULT NULL, fecha_inicio DATE NOT NULL COMMENT \'(DC2Type:date_immutable)\', fecha_fin DATE DEFAULT NULL COMMENT \'(DC2Type:date_immutable)\', tipo VARCHAR(80) NOT NULL, estado VARCHAR(30) NOT NULL, documento_url VARCHAR(255) DEFAULT NULL, observaciones LONGTEXT DEFAULT NULL, INDEX IDX_25577244521E1991 (empresa_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE empresa_colaboradora (id INT AUTO_INCREMENT NOT NULL, nombre VARCHAR(150) NOT NULL, sector VARCHAR(120) DEFAULT NULL, direccion VARCHAR(255) DEFAULT NULL, ciudad VARCHAR(100) DEFAULT NULL, provincia VARCHAR(100) DEFAULT NULL, pais VARCHAR(100) DEFAULT NULL, telefono VARCHAR(50) DEFAULT NULL, email VARCHAR(150) DEFAULT NULL, web VARCHAR(150) DEFAULT NULL, estado_colaboracion VARCHAR(30) NOT NULL, fecha_alta DATE NOT NULL COMMENT \'(DC2Type:date_immutable)\', observaciones LONGTEXT DEFAULT NULL, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE estudiante (id INT AUTO_INCREMENT NOT NULL, nombre VARCHAR(120) NOT NULL, apellido VARCHAR(120) NOT NULL, dni VARCHAR(16) NOT NULL, email VARCHAR(150) NOT NULL, telefono VARCHAR(50) DEFAULT NULL, grado VARCHAR(120) DEFAULT NULL, curso VARCHAR(30) DEFAULT NULL, expediente VARCHAR(30) DEFAULT NULL, estado VARCHAR(30) NOT NULL, UNIQUE INDEX UNIQ_3B3F3FAD7F8F253B (dni), UNIQUE INDEX UNIQ_3B3F3FADE7927C74 (email), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE evaluacion_final (id INT AUTO_INCREMENT NOT NULL, asignacion_id INT NOT NULL, fecha DATE NOT NULL COMMENT \'(DC2Type:date_immutable)\', valoracion_empresa LONGTEXT DEFAULT NULL, valoracion_estudiante LONGTEXT DEFAULT NULL, valoracion_tutor_academico LONGTEXT DEFAULT NULL, conclusiones LONGTEXT DEFAULT NULL, UNIQUE INDEX UNIQ_EC50BBA6D3B92F9E (asignacion_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE seguimiento (id INT AUTO_INCREMENT NOT NULL, asignacion_id INT NOT NULL, fecha DATE NOT NULL COMMENT \'(DC2Type:date_immutable)\', tipo VARCHAR(50) NOT NULL, descripcion LONGTEXT DEFAULT NULL, accion_requerida LONGTEXT DEFAULT NULL, documento_url VARCHAR(255) DEFAULT NULL, INDEX IDX_1B2181DD3B92F9E (asignacion_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE tutor_academico (id INT AUTO_INCREMENT NOT NULL, nombre VARCHAR(120) NOT NULL, apellido VARCHAR(120) NOT NULL, email VARCHAR(150) NOT NULL, telefono VARCHAR(50) DEFAULT NULL, departamento VARCHAR(120) DEFAULT NULL, especialidad VARCHAR(120) DEFAULT NULL, activo TINYINT(1) NOT NULL, UNIQUE INDEX UNIQ_1C78E9DFE7927C74 (email), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE tutor_profesional (id INT AUTO_INCREMENT NOT NULL, empresa_id INT NOT NULL, nombre VARCHAR(150) NOT NULL, email VARCHAR(150) DEFAULT NULL, telefono VARCHAR(50) DEFAULT NULL, cargo VARCHAR(120) DEFAULT NULL, certificaciones LONGTEXT DEFAULT NULL, activo TINYINT(1) NOT NULL, INDEX IDX_F9766148521E1991 (empresa_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE asignacion_practica ADD CONSTRAINT FK_9774186459590C39 FOREIGN KEY (estudiante_id) REFERENCES estudiante (id)');
        $this->addSql('ALTER TABLE asignacion_practica ADD CONSTRAINT FK_97741864F9D43F2A FOREIGN KEY (convenio_id) REFERENCES convenio (id)');
        $this->addSql('ALTER TABLE asignacion_practica ADD CONSTRAINT FK_97741864521E1991 FOREIGN KEY (empresa_id) REFERENCES empresa_colaboradora (id)');
        $this->addSql('ALTER TABLE asignacion_practica ADD CONSTRAINT FK_9774186431F6068A FOREIGN KEY (tutor_academico_id) REFERENCES tutor_academico (id)');
        $this->addSql('ALTER TABLE asignacion_practica ADD CONSTRAINT FK_97741864DD48975E FOREIGN KEY (tutor_profesional_id) REFERENCES tutor_profesional (id)');
        $this->addSql('ALTER TABLE contacto_empresa ADD CONSTRAINT FK_788BE768521E1991 FOREIGN KEY (empresa_id) REFERENCES empresa_colaboradora (id)');
        $this->addSql('ALTER TABLE convenio ADD CONSTRAINT FK_25577244521E1991 FOREIGN KEY (empresa_id) REFERENCES empresa_colaboradora (id)');
        $this->addSql('ALTER TABLE evaluacion_final ADD CONSTRAINT FK_EC50BBA6D3B92F9E FOREIGN KEY (asignacion_id) REFERENCES asignacion_practica (id)');
        $this->addSql('ALTER TABLE seguimiento ADD CONSTRAINT FK_1B2181DD3B92F9E FOREIGN KEY (asignacion_id) REFERENCES asignacion_practica (id)');
        $this->addSql('ALTER TABLE tutor_profesional ADD CONSTRAINT FK_F9766148521E1991 FOREIGN KEY (empresa_id) REFERENCES empresa_colaboradora (id)');
        $this->addSql('ALTER TABLE archivos DROP FOREIGN KEY FK_188D04B34C54F362');
        $this->addSql('ALTER TABLE bots DROP FOREIGN KEY FK_71BFF0FD62F40C3D');
        $this->addSql('ALTER TABLE bot_config DROP FOREIGN KEY FK_2D8D7AA5DB38439E');
        $this->addSql('ALTER TABLE bot_config DROP FOREIGN KEY FK_2D8D7AA592C1C487');
        $this->addSql('ALTER TABLE bot_config DROP FOREIGN KEY FK_2D8D7AA59C833003');
        $this->addSql('ALTER TABLE bot_respuestas DROP FOREIGN KEY FK_E6DBA88692C1C487');
        $this->addSql('ALTER TABLE grupos DROP FOREIGN KEY FK_45842FEFE35D8C4');
        $this->addSql('ALTER TABLE grupo_bots DROP FOREIGN KEY FK_152619877D3AE4AE');
        $this->addSql('ALTER TABLE grupo_bots DROP FOREIGN KEY FK_1526198792C1C487');
        $this->addSql('ALTER TABLE grupo_bots DROP FOREIGN KEY FK_152619879C833003');
        $this->addSql('ALTER TABLE membresias DROP FOREIGN KEY FK_1AFE1AB19C833003');
        $this->addSql('ALTER TABLE membresias DROP FOREIGN KEY FK_1AFE1AB1DB38439E');
        $this->addSql('ALTER TABLE mensajes DROP FOREIGN KEY FK_6C929C8092C1C487');
        $this->addSql('ALTER TABLE mensajes DROP FOREIGN KEY FK_6C929C80DB38439E');
        $this->addSql('ALTER TABLE mensajes DROP FOREIGN KEY FK_6C929C809C833003');
        $this->addSql('ALTER TABLE mensajes DROP FOREIGN KEY FK_6C929C8020531EB8');
        $this->addSql('ALTER TABLE mensajes DROP FOREIGN KEY FK_6C929C80ABD5A1D6');
        $this->addSql('ALTER TABLE multimedia DROP FOREIGN KEY FK_61312863446C2E6');
        $this->addSql('ALTER TABLE usuarios DROP FOREIGN KEY FK_EF687F24BAB96C');
        $this->addSql('DROP TABLE archivos');
        $this->addSql('DROP TABLE bots');
        $this->addSql('DROP TABLE bot_config');
        $this->addSql('DROP TABLE bot_respuestas');
        $this->addSql('DROP TABLE conversaciones');
        $this->addSql('DROP TABLE grupos');
        $this->addSql('DROP TABLE grupo_bots');
        $this->addSql('DROP TABLE membresias');
        $this->addSql('DROP TABLE mensajes');
        $this->addSql('DROP TABLE multimedia');
        $this->addSql('DROP TABLE roles');
        $this->addSql('DROP TABLE usuarios');
        $this->addSql('ALTER TABLE messenger_messages CHANGE delivered_at delivered_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\'');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE archivos (id INT AUTO_INCREMENT NOT NULL, mensaje_id BIGINT NOT NULL, nombre_original VARCHAR(255) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_unicode_ci`, ruta VARCHAR(500) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_unicode_ci`, tam INT DEFAULT NULL, creado_at DATETIME NOT NULL, INDEX IDX_188D04B34C54F362 (mensaje_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE bots (id INT AUTO_INCREMENT NOT NULL, creador_id INT NOT NULL, nombre VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, tipo VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, personalidad LONGTEXT CHARACTER SET utf8mb4 DEFAULT NULL COLLATE `utf8mb4_unicode_ci`, modelo_asociado VARCHAR(100) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_unicode_ci`, scope VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, activo TINYINT(1) NOT NULL, fecha_creacion DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', fecha_actualizacion DATETIME DEFAULT \'NULL\' COMMENT \'(DC2Type:datetime_immutable)\', descripcion LONGTEXT CHARACTER SET utf8mb4 DEFAULT NULL COLLATE `utf8mb4_unicode_ci`, avatar_url VARCHAR(255) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_unicode_ci`, INDEX IDX_71BFF0FD62F40C3D (creador_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE bot_config (id INT AUTO_INCREMENT NOT NULL, bot_id INT NOT NULL, usuario_id INT DEFAULT NULL, grupo_id INT DEFAULT NULL, idioma VARCHAR(10) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_unicode_ci`, tono VARCHAR(50) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_unicode_ci`, respuestas_automaticas TINYINT(1) NOT NULL, threshold_ia DOUBLE PRECISION DEFAULT \'NULL\', configuracion_personalizada LONGTEXT CHARACTER SET utf8mb4 DEFAULT NULL COLLATE `utf8mb4_bin`, fecha_actualizacion DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX IDX_2D8D7AA592C1C487 (bot_id), INDEX IDX_2D8D7AA5DB38439E (usuario_id), INDEX IDX_2D8D7AA59C833003 (grupo_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE bot_respuestas (id INT AUTO_INCREMENT NOT NULL, bot_id INT NOT NULL, keyword VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, respuesta LONGTEXT CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, prioridad INT NOT NULL, es_regex TINYINT(1) NOT NULL, activo TINYINT(1) NOT NULL, fecha_creacion DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX IDX_E6DBA88692C1C487 (bot_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE conversaciones (id INT AUTO_INCREMENT NOT NULL, tipo VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, creado_at DATETIME NOT NULL, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE grupos (id INT AUTO_INCREMENT NOT NULL, creado_por_id INT NOT NULL, nombre VARCHAR(150) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, descripcion LONGTEXT CHARACTER SET utf8mb4 DEFAULT NULL COLLATE `utf8mb4_unicode_ci`, creado_at DATETIME NOT NULL, privado TINYINT(1) NOT NULL, INDEX IDX_45842FEFE35D8C4 (creado_por_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE grupo_bots (id INT AUTO_INCREMENT NOT NULL, grupo_id INT NOT NULL, bot_id INT NOT NULL, agregado_por_id INT NOT NULL, fecha_agregado DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', activo TINYINT(1) NOT NULL, permisos LONGTEXT CHARACTER SET utf8mb4 DEFAULT NULL COLLATE `utf8mb4_bin`, INDEX IDX_152619879C833003 (grupo_id), INDEX IDX_1526198792C1C487 (bot_id), INDEX IDX_152619877D3AE4AE (agregado_por_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE membresias (id INT AUTO_INCREMENT NOT NULL, grupo_id INT NOT NULL, usuario_id INT NOT NULL, rol_en_grupo VARCHAR(30) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, creado_at DATETIME NOT NULL, INDEX IDX_1AFE1AB19C833003 (grupo_id), INDEX IDX_1AFE1AB1DB38439E (usuario_id), UNIQUE INDEX UNIQ_1AFE1AB19C833003DB38439E (grupo_id, usuario_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE mensajes (id BIGINT AUTO_INCREMENT NOT NULL, conversacion_id INT DEFAULT NULL, grupo_id INT DEFAULT NULL, usuario_id INT NOT NULL, bot_id INT DEFAULT NULL, multimedia_id INT DEFAULT NULL, contenido LONGTEXT CHARACTER SET utf8mb4 DEFAULT NULL COLLATE `utf8mb4_unicode_ci`, tipo VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, autor_tipo VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, creado_at DATETIME NOT NULL, eliminado TINYINT(1) NOT NULL, INDEX IDX_6C929C8020531EB8 (multimedia_id), INDEX IDX_6C929C809C833003 (grupo_id), INDEX IDX_6C929C80DB38439E (usuario_id), INDEX IDX_6C929C8092C1C487 (bot_id), INDEX IDX_6C929C80ABD5A1D6 (conversacion_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE multimedia (id INT AUTO_INCREMENT NOT NULL, subido_por_id INT DEFAULT NULL, nombre VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, tipo VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, url VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, thumbnail_url VARCHAR(255) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_unicode_ci`, tags LONGTEXT CHARACTER SET utf8mb4 DEFAULT NULL COLLATE `utf8mb4_bin`, categoria VARCHAR(100) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_unicode_ci`, publico TINYINT(1) NOT NULL, fecha_creacion DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', tamaño_bytes INT DEFAULT NULL, formato VARCHAR(10) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_unicode_ci`, INDEX IDX_61312863446C2E6 (subido_por_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE roles (id INT NOT NULL, nombre VARCHAR(30) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE usuarios (id INT AUTO_INCREMENT NOT NULL, rol_id INT NOT NULL, username VARCHAR(50) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, email VARCHAR(120) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, password_hash VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, nombre VARCHAR(100) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_unicode_ci`, creado_at DATETIME NOT NULL, ultimo_login DATETIME DEFAULT \'NULL\', activo TINYINT(1) NOT NULL, is_bot TINYINT(1) NOT NULL, UNIQUE INDEX UNIQ_EF687F2F85E0677 (username), UNIQUE INDEX UNIQ_EF687F2E7927C74 (email), INDEX IDX_EF687F24BAB96C (rol_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('ALTER TABLE archivos ADD CONSTRAINT FK_188D04B34C54F362 FOREIGN KEY (mensaje_id) REFERENCES mensajes (id)');
        $this->addSql('ALTER TABLE bots ADD CONSTRAINT FK_71BFF0FD62F40C3D FOREIGN KEY (creador_id) REFERENCES usuarios (id)');
        $this->addSql('ALTER TABLE bot_config ADD CONSTRAINT FK_2D8D7AA5DB38439E FOREIGN KEY (usuario_id) REFERENCES usuarios (id)');
        $this->addSql('ALTER TABLE bot_config ADD CONSTRAINT FK_2D8D7AA592C1C487 FOREIGN KEY (bot_id) REFERENCES bots (id)');
        $this->addSql('ALTER TABLE bot_config ADD CONSTRAINT FK_2D8D7AA59C833003 FOREIGN KEY (grupo_id) REFERENCES grupos (id)');
        $this->addSql('ALTER TABLE bot_respuestas ADD CONSTRAINT FK_E6DBA88692C1C487 FOREIGN KEY (bot_id) REFERENCES bots (id)');
        $this->addSql('ALTER TABLE grupos ADD CONSTRAINT FK_45842FEFE35D8C4 FOREIGN KEY (creado_por_id) REFERENCES usuarios (id)');
        $this->addSql('ALTER TABLE grupo_bots ADD CONSTRAINT FK_152619877D3AE4AE FOREIGN KEY (agregado_por_id) REFERENCES usuarios (id)');
        $this->addSql('ALTER TABLE grupo_bots ADD CONSTRAINT FK_1526198792C1C487 FOREIGN KEY (bot_id) REFERENCES bots (id)');
        $this->addSql('ALTER TABLE grupo_bots ADD CONSTRAINT FK_152619879C833003 FOREIGN KEY (grupo_id) REFERENCES grupos (id)');
        $this->addSql('ALTER TABLE membresias ADD CONSTRAINT FK_1AFE1AB19C833003 FOREIGN KEY (grupo_id) REFERENCES grupos (id)');
        $this->addSql('ALTER TABLE membresias ADD CONSTRAINT FK_1AFE1AB1DB38439E FOREIGN KEY (usuario_id) REFERENCES usuarios (id)');
        $this->addSql('ALTER TABLE mensajes ADD CONSTRAINT FK_6C929C8092C1C487 FOREIGN KEY (bot_id) REFERENCES bots (id)');
        $this->addSql('ALTER TABLE mensajes ADD CONSTRAINT FK_6C929C80DB38439E FOREIGN KEY (usuario_id) REFERENCES usuarios (id)');
        $this->addSql('ALTER TABLE mensajes ADD CONSTRAINT FK_6C929C809C833003 FOREIGN KEY (grupo_id) REFERENCES grupos (id)');
        $this->addSql('ALTER TABLE mensajes ADD CONSTRAINT FK_6C929C8020531EB8 FOREIGN KEY (multimedia_id) REFERENCES multimedia (id)');
        $this->addSql('ALTER TABLE mensajes ADD CONSTRAINT FK_6C929C80ABD5A1D6 FOREIGN KEY (conversacion_id) REFERENCES conversaciones (id)');
        $this->addSql('ALTER TABLE multimedia ADD CONSTRAINT FK_61312863446C2E6 FOREIGN KEY (subido_por_id) REFERENCES usuarios (id)');
        $this->addSql('ALTER TABLE usuarios ADD CONSTRAINT FK_EF687F24BAB96C FOREIGN KEY (rol_id) REFERENCES roles (id)');
        $this->addSql('ALTER TABLE asignacion_practica DROP FOREIGN KEY FK_9774186459590C39');
        $this->addSql('ALTER TABLE asignacion_practica DROP FOREIGN KEY FK_97741864F9D43F2A');
        $this->addSql('ALTER TABLE asignacion_practica DROP FOREIGN KEY FK_97741864521E1991');
        $this->addSql('ALTER TABLE asignacion_practica DROP FOREIGN KEY FK_9774186431F6068A');
        $this->addSql('ALTER TABLE asignacion_practica DROP FOREIGN KEY FK_97741864DD48975E');
        $this->addSql('ALTER TABLE contacto_empresa DROP FOREIGN KEY FK_788BE768521E1991');
        $this->addSql('ALTER TABLE convenio DROP FOREIGN KEY FK_25577244521E1991');
        $this->addSql('ALTER TABLE evaluacion_final DROP FOREIGN KEY FK_EC50BBA6D3B92F9E');
        $this->addSql('ALTER TABLE seguimiento DROP FOREIGN KEY FK_1B2181DD3B92F9E');
        $this->addSql('ALTER TABLE tutor_profesional DROP FOREIGN KEY FK_F9766148521E1991');
        $this->addSql('DROP TABLE asignacion_practica');
        $this->addSql('DROP TABLE contacto_empresa');
        $this->addSql('DROP TABLE convenio');
        $this->addSql('DROP TABLE empresa_colaboradora');
        $this->addSql('DROP TABLE estudiante');
        $this->addSql('DROP TABLE evaluacion_final');
        $this->addSql('DROP TABLE seguimiento');
        $this->addSql('DROP TABLE tutor_academico');
        $this->addSql('DROP TABLE tutor_profesional');
        $this->addSql('ALTER TABLE messenger_messages CHANGE delivered_at delivered_at DATETIME DEFAULT \'NULL\' COMMENT \'(DC2Type:datetime_immutable)\'');
    }
}
