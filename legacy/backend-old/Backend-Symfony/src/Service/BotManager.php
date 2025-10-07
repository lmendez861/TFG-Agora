<?php

namespace App\Service;

use App\Entity\BotEntity;
use App\Entity\BotRespuesta;
use App\Entity\Grupo;
use App\Entity\Usuario;
use App\Entity\Mensaje;
use App\Entity\AutorTipo;
use App\Entity\BotType;
use App\Repository\BotEntityRepository;
use App\Repository\BotRespuestaRepository;
use App\Repository\GrupoBotRepository;
use App\Repository\BotConfigRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

class BotManager
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private BotEntityRepository $botRepository,
        private BotRespuestaRepository $botRespuestaRepository,
        private GrupoBotRepository $grupoBotRepository,
        private BotConfigRepository $botConfigRepository,
        private LocalAIService $localAIService,
        private LoggerInterface $logger
    ) {}

    /**
     * Procesar mensaje y generar respuesta de bot si aplica
     */
    public function processMessage(Mensaje $mensaje): ?string
    {
        try {
            // Solo procesar mensajes de usuarios (no de bots para evitar loops)
            if ($mensaje->getAutorTipo() === AutorTipo::BOT) {
                return null;
            }

            $contenido = $mensaje->getContenido();
            $grupo = $mensaje->getGrupo();
            $usuario = $mensaje->getUsuario();

            $this->logger->info('🤖 Procesando mensaje para bots', [
                'mensaje_id' => $mensaje->getId(),
                'contenido' => substr($contenido, 0, 100),
                'grupo_id' => $grupo?->getId(),
                'usuario_id' => $usuario->getId()
            ]);

            // Obtener bots activos del grupo
            $botsActivos = [];
            if ($grupo) {
                $gruposBots = $this->grupoBotRepository->findActiveByGroup($grupo->getId());
                $botsActivos = array_map(fn($gb) => $gb->getBot(), $gruposBots);
            }

            // Si no hay bots en el grupo, no hacer nada
            if (empty($botsActivos)) {
                return null;
            }

            // Procesar cada bot
            foreach ($botsActivos as $bot) {
                $respuesta = $this->generateBotResponse($bot, $contenido, $usuario, $grupo);
                
                if ($respuesta) {
                    // Crear mensaje de respuesta del bot
                    $this->createBotMessage($bot, $respuesta, $grupo, $mensaje);
                    return $respuesta;
                }
            }

            return null;
            
        } catch (\Exception $e) {
            $this->logger->error('❌ Error procesando mensaje para bots', [
                'error' => $e->getMessage(),
                'mensaje_id' => $mensaje->getId()
            ]);
            return null;
        }
    }

    /**
     * Generar respuesta de bot usando lógica híbrida
     */
    public function generateBotResponse(BotEntity $bot, string $contenido, Usuario $usuario, ?Grupo $grupo = null): ?string
    {
        $this->logger->info('🎯 Generando respuesta de bot', [
            'bot_id' => $bot->getId(),
            'bot_nombre' => $bot->getNombre(),
            'bot_tipo' => $bot->getTipo()->value,
            'contenido' => substr($contenido, 0, 100)
        ]);

        // Paso 1: Intentar respuestas básicas/reglas primero
        if ($bot->getTipo() === BotType::BASICO || $bot->getTipo() === BotType::REGLAS) {
            $respuestaReglas = $this->tryRuleBasedResponse($bot, $contenido);
            if ($respuestaReglas) {
                $this->logger->info('✅ Respuesta generada por reglas', ['bot' => $bot->getNombre()]);
                return $respuestaReglas;
            }
        }

        // Paso 2: Si no hay coincidencias en reglas y el bot es de IA, usar LocalAI
        if ($bot->getTipo() === BotType::IA) {
            $respuestaIA = $this->tryAIResponse($bot, $contenido, $usuario, $grupo);
            if ($respuestaIA) {
                $this->logger->info('✅ Respuesta generada por IA', ['bot' => $bot->getNombre()]);
                return $respuestaIA;
            }
        }

        // Paso 3: Fallback - bots IA pueden intentar reglas básicas como backup
        if ($bot->getTipo() === BotType::IA) {
            $respuestaFallback = $this->tryRuleBasedResponse($bot, $contenido);
            if ($respuestaFallback) {
                $this->logger->info('✅ Respuesta fallback por reglas', ['bot' => $bot->getNombre()]);
                return $respuestaFallback;
            }
        }

        return null;
    }

    /**
     * Intentar respuesta basada en reglas
     */
    private function tryRuleBasedResponse(BotEntity $bot, string $contenido): ?string
    {
        $respuestas = $this->botRespuestaRepository->findActiveByBot($bot->getId());
        
        foreach ($respuestas as $respuesta) {
            if ($this->matchesKeyword($contenido, $respuesta)) {
                return $this->processResponseTemplate($respuesta->getRespuesta(), $contenido);
            }
        }

        return null;
    }

    /**
     * Intentar respuesta usando LocalAI
     */
    private function tryAIResponse(BotEntity $bot, string $contenido, Usuario $usuario, ?Grupo $grupo = null): ?string
    {
        try {
            // Obtener configuración del bot
            $config = null;
            if ($grupo) {
                $config = $this->botConfigRepository->findByBotAndGroup($bot->getId(), $grupo->getId());
            } else {
                $config = $this->botConfigRepository->findByBotAndUser($bot->getId(), $usuario->getId());
            }

            // Preparar contexto para la IA
            $context = [
                'bot_name' => $bot->getNombre(),
                'bot_personality' => $bot->getPersonalidad() ?? 'Eres un asistente útil y amigable',
                'user_message' => $contenido,
                'user_name' => $usuario->getNombre() ?? $usuario->getUsername(),
                'language' => $config?->getIdioma() ?? 'es',
                'tone' => $config?->getTono() ?? 'amigable'
            ];

            // Llamar a LocalAI
            return $this->localAIService->generateResponse($context);
            
        } catch (\Exception $e) {
            $this->logger->error('❌ Error en respuesta IA', [
                'bot_id' => $bot->getId(),
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Verificar si el contenido coincide con una keyword
     */
    private function matchesKeyword(string $contenido, BotRespuesta $respuesta): bool
    {
        $keyword = $respuesta->getKeyword();
        $contenidoLower = strtolower($contenido);
        $keywordLower = strtolower($keyword);

        if ($respuesta->isEsRegex()) {
            return preg_match('/' . $keyword . '/i', $contenido) === 1;
        } else {
            // Búsqueda simple por contención
            return str_contains($contenidoLower, $keywordLower);
        }
    }

    /**
     * Procesar plantilla de respuesta (para variables como {usuario}, {hora}, etc.)
     */
    private function processResponseTemplate(string $template, string $originalMessage): string
    {
        $variables = [
            '{hora}' => date('H:i'),
            '{fecha}' => date('d/m/Y'),
            '{mensaje}' => $originalMessage
        ];

        return str_replace(array_keys($variables), array_values($variables), $template);
    }

    /**
     * Crear mensaje de respuesta del bot
     */
    private function createBotMessage(BotEntity $bot, string $respuesta, ?Grupo $grupo, Mensaje $mensajeOriginal): void
    {
        try {
            $mensaje = new Mensaje();
            $mensaje->setContenido($respuesta);
            $mensaje->setAutorTipo(AutorTipo::BOT);
            $mensaje->setBot($bot);
            $mensaje->setGrupo($grupo);
            
            // Crear un usuario bot temporal o usar el creador del bot
            $mensaje->setUsuario($bot->getCreador());

            $this->entityManager->persist($mensaje);
            $this->entityManager->flush();

            $this->logger->info('✅ Mensaje de bot creado', [
                'bot' => $bot->getNombre(),
                'respuesta' => substr($respuesta, 0, 100)
            ]);

        } catch (\Exception $e) {
            $this->logger->error('❌ Error creando mensaje de bot', [
                'bot_id' => $bot->getId(),
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Añadir bot a grupo
     */
    public function addBotToGroup(BotEntity $bot, Grupo $grupo, Usuario $agregadoPor): bool
    {
        try {
            // Verificar si el bot ya está en el grupo
            if ($this->grupoBotRepository->isBotInGroup($bot->getId(), $grupo->getId())) {
                return false;
            }

            $grupoBot = new \App\Entity\GrupoBot();
            $grupoBot->setBot($bot);
            $grupoBot->setGrupo($grupo);
            $grupoBot->setAgregadoPor($agregadoPor);

            $this->entityManager->persist($grupoBot);
            $this->entityManager->flush();

            $this->logger->info('✅ Bot añadido al grupo', [
                'bot' => $bot->getNombre(),
                'grupo' => $grupo->getNombre(),
                'agregado_por' => $agregadoPor->getUsername()
            ]);

            return true;

        } catch (\Exception $e) {
            $this->logger->error('❌ Error añadiendo bot al grupo', [
                'bot_id' => $bot->getId(),
                'grupo_id' => $grupo->getId(),
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Remover bot de grupo
     */
    public function removeBotFromGroup(BotEntity $bot, Grupo $grupo): bool
    {
        try {
            $grupoBot = $this->entityManager->getRepository(\App\Entity\GrupoBot::class)
                ->findOneBy(['bot' => $bot, 'grupo' => $grupo, 'activo' => true]);

            if ($grupoBot) {
                $grupoBot->setActivo(false);
                $this->entityManager->flush();
                return true;
            }

            return false;

        } catch (\Exception $e) {
            $this->logger->error('❌ Error removiendo bot del grupo', [
                'bot_id' => $bot->getId(),
                'grupo_id' => $grupo->getId(),
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Obtener bots disponibles para un grupo
     */
    public function getAvailableBotsForGroup(Grupo $grupo): array
    {
        // Obtener todos los bots públicos
        $botsPublicos = $this->botRepository->findPublicBots();
        
        // Filtrar los que ya están en el grupo
        return array_filter($botsPublicos, function($bot) use ($grupo) {
            return !$this->grupoBotRepository->isBotInGroup($bot->getId(), $grupo->getId());
        });
    }
}