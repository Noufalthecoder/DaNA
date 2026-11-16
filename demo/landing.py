"""
DaNA intro: the landing page, scrolled smoothly so every animation plays, with captions,
ending on "Login with UAE PASS" -> "Sign in with UAE PASS".   Output: demo/out/DaNA-intro.mp4

Run (web app running on 5173):  py -3.13 demo/landing.py
"""
import sys, time
sys.argv = [sys.argv[0]]
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent))
import record as R
from playwright.sync_api import sync_playwright

SCROLL = """(el, [y, ms]) => new Promise((done) => {
  const s = window.scrollY, d = y - s, t0 = performance.now();
  const f = (t) => { const p = Math.min(1, (t - t0) / ms); const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    window.scrollTo(0, s + d * e); p < 1 ? requestAnimationFrame(f) : done(); };
  requestAnimationFrame(f); })"""
TOP = "(_b, sel) => { const el = document.querySelector(sel); return el ? el.getBoundingClientRect().top + window.scrollY : null }"


def main():
    srv = R.serve_stage()
    with sync_playwright() as p:
        b = p.chromium.launch(channel='chrome')
        ctx = b.new_context(viewport={'width': 1920, 'height': 1080}, record_video_dir=str(R.OUT / 'raw_intro'),
                            record_video_size={'width': 1920, 'height': 1080})
        pg = ctx.new_page()
        pg.goto(f'http://localhost:{R.STAGE_PORT}/stage.html')
        show = R.Show(pg)
        F = R.frame(pg, 'L')
        body = F.locator('body')

        def scroll_to(sel, offset=-60, ms=2200):
            y = body.evaluate(TOP, sel)
            if y is not None:
                body.evaluate(SCROLL, [max(0, y + offset), ms])

        def scroll_by(px, ms):
            y = body.evaluate('() => window.scrollY')
            body.evaluate(SCROLL, [y + px, ms])

        # load (cut): signed out, English
        show.cut_start()
        show.layout('L'); show.cap('')
        R.go(show, 'L', '/login'); body.evaluate("() => { localStorage.clear(); sessionStorage.clear(); }")
        show.js('([id, u]) => stage.load(id, u)', ['L', 'about:blank']); show.wait(0.4)
        show.js('([id, u]) => stage.load(id, u)', ['L', f'{R.L_URL}/#/']); show.wait(4)
        show.cut_end()

        # ~32 seconds: the strongest moments only
        # 1. hero (title animates in)
        show.wait(0.4)
        show.cap('Meet <b>DaNA</b>: premarital genetic screening for every couple in the UAE.'); show.wait(2.4)
        show.look(F.locator('.hero .lead'), 'One test result, explained in <b>plain, calm words</b>: Arabic, English and Urdu.', zoom=1.6, hold=4.5)

        # 2. the key message (words light up while scrolling)
        show.cap('Carrying a gene is common. <b>Carriers are healthy</b>, and there is always a plan.')
        scroll_to('.statement', offset=-120, ms=1000); scroll_by(520, 2300); show.wait(0.5)

        # 3. three journeys (cards stack)
        show.cap('<b>Roots</b>: understand it. <b>Bonds</b>: plan together. <b>Branches</b>: protect the family.')
        scroll_to('#how', offset=-40, ms=900); scroll_by(2500, 4300); show.wait(0.3)

        # 4. one result protects a whole family
        show.cap('One result can protect a <b>whole family</b>: private, anonymous invitations for relatives.')
        scroll_to('#tree', offset=120, ms=1300); show.wait(3.0)

        # 5. trust
        show.cap('<b>Private by design</b>: consent first, data stays in the UAE, real genetic counsellors.')
        scroll_to('#trust', offset=-30, ms=1000); show.wait(1.9)

        # 6. back to the top (cut) and sign in with UAE PASS
        show.cut_start(); body.evaluate(SCROLL, [0, 600]); show.wait(1.2); show.cut_end()
        btn = F.locator('.hero a.btn-green').first
        show.act(btn, 'Start with <b>UAE PASS</b>, the national digital identity.', zoom=2.0, hold=0.05, name='login')
        show.cut_start(); R.first_visible(F, 'button:has-text("Sign in with UAE PASS")', timeout=20000); show.wait(1.8); show.cut_end()
        show.act(F.locator('button:has-text("Sign in with UAE PASS")'), 'One tap: <b>Sign in with UAE PASS</b>.', zoom=2.0, hold=1.2, name='uaepass')
        show.wait(1.2)
        show.look(R.first_visible(F, '.login-card'), 'Verified identity. The journey begins.', zoom=1.4, hold=2.6)
        show.cap(''); show.wait(0.3)

        video = pg.video.path()
        ctx.close(); b.close()
    srv.shutdown()

    # same build as the main video, saved under its own name
    out_main = R.OUT / 'dana-demo.mp4'
    backup = out_main.read_bytes() if out_main.exists() else None
    R.build(video, show)
    (R.OUT / 'DaNA-intro.mp4').write_bytes(out_main.read_bytes())
    if backup is not None:
        out_main.write_bytes(backup)
    R.log('intro video:', R.OUT / 'DaNA-intro.mp4')


if __name__ == '__main__':
    main()
