<?php

namespace App\Controller;

use App\Service\LocalAIService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Psr\Log\LoggerInterface;

#[Route('/api/ai', name: 'api_ai_')]
class AIBotController extends AbstractController
{
    public function __construct(
        private LocalAIService $localAIService,
        private LoggerInterface $logger
    ) {}

    #[Route('/chat', name: 'chat', methods: ['POST'])]
    public function chatWithBot(Request $request): JsonResponse
    {
        try {
            $data = json_decode($request->getContent(), true);
            
            // Validar datos requeridos
            $requiredFields = ['user_message', 'bot_id', 'bot_name'];
            foreach ($requiredFields as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    return $this->json([
                        'success' => false,
                        'error' => "Campo requerido: {$field}"
                    ], 400);
                }
            }

            // Preparar contexto para LocalAI
            $context = [
                'user_message' => $data['user_message'],
                'user_name' => $data['user_name'] ?? 'Usuario',
                'bot_id' => $data['bot_id'],
                'bot_name' => $data['bot_name'],
                'bot_personality' => $data['bot_personality'] ?? 'Eres un asistente útil y amigable',
                'bot_type' => $data['bot_type'] ?? 'general',
                'language' => $data['language'] ?? 'es',
                'tone' => $data['tone'] ?? 'amigable',
                'channel_id' => $data['channel_id'] ?? null,
                'conversation_history' => $data['history'] ?? []
            ];

            $this->logger->info('🤖 Iniciando chat con bot IA', [
                'bot_name' => $context['bot_name'],
                'bot_type' => $context['bot_type'],
                'user_message_length' => strlen($context['user_message'])
            ]);

            // Generar respuesta con LocalAI
            $aiResponse = $this->localAIService->generateResponse($context);

            if (!$aiResponse) {
                return $this->json([
                    'success' => false,
                    'error' => 'No se pudo generar respuesta del bot'
                ], 500);
            }

            // Preparar respuesta
            $response = [
                'success' => true,
                'data' => [
                    'bot_response' => $aiResponse,
                    'bot_id' => $context['bot_id'],
                    'bot_name' => $context['bot_name'],
                    'timestamp' => time(),
                    'message_id' => uniqid('msg_'),
                    'ai_powered' => true,
                    'model_used' => 'LocalAI',
                    'response_time' => microtime(true) - $_SERVER['REQUEST_TIME_FLOAT']
                ]
            ];

            $this->logger->info('✅ Respuesta de bot IA generada', [
                'response_length' => strlen($aiResponse),
                'response_time' => $response['data']['response_time']
            ]);

            return $this->json($response);

        } catch (\Exception $e) {
            $this->logger->error('❌ Error en chat con bot IA', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->json([
                'success' => false,
                'error' => 'Error interno del servidor',
                'debug' => $e->getMessage()
            ], 500);
        }
    }

    #[Route('/status', name: 'status', methods: ['GET'])]
    public function getAIStatus(): JsonResponse
    {
        try {
            $status = $this->localAIService->getUsageStats();
            $models = $this->localAIService->getAvailableModels();

            return $this->json([
                'success' => true,
                'data' => [
                    'localai_status' => $status,
                    'available_models' => $models,
                    'recommendations' => $this->getModelRecommendations()
                ]
            ]);

        } catch (\Exception $e) {
            $this->logger->error('❌ Error obteniendo status de IA', [
                'error' => $e->getMessage()
            ]);

            return $this->json([
                'success' => false,
                'error' => 'No se pudo obtener el status de IA'
            ], 500);
        }
    }

    #[Route('/models', name: 'models', methods: ['GET'])]
    public function getAvailableModels(): JsonResponse
    {
        try {
            $models = $this->localAIService->getAvailableModels();
            
            return $this->json([
                'success' => true,
                'data' => [
                    'models' => $models,
                    'recommendations' => $this->getModelRecommendations()
                ]
            ]);

        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'error' => 'No se pudieron obtener los modelos'
            ], 500);
        }
    }

    #[Route('/model', name: 'set_model', methods: ['POST'])]
    public function setActiveModel(Request $request): JsonResponse
    {
        try {
            $data = json_decode($request->getContent(), true);
            
            if (!isset($data['model'])) {
                return $this->json([
                    'success' => false,
                    'error' => 'Modelo requerido'
                ], 400);
            }

            $this->localAIService->setModel($data['model']);

            return $this->json([
                'success' => true,
                'message' => "Modelo '{$data['model']}' configurado correctamente"
            ]);

        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'error' => 'No se pudo configurar el modelo'
            ], 500);
        }
    }

    private function getModelRecommendations(): array
    {
        return [
            'general_chat' => [
                'model' => 'llama-2-7b-chat',
                'description' => 'Mejor para conversaciones generales y asistencia',
                'size' => '~4GB',
                'performance' => 'Rápido'
            ],
            'programming' => [
                'model' => 'code-llama-7b',
                'description' => 'Especializado en código y programación',
                'size' => '~4GB', 
                'performance' => 'Medio'
            ],
            'lightweight' => [
                'model' => 'gpt4all-j',
                'description' => 'Modelo ligero para pruebas rápidas',
                'size' => '~1GB',
                'performance' => 'Muy rápido'
            ]
        ];
    }
}