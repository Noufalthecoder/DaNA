/**
 * Screening Persistence Service
 * Enforces one-time screening for Khalid and female partner (Fatima).
 * Screening only resets when "Reset demo data" is explicitly clicked.
 */
import { getSyntheticIntake } from './data.js';

export const SCREENED_KEY = 'dana.screened_profiles_v1';
export const INTAKES_CACHE_KEY = 'dana.intakes_cache_v1';

export const DEFAULT_SCREENING_INTAKES = {
  khalid: {
    ...getSyntheticIntake('khalid'),
    completed: true,
    mode: 'uae_pass',
    submittedAt: '2026-10-12T09:00:00Z',
    personal: {
      ...getSyntheticIntake('khalid').personal,
      partnerName: 'Fatima Al Hammadi',
      maritalStatus: 'Married',
      pregnancyStatus: 'no',
    },
    compliance: {
      ...getSyntheticIntake('khalid').compliance,
      isPregnant: 'no',
      gestationalWeeks: '',
    },
    consent: {
      malaffiSync: true,
      partnerShare: true,
      counsellorAccess: true,
      anonymizedResearch: false,
    },
  },
  fatima: {
    ...getSyntheticIntake('fatima'),
    completed: true,
    mode: 'uae_pass',
    submittedAt: '2026-10-12T09:00:00Z',
    personal: {
      ...getSyntheticIntake('fatima').personal,
      partnerName: 'Khalid Al Mansoori',
      maritalStatus: 'Married',
      pregnancyStatus: 'no',
    },
    compliance: {
      ...getSyntheticIntake('fatima').compliance,
      isPregnant: 'no',
      gestationalWeeks: '',
    },
    consent: {
      malaffiSync: true,
      partnerShare: true,
      counsellorAccess: true,
      anonymizedResearch: false,
    },
  },
};

export const DEFAULT_REPORTS = {
  khalid: {
    id: 'MALAFFI-DEMO-KHALID',
    lab: 'Abu Dhabi Genomics Lab (simulated)',
    accreditation: 'CAP-0000000',
    date: '2026-10-12',
    verified: true,
    scenario: 'Beta-thalassaemia carrier (IVS1-5)',
    variants: [
      { gene: 'HBB', transcript: 'NM_000518.5', hgvs_c: 'c.92+5G>C', hgvs_p: null, significance: 'pathogenic', zygosity: 'heterozygous' },
    ],
  },
  fatima: {
    id: 'MALAFFI-DEMO-FATIMA',
    lab: 'Abu Dhabi Genomics Lab (simulated)',
    accreditation: 'CAP-0000000',
    date: '2026-10-12',
    verified: true,
    scenario: 'Beta-thalassaemia carrier (IVS1-5)',
    variants: [
      { gene: 'HBB', transcript: 'NM_000518.5', hgvs_c: 'c.92+5G>C', hgvs_p: null, significance: 'pathogenic', zygosity: 'heterozygous' },
    ],
  },
};

export function getScreenedMap() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(SCREENED_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  // Default demo state: Khalid and Fatima have completed screening once
  return { khalid: true, fatima: true };
}

export function isUserScreened(userId) {
  if (!userId) return false;
  const map = getScreenedMap();
  return !!map[userId];
}

export function setUserScreened(userId, screened = true, intakeData = null) {
  if (!userId) return;
  try {
    if (typeof localStorage !== 'undefined') {
      const map = getScreenedMap();
      map[userId] = screened;
      if (screened && map.reset) {
        delete map.reset;
      }
      localStorage.setItem(SCREENED_KEY, JSON.stringify(map));

      if (intakeData) {
        const rawIntakes = localStorage.getItem(INTAKES_CACHE_KEY);
        const intakes = rawIntakes ? JSON.parse(rawIntakes) : {};
        intakes[userId] = intakeData;
        localStorage.setItem(INTAKES_CACHE_KEY, JSON.stringify(intakes));
      }
    }
  } catch {}
}

export function getSavedIntake(userId) {
  if (!userId) return null;
  try {
    if (typeof localStorage !== 'undefined') {
      const rawIntakes = localStorage.getItem(INTAKES_CACHE_KEY);
      if (rawIntakes) {
        const intakes = JSON.parse(rawIntakes);
        if (intakes[userId]) return intakes[userId];
      }
    }
  } catch {}
  return DEFAULT_SCREENING_INTAKES[userId] || null;
}

export function resetAllScreening() {
  try {
    if (typeof localStorage !== 'undefined') {
      const resetMap = {
        reset: true,
        khalid: false,
        fatima: false,
        ahmed: false,
        noura: false,
        saeed: false,
        maryam: false,
      };
      localStorage.setItem(SCREENED_KEY, JSON.stringify(resetMap));
      localStorage.removeItem(INTAKES_CACHE_KEY);
    }
  } catch {}
}
