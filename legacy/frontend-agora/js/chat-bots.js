// Chat con Bots - Funcionalidades
class BotChatManager {
    
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentGroup = null;
        this.activeBots = [];
        this.availableBots = [];
        this.multimedia = {
            stickers: [],
            gifs: [],
            emojis: []
        };
        
        this.init();
    }

    async init() {
        console.log('🤖 Inicializando BotChatManager...');
        await this.loadMultimedia();
        this.setupEventListeners();
        this.render();
    }

    // ====== CARGA DE DATOS ======

    async loadMultimedia() {
        try {
            console.log('🎨 Cargando multimedia...');
            const [stickers, gifs, emojis] = await Promise.all([
                AgoraAPI.getStickers(),
                AgoraAPI.getGifs(),
                AgoraAPI.getEmojis()
            ]);

            this.multimedia = { stickers, gifs, emojis };
            console.log('✅ Multimedia cargada:', this.multimedia);
        } catch (error) {
            console.error('❌ Error cargando multimedia:', error);
        }
    }

    async loadGroupBots(groupId) {
        try {
            console.log('🤖 Cargando bots del grupo:', groupId);
            const response = await AgoraAPI.getGroupBots(groupId);
            
            if (response.success) {
                this.activeBots = response.bots_activos || [];
                this.availableBots = response.bots_disponibles || [];
                console.log('✅ Bots cargados:', { activeBots: this.activeBots, availableBots: this.availableBots });
                
                this.updateBotPanel();
            }
        } catch (error) {
            console.error('❌ Error cargando bots:', error);
        }
    }

    // ====== RENDERIZADO ======

    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="bot-chat-interface">
                <!-- Panel de Bots -->
                <div class="bot-panel" id="botPanel">
                    <div class="bot-panel-header">
                        <h3>🤖 Bots del Grupo</h3>
                        <button class="btn-toggle-bots" onclick="botChatManager.toggleBotPanel()">
                            <span id="botToggleIcon">⬅</span>
                        </button>
                    </div>
                    <div class="bot-panel-content" id="botPanelContent">
                        <!-- Se actualiza dinámicamente -->
                    </div>
                </div>

                <!-- Chat Principal -->
                <div class="chat-main">
                    <!-- Área de mensajes -->
                    <div class="messages-container" id="messagesContainer">
                        <div class="messages-scroll" id="messagesScroll">
                            <!-- Los mensajes se cargan aquí -->
                        </div>
                    </div>

                    <!-- Controles de entrada -->
                    <div class="chat-input-section">
                        <!-- Barra de multimedia -->
                        <div class="multimedia-bar" id="multimediaBar" style="display: none;">
                            <div class="multimedia-tabs">
                                <button class="multimedia-tab active" data-type="emojis">😊</button>
                                <button class="multimedia-tab" data-type="stickers">🎨</button>
                                <button class="multimedia-tab" data-type="gifs">🎬</button>
                            </div>
                            <div class="multimedia-content" id="multimediaContent">
                                <!-- Contenido multimedia -->
                            </div>
                        </div>

                        <!-- Input de mensaje -->
                        <div class="message-input-container">
                            <button class="multimedia-toggle" onclick="botChatManager.toggleMultimedia()">
                                😊
                            </button>
                            <input type="text" 
                                   id="messageInput" 
                                   placeholder="Escribe un mensaje..." 
                                   maxlength="1000"
                                   onkeypress="botChatManager.handleKeyPress(event)">
                            <button class="send-button" onclick="botChatManager.sendMessage()">
                                📤
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Panel de información de bot -->
                <div class="bot-info-panel" id="botInfoPanel" style="display: none;">
                    <div class="bot-info-content" id="botInfoContent">
                        <!-- Información del bot seleccionado -->
                    </div>
                </div>
            </div>
        `;

        this.updateMultimediaContent('emojis');
    }

    updateBotPanel() {
        const content = document.getElementById('botPanelContent');
        if (!content) return;

        let html = '';

        // Bots activos
        if (this.activeBots.length > 0) {
            html += `
                <div class="bot-section">
                    <h4>✅ Bots Activos</h4>
                    <div class="bot-list">
            `;

            this.activeBots.forEach(bot => {
                html += `
                    <div class="bot-item active" data-bot-id="${bot.id}">
                        <div class="bot-avatar">
                            <span class="bot-type-icon">${this.getBotTypeIcon(bot.tipo)}</span>
                        </div>
                        <div class="bot-info">
                            <div class="bot-name">${bot.nombre}</div>
                            <div class="bot-description">${bot.descripcion || 'Sin descripción'}</div>
                            <div class="bot-type">${this.getBotTypeLabel(bot.tipo)}</div>
                        </div>
                        <div class="bot-actions">
                            <button class="btn-bot-info" onclick="botChatManager.showBotInfo(${bot.id})">ℹ️</button>
                            <button class="btn-bot-test" onclick="botChatManager.testBot(${bot.id})">🧪</button>
                            <button class="btn-bot-remove" onclick="botChatManager.removeBot(${bot.id})">❌</button>
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        // Bots disponibles
        if (this.availableBots.length > 0) {
            html += `
                <div class="bot-section">
                    <h4>➕ Bots Disponibles</h4>
                    <div class="bot-list">
            `;

            this.availableBots.forEach(bot => {
                html += `
                    <div class="bot-item available" data-bot-id="${bot.id}">
                        <div class="bot-avatar">
                            <span class="bot-type-icon">${this.getBotTypeIcon(bot.tipo)}</span>
                        </div>
                        <div class="bot-info">
                            <div class="bot-name">${bot.nombre}</div>
                            <div class="bot-description">${bot.descripcion || 'Sin descripción'}</div>
                            <div class="bot-type">${this.getBotTypeLabel(bot.tipo)}</div>
                        </div>
                        <div class="bot-actions">
                            <button class="btn-bot-info" onclick="botChatManager.showBotInfo(${bot.id})">ℹ️</button>
                            <button class="btn-bot-add" onclick="botChatManager.addBot(${bot.id})">➕</button>
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        if (html === '') {
            html = `
                <div class="no-bots">
                    <p>🤖 No hay bots disponibles</p>
                    <button class="btn-create-bot" onclick="botChatManager.showCreateBot()">
                        Crear Primer Bot
                    </button>
                </div>
            `;
        }

        content.innerHTML = html;
    }

    updateMultimediaContent(type) {
        const content = document.getElementById('multimediaContent');
        if (!content) return;

        // Actualizar tabs activos
        document.querySelectorAll('.multimedia-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });

        let html = '<div class="multimedia-grid">';

        switch (type) {
            case 'emojis':
                this.multimedia.emojis.forEach(emoji => {
                    html += `
                        <div class="multimedia-item" onclick="botChatManager.insertMultimedia('${emoji.codigo}', 'emoji')">
                            <span class="emoji">${emoji.codigo}</span>
                        </div>
                    `;
                });
                break;

            case 'stickers':
                this.multimedia.stickers.forEach(sticker => {
                    html += `
                        <div class="multimedia-item" onclick="botChatManager.insertMultimedia('${sticker.url}', 'sticker')">
                            <img src="${sticker.url}" alt="${sticker.nombre}" class="sticker">
                        </div>
                    `;
                });
                break;

            case 'gifs':
                this.multimedia.gifs.forEach(gif => {
                    html += `
                        <div class="multimedia-item" onclick="botChatManager.insertMultimedia('${gif.url}', 'gif')">
                            <img src="${gif.url}" alt="${gif.nombre}" class="gif">
                        </div>
                    `;
                });
                break;
        }

        html += '</div>';
        content.innerHTML = html;
    }

    // ====== ACCIONES DE BOTS ======

    async addBot(botId) {
        if (!this.currentGroup) {
            AgoraUI.showError('No hay grupo seleccionado');
            return;
        }

        try {
            console.log('➕ Añadiendo bot al grupo:', { botId, groupId: this.currentGroup });
            const response = await AgoraAPI.addBotToGroup(botId, this.currentGroup);
            
            if (response.success) {
                AgoraUI.showSuccess('Bot añadido al grupo');
                await this.loadGroupBots(this.currentGroup);
            } else {
                AgoraUI.showError('Error añadiendo bot: ' + response.error);
            }
        } catch (error) {
            console.error('❌ Error añadiendo bot:', error);
            AgoraUI.showError('Error añadiendo bot al grupo');
        }
    }

    async removeBot(botId) {
        if (!this.currentGroup) {
            AgoraUI.showError('No hay grupo seleccionado');
            return;
        }

        if (!confirm('¿Estás seguro de que quieres remover este bot del grupo?')) {
            return;
        }

        try {
            console.log('➖ Removiendo bot del grupo:', { botId, groupId: this.currentGroup });
            const response = await AgoraAPI.removeBotFromGroup(botId, this.currentGroup);
            
            if (response.success) {
                AgoraUI.showSuccess('Bot removido del grupo');
                await this.loadGroupBots(this.currentGroup);
            } else {
                AgoraUI.showError('Error removiendo bot: ' + response.error);
            }
        } catch (error) {
            console.error('❌ Error removiendo bot:', error);
            AgoraUI.showError('Error removiendo bot del grupo');
        }
    }

    async testBot(botId) {
        const mensaje = prompt('Escribe un mensaje para probar el bot:');
        if (!mensaje) return;

        try {
            console.log('🧪 Probando bot:', { botId, mensaje });
            const response = await AgoraAPI.testBot(botId, mensaje);
            
            if (response.success) {
                const resultado = `
                    🤖 Respuesta del bot:
                    "${response.respuesta}"
                    
                    📊 Información:
                    • Tipo: ${response.tipo_respuesta}
                    • Modelo usado: ${response.modelo_usado || 'N/A'}
                `;
                alert(resultado);
            } else {
                AgoraUI.showError('Error probando bot: ' + response.error);
            }
        } catch (error) {
            console.error('❌ Error probando bot:', error);
            AgoraUI.showError('Error probando el bot');
        }
    }

    async showBotInfo(botId) {
        try {
            console.log('📋 Mostrando información del bot:', botId);
            const bot = await AgoraAPI.getBot(botId);
            
            if (!bot) {
                AgoraUI.showError('No se pudo obtener información del bot');
                return;
            }

            const infoPanel = document.getElementById('botInfoPanel');
            const infoContent = document.getElementById('botInfoContent');
            
            infoContent.innerHTML = `
                <div class="bot-info-header">
                    <h3>${bot.nombre}</h3>
                    <button class="close-btn" onclick="botChatManager.hideBotInfo()">❌</button>
                </div>
                <div class="bot-details">
                    <div class="bot-detail-item">
                        <strong>Tipo:</strong> ${this.getBotTypeLabel(bot.tipo)}
                    </div>
                    <div class="bot-detail-item">
                        <strong>Ámbito:</strong> ${bot.scope === 'privado' ? '👤 Privado' : '👥 Grupal'}
                    </div>
                    <div class="bot-detail-item">
                        <strong>Descripción:</strong> ${bot.descripcion || 'Sin descripción'}
                    </div>
                    <div class="bot-detail-item">
                        <strong>Personalidad:</strong> ${bot.personalidad || 'Sin personalidad definida'}
                    </div>
                    ${bot.modelo_ia ? `
                        <div class="bot-detail-item">
                            <strong>Modelo IA:</strong> ${bot.modelo_ia}
                        </div>
                    ` : ''}
                    <div class="bot-detail-item">
                        <strong>Creado:</strong> ${AgoraUI.formatDate(bot.createdAt)}
                    </div>
                    <div class="bot-detail-item">
                        <strong>Creador:</strong> ${bot.creador?.username || 'Desconocido'}
                    </div>
                </div>
            `;

            infoPanel.style.display = 'block';
        } catch (error) {
            console.error('❌ Error mostrando información del bot:', error);
            AgoraUI.showError('Error obteniendo información del bot');
        }
    }

    hideBotInfo() {
        const infoPanel = document.getElementById('botInfoPanel');
        infoPanel.style.display = 'none';
    }

    // ====== MENSAJES ======

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const mensaje = input.value.trim();
        
        if (!mensaje) return;
        if (!this.currentGroup) {
            AgoraUI.showError('No hay grupo seleccionado');
            return;
        }

        try {
            // Limpiar input inmediatamente
            input.value = '';
            
            // Mostrar mensaje enviado
            this.addMessageToChat({
                contenido: mensaje,
                usuario: currentUser,
                createdAt: new Date().toISOString(),
                esBot: false
            });

            // Enviar mensaje al servidor
            console.log('📤 Enviando mensaje al grupo:', this.currentGroup);
            const response = await AgoraAPI.sendMessageToGroup(mensaje, this.currentGroup);
            
            if (response.success) {
                // Si un bot respondió, mostrar la respuesta
                if (response.bot_respondio && response.respuesta_bot) {
                    setTimeout(() => {
                        this.addMessageToChat({
                            contenido: response.respuesta_bot.respuesta,
                            usuario: { username: response.respuesta_bot.bot_nombre, id: 'bot' },
                            createdAt: new Date().toISOString(),
                            esBot: true,
                            botTipo: response.respuesta_bot.tipo_respuesta
                        });
                    }, 500); // Pequeño delay para simular escritura
                }
            } else {
                AgoraUI.showError('Error enviando mensaje: ' + response.error);
            }
        } catch (error) {
            console.error('❌ Error enviando mensaje:', error);
            AgoraUI.showError('Error enviando mensaje');
        }
    }

    addMessageToChat(mensaje) {
        const messagesScroll = document.getElementById('messagesScroll');
        if (!messagesScroll) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${mensaje.esBot ? 'bot-message' : 'user-message'}`;
        
        const timeString = AgoraUI.formatDate(mensaje.createdAt);
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-author">
                    ${mensaje.esBot ? '🤖 ' : '👤 '}${mensaje.usuario.username}
                </span>
                <span class="message-time">${timeString}</span>
                ${mensaje.botTipo ? `<span class="bot-type-badge">${mensaje.botTipo}</span>` : ''}
            </div>
            <div class="message-content">
                ${AgoraUI.escapeHtml(mensaje.contenido)}
            </div>
        `;

        messagesScroll.appendChild(messageDiv);
        messagesScroll.scrollTop = messagesScroll.scrollHeight;
    }

    handleKeyPress(event) {
        if (event.key === 'Enter') {
            this.sendMessage();
        }
    }

    // ====== MULTIMEDIA ======

    toggleMultimedia() {
        const bar = document.getElementById('multimediaBar');
        const isVisible = bar.style.display !== 'none';
        bar.style.display = isVisible ? 'none' : 'block';
    }

    insertMultimedia(content, type) {
        const input = document.getElementById('messageInput');
        
        switch (type) {
            case 'emoji':
                input.value += content;
                break;
            case 'sticker':
            case 'gif':
                input.value += ` [${type.toUpperCase()}:${content}] `;
                break;
        }
        
        input.focus();
        this.toggleMultimedia(); // Cerrar panel después de selección
    }

    // ====== UTILIDADES ======

    setupEventListeners() {
        // Tabs de multimedia
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('multimedia-tab')) {
                const type = e.target.dataset.type;
                this.updateMultimediaContent(type);
            }
        });
    }

    toggleBotPanel() {
        const panel = document.getElementById('botPanel');
        const icon = document.getElementById('botToggleIcon');
        
        const isCollapsed = panel.classList.contains('collapsed');
        panel.classList.toggle('collapsed', !isCollapsed);
        icon.textContent = isCollapsed ? '⬅' : '➡';
    }

    setCurrentGroup(groupId) {
        console.log('🏠 Cambiando a grupo:', groupId);
        this.currentGroup = groupId;
        this.loadGroupBots(groupId);
        
        // Limpiar mensajes actuales
        const messagesScroll = document.getElementById('messagesScroll');
        if (messagesScroll) {
            messagesScroll.innerHTML = '<div class="loading-messages">Cargando mensajes...</div>';
        }
    }

    getBotTypeIcon(tipo) {
        switch (tipo) {
            case 'basic': return '🔤';
            case 'reglas': return '📋';
            case 'ia': return '🧠';
            default: return '🤖';
        }
    }

    getBotTypeLabel(tipo) {
        switch (tipo) {
            case 'basic': return 'Básico';
            case 'reglas': return 'Con Reglas';
            case 'ia': return 'Inteligencia Artificial';
            default: return 'Desconocido';
        }
    }

    showCreateBot() {
        // Esta función se puede implementar más adelante
        alert('Funcionalidad de crear bot próximamente...');
    }
}

// Inicializar manager global
let botChatManager = null;

document.addEventListener('DOMContentLoaded', function() {
    // Se inicializará cuando se cargue la página de chat
    console.log('🤖 BotChatManager listo para inicializar');
});