<?php

namespace App\Controller\Api;

use App\Entity\Grupo;
use App\Entity\Membresia;
use App\Entity\Usuario;
use App\Repository\GrupoRepository;
use App\Repository\MembresiaRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/groups')]
class GrupoController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private GrupoRepository $grupoRepository,
        private MembresiaRepository $membresiaRepository
    ) {}

    #[Route('', name: 'api_groups_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $grupos = $this->grupoRepository->findPublicGroups();
        
        $data = [];
        foreach ($grupos as $grupo) {
            $data[] = [
                'id' => $grupo->getId(),
                'nombre' => $grupo->getNombre(),
                'descripcion' => $grupo->getDescripcion(),
                'privado' => $grupo->isPrivado(),
                'creado_por' => $grupo->getCreadoPor()->getUsername(),
                'creado_at' => $grupo->getCreadoAt()->format('Y-m-d H:i:s'),
                'miembros_count' => count($grupo->getMembresias())
            ];
        }

        return $this->json(['groups' => $data]);
    }

    #[Route('/{id}', name: 'api_groups_show', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        $grupo = $this->grupoRepository->find($id);
        
        if (!$grupo) {
            return $this->json(['error' => 'Grupo no encontrado'], 404);
        }

        return $this->json([
            'id' => $grupo->getId(),
            'nombre' => $grupo->getNombre(),
            'descripcion' => $grupo->getDescripcion(),
            'privado' => $grupo->isPrivado(),
            'creado_por' => $grupo->getCreadoPor()->getUsername(),
            'creado_at' => $grupo->getCreadoAt()->format('Y-m-d H:i:s'),
            'miembros' => array_map(function($membresia) {
                return [
                    'usuario' => $membresia->getUsuario()->getUsername(),
                    'rol' => $membresia->getRolEnGrupo(),
                    'desde' => $membresia->getCreadoAt()->format('Y-m-d H:i:s')
                ];
            }, $grupo->getMembresias()->toArray())
        ]);
    }

    #[Route('', name: 'api_groups_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        
        // Validar datos requeridos
        if (!isset($data['nombre']) || empty($data['nombre'])) {
            return $this->json(['error' => 'El nombre del grupo es requerido'], 400);
        }

        // Por ahora, asumimos usuario ID 1 (admin)
        // En producción, obtienes el usuario del token JWT
        $usuario = $this->entityManager->getRepository(Usuario::class)->find(1);
        
        $grupo = new Grupo();
        $grupo->setNombre($data['nombre']);
        $grupo->setDescripcion($data['descripcion'] ?? '');
        $grupo->setCreadoPor($usuario);
        $grupo->setPrivado($data['privado'] ?? false);

        $this->entityManager->persist($grupo);
        $this->entityManager->flush();

        // Agregar al creador como miembro
        $membresia = new Membresia();
        $membresia->setGrupo($grupo);
        $membresia->setUsuario($usuario);
        $membresia->setRolEnGrupo('creador');
        
        $this->entityManager->persist($membresia);
        $this->entityManager->flush();

        return $this->json([
            'success' => true,
            'group' => [
                'id' => $grupo->getId(),
                'nombre' => $grupo->getNombre(),
                'descripcion' => $grupo->getDescripcion()
            ]
        ], 201);
    }

    #[Route('/{id}/join', name: 'api_groups_join', methods: ['POST'])]
    public function join(int $id): JsonResponse
    {
        $grupo = $this->grupoRepository->find($id);
        
        if (!$grupo) {
            return $this->json(['error' => 'Grupo no encontrado'], 404);
        }

        if ($grupo->isPrivado()) {
            return $this->json(['error' => 'No puedes unirte a un grupo privado'], 403);
        }

        // Por ahora, asumimos usuario ID 1
        // En producción, obtienes el usuario del token JWT
        $usuario = $this->entityManager->getRepository(Usuario::class)->find(1);
        
        // Verificar si ya es miembro
        if ($this->membresiaRepository->isUserMemberOfGroup($usuario, $grupo)) {
            return $this->json(['error' => 'Ya eres miembro de este grupo'], 409);
        }

        $membresia = new Membresia();
        $membresia->setGrupo($grupo);
        $membresia->setUsuario($usuario);
        $membresia->setRolEnGrupo('miembro');
        
        $this->entityManager->persist($membresia);
        $this->entityManager->flush();

        return $this->json(['success' => true, 'message' => 'Te has unido al grupo']);
    }
}