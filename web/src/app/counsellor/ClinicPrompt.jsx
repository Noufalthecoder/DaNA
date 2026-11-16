import { useEffect, useState } from 'react';
import { Card } from '../shared/ui.jsx';
import { isLive } from '../shared/db.js';
import { myClinic } from '../shared/locationService.js';
import ClinicSlots from './ClinicSlots.jsx';
import '../shared/location.css';

/* Shown to a counsellor who has not chosen a clinic yet: the DoH admin for that area can only see them (and verify
   them) once they have. Disappears as soon as a clinic is saved. */
export default function ClinicPrompt() {
  const [clinic, setClinic] = useState(undefined);
  const [open, setOpen] = useState(false);

  const load = () => myClinic().then(setClinic).catch(() => setClinic(null));
  useEffect(() => { if (isLive()) load(); }, []);

  if (!isLive() || !clinic || clinic.location_id) return null;
  return (
    <>
      <Card title="Choose your clinic location">
        <div className="loc-prompt">
          <p>
            Your DoH admin manages the counsellors of one area. Choose where you see couples so the right admin can verify you,
            and couples near you can find you.
          </p>
          <button type="button" className="btn" onClick={() => setOpen(true)}>Choose clinic</button>
        </div>
      </Card>
      {open && <ClinicSlots onClose={() => { setOpen(false); load(); }} />}
    </>
  );
}
