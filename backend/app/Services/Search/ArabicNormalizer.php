<?php

namespace App\Services\Search;

/**
 * Normalizes Arabic/English text for search matching only. Display text is never modified.
 * - removes tashkeel (diacritics) and tatweel
 * - unifies alef variants (أ إ آ ٱ → ا), ta marbuta (ة → ه), alef maqsura (ى → ي), hamza carriers (ؤ → و, ئ → ي)
 * - lowercases Latin, collapses whitespace
 */
final class ArabicNormalizer
{
    private const MAP = [
        'أ' => 'ا', 'إ' => 'ا', 'آ' => 'ا', 'ٱ' => 'ا',
        'ة' => 'ه', 'ى' => 'ي', 'ؤ' => 'و', 'ئ' => 'ي',
        'ـ' => '',
    ];

    public static function normalize(?string $text): string
    {
        if ($text === null || $text === '') {
            return '';
        }
        // Arabic diacritics U+064B–U+065F, superscript alef U+0670.
        $text = preg_replace('/[\x{064B}-\x{065F}\x{0670}]/u', '', $text) ?? $text;
        $text = strtr($text, self::MAP);
        $text = mb_strtolower($text);
        $text = preg_replace('/[^\p{L}\p{N}]+/u', ' ', $text) ?? $text;

        return trim(preg_replace('/\s+/u', ' ', $text) ?? $text);
    }
}
