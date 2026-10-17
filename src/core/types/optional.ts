/** Torna opcionais apenas as chaves `K` de `T`. */
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>
