import { applyDecorators, UseGuards } from '@nestjs/common'
import { AdminGuard } from './admin.guard'

/** Rota só de admin (em cima do login, que o guard global já exige): conta sem o papel recebe 403. */
export const Admin = () => applyDecorators(UseGuards(AdminGuard))
