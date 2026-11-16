/**
 * DaNA Couple-to-Counsellor Recommendation & Matching Engine
 *
 * Implements the 8-stage clinical matching pipeline:
 * Combined Results -> Priority Engine -> Counsellor Matcher -> Online/Offline Matrix ->
 * User Slot Selection -> Appointment Service -> Counsellor Acceptance -> Continuous Care Plan.
 *
 * Mathematically scores counsellors across:
 *   - Genetic specialty alignment (HBB, SMN1, GJB2, CFTR, etc.)
 *   - Language preference (Arabic, English, Urdu)
 *   - Geographical proximity via Haversine formula (locations table)
 *   - Urgency & Tier triage SLA (Tier 1 emergency buffer access < 48h)
 *   - Active clinical caseload balance
 */

import { DEMO_LOCATIONS } from './locationService.js';
import { COUNSELLORS, DEMO_REPORTS, PEOPLE, COUPLES } from './data.js';

// UAE reference location coordinates for Haversine calculations
export const UAE_COORDINATES = {
  // Abu Dhabi Emirate
  100: { id: 100, city: 'Abu Dhabi', emirate: 'Abu Dhabi', lat: 24.4539, lon: 54.3773 },
  101: { id: 101, city: 'Al Ain', emirate: 'Abu Dhabi', lat: 24.2075, lon: 55.7447 },
  107: { id: 107, city: 'Al Dhafra', emirate: 'Abu Dhabi', lat: 23.6542, lon: 53.7052 },
  // Dubai Emirate
  1: { id: 1, city: 'Downtown Dubai', emirate: 'Dubai', lat: 25.1972, lon: 55.2744 },
  2: { id: 2, city: 'Dubai Marina', emirate: 'Dubai', lat: 25.0805, lon: 55.1403 },
  3: { id: 3, city: 'Jumeirah', emirate: 'Dubai', lat: 25.2048, lon: 55.2708 },
  // Other Emirates
  102: { id: 102, city: 'Sharjah', emirate: 'Sharjah', lat: 25.3463, lon: 55.4209 },
  103: { id: 103, city: 'Ajman', emirate: 'Ajman', lat: 25.4052, lon: 55.5136 },
  104: { id: 104, city: 'Ras Al Khaimah', emirate: 'Ras Al Khaimah', lat: 25.7895, lon: 55.9432 },
  105: { id: 105, city: 'Fujairah', emirate: 'Fujairah', lat: 25.1288, lon: 56.3265 },
  106: { id: 106, city: 'Umm Al Quwain', emirate: 'Umm Al Quwain', lat: 25.5647, lon: 55.5552 },
};

/**
 * Great-circle distance between two coordinates in kilometers (Haversine formula).
 * Identical formula to SQL `loc_distance_km` in 030_location_scope.sql and places.py.
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const R = 6371; // Earth radius in km
  return Math.round(R * c * 10) / 10;
}

/**
 * Condition-to-Specialty Taxonomy Mapping
 */
export const GENE_SPECIALTY_MAP = {
  HBB: {
    specialties: ['haemoglobinopathies', 'carrier_screening', 'haematology'],
    label: 'Haemoglobinopathies Specialist (Thalassemia & Sickle Cell)',
    tier: 1,
  },
  SMN1: {
    specialties: ['neurogenetics', 'paediatric_genetics', 'spinal_muscular_atrophy'],
    label: 'Neurogenetics & SMA Specialist',
    tier: 1,
  },
  GJB2: {
    specialties: ['hearing_loss', 'sensory_genetics', 'paediatric_genetics'],
    label: 'Sensory Genetics & Hereditary Hearing Loss Specialist',
    tier: 1,
  },
  CFTR: {
    specialties: ['pulmonology', 'cystic_fibrosis', 'carrier_screening'],
    label: 'Pulmonology & Cystic Fibrosis Specialist',
    tier: 1,
  },
  G6PD: {
    specialties: ['x_linked', 'haematology', 'carrier_screening'],
    label: 'X-Linked Haematology Specialist',
    tier: 2,
  },
  DEFAULT: {
    specialties: ['premarital', 'carrier_screening'],
    label: 'Premarital Genetic Screening Specialist',
    tier: 3,
  },
};

/**
 * Extract couple's primary carrier condition from reports / people data
 */
