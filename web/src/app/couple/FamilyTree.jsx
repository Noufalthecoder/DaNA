import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Baby, Pencil, Plus, Send, Trash2, UserRound, UserRoundCheck, Users, UsersRound } from 'lucide-react';
import { Card, Dialog, Page } from '../shared/ui.jsx';
import Report from '../shared/Report.jsx';
import { useStore } from '../shared/store.js';
import { addRelative, removeRelative, renameRelative, sendAlerts } from '../shared/db.js';
import { relativesFor, getSyntheticIntake } from '../shared/data.js';
import { RELATION_GROUPS, buildMember, buildTreeFromIntake, childrenOf, hasParents, isFull, relationLabel, withSelf } from '../shared/family.js';
import { useCouple } from './useCouple.js';
import FamilyMemberForm from './FamilyMemberForm.jsx';
import '../family-tree.css';

/* Each generation is a column. Selecting someone opens their children in the next one. */
const COLUMNS = [
  { title: RELATION_GROUPS[0].title, Icon: UsersRound },
  { title: RELATION_GROUPS[1].title, Icon: Users },
  { title: RELATION_GROUPS[2].title, Icon: UserRound },
  { title: RELATION_GROUPS[3].title, Icon: Baby },
];
const FIRST_GENERATION = -2;
const depthOf = (r) => r.generation - FIRST_GENERATION;

/* everyone `id` descends from, on both sides, plus `id` itself */
function bloodline(byId, id, seen = new Set()) {
  const r = byId[id];
  if (!r || seen.has(id)) return seen;
  seen.add(id);
  bloodline(byId, r.father_id, seen);
  bloodline(byId, r.mother_id, seen);
  return seen;
}

/*
  The open branch, one id per column. It climbs from `id` to the oldest ancestor,
  staying on `prefer` where it can, then carries on down to you if `id` is on your line.
*/
function branchTo(rows, byId, id, line, prefer) {
  const path = [];
  for (let r = byId[id]; r;) {
    path[depthOf(r)] = r.id;
    const father = byId[r.father_id], mother = byId[r.mother_id];
    r = mother && (prefer.has(mother.id) || !father) ? mother : father;
  }
  for (let r = byId[id]; r;) {
    r = childrenOf(rows, r.id).find((c) => line.has(c.id));
    if (r) path[depthOf(r)] = r.id;
  }
  return path;
}

function Person({ r, Icon, kids, active, note, onSelect, onEdit, onRemove, onAlert }) {
  const self = !!r.person_id;
  const isPartner = r.isPartner || r.name?.includes('Partner');
  return (
    <div className={`ftree-card${active ? ' is-active' : ''}${kids ? ' has-children' : ''}`} data-id={r.id}>
      <button type="button" className="ftree-card__main" aria-pressed={active} title={r.name} onClick={onSelect}>
        <span className="ftree-card__icon">{self ? <UserRoundCheck size={18} /> : isPartner ? <Users size={18} /> : <Icon size={18} />}</span>
        <span className="ftree-card__info">
          <span className="ftree-card__name">{r.name}</span>
          <span className="ftree-card__meta">
            <em className={`ftree-tag ${self ? 'is-you' : isPartner ? 'is-partner' : r.side ? `is-${r.side}` : ''}`}>
              {isPartner ? 'Partner · Kinship' : relationLabel(r)}
            </em>
            {note}
          </span>
        </span>
      </button>
      {!self && (
        <div className="ftree-card__actions">
          {onAlert && <button type="button" className="ftree-card__btn" title="Send Sila alert" aria-label={`Send Sila alert to ${r.name}`} onClick={onAlert}><Send size={13} /></button>}
          <button type="button" className="ftree-card__btn" title="Edit name" aria-label={`Edit ${r.name}`} onClick={onEdit}><Pencil size={13} /></button>
          <button type="button" className="ftree-card__btn is-danger" title="Remove" aria-label={`Remove ${r.name}`} onClick={onRemove}><Trash2 size={13} /></button>
        </div>
      )}
      {(kids > 0 || active) && <span className={`ftree-badge${active ? ' is-active' : ''}`} aria-hidden="true">{kids}</span>}
    </div>
  );
}

