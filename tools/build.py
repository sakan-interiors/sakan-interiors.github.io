"""Builds the portfolio site from src/ into two folders:

  dist/      complete static site for free hosting (Cloudflare Pages)
  artifact/  same files, with index.html in the Artifact page format

Content lives in src/data/site.json and src/data/projects.json.
Usage: python3 tools/build.py
"""
import html, json, os, re, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
SITE = json.load(open(os.path.join(SRC, 'data', 'site.json')))
PROJECTS = json.load(open(os.path.join(SRC, 'data', 'projects.json')))
STUDIO = json.load(open(os.path.join(SRC, 'data', 'studio.json')))   # the client's own text, Arabic + English
TYPES = []
for p in PROJECTS:
    if p['type'] not in TYPES:
        TYPES.append(p['type'])
IMG_EXT = '.svg'  # drawn placeholders; real photos are hNN and come from src/photos
PHOTO_DIR = os.path.join(SRC, 'photos')
PHOTOS = {}
for f in sorted(os.listdir(PHOTO_DIR)) if os.path.isdir(PHOTO_DIR) else []:
    m = re.match(r'(h\d+)-(\d+)\.webp$', f)
    if m:
        PHOTOS.setdefault(m.group(1), set()).add(int(m.group(2)))
FONTS = ('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400'
         '&family=Onest:wght@400;500&family=Tajawal:wght@400;500;700&display=swap')

e = lambda s: html.escape(str(s), quote=True)


def dims(name):
    """Natural size of a photo, so the browser knows its shape before it loads."""
    if name not in PHOTOS:
        return 1600, 1600
    from PIL import Image
    w = max(PHOTOS[name])
    with Image.open(os.path.join(PHOTO_DIR, f'{name}-{w}.webp')) as im:
        return im.size


def img(name, sizes=None):
    """Path for an image. Real photos (hNN) get the 1920px file, or the largest under it;
    with `sizes` the return value also closes src and adds srcset/sizes (used inside src="...")."""
    if name not in PHOTOS:
        return f'img/{name}{IMG_EXT}'
    widths = sorted(PHOTOS[name])
    mid = max([w for w in widths if w <= 1920] or widths[:1])
    src = f'img/{name}-{mid}.webp'
    if not sizes or len(widths) < 2:
        return src
    srcset = ', '.join(f'img/{name}-{w}.webp {w}w' for w in widths)
    return f'{src}" srcset="{srcset}" sizes="{sizes}'


def shape(name):
    """Width / height of a photo."""
    w, h = dims(name)
    return w / h


def sized(name):
    """width, height and --ar for an <img>, so CSS can size it to the photo's own shape."""
    w, h = dims(name)
    return f'width="{w}" height="{h}" style="--ar:{w / h:.3f}"'


def srcset(name):
    widths = sorted(PHOTOS.get(name, []))
    return ', '.join(f'img/{name}-{w}.webp {w}w' for w in widths) or img(name)


def zoom(name):
    """Attributes that let a photo open in the viewer: its shape and its largest file."""
    full = f'img/{name}-{max(PHOTOS[name])}.webp' if name in PHOTOS else img(name)
    return f' data-zoom data-full="{full}" data-ar="{shape(name):.4f}"'


def bi(t, tag='p', cls=''):
    """The same text in Arabic and English; the page shows one (data-lang on the page)."""
    c = f'{cls} ' if cls else ''
    return f'<{tag} class="{c}t-ar" lang="ar" dir="rtl">{e(t["ar"])}</{tag}><{tag} class="{c}t-en" lang="en">{e(t["en"])}</{tag}>'


def page_url(p):
    return f'project-{p["slug"]}.html'


# ---------- icons ----------
def svg(view, d, cls='icon'):
    return f'<svg class="{cls}" viewBox="{view}" aria-hidden="true" focusable="false"><path d="{d}"/></svg>'

ARROW_R = svg('0 0 72 48', 'M0 24H70M46 1l24 23-24 23')
ARROW_L = svg('0 0 72 48', 'M72 24H2M26 1L2 24l24 23')
ARROW_UP = svg('0 0 18 72', 'M9 72V2M1 10l8-8 8 8')
BACK = svg('0 0 22 14', 'M22 7H1.5M7.5 1L1.5 7l6 6')
PLUS = svg('0 0 26 26', 'M13 1v24M1 13h24')
MINUS = svg('0 0 26 26', 'M1 13h24')
CHEVRON = svg('0 0 18 18', 'M.5 4.5L9 13l8.5-8.5')
CLOSE = svg('0 0 20 20', 'M1 1l18 18M19 1L1 19')
SHARE = svg('0 0 24 24', 'M12 15V2.5M7 7.5l5-5 5 5M7 11H4v11h16V11h-3')
KNOB = svg('0 0 24 12', 'M8 1L2 6l6 5M16 1l6 5-6 5')
# drawings for the seven steps and the philosophy, in the thin line of the logo
ART = {
    'plan': svg('0 0 64 64', 'M8 10h48v44H8zM8 32h18M34 32h22M30 10v14M30 54V40M34 32a8 8 0 0 0-8 8', 'art'),
    'chair': svg('0 0 64 64', 'M16 31v-9a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v9M10 31a4 4 0 0 1 8 0v9h28v-9a4 4 0 0 1 8 0v14H10zM15 45v7M49 45v7', 'art'),
    'ruler': svg('0 0 64 64', 'M8 46L46 8l10 10-38 38zM15 39l5 5M21 33l7 7M27 27l5 5M33 21l7 7M39 15l5 5', 'art'),
    'list': svg('0 0 64 64', 'M16 12h32v44H16zM25 8h14v8H25zM23 27h4M31 27h12M23 36h4M31 36h12M23 45h4M31 45h8', 'art'),
    'bricks': svg('0 0 64 64', 'M8 14h48v36H8zM8 26h48M8 38h48M24 14v12M40 14v12M16 26v12M32 26v12M48 26v12M24 38v12M40 38v12', 'art'),
    'check': svg('0 0 64 64', 'M42 27a15 15 0 1 1-30 0 15 15 0 0 1 30 0zM38 38l17 17M20 27l5 5 9-10', 'art'),
    'key': svg('0 0 64 64', 'M30 38a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM27 31L52 6M44 14l6 6M38 20l5 5', 'art'),
    'arch': svg('0 0 64 96', 'M6 94V40C6 24 20 12 32 3c12 9 26 21 26 37v54M16 94V44c0-11 8-19 16-25 8 6 16 14 16 25v50', 'art'),
}
STEP_ART = ['plan', 'chair', 'ruler', 'list', 'bricks', 'check', 'key']
# each project has its own colour (its card and its whole page), picked to contrast with its
# cover: dark photos get the light colour, light photos olive or brown in turn
TYPE_AR = {'Residential': 'سكني'}


