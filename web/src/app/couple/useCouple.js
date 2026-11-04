/* The signed-in partner, their partner, the couple and the engine's assessment. */
import { COUPLES, PEOPLE, GENES } from '../shared/data.js';
import { assess } from '../shared/genetics.js';
import { useStore, EMPTY_ARR } from '../shared/store.js';

export function useCouple() {
  const session = useStore((s) => s.session);
  const connections = useStore((s) => s.connections) || EMPTY_ARR;
  const myId = session?.id || 'khalid';

  // Find active connection for current user from Connections module
  const activeConn = connections.find(
    (c) => (c.userA === myId || c.userB === myId) && c.status === 'ACTIVE'
  );

  let partnerId = null;
  if (activeConn) {
    partnerId = activeConn.userA === myId ? activeConn.userB : activeConn.userA;
  }

  // Find existing couple from COUPLES or active session
  let couple = null;
  if (partnerId) {
    couple = COUPLES.find(
      (c) => (c.a === myId && c.b === partnerId) || (c.a === partnerId && c.b === myId)
    );
    if (!couple) {
      couple = {
        id: `c_${myId}_${partnerId}`,
        a: myId,
        b: partnerId,
        stage: 'Engaged',
        pregnantWeeks: null,
        screened: new Date().toISOString().slice(0, 10),
      };
    }
  } else if (session?.couple) {
    couple = COUPLES.find((c) => c.id === session.couple);
    if (couple) {
      partnerId = couple.a === myId ? couple.b : couple.a;
    }
  }

  if (!couple) {
    couple = COUPLES[0];
    partnerId = couple.a === myId ? couple.b : couple.a;
  }

  const mePerson = PEOPLE[session?.id] || PEOPLE[myId] || { name: session?.name || 'You', short: session?.name?.split(' ')[0] || 'You', sex: 'M' };
  const partnerPerson = PEOPLE[partnerId] || { name: 'Partner', short: 'Partner', sex: 'F' };
  const me = { id: session?.id || myId, ...mePerson };
  const partner = { id: partnerId, ...partnerPerson };

  const isConnected = Boolean(activeConn || session?.couple);
  const result = couple ? assess(couple) : assess(COUPLES[0]);
  const gene = me.carrier ? { symbol: me.carrier, ...(GENES[me.carrier] || {}) } : null;

  return { session, couple, me, partner, result, gene, isConnected };
}
