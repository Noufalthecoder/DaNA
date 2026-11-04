/*
  Family tree rules. Owner: Couple app.
  The person picks a relation; these rules work out where that row sits and which
  ids it links to, so relatives can be added in any order.
*/
import { relativesFor } from './data.js';

export const SIDES = { paternal: 'Father’s side', maternal: 'Mother’s side' };

/* side: 'ask' means the person chooses. parent: who this relation hangs from. */
export const RELATION_GROUPS = [
  { title: 'Grandparents', items: [
    { relation: 'Grandfather', sex: 'M', generation: -2, side: 'ask', single: true },
    { relation: 'Grandmother', sex: 'F', generation: -2, side: 'ask', single: true },
  ] },
  { title: 'Parents’ generation', items: [
    { relation: 'Father', sex: 'M', generation: -1, side: 'paternal', single: true },
    { relation: 'Mother', sex: 'F', generation: -1, side: 'maternal', single: true },
    { relation: 'Uncle', sex: 'M', generation: -1, side: 'ask' },
    { relation: 'Aunt', sex: 'F', generation: -1, side: 'ask' },
  ] },
  { title: 'Your generation', items: [
    { relation: 'Brother', sex: 'M', generation: 0 },
    { relation: 'Sister', sex: 'F', generation: 0 },
    { relation: 'Cousin', sex: null, generation: 0, parent: ['Uncle', 'Aunt'] },
  ] },
  { title: 'Next generation', items: [
    { relation: 'Son', sex: 'M', generation: 1, parent: ['You'] },
    { relation: 'Daughter', sex: 'F', generation: 1, parent: ['You'] },
    { relation: 'Nephew', sex: 'M', generation: 1, parent: ['Brother', 'Sister'] },
    { relation: 'Niece', sex: 'F', generation: 1, parent: ['Brother', 'Sister'] },
  ] },
];

const RULES = Object.fromEntries(RELATION_GROUPS.flatMap((g) => g.items).map((r) => [r.relation, r]));
export const ruleFor = (relation) => RULES[relation];

export const selfRow = (me) => ({
  id: crypto.randomUUID(), person_id: me.id, name: me.name, relation: 'You', sex: me.sex ?? null,
  father_id: null, mother_id: null, side: null, generation: 0, sort_order: 0, sila_ref: null,
});

/* rows saved without parent_ids still belong somewhere: the relation says where */
function fillLinks(rows) {
  const of = (relation, side) => rows.find((r) => r.relation === relation && r.side === side)?.id ?? null;
  return rows.map((r) => {
    if (r.generation === 0 && r.relation !== 'Cousin') {
      return { ...r, father_id: r.father_id ?? of('Father', 'paternal'), mother_id: r.mother_id ?? of('Mother', 'maternal') };
    }
    if (r.generation === -1) {
      return { ...r, father_id: r.father_id ?? of('Grandfather', r.side), mother_id: r.mother_id ?? of('Grandmother', r.side) };
    }
    return r;
  });
}

/* the saved rows, always with the signed-in person in them */
export const withSelf = (rows, me) => fillLinks(rows.some((r) => r.person_id === me.id) ? rows : [selfRow(me), ...rows])
  .sort((a, b) => a.sort_order - b.sort_order);

export const childrenOf = (rows, id) => rows.filter((r) => r.father_id === id || r.mother_id === id);
export const hasParents = (r, byId) => !!(byId[r.father_id] || byId[r.mother_id]);

/* "Paternal uncle" rather than two labels. Father and Mother already say their side. */
export function relationLabel(r) {
  const rule = ruleFor(r.relation);
  if (!r.side || rule?.side !== 'ask' && r.relation !== 'Cousin') return r.relation;
  return `${r.side === 'paternal' ? 'Paternal' : 'Maternal'} ${r.relation.toLowerCase()}`;
}

export const parentChoices = (rows, relation) => {
  const wanted = ruleFor(relation)?.parent;
  return wanted ? rows.filter((r) => wanted.includes(r.relation)) : [];
};

/* why this relation can't be added right now, or null when it can */
export function problemWith(rows, relation, side) {
  const rule = ruleFor(relation);
  if (!rule) return null;
  if (rule.single) {
    const s = rule.side === 'ask' ? side : rule.side;
    if (rows.some((r) => r.relation === relation && r.side === s)) {
      return rule.side === 'ask' ? `You already added a ${relation.toLowerCase()} on this side.` : `You already added your ${relation.toLowerCase()}.`;
    }
  }
  if (rule.parent && !parentChoices(rows, relation).length) {
    return relation === 'Cousin' ? 'Add an uncle or aunt first, so we know where they belong.' : 'Add a brother or sister first, so we know where they belong.';
  }
  return null;
}

/* a relation is unavailable when every slot for it is taken */
export function isFull(rows, relation) {
  const rule = ruleFor(relation);
  if (!rule.single) return false;
  const sides = rule.side === 'ask' ? ['paternal', 'maternal'] : [rule.side];
  return sides.every((s) => rows.some((r) => r.relation === relation && r.side === s));
}

