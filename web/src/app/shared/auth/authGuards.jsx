import React from 'react';
import { useStore } from '../store.js';
import { go } from '../router.js';
import {
  ROLES,
  RESOURCES,
  ACTIONS,
  evaluateAccess,
  hasActiveCoupleRelationship,
  hasActiveConsent,
  isAssignedCounsellorToCase,
  SECURITY_ERRORS,
} from './authorizationEngine.js';

/**
 * Standard Security Denied Fallback UI
 */
export function PermissionDenied({
  title = 'Access Restricted',
  message = 'You do not have permission to view this clinical or operational resource.',
  error,
  returnPath = '/app',
}) {
  const displayMsg = error?.message || message;
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        maxWidth: 480,
        width: '100%',
        background: '#fff',
        border: '1px solid #E6EAE7',
        borderRadius: 16,
        padding: 32,
        textAlign: 'center',
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.06)'
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          background: '#FDECEF',
          color: '#CE1126',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          fontSize: 22,
          fontWeight: 700
        }}>
          !
        </div>
        <h2 style={{ fontSize: 20, color: '#17201B', marginBottom: 10, fontWeight: 700 }}>
          {title}
        </h2>
        <p style={{ fontSize: 14, color: '#56625B', lineHeight: 1.6, marginBottom: 24 }}>
          {displayMsg}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            className="btn"
            style={{
              background: '#00843D',
              color: '#fff',
              border: 0,
              padding: '10px 20px',
              borderRadius: 10,
              fontWeight: 600,
              cursor: 'pointer'
            }}
            onClick={() => go(returnPath)}
          >
            Return to Dashboard
          </button>
        </div>
        <p style={{ marginTop: 20, fontSize: 12, color: '#88988F' }}>
          DaNA Clinical Privacy & Healthcare Data Protection Standard (ADHICS / Federal Law No. 2)
        </p>
      </div>
    </div>
  );
}

/**
 * Hook providing authorization evaluation functions bound to the current session
 */
export function useAuthorization() {
  const session = useStore((s) => s.session);
  const connections = useStore((s) => s.connections) || [];
  const connectionConsents = useStore((s) => s.connectionConsents) || [];
  const consents = useStore((s) => s.consents) || [];

  const allConsents = [...connectionConsents, ...consents];

  const can = (action, resource, target = {}, context = {}) => {
    return evaluateAccess({
      actor: session,
      resource,
      action,
      target,
      context: {
        couples: connections,
        consents: allConsents,
        ...context,
      },
    });
  };

  const hasRole = (...roles) => {
    if (!session || !session.role) return false;
    return roles.includes(session.role);
  };

  const isConnectedWith = (partnerId) => {
    return hasActiveCoupleRelationship(session, partnerId, connections);
  };

  const hasConsentFor = (purpose) => {
    return hasActiveConsent(session?.personId || session?.id, purpose, allConsents);
  };

  return {
    actor: session,
    role: session?.role,
    can,
    hasRole,
    isConnectedWith,
    hasConsentFor,
  };
}

/**
 * Guard: Requires active authentication session
 */
export function RequireAuth({ children, fallback = null }) {
  const session = useStore((s) => s.session);
  if (!session) {
    if (fallback) return fallback;
    go('/login');
    return null;
  }
  return children;
}

/**
 * Guard: Restricts route to specific roles
 */
export function RequireRole({ roles = [], children, fallback = null }) {
  const session = useStore((s) => s.session);
  if (!session) {
    go('/login');
    return null;
  }
  if (!roles.includes(session.role)) {
    return fallback || (
      <PermissionDenied
        title="Unauthorized Role"
        message={`This section is restricted to ${roles.join(', ')} accounts. Your current role is '${session.role}'.`}
      />
    );
  }
  return children;
}

/**
 * Guard: Restricts couple views that require an active linked partner
 */
export function RequireActiveCouple({ children, partnerId = null }) {
  const session = useStore((s) => s.session);
  const connections = useStore((s) => s.connections) || [];

  if (!session) {
    go('/login');
    return null;
  }

  const isLinked = partnerId
    ? hasActiveCoupleRelationship(session, partnerId, connections)
    : connections.some((c) => {
        const a = c.partner_a || c.partnerA || c.userA;
        const b = c.partner_b || c.partnerB || c.userB;
        const me = session.personId || session.id;
        const isMember = a === me || b === me;
        const status = (c.status || c.stage || 'active').toLowerCase();
        return isMember && !['ended', 'cancelled', 'rejected', 'dissolved'].includes(status);
      });

  if (!isLinked) {
    return (
      <PermissionDenied
        title="Link Your Partner First"
        message="This part of DaNA is about your couple result, so it opens once you and your partner are actively linked."
        returnPath="/app/connections"
      />
    );
  }

  return children;
}

/**
 * Guard: Checks specific consent before rendering clinical/screening steps
 */
export function RequireConsent({ purpose, children, fallback = null }) {
  const session = useStore((s) => s.session);
  const connectionConsents = useStore((s) => s.connectionConsents) || [];
  const consents = useStore((s) => s.consents) || [];
  const allConsents = [...connectionConsents, ...consents];

  const me = session?.personId || session?.id;
  const hasConsent = hasActiveConsent(me, purpose, allConsents);

  if (!hasConsent) {
    return fallback || (
      <PermissionDenied
        title="Explicit Consent Required"
        message="Before proceeding with this clinical workflow, explicit patient consent must be granted."
        returnPath="/app/privacy"
      />
    );
  }

  return children;
}

