// ===== ÁGORA AI SERVICE =====
// Integración con LocalAI para bots inteligentes

class AgoraAIService {
    constructor() {
        this.baseURL = 'http://localhost/Backend-Symfony/public/api/ai';
        this.isLocalAIAvailable = false;
        this.currentModel = 'llama-2-7b-chat';
        this.conversationHistory = new Map(); // Bot ID -> Historial
        
        this.init();
    }

    async init() {
        console.log('🧠 Inicializando Ágora AI Service...');
        await this.checkAIStatus();
    }

    // ===== STATUS Y CONFIGURACIÓN =====
    async checkAIStatus() {
        try {
            const response = await fetch(`${this.baseURL}/status`);
            const result = await response.json();
            
            if (result.success) {
                this.isLocalAIAvailable = result.data.localai_status.is_available;
                console.log('✅ LocalAI Status:', result.data);
                return result.data;
            } else {
                console.warn('⚠️ AI Status check failed:', result.error);
                this.isLocalAIAvailable = false;
                return null;
            }
        } catch (error) {
            console.error('❌ Error checking AI status:', error);
            this.isLocalAIAvailable = false;
            return null;
        }
    }

    async getAvailableModels() {
        try {
            const response = await fetch(`${this.baseURL}/models`);
            const result = await response.json();
            
            if (result.success) {
                return result.data;
            }
            
            return { models: [], recommendations: {} };
        } catch (error) {
            console.error('❌ Error getting models:', error);
            return { models: [], recommendations: {} };
        }
    }

    async setModel(modelName) {
        try {
            const response = await fetch(`${this.baseURL}/model`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ model: modelName })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentModel = modelName;
                console.log(`✅ Modelo cambiado a: ${modelName}`);
                return true;
            }
            
            console.error('❌ Error setting model:', result.error);
            return false;
        } catch (error) {
            console.error('❌ Error setting model:', error);
            return false;
        }
    }

    // ===== CHAT CON BOTS IA =====
    async chatWithBot(botData, userMessage, userName = 'Usuario') {
        try {
            // Preparar historial de conversación
            const botId = botData.id;
            if (!this.conversationHistory.has(botId)) {
                this.conversationHistory.set(botId, []);
            }
            
            const history = this.conversationHistory.get(botId);
            
            // Añadir mensaje del usuario al historial
            history.push({
                role: 'user',
                content: userMessage,
                timestamp: Date.now()
            });

            // Preparar datos para el backend
            const requestData = {
                user_message: userMessage,
                user_name: userName,
                bot_id: botData.id,
                bot_name: botData.name,
                bot_personality: botData.personality || 'Eres un asistente útil y amigable',
                bot_type: botData.type || 'general',
                language: 'es',
                tone: botData.tone || 'amigable',
                history: history.slice(-10) // Solo últimos 10 mensajes
            };

            console.log(`🤖 Enviando mensaje a ${botData.name}:`, userMessage);

            const response = await fetch(`${this.baseURL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();

            if (result.success) {
                const botResponse = result.data.bot_response;
                
                // Añadir respuesta del bot al historial
                history.push({
                    role: 'assistant',
                    content: botResponse,
                    timestamp: Date.now()
                });

                // Mantener solo últimos 20 mensajes por performance
                if (history.length > 20) {
                    this.conversationHistory.set(botId, history.slice(-20));
                }

                console.log(`✅ Respuesta de ${botData.name}:`, botResponse);
                
                return {
                    success: true,
                    response: botResponse,
                    metadata: {
                        bot_name: result.data.bot_name,
                        message_id: result.data.message_id,
                        timestamp: result.data.timestamp,
                        ai_powered: result.data.ai_powered,
                        model_used: result.data.model_used,
                        response_time: result.data.response_time
                    }
                };
                
            } else {
                console.error('❌ Error en chat con bot:', result.error);
                
                // Fallback a respuesta mock
                return this.getMockResponse(botData, userMessage);
            }

        } catch (error) {
            console.error('❌ Error chatting with bot:', error);
            
            // Fallback a respuesta mock
            return this.getMockResponse(botData, userMessage);
        }
    }

    // ===== FALLBACK RESPONSES =====
    getMockResponse(botData, userMessage) {
        const responses = {
            'hola': `¡Hola! Soy ${botData.name}. Estoy funcionando en modo offline, pero aún puedo ayudarte.`,
            'gracias': '¡De nada! Siempre es un placer ayudar.',
            'ayuda': `Soy ${botData.name}, un bot de Ágora. Ahora mismo estoy en modo offline, pero cuando LocalAI esté activo seré mucho más inteligente.`,
            'que eres': `Soy ${botData.name}, ${botData.personality || 'un bot amigable'}`,
            'default': `Interesante. Soy ${botData.name} y aunque LocalAI no está disponible ahora, ¡puedo conversar contigo!`
        };

        const message = userMessage.toLowerCase();
        let response = responses['default'];

        for (const [keyword, resp] of Object.entries(responses)) {
            if (message.includes(keyword)) {
                response = resp;
                break;
            }
        }

        return {
            success: true,
            response: response,
            metadata: {
                bot_name: botData.name,
                message_id: 'mock_' + Date.now(),
                timestamp: Date.now(),
                ai_powered: false,
                model_used: 'Mock Response',
                response_time: 0.1
            }
        };
    }

    // ===== UTILIDADES =====
    getConversationHistory(botId) {
        return this.conversationHistory.get(botId) || [];
    }

    clearConversationHistory(botId) {
        if (botId) {
            this.conversationHistory.delete(botId);
        } else {
            this.conversationHistory.clear();
        }
    }

    isAIAvailable() {
        return this.isLocalAIAvailable;
    }

    getCurrentModel() {
        return this.currentModel;
    }

    // ===== INFORMACIÓN PARA UI =====
    getAIStatusInfo() {
        return {
            available: this.isLocalAIAvailable,
            model: this.currentModel,
            conversations: this.conversationHistory.size,
            status: this.isLocalAIAvailable ? '🟢 LocalAI Activo' : '🔴 LocalAI Offline'
        };
    }
}

// Instancia global
window.agoraAI = new AgoraAIService();

console.log('🧠 Ágora AI Service cargado');
console.log('📊 Estado inicial:', window.agoraAI.getAIStatusInfo());