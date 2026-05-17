<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Controlador HTTP de la API interna: valida peticiones, coordina servicios/repositorios y devuelve JSON al frontend.
 * Relaciones: Conecta con App/Entity/AsignacionPractica, App/Entity/Convenio, App/Entity/EmpresaColaboradora, App/Entity/EmpresaSolicitud, App/Entity/Estudiante, App/Repository/AsignacionPracticaRepository, App/Repository/ConvenioRepository, App/Repository/EmpresaColaboradoraRepository.
 */

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\AsignacionPractica;
use App\Entity\Convenio;
use App\Entity\EmpresaColaboradora;
use App\Entity\EmpresaSolicitud;
use App\Entity\Estudiante;
use App\Repository\AsignacionPracticaRepository;
use App\Repository\ConvenioRepository;
use App\Repository\EmpresaColaboradoraRepository;
use App\Repository\EmpresaSolicitudRepository;
use App\Repository\EstudianteRepository;
use App\Repository\TutorAcademicoRepository;
use App\Repository\TutorProfesionalRepository;
use App\Service\CsvExporter;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Punto de entrada anotado por atributos Symfony/Doctrine; el atributo define como se enlaza con framework o persistencia.
 * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
 */
#[Route('/api/export', name: 'api_export_')]
#[IsGranted('ROLE_API')]
final class CsvExportController extends AbstractController
{
    private const EMPRESA_ESTADOS = [
        'activa',
        'en_negociacion',
        'pendiente_revision',
        'pausada',
        'baja',
        'suspendida',
    ];

    private const CONVENIO_ESTADOS = [
        'borrador',
        'revisado',
        'firmado',
        'vigente',
        'renovacion',
        'finalizado',
        'rescindido',
        'en_negociacion',
    ];

    private const ESTUDIANTE_ESTADOS = [
        'disponible',
        'en_practicas',
        'finalizado',
        'baja',
        'bloqueado',
    ];

    private const ASIGNACION_ESTADOS = [
        'planificada',
        'en_curso',
        'finalizada',
        'cancelada',
        'en_revision',
    ];