def cover_lum(name):
    from PIL import Image
    w = min(PHOTOS[name]) if name in PHOTOS else None
    if not w:
        return 128
    with Image.open(os.path.join(PHOTO_DIR, f'{name}-{w}.webp')) as im:
        r, g, b = [sum(c) / len(c) for c in zip(*im.convert('RGB').resize((48, 48)).getdata())]
    return .2126 * r + .7152 * g + .0722 * b


def poster_tones():
    dark = ['olive', 'brown']
    tones, k = {}, 0
    for p in PROJECTS:
        if cover_lum(p['cover']) < 100:
            tones[p['slug']] = 'cream'
        else:
            tones[p['slug']] = dark[k % len(dark)]; k += 1
    return tones


POSTER_TONES = poster_tones()
# a photo for each step that shows what its words describe (none of them a project cover, nor a near copy of one)
STEP_PHOTOS = ['h07', 'h30', 'h03', 'h21', 'h38', 'h20', 'h16']
PALETTE = (('#554D35', 'Olive'), ('#856F5B', 'Taupe'), ('#A78E76', 'Sand'), ('#D5C5B1', 'Cream'), ('#513B2A', 'Brown'))
SWATCHES = ''.join(f'<li style="--c:{c}"><span class="swatches__name">{n}</span></li>' for c, n in PALETTE)


# ---------- shared parts ----------
def header(page):
    cur = lambda name: ' is-current' if page == name else ''
    back = '' if page == 'home' else f'<a class="back-link" href="index.html#content" data-back aria-label="Back"{" hidden" if page == "spa" else ""}>{BACK}</a>'
    return f'''<header class="site-header" data-header>
  {back}
  <nav class="nav nav--left" aria-label="Main">
    <a class="nav-link{cur('projects')}" href="projects.html" data-mega-trigger aria-haspopup="true" aria-expanded="false" aria-controls="mega">Projects</a>
    <a class="nav-link{cur('about')}" href="about.html">About</a>
    <a class="nav-link{cur('contact')}" href="contact.html">Contact</a>
  </nav>
  <a class="wordmark" href="index.html#content">{e(SITE["name"])}</a>
  <nav class="nav nav--right" aria-label="Follow and message">
    {ig_link(' class="nav-link"')}
    <button class="nav-link" type="button" data-panel-open>Message</button>
  </nav>
  <button class="menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="mmenu"><span class="menu-toggle__open">Menu</span><span class="menu-toggle__close" aria-label="Close menu">{CLOSE}</span></button>
</header>
{mega()}
{mobile_menu()}'''


ABOUT_LINKS = [('about.html#about-story', 'Our story'), ('about.html#about-steps', 'Our process'), ('about.html#about-why', 'Why SAKAN'), ('about.html#about-philosophy', 'Our philosophy'), ('about.html#about-places', 'Where we work')]


def ig_link(cls=''):
    """Instagram and email show only once there is an address for them in site.json."""
    return f'<a{cls} href="{e(SITE["instagram"])}" target="_blank" rel="noopener">Instagram</a>' if SITE.get('instagram') else ''


def mail_link():
    return f'<a href="mailto:{e(SITE["email"])}">Email</a>' if SITE.get('email') else ''


def wa_link(text='Hello SAKAN Interiors, I saw your portfolio and would like to talk about my home.'):
    from urllib.parse import quote
    digits = re.sub(r'\D', '', SITE['whatsapp'])
    return f'https://wa.me/{digits}?text={quote(text)}'


def tel_link():
    return 'tel:' + re.sub(r'[^\d+]', '', SITE['phone'])


def contact_card(heading_tag='h2', cls=''):
    """The way to reach the designer: WhatsApp first, then call (Instagram and email when there are any), share, save."""
    more = ''.join(f'<li>{x}</li>' for x in (ig_link(), mail_link()) if x)
    return f'''<section class="ccard{cls}" aria-labelledby="cc-{heading_tag}">
  <p class="kicker">Contact</p>
  <{heading_tag} class="ccard__title" id="cc-{heading_tag}">Let's design your home</{heading_tag}>
  <p class="ccard__ar" lang="ar" dir="rtl">{e(SITE["tagline_ar"])}</p>
  <div class="ccard__actions">
    <a class="btn btn--gold" href="{e(wa_link())}" target="_blank" rel="noopener">WhatsApp</a>
    <a class="btn" href="{e(tel_link())}">Call</a>
  </div>
  <ul class="ccard__links">
    {more}
    <li><button type="button" data-share>Share this portfolio</button></li>
    <li><button type="button" data-vcard>Save our number</button></li>
  </ul>
</section>'''