export function getCouplePrimaryGene(coupleId) {
  const couple = COUPLES.find((c) => c.id === coupleId);
  if (!couple) return 'DEFAULT';

  const repA = DEMO_REPORTS[couple.a];
  const repB = DEMO_REPORTS[couple.b];
  const geneA = repA?.variants?.[0]?.gene;
  const geneB = repB?.variants?.[0]?.gene;

  // Bilateral match (both carriers of same gene)
  if (geneA && geneB && geneA === geneB) return geneA;
  // If either has a pathogenic carrier
  return geneA || geneB || 'DEFAULT';
}

/**
 * Compute Genetic Specialty Alignment Score (0.0 - 1.0)
 */
export function scoreSpecialty(counsellorSpecialties = [], targetGene = 'DEFAULT') {
  const isDefault = targetGene === 'DEFAULT' || !targetGene;
  const target = GENE_SPECIALTY_MAP[targetGene];
  const cList = (counsellorSpecialties || []).map((s) => s.toLowerCase());

  if (target) {
    const hasPrimary = cList.some((s) => target.specialties.includes(s));
    if (hasPrimary) return 1.0;
  }

  // If general premarital or carrier screening
  if (cList.includes('premarital') || cList.includes('carrier_screening')) {
    return isDefault ? 1.0 : 0.70;
  }

  return 0.35;
}

/**
 * Compute Language Alignment Score (0.0 - 1.0)
 */
export function scoreLanguage(counsellorLanguages = [], preferredLang = 'ar') {
  const cLangs = (counsellorLanguages || []).map((l) => l.toLowerCase());
  const pref = (preferredLang || 'ar').toLowerCase();

  // Full native match (e.g. Arabic preferred, counsellor speaks Arabic)
  const exactMatch = cLangs.includes(pref) || (pref === 'arabic' && cLangs.includes('ar')) || (pref === 'english' && cLangs.includes('en'));
  const isBilingual = (cLangs.includes('ar') || cLangs.includes('arabic')) && (cLangs.includes('en') || cLangs.includes('english'));

  if (exactMatch && isBilingual) return 1.0;
  if (exactMatch) return 0.95;
  if (isBilingual) return 0.90;
  return 0.40;
}

/**
 * Compute Proximity Score (0.0 - 1.0) for in-person visits
 */
export function scoreDistance(distanceKm, sameEmirate = true, modality = 'online') {
  if (modality === 'online') {
    // Online telehealth operates anywhere across UAE
    return sameEmirate ? 1.0 : 0.95;
  }

  // In-person clinic: strictly prohibited across emirates per DoH jurisdiction policy
  if (!sameEmirate) return 0.0;
  if (distanceKm == null) return 0.50;

  if (distanceKm <= 10) return 1.0; // Same neighborhood / walk-in proximity
  if (distanceKm <= 25) return 0.85; // Same metropolitan area
  if (distanceKm <= 50) return 0.70; // Regional commute
  if (distanceKm <= 80) return 0.50; // Outer emirate perimeter
  return 0.25;
}

/**
 * Compute Slot Availability & Triage Urgency Score (0.0 - 1.0)
 */
export function scoreAvailability(slots = [], triageTier = 1, refDate = null) {
  if (!slots || slots.length === 0) return 0.10;

  // Use simulation reference date Nov 8, 2026 or provided refDate
  const now = refDate ? new Date(refDate) : new Date('2026-11-08T08:00:00+04:00');
  const twoDaysMs = 48 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const has48hSlot = slots.some((s) => {
    const slotDate = new Date(s.iso || s.slot_start || s.date);
    const diff = slotDate - now;
    return diff > 0 && diff <= twoDaysMs;
  });

  const has7dSlot = slots.some((s) => {
    const slotDate = new Date(s.iso || s.slot_start || s.date);
    const diff = slotDate - now;
    return diff > 0 && diff <= sevenDaysMs;
  });

  if (triageTier === 1) {
    if (has48hSlot) return 1.0;
    if (has7dSlot) return 0.75;
    return 0.50;
  }

  // Tier 2 or 3
  if (has7dSlot) return 1.0;
  return 0.80;
}

/**
 * Compute Caseload Balance Score (0.0 - 1.0)
 */
export function scoreCaseload(active = 0, max = 25) {
  if (!max || max <= 0) return 0.50;
  const remainingRatio = (max - active) / max;
  return Math.max(0.1, Math.min(1.0, remainingRatio));
}

/**
 * Compute Full Recommendation Match for a single counsellor
 */
