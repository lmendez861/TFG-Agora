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

        $schemaTool = new SchemaTool($entityManager);
        $schemaTool->dropSchema($metadata);
        $schemaTool->createSchema($metadata);

        $fixture = new DemoDominioFixtures();
        $fixture->load($entityManager);

        $entityManager->clear();
    }
}
