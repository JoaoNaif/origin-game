import { Candidate } from '@/domain/ai/services/action-generator'
import { ActorTurn } from '@/domain/combat/engine/battle-engine'

/**
 * As jogadas legais da vez. `payload` é exatamente o que se manda em `POST /battles/:id/actions`; nas skills, a
 * prévia do motor diz quem é atingido, a chance de acerto e o que cada efeito faria (dano já com todos os
 * modificadores). Chances são probabilidades, não sorteios: o resultado de verdade sai da seed.
 */
export class TurnOptionsPresenter {
  static toHTTP(turn: ActorTurn, options: Candidate[]) {
    return {
      turn: { ref: turn.ref, side: turn.side, round: turn.round },
      options: options.map(({ payload, preview }) => ({
        payload,
        preview: preview
          ? {
              potency: preview.potency,
              desgaste: preview.desgaste,
              hits: preview.hits,
            }
          : null,
      })),
    }
  }
}
