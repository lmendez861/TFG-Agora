<?php

namespace App\Entity;

enum MultimediaType: string
{
    case STICKER = 'sticker';
    case GIF = 'gif';
    case EMOJI = 'emoji';
    case IMAGEN = 'imagen';
}