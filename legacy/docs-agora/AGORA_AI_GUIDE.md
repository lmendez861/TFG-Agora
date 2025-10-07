# 🧠 **ÁGORA AI - LocalAI Integration Guide**

## 🎯 **¿Qué hemos implementado?**

### ✅ **BACKEND SYMFONY**
- **LocalAIService.php**: Servicio completo para comunicarse con LocalAI
- **AIBotController.php**: API endpoints para chat con IA
- **Modelos configurados**: Llama-2-7B-Chat + Code-Llama-7B
- **Fallback inteligente**: Si LocalAI no está disponible, usa respuestas mock

### ✅ **FRONTEND JAVASCRIPT**
- **agora-ai.js**: Servicio frontend para integración con LocalAI
- **Panel de control IA**: Interfaz completa para gestionar IA
- **Chat real-time**: Mensajes con IA verdadera
- **Indicadores visuales**: Estado de conexión, modelo activo, estadísticas

### ✅ **INFRAESTRUCTURA**
- **Docker setup**: LocalAI server con Docker
- **Modelos optimizados**: Configuraciones YAML para mejor rendimiento  
- **Scripts automatizados**: Instalación completa en un comando

---

## 🚀 **INSTALACIÓN RÁPIDA**

### **Método 1: Script Automático (RECOMENDADO)**
```bash
cd "C:\Users\lourd\Desktop\TFG - Agora\Backend-Symfony"
.\install-agora-ai.bat
```

**¡Eso es todo!** El script instala y configura todo automáticamente.

### **Método 2: Manual**
```bash
# 1. Instalar Docker Desktop
# Descargar desde: https://docker.com/products/docker-desktop

# 2. Clonar LocalAI
docker pull localai/localai:latest

# 3. Iniciar servidor
docker run -d --name agora-localai -p 8080:8080 localai/localai:latest

# 4. Verificar funcionamiento
curl http://localhost:8080/health
```

---

## 🎮 **CÓMO USAR LA IA EN ÁGORA**

### **1. Verificar Estado de IA**
1. Abrir `agora-platform-demo.html`
2. Buscar el indicador **"IA"** en el header (esquina superior derecha)
3. **🟢 Verde** = IA activa | **🔴 Rojo** = IA desconectada

### **2. Panel de Control IA**
- **Clic en indicador IA** → Se abre panel lateral
- **Estado General**: Conexión, modelo activo, conversaciones
- **Modelos Disponibles**: Cambiar entre Llama-2, Code-Llama, etc.
- **Acciones**: Verificar conexión, limpiar historial, ver logs

### **3. Chatear con IA Real**
1. **Crear bot personal** (si no tienes uno)
2. **Escribir mensaje** en el chat
3. **El bot responde** usando LocalAI real
4. **Indicadores especiales**:
   - 🧠 = IA real activa
   - 🤖 = Respuesta mock/fallback
   - Tiempo de respuesta mostrado

---

## 🔧 **CONFIGURACIÓN AVANZADA**

### **Modelos Disponibles**
```yaml
# Llama-2-7B-Chat (General)
- Tamaño: ~4GB
- Uso: Conversaciones generales, asistencia
- Velocidad: Rápida
- Calidad: Alta

# Code-Llama-7B (Programación) 
- Tamaño: ~4GB
- Uso: Código, debugging, explicaciones técnicas
- Velocidad: Media
- Calidad: Excelente para código

# GPT4All-J (Ligero)
- Tamaño: ~1GB  
- Uso: Pruebas rápidas
- Velocidad: Muy rápida
- Calidad: Básica
```

### **Cambiar Modelo Activo**
1. **Panel IA** → **Modelos Disponibles**
2. **Clic en modelo deseado**
3. **Confirmación automática**
4. **Todos los nuevos chats** usan el nuevo modelo

### **Personalizar Bots**
```javascript
// En el modal de crear bot:
- Personalidad: "Eres un experto en [tema]"
- Tipo: General / Reglas / IA  
- Tono: Formal / Amigable / Técnico
- Comandos: Palabras clave especiales
```

---

## 📊 **ARQUITECTURA TÉCNICA**

