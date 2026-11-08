import { CreateAccountUseCase } from '@/domain/accounts/applications/use-cases/create-account'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { templateKit } from '@/domain/catalog/services/template-skills'
import { Character } from '@/domain/characters/entities/character'
import { CharacterTemplate } from '@/domain/characters/entities/character-template'
import { DomLevel } from '@/domain/characters/enums/dom-level'
import { DomPillar } from '@/domain/characters/enums/dom-pillar'
import { DomRole } from '@/domain/characters/enums/dom-role'
import { DOM_ROLE_ORDER } from '@/domain/characters/services/dom-rules'
import { defaultFreePoints } from '@/domain/characters/services/free-points'
import { xpToNextLevel } from '@/domain/characters/services/level-curve'
import {
  DomFeat,
  DomPillars,
} from '@/domain/characters/value-objects/dom-state'
import { CreateSquadUseCase } from '@/domain/squads/applications/use-cases/create-squad'
import { BcryptHasher } from '@/infra/cryptography/bcrypt-hasher'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { PrismaAccountsRepository } from '@/infra/database/prisma/repositories/prisma-accounts-repository'
import { PrismaCatalogRepository } from '@/infra/database/prisma/repositories/prisma-catalog-repository'
import { PrismaCharactersRepository } from '@/infra/database/prisma/repositories/prisma-characters-repository'
import { PrismaSquadsRepository } from '@/infra/database/prisma/repositories/prisma-squads-repository'

/** Conta de vitrine do despertar e do DOM (D151, D152): entra com `veterano` / `origin123`. */
export const SHOWCASE_ACCOUNT = {
  username: 'veterano',
  displayName: 'Veterano',
  password: 'origin123',
}

interface ShowcaseSpec {
  key: string
  level: number
  /** Variante despertada (só personagem de 1 variante, D67). */
  awakening?: string
  /** Pilares do DOM, treinados com feitos de verdade na janela (não só definidos). */
  dom: DomPillars
  row: number
  column: number
}

/**
 * Os 4 da vitrine, que formam o squad "Vitrine": cada skill única do DOM aparece em alguém e os 3 despertares do seed
 * que cabem nos personagens disponíveis (Sombra Abissal, Cristal, Plasma).
 */
export const SHOWCASE_CHARACTERS: ShowcaseSpec[] = [
  {
    // 2 variantes: não desperta; DOM nos 4 pilares, só stats
    key: 'kael-vaz',
    level: 85,
    dom: {
      BODY: DomLevel.INTERMEDIATE,
      HEART: DomLevel.INTERMEDIATE,
      MIND: DomLevel.BASIC,
      AURA: DomLevel.BASIC,
    },
    row: 0,
    column: 0,
  },
  {
    key: 'nox',
    level: 95,
    awakening: 'sombra-abissal',
    dom: { MIND: DomLevel.ADVANCED, BODY: DomLevel.INTERMEDIATE },
    row: 1,
    column: 0,
  },
  {
    key: 'gaia',
    level: 90,
    awakening: 'cristal',
    dom: { HEART: DomLevel.ADVANCED, AURA: DomLevel.BASIC },
    row: 0,
    column: 1,
  },
  {
    // personagem de baú: a conta ganha como o admin daria
    key: 'oren-ignara',
    level: 90,
    awakening: 'plasma',
    dom: { AURA: DomLevel.ADVANCED, BODY: DomLevel.ADVANCED },
    row: 1,
    column: 2,
  },
]

/** Batalhas de treino por nível: chegam ao limiar (8 / 20 / 45) com folga. */
const TRAINING_BATTLES: Record<DomLevel, number> = {
  BASIC: 9,
  INTERMEDIATE: 22,
  ADVANCED: 48,
}

/**
 * Treina o DOM pelo caminho de verdade (`recordDomBattle`): batalhas de peso 1 com um feito por pilar, revezando os 4
 * papéis (o avançado pede 3 com 8 pontos). Assim a ficha mostra pontos e o pilar não cai na primeira conferência.
 */
function trainDom(
  character: Character,
  target: DomPillars,
  hasVariant: boolean
) {
  const pillars = Object.keys(target) as DomPillar[]
  const battles = Math.max(...pillars.map((p) => TRAINING_BATTLES[target[p]!]))

  for (let i = 0; i < battles; i++) {
    const feats: DomFeat[] = pillars
      .filter((p) => i < TRAINING_BATTLES[target[p]!])
      .map((pillar) => ({
        pillar,
        role: DOM_ROLE_ORDER[i % DOM_ROLE_ORDER.length] as DomRole,
      }))
    character.recordDomBattle({ weight: 1, feats, hasVariant })
  }

  for (const pillar of pillars) {
    if (character.domPillars[pillar] !== target[pillar]) {
      throw new Error(
        `DOM: ${pillar} ficou ${character.domPillars[pillar]}, esperado ${target[pillar]}`
      )
    }
  }
}

