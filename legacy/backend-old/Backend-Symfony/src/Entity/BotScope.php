<?php

namespace App\Entity;

enum BotScope: string
{
    case PRIVADO = 'privado';
    case GRUPO = 'grupo';
}