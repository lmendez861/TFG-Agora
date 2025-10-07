<?php

namespace App\Service;

use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class LocalAIService
{
    private string $localAIUrl;
    private string $model;
    private bool $enabled;

    public function __construct(
        private HttpClientInterface $httpClient,
        private LoggerInterface $logger
    ) {
        // Configuración de LocalAI (esto se puede mover a parameters.yaml)
        $this->localAIUrl = 'http://localhost:8080'; // Puerto por defecto de LocalAI
        $this->model = 'gpt4all-j'; // Modelo por defecto
        $this->enabled = true; // Se puede desactivar para testing
    }

    /**
     * Generar respuesta usando LocalAI
     */
    public function generateResponse(array $context): ?string
    {
        if (!$this->enabled) {
            $this->logger->info('🔧 LocalAI está deshabilitado, usando respuesta mock');
            return $this->getMockResponse($context);
        }

        try {
            $prompt = $this->buildPrompt($context);
            
            $this->logger->info('🧠 Enviando prompt a LocalAI', [
                'model' => $this->model,
                'prompt_length' => strlen($prompt),
                'url' => $this->localAIUrl
            ]);

            // Hacer petición a LocalAI
            $response = $this->httpClient->request('POST', $this->localAIUrl . '/v1/chat/completions', [
                'json' => [
                    'model' => $this->model,
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => $this->getSystemPrompt($context)
                        ],
                        [
                            'role' => 'user', 
                            'content' => $context['user_message']
                        ]
                    ],
                    'max_tokens' => 150,
                    'temperature' => 0.7,
                    'top_p' => 0.9
                ],
                'timeout' => 30 // 30 segundos timeout
            ]);

            $data = $response->toArray();
            
            if (isset($data['choices'][0]['message']['content'])) {
                $aiResponse = trim($data['choices'][0]['message']['content']);
                
                $this->logger->info('✅ Respuesta recibida de LocalAI', [
                    'response_length' => strlen($aiResponse),
                    'model' => $this->model
                ]);

                return $aiResponse;
            }

            $this->logger->warning('⚠️ Respuesta inesperada de LocalAI', ['data' => $data]);
            return $this->getMockResponse($context);

        } catch (\Exception $e) {
            $this->logger->error('❌ Error con LocalAI, usando respuesta de fallback', [
                'error' => $e->getMessage(),
                'url' => $this->localAIUrl
            ]);
            
            // Fallback a respuesta mock si LocalAI no está disponible
            return $this->getMockResponse($context);
        }
    }

    /**
     * Construir prompt optimizado para LocalAI
     */
    private function buildPrompt(array $context): string
    {
        $personality = $context['bot_personality'] ?? 'Eres un asistente útil y amigable';
        $userMessage = $context['user_message'];
        $userName = $context['user_name'] ?? 'Usuario';
        $language = $context['language'] ?? 'es';
        $tone = $context['tone'] ?? 'amigable';

        return sprintf(
            "Personalidad: %s\nIdioma: %s\nTono: %s\nUsuario: %s\nMensaje: %s\n\nRespuesta:",
            $personality,
            $language,
            $tone,
            $userName,
            $userMessage
        );
    }

    /**
     * Obtener prompt del sistema para LocalAI
     */
    private function getSystemPrompt(array $context): string
    {
        $botName = $context['bot_name'] ?? 'Asistente';
        $personality = $context['bot_personality'] ?? 'Eres un asistente útil y amigable';
        $language = $context['language'] ?? 'es';
        $tone = $context['tone'] ?? 'amigable';

        $systemPrompts = [
            'es' => "Eres %s, un bot inteligente en una plataforma de chat llamada Ágora. %s Responde siempre en español con un tono %s. Mantén las respuestas concisas (máximo 2-3 oraciones). Si no entiendes algo, pregunta de manera amigable.",
            'en' => "You are %s, an intelligent bot on a chat platform called Ágora. %s Always respond in English with a %s tone. Keep responses concise (maximum 2-3 sentences). If you don't understand something, ask in a friendly way."
        ];

        $template = $systemPrompts[$language] ?? $systemPrompts['es'];
        
        return sprintf($template, $botName, $personality, $tone);
    }

    /**
     * Respuesta mock para testing o cuando LocalAI no está disponible
     */
    private function getMockResponse(array $context): string
    {
        $userMessage = strtolower($context['user_message']);
        $botName = $context['bot_name'] ?? 'Bot';
        
        // Respuestas mock inteligentes basadas en keywords
        $mockResponses = [
            'hola' => "¡Hola! Soy {$botName}, ¿en qué puedo ayudarte?",
            'gracias' => "¡De nada! Siempre es un placer ayudar.",
            'ayuda' => "Claro, estoy aquí para ayudarte. ¿Qué necesitas saber?",
            'como estas' => "¡Muy bien, gracias por preguntar! ¿Y tú cómo estás?",
            'que eres' => "Soy {$botName}, un bot inteligente de Ágora. Estoy aquí para ayudar y conversar.",
            'tiempo' => "No tengo acceso a información del clima, pero puedes preguntarme otras cosas.",
            'fecha' => "Hoy es " . date('d/m/Y') . ". ¿Necesitas algo más?",
            'hora' => "Son las " . date('H:i') . ". ¿En qué más puedo ayudarte?",
        ];

        foreach ($mockResponses as $keyword => $response) {
            if (str_contains($userMessage, $keyword)) {
                return $response;
            }
        }

        // Respuesta genérica
        $genericResponses = [
            "Interesante pregunta. Como bot de Ágora, estoy aquí para ayudar en lo que pueda.",
            "Hmm, no estoy seguro de cómo responder a eso. ¿Podrías ser más específico?",
            "¡Genial! Me gusta conversar contigo. ¿Hay algo más en lo que pueda ayudarte?",
            "Esa es una buena observación. ¿Te gustaría que hablemos de algo en particular?",
            "Como bot de Ágora, estoy aprendiendo constantemente. ¿Qué más te interesa saber?"
        ];

        return $genericResponses[array_rand($genericResponses)];
    }

    /**
     * Verificar si LocalAI está disponible
     */
    public function isAvailable(): bool
    {
        try {
            $response = $this->httpClient->request('GET', $this->localAIUrl . '/health', [
                'timeout' => 5
            ]);
            
            return $response->getStatusCode() === 200;
            
        } catch (\Exception $e) {
            $this->logger->info('LocalAI no disponible', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Obtener modelos disponibles
     */
    public function getAvailableModels(): array
    {
        try {
            $response = $this->httpClient->request('GET', $this->localAIUrl . '/v1/models', [
                'timeout' => 10
            ]);
            
            $data = $response->toArray();
            return $data['data'] ?? [];
            
        } catch (\Exception $e) {
            $this->logger->error('Error obteniendo modelos de LocalAI', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Configurar modelo activo
     */
    public function setModel(string $model): void
    {
        $this->model = $model;
    }

    /**
     * Habilitar/deshabilitar LocalAI
     */
    public function setEnabled(bool $enabled): void
    {
        $this->enabled = $enabled;
    }

    /**
     * Obtener estadísticas de uso
     */
    public function getUsageStats(): array
    {
        return [
            'enabled' => $this->enabled,
            'url' => $this->localAIUrl,
            'current_model' => $this->model,
            'is_available' => $this->isAvailable(),
            'available_models' => count($this->getAvailableModels())
        ];
    }
}