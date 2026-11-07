import { PrismaClient } from '@prisma/client'
import { Fragments } from '@/domain/economy/value-objects/fragments'

/** Põe saldo direto na carteira da conta (o de verdade vem das batalhas). */
export async function giveWallet(
  prisma: PrismaClient,
  username: string,
  coins: number,
  fragments: Fragments = {}
) {
  const account = await prisma.account.findUniqueOrThrow({
    where: { username },
  })

  await prisma.wallet.upsert({
    where: { accountId: account.id },
    create: { accountId: account.id, coins, fragments },
    update: { coins, fragments },
  })
}
