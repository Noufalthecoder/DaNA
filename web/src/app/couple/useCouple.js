/* The signed-in partner, their partner, the couple and the engine's assessment. */
import { COUPLES, PEOPLE, GENES } from '../shared/data.js';
import { assess } from '../shared/genetics.js';
import { useStore, get } from '../shared/store.js';

export function useCouple() {
  const session = useStore((s) => s.session);
  const connections = useStore((s) => s.connections || []);
  const myId = session?.id || 'khalid';

  // Find active connection for current user
  const activeConn = connections.find(
    (c) => (c.userA === myId || c.userB === myId) && c.status === 'ACTIVE'
  );

  let partnerId = null;
  if (activeConn) {
    partnerId = activeConn.userA === myId ? activeConn.userB : activeConn.userA;
  }

  // Find existing couple from COUPLES or store
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

  // Fallback defaults if still no couple found
  if (!couple) {
    couple = COUPLES[0]; // fallback to demo c1
    partnerId = couple.a === myId ? couple.b : couple.a;
  }

  const me = { id: myId, ...(PEOPLE[myId] || { name: 'You', short: 'You', sex: 'M' }) };
  const partner = partnerId
    ? { id: partnerId, ...(PEOPLE[partnerId] || { name: partnerId, short: partnerId, sex: 'F' }) }
    : { id: 'unknown', name: 'Partner', short: 'Partner', sex: 'F' };

  const isConnected = Boolean(activeConn || session?.couple);
  const result = couple ? assess(couple) : null;
  const gene = me.carrier ? { symbol: me.carrier, ...(GENES[me.carrier] || {}) } : null;

  return { session, couple, me, partner, result, gene, isConnected };
}
