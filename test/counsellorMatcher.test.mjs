import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineDistanceKm,
  scoreSpecialty,
  scoreLanguage,
  scoreDistance,
  scoreAvailability,
  scoreCaseload,
  calculateMatchScore,
  getRecommendedCounsellors,
  getCouplePrimaryGene,
  GENE_SPECIALTY_MAP,
  UAE_COORDINATES,
} from '../web/src/app/shared/counsellorMatcher.js';
import { COUNSELLORS } from '../web/src/app/shared/data.js';

test('DaNA Counsellor Recommendation & Matching Engine Suite', async (t) => {
  await t.test('1. Haversine distance calculation matches great-circle geometry', () => {
    // Abu Dhabi to Al Ain
    const ad = UAE_COORDINATES[100];
    const alAin = UAE_COORDINATES[101];
    const dist = haversineDistanceKm(ad.lat, ad.lon, alAin.lat, alAin.lon);
    assert.ok(dist >= 135 && dist <= 145, `Distance should be ~140km, got ${dist}`);

    // Same location distance is 0
    const zero = haversineDistanceKm(ad.lat, ad.lon, ad.lat, ad.lon);
    assert.equal(zero, 0);
  });

  await t.test('2. Specialty scoring matches diagnosed carrier gene', () => {
    // HBB matches haemoglobinopathies
    const mariam = COUNSELLORS.find((c) => c.id === 'mariam');
    const sHbb = scoreSpecialty(mariam.specialties, 'HBB');
    assert.equal(sHbb, 1.0, 'Dr. Mariam should have 1.0 specialty match for HBB');

    // SMN1 matches neurogenetics
    const tariq = COUNSELLORS.find((c) => c.id === 'tariq');
    const sSmn = scoreSpecialty(tariq.specialties, 'SMN1');
    assert.equal(sSmn, 1.0, 'Dr. Tariq should have 1.0 specialty match for SMN1');

    // GJB2 matches hearing loss
    const fatimaC = COUNSELLORS.find((c) => c.id === 'fatima_counsellor');
    const sGjb2 = scoreSpecialty(fatimaC.specialties, 'GJB2');
    assert.equal(sGjb2, 1.0, 'Dr. Fatima should have 1.0 specialty match for GJB2');

    // General premarital match for unmatched gene
    const sGen = scoreSpecialty(mariam.specialties, 'UNKNOWN_GENE');
    assert.equal(sGen, 0.70, 'Unmatched gene with premarital specialty yields 0.70');
  });

  await t.test('3. Language scoring prioritizes preferred language and bilingual proficiency', () => {
    const bilingual = ['ar', 'en'];
    const englishOnly = ['en'];

    // Arabic speaker
    assert.equal(scoreLanguage(bilingual, 'ar'), 1.0);
    assert.equal(scoreLanguage(englishOnly, 'ar'), 0.40);

    // English speaker
    assert.equal(scoreLanguage(bilingual, 'en'), 1.0);
    assert.equal(scoreLanguage(englishOnly, 'en'), 0.95);
  });

  await t.test('4. Geographic distance rules strictly enforce in-person emirate boundary', () => {
    // In-person cross-emirate is strictly blocked (0.0 score)
    assert.equal(scoreDistance(50, false, 'offline'), 0.0);
    assert.equal(scoreDistance(50, false, 'in_person'), 0.0);

    // In-person same emirate scales by distance
    assert.equal(scoreDistance(5, true, 'offline'), 1.0);
    assert.equal(scoreDistance(20, true, 'offline'), 0.85);
    assert.equal(scoreDistance(45, true, 'offline'), 0.70);

    // Online telehealth allows cross-emirate consultation
    assert.equal(scoreDistance(120, false, 'online'), 0.95);
    assert.equal(scoreDistance(10, true, 'online'), 1.0);
  });

  await t.test('5. Full match scoring correctly identifies top match for Khalid & Fatima (HBB)', () => {
    // c1 = Khalid & Fatima, both HBB carriers in Abu Dhabi
    const resOnline = getRecommendedCounsellors({
      coupleId: 'c1',
      modality: 'online',
      preferredLang: 'ar',
      userLocationId: 100,
    });

    assert.equal(resOnline.targetGene, 'HBB');
    assert.ok(resOnline.counsellors.length >= 3);
    assert.equal(resOnline.topMatch.id, 'mariam', 'Dr. Mariam must be top online match for HBB');
    assert.ok(resOnline.topMatch.match.matchPercentage >= 90, `Expected >= 90%, got ${resOnline.topMatch.match.matchPercentage}%`);
    assert.equal(resOnline.topMatch.isTopMatch, true);

    // In-person match: Dubai-based counsellor should be filtered out for Abu Dhabi couple
    const resOffline = getRecommendedCounsellors({
      coupleId: 'c1',
      modality: 'offline',
      preferredLang: 'ar',
      userLocationId: 100,
    });

    const hasDubai = resOffline.counsellors.some((c) => c.emirate === 'Dubai');
    assert.equal(hasDubai, false, 'In-person list must not contain cross-emirate counsellors');
    assert.equal(resOffline.topMatch.id, 'mariam', 'Dr. Mariam must be top in-person match in Abu Dhabi');
  });

  await t.test('6. Full match scoring correctly prioritizes Dr. Tariq for Saeed & Maryam (SMN1)', () => {
    // c3 = Saeed & Maryam, SMN1 carriers
    const res = getRecommendedCounsellors({
      coupleId: 'c3',
      modality: 'online',
      preferredLang: 'ar',
      userLocationId: 100,
    });

    assert.equal(res.targetGene, 'SMN1');
    assert.equal(res.topMatch.id, 'tariq', 'Dr. Tariq must be top match for SMN1');
  });

  await t.test('7. Full match scoring correctly prioritizes Dr. Fatima Al Zaabi for Ahmed & Noura (GJB2)', () => {
    // c2 = Ahmed & Noura, GJB2 carriers
    const res = getRecommendedCounsellors({
      coupleId: 'c2',
      modality: 'online',
      preferredLang: 'ar',
      userLocationId: 100,
    });

    assert.equal(res.targetGene, 'GJB2');
    assert.equal(res.topMatch.id, 'fatima_counsellor', 'Dr. Fatima Al Zaabi must be top match for GJB2');
  });
});
