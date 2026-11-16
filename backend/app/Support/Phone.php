<?php

namespace App\Support;

final class Phone
{
    /**
     * Egyptian mobile numbers: 010/011/012/015 + 8 digits, optionally with +20 / 20 country code
     * (e.g. 01012345678, +201012345678, 201012345678).
     */
    public const EGYPT_MOBILE = '/^(?:\+?20)?0?1[0125]\d{8}$/';

    /** Any business contact number (landline or mobile): optional "+", 7–15 digits. */
    public const CONTACT = '/^\+?[0-9]{7,15}$/';
}
