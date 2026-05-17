<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Prueba automatizada: documenta el comportamiento esperado y protege integraciones entre piezas.
 * Relaciones: Conexiones principales indicadas por imports, inyeccion de dependencias o rutas del propio archivo.
 */

use Symfony\Component\Dotenv\Dotenv;

require dirname(__DIR__).'/vendor/autoload.php';

if (method_exists(Dotenv::class, 'bootEnv')) {
    (new Dotenv())->bootEnv(dirname(__DIR__).'/.env');
}

if ($_SERVER['APP_DEBUG']) {
    umask(0000);
}
