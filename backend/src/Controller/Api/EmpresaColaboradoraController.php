<?php

namespace App\Controller\Api;

use App\Entity\EmpresaColaboradora;
use App\Entity\EmpresaDocumento;
use App\Entity\EmpresaEtiqueta;
use App\Entity\EmpresaNota;
use App\Repository\EmpresaColaboradoraRepository;
use App\Repository\EmpresaDocumentoRepository;
use App\Repository\EmpresaEtiquetaRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/empresas', name: 'api_empresas_')]
#[IsGranted('ROLE_API')]
final class EmpresaColaboradoraController extends AbstractController
{
    use JsonRequestTrait;

    public function __construct(private readonly RequestStack $requestStack)
    {
    }

    private const ESTADOS_COLABORACION = [
        'activa',
        'en_negociacion',
        'pendiente_revision',
        'pausada',
        'baja',
        'suspendida',
    ];

    #[Route('', name: 'index', methods: ['GET'])]
    public function index(Request $request, EmpresaColaboradoraRepository $repository): JsonResponse
    {
        $qb = $repository->createQueryBuilder('e');

        if ($estado = $request->query->get('estado')) {
            if (!\in_array($estado, self::ESTADOS_COLABORACION, true)) {
                return $this->json([
                    'message' => 'El estado de colaboración indicado no es válido.',
                ], Response::HTTP_BAD_REQUEST);
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

        $page = $request->query->get('page');
        $perPage = $request->query->get('perPage');

        if ($page !== null) {
            [$pageNum, $perPageNum] = $this->resolvePagination($request);
            $qb->orderBy('e.id', 'ASC')
                ->setFirstResult(($pageNum - 1) * $perPageNum)
                ->setMaxResults($perPageNum);
            $total = (int) $repository->createQueryBuilder('e')->select('COUNT(e.id)')->getQuery()->getSingleScalarResult();
            $empresas = $qb->getQuery()->getResult();
            $data = array_map(fn (EmpresaColaboradora $empresa): array => $this->serializeSummary($empresa), $empresas);

            return $this->json([
                'items' => $data,
                'page' => $pageNum,
                'perPage' => $perPageNum,
                'total' => $total,
            ], Response::HTTP_OK);
        }

        $empresas = $qb->orderBy('e.id', 'ASC')->getQuery()->getResult();
        $data = array_map(fn (EmpresaColaboradora $empresa): array => $this->serializeSummary($empresa), $empresas);

        return $this->json($data, Response::HTTP_OK);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    public function create(
        Request $request,
        EntityManagerInterface $entityManager,
        ValidatorInterface $validator
    ): JsonResponse {
        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $constraints = new Assert\Collection(
            fields: [
                'nombre' => [new Assert\NotBlank(), new Assert\Length(max: 150)],
                'sector' => new Assert\Optional([new Assert\Length(max: 120)]),
                'direccion' => new Assert\Optional([new Assert\Length(max: 255)]),
                'ciudad' => new Assert\Optional([new Assert\Length(max: 100)]),
                'provincia' => new Assert\Optional([new Assert\Length(max: 100)]),
                'pais' => new Assert\Optional([new Assert\Length(max: 100)]),
                'telefono' => new Assert\Optional([new Assert\Length(max: 50)]),
                'email' => new Assert\Optional([new Assert\Email(), new Assert\Length(max: 150)]),
                'web' => new Assert\Optional([new Assert\Length(max: 150)]),
                'estadoColaboracion' => new Assert\Optional([new Assert\Choice(choices: self::ESTADOS_COLABORACION)]),
                'fechaAlta' => new Assert\Optional([new Assert\Length(min: 10, max: 10)]),
                'observaciones' => new Assert\Optional(),
            ],
            allowExtraFields: true
        );

        $violations = $validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        $empresa = new EmpresaColaboradora();
        $empresa->setNombre($payload['nombre']);

        if (isset($payload['sector'])) {
            $empresa->setSector($payload['sector']);
        }
        if (array_key_exists('direccion', $payload)) {
            $empresa->setDireccion($payload['direccion']);
        }
        if (array_key_exists('ciudad', $payload)) {
            $empresa->setCiudad($payload['ciudad']);
        }
        if (array_key_exists('provincia', $payload)) {
            $empresa->setProvincia($payload['provincia']);
        }
        if (array_key_exists('pais', $payload)) {
            $empresa->setPais($payload['pais']);
        }
        if (array_key_exists('telefono', $payload)) {
            $empresa->setTelefono($payload['telefono']);
        }
        if (array_key_exists('email', $payload)) {
            $empresa->setEmail($payload['email']);
        }
        if (array_key_exists('web', $payload)) {
            $empresa->setWeb($payload['web']);
        }
        if (array_key_exists('estadoColaboracion', $payload)) {
            $empresa->setEstadoColaboracion($payload['estadoColaboracion']);
        }
        if (array_key_exists('observaciones', $payload)) {
            $empresa->setObservaciones($payload['observaciones']);
        }

        if (isset($payload['fechaAlta'])) {
            $fechaAlta = $this->parseDate($payload['fechaAlta'], 'fechaAlta');
            if ($fechaAlta instanceof JsonResponse) {
                return $fechaAlta;
            }
            $empresa->setFechaAlta($fechaAlta);
        }

        $entityManager->persist($empresa);
        $entityManager->flush();

        return $this->json($this->serializeDetail($empresa), Response::HTTP_CREATED);
    }

    #[Route('/{id<\\d+>}', name: 'show', methods: ['GET'])]
    public function show(?EmpresaColaboradora $empresa): JsonResponse
    {
        if (!$empresa) {
            return $this->json(['message' => 'Empresa no encontrada'], Response::HTTP_NOT_FOUND);
        }

        return $this->json($this->serializeDetail($empresa), Response::HTTP_OK);
    }

    #[Route('/{id<\\d+>}', name: 'update', methods: ['PUT'])]
    public function update(
        ?EmpresaColaboradora $empresa,
        Request $request,
        EntityManagerInterface $entityManager,
        ValidatorInterface $validator
    ): JsonResponse {
        if (!$empresa) {
            return $this->json(['message' => 'Empresa no encontrada'], Response::HTTP_NOT_FOUND);
        }

        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $constraints = new Assert\Collection(
            fields: [
                'nombre' => new Assert\Optional([new Assert\NotBlank(), new Assert\Length(max: 150)]),
                'sector' => new Assert\Optional([new Assert\Length(max: 120)]),
                'direccion' => new Assert\Optional([new Assert\Length(max: 255)]),
                'ciudad' => new Assert\Optional([new Assert\Length(max: 100)]),
                'provincia' => new Assert\Optional([new Assert\Length(max: 100)]),
                'pais' => new Assert\Optional([new Assert\Length(max: 100)]),
                'telefono' => new Assert\Optional([new Assert\Length(max: 50)]),
                'email' => new Assert\Optional([new Assert\Email(), new Assert\Length(max: 150)]),
                'web' => new Assert\Optional([new Assert\Length(max: 150)]),
                'estadoColaboracion' => new Assert\Optional([new Assert\Choice(choices: self::ESTADOS_COLABORACION)]),
                'fechaAlta' => new Assert\Optional([new Assert\Length(min: 10, max: 10)]),
                'observaciones' => new Assert\Optional(),
            ],
            allowMissingFields: true,
            allowExtraFields: true
        );

        $violations = $validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        if (array_key_exists('nombre', $payload)) {
            $empresa->setNombre($payload['nombre']);
        }
        if (array_key_exists('sector', $payload)) {
            $empresa->setSector($payload['sector']);
        }
        if (array_key_exists('direccion', $payload)) {
            $empresa->setDireccion($payload['direccion']);
        }
        if (array_key_exists('ciudad', $payload)) {
            $empresa->setCiudad($payload['ciudad']);
        }
        if (array_key_exists('provincia', $payload)) {
            $empresa->setProvincia($payload['provincia']);
        }
        if (array_key_exists('pais', $payload)) {
            $empresa->setPais($payload['pais']);
        }
        if (array_key_exists('telefono', $payload)) {
            $empresa->setTelefono($payload['telefono']);
        }
        if (array_key_exists('email', $payload)) {
            $empresa->setEmail($payload['email']);
        }
        if (array_key_exists('web', $payload)) {
            $empresa->setWeb($payload['web']);
        }
        if (array_key_exists('estadoColaboracion', $payload)) {
            $empresa->setEstadoColaboracion($payload['estadoColaboracion']);
        }
        if (array_key_exists('observaciones', $payload)) {
            $empresa->setObservaciones($payload['observaciones']);
        }
        if (array_key_exists('fechaAlta', $payload)) {
            $fechaAlta = $this->parseDate($payload['fechaAlta'], 'fechaAlta');
            if ($fechaAlta instanceof JsonResponse) {
                return $fechaAlta;
            }
            $empresa->setFechaAlta($fechaAlta);
        }

        $entityManager->flush();

        return $this->json($this->serializeDetail($empresa), Response::HTTP_OK);
    }

    #[Route('/{id<\d+>}/etiquetas', name: 'add_label', methods: ['POST'])]
    public function addEtiqueta(
        ?EmpresaColaboradora $empresa,
        Request $request,
        ValidatorInterface $validator,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        if (!$empresa) {
            return $this->json(['message' => 'Empresa no encontrada'], Response::HTTP_NOT_FOUND);
        }

        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $constraints = new Assert\Collection([
            'nombre' => [new Assert\NotBlank(), new Assert\Length(max: 80)],
            'colorHex' => new Assert\Optional([new Assert\Length(max: 32)]),
        ]);

        $violations = $validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        $etiqueta = (new EmpresaEtiqueta())
            ->setEmpresa($empresa)
            ->setNombre($payload['nombre'])
            ->setColorHex($payload['colorHex'] ?? null);

        $entityManager->persist($etiqueta);
        $entityManager->flush();

        return $this->json($this->serializeEtiqueta($etiqueta), Response::HTTP_CREATED);
    }

    #[Route('/{id<\d+>}/etiquetas/{etiquetaId<\d+>}', name: 'delete_label', methods: ['DELETE'])]
    public function deleteEtiqueta(
        ?EmpresaColaboradora $empresa,
        int $etiquetaId,
        EmpresaEtiquetaRepository $etiquetaRepository,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        if (!$empresa) {
            return $this->json(['message' => 'Empresa no encontrada'], Response::HTTP_NOT_FOUND);
        }

        $etiqueta = $etiquetaRepository->find($etiquetaId);
        if (!$etiqueta || $etiqueta->getEmpresa()->getId() !== $empresa->getId()) {
            return $this->json(['message' => 'Etiqueta no encontrada'], Response::HTTP_NOT_FOUND);
        }

        $entityManager->remove($etiqueta);
        $entityManager->flush();

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/{id<\d+>}/notas', name: 'add_note', methods: ['POST'])]
    public function addNota(
        ?EmpresaColaboradora $empresa,
        Request $request,
        ValidatorInterface $validator,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        if (!$empresa) {
            return $this->json(['message' => 'Empresa no encontrada'], Response::HTTP_NOT_FOUND);
        }

        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $constraints = new Assert\Collection(
            fields: [
                'autor' => new Assert\Optional([new Assert\Length(max: 120)]),
                'contenido' => [new Assert\NotBlank()],
            ],
            allowExtraFields: true
        );

        $violations = $validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        $nota = (new EmpresaNota())
            ->setEmpresa($empresa)
            ->setAutor($payload['autor'] ?? 'Coordinación')
            ->setContenido($payload['contenido']);

        $entityManager->persist($nota);
        $entityManager->flush();

        return $this->json($this->serializeNota($nota), Response::HTTP_CREATED);
    }

    #[Route('/{id<\d+>}/documentos', name: 'add_document', methods: ['POST'])]
    public function addDocumento(
        ?EmpresaColaboradora $empresa,
        Request $request,
        ValidatorInterface $validator,
        EntityManagerInterface $entityManager,
        Filesystem $filesystem
    ): JsonResponse {
        if (!$empresa) {
            return $this->json(['message' => 'Empresa no encontrada'], Response::HTTP_NOT_FOUND);
        }

        // Si viene un fichero (multipart), lo subimos; si no, usamos JSON con URL.
        if ($request->files->count() > 0) {
            $file = $request->files->get('file');
            if (!$file) {
                return $this->json(['message' => 'Archivo no proporcionado.'], Response::HTTP_BAD_REQUEST);
            }
            $originalName = $file->getClientOriginalName();
            $safeName = pathinfo($originalName, PATHINFO_FILENAME);
            $extension = $file->getClientOriginalExtension();
            $finalName = sprintf('%s_%s.%s', $safeName, uniqid('', true), $extension ?: 'bin');

            $targetDir = sprintf('%s/var/uploads/empresas/%d', $this->getParameter('kernel.project_dir'), $empresa->getId());
            if (!$filesystem->exists($targetDir)) {
                $filesystem->mkdir($targetDir, 0775);
            }
            $file->move($targetDir, $finalName);
            $storedUrl = sprintf('/api/empresas/%d/documentos/%s', $empresa->getId(), $finalName);

            $nombre = $request->request->get('nombre') ?: $originalName;
            $tipo = $request->request->get('tipo') ?: $extension;

            $documento = (new EmpresaDocumento())
                ->setEmpresa($empresa)
                ->setNombre($nombre)
                ->setTipo($tipo ?: null)
                ->setUrl($storedUrl);
        } else {
            $payload = $this->decodePayload($request);
            if ($payload instanceof JsonResponse) {
                return $payload;
            }

            $constraints = new Assert\Collection(
                fields: [
                    'nombre' => [new Assert\NotBlank(), new Assert\Length(max: 150)],
                    'tipo' => new Assert\Optional([new Assert\Length(max: 80)]),
                    'url' => new Assert\Optional([new Assert\Length(max: 255)]),
                ],
                allowExtraFields: true
            );

            $violations = $validator->validate($payload, $constraints);
            if ($violations->count() > 0) {
                return $this->validationErrorResponse($violations);
            }

            $documento = (new EmpresaDocumento())
                ->setEmpresa($empresa)
                ->setNombre($payload['nombre'])
                ->setTipo($payload['tipo'] ?? null)
                ->setUrl($payload['url'] ?? null);
        }

        $entityManager->persist($documento);
        $entityManager->flush();

        return $this->json($this->serializeDocumento($documento), Response::HTTP_CREATED);
    }

    #[Route('/{id<\\d+>}/documentos/{filename}', name: 'download_document', methods: ['GET'])]
    public function downloadDocumento(int $id, string $filename): Response
    {
        $filePath = sprintf('%s/var/uploads/empresas/%d/%s', $this->getParameter('kernel.project_dir'), $id, $filename);
        if (!is_file($filePath)) {
            return $this->json(['message' => 'Documento no encontrado.'], Response::HTTP_NOT_FOUND);
        }
        $mimeType = mime_content_type($filePath) ?: 'application/octet-stream';
        return $this->file($filePath, $filename, ResponseHeaderBag::DISPOSITION_INLINE, ['Content-Type' => $mimeType]);
    }

    private function serializeSummary(EmpresaColaboradora $empresa): array
    {
        $asignaciones = $empresa->getAsignaciones();

        return [
            'id' => $empresa->getId(),
            'nombre' => $empresa->getNombre(),
            'sector' => $empresa->getSector(),
            'ciudad' => $empresa->getCiudad(),
            'estadoColaboracion' => $empresa->getEstadoColaboracion(),
            'conveniosActivos' => $empresa->getConvenios()->count(),
            'tutoresProfesionales' => $empresa->getTutoresProfesionales()->count(),
            'contactos' => $empresa->getContactos()->count(),
            'asignaciones' => [
                'total' => $asignaciones->count(),
                'enCurso' => $asignaciones->filter(static fn ($a) => $a->getEstado() === 'en_curso')->count(),
            ],
        ];
    }

    private function serializeDetail(EmpresaColaboradora $empresa): array
    {
        $asignaciones = $empresa->getAsignaciones();
        $conteoPorEstado = [];
        foreach ($asignaciones as $asignacion) {
            $estado = $asignacion->getEstado();
            $conteoPorEstado[$estado] = ($conteoPorEstado[$estado] ?? 0) + 1;
        }

        $contactos = array_map(static function ($contacto): array {
            return [
                'id' => $contacto->getId(),
                'nombre' => $contacto->getNombre(),
                'cargo' => $contacto->getCargo(),
                'telefono' => $contacto->getTelefono(),
                'email' => $contacto->getEmail(),
                'esTutorProfesional' => $contacto->isTutorProfesional(),
            ];
        }, $empresa->getContactos()->toArray());

        $tutores = array_map(static function ($tutor): array {
            return [
                'id' => $tutor->getId(),
                'nombre' => $tutor->getNombre(),
                'email' => $tutor->getEmail(),
                'telefono' => $tutor->getTelefono(),
                'cargo' => $tutor->getCargo(),
                'activo' => $tutor->isActivo(),
            ];
        }, $empresa->getTutoresProfesionales()->toArray());

        $convenios = array_map(static function ($convenio): array {
            return [
                'id' => $convenio->getId(),
                'titulo' => $convenio->getTitulo(),
                'estado' => $convenio->getEstado(),
                'tipo' => $convenio->getTipo(),
                'fechaInicio' => $convenio->getFechaInicio()->format('Y-m-d'),
                'fechaFin' => $convenio->getFechaFin()?->format('Y-m-d'),
            ];
        }, $empresa->getConvenios()->toArray());

        return [
            'id' => $empresa->getId(),
            'nombre' => $empresa->getNombre(),
            'sector' => $empresa->getSector(),
            'direccion' => $empresa->getDireccion(),
            'ciudad' => $empresa->getCiudad(),
            'provincia' => $empresa->getProvincia(),
            'pais' => $empresa->getPais(),
            'telefono' => $empresa->getTelefono(),
            'email' => $empresa->getEmail(),
            'web' => $empresa->getWeb(),
            'estadoColaboracion' => $empresa->getEstadoColaboracion(),
            'fechaAlta' => $empresa->getFechaAlta()->format('Y-m-d'),
            'observaciones' => $empresa->getObservaciones(),
            'contactos' => $contactos,
            'tutoresProfesionales' => $tutores,
            'convenios' => $convenios,
            'resumenAsignaciones' => [
                'total' => $asignaciones->count(),
                'porEstado' => $conteoPorEstado,
            ],
            'etiquetas' => array_map(fn (EmpresaEtiqueta $etiqueta): array => $this->serializeEtiqueta($etiqueta), $empresa->getEtiquetas()->toArray()),
            'notas' => array_map(fn (EmpresaNota $nota): array => $this->serializeNota($nota), $empresa->getNotas()->toArray()),
            'documentos' => array_map(fn (EmpresaDocumento $documento): array => $this->serializeDocumento($documento), $empresa->getDocumentos()->toArray()),
        ];
    }

    /**
     * @return array{id:int,nombre:string,createdAt:string}
     */
    private function serializeEtiqueta(EmpresaEtiqueta $etiqueta): array
    {
        return [
            'id' => $etiqueta->getId(),
            'nombre' => $etiqueta->getNombre(),
            'colorHex' => $etiqueta->getColorHex(),
            'createdAt' => $etiqueta->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    /**
     * @return array{id:int,autor:string,contenido:string,createdAt:string}
     */
    private function serializeNota(EmpresaNota $nota): array
    {
        return [
            'id' => $nota->getId(),
            'autor' => $nota->getAutor(),
            'contenido' => $nota->getContenido(),
            'createdAt' => $nota->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    /**
     * @return array{id:int,nombre:string,tipo:?string,url:?string,uploadedAt:string}
     */
    private function serializeDocumento(EmpresaDocumento $documento): array
    {
        $publicUrl = $documento->getUrl();
        if ($publicUrl) {
            $publicUrl = $this->buildAbsoluteUrl($publicUrl);
        }

        return [
            'id' => $documento->getId(),
            'nombre' => $documento->getNombre(),
            'tipo' => $documento->getTipo(),
            'url' => $publicUrl,
            'uploadedAt' => $documento->getUploadedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    private function buildAbsoluteUrl(string $path): string
    {
        if (str_starts_with($path, 'http')) {
            return $path;
        }

        $request = $this->requestStack->getCurrentRequest();
        if ($request) {
            return rtrim($request->getSchemeAndHttpHost(), '/') . $path;
        }

        $scheme = (string) ($this->getParameter('router.request_context.scheme') ?? 'http');
        $host = (string) ($this->getParameter('router.request_context.host') ?? 'localhost');
        $port = (string) ($this->getParameter($scheme === 'https' ? 'router.request_context.https_port' : 'router.request_context.http_port') ?? '');
        $portPart = $port && !in_array($port, ['80', '443'], true) ? ':' . $port : '';

        return sprintf('%s://%s%s%s', $scheme, $host, $portPart, $path);
    }

    /**
     * @return array{0:int,1:int}
     */
    private function resolvePagination(Request $request): array
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = (int) $request->query->get('perPage', 50);
        if ($perPage < 1) {
            $perPage = 1;
        }
        if ($perPage > 100) {
            $perPage = 100;
        }

        return [$page, $perPage];
    }
}
