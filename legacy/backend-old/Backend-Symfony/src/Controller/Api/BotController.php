<?php

namespace App\Controller\Api;

use App\Entity\BotEntity;
use App\Entity\BotType;
use App\Entity\BotScope;
use App\Entity\BotRespuesta;
use App\Entity\Grupo;
use App\Service\BotManager;
use App\Service\LocalAIService;
use App\Repository\BotEntityRepository;
use App\Repository\GrupoRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/bots')]
class BotController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private BotManager $botManager,
        private LocalAIService $localAIService,
        private BotEntityRepository $botRepository,
        private GrupoRepository $grupoRepository
    ) {}

    #[Route('', name: 'api_bots_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        try {
            $tipo = $request->query->get('tipo');
            $scope = $request->query->get('scope');
            
            $queryBuilder = $this->botRepository->createQueryBuilder('b')
                ->where('b.activo = :activo')
                ->setParameter('activo', true)
                ->orderBy('b.nombre', 'ASC');

            if ($tipo) {
                $queryBuilder->andWhere('b.tipo = :tipo')
                    ->setParameter('tipo', $tipo);
            }

            if ($scope) {
                $queryBuilder->andWhere('b.scope = :scope')
                    ->setParameter('scope', $scope);
            }

            $bots = $queryBuilder->getQuery()->getResult();

            return $this->json([
                'success' => true,
                'bots' => array_map(function(BotEntity $bot) {
                    return [
                        'id' => $bot->getId(),
                        'nombre' => $bot->getNombre(),
                        'tipo' => $bot->getTipo()->value,
                        'scope' => $bot->getScope()->value,
                        'descripcion' => $bot->getDescripcion(),
                        'avatar_url' => $bot->getAvatarUrl(),
                        'creador' => $bot->getCreador()->getUsername(),
                        'fecha_creacion' => $bot->getFechaCreacion()->format('Y-m-d H:i:s')
                    ];
                }, $bots)
            ]);

        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'error' => 'Error obteniendo bots: ' . $e->getMessage()
            ], 500);
        }
    }

    #[Route('/{id}', name: 'api_bots_get', methods: ['GET'])]
    public function get(int $id): JsonResponse
    {
        try {
            $bot = $this->botRepository->find($id);
            
            if (!$bot || !$bot->isActivo()) {
                return $this->json([
                    'success' => false,
                    'error' => 'Bot no encontrado'
                ], 404);
            }

            return $this->json([
                'success' => true,
                'bot' => [
                    'id' => $bot->getId(),
                    'nombre' => $bot->getNombre(),
                    'tipo' => $bot->getTipo()->value,
                    'scope' => $bot->getScope()->value,
                    'personalidad' => $bot->getPersonalidad(),
                    'descripcion' => $bot->getDescripcion(),
                    'avatar_url' => $bot->getAvatarUrl(),
                    'modelo_asociado' => $bot->getModeloAsociado(),
                    'creador' => [
                        'id' => $bot->getCreador()->getId(),
                        'username' => $bot->getCreador()->getUsername()
                    ],
                    'fecha_creacion' => $bot->getFechaCreacion()->format('Y-m-d H:i:s'),
                    'respuestas_count' => $bot->getRespuestas()->count()
                ]
            ]);

        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'error' => 'Error obteniendo bot: ' . $e->getMessage()
            ], 500);
        }
    }

    #[Route('', name: 'api_bots_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        try {
            $data = json_decode($request->getContent(), true);
            
            // Validar datos requeridos
            $required = ['nombre', 'tipo', 'scope'];
            foreach ($required as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    return $this->json([
                        'success' => false,
                        'error' => "El campo $field es requerido"
                    ], 400);
                }
            }

            // Validar enums
            try {
                $tipo = BotType::from($data['tipo']);
                $scope = BotScope::from($data['scope']);
            } catch (\ValueError $e) {
                return $this->json([
                    'success' => false,
                    'error' => 'Tipo o scope inválido'
                ], 400);
            }

            // Obtener usuario actual (esto debería venir del token JWT)
            // Por ahora usamos un usuario por defecto
            $creador = $this->entityManager->getRepository(\App\Entity\Usuario::class)->find(1);
            
            if (!$creador) {
                return $this->json([
                    'success' => false,
                    'error' => 'Usuario no encontrado'
                ], 400);
            }

            $bot = new BotEntity();
            $bot->setNombre($data['nombre']);
            $bot->setTipo($tipo);
            $bot->setScope($scope);
            $bot->setCreador($creador);
            
            if (isset($data['descripcion'])) {
                $bot->setDescripcion($data['descripcion']);
            }
            
            if (isset($data['personalidad'])) {
                $bot->setPersonalidad($data['personalidad']);
            }
            
            if (isset($data['avatar_url'])) {
                $bot->setAvatarUrl($data['avatar_url']);
            }
            
            if (isset($data['modelo_asociado'])) {
                $bot->setModeloAsociado($data['modelo_asociado']);
            }

            $this->entityManager->persist($bot);
            $this->entityManager->flush();

            return $this->json([
                'success' => true,
                'message' => 'Bot creado exitosamente',
                'bot' => [
                    'id' => $bot->getId(),
                    'nombre' => $bot->getNombre(),
                    'tipo' => $bot->getTipo()->value,
                    'scope' => $bot->getScope()->value
                ]
            ], 201);

        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'error' => 'Error creando bot: ' . $e->getMessage()
            ], 500);
        }
    }

    #[Route('/{id}/respuestas', name: 'api_bots_add_response', methods: ['POST'])]
    public function addResponse(int $id, Request $request): JsonResponse
    {
        try {
            $bot = $this->botRepository->find($id);
            
            if (!$bot) {
                return $this->json([
                    'success' => false,
                    'error' => 'Bot no encontrado'
                ], 404);
            }

            $data = json_decode($request->getContent(), true);
            
            $required = ['keyword', 'respuesta'];
            foreach ($required as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    return $this->json([
                        'success' => false,
                        'error' => "El campo $field es requerido"
                    ], 400);
                }
            }

            $botRespuesta = new BotRespuesta();
            $botRespuesta->setBot($bot);
            $botRespuesta->setKeyword($data['keyword']);
            $botRespuesta->setRespuesta($data['respuesta']);
            
            if (isset($data['prioridad'])) {
                $botRespuesta->setPrioridad((int)$data['prioridad']);
            }
            
            if (isset($data['es_regex'])) {
                $botRespuesta->setEsRegex((bool)$data['es_regex']);
            }

            $this->entityManager->persist($botRespuesta);
            $this->entityManager->flush();

            return $this->json([
                'success' => true,
                'message' => 'Respuesta añadida exitosamente',
                'respuesta' => [
                    'id' => $botRespuesta->getId(),
                    'keyword' => $botRespuesta->getKeyword(),
                    'respuesta' => $botRespuesta->getRespuesta()
                ]
            ]);

        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'error' => 'Error añadiendo respuesta: ' . $e->getMessage()
            ], 500);
        }
    }

    #[Route('/{botId}/grupos/{grupoId}', name: 'api_bots_add_to_group', methods: ['POST'])]
    public function addToGroup(int $botId, int $grupoId): JsonResponse
    {
        try {
            $bot = $this->botRepository->find($botId);
            $grupo = $this->grupoRepository->find($grupoId);
            
            if (!$bot) {
                return $this->json(['success' => false, 'error' => 'Bot no encontrado'], 404);
            }
            
            if (!$grupo) {
                return $this->json(['success' => false, 'error' => 'Grupo no encontrado'], 404);
            }

            // Obtener usuario actual (desde token JWT en producción)
            $usuario = $this->entityManager->getRepository(\App\Entity\Usuario::class)->find(1);
            
            $success = $this->botManager->addBotToGroup($bot, $grupo, $usuario);
            
            if ($success) {
                return $this->json([
                    'success' => true,
                    'message' => 'Bot añadido al grupo exitosamente'
                ]);
            } else {
                return $this->json([
                    'success' => false,
                    'error' => 'El bot ya está en el grupo o ocurrió un error'
                ], 400);
            }

        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'error' => 'Error añadiendo bot al grupo: ' . $e->getMessage()
            ], 500);
        }
    }

    #[Route('/{botId}/grupos/{grupoId}', name: 'api_bots_remove_from_group', methods: ['DELETE'])]
    public function removeFromGroup(int $botId, int $grupoId): JsonResponse
    {
        try {
            $bot = $this->botRepository->find($botId);
            $grupo = $this->grupoRepository->find($grupoId);
            
            if (!$bot || !$grupo) {
                return $this->json(['success' => false, 'error' => 'Bot o grupo no encontrado'], 404);
            }

            $success = $this->botManager->removeBotFromGroup($bot, $grupo);
            
            if ($success) {
                return $this->json([
                    'success' => true,
                    'message' => 'Bot removido del grupo exitosamente'
                ]);
            } else {
                return $this->json([
                    'success' => false,
                    'error' => 'El bot no está en el grupo'
                ], 400);
            }

        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'error' => 'Error removiendo bot del grupo: ' . $e->getMessage()
            ], 500);
        }
    }

    #[Route('/test/{id}', name: 'api_bots_test', methods: ['POST'])]
    public function testBot(int $id, Request $request): JsonResponse
    {
        try {
            $bot = $this->botRepository->find($id);
            
            if (!$bot) {
                return $this->json(['success' => false, 'error' => 'Bot no encontrado'], 404);
            }

            $data = json_decode($request->getContent(), true);
            $mensaje = $data['mensaje'] ?? '';
            
            if (empty($mensaje)) {
                return $this->json(['success' => false, 'error' => 'Mensaje requerido'], 400);
            }

            // Usuario de prueba
            $usuario = $this->entityManager->getRepository(\App\Entity\Usuario::class)->find(1);
            
            $respuesta = $this->botManager->generateBotResponse($bot, $mensaje, $usuario);

            return $this->json([
                'success' => true,
                'bot' => $bot->getNombre(),
                'mensaje_enviado' => $mensaje,
                'respuesta' => $respuesta ?: 'Sin respuesta',
                'tipo_bot' => $bot->getTipo()->value
            ]);

        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'error' => 'Error probando bot: ' . $e->getMessage()
            ], 500);
        }
    }

    #[Route('/localai/status', name: 'api_bots_localai_status', methods: ['GET'])]
    public function localaiStatus(): JsonResponse
    {
        try {
            $stats = $this->localAIService->getUsageStats();
            
            return $this->json([
                'success' => true,
                'localai' => $stats
            ]);

        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'error' => 'Error obteniendo estado de LocalAI: ' . $e->getMessage()
            ], 500);
        }
    }
}