/** Sobe de nível, distribui os pontos livres, desperta, aprende as despertadas e treina o DOM. */
export function prepareShowcaseCharacter(
  character: Character,
  spec: ShowcaseSpec,
  template: CharacterTemplate,
  catalog: GameCatalog
) {
  while (character.level < spec.level) {
    character.gainXp(xpToNextLevel(character.level))
  }
  const points = character.allocateFreePoints(
    defaultFreePoints(template.stats, character.level),
    template
  )
  if (points.isLeft()) throw points.value

  if (spec.awakening) {
    const variant = [...catalog.variants.values()].find(
      (v) => v.key === spec.awakening
    )!
    const awakened = character.awaken(variant, template)
    if (awakened.isLeft()) throw awakened.value

    // as despertadas da variante que o nível já alcança, aprendidas; a build = a básica do kit + até 3 despertadas
    // (o resto do kit completa as 4)
    const awakenedSkills = [...catalog.skills.values()].filter(
      (s) =>
        s.isAwakened &&
        s.variantId?.equals(variant.id) &&
        s.minLevel <= character.level
    )
    for (const skill of awakenedSkills) {
      const learned = character.learnSkill(skill, template)
      if (learned.isLeft()) throw learned.value
    }
    const kit = character.build.map((s) => s.skill.id)
    const picked = awakenedSkills.slice(0, 3).map((s) => s.id)
    const build = [kit[0], ...picked, ...kit.slice(1, 4 - picked.length)]
    const equipped = character.equipSkills(build)
    if (equipped.isLeft()) throw equipped.value
  }

  trainDom(character, spec.dom, template.variants.length > 0)
}

/**
 * Conta de vitrine (D151, D152): Kael, Nox, Gaia e Oren de nível 85 a 95, os três últimos despertados (com as skills
 * despertadas na build) e todos com DOM treinado, no squad "Vitrine". Os outros personagens ficam no nível 0. Se a
 * conta já existe, fica como está.
 */
export async function seedShowcaseAccount(
  prisma: PrismaService
): Promise<string> {
  const existing = await prisma.account.findUnique({
    where: { username: SHOWCASE_ACCOUNT.username },
  })
  if (existing) return `conta ${SHOWCASE_ACCOUNT.username} mantida`

  const catalogRepository = new PrismaCatalogRepository(prisma)
  const accounts = new PrismaAccountsRepository(prisma)
  const characters = new PrismaCharactersRepository(prisma, catalogRepository)
  const created = await new CreateAccountUseCase(
    accounts,
    characters,
    catalogRepository,
    new BcryptHasher()
  ).execute(SHOWCASE_ACCOUNT)
  if (created.isLeft()) throw created.value

  const { account } = created.value
  const catalog = await catalogRepository.load()
  const roster = [...created.value.characters]
  const members: { characterId: string; row: number; column: number }[] = []

  for (const spec of SHOWCASE_CHARACTERS) {
    const template = [...catalog.templates.values()].find(
      (t) => t.key === spec.key
    )!
    let character = roster.find((c) => c.templateId.equals(template.id))
    if (!character) {
      const granted = Character.create({
        account,
        template,
        familyTrait: template.familyTraitId
          ? catalog.traits.get(template.familyTraitId.toValue())
          : null,
        kitSkills: templateKit(catalog, template),
      })
      if (granted.isLeft()) throw granted.value
      character = granted.value
      await characters.createMany([character])
    }

    prepareShowcaseCharacter(character, spec, template, catalog)
    await characters.save(character)
    members.push({
      characterId: character.id.toString(),
      row: spec.row,
      column: spec.column,
    })
  }

  const squad = await new CreateSquadUseCase(
    accounts,
    characters,
    new PrismaSquadsRepository(prisma)
  ).execute({ accountId: account.id.toString(), name: 'Vitrine', members })
  if (squad.isLeft()) throw squad.value

  return `conta ${SHOWCASE_ACCOUNT.username}: Kael, Nox, Gaia e Oren com despertar e DOM no squad Vitrine (senha ${SHOWCASE_ACCOUNT.password})`
}
