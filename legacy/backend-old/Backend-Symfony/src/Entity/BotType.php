<?php

namespace App\Entity;

enum BotType: string
{
    case BASICO = 'basico';
    case REGLAS = 'reglas';
    case IA = 'ia';
}