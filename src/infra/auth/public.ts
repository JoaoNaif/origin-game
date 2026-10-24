import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'

/** Rota aberta: o guard global (`JwtAuthGuard`) não exige login. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
