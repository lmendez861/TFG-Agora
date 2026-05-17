<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Modulo de codigo del proyecto Agora.
 * Relaciones: Conexiones principales indicadas por imports, inyeccion de dependencias o rutas del propio archivo.
 */

namespace App;

use Symfony\Bundle\FrameworkBundle\Kernel\MicroKernelTrait;
use Symfony\Component\HttpKernel\Kernel as BaseKernel;

/**
 * Modulo de codigo del proyecto Agora.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
class Kernel extends BaseKernel
{
    use MicroKernelTrait;
}
