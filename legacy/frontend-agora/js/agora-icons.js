// ===== ÁGORA ICON SYSTEM =====
// Integración con Lucide Icons - Biblioteca moderna y gratuita
// Docs: https://lucide.dev/

class AgoraIconSystem {
    constructor() {
        this.init();
    }

    async init() {
        // Cargar Lucide Icons dinámicamente
        if (!window.lucide) {
            await this.loadLucideScript();
        }
        
        this.setupIconAnimations();
        this.createCustomIcons();
        this.initializeExistingIcons();
    }

    async loadLucideScript() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/lucide@latest/dist/umd/lucide.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // ===== ICONOS PRINCIPALES PARA ÁGORA =====
    getAgoraIcons() {
        return {
            // Navegación y UI
            menu: 'menu',
            home: 'home',
            search: 'search',
            settings: 'settings',
            user: 'user',
            users: 'users',
            bell: 'bell',
            
            // Chat y Mensajería (WhatsApp/Telegram inspired)
            messageCircle: 'message-circle',
            send: 'send',
            paperclip: 'paperclip',
            smile: 'smile',
            image: 'image',
            video: 'video',
            mic: 'mic',
            micOff: 'mic-off',
            
            // Archivos y Drive (Google Drive inspired)
            file: 'file',
            folder: 'folder',
            folderOpen: 'folder-open',
            download: 'download',
            upload: 'upload',
            share2: 'share-2',
            link: 'link',
            
            // Video/Audio (Zoom inspired) 
            videoIcon: 'video',
            videoOff: 'video-off',
            phone: 'phone',
            phoneCall: 'phone-call',
            phoneOff: 'phone-off',
            screenShare: 'screen-share',
            
            // Servidores y Canales (Discord inspired)
            server: 'server',
            hash: 'hash',
            volume2: 'volume-2',
            volumeX: 'volume-x',
            shield: 'shield',
            crown: 'crown',
            
            // Bots e IA (ChatGPT/AI inspired)
            bot: 'bot',
            brain: 'brain',
            cpu: 'cpu',
            zap: 'zap',
            sparkles: 'sparkles',
            wand2: 'wand-2',
            
            // Estados y Acciones
            check: 'check',
            checkCheck: 'check-check',
            x: 'x',
            plus: 'plus',
            minus: 'minus',
            edit: 'edit-3',
            trash: 'trash-2',
            
            // Navegación
            arrowLeft: 'arrow-left',
            arrowRight: 'arrow-right',
            arrowUp: 'arrow-up', 
            arrowDown: 'arrow-down',
            chevronLeft: 'chevron-left',
            chevronRight: 'chevron-right',
            
            // Multimedia
            play: 'play',
            pause: 'pause',
            stop: 'stop',
            camera: 'camera',
            music: 'music',
            
            // Utilidades
            copy: 'copy',
            eye: 'eye',
            eyeOff: 'eye-off',
            lock: 'lock',
            unlock: 'unlock',
            globe: 'globe',
            wifi: 'wifi',
            wifiOff: 'wifi-off'
        };
    }

    // ===== CREAR ICONOS PERSONALIZADOS =====
    createCustomIcons() {
        // Agregar iconos personalizados para Ágora
        const customIcons = {
            'agora-logo': `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="8" r="6"/>
                    <path d="M18 16c0-4-6-4-6-4s-6 0-6 4v2h12v-2z"/>
                    <circle cx="8" cy="14" r="2"/>
                    <circle cx="16" cy="14" r="2"/>
                </svg>
            `,
            'discord-style': `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.195.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                </svg>
            `,
            'ai-sparkle': `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
                    <path d="M19 12l.5 1.5L21 14.5l-1.5.5L19 17l-.5-1.5L17 14.5l1.5-.5L19 12z"/>
                    <path d="M5 6l.5 1.5L7 8.5l-1.5.5L5 11l-.5-1.5L3 8.5l1.5-.5L5 6z"/>
                </svg>
            `
        };

        // Registrar iconos personalizados
        Object.entries(customIcons).forEach(([name, svg]) => {
            const iconElement = document.createElement('div');
            iconElement.innerHTML = svg;
            iconElement.setAttribute('data-custom-icon', name);
            iconElement.style.display = 'none';
            document.body.appendChild(iconElement);
        });
    }