    private const ASIGNACION_MODALIDADES = [
        'presencial',
        'remota',
        'hibrida',
    ];

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct(private readonly CsvExporter $csvExporter)
    {
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/empresas', name: 'empresas', methods: ['GET'])]
    #[Route('/empresas.csv', name: 'empresas_legacy', methods: ['GET'])]
    public function empresas(Request $request, EmpresaColaboradoraRepository $repository): Response
    {
        $qb = $repository->createQueryBuilder('e')->orderBy('e.id', 'ASC');

        if ($estado = $request->query->get('estado')) {
            if (!in_array($estado, self::EMPRESA_ESTADOS, true)) {
                return $this->invalidRequest('El estado de colaboracion indicado no es valido.');
            }

            $qb->andWhere('e.estadoColaboracion = :estado')
                ->setParameter('estado', $estado);
        }

        if ($sector = $request->query->get('sector')) {
            $qb->andWhere('e.sector = :sector')
                ->setParameter('sector', $sector);
        }

        if ($search = $request->query->get('q')) {
            $pattern = '%' . mb_strtolower($search) . '%';
            $qb->andWhere('LOWER(e.nombre) LIKE :search OR LOWER(e.ciudad) LIKE :search')
                ->setParameter('search', $pattern);
        }

        $rows = array_map(static function (EmpresaColaboradora $empresa): array {
            $asignaciones = $empresa->getAsignaciones();

            return [
                'id' => $empresa->getId(),
                'nombre' => $empresa->getNombre(),
                'sector' => $empresa->getSector(),
                'ciudad' => $empresa->getCiudad(),
                'estado_colaboracion' => $empresa->getEstadoColaboracion(),
                'convenios_activos' => $empresa->getConvenios()->count(),
                'tutores_profesionales' => $empresa->getTutoresProfesionales()->count(),
                'contactos' => $empresa->getContactos()->count(),
                'asignaciones_total' => $asignaciones->count(),
                'asignaciones_en_curso' => $asignaciones->filter(
                    static fn ($asignacion) => $asignacion->getEstado() === 'en_curso'
                )->count(),
            ];
        }, $qb->getQuery()->getResult());

        return $this->csvExporter->createResponse('agora-empresas.csv', $rows);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/convenios', name: 'convenios', methods: ['GET'])]
    #[Route('/convenios.csv', name: 'convenios_legacy', methods: ['GET'])]
    public function convenios(Request $request, ConvenioRepository $repository): Response
    {
        $qb = $repository->createQueryBuilder('c')
            ->join('c.empresa', 'e')->addSelect('e')
            ->orderBy('c.id', 'ASC');

        if ($estado = $request->query->get('estado')) {
            if (!in_array($estado, self::CONVENIO_ESTADOS, true)) {
                return $this->invalidRequest('El estado solicitado no existe en el catalogo de convenios.');
            }

            $qb->andWhere('c.estado = :estado')
                ->setParameter('estado', $estado);
        }

        if ($tipo = $request->query->get('tipo')) {
            $qb->andWhere('c.tipo = :tipo')
                ->setParameter('tipo', $tipo);
        }

        if ($empresaId = $request->query->get('empresaId')) {
            if (!ctype_digit((string) $empresaId)) {
                return $this->invalidRequest('El parametro empresaId debe ser numerico.');
            }

            $qb->andWhere('e.id = :empresa')->setParameter('empresa', (int) $empresaId);
        }

        if ($search = $request->query->get('q')) {
            $pattern = '%' . mb_strtolower($search) . '%';
            $qb->andWhere('LOWER(c.titulo) LIKE :search')
                ->setParameter('search', $pattern);
        }

        $rows = array_map(static function (Convenio $convenio): array {
            return [
                'id' => $convenio->getId(),
                'titulo' => $convenio->getTitulo(),
                'empresa' => $convenio->getEmpresa()->getNombre(),
                'tipo' => $convenio->getTipo(),
                'estado' => $convenio->getEstado(),
                'fecha_inicio' => $convenio->getFechaInicio()->format('Y-m-d'),
                'fecha_fin' => $convenio->getFechaFin()?->format('Y-m-d'),
                'asignaciones_asociadas' => $convenio->getAsignaciones()->count(),
            ];
        }, $qb->getQuery()->getResult());

        return $this->csvExporter->createResponse('agora-convenios.csv', $rows);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/estudiantes', name: 'estudiantes', methods: ['GET'])]
    #[Route('/estudiantes.csv', name: 'estudiantes_legacy', methods: ['GET'])]
    public function estudiantes(Request $request, EstudianteRepository $repository): Response
    {
        $qb = $repository->createQueryBuilder('e')->orderBy('e.id', 'ASC');

        if ($estado = $request->query->get('estado')) {
            if (!in_array($estado, self::ESTUDIANTE_ESTADOS, true)) {
                return $this->invalidRequest('El estado indicado no existe en el catalogo permitido.');
            }

            $qb->andWhere('e.estado = :estado')
                ->setParameter('estado', $estado);
        }

        if ($search = $request->query->get('q')) {
            $pattern = '%' . mb_strtolower($search) . '%';
            $qb->andWhere('LOWER(e.nombre) LIKE :search OR LOWER(e.apellido) LIKE :search OR LOWER(e.email) LIKE :search')
                ->setParameter('search', $pattern);
        }

        $rows = array_map(static function (Estudiante $estudiante): array {
            $asignaciones = $estudiante->getAsignaciones();

            return [
                'id' => $estudiante->getId(),
                'nombre' => $estudiante->getNombre(),
                'apellido' => $estudiante->getApellido(),
                'dni' => $estudiante->getDni(),
                'email' => $estudiante->getEmail(),
                'grado' => $estudiante->getGrado(),
                'curso' => $estudiante->getCurso(),
                'estado' => $estudiante->getEstado(),
                'asignaciones_total' => $asignaciones->count(),
                'asignaciones_en_curso' => $asignaciones->filter(
                    static fn ($asignacion) => $asignacion->getEstado() === 'en_curso'
                )->count(),
            ];
        }, $qb->getQuery()->getResult());

        return $this->csvExporter->createResponse('agora-estudiantes.csv', $rows);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/asignaciones', name: 'asignaciones', methods: ['GET'])]
    #[Route('/asignaciones.csv', name: 'asignaciones_legacy', methods: ['GET'])]
    public function asignaciones(Request $request, AsignacionPracticaRepository $repository): Response
    {
        $qb = $repository->createQueryBuilder('a')
            ->join('a.empresa', 'e')->addSelect('e')
            ->join('a.estudiante', 'es')->addSelect('es')
            ->orderBy('a.id', 'ASC');

        if ($estado = $request->query->get('estado')) {
            if (!in_array($estado, self::ASIGNACION_ESTADOS, true)) {
                return $this->invalidRequest('El estado indicado no es valido para las asignaciones.');
            }

            $qb->andWhere('a.estado = :estado')
                ->setParameter('estado', $estado);
        }

        if ($modalidad = $request->query->get('modalidad')) {
            if (!in_array($modalidad, self::ASIGNACION_MODALIDADES, true)) {
                return $this->invalidRequest('La modalidad indicada no esta soportada.');
            }

            $qb->andWhere('a.modalidad = :modalidad')
                ->setParameter('modalidad', $modalidad);
        }

        if ($empresaId = $request->query->get('empresaId')) {
            if (!ctype_digit((string) $empresaId)) {
                return $this->invalidRequest('El parametro empresaId debe ser numerico.');
            }

            $qb->andWhere('e.id = :empresa')->setParameter('empresa', (int) $empresaId);
        }

        if ($estudianteId = $request->query->get('estudianteId')) {
            if (!ctype_digit((string) $estudianteId)) {
                return $this->invalidRequest('El parametro estudianteId debe ser numerico.');
            }

            $qb->andWhere('es.id = :estudiante')->setParameter('estudiante', (int) $estudianteId);
        }

        $rows = array_map(static function (AsignacionPractica $asignacion): array {
            return [
                'id' => $asignacion->getId(),
                'empresa' => $asignacion->getEmpresa()->getNombre(),
                'estudiante' => sprintf(
                    '%s %s',
                    $asignacion->getEstudiante()->getNombre(),
                    $asignacion->getEstudiante()->getApellido()
                ),
                'estado' => $asignacion->getEstado(),
                'modalidad' => $asignacion->getModalidad(),
                'horas_totales' => $asignacion->getHorasTotales(),
                'fecha_inicio' => $asignacion->getFechaInicio()->format('Y-m-d'),
                'fecha_fin' => $asignacion->getFechaFin()?->format('Y-m-d'),
            ];
        }, $qb->getQuery()->getResult());

        return $this->csvExporter->createResponse('agora-asignaciones.csv', $rows);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/tutores-academicos', name: 'tutores_academicos', methods: ['GET'])]
    #[Route('/tutores-academicos.csv', name: 'tutores_academicos_legacy', methods: ['GET'])]
    public function tutoresAcademicos(Request $request, TutorAcademicoRepository $repository): Response
    {
        $qb = $repository->createQueryBuilder('t')->orderBy('t.apellido', 'ASC');

        $activo = $request->query->get('activo');
        if ($activo !== null) {
            $qb->andWhere('t.activo = :activo')->setParameter('activo', filter_var($activo, FILTER_VALIDATE_BOOLEAN));
        }

        $rows = array_map(static function ($tutor): array {
            return [
                'id' => $tutor->getId(),
                'nombre' => $tutor->getNombre(),
                'apellido' => $tutor->getApellido(),
                'email' => $tutor->getEmail(),
                'telefono' => $tutor->getTelefono(),
                'departamento' => $tutor->getDepartamento(),
                'especialidad' => $tutor->getEspecialidad(),
                'activo' => $tutor->isActivo() ? 'si' : 'no',
            ];
        }, $qb->getQuery()->getResult());

        return $this->csvExporter->createResponse('agora-tutores-academicos.csv', $rows);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/tutores-profesionales', name: 'tutores_profesionales', methods: ['GET'])]
    #[Route('/tutores-profesionales.csv', name: 'tutores_profesionales_legacy', methods: ['GET'])]
    public function tutoresProfesionales(
        Request $request,
        TutorProfesionalRepository $repository,
        EmpresaColaboradoraRepository $empresaRepository
    ): Response {
        $qb = $repository->createQueryBuilder('t')->orderBy('t.nombre', 'ASC');

        if (($empresaId = $request->query->get('empresaId')) !== null) {
            if (!ctype_digit((string) $empresaId)) {
                return $this->invalidRequest('El identificador de empresa debe ser numerico.');
            }

            $empresa = $empresaRepository->find((int) $empresaId);
            if (!$empresa) {
                return $this->json(['message' => 'Empresa no encontrada.'], Response::HTTP_NOT_FOUND);
            }

            $qb->andWhere('t.empresa = :empresa')->setParameter('empresa', $empresa);
        }

        $activo = $request->query->get('activo');
        if ($activo !== null) {
            $qb->andWhere('t.activo = :activo')->setParameter('activo', filter_var($activo, FILTER_VALIDATE_BOOLEAN));
        }

        $rows = array_map(static function ($tutor): array {
            return [
                'id' => $tutor->getId(),
                'nombre' => $tutor->getNombre(),
                'email' => $tutor->getEmail(),
                'telefono' => $tutor->getTelefono(),
                'cargo' => $tutor->getCargo(),
                'activo' => $tutor->isActivo() ? 'si' : 'no',
                'empresa' => $tutor->getEmpresa()->getNombre(),
            ];
        }, $qb->getQuery()->getResult());

        return $this->csvExporter->createResponse('agora-tutores-profesionales.csv', $rows);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/empresa-solicitudes', name: 'empresa_solicitudes', methods: ['GET'])]
    #[Route('/empresa-solicitudes.csv', name: 'empresa_solicitudes_legacy', methods: ['GET'])]
    public function solicitudes(Request $request, EmpresaSolicitudRepository $repository): Response
    {
        $criteria = [];
        if ($estado = $request->query->get('estado')) {
            $criteria['estado'] = $estado;
        }

        $rows = array_map(static function (EmpresaSolicitud $solicitud): array {
            return [
                'id' => $solicitud->getId(),
                'nombre_empresa' => $solicitud->getNombreEmpresa(),
                'cif' => $solicitud->getCif(),
                'sector' => $solicitud->getSector(),
                'ciudad' => $solicitud->getCiudad(),
                'web' => $solicitud->getWeb(),
                'contacto_nombre' => $solicitud->getContactoNombre(),
                'contacto_email' => $solicitud->getContactoEmail(),
                'contacto_telefono' => $solicitud->getContactoTelefono(),
                'estado' => $solicitud->getEstado(),
                'creada_en' => $solicitud->getCreatedAt()->format('Y-m-d H:i:s'),
                'email_verificado_en' => $solicitud->getEmailVerificadoEn()?->format('Y-m-d H:i:s'),
                'aprobado_en' => $solicitud->getAprobadoEn()?->format('Y-m-d H:i:s'),
                'motivo_rechazo' => $solicitud->getRejectionReason(),
            ];
        }, $repository->findBy($criteria, ['createdAt' => 'DESC']));

        return $this->csvExporter->createResponse('agora-solicitudes-empresa.csv', $rows);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    private function invalidRequest(string $message): JsonResponse
    {
        return $this->json(['message' => $message], Response::HTTP_BAD_REQUEST);
    }
}
