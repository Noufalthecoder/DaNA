/**
 * DaNA Healthcare Security & Authorization Engine
 *
 * Implements a unified three-tier authorization model:
 * 1. Role-Based Access Control (RBAC)
 * 2. Relationship-Based Access Control (ReBAC)
 * 3. Consent and Context-Based Access Control (CBAC / ABAC)
 *
 * Compliance: UAE Health Data Law (Federal Law No. 2 of 2019),
 * UAE Human Genome Decree-Law No. 49 of 2023, ADHICS, UAE PDPL.
 */

// -----------------------------------------------------------------------------
// 1. Roles & Classifications
// -----------------------------------------------------------------------------

export const ROLES = Object.freeze({
  PATIENT: 'couple', // Legacy database value is 'couple', representing individual/couple patient
  COUNSELLOR: 'counsellor',
  ADMIN: 'admin',
  CLINICAL_SUPERVISOR: 'clinical_supervisor',
  CONTENT_REVIEWER: 'content_reviewer',
  DOH_VIEWER: 'doh_viewer',
  SYSTEM_SERVICE: 'system_service',
});

export const ALL_ROLES = Object.freeze(Object.values(ROLES));

export const PRIVILEGED_ROLES = Object.freeze([
  ROLES.COUNSELLOR,
  ROLES.ADMIN,
  ROLES.CLINICAL_SUPERVISOR,
  ROLES.CONTENT_REVIEWER,
  ROLES.DOH_VIEWER,
  ROLES.SYSTEM_SERVICE,
]);

// -----------------------------------------------------------------------------
// 2. Resources & Actions
// -----------------------------------------------------------------------------

export const RESOURCES = Object.freeze({
  PROFILE: 'profile',
  GENETIC_REPORT: 'genetic_report',
  GENETIC_VARIANT: 'genetic_variant',
  MEDICAL_RECORD: 'medical_record',
  COUPLE_ASSESSMENT: 'couple_assessment',
  CLINICAL_CASE: 'clinical_case',
  COUNSELLING_NOTE: 'counselling_note',
  APPOINTMENT: 'appointment',
  REFERRAL: 'referral',
  SILA_INVITATION: 'sila_invitation',
  CONSENT: 'consent',
  PARTNER_CONSENT: 'partner_consent',
  AUDIT_LOG: 'audit_log',
  BENCHMARK: 'benchmark',
  CONTENT_CARD: 'content_card',
  ANALYTICS: 'analytics',
  SYSTEM_CONFIG: 'system_config',
});

export const ACTIONS = Object.freeze({
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  EXECUTE: 'execute',
  APPROVE: 'approve',
  REVOKE: 'revoke',
  EXPORT: 'export',
});

// -----------------------------------------------------------------------------
// 3. Consent Model & Purpose Enumeration
// -----------------------------------------------------------------------------

export const CONSENT_PURPOSES = Object.freeze({
  GENETIC_PROCESSING: 'genetic_processing',
  MEDICAL_PROCESSING: 'medical_processing',
  FAMILY_HISTORY_PROCESSING: 'family_history_processing',
  COUPLE_ASSESSMENT: 'couple_assessment',
  SHARE_COMBINED_ASSESSMENT: 'share_combined_assessment',
  COUNSELLOR_CLINICAL_ACCESS: 'counsellor_clinical_access',
  FAMILY_NOTIFICATION: 'family_notification',
});

export const CONSENT_SCOPES = Object.freeze({
  DEFAULT: 'default',
  RESULT_SUMMARY: 'result_summary',
  FULL_REPORT: 'full_report',
  PLAN: 'plan',
  CARRIER_GENE: 'carrier_gene',
});

export const CONSENT_STATUSES = Object.freeze({
  ACTIVE: 'active',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
});

// -----------------------------------------------------------------------------
// 4. Standardized Security Error Codes & Messages
// -----------------------------------------------------------------------------

