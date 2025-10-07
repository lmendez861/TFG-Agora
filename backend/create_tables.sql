-- Script SQL para crear todas las tablas de Ágora con sistema de bots

-- Tabla de roles
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

-- Tabla de usuarios (con campo is_bot añadido)
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) DEFAULT NULL,
    creado_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_login DATETIME DEFAULT NULL,
    rol_id INT NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    is_bot TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (rol_id) REFERENCES roles(id)
);

-- Tabla de grupos
CREATE TABLE IF NOT EXISTS grupos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT DEFAULT NULL,
    creado_por_id INT NOT NULL,
    creado_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    FOREIGN KEY (creado_por_id) REFERENCES usuarios(id)
);

-- Tabla de membresías (usuarios en grupos)
CREATE TABLE IF NOT EXISTS membresias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    grupo_id INT NOT NULL,
    fecha_union DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (grupo_id) REFERENCES grupos(id),
    UNIQUE KEY unique_membership (usuario_id, grupo_id)
);

-- Tabla de bots
CREATE TABLE IF NOT EXISTS bots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    creador_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    tipo ENUM('basico', 'reglas', 'ia') NOT NULL,
    personalidad TEXT DEFAULT NULL,
    modelo_asociado VARCHAR(100) DEFAULT NULL,
    scope ENUM('privado', 'grupo') NOT NULL,
    descripcion TEXT DEFAULT NULL,
    avatar_url VARCHAR(255) DEFAULT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME DEFAULT NULL,
    FOREIGN KEY (creador_id) REFERENCES usuarios(id)
);

-- Tabla de respuestas de bots
CREATE TABLE IF NOT EXISTS bot_respuestas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bot_id INT NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    respuesta TEXT NOT NULL,
    prioridad INT NOT NULL DEFAULT 1,
    es_regex TINYINT(1) NOT NULL DEFAULT 0,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
);

-- Tabla de relación grupos-bots
CREATE TABLE IF NOT EXISTS grupo_bots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grupo_id INT NOT NULL,
    bot_id INT NOT NULL,
    agregado_por_id INT NOT NULL,
    fecha_agregado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    permisos JSON DEFAULT NULL,
    FOREIGN KEY (grupo_id) REFERENCES grupos(id),
    FOREIGN KEY (bot_id) REFERENCES bots(id),
    FOREIGN KEY (agregado_por_id) REFERENCES usuarios(id),
    UNIQUE KEY unique_group_bot (grupo_id, bot_id)
);

-- Tabla de configuración de bots
CREATE TABLE IF NOT EXISTS bot_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bot_id INT NOT NULL,
    usuario_id INT DEFAULT NULL,
    grupo_id INT DEFAULT NULL,
    idioma VARCHAR(10) DEFAULT 'es',
    tono VARCHAR(50) DEFAULT 'amigable',
    respuestas_automaticas TINYINT(1) NOT NULL DEFAULT 1,
    threshold_ia DOUBLE PRECISION DEFAULT 0.7,
    configuracion_personalizada JSON DEFAULT NULL,
    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (grupo_id) REFERENCES grupos(id)
);

-- Tabla de multimedia (stickers, gifs, emojis)
CREATE TABLE IF NOT EXISTS multimedia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subido_por_id INT DEFAULT NULL,
    nombre VARCHAR(100) NOT NULL,
    tipo ENUM('sticker', 'gif', 'emoji', 'imagen') NOT NULL,
    url VARCHAR(255) NOT NULL,
    thumbnail_url VARCHAR(255) DEFAULT NULL,
    tags JSON DEFAULT NULL,
    categoria VARCHAR(100) DEFAULT NULL,
    publico TINYINT(1) NOT NULL DEFAULT 1,
    tamaño_bytes INT DEFAULT NULL,
    formato VARCHAR(10) DEFAULT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subido_por_id) REFERENCES usuarios(id)
);

-- Tabla de conversaciones
CREATE TABLE IF NOT EXISTS conversaciones (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) DEFAULT NULL,
    creado_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo TINYINT(1) NOT NULL DEFAULT 1
);

-- Tabla de mensajes (actualizada con campos de bots y multimedia)
CREATE TABLE IF NOT EXISTS mensajes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversacion_id BIGINT DEFAULT NULL,
    grupo_id INT DEFAULT NULL,
    usuario_id INT NOT NULL,
    contenido TEXT DEFAULT NULL,
    tipo ENUM('texto', 'archivo', 'sticker', 'gif', 'bot', 'multimedia') NOT NULL DEFAULT 'texto',
    autor_tipo ENUM('usuario', 'bot') NOT NULL DEFAULT 'usuario',
    bot_id INT DEFAULT NULL,
    multimedia_id INT DEFAULT NULL,
    creado_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (conversacion_id) REFERENCES conversaciones(id),
    FOREIGN KEY (grupo_id) REFERENCES grupos(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (bot_id) REFERENCES bots(id),
    FOREIGN KEY (multimedia_id) REFERENCES multimedia(id)
);

-- Tabla de archivos
CREATE TABLE IF NOT EXISTS archivos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mensaje_id BIGINT NOT NULL,
    nombre_original VARCHAR(255) NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    tamaño_bytes INT NOT NULL,
    tipo_mime VARCHAR(100) NOT NULL,
    subido_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mensaje_id) REFERENCES mensajes(id) ON DELETE CASCADE
);

-- Insertar roles básicos
INSERT IGNORE INTO roles (id, nombre) VALUES 
(1, 'admin'),
(2, 'usuario'),
(3, 'moderador');

-- Insertar usuarios básicos
INSERT IGNORE INTO usuarios (id, username, email, password_hash, nombre, rol_id, activo, is_bot) VALUES 
(1, 'admin', 'admin@agora.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador', 1, 1, 0),
(2, 'moderador', 'mod@agora.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Moderador', 3, 1, 0),
(3, 'luis', 'luis@agora.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Luis Ángel', 2, 1, 0),
(4, 'maria', 'maria@agora.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'María', 2, 1, 0),
(5, 'carlos', 'carlos@agora.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Carlos', 2, 1, 0);