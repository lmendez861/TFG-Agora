<?php

namespace App\Tests\Support;

use App\DataFixtures\DemoDominioFixtures;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;

trait DemoFixtureLoaderTrait
{
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
