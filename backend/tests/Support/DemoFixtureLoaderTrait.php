<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Prueba automatizada: documenta el comportamiento esperado y protege integraciones entre piezas.
 * Relaciones: Conecta con App/DataFixtures/DemoDominioFixtures.
 */

namespace App\Tests\Support;

use App\DataFixtures\DemoDominioFixtures;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;

/**
 * Prueba automatizada: documenta el comportamiento esperado y protege integraciones entre piezas.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
trait DemoFixtureLoaderTrait
{
    /**
     * Caso de prueba que fija el comportamiento esperado de esta funcionalidad.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    protected function reloadDemoFixtures(EntityManagerInterface $entityManager): void
    {
        $metadata = $entityManager->getMetadataFactory()->getAllMetadata();

        if ($metadata === []) {
            return;
        }

        $entityManager->clear();
        $connection = $entityManager->getConnection();
        if (!$connection->isConnected()) {
            $connection->connect();
        }

        while ($connection->isTransactionActive()) {
            $connection->rollBack();
        }

        $schemaTool = new SchemaTool($entityManager);
        try {
            $schemaTool->dropSchema($metadata);
        } catch (\Throwable) {
            // Si el esquema todavia no existe, se continua con la recreacion limpia.
        }
        $schemaTool->createSchema($metadata);

        $fixture = new DemoDominioFixtures();
        $fixture->load($entityManager);

        $entityManager->clear();
    }
}