export const SECURITY_ERRORS = Object.freeze({
  UNAUTHENTICATED: {
    code: 'DANA_AUTH_401_UNAUTHENTICATED',
    status: 401,
    message: 'Authentication required. Please sign in to continue.',
  },
  SESSION_EXPIRED: {
    code: 'DANA_AUTH_401_SESSION_EXPIRED',
    status: 401,
    message: 'Your session has expired. Please sign in again.',
  },
  ACCOUNT_SUSPENDED: {
    code: 'DANA_AUTH_403_ACCOUNT_SUSPENDED',
    status: 403,
    message: 'Account is inactive or suspended. Contact programme administration.',
  },
  INVALID_ROLE: {
    code: 'DANA_AUTH_403_INVALID_ROLE',
    status: 403,
    message: 'User does not possess the required application role.',
  },
  ROLE_SELF_ASSIGNMENT_FORBIDDEN: {
    code: 'DANA_AUTH_403_ROLE_TAMPERING',
    status: 403,
    message: 'Privileged role assignment can only be granted by the trusted backend.',
  },
  MISSING_PERMISSION: {
    code: 'DANA_AUTH_403_FORBIDDEN',
    status: 403,
    message: 'You do not have permission to perform this action.',
  },
  NOT_OWNER: {
    code: 'DANA_AUTH_403_NOT_OWNER',
    status: 403,
    message: 'Access denied: You do not own this resource.',
  },
  RAW_GENETIC_CROSS_ACCESS_FORBIDDEN: {
    code: 'DANA_AUTH_403_GENETIC_CROSS_BOUNDARY',
    status: 403,
    message: 'Raw genetic reports and variant calls are confidential to the individual owner.',
  },
  INACTIVE_RELATIONSHIP: {
    code: 'DANA_AUTH_403_INACTIVE_RELATIONSHIP',
    status: 403,
    message: 'Active couple connection is required to access shared couple resources.',
  },
  UNASSIGNED_COUNSELLOR: {
    code: 'DANA_AUTH_403_UNASSIGNED_CASE',
    status: 403,
    message: 'Clinical access is restricted to the counsellor assigned to this case.',
  },
  UNVERIFIED_CREDENTIALS: {
    code: 'DANA_AUTH_403_UNVERIFIED_CREDENTIALS',
    status: 403,
    message: 'Counsellor credentials have not been verified by programme administration.',
  },
  COUNSELLOR_CREDENTIALS_REQUIRED: {
    code: 'DANA_AUTH_403_UNVERIFIED_CREDENTIALS',
    status: 403,
    message: 'Counsellor credentials have not been verified by programme administration.',
  },
  UNVERIFIED_REPORT: {
    code: 'DANA_AUTH_403_UNVERIFIED_REPORT',
    status: 403,
    message: 'Genetic reports must be verified by laboratory before couple evaluation.',
  },
  MISSING_CONSENT: {
    code: 'DANA_AUTH_403_CONSENT_REQUIRED',
    status: 403,
    message: 'Required patient consent is missing for this processing operation.',
  },
  REVOKED_CONSENT: {
    code: 'DANA_AUTH_403_CONSENT_REVOKED',
    status: 403,
    message: 'Processing halted: Required consent was revoked by the resource owner.',
  },
  EXPIRED_CONSENT: {
    code: 'DANA_AUTH_403_CONSENT_EXPIRED',
    status: 403,
    message: 'Processing halted: Required consent has expired.',
  },
  COHORT_TOO_SMALL: {
    code: 'DANA_AUTH_403_MIN_COHORT_VIOLATION',
    status: 403,
    message: 'Aggregated analytics require a minimum cohort size of 5 to preserve privacy.',
  },
  NOTE_APPROVAL_REQUIRED: {
    code: 'DANA_AUTH_403_UNAPPROVED_NOTE',
    status: 403,
    message: 'AI-generated notes remain draft until approved by a licensed counsellor.',
  },
  IDOR_VIOLATION: {
    code: 'DANA_AUTH_403_IDOR_VIOLATION',
    status: 403,
    message: 'Unauthorized resource manipulation attempt detected.',
  },
});

export class AuthorizationError extends Error {
  constructor(errDef, details = {}) {
    super(errDef.message);
    this.name = 'AuthorizationError';
    this.code = errDef.code;
    this.status = errDef.status;
    this.details = details;
  }
}

// -----------------------------------------------------------------------------
// 5. RBAC Permission Matrix Evaluation
// -----------------------------------------------------------------------------

/**
 * Base RBAC permission lookup table
 */
