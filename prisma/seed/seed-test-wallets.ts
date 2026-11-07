import { Lineage } from '@/domain/characters/enums/lineage'
import { PrismaService } from '@/infra/database/prisma/prisma.service'

/** Saldo de teste (D150): dá para comprar baús e tentar aprimorar sem jogar dias. Não é regra do jogo. */
const TEST_WALLET = {
  coins: 20_000,
  fragmentsPerType: 50,
}

/**
 * Carteira das contas de teste (`tester_01` e `admin`) para testar baús e aprimoramento. Só cria: se a conta já tem
 * carteira, o saldo dela fica (rodar o seed de novo não repõe).
 */
export async function seedTestWallets(
  prisma: PrismaService,
  usernames: string[]
): Promise<string> {
  const accounts = await prisma.account.findMany({
    where: { username: { in: usernames } },
    select: { id: true, username: true },
  })
  const fragments = Object.fromEntries(
    Object.values(Lineage).map((type) => [type, TEST_WALLET.fragmentsPerType])
  )

  const created: string[] = []
  for (const account of accounts) {
    const existing = await prisma.wallet.findUnique({
      where: { accountId: account.id },
    })
    if (existing) continue

    await prisma.wallet.create({
      data: { accountId: account.id, coins: TEST_WALLET.coins, fragments },
    })
    created.push(account.username)
  }

  return created.length > 0
    ? `carteira de teste (${TEST_WALLET.coins} M e ${TEST_WALLET.fragmentsPerType} de cada fragmento): ${created.join(', ')}`
    : 'carteiras de teste já existiam'
}
