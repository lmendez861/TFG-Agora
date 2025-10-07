<?php

namespace App\Controller\Api;

use App\Entity\Grupo;
use App\Entity\Mensaje;
use App\Entity\Usuario;
use App\Repository\MensajeRepository;
use App\Repository\GrupoRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api')]
class MensajeController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private MensajeRepository $mensajeRepository,
        private GrupoRepository $grupoRepository
    ) {}

    #[Route('/groups/{id}/messages', name: 'api_messages_list', methods: ['GET'])]
    public function listGroupMessages(int $id, Request $request): JsonResponse
    {
        $grupo = $this->grupoRepository->find($id);
        
        if (!$grupo) {
            return $this->json(['error' => 'Grupo no encontrado'], 404);
        }

        $limit = (int) $request->query->get('limit', 50);
        $before = $request->query->get('before');

        $mensajes = $this->mensajeRepository->findGroupMessages($grupo, $limit, $before);
        
        $data = [];
        foreach ($mensajes as $mensaje) {
            $data[] = [
                'id' => $mensaje->getId(),
                'contenido' => $mensaje->getContenido(),
                'usuario' => [
                    'id' => $mensaje->getUsuario()->getId(),
                    'username' => $mensaje->getUsuario()->getUsername(),
                    'nombre' => $mensaje->getUsuario()->getNombre()
                ],
                'tipo' => $mensaje->getTipo()->value,
                'creado_at' => $mensaje->getCreadoAt()->format('Y-m-d H:i:s'),
                'eliminado' => $mensaje->isEliminado()
            ];
        }

        return $this->json(['messages' => $data]);
    }

    #[Route('/groups/{id}/messages', name: 'api_messages_create', methods: ['POST'])]
    public function sendMessage(int $id, Request $request): JsonResponse
    {
        $grupo = $this->grupoRepository->find($id);
        
        if (!$grupo) {
            return $this->json(['error' => 'Grupo no encontrado'], 404);
        }

        $data = json_decode($request->getContent(), true);
        
        if (!isset($data['contenido']) || empty(trim($data['contenido']))) {
            return $this->json(['error' => 'El contenido del mensaje es requerido'], 400);
        }

        // Por ahora, asumimos usuario ID 1
        // En producción, obtienes el usuario del token JWT
        $usuario = $this->entityManager->getRepository(Usuario::class)->find(1);
        
        $mensaje = new Mensaje();
        $mensaje->setGrupo($grupo);
        $mensaje->setUsuario($usuario);
        $mensaje->setContenido(trim($data['contenido']));
        $mensaje->setTipo(\App\Entity\TipoMensaje::TEXTO);

        $this->entityManager->persist($mensaje);
        $this->entityManager->flush();

        return $this->json([
            'success' => true,
            'message' => [
                'id' => $mensaje->getId(),
                'contenido' => $mensaje->getContenido(),
                'usuario' => [
                    'id' => $usuario->getId(),
                    'username' => $usuario->getUsername(),
                    'nombre' => $usuario->getNombre()
                ],
                'creado_at' => $mensaje->getCreadoAt()->format('Y-m-d H:i:s')
            ]
        ], 201);
    }

    #[Route('/messages/{id}', name: 'api_messages_delete', methods: ['DELETE'])]
    public function deleteMessage(int $id): JsonResponse
    {
        $mensaje = $this->mensajeRepository->find($id);
        
        if (!$mensaje) {
            return $this->json(['error' => 'Mensaje no encontrado'], 404);
        }

        // Marcar como eliminado en lugar de borrar físicamente
        $mensaje->setEliminado(true);
        $this->entityManager->flush();

        return $this->json(['success' => true, 'message' => 'Mensaje eliminado']);
    }
}