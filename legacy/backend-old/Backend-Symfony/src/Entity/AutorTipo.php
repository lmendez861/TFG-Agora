<?php

namespace App\Entity;

enum AutorTipo: string
{
    case USUARIO = 'usuario';
    case BOT = 'bot';
}