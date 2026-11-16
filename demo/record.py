"""
DaNA demo recorder: plays the whole storyboard in Chrome, zooms in on every click, writes captions,
cuts the dead time (sign-ins, waiting for a notification) and adds the real voice replies.

Run (from the repo root, with the web app running:  cd web && npx vite --port 5173 --host 0.0.0.0):
    py -3.13 demo/record.py                 # full recording -> demo/out/dana-demo.mp4
    py -3.13 demo/record.py --dry           # rehearsal: same steps, screenshots of every step, no final video
Needs: pip install playwright imageio-ffmpeg ; Google Chrome ; demo/accounts.json (see accounts.example.json).

Two app panels, two different people (each panel is its own website origin, so each keeps its own sign-in):
    left  = http://localhost:5173   the man (also the chatbot voice: the API allows this origin)
    right = https://dana-gamma-seven.vercel.app (the live site)   the woman, later the counsellor, later the DoH admin
    (both origins are allowed by the API, so Malaffi import and the voice work in both)
"""
import json, os, re, subprocess, sys, time, threading, http.server, functools
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE / 'out'
OUT.mkdir(exist_ok=True)
DRY = '--dry' in sys.argv
ACC = json.load(open(HERE / 'accounts.json'))
L_URL, R_URL = 'http://localhost:5173', 'https://dana-gamma-seven.vercel.app'
STAGE_PORT = 5199
PACE = 0.75          # scales every 'hold' (reading time); lower = shorter video
log = lambda *a: print(time.strftime('%H:%M:%S'), *a, flush=True)