def mega():
    cats = ''.join(f'<li><button type="button" data-mega-cat="{e(t)}">{e(t)}</button></li>' for t in TYPES)
    items = ''.join(f'<li data-mega-item data-type="{e(p["type"])}"><a href="{page_url(p)}" data-img="{img(p["cover"])}">{e(p["title"])}</a></li>' for p in PROJECTS)
    return f'''<div class="mega" id="mega" data-mega>
  <div class="mega__col"><p class="mega__label">Projects</p><ul><li><button type="button" class="is-active" data-mega-cat="all">All projects</button></li>{cats}</ul></div>
  <div class="mega__col"><p class="mega__label">Selected</p><ul>{items}</ul></div>
  <div class="mega__col"><p class="mega__label">Studio</p><ul>{''.join(f'<li><a href="{h}">{n}</a></li>' for h, n in ABOUT_LINKS[:4])}<li><a href="contact.html">Contact</a></li></ul></div>
  <div class="mega__col mega__preview"><img data-mega-preview src="{img(PROJECTS[0]["cover"])}" alt=""></div>
</div>'''


def mobile_menu():
    cats = ''.join(f'<li><a href="{page_url(p)}">{e(p["title"])}</a></li>' for p in PROJECTS)
    return f'''<div class="mmenu" id="mmenu" data-mmenu>
  <div class="mmenu__tabs" role="tablist" aria-label="Menu">
    <button class="mmenu__tab" type="button" role="tab" id="mt-projects" aria-selected="true" aria-controls="mm-projects">Projects</button>
    <button class="mmenu__tab" type="button" role="tab" id="mt-about" aria-selected="false" aria-controls="mm-about">About</button>
    <button class="mmenu__tab" type="button" role="tab" id="mt-contact" aria-selected="false" aria-controls="mm-contact">Contact</button>
  </div>
  <ul class="mmenu__list" id="mm-projects" role="tabpanel" aria-labelledby="mt-projects"><li><a href="projects.html">All projects</a></li>{cats}</ul>
  <ul class="mmenu__list" id="mm-about" role="tabpanel" aria-labelledby="mt-about" hidden>{''.join(f'<li><a href="{h}">{n}</a></li>' for h, n in ABOUT_LINKS)}</ul>
  <ul class="mmenu__list" id="mm-contact" role="tabpanel" aria-labelledby="mt-contact" hidden><li><a href="{e(wa_link())}" target="_blank" rel="noopener">WhatsApp</a></li><li><a href="{e(tel_link())}">Call</a></li>{''.join(f'<li>{x}</li>' for x in (ig_link(), mail_link()) if x)}</ul>
  <div class="mmenu__foot"><button class="pill" type="button" data-panel-open>Send a message</button>{ig_link(' class="pill"')}</div>
</div>'''


def panel():
    types = ['A new home', 'Full renovation', 'One room', 'Kitchen or bathroom', 'Furniture and styling', 'Something else']
    opts = ''.join(f'<option>{e(t)}</option>' for t in types)
    return f'''<div class="scrim" data-scrim></div>
<aside class="panel" data-panel role="dialog" aria-modal="false" aria-hidden="true" aria-labelledby="panel-title">
  <div class="panel__head"><h2 class="panel__title" id="panel-title">Send a message</h2><button class="panel__close" type="button" data-panel-close aria-label="Close">{CLOSE}</button></div>
  <p class="panel__text">Tell us about your home and what you have in mind. Your message opens in WhatsApp, ready to send.</p>
  <form class="form" novalidate>
    <div class="field"><label for="msg-name">Your name</label><input id="msg-name" name="name" autocomplete="name"></div>
    <div class="field"><label for="msg-phone">Phone</label><input id="msg-phone" name="phone" type="tel" autocomplete="tel"></div>
    <div class="field"><label for="msg-type">Project</label><select id="msg-type" name="type"><option value="">Choose one</option>{opts}</select></div>
    <div class="field"><label for="msg-message">Message</label><textarea id="msg-message" name="message" placeholder="The space, the timing, anything that matters to you"></textarea></div>
    <div class="form__actions"><a class="pill pill--solid" data-send-whatsapp href="https://wa.me/" target="_blank" rel="noopener">Send on WhatsApp</a>{f'<a class="pill" data-send-email href="mailto:{e(SITE["email"])}">Send by email</a>' if SITE.get("email") else ""}</div>
  </form>
  <div class="panel__direct">
    <p><strong>Phone</strong> {e(SITE["phone"])} · <button type="button" data-copy="{e(SITE["phone"])}"><u>Copy</u></button></p>
    {f'<p><strong>Email</strong> {e(SITE["email"])} · <button type="button" data-copy="{e(SITE["email"])}"><u>Copy</u></button></p>' if SITE.get("email") else ""}
  </div>
</aside>'''


def footer():
    def col(key, title, items):
        lis = ''.join(f'<li>{i}</li>' for i in items)
        return f'''<section class="fcol" aria-labelledby="fh-{key}"><h3><button class="fcol__head" id="fh-{key}" type="button" data-acc aria-expanded="false" aria-controls="fb-{key}">{title}{PLUS}</button></h3><div class="fcol__body" id="fb-{key}"><ul>{lis}</ul></div></section>'''
    return f'''<footer class="site-footer">
  <div class="fcols">
    {col('projects', 'Projects', ['<a href="projects.html">All projects</a>'] + [f'<a href="{page_url(p)}">{e(p["title"])}</a>' for p in PROJECTS])}
    {col('about', 'About', [f'<a href="{h}">{n}</a>' for h, n in ABOUT_LINKS])}
    {col('contact', 'Contact', [f'<a href="{e(wa_link())}" target="_blank" rel="noopener">WhatsApp</a>', f'<a href="{e(tel_link())}">Call</a>'] + [x for x in (ig_link(), mail_link()) if x])}
  </div>
  <div class="footer__brand" aria-hidden="true"><p class="footer__mark">{e(SITE["name"])}</p><p class="footer__tag" lang="ar" dir="rtl">{e(SITE["tagline_ar"])}</p></div>
  <p class="copyright">© {e(SITE["year"])} {e(SITE["full_name"])}. All rights reserved.</p>
  <a class="to-top" href="#" data-to-top aria-label="Back to top">{ARROW_UP}</a>
</footer>
<div class="lightbox" data-lightbox role="dialog" aria-modal="true" aria-label="Photo viewer" aria-hidden="true">
  <button class="arrow arrow--prev" type="button" data-prev aria-label="Previous photo">{ARROW_L}</button>
  <div class="lightbox__stage" data-lightbox-stage><img alt="" draggable="false"></div>
  <button class="arrow arrow--next" type="button" data-next aria-label="Next photo">{ARROW_R}</button>
  <p class="lightbox__count" data-lightbox-count></p>
  <button class="lightbox__close" type="button" data-lightbox-close aria-label="Close">{CLOSE}</button>
</div>'''


