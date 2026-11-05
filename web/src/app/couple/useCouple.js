/* The signed-in partner, their partner, the couple and the engine's assessment. */
import { COUPLES, PEOPLE, GENES } from '../shared/data.js';
import { assess } from '../shared/genetics.js';
import { useStore } from '../shared/store.js';

export function useCouple() {
  const session = useStore((s) => s.session);
  const couple = (session?.couple && COUPLES.find((c) => c.id === session.couple)) || COUPLES[0];
  const meId = couple ? (couple.a === session?.id ? couple.a : couple.b) : 'fatima';
  const partnerId = couple ? (meId === couple.a ? couple.b : couple.a) : 'khalid';
  const mePerson = PEOPLE[session?.id] || PEOPLE[meId] || { name: session?.name || 'Partner', short: session?.name?.split(' ')[0] || 'Partner' };
  const partnerPerson = PEOPLE[partnerId] || { name: 'Partner', short: 'Partner' };
  const displayName = session?.name || mePerson.name || 'Partner';
  const shortName = displayName.split(' ')[0] || 'Partner';
  const me = { id: session?.id || meId, ...mePerson, name: displayName, short: shortName };
  const partner = { id: partnerId, ...partnerPerson };
  const result = couple ? assess(couple) : assess(COUPLES[0]);
  const gene = me.carrier ? { symbol: me.carrier, ...GENES[me.carrier] } : null;
  return { session, couple, me, partner, result, gene };
}