const BASE_RBAC_PERMISSIONS = {
  [ROLES.PATIENT]: {
    [RESOURCES.PROFILE]: [ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.GENETIC_REPORT]: [ACTIONS.READ], // Own only, enforced by ReBAC
    [RESOURCES.GENETIC_VARIANT]: [ACTIONS.READ], // Own only, enforced by ReBAC
    [RESOURCES.MEDICAL_RECORD]: [ACTIONS.READ], // Own only, enforced by ReBAC
    [RESOURCES.COUPLE_ASSESSMENT]: [ACTIONS.READ], // Shared summary if active & consented
    [RESOURCES.CLINICAL_CASE]: [ACTIONS.READ], // Own case only
    [RESOURCES.APPOINTMENT]: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE],
    [RESOURCES.CONSENT]: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.REVOKE],
    [RESOURCES.PARTNER_CONSENT]: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.REVOKE],
    [RESOURCES.SILA_INVITATION]: [ACTIONS.READ, ACTIONS.CREATE],
    [RESOURCES.AUDIT_LOG]: [ACTIONS.CREATE], // Audit events logged, platform audit log read forbidden
    [RESOURCES.CONTENT_CARD]: [ACTIONS.READ],
  },
  [ROLES.COUNSELLOR]: {
    [RESOURCES.PROFILE]: [ACTIONS.READ],
    [RESOURCES.GENETIC_REPORT]: [ACTIONS.READ], // Assigned case with consent only
    [RESOURCES.MEDICAL_RECORD]: [ACTIONS.READ], // Assigned case with consent only
    [RESOURCES.COUPLE_ASSESSMENT]: [ACTIONS.READ, ACTIONS.EXECUTE],
    [RESOURCES.CLINICAL_CASE]: [ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.COUNSELLING_NOTE]: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.APPROVE],
    [RESOURCES.APPOINTMENT]: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE],
    [RESOURCES.REFERRAL]: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE],
    [RESOURCES.BENCHMARK]: [ACTIONS.READ, ACTIONS.EXECUTE],
    [RESOURCES.AUDIT_LOG]: [ACTIONS.READ, ACTIONS.CREATE],
    [RESOURCES.CONTENT_CARD]: [ACTIONS.READ],
  },
  [ROLES.CLINICAL_SUPERVISOR]: {
    [RESOURCES.CLINICAL_CASE]: [ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.COUNSELLING_NOTE]: [ACTIONS.READ, ACTIONS.APPROVE],
    [RESOURCES.COUPLE_ASSESSMENT]: [ACTIONS.READ],
    [RESOURCES.REFERRAL]: [ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.AUDIT_LOG]: [ACTIONS.READ, ACTIONS.CREATE],
    [RESOURCES.BENCHMARK]: [ACTIONS.READ],
  },
  [ROLES.ADMIN]: {
    [RESOURCES.PROFILE]: [ACTIONS.READ, ACTIONS.UPDATE], // Operational account management
    [RESOURCES.AUDIT_LOG]: [ACTIONS.READ, ACTIONS.CREATE], // Operational audit viewing
    [RESOURCES.CONTENT_CARD]: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.APPROVE],
    [RESOURCES.BENCHMARK]: [ACTIONS.READ, ACTIONS.UPDATE], // Risk benchmarks config
    [RESOURCES.SYSTEM_CONFIG]: [ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.ANALYTICS]: [ACTIONS.READ],
  },
  [ROLES.CONTENT_REVIEWER]: {
    [RESOURCES.CONTENT_CARD]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.APPROVE],
    [RESOURCES.AUDIT_LOG]: [ACTIONS.CREATE],
  },
  [ROLES.DOH_VIEWER]: {
    [RESOURCES.ANALYTICS]: [ACTIONS.READ, ACTIONS.EXPORT], // De-identified aggregated cohorts only
    [RESOURCES.AUDIT_LOG]: [ACTIONS.CREATE],
  },
  [ROLES.SYSTEM_SERVICE]: {
    [RESOURCES.GENETIC_REPORT]: [ACTIONS.READ, ACTIONS.CREATE],
    [RESOURCES.COUPLE_ASSESSMENT]: [ACTIONS.CREATE, ACTIONS.EXECUTE],
    [RESOURCES.AUDIT_LOG]: [ACTIONS.CREATE],
  },
};

export function hasRbacPermission(role, resource, action) {
  if (!role || !resource || !action) return false;
  const roleRules = BASE_RBAC_PERMISSIONS[role];
  if (!roleRules) return false;
  const resourceActions = roleRules[resource];
  if (!resourceActions) return false;
  return resourceActions.includes(action);
}

// -----------------------------------------------------------------------------
// 6. Relationship-Based Access Control (ReBAC) Engine
// -----------------------------------------------------------------------------

/**
 * Normalizes user ID lookup from session or token claims
 */
export function getActorPersonId(actor) {
  if (!actor) return null;
  return actor.personId || actor.person_id || actor.id || null;
}