def connect(extra_cls=''):
    return f'''<section class="connect{extra_cls}">
  <p>{e(SITE["connect"])}</p>
  <div class="pills"><button class="pill" type="button" data-panel-open>Message</button>{ig_link(' class="pill"')}</div>
</section>'''


def trio(items, title=None, label='Materials and details', crumbs='', tone='', portrait=False, zoomable=False):
    """items: (image, caption) or (image, caption, href) tuples. zoomable: photos open in the viewer."""
    def item(it):
        i, t = it[0], it[1]
        inner = f'<img class="fade" src="{img(i, TRIO)}" alt="{e(t)}" loading="lazy"{zoom(i) if zoomable else ""}><span class="legend">{e(t)}</span>'
        return f'<a class="item" href="{it[2]}">{inner}</a>' if len(it) > 2 else f'<figure class="item">{inner}</figure>'
    figs = ''.join(item(it) for it in items)
    head = f'<h2 class="trio__title">{e(title)}</h2>' if title else f'<h2 class="sr-only">{e(label)}</h2>'
    cls = 'carousel trio' + (' trio--portrait' if portrait else '') + (f' {tone}' if tone else '')
    return f'''<section class="{cls}" data-carousel="step"{" data-zoom-group" if zoomable else ""} aria-label="{e(title or label)}">
  {crumbs}{head}
  <div class="rail">
    <button class="arrow arrow--prev" type="button" data-prev aria-label="Previous" hidden>{ARROW_L}</button>
    <button class="arrow arrow--next" type="button" data-next aria-label="Next">{ARROW_R}</button>
    <div class="track" data-track>{figs}</div>
  </div>
</section>'''


def acc(id_, title, body):
    return f'''<div class="acc" id="{id_}"><button class="acc__head" type="button" data-acc aria-expanded="false" aria-controls="acc-{id_}">{title}{CHEVRON}</button><div class="acc__body" id="acc-{id_}" role="region" aria-label="{e(title)}"><div class="acc__inner"><div class="acc__content">{body}</div></div></div></div>'''


def studio_block():
    addr = '<br>'.join(e(a) for a in SITE['address'])
    hours = '<br>'.join(e(h) for h in SITE['hours'])
    return f'<p>{addr}</p><p>{hours}</p><p>{e(SITE["phone"])}{"<br>" + e(SITE["email"]) if SITE.get("email") else ""}</p>'


SQ = '(min-width: 1024px) 25vw, 50vw'
DUO = '(min-width: 1024px) 50vw, 100vw'
TRIO = '(min-width: 1024px) 25vw, 66vw'


def more_line(p):
    bits = [b for b in (p['place'], p['year']) if b]
    return f'<span class="legend__more">{e(", ".join(bits))}</span>' if bits else ''


def arch(cx, w, spring, rise, sill, close=False):
    """The logo's pointed arch, `w` half-wide, standing on `sill`, its curve rising `rise` above `spring`."""
    c1, c2x, c2y = spring - .43 * rise, .46 * w, spring - .76 * rise
    return (f'M{cx - w:g} {sill:g}V{spring:g}C{cx - w:g} {c1:.1f} {cx - c2x:.1f} {c2y:.1f} {cx:g} {spring - rise:g}'
            f'C{cx + c2x:.1f} {c2y:.1f} {cx + w:g} {c1:.1f} {cx + w:g} {spring:g}V{sill:g}' + ('Z' if close else ''))


DOOR = (200, 40, 340, 64, 486)   # the doorway: centre x, half width, spring line, rise, sill


HOUSE = (-26, 160, 426, 500)   # the drawing's extent: left, roof, right, ground


