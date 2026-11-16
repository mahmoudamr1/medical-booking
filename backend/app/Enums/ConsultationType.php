<?php

namespace App\Enums;

enum ConsultationType: string
{
    use HasValues;

    case InPerson = 'in_person';
    case Online = 'online';
    case HomeVisit = 'home_visit';
}