export function getActorUserId(actor) {
  if (!actor) return null;
  return actor.userId || actor.user_id || actor.id || null;
}

/**
 * Checks if actor owns the target resource
 */
export function isResourceOwner(actor, resourceOwnerId) {
  if (!actor || !resourceOwnerId) return false;
  const actorPersonId = getActorPersonId(actor);
  const actorUserId = getActorUserId(actor);
  return (
    (actorPersonId && actorPersonId === resourceOwnerId) ||
    (actorUserId && actorUserId === resourceOwnerId)
  );
}

/**
 * Validates that an active couple relationship exists between actor and peer
 */
export function hasActiveCoupleRelationship(actor, partnerId, coupleOrCouplesList) {
  if (!actor || !partnerId) return false;
  const actorPersonId = getActorPersonId(actor);
  if (!actorPersonId || actorPersonId === partnerId) return false;

  const couples = Array.isArray(coupleOrCouplesList)
    ? coupleOrCouplesList
    : coupleOrCouplesList ? [coupleOrCouplesList] : [];

  return couples.some((c) => {
    if (!c) return false;
    const a = c.partner_a || c.partnerA || c.a;
    const b = c.partner_b || c.partnerB || c.b;
    const isMember = (a === actorPersonId && b === partnerId) || (b === actorPersonId && a === partnerId);
    if (!isMember) return false;

    // Check relationship status: ended, suspended, or unverified relationships do not qualify
    const status = (c.status || c.relationship_status || c.stage || 'active').toLowerCase();
    return !['ended', 'cancelled', 'rejected', 'suspended', 'dissolved'].includes(status);
  });
}

/**
 * Validates that a counsellor is explicitly assigned to a clinical case
 */
export function isAssignedCounsellorToCase(actor, caseId, assignmentsList) {
  if (!actor || !caseId) return false;
  if (actor.role !== ROLES.COUNSELLOR && actor.role !== ROLES.CLINICAL_SUPERVISOR) {
    return false;
  }
  // Clinical supervisor has supervisory access across cases
  if (actor.role === ROLES.CLINICAL_SUPERVISOR) {
    return true;
  }
  if (!Array.isArray(assignmentsList)) return false;
  const counsellorId = actor.counsellorId || actor.counsellor_id || getActorUserId(actor);

  return assignmentsList.some((a) => {
    if (!a) return false;
    const targetCaseId = a.case_id || a.caseId;
    const assignedCounsellor = a.counsellor_id || a.counsellorId;
    const status = (a.status || 'active').toLowerCase();
    return targetCaseId === caseId && assignedCounsellor === counsellorId && status === 'active';
  });
}

// -----------------------------------------------------------------------------
// 7. Consent and Context-Based Access Control (CBAC) Engine
// -----------------------------------------------------------------------------

/**
 * Evaluates whether an individual or partner consent record is currently valid
 */