def door_screen():
    """Opening screen: the house drawn in gold lines. Its door opens on the front page and we walk in
    (main.js swings the two leaves, cuts the doorway open and moves us through it)."""
    cx, w, spring, rise, sill = DOOR
    hole = arch(*DOOR, close=True)
    def window(x):
        return [arch(x, 22, 352, 38, 448), arch(x, 16, 356, 32, 444, True), f'M{x} 324V444M{x - 16} 380H{x + 16}', f'M{x - 28} 448H{x + 28}V453H{x - 28}Z']
    def lantern(x):
        return [f'M{x} 348V356M{x - 5} 362L{x} 356L{x + 5} 362ZM{x - 4} 362H{x + 4}L{x + 3} 377H{x - 3}Z']
    def cypress(x):
        return [f'M{x} 500V486M{x} 486C{x - 16} 470 {x - 15} 392 {x} 330C{x + 15} 392 {x + 16} 470 {x} 486ZM{x} 476V356']
    # a taller entrance block between two lower wings; (seconds before it starts drawing, path)
    lines = ([(.1, 'M100 170H92V160H308V170H300M100 178H300M100 170V500M300 170V500'),
              (.2, 'M100 262H2V254H100M300 254H398V262H300M10 268H100M300 268H390M10 262V500M390 262V500'),
              (.3, f'M10 490H{cx - w - 20}M{cx + w + 20} 490H390')]
             + [(.35, d) for d in cypress(-12) + cypress(412)]
             + [(.4, d) for d in window(55) + window(345)]
             + [(.5, arch(cx, w + 10, spring - 6, rise + 8, sill)), (.55, hole), (.6, f'M{cx} 238L{cx + 5} 244L{cx} 250L{cx - 5} 244Z')]
             + [(.65, d) for d in lantern(cx - w - 24) + lantern(cx + w + 24)]
             + [(.6, f'M{cx - w - 16} {sill}H{cx + w + 16}V493M{cx - w - 16} {sill}V493M{cx - w - 24} 493H{cx + w + 24}V500M{cx - w - 24} 493V500')])
    paths = ''.join(f'<path class="door__dl" data-d="{t}" d="{d}"/>' for t, d in lines)
    glass = ''.join(f'<path d="{arch(x, 16, 356, 32, 444, True)}"/>' for x in (55, 345))
    return f'''<div class="prehome prehome--door" data-prehome role="button" tabindex="0" aria-label="Enter the site">
  <svg class="door" data-door="{" ".join(f"{v:g}" for v in DOOR)}" data-house="{" ".join(f"{v:g}" for v in HOUSE)}" viewBox="-26 120 452 420" aria-hidden="true">
    <defs>
      <clipPath id="door-hole"><path data-hole d="{hole}"/></clipPath>
      <radialGradient id="door-light" gradientUnits="userSpaceOnUse" cx="{cx}" cy="{sill}" r="230"><stop offset="0" stop-color="#FFF8EC"/><stop offset="1" stop-color="#FFF8EC" stop-opacity="0"/></radialGradient>
    </defs>
    <path class="door__sky" fill-rule="evenodd" data-cut d="M-3000 -3000H3400V3000H-3000Z"/>
    <g class="door__soft" style="--d:.45s">
      <path class="door__earth" d="M-3000 500H3400V3000H-3000Z"/>
      <path class="door__wall" fill-rule="evenodd" data-cut d="M10 500V262H2V254H100V170H92V160H308V170H300V254H398V262H390V500Z"/>
    </g>
    <g class="door__soft door__glass" style="--d:.6s">{glass}</g>
    <g clip-path="url(#door-hole)">
      <path class="door__light" data-door-light d="{hole}"/>
      <g class="door__soft" style="--d:.7s"><path class="door__leaf" data-leaf/><path class="door__trim" data-trim/><path class="door__leaf" data-leaf/><path class="door__trim" data-trim/></g>
    </g>
    {paths}
    <path class="door__dl door__ground" data-d="0" data-ground d="M{cx} 500H-200"/><path class="door__dl door__ground" data-d="0" data-ground d="M{cx} 500H600"/>
  </svg>
  <p class="door__words"><span class="door__name">{e(SITE["name"])}</span><span class="door__sub">{e(SITE["sub"])}</span></p>
  <p class="door__tag" lang="ar" dir="rtl"><span>{e(SITE["tagline_ar"])}</span></p>
</div>'''


# ---------- pages ----------
# The front page tells the story in turns: the logo met in the doorway, who SAKAN is, the five
# projects, the philosophy, the seven steps, the areas and the invitation to talk.
HOME_PHOTOS = {'belief': 'h41'}   # a calm, symmetric room for the philosophy
HOME_WORK = {'04': 'h40'}   # project 04's cover opens the page, so its card shows another of its photos


def work_card(p, ph, sizes, lazy=True, thumbs=()):
    """A project as a small poster: number and name on its colour, the photo (and a few more of
    its photos), then type, photo count and the way in."""
    n = len(p['images'])
    t_ar = TYPE_AR.get(p['type'], p['type'])
    more = ''.join(f'<span><img class="fade" src="{img(x, "(min-width: 1024px) 12vw, 31vw")}" alt="" loading="lazy"></span>' for x in thumbs)
    more = f'<span class="work__thumbs">{more}</span>' if more else ''
    return f'''<a class="work work--{POSTER_TONES[p["slug"]]}" href="{page_url(p)}">
      <span class="work__head"><span class="work__num">{e(p["slug"])}</span><span class="work__name">{e(p["title"])}</span></span>
      <span class="work__photo"><img class="fade" src="{img(ph, sizes)}" alt="{e(p["title"])}"{" loading=\"lazy\"" if lazy else ""}></span>{more}
      <span class="work__foot"><span class="work__meta">{e(p["type"])} <span lang="ar">{e(t_ar)}</span></span><span class="work__meta">{n:02d} photos <span lang="ar">صورة</span></span><span class="work__go">View project {ARROW_R}</span></span>
    </a>'''