### **Flujo de Datos**
```
Usuario escribe mensaje
    ↓
Frontend (agora-ai.js)
    ↓  
API Symfony (AIBotController)
    ↓
LocalAIService.php
    ↓
LocalAI Server (Docker)
    ↓
Modelo IA (Llama-2)
    ↓
Respuesta procesada
    ↓
Mostrar en chat con metadatos
```

### **APIs Disponibles**
```php
POST /api/ai/chat
- Enviar mensaje a bot IA
- Body: { user_message, bot_id, bot_name, etc. }
- Response: { bot_response, metadata }

GET /api/ai/status  
- Estado del sistema IA
- Response: { localai_status, models, recommendations }

GET /api/ai/models
- Modelos disponibles  
- Response: { models[], recommendations }

POST /api/ai/model
- Cambiar modelo activo
- Body: { model: "llama-2-7b-chat" }
```

### **Fallbacks Inteligentes**
1. **IA disponible** → Respuesta real de LocalAI
2. **IA no disponible** → Respuesta mock inteligente  
3. **Error temporal** → Retry automático + fallback
4. **Timeout** → Mensaje de error + respuesta básica

---

## 🐛 **TROUBLESHOOTING**

### **LocalAI no inicia**
```bash
# Verificar Docker
docker --version

# Ver logs de error
docker logs agora-localai

# Reiniciar servicio
docker restart agora-localai

# Si falla, recrear:
docker stop agora-localai
docker rm agora-localai
.\install-agora-ai.bat
```

### **IA aparece offline**
1. **Verificar URL**: http://localhost:8080/health
2. **Firewall**: Permitir puerto 8080
3. **Antivirus**: Excluir Docker y LocalAI
4. **Puerto ocupado**: Cambiar en docker run -p 8081:8080

### **Respuestas lentas**
```yaml
# Optimizaciones en localai-models/*.yaml:
parameters:
  threads: 8        # Más threads si tienes CPU potente
  max_tokens: 100   # Menos tokens = más rápido
  temperature: 0.3  # Menos creatividad = más rápido
```

### **Modelos no descargan**
1. **Conexión internet** lenta/inestable
2. **Espacio disco**: Necesitas ~10GB libres  
3. **Descarga manual**:
```bash
# Ir a: https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGML
# Descargar: llama-2-7b-chat.q4_0.bin
# Mover a: Backend-Symfony/localai-models/
```

---

## 📈 **ROADMAP FUTURO**

### **Próximas Mejoras**
- [ ] **WebSockets**: Chat en tiempo real
- [ ] **Múltiples usuarios**: IA conversacional grupal  
- [ ] **Memoria persistente**: Conversaciones guardadas
- [ ] **Embeddings**: Búsqueda semántica en archivos
- [ ] **Voice IA**: Texto-a-voz y voz-a-texto
- [ ] **Modelos especializados**: Medicina, Legal, etc.

### **Integraciones Avanzadas**
- [ ] **RAG System**: IA con conocimiento específico del TFG
- [ ] **Code Assistant**: IA que ayuda programando  
- [ ] **Document AI**: Análisis automático de PDFs/docs
- [ ] **Image Generation**: DALL-E local con Stable Diffusion

---

## ⚡ **COMANDOS RÁPIDOS**

```bash
# INICIAR TODO
.\install-agora-ai.bat

# VER ESTADO
docker ps | grep agora-localai

# VER LOGS  
docker logs -f agora-localai

# REINICIAR IA
docker restart agora-localai

# DETENER IA
docker stop agora-localai

# LIMPIAR TODO
docker stop agora-localai && docker rm agora-localai

# ACCESO DIRECTO
start http://localhost:8080/browse
```

---

## 🎉 **¡ÉXITO! IA REAL EN TU TFG**

**Ya tienes:**
✅ IA local privada (sin costos API)  
✅ Bots inteligentes personalizables  
✅ Interface profesional completa  
✅ Fallbacks robustos  
✅ Panel de control avanzado  
✅ Documentación completa  

**Resultado**: **Plataforma Ágora con IA verdadera, lista para demostrar en el TFG.**

---

*📋 Documentación generada automáticamente - Ágora AI System v1.0*