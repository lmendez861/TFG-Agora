<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Comando de consola Symfony: reinicia los datos de demostracion con un escenario coherente para revisiones funcionales.
 * Relaciones: Conecta con App/Entity/AsignacionPractica, App/Entity/ContactoEmpresa, App/Entity/Convenio, App/Entity/ConvenioAlerta, App/Entity/ConvenioChecklistItem, App/Entity/ConvenioDocumento, App/Entity/ConvenioWorkflowEvento, App/Entity/EmpresaColaboradora, App/Entity/EmpresaDocumento, App/Entity/EmpresaEtiqueta, App/Entity/EmpresaMensaje, App/Entity/EmpresaNota, App/Entity/EmpresaPortalCuenta, App/Entity/EmpresaSolicitud, App/Entity/Estudiante, App/Entity/EvaluacionFinal, App/Entity/Seguimiento, App/Entity/TutorAcademico, App/Entity/TutorProfesional, App/Entity/User, App/Service/BootstrapSnapshotProvider.
 */

namespace App\Command;

use App\Entity\AsignacionPractica;
use App\Entity\ContactoEmpresa;
use App\Entity\Convenio;
use App\Entity\ConvenioAlerta;
use App\Entity\ConvenioChecklistItem;
use App\Entity\ConvenioDocumento;
use App\Entity\ConvenioWorkflowEvento;
use App\Entity\EmpresaColaboradora;
use App\Entity\EmpresaDocumento;
use App\Entity\EmpresaEtiqueta;
use App\Entity\EmpresaMensaje;
use App\Entity\EmpresaNota;
use App\Entity\EmpresaPortalCuenta;
use App\Entity\EmpresaSolicitud;
use App\Entity\Estudiante;
use App\Entity\EvaluacionFinal;
use App\Entity\Seguimiento;
use App\Entity\TutorAcademico;
use App\Entity\TutorProfesional;
use App\Entity\User;
use App\Service\BootstrapSnapshotProvider;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Platforms\PostgreSQLPlatform;
use Doctrine\DBAL\Platforms\SqlitePlatform;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(
    name: 'app:demo:refresh',
    description: 'Reinicia la base de datos funcional y carga un escenario de demo coherente para pruebas.'
)]
final class RefreshDemoDataCommand extends Command
{
    private const DEMO_PDF_BYTES = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 220 220]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n";
    private const DEMO_XLSX_BASE64 = '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';

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly BootstrapSnapshotProvider $snapshotProvider,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption(
                'force',
                null,
                InputOption::VALUE_NONE,
                'Ejecuta el reseteo destructivo. Sin este flag el comando solo informa.'
            )
            ->addOption(
                'keep-documents',
                null,
                InputOption::VALUE_NONE,
                'Conserva el contenido del almacenamiento documental en disco.'
            );
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        if (!$input->getOption('force')) {
            $io->warning('Este comando borra los datos actuales y vuelve a cargar un escenario de demostracion.');
            $io->text('Vuelve a lanzarlo con --force cuando quieras aplicarlo.');

            return Command::SUCCESS;
        }

        $io->title('Reinicio de datos de demostracion');

        $this->purgeDatabase($io);
        if (!$input->getOption('keep-documents')) {
            $this->resetDocumentStorage($io);
        }

        $this->seedApiUsers();
        $this->seedApprovedScenarios();
        $this->seedPendingAndRejectedRequests();

        $this->entityManager->flush();
        $this->snapshotProvider->invalidate();

        $io->success('Datos demo cargados correctamente.');
        $io->section('Credenciales internas');
        $io->listing([
            'admin / admin123',
            'monitor / monitor123',
            'profesora / Abrete01',
            'profesor / Abrete01',
            'coordinador / coordinador123',
        ]);

        $io->section('Cuentas demo del portal externo');
        $io->listing([
            'cristina.merino@prealta.example.org / EmpresaDemo00!',
            'laura.marquez@novaform.example.org / EmpresaDemo01!',
            'sergio.pastor@biosync.example.org / EmpresaDemo02!',
            'ines.romero@movitrack.example.org / EmpresaDemo03!',
            'marta.ibanez@hostelink.example.org / EmpresaDemo04!',
            'alberto.navarro@ecopack.example.org / EmpresaDemo05!',
        ]);

        return Command::SUCCESS;
    }

    private function purgeDatabase(SymfonyStyle $io): void
    {
        $connection = $this->entityManager->getConnection();
        $schemaManager = $connection->createSchemaManager();
        $tableNames = array_values(array_filter(
            $schemaManager->listTableNames(),
            static fn (string $name): bool => $name !== 'doctrine_migration_versions'
        ));

        if ($tableNames === []) {
            $io->note('No se encontraron tablas funcionales para truncar.');

            return;
        }

        $platform = $connection->getDatabasePlatform();
        $io->text(sprintf('Truncando %d tablas en %s.', count($tableNames), $platform::class));

        if ($platform instanceof PostgreSQLPlatform) {
            $quoted = implode(', ', array_map([$connection, 'quoteIdentifier'], $tableNames));
            $connection->executeStatement(sprintf('TRUNCATE TABLE %s RESTART IDENTITY CASCADE', $quoted));

            return;
        }

        if ($platform instanceof SqlitePlatform) {
            $connection->executeStatement('PRAGMA foreign_keys = OFF');
            foreach ($tableNames as $tableName) {
                $connection->executeStatement(sprintf('DELETE FROM %s', $connection->quoteIdentifier($tableName)));
            }
            $connection->executeStatement("DELETE FROM sqlite_sequence WHERE name != 'doctrine_migration_versions'");
            $connection->executeStatement('PRAGMA foreign_keys = ON');

            return;
        }

        foreach ($tableNames as $tableName) {
            $connection->executeStatement(sprintf('DELETE FROM %s', $connection->quoteIdentifier($tableName)));
        }
    }

    private function resetDocumentStorage(SymfonyStyle $io): void
    {
        $storageDir = (string) ($_SERVER['APP_DOCUMENT_STORAGE_DIR'] ?? getenv('APP_DOCUMENT_STORAGE_DIR') ?: '');
        if ($storageDir === '' || !is_dir($storageDir)) {
            return;
        }

        $io->text(sprintf('Limpiando almacenamiento documental en %s.', $storageDir));

        $items = scandir($storageDir);
        if ($items === false) {
            return;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $this->deletePath($storageDir . DIRECTORY_SEPARATOR . $item);
        }
    }

    private function deletePath(string $path): void
    {
        if (is_link($path) || is_file($path)) {
            @unlink($path);

            return;
        }

        if (!is_dir($path)) {
            return;
        }

        $items = scandir($path);
        if ($items !== false) {
            foreach ($items as $item) {
                if ($item === '.' || $item === '..') {
                    continue;
                }

                $this->deletePath($path . DIRECTORY_SEPARATOR . $item);
            }
        }

        @rmdir($path);
    }

    private function documentStorageRoot(): string
    {
        $storageDir = (string) ($_SERVER['APP_DOCUMENT_STORAGE_DIR'] ?? getenv('APP_DOCUMENT_STORAGE_DIR') ?: 'var/document_storage');
        if (preg_match('/^(?:[A-Za-z]:)?[\/\\\\]/', $storageDir)) {
            return str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $storageDir);
        }

        return dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $storageDir);
    }

    private function writeStoredDemoDocument(string $relativePath, string $contents): string
    {
        $absolutePath = $this->documentStorageRoot() . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $relativePath);
        $filesystem = new Filesystem();
        $filesystem->mkdir(dirname($absolutePath), 0775);
        file_put_contents($absolutePath, $contents);

        return $relativePath;
    }

    private function guessDemoDocumentExtension(?string $type): string
    {
        return match (strtoupper((string) $type)) {
            'PDF' => 'pdf',
            'WORD', 'DOC', 'DOCX' => 'docx',
            'EXCEL', 'XLS', 'XLSX' => 'xlsx',
            default => 'bin',
        };
    }

    private function guessDemoMimeType(?string $type): string
    {
        return match (strtoupper((string) $type)) {
            'PDF' => 'application/pdf',
            'WORD', 'DOC', 'DOCX' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'EXCEL', 'XLS', 'XLSX' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            default => 'application/octet-stream',
        };
    }

    private function buildDemoDocumentBytes(string $nombre, ?string $type): string
    {
        return match (strtoupper((string) $type)) {
            'PDF' => self::DEMO_PDF_BYTES,
            'EXCEL', 'XLS', 'XLSX' => base64_decode(self::DEMO_XLSX_BASE64, true) ?: 'demo',
            'WORD', 'DOC', 'DOCX' => file_get_contents(dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . 'docs' . DIRECTORY_SEPARATOR . 'memoria-final.docx') ?: $nombre,
            default => $nombre,
        };
    }

    private function slugifyForStorage(string $value): string
    {
        $normalized = preg_replace('/[^a-z0-9]+/i', '-', trim($value)) ?? 'demo-documento';
        $normalized = trim($normalized, '-');

        return $normalized !== '' ? strtolower($normalized) : 'demo-documento';
    }

    private function buildConvenioDocumentoUrl(?string $documentoUrl): ?string
    {
        if ($documentoUrl === null) {
            return null;
        }

        return preg_match('/example\.(org|com|local)|docs\.example\.com/i', $documentoUrl) === 1
            ? null
            : $documentoUrl;
    }

    private function createDemoEmpresaDocumento(EmpresaColaboradora $empresa, array $documentoData): EmpresaDocumento
    {
        $type = strtoupper((string) ($documentoData['tipo'] ?? 'PDF'));
        $extension = $this->guessDemoDocumentExtension($type);
        $bytes = $this->buildDemoDocumentBytes((string) $documentoData['nombre'], $type);

        return (new EmpresaDocumento())
            ->setEmpresa($empresa)
            ->setNombre((string) $documentoData['nombre'])
            ->setTipo($type)
            ->setOriginalFilename($this->slugifyForStorage((string) $documentoData['nombre']) . '.' . $extension)
            ->setMimeType($this->guessDemoMimeType($type))
            ->setFileSizeBytes(strlen($bytes))
            ->setFileContentBase64(base64_encode($bytes))
            ->setStorageProvider('embedded_db')
            ->setUrl(null);
    }

    private function createDemoConvenioDocumento(Convenio $convenio, array $documentoData, string $empresaSlug): ConvenioDocumento
    {
        $type = strtoupper((string) ($documentoData['tipo'] ?? 'PDF'));
        $extension = $this->guessDemoDocumentExtension($type);
        $filename = $this->slugifyForStorage((string) $documentoData['nombre']) . '.' . $extension;
        $relativePath = sprintf('seed/%s/convenios/%s', $empresaSlug, $filename);
        $bytes = $this->buildDemoDocumentBytes((string) $documentoData['nombre'], $type);
        $this->writeStoredDemoDocument($relativePath, $bytes);

        return (new ConvenioDocumento())
            ->setConvenio($convenio)
            ->setNombre((string) $documentoData['nombre'])
            ->setTipo($type)
            ->setStoragePath($relativePath)
            ->setOriginalFilename($filename)
            ->setStorageProvider('external_fs')
            ->setUrl(null);
    }

    private function seedApiUsers(): void
    {
        $this->persistApiUser('admin', 'admin123', ['ROLE_ADMIN'], 'Administrador TFG');
        $this->persistApiUser('monitor', 'monitor123', ['ROLE_MONITOR'], 'Monitor tecnico');
        $this->persistApiUser('coordinador', 'coordinador123', ['ROLE_COORDINATOR'], 'Coordinador Centro');
        $this->persistApiUser('documentos', 'documentos123', ['ROLE_DOCUMENT_MANAGER'], 'Responsable documental');
        $this->persistApiUser('lectura', 'lectura123', ['ROLE_USER'], 'Solo lectura');
        $this->persistApiUser('profesora', 'Abrete01', ['ROLE_COORDINATOR'], 'Profesora evaluadora');
        $this->persistApiUser('profesor', 'Abrete01', ['ROLE_COORDINATOR'], 'Profesor evaluador');
    }

    private function persistApiUser(string $username, string $plainPassword, array $roles, string $fullName): void
    {
        $user = (new User())
            ->setUsername($username)
            ->setRoles($roles)
            ->setFullName($fullName);

        $user->setPassword($this->passwordHasher->hashPassword($user, $plainPassword));
        $this->entityManager->persist($user);
    }

    private function seedApprovedScenarios(): void
    {
        $tutorAcademicoA = $this->createTutorAcademico('Lucia', 'Benitez', 'lucia.benitez@centrofp.example.org', '910220301', 'Informatica', 'Analitica y aplicaciones web');
        $tutorAcademicoB = $this->createTutorAcademico('Rafael', 'Pozo', 'rafael.pozo@centrofp.example.org', '960330402', 'Sanidad', 'Sistemas clinicos y telemedicina');
        $tutorAcademicoC = $this->createTutorAcademico('Clara', 'Molina', 'clara.molina@centrofp.example.org', '954440503', 'Industria', 'Optimizacion y mejora de procesos');

        $this->entityManager->persist($tutorAcademicoA);
        $this->entityManager->persist($tutorAcademicoB);
        $this->entityManager->persist($tutorAcademicoC);

        $nova = $this->seedApprovedCompanyScenario([
            'solicitud' => [
                'nombreEmpresa' => 'NovaForm Sistemas de Aprendizaje, S.L.',
                'cif' => 'B45890123',
                'sector' => 'Tecnologia educativa',
                'ciudad' => 'Madrid',
                'web' => 'https://novaform.example.org',
                'descripcion' => 'Empresa orientada a analitica de aprendizaje, cuadros de mando y automatizacion de seguimiento academico.',
                'contactoNombre' => 'Laura Marquez',
                'contactoEmail' => 'laura.marquez@novaform.example.org',
                'contactoTelefono' => '910450601',
                'mensajes' => [
                    ['autor' => 'empresa', 'texto' => 'Hemos preparado el plan de acogida para el alumnado del ciclo DAM.'],
                    ['autor' => 'centro', 'texto' => 'Perfecto. Necesitamos tambien el horario previsto y el responsable de seguimiento.'],
                    ['autor' => 'empresa', 'texto' => 'Queda incorporado. El responsable sera Daniel Prieto y el horario sera mixto.'],
                ],
            ],
            'portal' => [
                'email' => 'laura.marquez@novaform.example.org',
                'displayName' => 'Laura Marquez',
                'password' => 'EmpresaDemo01!',
            ],
            'empresa' => [
                'direccion' => 'Calle Julian Camarillo 41',
                'provincia' => 'Madrid',
                'pais' => 'Espana',
                'telefono' => '910450600',
                'fechaAlta' => '2024-01-15',
                'observaciones' => 'Partner estable para perfiles de DAM y DAW con foco en paneles de seguimiento y reporting.',
                'contactoCargo' => 'Directora de talento',
                'tutorProfesional' => [
                    'nombre' => 'Daniel Prieto',
                    'email' => 'daniel.prieto@novaform.example.org',
                    'telefono' => '910450602',
                    'cargo' => 'Lead de producto academico',
                    'certificaciones' => 'Scrum Master | Power BI | Liderazgo de equipos',
                ],
                'etiqueta' => 'Partner estrategico',
                'notaAutor' => 'Coordinacion academica',
                'notaContenido' => 'Empresa muy receptiva. Conviene repetir colaboracion en la siguiente promocion.',
                'documento' => [
                    'nombre' => 'Plan de acogida DAM 2026',
                    'tipo' => 'PDF',
                    'url' => 'https://novaform.example.org/documentos/plan-acogida-dam-2026.pdf',
                ],
            ],
            'convenios' => [
                [
                    'titulo' => 'Convenio analitica de aprendizaje 2025/2026',
                    'descripcion' => 'Proyecto de seguimiento de indicadores academicos y analitica para alumnado de DAM y DAW.',
                    'fechaInicio' => '2025-09-01',
                    'fechaFin' => '2026-02-28',
                    'tipo' => 'Practicas curriculares',
                    'estado' => 'vigente',
                    'documentoUrl' => 'https://novaform.example.org/documentos/convenio-analitica-2025-2026.pdf',
                    'observaciones' => 'Incluye sesiones quincenales con el tutor profesional.',
                    'checklist' => [
                        ['label' => 'Convenio firmado', 'completed' => true],
                        ['label' => 'Plan de acogida aprobado', 'completed' => true],
                        ['label' => 'Seguro escolar validado', 'completed' => true],
                    ],
                    'documentos' => [
                        ['nombre' => 'Convenio firmado', 'tipo' => 'PDF', 'url' => 'https://novaform.example.org/documentos/convenio-firmado.pdf'],
                        ['nombre' => 'Calendario de seguimiento', 'tipo' => 'XLSX', 'url' => 'https://novaform.example.org/documentos/calendario-seguimiento.xlsx'],
                    ],
                    'alertas' => [
                        ['mensaje' => 'Renovacion prevista para febrero de 2026.', 'nivel' => 'info'],
                    ],
                    'workflow' => [
                        ['estado' => 'borrador', 'comentario' => 'Propuesta inicial validada por el centro.'],
                        ['estado' => 'firmado', 'comentario' => 'Firmado por ambas partes.'],
                        ['estado' => 'vigente', 'comentario' => 'Asignaciones activas en DAM.'],
                    ],
                ],
            ],
            'estudiantes' => [
                [
                    'nombre' => 'Alicia',
                    'apellido' => 'Torres',
                    'dni' => '11223344A',
                    'email' => 'alicia.torres@alumnadofp.example.org',
                    'telefono' => '600110210',
                    'grado' => 'Desarrollo de Aplicaciones Multiplataforma',
                    'curso' => '2o',
                    'expediente' => 'DAM-24-017',
                    'estado' => 'en_practicas',
                    'asignacion' => [
                        'fechaInicio' => '2025-10-01',
                        'fechaFin' => '2026-01-31',
                        'modalidad' => 'hibrida',
                        'horasTotales' => 320,
                        'estado' => 'en_curso',
                        'seguimientos' => [
                            ['fecha' => '2025-10-15', 'tipo' => 'visita', 'descripcion' => 'Arranque del proyecto y definicion de objetivos.', 'accion' => 'Revisar backlog inicial a fin de mes.'],
                            ['fecha' => '2025-11-12', 'tipo' => 'seguimiento', 'descripcion' => 'Buen avance en cuadros de mando y limpieza de datos.'],
                        ],
                    ],
                ],
                [
                    'nombre' => 'Jorge',
                    'apellido' => 'Lorenzo',
                    'dni' => '22334455B',
                    'email' => 'jorge.lorenzo@alumnadofp.example.org',
                    'telefono' => '600110211',
                    'grado' => 'Desarrollo de Aplicaciones Web',
                    'curso' => '2o',
                    'expediente' => 'DAW-24-012',
                    'estado' => 'pendiente_asignacion',
                ],
            ],
            'tutorAcademico' => $tutorAcademicoA,
        ]);

        $this->seedApprovedCompanyScenario([
            'solicitud' => [
                'nombreEmpresa' => 'BioSync Salud Digital, S.L.',
                'cif' => 'B52987410',
                'sector' => 'Salud digital',
                'ciudad' => 'Valencia',
                'web' => 'https://biosync.example.org',
                'descripcion' => 'Integracion de datos clinicos y cuadros de seguimiento para practicas de DAM y ASIR.',
                'contactoNombre' => 'Sergio Pastor',
                'contactoEmail' => 'sergio.pastor@biosync.example.org',
                'contactoTelefono' => '960770810',
                'mensajes' => [
                    ['autor' => 'empresa', 'texto' => 'Nos interesa incorporar un perfil con nociones de interoperabilidad clinica.'],
                    ['autor' => 'centro', 'texto' => 'Tenemos un alumno disponible de DAM con buen nivel de integracion de APIs y reporting.'],
                ],
            ],
            'portal' => [
                'email' => 'sergio.pastor@biosync.example.org',
                'displayName' => 'Sergio Pastor',
                'password' => 'EmpresaDemo02!',
            ],
            'empresa' => [
                'direccion' => 'Avenida de Francia 118',
                'provincia' => 'Valencia',
                'pais' => 'Espana',
                'telefono' => '960770800',
                'fechaAlta' => '2024-03-20',
                'observaciones' => 'Buen encaje para perfiles de integracion, reporting clinico y soporte funcional.',
                'contactoCargo' => 'Responsable de innovacion',
                'tutorProfesional' => [
                    'nombre' => 'Marta Ponce',
                    'email' => 'marta.ponce@biosync.example.org',
                    'telefono' => '960770811',
                    'cargo' => 'Product owner de integraciones',
                    'certificaciones' => 'HL7 | FHIR | Gestion agil de proyectos',
                ],
                'etiqueta' => 'Salud',
                'notaAutor' => 'Jefatura de estudios',
                'notaContenido' => 'Solicitan estudiantes con soltura documental y buena comunicacion con perfiles no tecnicos.',
                'documento' => [
                    'nombre' => 'Mapa funcional de integraciones',
                    'tipo' => 'PDF',
                    'url' => 'https://biosync.example.org/documentos/mapa-integraciones.pdf',
                ],
            ],
            'convenios' => [
                [
                    'titulo' => 'Convenio plataforma clinica 2025',
                    'descripcion' => 'Practicas para evolutivos de integracion clinica y cuadros de mando operativos.',
                    'fechaInicio' => '2025-11-01',
                    'fechaFin' => '2026-03-31',
                    'tipo' => 'Practicas extracurriculares',
                    'estado' => 'vigente',
                    'documentoUrl' => 'https://biosync.example.org/documentos/convenio-plataforma-clinica.pdf',
                    'observaciones' => 'Se revisa carga semanal con el tutor academico.',
                    'checklist' => [
                        ['label' => 'Convenio firmado', 'completed' => true],
                        ['label' => 'Plan de acogida aprobado', 'completed' => true],
                    ],
                    'documentos' => [
                        ['nombre' => 'Convenio firmado', 'tipo' => 'PDF', 'url' => 'https://biosync.example.org/documentos/convenio-firmado.pdf'],
                    ],
                    'alertas' => [
                        ['mensaje' => 'Revisar clausula de confidencialidad con alumnado antes del inicio.', 'nivel' => 'warning'],
                    ],
                    'workflow' => [
                        ['estado' => 'borrador', 'comentario' => 'Propuesta validada por el area sanitaria.'],
                        ['estado' => 'firmado', 'comentario' => 'Firmado y revisado legalmente.'],
                        ['estado' => 'vigente', 'comentario' => 'Alumno asignado.'],
                    ],
                ],
            ],
            'estudiantes' => [
                [
                    'nombre' => 'Nuria',
                    'apellido' => 'Santos',
                    'dni' => '33445566C',
                    'email' => 'nuria.santos@alumnadofp.example.org',
                    'telefono' => '600110212',
                    'grado' => 'Desarrollo de Aplicaciones Multiplataforma',
                    'curso' => '2o',
                    'expediente' => 'DAM-24-031',
                    'estado' => 'en_practicas',
                    'asignacion' => [
                        'fechaInicio' => '2025-11-10',
                        'fechaFin' => '2026-03-20',
                        'modalidad' => 'presencial',
                        'horasTotales' => 280,
                        'estado' => 'en_curso',
                        'seguimientos' => [
                            ['fecha' => '2025-11-25', 'tipo' => 'seguimiento', 'descripcion' => 'Adaptacion correcta al entorno y a la documentacion funcional.'],
                        ],
                    ],
                ],
            ],
            'tutorAcademico' => $tutorAcademicoB,
        ]);

        $this->seedApprovedCompanyScenario([
            'solicitud' => [
                'nombreEmpresa' => 'MoviTrack Operaciones Inteligentes, S.L.',
                'cif' => 'B61324598',
                'sector' => 'Logistica inteligente',
                'ciudad' => 'Sevilla',
                'web' => 'https://movitrack.example.org',
                'descripcion' => 'Analitica de rutas, optimizacion de procesos y soporte a operativa de ultima milla.',
                'contactoNombre' => 'Ines Romero',
                'contactoEmail' => 'ines.romero@movitrack.example.org',
                'contactoTelefono' => '954881230',
                'mensajes' => [
                    ['autor' => 'empresa', 'texto' => 'Queremos revisar un perfil de automatizacion de informes y analitica operativa.'],
                    ['autor' => 'centro', 'texto' => 'Tenemos una alumna de mantenimiento industrial muy orientada a analisis de datos y simulacion.'],
                ],
            ],
            'portal' => [
                'email' => 'ines.romero@movitrack.example.org',
                'displayName' => 'Ines Romero',
                'password' => 'EmpresaDemo03!',
            ],
            'empresa' => [
                'direccion' => 'Parque Empresarial Cartuja 14',
                'provincia' => 'Sevilla',
                'pais' => 'Espana',
                'telefono' => '954881200',
                'fechaAlta' => '2023-11-10',
                'observaciones' => 'Empresa muy util para perfiles de automatizacion, industria y trazabilidad.',
                'contactoCargo' => 'Responsable de personas y operaciones',
                'tutorProfesional' => [
                    'nombre' => 'Adrian Cifuentes',
                    'email' => 'adrian.cifuentes@movitrack.example.org',
                    'telefono' => '954881231',
                    'cargo' => 'Jefe de operaciones',
                    'certificaciones' => 'Lean | Six Sigma Green Belt | Analitica operativa',
                ],
                'etiqueta' => 'Operaciones',
                'notaAutor' => 'Direccion de FP dual',
                'notaContenido' => 'Buen partner para cerrar defensas sobre optimizacion y seguimiento de indicadores.',
                'documento' => [
                    'nombre' => 'Manual de acogida de planta',
                    'tipo' => 'PDF',
                    'url' => 'https://movitrack.example.org/documentos/manual-acogida.pdf',
                ],
            ],
            'convenios' => [
                [
                    'titulo' => 'Convenio operaciones y trazabilidad 2025/2026',
                    'descripcion' => 'Practicas ligadas a analitica de rutas, simulacion y reporting para operaciones de ultima milla.',
                    'fechaInicio' => '2025-09-15',
                    'fechaFin' => '2026-02-15',
                    'tipo' => 'Practicas curriculares',
                    'estado' => 'vigente',
                    'documentoUrl' => 'https://movitrack.example.org/documentos/convenio-operaciones.pdf',
                    'observaciones' => 'Exige un seguimiento mensual con foco en KPIs de operativa.',
                    'checklist' => [
                        ['label' => 'Convenio firmado', 'completed' => true],
                        ['label' => 'Riesgos laborales revisados', 'completed' => true],
                    ],
                    'documentos' => [
                        ['nombre' => 'Plan de KPIs', 'tipo' => 'XLSX', 'url' => 'https://movitrack.example.org/documentos/plan-kpis.xlsx'],
                    ],
                    'alertas' => [
                        ['mensaje' => 'Preparar acta de seguimiento intermedio en diciembre.', 'nivel' => 'info'],
                    ],
                    'workflow' => [
                        ['estado' => 'borrador', 'comentario' => 'Definicion de objetivos con operaciones.'],
                        ['estado' => 'firmado', 'comentario' => 'Convenio validado por la empresa.'],
                        ['estado' => 'vigente', 'comentario' => 'Alumno en seguimiento operativo.'],
                    ],
                ],
            ],
            'estudiantes' => [
                [
                    'nombre' => 'Paula',
                    'apellido' => 'Requena',
                    'dni' => '44556677D',
                    'email' => 'paula.requena@alumnadofp.example.org',
                    'telefono' => '600110213',
                    'grado' => 'Mecatronica industrial',
                    'curso' => '2o',
                    'expediente' => 'MEC-24-009',
                    'estado' => 'en_practicas',
                    'asignacion' => [
                        'fechaInicio' => '2025-09-25',
                        'fechaFin' => '2026-02-15',
                        'modalidad' => 'presencial',
                        'horasTotales' => 300,
                        'estado' => 'en_curso',
                        'seguimientos' => [
                            ['fecha' => '2025-10-20', 'tipo' => 'visita', 'descripcion' => 'La alumna participa en cuadros de mando de entrega y rotura de stock.'],
                        ],
                        'evaluacion' => [
                            'fecha' => '2026-02-15',
                            'empresa' => 'Desempeno muy alto en seguimiento de indicadores y documentacion de procesos.',
                            'estudiante' => 'La empresa me ha permitido trabajar con datos reales y proponer mejoras viables.',
                            'academico' => 'Cumple con solvencia los objetivos profesionales y academicos del modulo.',
                            'conclusiones' => 'Perfil recomendable para continuidad en mejora de procesos y analitica.',
                        ],
                    ],
                ],
                [
                    'nombre' => 'Ivan',
                    'apellido' => 'Crespo',
                    'dni' => '55667788E',
                    'email' => 'ivan.crespo@alumnadofp.example.org',
                    'telefono' => '600110214',
                    'grado' => 'Automatizacion y robotica industrial',
                    'curso' => '2o',
                    'expediente' => 'ARI-24-021',
                    'estado' => 'disponible',
                ],
            ],
            'tutorAcademico' => $tutorAcademicoC,
        ]);

        // Referencia adicional sin asignacion para reforzar listados.
        $estudianteReserva = (new Estudiante())
            ->setNombre('Helena')
            ->setApellido('Bravo')
            ->setDni('66778899F')
            ->setEmail('helena.bravo@alumnadofp.example.org')
            ->setTelefono('600110215')
            ->setGrado('Administracion de sistemas informaticos en red')
            ->setCurso('2o')
            ->setExpediente('ASIR-24-011')
            ->setEstado('disponible');

        $this->entityManager->persist($estudianteReserva);
    }

    private function seedPendingAndRejectedRequests(): void
    {
        $preRegistered = $this->createPortalAccount(
            'cristina.merino@prealta.example.org',
            'Cristina Merino',
            'EmpresaDemo00!'
        );
        $preRegistered->markActivated();
        $this->entityManager->persist($preRegistered);

        $pending = $this->createSolicitud(
            'HosteLink Datos Turisticos, S.L.',
            'B70211458',
            'Analitica para turismo',
            'Malaga',
            'https://hostelink.example.org',
            'Empresa interesada en dashboards de ocupacion y prediccion de demanda para destinos urbanos.',
            'Marta Ibanez',
            'marta.ibanez@hostelink.example.org',
            '952770880',
            'Diego Camarena',
            'diego.camarena@hostelink.example.org',
            '952770881',
            'Responsable de analitica hotelera'
        );
        $pending->markEmailVerified();
        $pending->addMensaje($this->createMensaje('empresa', 'Ya tenemos definido el calendario de acogida y el equipo de supervision.'));
        $pending->addMensaje($this->createMensaje('centro', 'Necesitamos confirmar seguro y responsable de prevencion antes de aprobar.'));

        $pendingAccount = $this->createPortalAccount(
            'marta.ibanez@hostelink.example.org',
            'Marta Ibanez',
            'EmpresaDemo04!'
        );
        $pendingAccount->setSolicitud($pending)->markActivated()->markLoggedIn();

        $this->entityManager->persist($pending);
        $this->entityManager->persist($pendingAccount);

        $rejected = $this->createSolicitud(
            'EcoPack Circular, S.L.',
            'B80422561',
            'Packaging sostenible',
            'Bilbao',
            'https://ecopack.example.org',
            'Solicitud rechazada por falta de detalle en la tutorizacion y documentacion preventiva.',
            'Alberto Navarro',
            'alberto.navarro@ecopack.example.org',
            '944880990',
            'Nuria Vela',
            'nuria.vela@ecopack.example.org',
            '944880991',
            'Responsable de operaciones circulares'
        );
        $rejected->markEmailVerified();
        $rejected->addMensaje($this->createMensaje('empresa', 'Podemos asumir una alumna de administracion y finanzas a partir de junio.'));
        $rejected->addMensaje($this->createMensaje('centro', 'Necesitamos concretar quien tutorizara y el plan formativo en detalle.'));
        $rejected->reject('No se ha aportado un plan formativo suficientemente concreto ni la designacion formal del tutor profesional.');

        $rejectedAccount = $this->createPortalAccount(
            'alberto.navarro@ecopack.example.org',
            'Alberto Navarro',
            'EmpresaDemo05!'
        );
        $rejectedAccount->setSolicitud($rejected)->markActivated();

        $this->entityManager->persist($rejected);
        $this->entityManager->persist($rejectedAccount);
    }

    private function seedApprovedCompanyScenario(array $scenario): EmpresaColaboradora
    {
        $empresaSlug = $this->slugifyForStorage($scenario['solicitud']['nombreEmpresa']);
        $solicitud = $this->createSolicitud(
            $scenario['solicitud']['nombreEmpresa'],
            $scenario['solicitud']['cif'],
            $scenario['solicitud']['sector'],
            $scenario['solicitud']['ciudad'],
            $scenario['solicitud']['web'],
            $scenario['solicitud']['descripcion'],
            $scenario['solicitud']['contactoNombre'],
            $scenario['solicitud']['contactoEmail'],
            $scenario['solicitud']['contactoTelefono'],
            $scenario['empresa']['tutorProfesional']['nombre'] ?? null,
            $scenario['empresa']['tutorProfesional']['email'] ?? null,
            $scenario['empresa']['tutorProfesional']['telefono'] ?? null,
            $scenario['empresa']['tutorProfesional']['cargo'] ?? null
        );
        $solicitud->markEmailVerified();
        foreach ($scenario['solicitud']['mensajes'] as $mensaje) {
            $solicitud->addMensaje($this->createMensaje($mensaje['autor'], $mensaje['texto']));
        }
        $solicitud->markApproved();

        $empresa = (new EmpresaColaboradora())
            ->setNombre($scenario['solicitud']['nombreEmpresa'])
            ->setSector($scenario['solicitud']['sector'])
            ->setDireccion($scenario['empresa']['direccion'])
            ->setCiudad($scenario['solicitud']['ciudad'])
            ->setProvincia($scenario['empresa']['provincia'])
            ->setPais($scenario['empresa']['pais'])
            ->setTelefono($scenario['empresa']['telefono'])
            ->setEmail($scenario['solicitud']['contactoEmail'])
            ->setWeb($scenario['solicitud']['web'])
            ->setEstadoColaboracion('activa')
            ->setFechaAlta(new \DateTimeImmutable($scenario['empresa']['fechaAlta']))
            ->setObservaciones($scenario['empresa']['observaciones']);

        $contacto = (new ContactoEmpresa())
            ->setNombre($scenario['solicitud']['contactoNombre'])
            ->setCargo($scenario['empresa']['contactoCargo'])
            ->setTelefono($scenario['solicitud']['contactoTelefono'])
            ->setEmail($scenario['solicitud']['contactoEmail'])
            ->setEsTutorProfesional(false);
        $empresa->addContacto($contacto);

        $tutorProfesional = (new TutorProfesional())
            ->setNombre($scenario['empresa']['tutorProfesional']['nombre'])
            ->setEmail($scenario['empresa']['tutorProfesional']['email'])
            ->setTelefono($scenario['empresa']['tutorProfesional']['telefono'])
            ->setCargo($scenario['empresa']['tutorProfesional']['cargo'])
            ->setCertificaciones($scenario['empresa']['tutorProfesional']['certificaciones'])
            ->setActivo(true)
            ->setEmpresa($empresa);
        $empresa->addTutorProfesional($tutorProfesional);

        $empresa->addEtiqueta(
            (new EmpresaEtiqueta())
                ->setEmpresa($empresa)
                ->setNombre($scenario['empresa']['etiqueta'])
        );
        $empresa->addNota(
            (new EmpresaNota())
                ->setEmpresa($empresa)
                ->setAutor($scenario['empresa']['notaAutor'])
                ->setContenido($scenario['empresa']['notaContenido'])
        );
        $empresa->addDocumento(
            $this->createDemoEmpresaDocumento($empresa, $scenario['empresa']['documento'])
        );

        foreach ($scenario['convenios'] as $convenioData) {
            $convenio = (new Convenio())
                ->setTitulo($convenioData['titulo'])
                ->setDescripcion($convenioData['descripcion'])
                ->setFechaInicio(new \DateTimeImmutable($convenioData['fechaInicio']))
                ->setFechaFin(isset($convenioData['fechaFin']) ? new \DateTimeImmutable($convenioData['fechaFin']) : null)
                ->setTipo($convenioData['tipo'])
                ->setEstado($convenioData['estado'])
                ->setDocumentoUrl($this->buildConvenioDocumentoUrl($convenioData['documentoUrl'] ?? null))
                ->setObservaciones($convenioData['observaciones'] ?? null)
                ->setEmpresa($empresa);
            $empresa->addConvenio($convenio);

            foreach ($convenioData['checklist'] as $itemData) {
                $this->entityManager->persist(
                    (new ConvenioChecklistItem())
                        ->setConvenio($convenio)
                        ->setLabel($itemData['label'])
                        ->setCompleted((bool) ($itemData['completed'] ?? false))
                );
            }

            foreach ($convenioData['documentos'] as $documentoData) {
                $this->entityManager->persist(
                    $this->createDemoConvenioDocumento($convenio, $documentoData, $empresaSlug)
                );
            }

            foreach ($convenioData['alertas'] as $alertaData) {
                $this->entityManager->persist(
                    (new ConvenioAlerta())
                        ->setConvenio($convenio)
                        ->setMensaje($alertaData['mensaje'])
                        ->setNivel($alertaData['nivel'])
                );
            }

            foreach ($convenioData['workflow'] as $workflowData) {
                $this->entityManager->persist(
                    (new ConvenioWorkflowEvento())
                        ->setConvenio($convenio)
                        ->setEstado($workflowData['estado'])
                        ->setComentario($workflowData['comentario'] ?? null)
                );
            }
        }

        $primaryConvenio = $empresa->getConvenios()->first();
        foreach ($scenario['estudiantes'] as $estudianteData) {
            $estudiante = (new Estudiante())
                ->setNombre($estudianteData['nombre'])
                ->setApellido($estudianteData['apellido'])
                ->setDni($estudianteData['dni'])
                ->setEmail($estudianteData['email'])
                ->setTelefono($estudianteData['telefono'])
                ->setGrado($estudianteData['grado'])
                ->setCurso($estudianteData['curso'])
                ->setExpediente($estudianteData['expediente'])
                ->setEstado($estudianteData['estado']);
            $this->entityManager->persist($estudiante);

            if (!isset($estudianteData['asignacion']) || !$primaryConvenio instanceof Convenio) {
                continue;
            }

            $asignacionData = $estudianteData['asignacion'];
            $asignacion = (new AsignacionPractica())
                ->setEstudiante($estudiante)
                ->setConvenio($primaryConvenio)
                ->setEmpresa($empresa)
                ->setTutorAcademico($scenario['tutorAcademico'])
                ->setTutorProfesional($tutorProfesional)
                ->setFechaInicio(new \DateTimeImmutable($asignacionData['fechaInicio']))
                ->setFechaFin(isset($asignacionData['fechaFin']) ? new \DateTimeImmutable($asignacionData['fechaFin']) : null)
                ->setModalidad($asignacionData['modalidad'])
                ->setHorasTotales($asignacionData['horasTotales'])
                ->setEstado($asignacionData['estado']);

            foreach ($asignacionData['seguimientos'] ?? [] as $seguimientoData) {
                $seguimiento = (new Seguimiento())
                    ->setFecha(new \DateTimeImmutable($seguimientoData['fecha']))
                    ->setTipo($seguimientoData['tipo'])
                    ->setDescripcion($seguimientoData['descripcion'])
                    ->setAccionRequerida($seguimientoData['accion'] ?? null)
                    ->setDocumentoUrl($seguimientoData['documentoUrl'] ?? null);
                $asignacion->addSeguimiento($seguimiento);
            }

            if (isset($asignacionData['evaluacion'])) {
                $evaluacionData = $asignacionData['evaluacion'];
                $evaluacion = (new EvaluacionFinal())
                    ->setFecha(new \DateTimeImmutable($evaluacionData['fecha']))
                    ->setValoracionEmpresa($evaluacionData['empresa'])
                    ->setValoracionEstudiante($evaluacionData['estudiante'])
                    ->setValoracionTutorAcademico($evaluacionData['academico'])
                    ->setConclusiones($evaluacionData['conclusiones']);
                $asignacion->setEvaluacionFinal($evaluacion);
            }

            $this->entityManager->persist($asignacion);
        }

        $portalAccount = $this->createPortalAccount(
            $scenario['portal']['email'],
            $scenario['portal']['displayName'],
            $scenario['portal']['password']
        );
        $portalAccount
            ->setEmpresa($empresa)
            ->setSolicitud($solicitud)
            ->markActivated()
            ->markLoggedIn();

        $this->entityManager->persist($solicitud);
        $this->entityManager->persist($empresa);
        $this->entityManager->persist($portalAccount);

        return $empresa;
    }

    private function createTutorAcademico(
        string $nombre,
        string $apellido,
        string $email,
        string $telefono,
        string $departamento,
        string $especialidad
    ): TutorAcademico {
        return (new TutorAcademico())
            ->setNombre($nombre)
            ->setApellido($apellido)
            ->setEmail($email)
            ->setTelefono($telefono)
            ->setDepartamento($departamento)
            ->setEspecialidad($especialidad)
            ->setActivo(true);
    }

    private function createSolicitud(
        string $nombreEmpresa,
        ?string $cif,
        ?string $sector,
        ?string $ciudad,
        ?string $web,
        ?string $descripcion,
        string $contactoNombre,
        string $contactoEmail,
        ?string $contactoTelefono,
        ?string $tutorProfesionalNombre = null,
        ?string $tutorProfesionalEmail = null,
        ?string $tutorProfesionalTelefono = null,
        ?string $tutorProfesionalCargo = null
    ): EmpresaSolicitud {
        return (new EmpresaSolicitud())
            ->setNombreEmpresa($nombreEmpresa)
            ->setCif($cif)
            ->setSector($sector)
            ->setCiudad($ciudad)
            ->setWeb($web)
            ->setDescripcion($descripcion)
            ->setContactoNombre($contactoNombre)
            ->setContactoEmail($contactoEmail)
            ->setContactoTelefono($contactoTelefono)
            ->setTutorProfesionalNombre($tutorProfesionalNombre)
            ->setTutorProfesionalEmail($tutorProfesionalEmail)
            ->setTutorProfesionalTelefono($tutorProfesionalTelefono)
            ->setTutorProfesionalCargo($tutorProfesionalCargo);
    }

    private function createMensaje(string $autor, string $texto): EmpresaMensaje
    {
        return (new EmpresaMensaje())
            ->setAutor($autor)
            ->setTexto($texto);
    }

    private function createPortalAccount(string $email, string $displayName, string $plainPassword): EmpresaPortalCuenta
    {
        $account = (new EmpresaPortalCuenta())
            ->setEmail($email)
            ->setDisplayName($displayName)
            ->setActive(true);

        $account->setPassword($this->passwordHasher->hashPassword($account, $plainPassword));

        return $account;
    }
}
