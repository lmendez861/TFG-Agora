<?php

namespace App\DataFixtures;

use App\Entity\AsignacionPractica;
use App\Entity\ContactoEmpresa;
use App\Entity\Convenio;
use App\Entity\EmpresaColaboradora;
use App\Entity\Estudiante;
use App\Entity\EvaluacionFinal;
use App\Entity\Seguimiento;
use App\Entity\TutorAcademico;
use App\Entity\TutorProfesional;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class DemoDominioFixtures extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        // Empresa 1 con contactos, tutores y convenio activo
        $empresaInnovar = (new EmpresaColaboradora())
            ->setNombre('Innovar Formación')
            ->setSector('Tecnología educativa')
            ->setDireccion('C/ Innovación, 12')
            ->setCiudad('Madrid')
            ->setProvincia('Madrid')
            ->setPais('España')
            ->setTelefono('910000111')
            ->setEmail('contacto@innovar.es')
            ->setWeb('https://innovar.es')
            ->setEstadoColaboracion('activa')
            ->setFechaAlta(new \DateTimeImmutable('2024-01-15'))
            ->setObservaciones('Empresa especializada en proyectos de IA aplicada a la educación.');

        $contactoInnovar = (new ContactoEmpresa())
            ->setNombre('María López')
            ->setCargo('Directora de Talento')
            ->setTelefono('910000222')
            ->setEmail('maria.lopez@innovar.es')
            ->setEsTutorProfesional(false);
        $empresaInnovar->addContacto($contactoInnovar);

        $mentorInnovar = (new TutorProfesional())
            ->setNombre('Carlos Gómez')
            ->setEmail('carlos.gomez@innovar.es')
            ->setTelefono('910000333')
            ->setCargo('Mentor Senior IA')
            ->setCertificaciones('Scrum Master | Mentoría IA aplicada')
            ->setActivo(true)
            ->setEmpresa($empresaInnovar);
        $empresaInnovar->addTutorProfesional($mentorInnovar);

        $convenioInnovar = (new Convenio())
            ->setTitulo('Convenio IA Educativa 2024/2025')
            ->setDescripcion('Programa de prácticas para estudiantes de ingeniería con foco en IA educativa.')
            ->setFechaInicio(new \DateTimeImmutable('2024-09-01'))
            ->setFechaFin(new \DateTimeImmutable('2025-02-28'))
            ->setTipo('Prácticas curriculares')
            ->setEstado('vigente')
            ->setDocumentoUrl('https://docs.example.com/convenio-innovar.pdf')
            ->setObservaciones('Incluye plan de mentoría mensual.')
            ->setEmpresa($empresaInnovar);
        $empresaInnovar->addConvenio($convenioInnovar);

        $tutorAcademicoLaura = (new TutorAcademico())
            ->setNombre('Laura')
            ->setApellido('Serrano')
            ->setEmail('laura.serrano@universidad.es')
            ->setTelefono('910100200')
            ->setDepartamento('Informática')
            ->setEspecialidad('Inteligencia Artificial')
            ->setActivo(true);

        $estudianteAna = (new Estudiante())
            ->setNombre('Ana')
            ->setApellido('Martínez')
            ->setDni('12345678A')
            ->setEmail('ana.martinez@alumnos.es')
            ->setTelefono('600111222')
            ->setGrado('Ingeniería Informática')
            ->setCurso('4º')
            ->setExpediente('INF-2021-004')
            ->setEstado('en_practicas');

        $asignacionAna = (new AsignacionPractica())
            ->setEstudiante($estudianteAna)
            ->setConvenio($convenioInnovar)
            ->setEmpresa($empresaInnovar)
            ->setTutorAcademico($tutorAcademicoLaura)
            ->setTutorProfesional($mentorInnovar)
            ->setFechaInicio(new \DateTimeImmutable('2024-10-01'))
            ->setFechaFin(new \DateTimeImmutable('2025-01-31'))
            ->setModalidad('hibrida')
            ->setHorasTotales(320)
            ->setEstado('en_curso');

        $seguimientoInicial = (new Seguimiento())
            ->setFecha(new \DateTimeImmutable('2024-10-15'))
            ->setTipo('visita')
            ->setDescripcion('Visita inicial de coordinación en Innovar Formación.')
            ->setAccionRequerida('Definir calendario de reuniones quincenales.');
        $asignacionAna->addSeguimiento($seguimientoInicial);

        $seguimientoMensual = (new Seguimiento())
            ->setFecha(new \DateTimeImmutable('2024-11-12'))
            ->setTipo('seguimiento')
            ->setDescripcion('Revisión de objetivos cumplidos del primer mes.')
            ->setDocumentoUrl('https://docs.example.com/informe-mes1.pdf');
        $asignacionAna->addSeguimiento($seguimientoMensual);

        $evaluacionAna = (new EvaluacionFinal())
            ->setFecha(new \DateTimeImmutable('2025-01-31'))
            ->setValoracionEmpresa('La estudiante ha superado las expectativas, destaca en proactividad.')
            ->setValoracionEstudiante('La experiencia ha sido muy positiva, con retos técnicos reales.')
            ->setValoracionTutorAcademico('Cumple los objetivos académicos y profesionales marcados.')
            ->setConclusiones('Se recomienda su incorporación a proyectos de I+D.');
        $asignacionAna->setEvaluacionFinal($evaluacionAna);

        $manager->persist($empresaInnovar);
        $manager->persist($tutorAcademicoLaura);
        $manager->persist($estudianteAna);
        $manager->persist($convenioInnovar);
        $manager->persist($asignacionAna);

        // Empresa 2 con enfoque sanitario y una asignación en curso
        $empresaSalud = (new EmpresaColaboradora())
            ->setNombre('Salud Conectada S.L.')
            ->setSector('Salud digital')
            ->setDireccion('Av. del Bienestar, 45')
            ->setCiudad('Valencia')
            ->setProvincia('Valencia')
            ->setPais('España')
            ->setTelefono('960123456')
            ->setEmail('info@saludconectada.es')
            ->setWeb('https://saludconectada.es')
            ->setEstadoColaboracion('pendiente_revision')
            ->setFechaAlta(new \DateTimeImmutable('2024-03-20'))
            ->setObservaciones('Necesitan perfilar plan de acogida antes de la firma definitiva.');

        $contactoSalud = (new ContactoEmpresa())
            ->setNombre('Javier Ortega')
            ->setCargo('Responsable de Innovación')
            ->setTelefono('960654321')
            ->setEmail('javier.ortega@saludconectada.es')
            ->setEsTutorProfesional(true);
        $empresaSalud->addContacto($contactoSalud);

        $mentorSalud = (new TutorProfesional())
            ->setNombre('Elena Ruiz')
            ->setEmail('elena.ruiz@saludconectada.es')
            ->setTelefono('960222333')
            ->setCargo('Responsable de Integraciones Clínicas')
            ->setCertificaciones('HL7 Specialist | PM certificado')
            ->setActivo(true)
            ->setEmpresa($empresaSalud);
        $empresaSalud->addTutorProfesional($mentorSalud);

        $convenioSalud = (new Convenio())
            ->setTitulo('Convenio Integraciones Clínicas 2024')
            ->setDescripcion('Proyecto para diseñar dashboards de seguimiento clínico en tiempo real.')
            ->setFechaInicio(new \DateTimeImmutable('2024-11-01'))
            ->setTipo('Prácticas extracurriculares')
            ->setEstado('borrador')
            ->setObservaciones('A falta de firma por parte del tutor académico.')
            ->setEmpresa($empresaSalud);
        $empresaSalud->addConvenio($convenioSalud);

        $tutorAcademicoMiguel = (new TutorAcademico())
            ->setNombre('Miguel')
            ->setApellido('Garrido')
            ->setEmail('miguel.garrido@universidad.es')
            ->setTelefono('960101202')
            ->setDepartamento('Telecomunicaciones')
            ->setEspecialidad('Sistemas embebidos')
            ->setActivo(true);

        $estudianteLuis = (new Estudiante())
            ->setNombre('Luis')
            ->setApellido('Campos')
            ->setDni('87654321B')
            ->setEmail('luis.campos@alumnos.es')
            ->setTelefono('600333444')
            ->setGrado('Ingeniería Biomédica')
            ->setCurso('3º')
            ->setExpediente('BIO-2022-003')
            ->setEstado('disponible');

        $asignacionLuis = (new AsignacionPractica())
            ->setEstudiante($estudianteLuis)
            ->setConvenio($convenioSalud)
            ->setEmpresa($empresaSalud)
            ->setTutorAcademico($tutorAcademicoMiguel)
            ->setTutorProfesional($mentorSalud)
            ->setFechaInicio(new \DateTimeImmutable('2025-02-01'))
            ->setModalidad('presencial')
            ->setHorasTotales(240)
            ->setEstado('planificada');

        $manager->persist($empresaSalud);
        $manager->persist($tutorAcademicoMiguel);
        $manager->persist($estudianteLuis);
        $manager->persist($convenioSalud);
        $manager->persist($asignacionLuis);

        $manager->flush();
    }
}