# ------------------------------------------------------------------ stage + timeline
def serve_stage():
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(HERE))
    h.log_message = lambda *a, **k: None
    srv = http.server.ThreadingHTTPServer(('localhost', STAGE_PORT), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


class Show:
    def __init__(self, page):
        self.pg = page
        self.t0 = time.time()
        self.cuts = []          # [start, end) seconds removed from the final video
        self._cut = None
        self.sounds = []        # (video second, wav path)
        self.n = 0

    def t(self):
        return time.time() - self.t0

    def js(self, code, *args):
        return self.pg.evaluate(code, *args) if args else self.pg.evaluate(code)

    def cap(self, html):
        self.js('h => stage.cap(h)', html)

    def layout(self, m):
        self.js('m => stage.layout(m)', m); self.wait(0.7)

    def tag(self, side, text):
        self.js('([s, t]) => stage.tag(s, t)', [side, text])

    def card(self, h, p='', small='', secs=3.0):
        self.js('([h, p, s]) => stage.card(h, p, s)', [h, p, small]); self.wait(secs); self.js('() => stage.card(null)'); self.wait(0.5)

    def wait(self, s):
        self.pg.wait_for_timeout(int(s * 1000))

    def cut_start(self):
        self._cut = self.t()

    def cut_end(self):
        if self._cut is not None:
            self.cuts.append((self._cut, self.t())); self._cut = None

    def shot(self, name):
        if DRY:
            self.n += 1
            self.pg.screenshot(path=str(OUT / f'dry_{self.n:02d}_{name}.png'))

    # move the cursor to an element, zoom in on it, then click / type
    def act(self, loc, caption=None, zoom=1.8, click=True, type_text=None, hold=1.0, name='step'):
        loc.scroll_into_view_if_needed(timeout=15000)
        self.wait(0.15)
        b = loc.bounding_box()
        if caption:
            self.cap(caption)
        if zoom and zoom > 1 and b:
            self.js('([x, y, s]) => stage.zoom(x, y, s)', [b['x'] + b['width'] / 2, b['y'] + b['height'] / 2, zoom])
            self.wait(0.6)
        # where the element sits on screen after the zoom (measured unzoomed, then mapped through the camera)
        x, y = self_x, self_y = b['x'] + min(b['width'] / 2, 60), b['y'] + b['height'] / 2
        x, y = self.js('([x, y]) => stage.toScreen(x, y)', [self_x, self_y])
        self.js('([x, y]) => stage.cursor(x, y)', [x, y]); self.wait(0.5)
        if click:
            self.js('([x, y]) => stage.ripple(x, y)', [x, y]); tap(loc); self.wait(0.2)
        if type_text:
            loc.focus(); loc.press_sequentially(type_text, delay=70)
        self.shot(name)
        self.wait(hold * PACE)
        if zoom and zoom > 1:
            self.unzoom()

    def look(self, loc, caption=None, zoom=1.6, hold=2.2, name='look'):
        """zoom on something to read it, no click"""
        self.act(loc, caption, zoom=zoom, click=False, hold=hold, name=name)

    def unzoom(self):
        self.js('() => stage.zoom(0, 0, 1)'); self.wait(0.5)


def tap(loc):
    """a real click event on the element itself: reliable inside the zoomed, scaled panels"""
    loc.dispatch_event('click')


def frame(pg, side):
    return pg.frame_locator('#f' + side)


def first_visible(fr, *selectors, timeout=15000):
    """the first of several possible selectors that shows up"""
    end = time.time() + timeout / 1000
    while time.time() < end:
        for s in selectors:
            loc = fr.locator(s).first
            try:
                if loc.is_visible():
                    return loc
            except Exception:
                pass
        time.sleep(0.3)
    raise RuntimeError(f'none visible: {selectors}')


def go(show, side, path):
    """open a page; the loading time is cut out of the final video"""
    base = L_URL if side == 'L' else R_URL
    own = show._cut is None
    if own:
        show.cut_start()
    show.js('([id, u]) => stage.load(id, u)', [side, f'{base}/#{path}'])
    show.wait(3.2)
    if own:
        show.cut_end()


def sign_in(show, side, who):
    """email sign-in inside a panel (always inside a cut: nobody needs to watch typing passwords)"""
    a = ACC[who]
    base = L_URL if side == 'L' else R_URL
    fr = frame(show.pg, side)
    show.js('([id, u]) => stage.load(id, u)', [side, f'{base}/#/login'])
    show.wait(3)
    try:  # sign out whoever was in this panel first
        show.pg.frame_locator('#f' + side).locator('body').evaluate("() => { localStorage.clear(); sessionStorage.clear(); }")
    except Exception:
        pass
    show.js('([id, u]) => stage.load(id, u)', [side, 'about:blank']); show.wait(0.5)
    show.js('([id, u]) => stage.load(id, u)', [side, f'{base}/#/login'])
    show.wait(3)
    fr.locator('body').evaluate("() => localStorage.setItem('dana.lang', 'en')")
    try:
        btn = first_visible(fr, 'button:has-text("Sign in with email")', timeout=40000)
    except RuntimeError:  # slow first load: try once more
        show.js('([id, u]) => stage.load(id, u)', [side, 'about:blank']); show.wait(0.5)
        show.js('([id, u]) => stage.load(id, u)', [side, f'{base}/#/login']); show.wait(5)
        btn = first_visible(fr, 'button:has-text("Sign in with email")', timeout=40000)
    tap(btn); show.wait(0.8)
    role = {'counsellor': 'Counsellor', 'admin': 'DoH admin'}.get(who, 'Couple')
    tap(fr.locator('button:visible', has_text=role).first); show.wait(0.3)
    if who in ('counsellor', 'admin'):
        fr.locator('input[placeholder="Your staff code"]').fill(a['code'])
    fr.locator('input[type=email]').fill(a['email'])
    fr.locator('input[type=password]').fill(a['pw'])
    fr.locator('input[type=password]').press('Enter')
    # signed in = the app's top bar is there
    first_visible(fr, '.shell header.top, .ob-top', timeout=30000)
    show.wait(1.5)
    log('signed in', who, 'in', side)


# ------------------------------------------------------------------ fresh start (same functions the app uses)
def _env(key):
    for line in open(HERE.parent / 'web' / '.env.local', encoding='utf-8'):
        if line.startswith(key + '='):
            return line.split('=', 1)[1].strip().strip('"')
    return ''


TOKENS = {}


def couple_id():
    """the demo couple's id, as the counsellor's calendar shows it"""
    import urllib.request
    req = urllib.request.Request(TOKENS['url'] + '/rest/v1/couples?select=id', headers={'apikey': TOKENS['anon'], 'Authorization': 'Bearer ' + TOKENS['male']})
    with urllib.request.urlopen(req, timeout=30) as r:
        rows = json.loads(r.read())
    return rows[0]['id'].upper() if rows else ''


def prepare():
    import urllib.request
    url, anon = _env('VITE_SUPABASE_URL').rstrip('/'), _env('VITE_SUPABASE_ANON_KEY')

    def call(path, token=None, body=None):
        req = urllib.request.Request(url + path, data=json.dumps(body or {}).encode(), method='POST',
                                     headers={'apikey': anon, 'Content-Type': 'application/json',
                                              'Authorization': f'Bearer {token or anon}'})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.status, r.read().decode()[:200]
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode()[:200]

    def tok(who):
        req = urllib.request.Request(url + '/auth/v1/token?grant_type=password', method='POST',
                                     data=json.dumps({'email': ACC[who]['email'], 'password': ACC[who]['pw']}).encode(),
                                     headers={'apikey': anon, 'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())['access_token']

    m, f = tok('male'), tok('female')
    TOKENS.update(male=m, url=url, anon=anon)
    log('unlink couple:', *call('/rest/v1/rpc/unlink_partner', m))
    log('fresh setup for Fatima:', *call('/rest/v1/rpc/reset_my_intake', f))


# ------------------------------------------------------------------ sound
def english_wav(text, path):
    """the same Windows voice Chrome uses for English on this laptop"""
    safe = text.replace("'", "''")
    ps = (f"Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
          f"$s.Rate = 0; $s.SetOutputToWaveFile('{path}'); $s.Speak('{safe}'); $s.Dispose()")
    subprocess.run(['powershell', '-NoProfile', '-Command', ps], check=False)


# ------------------------------------------------------------------ the storyboard
def run(show, ctx):
    pg = show.pg
    L, R = frame(pg, 'L'), frame(pg, 'R')
    last_tts = {}
    ctx.on('response', lambda r: last_tts.update(body=r.body(), url=r.url) if '/tts' in r.url and r.status == 200 and r.request.method == 'POST' else None)

    # --- pre-roll (cut): both people signed in
    show.cut_start()
    show.layout('split'); show.cap('')
    sign_in(show, 'L', 'male')
    sign_in(show, 'R', 'female')
    show.tag('L', 'Khalid · groom'); show.tag('R', 'Fatima · bride')
    show.cut_end()

    # 1. title
    show.card('DaNA', 'Premarital genetic screening, explained in plain words', 'Abu Dhabi · Future Health Challenge 2026', secs=4)

    # 2. Fatima sets up (onboarding outside the app)
    show.layout('R'); go(show, 'R', '/onboarding'); show.wait(2.5)
    show.cap('Fatima signs in. Before entering DaNA she sets up in <b>3 minutes</b>.'); show.wait(1.5)
    nxt = lambda: R.locator('.ob-nav button.btn').last
    for _ in range(8):  # works from whichever step her setup is on
        if R.locator('button:has-text("Enter DaNA")').count():
            break
        step = R.locator('h2').first.inner_text().strip()
        log('onboarding step:', step)
        if step.startswith('About'):
            show.act(first_visible(R, '[role=radio]:has-text("Female")'), zoom=1.9, name='sex')
        elif step.startswith('Verify'):
            if R.locator('button.uaepass').count():
                show.act(R.locator('button.uaepass'), 'Her identity is verified with <b>UAE PASS</b>.', zoom=1.7, hold=2.5, name='uaepass')
            show.look(first_visible(R, 'text=Verified by UAE PASS'), 'Verified with <b>UAE PASS</b>: her details fill in by themselves.', zoom=1.5, hold=2.2, name='verified')
        elif step.startswith('Consent'):
            show.cap('She chooses <b>exactly what DaNA may use</b>. Consent can be withdrawn any time.')
            for cb in R.locator('input[type=checkbox]').all():
                if not cb.is_checked():
                    show.act(cb, zoom=0, hold=0.2, name='consent')
        elif step.startswith('Marriage'):
            show.cap('A few details Malaffi does not hold: marital status, pregnancy, family history.')
            show.act(R.locator('[role=radio]:has-text("Engaged")').first, zoom=1.7, hold=0.4, name='engaged')
            show.act(R.get_by_role('radio', name='No', exact=True).first, zoom=1.7, hold=0.4, name='related')
        elif step.startswith('Family'):
            show.act(R.get_by_role('radio', name='No', exact=True).last, zoom=1.7, hold=0.4, name='child')
        elif step.startswith('Get your'):
            try:
                R.locator('select:has(option[value="beta_thal"])').first.select_option('beta_thal')
            except Exception as e:
                log('scenario select skipped', e)
            show.act(nxt(), 'With her consent, DaNA fetches her premarital results from <b>Malaffi</b>.', zoom=1.6, hold=0.5, name='consent_go')
            break
        else:
            break
        show.act(nxt(), zoom=0, hold=0.3, name='continue')
    show.cut_start(); first_visible(R, 'button:has-text("Enter DaNA")', timeout=90000); show.cut_end()
    show.look(R.locator('.ob, body').first, 'The record arrives exactly as Malaffi holds it.', zoom=1.0, hold=2.5, name='malaffi')
    show.act(R.locator('button:has-text("Enter DaNA")'), zoom=1.7, hold=1.2, name='enter')

    # 3. her own result
    show.wait(1.5); go(show, 'R', '/app/result'); show.wait(1)
    show.look(first_visible(R, '.rs-hero h2', 'h1'), 'Her result in plain words: <b>a carrier is a healthy person</b>, not a patient.', zoom=1.5, hold=3, name='result_f')

    # 4. connect the couple
    show.layout('split')
    go(show, 'R', '/app/connections'); go(show, 'L', '/app/connections')
    did = R.locator('text=/DANA-[A-Z0-9-]+/').first
    dana_id = re.search(r'DANA-[A-Z0-9-]+', did.inner_text()).group(0)
    show.look(did, 'Fatima shares her private <b>DaNA ID</b> with Khalid. Nobody can search by name.', zoom=2.0, hold=2.5, name='danaid')
    box = first_visible(L, 'input[placeholder*="DaNA ID"]')
    show.act(box, 'Khalid types her DaNA ID…', zoom=1.9, click=True, type_text=dana_id, hold=1.2, name='search')
    show.act(first_visible(L, 'button:has-text("Connect with")', timeout=20000), '…and sends a connection request.', zoom=1.9, hold=1.0, name='connect')
    try:  # a confirmation step, if the app shows one
        show.act(first_visible(L, 'button:has-text("Send Connection Request")', timeout=4000), zoom=1.9, hold=1.0, name='send')
    except RuntimeError:
        pass
    show.cut_start()
    first_visible(R, '.notif-badge', timeout=30000)
    show.cut_end()
    show.act(R.locator('.notif-btn'), 'Fatima gets a <b>notification</b> straight away 🔔', zoom=2.2, hold=1.5, name='bell')
    show.act(first_visible(R, '.notif-list li'), zoom=2.0, hold=1.2, name='notif')
    show.wait(1.5)
    show.act(first_visible(R, 'button:has-text("Accept")', timeout=20000), 'She accepts. Only now are their results compared, with both consents.', zoom=2.0, hold=2, name='accept')

    # 5. the couple result (Bonds)
    show.layout('L'); go(show, 'L', '/app/bonds'); show.wait(2.5)
    show.look(first_visible(L, '.rs-hero h2', 'h1'), 'Their <b>couple result</b>: both carry the same gene change. Both are healthy.', zoom=1.5, hold=3, name='bonds')
    show.look(first_visible(L, '.xp-kids, .bd-odds-4, .rs-card'), 'For each pregnancy: <b>3 in 4 children are healthy</b>. A chance, not a diagnosis.', zoom=1.4, hold=3.5, name='chances')
    show.look(first_visible(L, '.bd-options, .options'), 'Three safe options, side by side. <b>No right answer, no deadline</b>. The choice is theirs.', zoom=1.25, hold=3.5, name='options')

    # 6. a human counsellor + care path
    go(show, 'L', '/app'); show.wait(2.5)
    show.look(first_visible(L, '.cp-esc'), 'A result like this is <b>always passed to a qualified genetic counsellor</b>.', zoom=1.6, hold=3, name='escalate')
    go(show, 'L', '/app/counsellor'); show.wait(3)
    show.look(first_visible(L, 'h3:has-text("Request a Consultation"), h1'), 'Khalid books a free, private session with a <b>licensed genetic counsellor</b>…', zoom=1.5, hold=1.5, name='book')
    show.act(first_visible(L, 'button:has-text("Request this time")', timeout=25000), '…choosing a time that suits them.', zoom=1.8, hold=2, name='slot')
    show.cut_start(); show.layout('R'); sign_in(show, 'R', 'counsellor'); show.tag('R', 'Genetic counsellor'); go(show, 'R', '/app/schedule'); show.cut_end()
    cid = couple_id()
    review = first_visible(R, f'button.btn-review-request:has-text("{cid}")', 'button.btn-review-request', timeout=30000)
    show.act(review, 'The counsellor sees the request…', zoom=1.9, hold=1, name='review')
    show.act(first_visible(R, 'button:has-text("Accept Request")'), '…and confirms it. Both calendars update.', zoom=1.9, hold=1.5, name='acceptreq')
    show.layout('L'); go(show, 'L', '/app/tracker'); show.wait(2.5)
    show.look(first_visible(L, '.cpt-stepper, .cpt-progress, h1'), 'Their <b>Personal Tracker</b> follows every step: screening → counselling → planning → pregnancy → newborn.', zoom=1.3, hold=4, name='tracker')

    # 7. the DaNA guide (chatbot) with voice
    go(show, 'L', '/app'); show.wait(2)
    show.act(L.locator('.as-fab'), 'Questions any time: the <b>DaNA guide</b>, with answers from their own result.', zoom=1.8, hold=1, name='fab')
    show.act(first_visible(L, '.as-chips button:has-text("Can we still marry")'), zoom=1.6, hold=1.5, name='chip')
    en = L.locator('.as-msg.dana').last.inner_text().split('\n')[0]
    show.act(L.locator('.as-msg.dana').last.locator('.as-play'), 'Every answer can be <b>read aloud</b>…', zoom=1.8, hold=0.3, name='listen_en')
    wav = OUT / 'voice_en.wav'; english_wav(en, str(wav)); show.sounds.append((show.t(), wav))
    show.wait(min(9, 0.07 * len(en)))
    show.act(L.locator('.as-input input'), '…or typed, or asked by voice with the microphone.', zoom=1.8, type_text='Is it my fault?', hold=0.5, name='type')
    L.locator('.as-input input').press('Enter'); show.wait(1.5)
    show.act(L.locator('.as-msg.dana').last.locator('.as-langs button:has-text("العربية")'), 'Every answer also in <b>Arabic and Urdu</b>, with a natural voice.', zoom=1.8, hold=1, name='ar')
    last_tts.clear()
    show.act(L.locator('.as-msg.dana').last.locator('.as-play'), zoom=1.8, hold=0.2, name='listen_ar')
    t_ar = show.t()
    end = time.time() + 25
    while not last_tts.get('body') and time.time() < end:
        show.wait(0.5)
    if last_tts.get('body'):
        wav = OUT / 'voice_ar.wav'; wav.write_bytes(last_tts['body']); show.sounds.append((t_ar, wav))
    show.wait(6)
    tap(L.locator('.as-x')); show.wait(0.6)

    # 8. the whole app in three languages
    show.act(L.locator('.lang-sw button[lang=ar]'), 'One tap switches the whole app to <b>Arabic</b>, right to left…', zoom=2.0, hold=2.5, name='lang_ar')
    show.act(L.locator('.lang-sw button[lang=ur]'), '…or <b>Urdu</b>.', zoom=2.0, hold=2.5, name='lang_ur')
    show.act(L.locator('.lang-sw button[lang=en]'), zoom=2.0, hold=1, name='lang_en')

    # 9. family + privacy
    go(show, 'L', '/app/privacy'); show.wait(2)
    show.look(first_visible(L, '.card:has-text("Who saw my data")'), '<b>Privacy</b>: Khalid sees every person who opened his data, and can withdraw consent.', zoom=1.5, hold=3, name='privacy')

    # 10. the health system view
    show.cut_start(); show.layout('R'); sign_in(show, 'R', 'admin'); show.tag('R', 'DoH programme team'); go(show, 'R', '/app/metrics'); show.cut_end()
    show.look(first_visible(R, '.stats'), 'The DoH measures <b>understanding, counselling uptake and fairness across languages</b>.', zoom=1.35, hold=3.5, name='metrics')
    show.look(first_visible(R, '.mt-why'), 'Success is understanding and access, <b>never whether a marriage goes ahead</b>.', zoom=1.5, hold=3, name='why')

    # 11. end
    show.cap('')
    show.card('DaNA', 'Understand. Choose. Together.', 'Private by design · Arabic · English · Urdu', secs=4)


# ------------------------------------------------------------------ build the final video
def build(video, show):
    import imageio_ffmpeg
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    dur = show.t()
    keep, last = [], 0.0
    for a, b in sorted(show.cuts):
        if a > last: keep.append((last, a))
        last = max(last, b)
    keep.append((last, dur))
    expr = '+'.join(f'between(t,{a:.2f},{b:.2f})' for a, b in keep)

    def mapped(t):  # where a moment of the raw video lands after the cuts
        return t - sum(min(b, t) - a for a, b in show.cuts if a < t)

    cmd = [ff, '-y', '-i', str(video)]
    for _, wav in show.sounds:
        cmd += ['-i', str(wav)]
    vf = f"select='{expr}',setpts=N/FRAME_RATE/TB"
    if show.sounds:
        parts = ''.join(f'[{i + 1}:a]adelay={int(mapped(t) * 1000)}:all=1[a{i}];' for i, (t, _) in enumerate(show.sounds))
        mix = ''.join(f'[a{i}]' for i in range(len(show.sounds))) + f'amix=inputs={len(show.sounds)}:normalize=0[aout]'
        cmd += ['-filter_complex', f'[0:v]{vf}[v];{parts}{mix}', '-map', '[v]', '-map', '[aout]']
    else:
        cmd += ['-vf', vf]
    out = OUT / 'dana-demo.mp4'
    cmd += ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium']
    if show.sounds:
        cmd += ['-c:a', 'aac', '-b:a', '160k']
    cmd += ['-movflags', '+faststart', str(out)]
    subprocess.run(cmd, check=True)
    total = sum(b - a for a, b in keep)
    log(f'final video: {out}  ({total:.0f} s after cuts)')


def main():
    prepare()
    srv = serve_stage()
    with sync_playwright() as p:
        b = p.chromium.launch(channel='chrome', args=['--autoplay-policy=no-user-gesture-required'])
        ctx = b.new_context(viewport={'width': 1920, 'height': 1080}, device_scale_factor=1,
                            record_video_dir=None if DRY else str(OUT / 'raw'), record_video_size={'width': 1920, 'height': 1080})
        pg = ctx.new_page()
        pg.goto(f'http://localhost:{STAGE_PORT}/stage.html')
        show = Show(pg)
        ok = True
        try:
            run(show, ctx)
        except Exception as e:
            ok = False
            log('STOPPED:', e)
            pg.screenshot(path=str(OUT / 'stopped.png'))
        video = pg.video.path() if pg.video else None
        ctx.close(); b.close()
    srv.shutdown()
    log('timeline seconds (raw):', round(show.t()), 'cuts:', [(round(a), round(b)) for a, b in show.cuts])
    if not DRY and video and ok:
        build(video, show)


if __name__ == '__main__':
    main()