def home():
    S, H = STUDIO, HOME_PHOTOS
    works = ''.join(work_card(p, HOME_WORK.get(p['slug'], p['cover']), '(min-width: 1024px) 58vw, 100vw') for p in PROJECTS)
    steps = ''.join(
        f'<li><a class="process__card" href="about.html#step-{k + 1:02d}"><span class="process__photo"><img class="fade" src="{img(STEP_PHOTOS[k], "(min-width: 1024px) 24vw, 78vw")}" alt="" loading="lazy"><span class="process__num">{k + 1:02d}</span></span>'
        f'<span class="process__body"><span class="process__title">{e(s["title"]["en"])}</span><span class="process__ar" lang="ar" dir="rtl">{e(s["title"]["ar"])}</span><span class="process__sub">{e(s["sub"]["en"])}</span></span></a></li>'
        for k, s in enumerate(S['steps']))
    place = lambda p: f'<span class="marquee__item"><span>{e(p["en"])}</span><span lang="ar" dir="rtl">{e(p["ar"])}</span></span><span class="marquee__dot"></span>'
    places = ''.join(place(p) for p in S['places'])
    return door_screen() + f'''
<main id="content">
  <h1 class="sr-only">{e(SITE["full_name"])}, {e(SITE["role"])}</h1>
  <section class="cover" aria-label="{e(SITE["full_name"])}">
    <div class="cover__logo" data-door-view><img src="img/brand/logo-en.webp" width="1331" height="1447" alt="{e(SITE["full_name"])}"><span class="cover__sheen" aria-hidden="true"></span></div>
    <div class="cover__text" data-door-stop>
      <p class="cover__tag" lang="ar" dir="rtl"><span>{e(S["tagline"]["ar"])}</span></p>
      <p class="cover__en">{e(S["tagline"]["en"])}</p>
    </div>
  </section>
  <section class="hello" id="home-intro" aria-labelledby="hello-title">
    <div class="hello__top">
      <p class="kicker">{e(SITE["name"])}</p>
      <h2 class="hello__line" id="hello-title">{e(S["lede"]["en"])}</h2>
      <p class="hello__ar" lang="ar" dir="rtl">{e(S["lede"]["ar"])}</p>
    </div>
    <div class="hello__more">
      <p class="hello__p">{e(SITE["intro"])}</p>
      <ul class="swatches swatches--named" aria-label="Colour palette">{SWATCHES}</ul>
      <a class="quote__link" href="about.html">Our story</a>
    </div>
  </section>
  <section class="works" aria-labelledby="works-title">
    <div class="works__head"><h2 class="works__title" id="works-title">Projects</h2><p class="works__ar" lang="ar" dir="rtl">المشاريع</p><a class="works__all" href="projects.html">{len(PROJECTS):02d} homes · All projects</a></div>
    <div class="works__list">{works}</div>
  </section>
  <section class="belief" aria-label="{e(S["philosophy_title"]["en"])}">
    <img class="belief__img fade" src="{img(H["belief"], "(max-width: 1023px) 200vw, 100vw")}" alt="" loading="lazy">
    <div class="belief__text">
      <p class="kicker">{e(S["philosophy_title"]["en"])}</p>
      <p class="belief__line">{e(S["philosophy"][0]["en"])}</p>
      <p class="belief__ar" lang="ar" dir="rtl">{e(S["philosophy"][0]["ar"])}</p>
      <a class="pill pill--light" href="about.html#about-philosophy">Our philosophy</a>
    </div>
  </section>
  <section class="process" aria-labelledby="process-title">
    <div class="process__head"><h2 class="process__h" id="process-title">Our process</h2><p class="process__intro">{e(S["intro"][1]["en"])}</p></div>
    <ol class="process__list">{steps}</ol>
    <a class="pill pill--light" href="about.html#about-steps">Every step</a>
  </section>
  <section class="places-band" aria-labelledby="places-title">
    <h2 class="places-band__title" id="places-title">{e(S["places_title"]["en"])}</h2>
    <div class="marquee" aria-hidden="true"><div class="marquee__track">{places}{places}</div></div>
    <ul class="sr-only">{''.join(f'<li>{e(p["en"])}</li>' for p in S['places'])}</ul>
    <p class="places-band__more">{e(S["places_more"]["en"])} · <span lang="ar" dir="rtl">{e(S["places_more"]["ar"])}</span></p>
  </section>
  {contact_card()}
</main>'''


def spread(seq, n):
    """n items spread evenly through seq."""
    return [seq[round(k * len(seq) / n)] for k in range(n)] if len(seq) > n else list(seq)


def projects():
    def entry(k, p):
        return f'<li>{work_card(p, p["cover"], "(min-width: 1024px) 58vw, 100vw", lazy=k > 0, thumbs=spread(p["images"][1:], 3))}</li>'
    photos = sum(len(p['images']) for p in PROJECTS)
    return f'''<main id="content">
  <section class="works works--page" aria-labelledby="pl-title">
    <div class="works__head"><h1 class="works__title" id="pl-title">Projects</h1><p class="works__ar" lang="ar" dir="rtl">المشاريع</p><p class="works__all">{len(PROJECTS):02d} homes · {photos} photos</p></div>
    <ul class="works__list">{''.join(entry(k, p) for k, p in enumerate(PROJECTS))}</ul>
  </section>
</main>'''


def grid_place(spans, cols):
    """Where CSS grid (auto-flow: row dense) puts each photo: (row, column) for each span."""
    rows, at = [], []
    for s in spans:
        r = 0
        while True:
            while len(rows) <= r:
                rows.append([False] * cols)
            c = next((c for c in range(cols - s + 1) if not any(rows[r][c:c + s])), None)
            if c is not None:
                rows[r][c:c + s] = [True] * s
                at.append((r, c))
                break
            r += 1
    return at, rows


def grid_spans(spans, cols):
    """Photo widths (in columns) that leave no gap in the grid. When the photos don't fill the last
    row, one or two of them widen: a wide photo first, since widening a tall one crops it most."""
    base = [min(s, cols) for s in spans]
    def gaps(sp):
        return sum(r.count(False) for r in grid_place(sp, cols)[1])
    def cost(sp):   # how much widening crops: wide photos stretch easily, tall ones do not
        return sum((n - s) * (1 if s > 1 else 3) for n, s in zip(sp, base))
    if not gaps(base):
        return base
    best = None
    tries = [(k,) for k in range(len(base))] + [(j, k) for k in range(len(base)) for j in range(k)]
    for ks in tries:
        for extra in ([(a,) for a in range(1, cols)] if len(ks) == 1 else [(a, b) for a in range(1, cols) for b in range(1, cols)]):
            sp = list(base)
            for k, x in zip(ks, extra):
                sp[k] = min(cols, sp[k] + x)
            if not gaps(sp):
                key = (cost(sp), -max(ks))   # the least cropping, then as late in the series as possible
                if best is None or key < best[0]:
                    best = (key, sp)
        if best and len(ks) == 1 and ks[0] == len(base) - 1:
            break
    return best[1] if best else base