export default function FamilyTree() {
  const { me, partner, gene } = useCouple();
  const saved = useStore((s) => s.family?.[me.id]);
  const intake = useStore((s) => s.screeningIntakes?.[me.id]);
  const sent = useStore((s) => s.alertsSent);

  // Derive rows from saved tree, or from screening intake family records & consanguinity status
  const effectiveBase = useMemo(() => {
    if (saved && saved.length > 0) return saved;
    if (intake?.family && intake.family.length > 0) {
      return buildTreeFromIntake(me, partner, intake);
    }
    const syn = getSyntheticIntake(me.id);
    if (syn?.family) {
      return buildTreeFromIntake(me, partner, syn);
    }
    return [];
  }, [saved, intake, me, partner]);

  const rows = useMemo(() => withSelf(effectiveBase, me), [effectiveBase, me.id, me.name]);
  const byId = useMemo(() => Object.fromEntries(rows.map((r) => [r.id, r])), [rows]);
  const selfId = rows.find((r) => r.person_id === me.id).id;
  const line = useMemo(() => bloodline(byId, selfId), [byId, selfId]);
  const sila = useMemo(() => Object.fromEntries(relativesFor(me.id).map((r) => [r.id, r])), [me.id]);

  const [selected, setSelected] = useState(selfId);
  const [path, setPath] = useState(() => branchTo(rows, byId, selfId, line, new Set()));
  const [form, setForm] = useState(null);         // { preset } to add, { member } to edit
  const [removing, setRemoving] = useState(null); // the person waiting for confirmation
  const scroller = useRef(null);

  // rows change when someone is added, removed or loaded: keep the open branch valid
  useEffect(() => {
    const id = byId[selected] ? selected : selfId;
    setSelected(id);
    setPath((p) => branchTo(rows, byId, id, line, new Set(p)));
  }, [rows]);

  // on narrow screens, bring the selected person into view without moving the page
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const card = box.querySelector(`[data-id="${CSS.escape(selected)}"]`);
    if (!card || box.scrollWidth <= box.clientWidth) return;
    const left = card.getBoundingClientRect().left - box.getBoundingClientRect().left + box.scrollLeft;
    box.scrollTo({ left: left - (box.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' });
  }, [selected]);

  /* the line under a name. Chances come only from the Sila list. */
  const noteFor = (r) => {
    if (r.person_id) return gene ? `${gene.symbol} carrier` : 'Nothing found';
    if (r.isPartner || r.name?.includes('Partner')) {
      return r.condition || (gene ? `${gene.symbol} carrier` : 'Partner');
    }
    const entry = gene && r.sila_ref ? sila[r.sila_ref] : null;
    if (!entry) return r.condition || null;
    return sent.includes(entry.id) ? 'Alert sent' : `${entry.chance} chance`;
  };
  const canAlert = (r) => !!(gene && r.sila_ref && sila[r.sila_ref] && !sent.includes(r.sila_ref));

  const select = (depth, id) => {
    setPath(branchTo(rows, byId, id, line, new Set(path.slice(0, depth))));
    setSelected(id);
  };

  /* open the form ready for this column: next free relation, under the open branch */
  const openAdd = (depth) => {
    const parent = byId[path[depth - 1]];
    const free = depth === undefined ? [] : RELATION_GROUPS[depth].items.filter((r) => !isFull(rows, r.relation));
    const relation = (free.find((r) => r.parent?.includes(parent?.relation)) ?? free[0])?.relation ?? '';
    setForm({ preset: { relation, side: parent?.side || 'paternal', parentId: parent?.id || '' } });
  };

  const save = (values) => {
    if (form.member) {
      renameRelative(me.id, form.member.id, values.name.trim());
    } else {
      const { added, changed } = buildMember(rows, values, me.id);
      addRelative(me.id, added, changed);
      setSelected(added.id);
    }
    setForm(null);
  };

  const remove = (e) => {
    e.preventDefault();
    removeRelative(me.id, removing.id);
    setRemoving(null);
  };

  const columns = COLUMNS.map((col, depth) => {
    const parentId = depth ? path[depth - 1] : undefined;
    const inGeneration = rows.filter((r) => depthOf(r) === depth);
    const linked = parentId ? childrenOf(rows, parentId) : [];
    // Children only show under their parent. Other columns with no open parent show the whole
    // generation, so nobody is hidden. Anyone not attached to a parent yet always shows.
    const unattached = inGeneration.filter((r) => !hasParents(r, byId));
    const loose = parentId || depth === COLUMNS.length - 1 ? unattached : inGeneration;
    return { ...col, depth, parentId, linked, people: [...linked, ...loose] };
  });

  return (
    <Page title="Branches" sub="Explore your family pedigree and genetic kinship lines."
      actions={<button className="btn" onClick={() => openAdd()}><Plus size={16} />Add family member</button>}>
      <div className="ftree" ref={scroller}>
        <div className="ftree__cols">
          {columns.map(({ title, Icon, depth, parentId, linked, people }) => {
            const before = columns[depth - 1];
            // the line comes from the open parent, or from the previous column's Add row if there is none
            const sourceRow = !before ? 0 : parentId ? before.people.findIndex((p) => p.id === parentId) : before.people.length;
            // the spine ends at the last row, so empty rows carry it down to a source further below
            const spacers = Math.max(sourceRow - people.length, 0);
            const feedsNext = depth < COLUMNS.length - 1 && !path[depth];
            return (
              <section className="ftree__col" key={title} aria-label={title}>
                <div className="ftree__head">
                  <span className="ftree__title"><Icon size={16} />{title}</span>
                  <span className="ftree__count">{people.length}</span>
                </div>
                <div className={`ftree__list${depth ? ' is-connected' : ''}`}>
                  {people.map((r, i) => (
                    <div className={`ftree-slot${parentId && i >= linked.length ? ' is-loose' : ''}`} key={r.id}>
                      <Person r={r} Icon={Icon} kids={childrenOf(rows, r.id).length} active={path[depth] === r.id} note={noteFor(r)}
                        onSelect={() => select(depth, r.id)} onEdit={() => setForm({ member: r })} onRemove={() => setRemoving(r)}
                        onAlert={canAlert(r) ? () => sendAlerts([r.sila_ref]) : null} />
                    </div>
                  ))}
                  <div className={`ftree-slot${feedsNext ? ' feeds-next' : ''}`}>
                    <button type="button" className="ftree-add" aria-label={`Add to ${title}`} onClick={() => openAdd(depth)}><Plus size={16} />Add</button>
                  </div>
                  {Array.from({ length: spacers }, (_, i) => <div className="ftree-slot is-spacer" key={i} />)}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <Card title="Your lab report">
        <Report personId={me.id} />
      </Card>

      <p className="disclaimer">Visible to you and your counsellor. Names are never sent in Sila alerts. DaNA explains; it does not diagnose. Numbers come from a rules engine, never from AI.</p>

      {form && <FamilyMemberForm rows={rows} preset={form.preset} member={form.member} onSave={save} onClose={() => setForm(null)} />}

      {removing && (
        <Dialog title="Confirm removal" icon={<AlertTriangle size={20} className="ftree-warn" />} onSubmit={remove} onClose={() => setRemoving(null)}
          footer={<>
            <button type="button" className="btn-line" onClick={() => setRemoving(null)}>Cancel</button>
            <button type="submit" className="btn-danger">Remove</button>
          </>}>
          <p>Remove <b>{removing.name}</b> from your family tree? Anyone listed as their child stays in the tree.</p>
        </Dialog>
      )}
    </Page>
  );
}