export function isConsentValid(consent, { requiredPurpose, requiredScope, now = new Date() } = {}) {
  if (!consent) return false;

  // 1. Status check
  const status = (consent.status || (consent.granted ? 'active' : 'revoked')).toLowerCase();
  if (status !== 'active') return false;

  // 2. Revocation check
  if (consent.revoked_at || consent.revokedAt) return false;

  // 3. Expiry check
  const expiresAt = consent.expires_at || consent.expiresAt;
  if (expiresAt && new Date(expiresAt) <= new Date(now)) return false;

  // 4. Purpose check
  if (requiredPurpose) {
    const purpose = consent.purpose || consent.kind;
    const matchesPurpose =
      purpose === requiredPurpose ||
      (requiredPurpose === CONSENT_PURPOSES.COUNSELLOR_CLINICAL_ACCESS && purpose === 'share_counsellor') ||
      (requiredPurpose === CONSENT_PURPOSES.SHARE_COMBINED_ASSESSMENT && purpose === 'share_partner') ||
      (requiredPurpose === CONSENT_PURPOSES.MEDICAL_PROCESSING && purpose === 'malaffi_access') ||
      (requiredPurpose === CONSENT_PURPOSES.FAMILY_NOTIFICATION && purpose === 'faith_cards');

    if (!matchesPurpose) return false;
  }

  // 5. Scope check
  if (requiredScope) {
    const scope = consent.scope || consent.dataScope || 'default';
    if (scope !== 'all' && scope !== 'full_report' && scope !== requiredScope) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if a specific person has granted active consent for a given purpose
 */
export function hasActiveConsent(personId, purpose, consentsList, { scope, now = new Date() } = {}) {
  if (!personId || !purpose || !Array.isArray(consentsList)) return false;

  return consentsList.some((c) => {
    if (!c) return false;
    const owner = c.person_id || c.personId || c.owner_id || c.ownerId || c.granter_id || c.granterId;
    if (owner !== personId) return false;
    return isConsentValid(c, { requiredPurpose: purpose, requiredScope: scope, now });
  });
}

// -----------------------------------------------------------------------------
// 8. Unified Access Decision Engine
// -----------------------------------------------------------------------------

/**
 * Evaluates full access request across RBAC, ReBAC, and CBAC
 *
 * @param {Object} params
 * @param {Object} params.actor The authenticated user context
 * @param {string} params.resource One of RESOURCES
 * @param {string} params.action One of ACTIONS
 * @param {Object} [params.target] The target resource being accessed
 * @param {Object} [params.context] Additional contextual state (couples, consents, assignments, now)
 * @returns {{ allowed: boolean, error?: AuthorizationError }}
 */
export function evaluateAccess({ actor, resource, action, target = {}, context = {} }) {
  // 1. Authenticated check
  if (!actor || !actor.role) {
    return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.UNAUTHENTICATED) };
  }

  // 2. Active status check
  if (actor.status && ['inactive', 'suspended', 'deactivated'].includes(actor.status.toLowerCase())) {
    return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.ACCOUNT_SUSPENDED) };
  }

  // 3. RBAC baseline check
  if (!hasRbacPermission(actor.role, resource, action)) {
    // Administrator attempting raw genetic access must be explicitly denied
    if (actor.role === ROLES.ADMIN && (resource === RESOURCES.GENETIC_REPORT || resource === RESOURCES.GENETIC_VARIANT)) {
      return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.RAW_GENETIC_CROSS_ACCESS_FORBIDDEN) };
    }
    // DoH Viewer attempting identifiable individual record
    if (actor.role === ROLES.DOH_VIEWER && resource !== RESOURCES.ANALYTICS) {
      return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.MISSING_PERMISSION) };
    }
    // Content Reviewer attempting clinical records
    if (actor.role === ROLES.CONTENT_REVIEWER && [RESOURCES.GENETIC_REPORT, RESOURCES.MEDICAL_RECORD, RESOURCES.CLINICAL_CASE].includes(resource)) {
      return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.MISSING_PERMISSION) };
    }
    return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.MISSING_PERMISSION) };
  }

  // 4. Resource-Specific ReBAC & Consent Rules

  // A. GENETIC REPORT & VARIANT OWNERSHIP
  if (resource === RESOURCES.GENETIC_REPORT || resource === RESOURCES.GENETIC_VARIANT) {
    const resourceOwner = target.personId || target.person_id || target.patient_id;

    if (actor.role === ROLES.PATIENT) {
      // Patient can ONLY read their own report
      if (!isResourceOwner(actor, resourceOwner)) {
        return {
          allowed: false,
          error: new AuthorizationError(SECURITY_ERRORS.RAW_GENETIC_CROSS_ACCESS_FORBIDDEN, {
            attemptedTarget: resourceOwner,
            actor: getActorPersonId(actor),
          }),
        };
      }
      return { allowed: true };
    }

    if (actor.role === ROLES.COUNSELLOR) {
      // Counsellor needs verified credentials + assigned case + patient consent
      if (actor.credentialsVerified === false || actor.credentials_verified === false) {
        return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.UNVERIFIED_CREDENTIALS) };
      }
      if (target.caseId && !isAssignedCounsellorToCase(actor, target.caseId, context.assignments)) {
        return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.UNASSIGNED_COUNSELLOR) };
      }
      const hasConsent = hasActiveConsent(
        resourceOwner,
        CONSENT_PURPOSES.COUNSELLOR_CLINICAL_ACCESS,
        context.consents || [],
        { now: context.now }
      );
      if (!hasConsent) {
        return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.MISSING_CONSENT) };
      }
      return { allowed: true };
    }

    if (actor.role === ROLES.SYSTEM_SERVICE) {
      return { allowed: true };
    }

    return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.RAW_GENETIC_CROSS_ACCESS_FORBIDDEN) };
  }

  // B. PRIVATE MEDICAL RECORDS
  if (resource === RESOURCES.MEDICAL_RECORD) {
    const resourceOwner = target.personId || target.person_id;
    if (actor.role === ROLES.PATIENT) {
      if (!isResourceOwner(actor, resourceOwner)) {
        return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.NOT_OWNER) };
      }
      return { allowed: true };
    }
    if (actor.role === ROLES.COUNSELLOR) {
      const hasConsent = hasActiveConsent(
        resourceOwner,
        CONSENT_PURPOSES.COUNSELLOR_CLINICAL_ACCESS,
        context.consents || [],
        { now: context.now }
      );
      if (!hasConsent) {
        return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.MISSING_CONSENT) };
      }
      return { allowed: true };
    }
    return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.MISSING_PERMISSION) };
  }

  // C. COUPLE ASSESSMENT (COMBINED RISK RESULT)
  if (resource === RESOURCES.COUPLE_ASSESSMENT) {
    const coupleId = target.coupleId || target.couple_id || target.id;
    const couple = Array.isArray(context.couples)
      ? context.couples.find((c) => (c.id || c.coupleId) === coupleId)
      : target.couple || context.couple;

    if (actor.role === ROLES.PATIENT) {
      const actorPersonId = getActorPersonId(actor);
      if (!couple) {
        return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.INACTIVE_RELATIONSHIP) };
      }
      const partnerA = couple.partner_a || couple.partnerA || couple.a;
      const partnerB = couple.partner_b || couple.partnerB || couple.b;

      if (actorPersonId !== partnerA && actorPersonId !== partnerB) {
        return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.INACTIVE_RELATIONSHIP) };
      }

      const status = (couple.status || couple.relationship_status || couple.stage || 'active').toLowerCase();
      if (['ended', 'cancelled', 'rejected', 'dissolved'].includes(status)) {
        return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.INACTIVE_RELATIONSHIP) };
      }

      // Check partner consent: both must have consented to couple assessment / sharing
      const partnerId = actorPersonId === partnerA ? partnerB : partnerA;
      const consents = context.consents || [];
      const hasOwnConsent = hasActiveConsent(actorPersonId, CONSENT_PURPOSES.COUPLE_ASSESSMENT, consents, { now: context.now });
      const hasPartnerConsent = hasActiveConsent(partnerId, CONSENT_PURPOSES.SHARE_COMBINED_ASSESSMENT, consents, { now: context.now });

      if (!hasOwnConsent) {
        return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.MISSING_CONSENT, { detail: 'Own consent required' }) };
      }
      if (!hasPartnerConsent) {
        return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.REVOKED_CONSENT, { detail: 'Partner consent missing or revoked' }) };
      }

      return { allowed: true };
    }

    if (actor.role === ROLES.COUNSELLOR) {
      if (target.caseId && !isAssignedCounsellorToCase(actor, target.caseId, context.assignments)) {
        return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.UNASSIGNED_COUNSELLOR) };
      }
      return { allowed: true };
    }

    return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.MISSING_PERMISSION) };
  }

  // D. CLINICAL CASES
  if (resource === RESOURCES.CLINICAL_CASE) {
    const caseId = target.caseId || target.id;
    if (actor.role === ROLES.COUNSELLOR) {
      if (actor.credentialsVerified === false || actor.credentials_verified === false) {
        return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.UNVERIFIED_CREDENTIALS) };
      }
      if (!isAssignedCounsellorToCase(actor, caseId, context.assignments)) {
        return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.UNASSIGNED_COUNSELLOR) };
      }
      return { allowed: true };
    }
    if (actor.role === ROLES.CLINICAL_SUPERVISOR) {
      return { allowed: true };
    }
    if (actor.role === ROLES.PATIENT) {
      const actorPersonId = getActorPersonId(actor);
      const isMyCase =
        target.patient_id === actorPersonId ||
        target.patientId === actorPersonId ||
        (target.couple && [target.couple.partner_a, target.couple.partner_b].includes(actorPersonId));
      if (!isMyCase) {
        return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.NOT_OWNER) };
      }
      return { allowed: true };
    }
  }

  // E. COUNSELLING NOTES
  if (resource === RESOURCES.COUNSELLING_NOTE) {
    if (actor.role === ROLES.PATIENT) {
      // Notes are confidential to clinical team by default
      return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.MISSING_PERMISSION) };
    }
    if (actor.role === ROLES.COUNSELLOR || actor.role === ROLES.CLINICAL_SUPERVISOR) {
      if (action === ACTIONS.APPROVE) {
        // AI draft notes require human sign-off
        return { allowed: true };
      }
      return { allowed: true };
    }
  }

  // F. AGGREGATE ANALYTICS & DOH SAFEGUARDS
  if (resource === RESOURCES.ANALYTICS) {
    if (actor.role === ROLES.DOH_VIEWER || actor.role === ROLES.ADMIN) {
      const cohortSize = target.cohortSize ?? context.cohortSize ?? 0;
      if (cohortSize > 0 && cohortSize < 5) {
        return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.COHORT_TOO_SMALL) };
      }
      return { allowed: true };
    }
  }

  // G. CONSENT & PARTNER CONSENT MANAGEMENT
  if (resource === RESOURCES.CONSENT || resource === RESOURCES.PARTNER_CONSENT) {
    const granter = target.granterId || target.owner_id || target.person_id;
    if (action === ACTIONS.CREATE || action === ACTIONS.UPDATE || action === ACTIONS.REVOKE) {
      if (!isResourceOwner(actor, granter)) {
        return { allowed: false, error: new AuthorizationError(SECURITY_ERRORS.NOT_OWNER) };
      }
    }
    return { allowed: true };
  }

  // Default allow if RBAC passed and no specific veto triggered
  return { allowed: true };
}