const linkTo = (parent) => (parent.sex === 'F' ? { mother_id: parent.id } : { father_id: parent.id });

/* the Sila entry this relative stands for, if one is still free */
function silaFor(rows, ownerId, relation) {
  const used = new Set(rows.map((r) => r.sila_ref));
  const match = relation === 'Cousin' ? /cousin/i : new RegExp(`^${relation}`, 'i');
  return relativesFor(ownerId).find((s) => match.test(s.label) && !used.has(s.id))?.id ?? null;
}

/*
  Build the new row and every existing row whose links change because of it.
  form: { relation, side, parentId, name }. `rows` must include the signed-in person.
*/
export function buildMember(rows, form, ownerId) {
  const rule = ruleFor(form.relation);
  const self = rows.find((r) => r.person_id === ownerId);
  const of = (relation, side) => rows.find((r) => r.relation === relation && r.side === side);
  const parent = rule.parent?.includes('You') ? self : rows.find((r) => r.id === form.parentId);
  const side = rule.side === 'ask' ? form.side : rule.side ?? parent?.side ?? null;
  const added = {
    id: crypto.randomUUID(), person_id: null, name: form.name.trim(), relation: form.relation,
    sex: rule.sex, side, generation: rule.generation, father_id: null, mother_id: null,
    sort_order: rows.reduce((n, r) => Math.max(n, r.sort_order ?? 0), 0) + 1,
    sila_ref: silaFor(rows, ownerId, form.relation),
  };
  const changed = [self];   // always saved, so the first relative also stores the owner's row
  const relink = (row, patch) => {
    const next = { ...row, ...patch };
    const at = changed.findIndex((r) => r.id === row.id);
    if (at >= 0) changed[at] = next; else changed.push(next);
  };

  if (rule.generation === -2) {
    const key = rule.sex === 'F' ? 'mother_id' : 'father_id';
    rows.filter((r) => r.generation === -1 && r.side === side).forEach((r) => relink(r, { [key]: added.id }));
  } else if (rule.generation === -1) {
    added.father_id = of('Grandfather', side)?.id ?? null;
    added.mother_id = of('Grandmother', side)?.id ?? null;
    if (form.relation === 'Father' || form.relation === 'Mother') {
      const key = form.relation === 'Father' ? 'father_id' : 'mother_id';
      rows.filter((r) => r.generation === 0 && r.relation !== 'Cousin').forEach((r) => relink(r, { [key]: added.id }));
    }
  } else if (parent) {
    Object.assign(added, linkTo(parent));
  } else {
    added.father_id = self.father_id;   // brother or sister: same parents as you
    added.mother_id = self.mother_id;
  }
  return { added, changed };
}

/*
  The family_members table stores the name, one lower-case relationship label and
  parent_ids. The tree works in the fuller shape above, so convert at the database edge.
*/
const dbLabel = (r) => (r.person_id ? 'self' : relationLabel(r).toLowerCase().replace(/cousin$/, 'first cousin'));

export const toDb = (r, ownerId) => ({
  id: r.id, owner_id: ownerId, display_name: r.name, gender: r.sex,
  relationship: dbLabel(r),
  parent_ids: [r.father_id, r.mother_id].filter(Boolean),
});

function fromLabel(label, ownerId) {
  const text = label.trim().toLowerCase();
  if (text === 'self') return { relation: 'You', side: null, generation: 0, person_id: ownerId };
  const sided = /^(paternal|maternal) (.+)$/.exec(text);
  const base = (sided ? sided[2] : text).replace(/^first cousin$/, 'cousin');
  const relation = base[0].toUpperCase() + base.slice(1);
  const rule = ruleFor(relation);
  if (!rule) return null;   // a label this tree doesn't place
  const side = sided ? sided[1] : rule.side === 'ask' ? null : rule.side ?? null;
  return { relation, side, sex: rule.sex, generation: rule.generation, person_id: null };
}

/* database records, oldest first, into tree rows */
export function fromDb(records, ownerId) {
  const known = records.flatMap((rec) => {
    const parsed = fromLabel(rec.relationship, ownerId);
    return parsed ? [{ rec, ...parsed }] : [];
  });
  const sexOf = Object.fromEntries(known.map(({ rec, sex }) => [rec.id, rec.gender ?? sex]));
  const rows = [];
  known.forEach(({ rec, relation, side, sex, generation, person_id }, i) => {
    const parents = (rec.parent_ids || []).filter((id) => id in sexOf);
    rows.push({
      id: rec.id, person_id, name: rec.display_name, relation, sex: rec.gender ?? sex ?? null, side, generation,
      father_id: parents.find((id) => sexOf[id] !== 'F') ?? null,
      mother_id: parents.find((id) => sexOf[id] === 'F') ?? null,
      sort_order: person_id ? 0 : i + 1,
      sila_ref: person_id ? null : silaFor(rows, ownerId, relation),
    });
  });
  return rows;
}
