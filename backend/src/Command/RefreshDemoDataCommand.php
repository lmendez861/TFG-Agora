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
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(
    name: 'app:demo:refresh',
    description: 'Reinicia la base de datos funcional y carga un escenario de demo coherente para pruebas.'
)]
final class RefreshDemoDataCommand extends Command
{
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

        $platform = $connection->getDatabasePlatform()->getName();
        $io->text(sprintf('Truncando %d tablas en %s.', count($tableNames), $platform));

        if ($platform === 'postgresql') {
            $quoted = implode(', ', array_map([$connection, 'quoteIdentifier'], $tableNames));
            $connection->executeStatement(sprintf('TRUNCATE TABLE %s RESTART IDENTITY CASCADE', $quoted));

            return;
        }

        if ($platform === 'sqlite') {
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
            '952770880'
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
            '944880990'
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
        $solicitud = $this->createSolicitud(
            $scenario['solicitud']['nombreEmpresa'],
            $scenario['solicitud']['cif'],
            $scenario['solicitud']['sector'],
            $scenario['solicitud']['ciudad'],
            $scenario['solicitud']['web'],
            $scenario['solicitud']['descripcion'],
            $scenario['solicitud']['contactoNombre'],
            $scenario['solicitud']['contactoEmail'],
            $scenario['solicitud']['contactoTelefono']
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
            (new EmpresaDocumento())
                ->setEmpresa($empresa)
                ->setNombre($scenario['empresa']['documento']['nombre'])
                ->setTipo($scenario['empresa']['documento']['tipo'])
                ->setUrl($scenario['empresa']['documento']['url'])
        );

        foreach ($scenario['convenios'] as $convenioData) {
            $convenio = (new Convenio())
                ->setTitulo($convenioData['titulo'])
                ->setDescripcion($convenioData['descripcion'])
                ->setFechaInicio(new \DateTimeImmutable($convenioData['fechaInicio']))
                ->setFechaFin(isset($convenioData['fechaFin']) ? new \DateTimeImmutable($convenioData['fechaFin']) : null)
                ->setTipo($convenioData['tipo'])
                ->setEstado($convenioData['estado'])
                ->setDocumentoUrl($convenioData['documentoUrl'] ?? null)
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
                    (new ConvenioDocumento())
                        ->setConvenio($convenio)
                        ->setNombre($documentoData['nombre'])
                        ->setTipo($documentoData['tipo'] ?? null)
                        ->setUrl($documentoData['url'] ?? null)
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
        ?string $contactoTelefono
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
            ->setContactoTelefono($contactoTelefono);
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