def project(p, i):
    """The whole page on the project's colour: the cover, every other photo together in one grid,
    one of the studio's own lines, the next project."""
    nxt = PROJECTS[(i + 1) % len(PROJECTS)]
    count = len(p['images'])
    cover = p['images'][0]
    num = {x: k + 1 for k, x in enumerate(p['images'])}
    rest = p['images'][1:]
    ph, dk = grid_spans([2 if shape(x) > 1.05 else 1 for x in rest], 2), grid_spans([2 if shape(x) > 1.05 else 1 for x in rest], 4)
    def tile(k, x):
        cls = ''.join(f' {bp}{n}' for bp, n in (('ph', ph[k]), ('dk', dk[k])) if n > 1) + (' is-tall' if shape(x) <= 1.05 else '')
        sizes = f'(min-width: 1024px) {25 * dk[k]}vw, {50 * ph[k]}vw'
        return f'<figure class="shot{cls}"><img class="fade" src="{img(x, sizes)}" alt="{e(p["title"])}, photo {num[x]}" loading="lazy"{zoom(x)}><figcaption class="shot__n">{num[x]:02d} / {count:02d}</figcaption></figure>'
    # every photo of the house together, in order; then one of the studio's five reasons,
    # a different one on each project
    w = STUDIO['why'][i % len(STUDIO['why'])]
    body_ = f'''<section class="p-grid" aria-label="Photos of {e(p["title"])}">{"".join(tile(k, x) for k, x in enumerate(rest))}</section>
  <blockquote class="pquote">
      <span class="pquote__mark" aria-hidden="true"></span>
      <p class="pquote__title" lang="ar" dir="rtl">{e(w["title"]["ar"])}</p>
      <p class="pquote__en">{e(w["title"]["en"])}</p>
      <p class="pquote__text" lang="ar" dir="rtl">{e(w["text"]["ar"])}</p>
      <p class="pquote__text pquote__text--en">{e(w["text"]["en"])}</p>
    </blockquote>'''
    text = f'<section class="p-info"><div class="p-info__text"><p class="lede">{e(p["text"])}</p></div></section>' if p['text'] else ''
    cw, ch = dims(cover)
    return f'''<main id="content" data-zoom-group data-tone="{POSTER_TONES[p["slug"]]}">
  <div class="p-top">
    <figure class="p-cover"><img src="{img(cover, "100vw")}" width="{cw}" height="{ch}" alt="{e(p["title"])}, photo 1"{zoom(cover)}></figure>
  </div>
  <div class="p-bar" data-pbar>
    <h1 class="p-bar__title">{e(p["title"])}</h1>{f'<span class="p-bar__place">{e(p["place"])}</span>' if p["place"] else ''}
    <span class="p-bar__icons"><button type="button" data-share aria-label="Share this project">{SHARE}</button><a href="projects.html" aria-label="Close and see all projects">{CLOSE}</a></span>
  </div>
  {text}
  {body_}
  <a class="p-next" href="{page_url(nxt)}"><img class="fade" src="{img(nxt["cover"], "100vw")}" alt="" loading="lazy"><span class="p-next__text"><span class="p-next__label">Next project</span><span class="p-next__title">{e(nxt["title"])}</span></span><span class="p-next__arrow">{ARROW_R}</span></a>
</main>'''


def about():
    """The SAKAN page: the brand board's layout, filled with the client's own text."""
    S = STUDIO
    def step(k, st):
        paras = ''.join(bi(t) for t in st['text'])
        lst = ''
        if st.get('list'):
            lst = (f'<ul class="step__list t-ar" lang="ar" dir="rtl">{"".join(f"<li>{e(i["ar"])}</li>" for i in st["list"])}</ul>'
                   f'<ul class="step__list t-en" lang="en">{"".join(f"<li>{e(i["en"])}</li>" for i in st["list"])}</ul>')
        after = ''.join(bi(t) for t in st.get('after', []))
        return f'''<article class="step" id="step-{k + 1:02d}">
      <div class="step__head" aria-hidden="true"><p class="step__num">{k + 1:02d}</p>{ART[STEP_ART[k % len(STEP_ART)]]}</div>
      <figure class="step__photo"><img class="fade" src="{img(STEP_PHOTOS[k % len(STEP_PHOTOS)], "(min-width: 1024px) 50vw, 100vw")}" alt="" loading="lazy"{zoom(STEP_PHOTOS[k % len(STEP_PHOTOS)])}></figure>
      <div class="step__text">{bi(st["title"], "h3", "step__title")}{bi(st["sub"], "p", "step__sub")}{paras}{lst}{after}</div>
    </article>'''
    steps = ''.join(step(k, st) for k, st in enumerate(S['steps']))
    why = ''.join(f'<li class="why__item">{bi(w["title"], "h3", "why__title")}{bi(w["text"])}</li>' for w in S['why'])
    places = ''.join(f'<li>{bi(p, "span")}</li>' for p in S['places'])
    return f'''<main id="content" class="sakan" data-lang="ar">
  <h1 class="sr-only">{e(SITE["full_name"])}</h1>
  <section class="bhero" id="about-story">
    <img class="bhero__mark" src="img/brand/mark.webp" width="500" height="722" alt="">
    <div class="lang-switch" role="group" aria-label="Language"><button type="button" data-lang-set="ar" aria-pressed="true" lang="ar">العربية</button><button type="button" data-lang-set="en" aria-pressed="false">English</button></div>
    <p class="bhero__name">{e(SITE["name"])}</p>
    <p class="bhero__sub">{e(SITE["sub"])}</p>
    <span class="bhero__rule" aria-hidden="true"></span>
    {bi(S["tagline"], "p", "bhero__tag")}
    <ul class="swatches swatches--named" aria-label="Colour palette">{SWATCHES}</ul>
  </section>
  <section class="story">
    {bi(S["lede"], "p", "story__lede")}
    {"".join(bi(t, "p", "story__p") for t in S["intro"])}
  </section>
  <section class="steps" id="about-steps" aria-label="Our process" data-zoom-group>
    {bi({"ar": "مراحل العمل", "en": "Our process"}, "h2", "sec-title")}
    {steps}
  </section>
  <section class="why" id="about-why">
    {bi(S["why_title"], "h2", "sec-title")}
    <ul class="why__grid">{why}</ul>
  </section>
  <section class="philosophy" id="about-philosophy">
    {bi(S["philosophy_title"], "h2", "sec-title")}
    {bi(S["philosophy"][0], "p", "philosophy__line")}
    {bi(S["philosophy"][1], "p", "philosophy__p")}
    {bi(S["closing"], "p", "philosophy__closing")}
  </section>
  <section class="places" id="about-places">
    {bi(S["places_title"], "h2", "sec-title")}
    <ul class="places__list">{places}</ul>
    {bi(S["places_more"], "p", "places__more")}
  </section>
  {contact_card()}
</main>'''


