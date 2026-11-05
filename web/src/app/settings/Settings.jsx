import { Accordion, Page } from '../shared/ui.jsx';
import Benchmarks from './Benchmarks.jsx';
import './settings.css';

/* Programme settings. To add a section: add one Accordion below. */
export default function Settings() {
  return (
    <Page title="Settings" sub="Programme configuration">
      <Accordion title="Benchmarks" hint="Default values used to cross-check each partner's screening results" defaultOpen>
        <Benchmarks />
      </Accordion>
    </Page>
  );
}
