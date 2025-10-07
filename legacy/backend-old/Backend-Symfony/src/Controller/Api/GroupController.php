<?php

namespace App\Controller\Api;

use App\Entity\Grupo;
use App\Entity\Mensaje;
use App\Repository\GrupoRepository;
use App\Repository\MembresiaRepository;
use App\Repository\MensajeRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/groups')]
class GroupController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private GrupoRepository $grupoRepository,
        private MembresiaRepository $membresiaRepository,
        private MensajeRepository $mensajeRepository
    ) {}

    #[Route('', name: 'api_groups_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $grupos = $this->grupoRepository->findPublicGroups();
        
        $data = array_map(function(Grupo $grupo) {
            return [
                'id' => $grupo->getId(),
                'nombre' => $grupo->getNombre(),
                'descripcion' => $grupo->getDescripcion(),
                'privado' => $grupo->isPrivado(),
                'creado_at' => $grupo->getCreadoAt()->format('Y-m-d H:i:s'),
                'creado_por' => [
                    'id' => $grupo->getCreadoPor()->getId(),
                    'username' => $grupo->getCreadoPor()->getUsername(),
                    'nombre' => $grupo->getCreadoPor()->getNombre()
                ],
                'miembros_count' => count($grupo->getMembresias())
            ];
        }, $grupos);

        return $this->json($data);
    }

    #[Route('/{id}', name: 'api_groups_show', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        $grupo = $this->grupoRepository->find($id);
        
        if (!$grupo) {
            return $this->json(['error' => 'Grupo no encontrado'], 404);
        }

        // Si es privado, aquí deberías verificar permisos
        if ($grupo->isPrivado()) {
            return $this->json(['error' => 'Acceso denegado'], 403);
        }

        $miembros = $this->membresiaRepository->getGroupMembers($grupo);
        
        return $this->json([
            'id' => $grupo->getId(),
            'nombre' => $grupo->getNombre(),
            'descripcion' => $grupo->getDescripcion(),
            'privado' => $grupo->isPrivado(),
            'creado_at' => $grupo->getCreadoAt()->format('Y-m-d H:i:s'),
            'creado_por' => [
                'id' => $grupo->getCreadoPor()->getId(),
                'username' => $grupo->getCreadoPor()->getUsername(),
                'nombre' => $grupo->getCreadoPor()->getNombre()
            ],
            'miembros' => array_map(function($membresia) {
                return [
                    'id' => $membresia->getUsuario()->getId(),
                    'username' => $membresia->getUsuario()->getUsername(),
                    'nombre' => $membresia->getUsuario()->getNombre(),
                    'rol_en_grupo' => $membresia->getRolEnGrupo(),
                    'desde' => $membresia->getCreadoAt()->format('Y-m-d')
                ];
            }, $miembros)
        ]);
    }

    #[Route('/{id}/messages', name: 'api_groups_messages', methods: ['GET'])]
    public function messages(int $id, Request $request): JsonResponse
    {
        $grupo = $this->grupoRepository->find($id);
        
        if (!$grupo) {
            return $this->json(['error' => 'Grupo no encontrado'], 404);
        }

        $limit = (int) $request->query->get('limit', 50);
        $before = $request->query->get('before');

        $mensajes = $this->mensajeRepository->findGroupMessages($grupo, $limit, $before);
        
        $data = array_map(function(Mensaje $mensaje) {
            return [
                'id' => $mensaje->getId(),
                'contenido' => $mensaje->getContenido(),
                'tipo' => $mensaje->getTipo()->value,
                'creado_at' => $mensaje->getCreadoAt()->format('Y-m-d H:i:s'),
                'usuario' => [
                    'id' => $mensaje->getUsuario()->getId(),
                    'username' => $mensaje->getUsuario()->getUsername(),
                    'nombre' => $mensaje->getUsuario()->getNombre()
                ]
            ];
        }, $mensajes);

        return $this->json($data);
    }

    #[Route('/{id}/messages', name: 'api_groups_send_message', methods: ['POST'])]
    public function sendMessage(int $id, Request $request): JsonResponse
    {
        $grupo = $this->grupoRepository->find($id);
        
        if (!$grupo) {
            return $this->json(['error' => 'Grupo no encontrado'], 404);
        }

        $data = json_decode($request->getContent(), true);
        
        if (!isset($data['contenido']) || empty(trim($data['contenido']))) {
            return $this->json(['error' => 'Contenido requerido'], 400);
        }

        // Por ahora usar usuario admin (ID 1) - en producción obtener del token
        $usuario = $this->entityManager->getRepository(\App\Entity\Usuario::class)->find(1);
        
        $mensaje = new Mensaje();
        $mensaje->setGrupo($grupo);
        $mensaje->setUsuario($usuario);
        $mensaje->setContenido($data['contenido']);
        
        $this->entityManager->persist($mensaje);
        $this->entityManager->flush();

        return $this->json([
            'success' => true,
            'mensaje' => [
                'id' => $mensaje->getId(),
                'contenido' => $mensaje->getContenido(),
                'tipo' => $mensaje->getTipo()->value,
                'creado_at' => $mensaje->getCreadoAt()->format('Y-m-d H:i:s'),
                'usuario' => [
                    'id' => $mensaje->getUsuario()->getId(),
                    'username' => $mensaje->getUsuario()->getUsername(),
                    'nombre' => $mensaje->getUsuario()->getNombre()
                ]
            ]
        ], 201);
    }
}