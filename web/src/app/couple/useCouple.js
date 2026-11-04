/* The signed-in partner, their partner, the couple and the engine's assessment. */
import { COUPLES, PEOPLE, GENES } from '../shared/data.js';
import { assess } from '../shared/genetics.js';
import { useStore } from '../shared/store.js';

export function useCouple() {
  const session = useStore((s) => s.session);
  const couple = COUPLES.find((c) => c.id === session.couple);
  const meId = couple.a === session.id ? couple.a : couple.b;
  const partnerId = meId === couple.a ? couple.b : couple.a;
  const me = { id: meId, ...PEOPLE[meId] };
  const partner = { id: partnerId, ...PEOPLE[partnerId] };
  const result = assess(couple);
  const gene = me.carrier ? { symbol: me.carrier, ...GENES[me.carrier] } : null;
  return { session, couple, me, partner, result, gene };
}