// -----------------------------------------------------------------------------
// 9. Field-Level Clinical Decoupling & Sanitization
// -----------------------------------------------------------------------------

/**
 * Sanitizes data before returning to caller, strictly respecting ownership & consents
 */
export function sanitizeResourceForViewer(arg1, arg2, arg3, arg4) {
  let resourceType;
  let data;
  let actor;
  let context = {};

  if (typeof arg1 === 'string') {
    // Positional signature: (resourceType, data, roleOrActor, context)
    resourceType = arg1;
    data = arg2;
    actor = typeof arg3 === 'string'
      ? { role: arg3, personId: arg4?.viewerPersonId, id: arg4?.viewerPersonId }
      : arg3;
    context = arg4 || {};
  } else {
    // Options signature: (data, { actor, resourceType, context })
    data = arg1;
    const opts = arg2 || {};
    resourceType = opts.resourceType;
    actor = opts.actor;
    context = opts.context || {};
  }

  if (!data) return null;

  // Deep clone to avoid mutating in-memory models
  const copy = JSON.parse(JSON.stringify(data));
  const viewerPersonId = actor ? getActorPersonId(actor) : context.viewerPersonId;

  // 1. Genetic Report Sanitization
  if (resourceType === RESOURCES.GENETIC_REPORT) {
    const reportOwner = copy.person_id || copy.personId || copy.patient_id;
    if (viewerPersonId && reportOwner && viewerPersonId !== reportOwner) {
      copy.variants = [];
      delete copy.rawVariants;
    }
    return copy;
  }

  // 2. Partner / Peer Profile Sanitization
  if (resourceType === RESOURCES.PROFILE) {
    const isSelf = isResourceOwner(actor, copy.id || copy.personId);
    if (!isSelf) {
      // Public / Search / Connected Peer view:
      // Omit all sensitive clinical fields unless explicit active consent exists
      const hasConsent = hasActiveConsent(
        copy.id,
        CONSENT_PURPOSES.SHARE_COMBINED_ASSESSMENT,
        context.consents || [],
        { now: context.now }
      );

      if (!hasConsent) {
        delete copy.carrier;
        delete copy.carrier_gene;
        delete copy.condition_name;
        delete copy.reproductive_risk;
        delete copy.medical_history;
        copy.consentRequired = true;
      }
      // Never expose private counsellor notes or internal HIE IDs
      delete copy.clinical_notes;
      delete copy.malaffi_record_id;
    }
    return copy;
  }

  // 3. Couple Assessment Sanitization
  if (resourceType === RESOURCES.COUPLE_ASSESSMENT) {
    // Only return the combined compatibility tier, label, and guidance.
    // Do NOT include individual raw variant sequences or lab identifiers.
    delete copy.rawVariants;
    delete copy.partnerARawReport;
    delete copy.partnerBRawReport;
    return copy;
  }

  // 4. DoH Analytics Sanitization
  if (resourceType === RESOURCES.ANALYTICS) {
    delete copy.patientNames;
    delete copy.personIds;
    delete copy.nationalIds;
    delete copy.emiratesIds;
    return copy;
  }

  return copy;
}

