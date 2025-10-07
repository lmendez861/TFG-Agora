<?php

namespace App\Controller\Api;

use App\Entity\Mensaje;
use App\Entity\Grupo;
use App\Entity\Usuario;
use App\Entity\AutorTipo;
use App\Entity\TipoMensaje;
use App\Service\BotManager;
use App\Repository\MensajeRepository;
use App\Repository\GrupoRepository;
use App\Repository\UsuarioRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Psr\Log\LoggerInterface;

#[Route('/api/chat')]
class ChatController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private BotManager $botManager,
        private MensajeRepository $mensajeRepository,
        private GrupoRepository $grupoRepository,
        private UsuarioRepository $usuarioRepository,
        private LoggerInterface $logger
    ) {}

    #[Route('/mensajes', name: 'api_chat_send_message', methods: ['POST'])]
    public function sendMessage(Request $request): JsonResponse
    {
        try {
            $data = json_decode($request->getContent(), true);
            
            // Validar datos requeridos
            if (!isset($data['contenido']) || empty(trim($data['contenido']))) {
                return $this->json([
                    'success' => false,
                    'error' => 'El contenido del mensaje es requerido'
                ], 400);
            }

            // Por ahora usamos usuario ID 1 (en producción vendría del JWT token)
            $usuarioId = $data['usuario_id'] ?? 1;
            $grupoId = $data['grupo_id'] ?? null;
            
            $usuario = $this->usuarioRepository->find($usuarioId);
            if (!$usuario) {
                return $this->json(['success' => false, 'error' => 'Usuario no encontrado'], 404);
            }

            $grupo = null;
            if ($grupoId) {
                $grupo = $this->grupoRepository->find($grupoId);
                if (!$grupo) {
                    return $this->json(['success' => false, 'error' => 'Grupo no encontrado'], 404);
                }
            }

            // Crear mensaje
            $mensaje = new Mensaje();
            $mensaje->setUsuario($usuario);
            $mensaje->setContenido(trim($data['contenido']));
            $mensaje->setTipo(TipoMensaje::TEXTO);
            $mensaje->setAutorTipo(AutorTipo::USUARIO);
            
            if ($grupo) {
                $mensaje->setGrupo($grupo);
            }

            $this->entityManager->persist($mensaje);
            $this->entityManager->flush();

            $this->logger->info('📝 Mensaje enviado', [
                'mensaje_id' => $mensaje->getId(),
                'usuario' => $usuario->getUsername(),
                'grupo_id' => $grupo?->getId(),
                'contenido' => substr($mensaje->getContenido(), 0, 100)
            ]);

            // Procesar mensaje con bots (asíncrono)
            $respuestaBot = null;
            try {
                $respuestaBot = $this->botManager->processMessage($mensaje);
            } catch (\Exception $e) {
                $this->logger->error('Error procesando bots', ['error' => $e->getMessage()]);
                // No fallar el envío del mensaje si hay error con bots
            }

            $response = [
                'success' => true,
                'message' => 'Mensaje enviado exitosamente',
                'mensaje' => [
                    'id' => $mensaje->getId(),
                    'contenido' => $mensaje->getContenido(),
                    'usuario' => [
                        'id' => $usuario->getId(),
                        'username' => $usuario->getUsername(),
                        'nombre' => $usuario->getNombre()
                    ],
                    'autor_tipo' => $mensaje->getAutorTipo()->value,
                    'tipo' => $mensaje->getTipo()->value,
                    'fecha' => $mensaje->getCreadoAt()->format('Y-m-d H:i:s'),
                    'grupo_id' => $grupo?->getId()
                ]
            ];

            if ($respuestaBot) {
                $response['bot_respondio'] = true;
                $response['respuesta_bot'] = $respuestaBot;
            }

            return $this->json($response, 201);

        } catch (\Exception $e) {
            $this->logger->error('Error enviando mensaje', [
                'error' => $e->getMessage(),
                'data' => $data ?? null
            ]);
            
            return $this->json([
                'success' => false,
                'error' => 'Error enviando mensaje: ' . $e->getMessage()
            ], 500);
        }
    }

    #[Route('/mensajes/{grupoId}', name: 'api_chat_get_messages', methods: ['GET'])]
    public function getMessages(int $grupoId, Request $request): JsonResponse
    {
        try {
            $grupo = $this->grupoRepository->find($grupoId);
            if (!$grupo) {
                return $this->json(['success' => false, 'error' => 'Grupo no encontrado'], 404);
            }

            $limite = (int)($request->query->get('limite', 50));
            $offset = (int)($request->query->get('offset', 0));

            $mensajes = $this->mensajeRepository->createQueryBuilder('m')
                ->where('m.grupo = :grupo')
                ->andWhere('m.eliminado = :eliminado')
                ->setParameter('grupo', $grupo)
                ->setParameter('eliminado', false)
                ->orderBy('m.creadoAt', 'DESC')
                ->setMaxResults($limite)
                ->setFirstResult($offset)
                ->getQuery()
                ->getResult();

            $mensajesData = array_map(function(Mensaje $mensaje) {
                $data = [
                    'id' => $mensaje->getId(),
                    'contenido' => $mensaje->getContenido(),
                    'tipo' => $mensaje->getTipo()->value,
                    'autor_tipo' => $mensaje->getAutorTipo()->value,
                    'fecha' => $mensaje->getCreadoAt()->format('Y-m-d H:i:s'),
                    'usuario' => [
                        'id' => $mensaje->getUsuario()->getId(),
                        'username' => $mensaje->getUsuario()->getUsername(),
                        'nombre' => $mensaje->getUsuario()->getNombre(),
                        'is_bot' => $mensaje->getUsuario()->isBot()
                    ]
                ];

                // Si es un mensaje de bot, incluir información del bot
                if ($mensaje->getAutorTipo() === AutorTipo::BOT && $mensaje->getBot()) {
                    $data['bot'] = [
                        'id' => $mensaje->getBot()->getId(),
                        'nombre' => $mensaje->getBot()->getNombre(),
                        'tipo' => $mensaje->getBot()->getTipo()->value,
                        'avatar_url' => $mensaje->getBot()->getAvatarUrl()
                    ];
                }

                // Si tiene multimedia, incluir información
                if ($mensaje->getMultimedia()) {
                    $data['multimedia'] = [
                        'id' => $mensaje->getMultimedia()->getId(),
                        'tipo' => $mensaje->getMultimedia()->getTipo()->value,
                        'url' => $mensaje->getMultimedia()->getUrl(),
                        'nombre' => $mensaje->getMultimedia()->getNombre()
                    ];
                }

                return $data;
            }, array_reverse($mensajes)); // Revertir para orden cronológico

            return $this->json([
                'success' => true,
                'mensajes' => $mensajesData,
                'grupo' => [
                    'id' => $grupo->getId(),
                    'nombre' => $grupo->getNombre(),
                    'descripcion' => $grupo->getDescripcion()
                ],
                'pagination' => [
                    'limite' => $limite,
                    'offset' => $offset,
                    'total' => count($mensajes)
                ]
            ]);

        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'error' => 'Error obteniendo mensajes: ' . $e->getMessage()
            ], 500);
        }
    }

    #[Route('/grupos/{id}/bots', name: 'api_chat_group_bots', methods: ['GET'])]
    public function getGroupBots(int $id): JsonResponse
    {
        try {
            $grupo = $this->grupoRepository->find($id);
            if (!$grupo) {
                return $this->json(['success' => false, 'error' => 'Grupo no encontrado'], 404);
            }

            // Obtener bots del grupo
            $gruposBots = $this->entityManager->getRepository(\App\Entity\GrupoBot::class)
                ->findBy(['grupo' => $grupo, 'activo' => true]);

            $bots = array_map(function($grupoBot) {
                $bot = $grupoBot->getBot();
                return [
                    'id' => $bot->getId(),
                    'nombre' => $bot->getNombre(),
                    'tipo' => $bot->getTipo()->value,
                    'descripcion' => $bot->getDescripcion(),
                    'avatar_url' => $bot->getAvatarUrl(),
                    'fecha_agregado' => $grupoBot->getFechaAgregado()->format('Y-m-d H:i:s'),
                    'agregado_por' => $grupoBot->getAgregadoPor()->getUsername()
                ];
            }, $gruposBots);

            // Obtener bots disponibles para añadir
            $botsDisponibles = $this->botManager->getAvailableBotsForGroup($grupo);
            $botsDisponiblesData = array_map(function($bot) {
                return [
                    'id' => $bot->getId(),
                    'nombre' => $bot->getNombre(),
                    'tipo' => $bot->getTipo()->value,
                    'descripcion' => $bot->getDescripcion(),
                    'avatar_url' => $bot->getAvatarUrl()
                ];
            }, $botsDisponibles);

            return $this->json([
                'success' => true,
                'grupo' => [
                    'id' => $grupo->getId(),
                    'nombre' => $grupo->getNombre()
                ],
                'bots_activos' => $bots,
                'bots_disponibles' => $botsDisponiblesData
            ]);

        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'error' => 'Error obteniendo bots del grupo: ' . $e->getMessage()
            ], 500);
        }
    }

    #[Route('/test-bot', name: 'api_chat_test_bot', methods: ['POST'])]
    public function testBotInteraction(Request $request): JsonResponse
    {
        try {
            $data = json_decode($request->getContent(), true);
            
            $contenido = $data['contenido'] ?? '';
            $botId = $data['bot_id'] ?? null;
            
            if (empty($contenido)) {
                return $this->json(['success' => false, 'error' => 'Contenido requerido'], 400);
            }

            $usuario = $this->usuarioRepository->find(1); // Usuario de prueba
            
            if ($botId) {
                // Probar bot específico
                $bot = $this->entityManager->getRepository(\App\Entity\BotEntity::class)->find($botId);
                if (!$bot) {
                    return $this->json(['success' => false, 'error' => 'Bot no encontrado'], 404);
                }
                
                $respuesta = $this->botManager->generateBotResponse($bot, $contenido, $usuario);
                
                return $this->json([
                    'success' => true,
                    'test_type' => 'bot_especifico',
                    'bot' => [
                        'id' => $bot->getId(),
                        'nombre' => $bot->getNombre(),
                        'tipo' => $bot->getTipo()->value
                    ],
                    'mensaje_enviado' => $contenido,
                    'respuesta' => $respuesta
                ]);
            } else {
                // Crear mensaje de prueba y procesar con todos los bots disponibles
                $mensaje = new Mensaje();
                $mensaje->setUsuario($usuario);
                $mensaje->setContenido($contenido);
                $mensaje->setTipo(TipoMensaje::TEXTO);
                $mensaje->setAutorTipo(AutorTipo::USUARIO);
                
                // No persistir, solo para prueba
                
                $respuesta = $this->botManager->processMessage($mensaje);
                
                return $this->json([
                    'success' => true,
                    'test_type' => 'procesamiento_general',
                    'mensaje_enviado' => $contenido,
                    'respuesta' => $respuesta,
                    'bot_respondio' => $respuesta !== null
                ]);
            }

        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'error' => 'Error en prueba de bot: ' . $e->getMessage()
            ], 500);
        }
    }
}