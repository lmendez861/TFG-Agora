// Configuración centralizada para el frontend de Ágora
// Edita estas URLs según tu entorno de desarrollo/producción.
(function () {
    const AgoraConfig = {
        // Base URL para el API principal (Symfony)
        API_BASE_URL: 'http://127.0.0.1:8000/api',

        // Endpoint base para AI (el controlador AIBotController en Symfony)
        AI_API_BASE: 'http://127.0.0.1:8000/api/ai',

        // Health check directo de LocalAI (si quieres comprobarlo desde el frontend)
        LOCALAI_HEALTH_URL: 'http://localhost:8080/health'
    };

    // Exponer en window para que otros scripts lo usen
    window.AgoraConfig = AgoraConfig;
})();