def contact():
    places = ''.join(f'<li><span>{e(p["en"])}</span> <span lang="ar" dir="rtl">{e(p["ar"])}</span></li>' for p in STUDIO['places'])
    return f'''<main id="content" class="contact-page">
  {contact_card("h1", " ccard--page")}
  <section class="places places--contact" aria-labelledby="cp-places">
    <h2 class="sec-title" id="cp-places">{e(STUDIO["places_title"]["en"])}</h2>
    <ul class="places__list">{places}</ul>
    <p class="places__more">{e(STUDIO["places_more"]["en"])} · <span lang="ar" dir="rtl">{e(STUDIO["places_more"]["ar"])}</span></p>
  </section>
</main>'''


# ---------- assembly ----------
def body(page, content, extra_cls='', spa=False):
    cfg = json.dumps({'whatsapp': SITE['whatsapp'], 'email': SITE['email'], 'phone': SITE['phone']})
    return f'''<div class="site{extra_cls}" data-page="{'home' if spa else page}"{' data-spa' if spa else ''}>
{header('spa' if spa else page)}
{content}
{footer()}
{panel()}
</div>
<script>window.SITE = {cfg};</script>
<script src="js/main.js"></script>'''


def async_images(text):
    return re.sub(r'<img (?!decoding)', '<img decoding="async" ', text)


PAGE_LINK = re.compile(r'href="(index|projects|about|contact|project-[\w-]+)\.html(?:#([\w.~-]+))?"')


def spa_links(text):
    """Inside the claude.ai preview only #tokens work, so page links become view tokens."""
    def to_token(m):
        page, frag = m.group(1), m.group(2)
        if frag and frag != 'content':
            return f'href="#{frag}"'
        return 'href="#' + {'index': 'home'}.get(page, page) + '"'
    return PAGE_LINK.sub(to_token, text)


def spa_view(token, page, title, content):
    content = content.replace('<main id="content">', '<main>')
    if token != 'home':   # photos in views that start hidden wait until the view opens
        content = re.sub(r'<img (?![^>]*loading=)', '<img loading="lazy" ', content)
    return f'<section class="view" data-view="{token}" data-page="{page}" data-title="{e(title)}" hidden>\n{content}\n</section>'


def spa_index(pages):
    """All pages as views of one document, for the claude.ai preview."""
    home_title, _, home_html, _ = pages['index.html']
    prehome, home_main = home_html.split('<main id="content">', 1)
    views = [spa_view('home', 'home', home_title, '<main id="content">' + home_main)]
    for fname, (title, page, content, _) in pages.items():
        if fname != 'index.html':
            views.append(spa_view(fname[:-5], page, title, content))
    doc = f'''<title>{e(home_title)}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="css/style.css">
{body('home', prehome + chr(10).join(views), spa=True)}
'''
    return async_images(spa_links(doc))


TONE_HEX = {'olive': '#554D35', 'brown': '#513B2A', 'cream': '#D5C5B1'}


def full(title, desc, page, content, extra_cls=''):
    tone = re.search(r'<main[^>]* data-tone="(\w+)"', content)
    tone = tone.group(1) if tone else ''
    return f'''<!doctype html>
<html lang="en"{f' data-tone="{tone}"' if tone else ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:type" content="website">
{f'<meta property="og:image" content="{e(SITE["url"])}/img/og.jpg">' + chr(10) + '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' + chr(10) + '<meta name="twitter:card" content="summary_large_image">' + chr(10) if SITE.get("url") else ""}<meta name="theme-color" content="{TONE_HEX.get(tone, "#F3ECE2")}">
<link rel="icon" href="img/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="css/style.css">
</head>
<body>
{body(page, content, extra_cls)}
</body>
</html>
'''


def artifact_index(title, page, content):
    return f'''<title>{e(title)}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="css/style.css">
{body(page, content)}
'''


def main():
    name = SITE['full_name']
    desc = f'{name}, interior design. Homes, villas, apartments and renovations.'
    pages = {
        'index.html': (name, 'home', home(), ''),
        'projects.html': (f'Projects · {name}', 'projects', projects(), ''),
        'about.html': (f'About · {name}', 'about', about(), ''),
        'contact.html': (f'Contact · {name}', 'contact', contact(), ''),
    }
    for i, p in enumerate(PROJECTS):
        pages[page_url(p)] = (f'{p["title"]} · {name}', 'project', project(p, i), '')
    for out in ('dist', 'artifact'):
        d = os.path.join(ROOT, out)
        shutil.rmtree(d, ignore_errors=True)
        for sub in ('css', 'js', 'img'):
            shutil.copytree(os.path.join(SRC, sub), os.path.join(d, sub))
        for name, widths in PHOTOS.items():
            for w in widths:
                shutil.copy2(os.path.join(PHOTO_DIR, f'{name}-{w}.webp'), os.path.join(d, 'img', f'{name}-{w}.webp'))
        if out == 'artifact':
            with open(os.path.join(d, 'index.html'), 'w') as f:
                f.write(spa_index(pages))
            continue
        for fname, (title, page, content, cls) in pages.items():
            with open(os.path.join(d, fname), 'w') as f:
                f.write(async_images(full(title, desc, page, content, cls)))
    print('built', len(pages), 'pages into dist/, and one single-page preview into artifact/')


if __name__ == '__main__':
    main()
