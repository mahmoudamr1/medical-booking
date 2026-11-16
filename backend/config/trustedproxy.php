<?php

return [

    /*
    | Reverse proxies whose X-Forwarded-* headers are trusted (comma-separated IPs/CIDRs, or "*").
    | Empty = trust none: a client-sent X-Forwarded-For can never change the request IP.
    |
    | Set this whenever the API sits behind a proxy (the Next.js /api rewrite, a load balancer, a
    | TLS terminator). Otherwise every user shares the proxy's IP, so the per-IP rate limits
    | (login, register, password reset, guest API) become global and one client can lock everyone
    | out; audit and consent records would also store the proxy's address.
    */
    'proxies' => env('TRUSTED_PROXIES'),

];