export function calculateMatchScore({
  counsellor,
  modality = 'online',
  targetGene = 'DEFAULT',
  preferredLang = 'ar',
  coupleLocationId = 100, // Default to Abu Dhabi
  triageTier = 1,
}) {
  const coupleCoord = UAE_COORDINATES[coupleLocationId] || UAE_COORDINATES[100];
  const counsellorLocationId = counsellor.location_id || 100;
  const counsellorCoord = UAE_COORDINATES[counsellorLocationId] || UAE_COORDINATES[100];

  const sameEmirate = coupleCoord.emirate === counsellorCoord.emirate;
  const distanceKm = haversineDistanceKm(
    coupleCoord.lat,
    coupleCoord.lon,
    counsellorCoord.lat,
    counsellorCoord.lon
  );

  // If in-person requested but counsellor does not offer in-person or is in different emirate
  if (modality === 'offline' || modality === 'in_person') {
    if (counsellor.offers_in_person === false || !sameEmirate) {
      return {
        score: 0,
        matchPercentage: 0,
        distanceKm,
        sameEmirate,
        eligible: false,
        reasons: ['In-person consultation unavailable across different emirates'],
        badges: [],
      };
    }
  }

  // Sub-scores
  const sSpec = scoreSpecialty(counsellor.specialties, targetGene);
  const sLang = scoreLanguage(counsellor.languages, preferredLang);
  const sDist = scoreDistance(distanceKm, sameEmirate, modality);
  const sAvail = scoreAvailability(counsellor.slots, triageTier);
  const sLoad = scoreCaseload(counsellor.active_caseload, counsellor.max_caseload);

  let rawScore = 0;
  if (modality === 'offline' || modality === 'in_person') {
    // In-Person Clinic: Distance (35%), Specialty (30%), Language (20%), Availability (15%)
    rawScore = 0.35 * sDist + 0.30 * sSpec + 0.20 * sLang + 0.15 * sAvail;
  } else {
    // Online Telehealth: Specialty (40%), Language (35%), Availability (15%), Caseload (10%)
    rawScore = 0.40 * sSpec + 0.35 * sLang + 0.15 * sAvail + 0.10 * sLoad;
  }

  const matchPercentage = Math.min(99, Math.max(45, Math.round(rawScore * 100)));

  // Badges & transparent justification labels
  const badges = [];
  const geneInfo = GENE_SPECIALTY_MAP[targetGene] || GENE_SPECIALTY_MAP.DEFAULT;

  if (sSpec >= 0.9) {
    badges.push({ tone: 'blue', label: geneInfo.label.split('(')[0].trim() });
  }
  if (sLang >= 0.9) {
    badges.push({ tone: 'green', label: 'Bilingual (Arabic / English)' });
  }
  if (modality === 'offline' || modality === 'in_person') {
    if (distanceKm != null) {
      badges.push({ tone: 'purple', label: `${distanceKm} km away` });
    }
  }
  if (triageTier === 1) {
    badges.push({ tone: 'amber', label: 'Tier 1 Priority Buffer' });
  }

  return {
    score: Math.round(rawScore * 1000) / 1000,
    matchPercentage,
    distanceKm,
    sameEmirate,
    eligible: true,
    badges,
    reasons: [
      sSpec >= 0.9 ? `Expert in ${targetGene} carrier counseling` : 'Premarital certified practitioner',
      sLang >= 0.9 ? 'Fluent in couple preferred language' : 'English consultation available',
      distanceKm != null ? `${distanceKm} km to clinic` : 'Telehealth enabled',
    ],
  };
}

/**
 * Rank and Recommend Counsellors for a Couple
 */
export function getRecommendedCounsellors({
  coupleId = 'c1',
  modality = 'online',
  preferredLang = 'ar',
  userLocationId = 100,
  counsellorPool = null,
}) {
  const targetGene = getCouplePrimaryGene(coupleId);
  const couple = COUPLES.find((c) => c.id === coupleId);
  const isPregnant = couple?.pregnantWeeks != null;
  const triageTier = isPregnant || targetGene !== 'DEFAULT' ? 1 : 2;

  const pool = counsellorPool || COUNSELLORS;

  const ranked = pool
    .map((c) => {
      const match = calculateMatchScore({
        counsellor: c,
        modality,
        targetGene,
        preferredLang,
        coupleLocationId: userLocationId,
        triageTier,
      });
      return {
        ...c,
        match,
      };
    })
    .filter((c) => c.match.eligible)
    .sort((a, b) => b.match.score - a.match.score);

  if (ranked.length > 0) {
    ranked[0].isTopMatch = true;
  }

  return {
    targetGene,
    triageTier,
    modality,
    counsellors: ranked,
    topMatch: ranked[0] || null,
  };
}
