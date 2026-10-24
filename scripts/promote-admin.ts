// Promove (ou rebaixa) uma conta a admin, direto no banco: nenhuma rota dá o papel.
// Uso: npm run admin:promote <username>        (vira admin)
//      npm run admin:promote <username> -- --demote   (volta a jogador)
import { config } from 'dotenv'
import { Account } from '@/domain/accounts/entities/account'
import { AccountRole } from '@/domain/accounts/enums/account-role'
import { PrismaService } from '@/infra/database/prisma/prisma.service'

config({ path: '.env' })

async function main() {
  const [username, flag] = process.argv.slice(2)
  if (!username) {
    console.error('Uso: npm run admin:promote <username> [-- --demote]')
    process.exitCode = 1
    return
  }

  const role = flag === '--demote' ? AccountRole.PLAYER : AccountRole.ADMIN
  const prisma = new PrismaService()

  try {
    const updated = await prisma.account.updateMany({
      where: { username: Account.normalizeUsername(username) },
      data: { role },
    })

    if (updated.count === 0) {
      console.error(`Conta ${username} não encontrada.`)
      process.exitCode = 1
      return
    }

    console.log(`Conta ${username} agora é ${role}.`)
  } finally {
    await prisma.$disconnect()
  }
}

void main()
