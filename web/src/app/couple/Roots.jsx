import { useState } from 'react';
import { Page, Card, Badge } from '../shared/ui.jsx';
import { useStore } from '../shared/store.js';
import { useCouple } from './useCouple.js';

/* Roots: understand what you carry */
export default function Roots() {
  const { me, partner, gene } = useCouple();
  const share = useStore((s) => s.consents.sharePartner);
  const [playing, setPlaying] = useState(false);

  return (
    <Page title="Roots" sub="Understand what you carry">
      <Card title="Your result" aside={<Badge tone={gene ? 'amber' : 'green'}>{gene ? 'Carrier' : 'Nothing found'}</Badge>}>
        {gene ? (<>
          <p className="lead-in">You carry one changed copy of the <b>{gene.symbol}</b> gene, linked to <b>{gene.condition}</b>.</p>
          <div className="genes" aria-label="Two gene copies: one working, one changed">
            <div><span className="copy ok" />Working copy</div>
            <div><span className="copy changed" />Changed copy</div>
          </div>
          <ul className="facts">
            <li><b>You are healthy.</b> Carriers don’t have the condition.</li>
            <li><b>It’s common.</b> Many healthy people carry a gene like this.</li>
            <li><b>It matters for children</b> only if your partner carries the same gene.</li>
          </ul>
        </>) : <p className="lead-in">No disease-causing variant was found in the genes we screened.</p>}
        <button className="btn-soft" onClick={() => setPlaying(!playing)}>{playing ? '❚❚ Pause' : '▶ Listen in Arabic (voice note)'}</button>
      </Card>

      <Card title={`${partner.short}’s result`}>
        {share
          ? <p>{partner.short} also carries a changed copy of <b>{partner.carrier}</b>. Together, that makes you <a href="#/app/bonds">compatible, with a plan</a>.</p>
          : <p className="muted">{partner.short} hasn’t shared their result with you. Sharing is always a choice.</p>}
      </Card>

      <p className="disclaimer">DaNA explains; it does not diagnose. Numbers come from a rules engine, never from AI.</p>
    </Page>
  );
}
