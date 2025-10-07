<?php

namespace App\Entity;

enum TipoMensaje: string
{
    case TEXTO = 'texto';
    case ARCHIVO = 'archivo';
    case STICKER = 'sticker';
    case GIF = 'gif';
    case BOT = 'bot';
    case MULTIMEDIA = 'multimedia';
}