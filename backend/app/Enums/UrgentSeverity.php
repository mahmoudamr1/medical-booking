<?php

namespace App\Enums;

/**
 * Patient-reported severity of an urgent request. Self-reported, never presented as a diagnosis.
 * critical → one immediate wave to every eligible available doctor; urgent/standard → tiered escalation.
 */
enum UrgentSeverity: string
{
    use HasValues;

    case Critical = 'critical';
    case Urgent = 'urgent';
    case Standard = 'standard';

    /** SQL expression ranking severities most-severe first (for ORDER BY). */
    public static function rankSql(string $column = 'severity'): string
    {
        $whens = '';
        foreach (self::cases() as $rank => $case) {
            $whens .= " WHEN '{$case->value}' THEN {$rank}";
        }

        return "CASE {$column}{$whens} END";
    }
}
