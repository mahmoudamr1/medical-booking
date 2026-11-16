<?php

namespace App\Services\Demo;

/**
 * Generates clean, deterministic SVG images for demo data (no external services, no photos of real
 * people): professional doctor avatars (faceless silhouette style) and clinic logos.
 * Development/demo use only — real uploads are restricted to JPEG/PNG/WebP and never SVG.
 */
final class DemoImageGenerator
{
    /** Calm, medical-friendly gradients [from, to, scrub accent]. */
    private const PALETTES = [
        ['#CCFBF1', '#99F6E4', '#0F766E'], ['#DBEAFE', '#BFDBFE', '#1D4ED8'], ['#E0E7FF', '#C7D2FE', '#4338CA'],
        ['#DCFCE7', '#BBF7D0', '#15803D'], ['#E0F2FE', '#BAE6FD', '#0369A1'], ['#F1F5F9', '#E2E8F0', '#334155'],
        ['#CFFAFE', '#A5F3FC', '#0E7490'], ['#EDE9FE', '#DDD6FE', '#6D28D9'],
    ];

    /** Muted skin tones (silhouette head, no facial features). */
    private const SKIN = ['#E9C9AE', '#DDB592', '#C99A76', '#B07F5C', '#8F6446'];

    private const HAIR = ['#1F2937', '#292524', '#3F2D24', '#4B3A2F'];

    /** Doctor avatar: faceless head-and-shoulders silhouette in a white coat with scrubs and stethoscope. */
    public function doctorAvatar(string $seed, string $gender = 'male'): string
    {
        $h = crc32($seed);
        [$from, $to, $accent] = self::PALETTES[$h % count(self::PALETTES)];
        $skin = self::SKIN[intdiv($h, 7) % count(self::SKIN)];
        $hair = self::HAIR[intdiv($h, 11) % count(self::HAIR)];
        $id = 'g'.substr(md5($seed), 0, 8);

        $head = match (true) {
            $gender === 'female' && $h % 2 === 0 => // hijab
                "<path d='M62 108c0-26 17-46 38-46s38 20 38 46v30c-10 8-24 12-38 12s-28-4-38-12z' fill='{$accent}'/>"
                ."<ellipse cx='100' cy='100' rx='22' ry='26' fill='{$skin}'/>"
                ."<path d='M74 92c4-18 14-26 26-26s22 8 26 26c-6-6-15-9-26-9s-20 3-26 9z' fill='{$accent}'/>",
            $gender === 'female' => // long hair
                "<path d='M70 104c0-24 13-42 30-42s30 18 30 42v34c-6 4-12 6-18 6V112H88v32c-6 0-12-2-18-6z' fill='{$hair}'/>"
                ."<ellipse cx='100' cy='100' rx='22' ry='26' fill='{$skin}'/>"
                ."<path d='M77 94c3-17 12-26 23-26s20 9 23 26c-8-9-38-9-46 0z' fill='{$hair}'/>",
            default => // short hair
                "<ellipse cx='100' cy='100' rx='22' ry='26' fill='{$skin}'/>"
                ."<path d='M77 96c0-17 10-28 23-28s23 11 23 28c-5-8-13-12-23-12s-18 4-23 12z' fill='{$hair}'/>",
        };

        return <<<SVG
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200' role='img' aria-label='Doctor'>
  <defs>
    <linearGradient id='{$id}' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='{$from}'/><stop offset='1' stop-color='{$to}'/>
    </linearGradient>
  </defs>
  <rect width='200' height='200' fill='url(#{$id})'/>
  <circle cx='100' cy='94' r='70' fill='#FFFFFF' opacity='.18'/>
  <g transform='translate(100 120) scale(1.28) translate(-100 -120)'>
  <rect x='90' y='118' width='20' height='22' rx='8' fill='{$skin}'/>
  <path d='M34 200c2-36 26-58 66-58s64 22 66 58z' fill='#FFFFFF'/>
  <path d='M84 142l16 26 16-26c-5-2-10-3-16-3s-11 1-16 3z' fill='{$accent}'/>
  <path d='M84 142l-10 58h-8c2-28 6-48 18-58zM116 142l10 58h8c-2-28-6-48-18-58z' fill='#E2E8F0'/>
  <path d='M80 150c-8 14-8 30 2 38' stroke='#475569' stroke-width='3' fill='none' stroke-linecap='round'/>
  <circle cx='84' cy='190' r='5' fill='#CBD5E1' stroke='#475569' stroke-width='2.5'/>
  <rect x='122' y='160' width='18' height='4' rx='2' fill='{$accent}' opacity='.6'/>
  {$head}
  </g>
</svg>
SVG;
    }

    /** Clinic logo: rounded badge with a medical cross and the clinic initials. */
    public function clinicLogo(string $seed, string $initials): string
    {
        $h = crc32($seed);
        [$from, , $accent] = self::PALETTES[$h % count(self::PALETTES)];
        $initials = htmlspecialchars(mb_strtoupper(mb_substr($initials, 0, 2)), ENT_XML1);

        return <<<SVG
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200' role='img' aria-label='Clinic logo'>
  <rect width='200' height='200' rx='44' fill='{$accent}'/>
  <rect x='14' y='14' width='172' height='172' rx='34' fill='{$from}' opacity='.14'/>
  <path d='M86 46h28v30h30v28h-30v30H86v-30H56V76h30z' fill='#FFFFFF' opacity='.95'/>
  <text x='100' y='176' text-anchor='middle' font-family='Inter, Arial, sans-serif' font-size='26' font-weight='700' fill='#FFFFFF' letter-spacing='2'>{$initials}</text>
</svg>
SVG;
    }
}
