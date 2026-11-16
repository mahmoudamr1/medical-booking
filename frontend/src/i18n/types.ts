/** Turns string literal leaves into `string` so the English dictionary can match the Arabic shape. */
export type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
