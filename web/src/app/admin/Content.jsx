import { Page, Card, Badge } from '../shared/ui.jsx';
import { FAITH_CARDS } from '../shared/data.js';
import { useStore } from '../shared/store.js';
import { decideCard } from '../shared/db.js';

/* scholar-reviewed faith cards: nothing goes live until it is approved */
export default function Content() {
  const faith = useStore((s) => s.faith);
  const status = (c) => faith[c.id] || c.status;
  const decide = (c, v) => decideCard(c, v);

  return (
    <Page title="Content review" sub="Faith cards are reviewed by qualified scholars before they go live. AI never gives religious rulings.">
      <Card>
        <ul className="rows">
          {FAITH_CARDS.map((c) => {
            const s = status(c);
            return (
              <li key={c.id}>
                <span><b>{c.title}</b><small>{s === 'approved' ? `Reviewed by ${c.reviewer || 'scholar panel'}` : 'Awaiting scholar review'}</small></span>
                {s === 'pending'
                  ? <span className="row-a"><button className="btn-soft" onClick={() => decide(c, 'rejected')}>Return</button><button className="btn" onClick={() => decide(c, 'approved')}>Approve</button></span>
                  : <Badge tone={s === 'approved' ? 'green' : 'grey'}>{s === 'approved' ? '✓ Live' : 'Returned'}</Badge>}
              </li>
            );
          })}
        </ul>
      </Card>
    </Page>
  );
}
