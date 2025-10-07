<?php

namespace App\DataFixtures;

use App\Entity\Rol;
use App\Entity\Usuario;
use App\Entity\Grupo;
use App\Entity\Membresia;
use App\Entity\Mensaje;
use App\Entity\BotEntity;
use App\Entity\BotType;
use App\Entity\BotScope;
use App\Entity\MultimediaType;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class AppFixtures extends Fixture
{
    private UserPasswordHasherInterface $passwordHasher;

    public function __construct(UserPasswordHasherInterface $passwordHasher)
    {
        $this->passwordHasher = $passwordHasher;
    }

    public function load(ObjectManager $manager): void
    {
        // 1. Crear roles
        $rolAdmin = new Rol();
        $rolAdmin->setId(1);
        $rolAdmin->setNombre('admin');
        $manager->persist($rolAdmin);

        $rolUsuario = new Rol();
        $rolUsuario->setId(2);
        $rolUsuario->setNombre('usuario');
        $manager->persist($rolUsuario);

        $rolModerador = new Rol();
        $rolModerador->setId(3);
        $rolModerador->setNombre('moderador');
        $manager->persist($rolModerador);

        // 2. Crear usuarios
        // Usuario administrador
        $admin = new Usuario();
        $admin->setUsername('admin');
        $admin->setEmail('admin@agora.com');
        $admin->setPasswordHash($this->passwordHasher->hashPassword($admin, 'admin123'));
        $admin->setNombre('Administrador');
        $admin->setRol($rolAdmin);
        $admin->setActivo(true);
        $manager->persist($admin);

        // Usuario moderador
        $moderador = new Usuario();
        $moderador->setUsername('moderador');
        $moderador->setEmail('mod@agora.com');
        $moderador->setPasswordHash($this->passwordHasher->hashPassword($moderador, 'mod123'));
        $moderador->setNombre('Moderador Principal');
        $moderador->setRol($rolModerador);
        $moderador->setActivo(true);
        $manager->persist($moderador);

        // Usuarios de prueba
        $usuarios = [];
        $nombresUsuarios = [
            ['luis', 'luis@agora.com', 'Luis Ángel'],
            ['maria', 'maria@agora.com', 'María García'],
            ['carlos', 'carlos@agora.com', 'Carlos López'],
            ['ana', 'ana@agora.com', 'Ana Martínez'],
            ['pedro', 'pedro@agora.com', 'Pedro Sánchez']
        ];

        foreach ($nombresUsuarios as [$username, $email, $nombre]) {
            $usuario = new Usuario();
            $usuario->setUsername($username);
            $usuario->setEmail($email);
            $usuario->setPasswordHash($this->passwordHasher->hashPassword($usuario, '123456'));
            $usuario->setNombre($nombre);
            $usuario->setRol($rolUsuario);
            $usuario->setActivo(true);
            $manager->persist($usuario);
            $usuarios[] = $usuario;
        }

        // 3. Crear grupos
        $gruposData = [
            [
                'nombre' => 'Desarrollo Web',
                'descripcion' => 'Conversaciones sobre programación web, frameworks y tecnologías modernas',
                'privado' => false
            ],
            [
                'nombre' => 'Gaming Zone',
                'descripcion' => 'Todo sobre videojuegos, reviews, tips y competiciones',
                'privado' => false
            ],
            [
                'nombre' => 'Música y Arte',
                'descripcion' => 'Comparte tu música favorita, arte y creatividad',
                'privado' => false
            ],
            [
                'nombre' => 'Proyecto TFG',
                'descripcion' => 'Grupo privado para coordinación del proyecto',
                'privado' => true
            ]
        ];

        $grupos = [];
        foreach ($gruposData as $grupoData) {
            $grupo = new Grupo();
            $grupo->setNombre($grupoData['nombre']);
            $grupo->setDescripcion($grupoData['descripcion']);
            $grupo->setCreadoPor($admin);
            $grupo->setPrivado($grupoData['privado']);
            $manager->persist($grupo);
            $grupos[] = $grupo;

            // Agregar admin como miembro de todos los grupos
            $membresia = new Membresia();
            $membresia->setGrupo($grupo);
            $membresia->setUsuario($admin);
            $membresia->setRolEnGrupo('creador');
            $manager->persist($membresia);
        }

        // 4. Agregar usuarios a grupos (excepto el privado)
        foreach ($usuarios as $index => $usuario) {
            for ($i = 0; $i < 3; $i++) { // Solo los 3 primeros grupos (no el privado)
                if ($index % 2 == $i % 2) { // Distribuir usuarios de forma variada
                    $membresia = new Membresia();
                    $membresia->setGrupo($grupos[$i]);
                    $membresia->setUsuario($usuario);
                    $membresia->setRolEnGrupo('miembro');
                    $manager->persist($membresia);
                }
            }
        }

        // Agregar moderador a grupos
        for ($i = 0; $i < 3; $i++) {
            $membresia = new Membresia();
            $membresia->setGrupo($grupos[$i]);
            $membresia->setUsuario($moderador);
            $membresia->setRolEnGrupo('moderador');
            $manager->persist($membresia);
        }

        // 5. Crear mensajes de bienvenida
        $mensajesData = [
            // Desarrollo Web
            [$grupos[0], $admin, '¡Bienvenidos al grupo de Desarrollo Web! 🚀'],
            [$grupos[0], $moderador, 'Aquí pueden compartir recursos, hacer preguntas y ayudarse mutuamente'],
            [$grupos[0], $usuarios[0], '¡Hola a todos! Estoy aprendiendo React, ¿algún consejo?'],
            [$grupos[0], $usuarios[1], 'Te recomiendo empezar con los hooks, son muy útiles 👍'],
            
            // Gaming Zone  
            [$grupos[1], $admin, '¡Bienvenidos gamers! 🎮 ¿Qué están jugando últimamente?'],
            [$grupos[1], $usuarios[2], 'Acabo de terminar Elden Ring, ¡qué juegazo!'],
            [$grupos[1], $usuarios[3], '¿Alguien juega multiplayer? Podríamos hacer un equipo'],
            
            // Música y Arte
            [$grupos[2], $admin, 'Espacio para compartir arte, música y creatividad 🎨🎵'],
            [$grupos[2], $usuarios[4], 'Acabo de descubrir un artista increíble, ¿conocen a...?'],
            [$grupos[2], $moderador, 'Recuerden respetar los derechos de autor al compartir'],
            
            // Proyecto TFG (privado)
            [$grupos[3], $admin, 'Grupo para coordinación del desarrollo de Ágora'],
        ];

        foreach ($mensajesData as [$grupo, $usuario, $contenido]) {
            $mensaje = new Mensaje();
            $mensaje->setGrupo($grupo);
            $mensaje->setUsuario($usuario);
            $mensaje->setContenido($contenido);
            $mensaje->setCreadoAt(new \DateTime('-' . rand(1, 30) . ' minutes')); // Mensajes de los últimos 30 min
            $manager->persist($mensaje);
        }

        // 6. Crear bots
        $botAsistente = new BotEntity();
        $botAsistente->setNombre('AgoraBot');
        $botAsistente->setTipo(BotType::BASICO);
        $botAsistente->setScope(BotScope::GRUPO);
        $botAsistente->setCreador($admin);
        // Configuración se manejará por BotConfig separadamente
        $botAsistente->setActivo(true);
        $manager->persist($botAsistente);

        $botNoticiasWeb = new BotEntity();
        $botNoticiasWeb->setNombre('WebNewsBot');
        $botNoticiasWeb->setTipo(BotType::REGLAS);
        $botNoticiasWeb->setScope(BotScope::GRUPO);
        $botNoticiasWeb->setCreador($moderador);
        // Configuración se manejará por BotConfig separadamente
        $botNoticiasWeb->setActivo(true);
        $manager->persist($botNoticiasWeb);

        // Ejecutar todas las inserciones
        // 9. Crear bots de ejemplo
        $this->createExampleBots($manager, $admin, $moderador);

        // 10. Crear multimedia de ejemplo
        $this->createExampleMultimedia($manager, $admin);

        $manager->flush();
    }

    private function createExampleBots($manager, $admin, $moderador)
    {
        // Bot básico de saludo
        $botSaludo = new \App\Entity\BotEntity();
        $botSaludo->setNombre('SaludaBot');
        $botSaludo->setTipo(BotType::BASICO);
        $botSaludo->setScope(BotScope::GRUPO);
        $botSaludo->setCreador($admin);
        $botSaludo->setDescripcion('Bot amigable que saluda a los usuarios');
        $botSaludo->setPersonalidad('Soy un bot muy amigable que le gusta saludar a todos');
        $manager->persist($botSaludo);

        // Respuestas del bot de saludo
        $respuesta1 = new \App\Entity\BotRespuesta();
        $respuesta1->setBot($botSaludo);
        $respuesta1->setKeyword('hola');
        $respuesta1->setRespuesta('¡Hola! ¿Cómo estás? 😊');
        $respuesta1->setPrioridad(5);
        $manager->persist($respuesta1);

        $respuesta2 = new \App\Entity\BotRespuesta();
        $respuesta2->setBot($botSaludo);
        $respuesta2->setKeyword('buenos dias');
        $respuesta2->setRespuesta('¡Buenos días! ¡Que tengas un excelente día! ☀️');
        $respuesta2->setPrioridad(5);
        $manager->persist($respuesta2);

        $respuesta3 = new \App\Entity\BotRespuesta();
        $respuesta3->setBot($botSaludo);
        $respuesta3->setKeyword('gracias');
        $respuesta3->setRespuesta('¡De nada! Siempre es un placer ayudar 😄');
        $respuesta3->setPrioridad(3);
        $manager->persist($respuesta3);

        // Bot de ayuda con reglas
        $botAyuda = new \App\Entity\BotEntity();
        $botAyuda->setNombre('AyudaBot');
        $botAyuda->setTipo(BotType::REGLAS);
        $botAyuda->setScope(BotScope::GRUPO);
        $botAyuda->setCreador($moderador);
        $botAyuda->setDescripcion('Bot que proporciona ayuda sobre Ágora');
        $botAyuda->setPersonalidad('Soy un bot muy útil que conoce todo sobre Ágora');
        $manager->persist($botAyuda);

        // Respuestas del bot de ayuda
        $ayuda1 = new \App\Entity\BotRespuesta();
        $ayuda1->setBot($botAyuda);
        $ayuda1->setKeyword('ayuda');
        $ayuda1->setRespuesta('¿En qué puedo ayudarte? Puedo explicarte sobre grupos, mensajes, o comandos. Escribe "comandos" para ver una lista.');
        $ayuda1->setPrioridad(10);
        $manager->persist($ayuda1);

        $ayuda2 = new \App\Entity\BotRespuesta();
        $ayuda2->setBot($botAyuda);
        $ayuda2->setKeyword('comandos');
        $ayuda2->setRespuesta('Comandos disponibles:\n- "grupos" - Información sobre grupos\n- "mensajes" - Cómo enviar mensajes\n- "bots" - Información sobre bots');
        $ayuda2->setPrioridad(10);
        $manager->persist($ayuda2);

        $ayuda3 = new \App\Entity\BotRespuesta();
        $ayuda3->setBot($botAyuda);
        $ayuda3->setKeyword('bots');
        $ayuda3->setRespuesta('Los bots en Ágora pueden ser básicos, con reglas o usar IA. Pueden ayudarte con tareas, responder preguntas y hacer el chat más divertido!');
        $ayuda3->setPrioridad(8);
        $manager->persist($ayuda3);

        // Bot de IA (para cuando esté LocalAI)
        $botIA = new \App\Entity\BotEntity();
        $botIA->setNombre('AgoraAI');
        $botIA->setTipo(BotType::IA);
        $botIA->setScope(BotScope::GRUPO);
        $botIA->setCreador($admin);
        $botIA->setDescripcion('Bot inteligente con IA que puede mantener conversaciones naturales');
        $botIA->setPersonalidad('Soy un asistente de IA inteligente y conversacional. Me gusta ayudar y aprender de las conversaciones.');
        $botIA->setModeloAsociado('gpt4all-j');
        $manager->persist($botIA);

        // Bot privado para pruebas
        $botPrivado = new \App\Entity\BotEntity();
        $botPrivado->setNombre('MiAsistente');
        $botPrivado->setTipo(BotType::REGLAS);
        $botPrivado->setScope(BotScope::PRIVADO);
        $botPrivado->setCreador($admin);
        $botPrivado->setDescripcion('Asistente personal privado');
        $botPrivado->setPersonalidad('Soy tu asistente personal. Solo tú puedes verme y usar mis servicios.');
        $manager->persist($botPrivado);

        $privado1 = new \App\Entity\BotRespuesta();
        $privado1->setBot($botPrivado);
        $privado1->setKeyword('recordatorio');
        $privado1->setRespuesta('¡Por supuesto! Aunque por ahora no puedo guardar recordatorios, en el futuro podré ayudarte con eso.');
        $privado1->setPrioridad(7);
        $manager->persist($privado1);
    }

    private function createExampleMultimedia($manager, $admin)
    {
        // Emojis de ejemplo
        $emoji1 = new \App\Entity\Multimedia();
        $emoji1->setNombre('Sonrisa');
        $emoji1->setTipo(MultimediaType::EMOJI);
        $emoji1->setUrl('😊');
        $emoji1->setCategoria('emociones');
        $emoji1->setTags(['feliz', 'sonrisa', 'alegria']);
        $emoji1->setSubidoPor($admin);
        $manager->persist($emoji1);

        $emoji2 = new \App\Entity\Multimedia();
        $emoji2->setNombre('Pulgar Arriba');
        $emoji2->setTipo(MultimediaType::EMOJI);
        $emoji2->setUrl('👍');
        $emoji2->setCategoria('reacciones');
        $emoji2->setTags(['ok', 'bien', 'aprobacion']);
        $emoji2->setSubidoPor($admin);
        $manager->persist($emoji2);

        // Stickers de ejemplo (URLs de ejemplo)
        $sticker1 = new \App\Entity\Multimedia();
        $sticker1->setNombre('Gato Feliz');
        $sticker1->setTipo(MultimediaType::STICKER);
        $sticker1->setUrl('https://example.com/stickers/gato_feliz.png');
        $sticker1->setThumbnailUrl('https://example.com/stickers/thumbs/gato_feliz_thumb.png');
        $sticker1->setCategoria('animales');
        $sticker1->setTags(['gato', 'feliz', 'mascota']);
        $sticker1->setFormato('png');
        $sticker1->setSubidoPor($admin);
        $manager->persist($sticker1);

        // GIFs de ejemplo
        $gif1 = new \App\Entity\Multimedia();
        $gif1->setNombre('Aplausos');
        $gif1->setTipo(MultimediaType::GIF);
        $gif1->setUrl('https://example.com/gifs/aplausos.gif');
        $gif1->setThumbnailUrl('https://example.com/gifs/thumbs/aplausos_thumb.jpg');
        $gif1->setCategoria('celebracion');
        $gif1->setTags(['aplausos', 'celebrar', 'bravo']);
        $gif1->setFormato('gif');
        $gif1->setTamañoBytes(1024000); // 1MB
        $gif1->setSubidoPor($admin);
        $manager->persist($gif1);
    }
}