    // ===== CREAR ICONO DINÁMICAMENTE =====
    createIcon(iconName, options = {}) {
        const {
            size = 24,
            color = 'currentColor',
            strokeWidth = 2,
            className = '',
            animated = false
        } = options;

        const iconElement = document.createElement('i');
        iconElement.setAttribute('data-lucide', iconName);
        iconElement.style.width = `${size}px`;
        iconElement.style.height = `${size}px`;
        iconElement.style.color = color;
        iconElement.style.strokeWidth = strokeWidth;
        
        if (className) {
            iconElement.className = className;
        }

        if (animated) {
            iconElement.classList.add('icon-animated');
        }

        // Inicializar el icono con Lucide
        if (window.lucide) {
            lucide.createIcons({
                icons: {
                    [iconName]: iconElement
                }
            });
        }

        return iconElement;
    }

    // ===== ANIMACIONES DE ICONOS =====
    setupIconAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            .icon-animated {
                transition: all 0.3s ease;
            }

            .icon-pulse {
                animation: iconPulse 2s infinite;
            }

            .icon-bounce {
                animation: iconBounce 0.6s ease;
            }

            .icon-rotate {
                animation: iconRotate 2s linear infinite;
            }

            .icon-shake {
                animation: iconShake 0.5s ease-in-out;
            }

            .icon-glow {
                filter: drop-shadow(0 0 8px currentColor);
            }

            .icon-hover-grow:hover {
                transform: scale(1.2);
            }

            .icon-hover-spin:hover {
                transform: rotate(15deg);
            }

            @keyframes iconPulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
            }

            @keyframes iconBounce {
                0%, 20%, 53%, 80%, 100% { transform: translateY(0); }
                40%, 43% { transform: translateY(-8px); }
                70% { transform: translateY(-4px); }
            }

            @keyframes iconRotate {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            @keyframes iconShake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
                20%, 40%, 60%, 80% { transform: translateX(2px); }
            }
        `;
        document.head.appendChild(style);
    }

    // ===== INICIALIZAR ICONOS EXISTENTES =====
    initializeExistingIcons() {
        // Buscar todos los elementos con data-lucide
        const iconElements = document.querySelectorAll('[data-lucide]');
        
        if (window.lucide && iconElements.length > 0) {
            lucide.createIcons();
        }
    }

    // ===== HELPERS ÚTILES =====
    
    // Cambiar icono dinámicamente
    changeIcon(element, newIconName) {
        element.setAttribute('data-lucide', newIconName);
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // Animar icono
    animateIcon(element, animationType, duration = 600) {
        element.classList.add(`icon-${animationType}`);
        setTimeout(() => {
            element.classList.remove(`icon-${animationType}`);
        }, duration);
    }

    // Crear botón con icono
    createIconButton(iconName, text = '', options = {}) {
        const button = document.createElement('button');
        button.className = `button is-agora-primary ${options.className || ''}`;
        
        const icon = this.createIcon(iconName, {
            size: options.iconSize || 18,
            className: 'icon-animated'
        });
        
        button.appendChild(icon);
        
        if (text) {
            const span = document.createElement('span');
            span.textContent = text;
            span.style.marginLeft = '8px';
            button.appendChild(span);
        }

        return button;
    }

    // Crear notification con icono
    createNotificationWithIcon(iconName, message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification is-${type} is-agora animate-slide-up`;
        
        const icon = this.createIcon(iconName, {
            size: 20,
            className: 'icon-animated'
        });
        
        notification.appendChild(icon);
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        messageSpan.style.marginLeft = '10px';
        notification.appendChild(messageSpan);

        return notification;
    }
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    window.AgoraIcons = new AgoraIconSystem();
});

// ===== EXPORTAR PARA USO GLOBAL =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AgoraIconSystem;
}