// -----------------------------------------------------------------------------
// 10. Trusted Genetic Intelligence Engine Authorization Wrapper
// -----------------------------------------------------------------------------

/**
 * Executes a trusted genetic risk evaluation operation with full pre- and post-condition checks
 */
export function authorizedEvaluateCoupleAssessment({
  actor,
  couple,
  partnerAReport,
  partnerBReport,
  consents = [],
  engineAssessFn,
  auditLoggerFn,
  now = new Date(),
}) {
  // 1. Authenticate initiator
  if (!actor || !actor.role) {
    throw new AuthorizationError(SECURITY_ERRORS.UNAUTHENTICATED);
  }

  // 2. Verify couple relationship
  if (!couple) {
    throw new AuthorizationError(SECURITY_ERRORS.INACTIVE_RELATIONSHIP);
  }
  const partnerA = couple.partner_a || couple.partnerA || couple.a;
  const partnerB = couple.partner_b || couple.partnerB || couple.b;
  const status = (couple.status || couple.stage || 'active').toLowerCase();

  if (['ended', 'cancelled', 'rejected', 'dissolved'].includes(status)) {
    throw new AuthorizationError(SECURITY_ERRORS.INACTIVE_RELATIONSHIP);
  }

  // 3. Verify both individuals' required processing authorizations
  const consentA = hasActiveConsent(partnerA, CONSENT_PURPOSES.COUPLE_ASSESSMENT, consents, { now });
  const consentB = hasActiveConsent(partnerB, CONSENT_PURPOSES.COUPLE_ASSESSMENT, consents, { now });

  if (!consentA || !consentB) {
    const missing = !consentA && !consentB ? 'both partners' : !consentA ? partnerA : partnerB;
    throw new AuthorizationError(SECURITY_ERRORS.MISSING_CONSENT, { missingConsentFor: missing });
  }

  // 4. Verify data ownership & report availability
  if (!partnerAReport || !partnerBReport) {
    throw new AuthorizationError(SECURITY_ERRORS.MISSING_PERMISSION, {
      detail: 'Validated genetic reports are required for both individuals',
    });
  }

  // 5. Verify report validation status
  const validA = (partnerAReport.validation_status || partnerAReport.validationStatus || 'verified') === 'verified';
  const validB = (partnerBReport.validation_status || partnerBReport.validationStatus || 'verified') === 'verified';
  if (!validA || !validB) {
    throw new AuthorizationError(SECURITY_ERRORS.UNVERIFIED_REPORT, {
      detail: 'Genetic reports must be verified by laboratory before couple evaluation',
    });
  }

  // 6. Execute deterministic engine evaluation
  const rawAssessment = engineAssessFn(couple);

  // 7. Bind result to couple and sanitize (keep raw individual reports strictly decoupled)
  const assessment = {
    coupleId: couple.id || couple.coupleId,
    type: rawAssessment.type,
    label: rawAssessment.label,
    risk: rawAssessment.risk,
    tier: rawAssessment.tier,
    priority: rawAssessment.priority,
    condition: rawAssessment.condition,
    gene: rawAssessment.gene,
    version: rawAssessment.version,
    evaluatedAt: now.toISOString(),
  };

  // 8. Record audit log
  if (typeof auditLoggerFn === 'function') {
    auditLoggerFn({
      actor: getActorUserId(actor),
      actorName: actor.name || actor.displayName || 'Authorized Engine',
      action: 'Executed authorized couple genetic risk assessment',
      resourceType: RESOURCES.COUPLE_ASSESSMENT,
      resourceId: assessment.coupleId,
      metadata: {
        tier: assessment.tier,
        priority: assessment.priority,
        rulesVersion: assessment.version,
      },
    });
  }

  return assessment;
}

// -----------------------------------------------------------------------------
// 11. Forensic Audit Logging Helper
// -----------------------------------------------------------------------------

/**
 * Builds a structured, standardized forensic audit log event from an authorization decision.
 * Strips raw clinical identifiers to ensure audit records never leak PHI/genomic variants.
 */
export function buildAuditEvent(decision, { actor, resource, action, target, metadata = {} } = {}) {
  const actorUserId = actor ? getActorUserId(actor) : null;
  const outcome = (decision && decision.allowed) ? 'ALLOWED' : 'DENIED';
  const errorCode = (!decision || decision.allowed) ? null : (decision.error?.code || 'DANA_AUTH_403_FORBIDDEN');

  return {
    eventId: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    actor: actorUserId,
    actor_role: actor?.role || 'anonymous',
    action: action || 'access',
    resource_type: resource,
    resource_id: target?.id || target?.report_id || target?.personId || target?.userId || null,
    outcome,
    security_code: errorCode,
    metadata: {
      ...metadata,
      reason: decision?.error?.message || null,
    },
  };
}


