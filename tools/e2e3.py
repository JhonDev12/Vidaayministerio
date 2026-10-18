import re, json
from playwright.sync_api import sync_playwright
S="/tmp/claude-0/-home-claude/05e824d9-50dc-531c-8567-c5912e50f409/scratchpad/shots/"
OUT="/tmp/claude-0/-home-claude/05e824d9-50dc-531c-8567-c5912e50f409/scratchpad/"
def article(n, reading, songs, titles):
    h = f'<html><body><div id="article"><h1>{n}</h1><h2>{reading}</h2><h3><a>Canción {songs[0]}</a> <strong>y oración | Palabras de introducción</strong> (1 min.)</h3>'
    h += '<h2><strong>TESOROS DE LA BIBLIA</strong></h2>'
    h += f'<h3><strong>1. {titles[0]}</strong></h3><p>(10 mins.)</p><p>texto de apoyo</p>'
    h += '<h3><strong>2. Busquemos perlas escondidas</strong></h3><p>(10 mins.)</p>'
    h += '<h3><strong>3. Lectura de la Biblia</strong></h3><p>(4 mins.) <a>Eze 11:1-12</a> (<a>th lección 5</a>).</p>'
    h += '<h2>SEAMOS MEJORES MAESTROS</h2>'
    h += '<h3>4. Empecemos conversaciones</h3><p>(3 mins.) DE CASA EN CASA.</p><h3>5. Hagamos revisitas</h3><p>(4 mins.) Texto</p><h3>6. Hagamos discípulos</h3><p>(5 mins.) Texto</p>'
    h += f'<h2>NUESTRA VIDA CRISTIANA</h2><h3><a>Canción {songs[1]}</a></h3><h3>7. {titles[1]}</h3><p>(15 mins.) Análisis con el auditorio.</p>'
    h += '<h3>8. Estudio bíblico de la congregación</h3><p>(30 mins.) <a>wcg cap. 24</a>.</p>'
    h += f'<h3>Palabras de conclusión (3 mins.) | <a>Canción {songs[2]}</a> <strong>y oración</strong></h3></div></body></html>'
    return h
def meet(year, week):
    # semanas ISO 2027: 1,2,3 publicadas; 4 no
    if year==2027 and week in (1,2,3):
        return f'<html><body><h2>Vida y Ministerio</h2><a href="/es/wol/d/r4/lp-s/2027{week}00">{week} Guía de actividades 2027 | enero</a><a href="/es/wol/d/r4/lp-s/2027999">La Atalaya (estudio)</a></body></html>'
    return None
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width':1100,'height':800}, accept_downloads=True, locale='es-CO', timezone_id='America/Bogota')
    page = ctx.new_page()
    logs=[]
    page.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)))
    def handler(route):
        url = route.request.url
        m = re.search(r'/meetings/r4/lp-s/(\d+)/(\d+)', url)
        cors={'access-control-allow-origin':'*'}
        if m:
            html = meet(int(m.group(1)), int(m.group(2)))
            if html is None: route.fulfill(status=404, body='nf', headers=cors)
            else: route.fulfill(status=200, body=html, content_type='text/html', headers=cors)
            return
        m = re.search(r'/wol/d/r4/lp-s/2027(\d)00', url)
        if m:
            w=int(m.group(1))
            route.fulfill(status=200, body=article(f'{w}-{w+6} DE ENERO','EZEQUIEL 11, 12',[10+w,20+w,30+w],[f'Parte uno semana {w}',f'Parte NVC semana {w}']), content_type='text/html', headers=cors)
            return
        route.abort()
    page.route('**/wol.jw.org/**', handler)
    page.goto('http://localhost:8765/index.html')
    page.fill('#g_code', open('/home/claude/programa/privado/CODIGO.txt').read().strip()); page.click('#g_go'); page.wait_for_selector('.hero', timeout=20000)
    page.click('text=Traer semanas nuevas')
    page.wait_for_selector('text=Entendido', timeout=15000)
    page.screenshot(path=S+'d_sync_done.png')
    print('SYNC MSG:', page.inner_text('.sheet')[:300].replace('\n',' | '))
    page.click('text=Entendido')
    st = page.evaluate("JSON.parse(localStorage.getItem('vym.state.v1'))")
    ws = {d:w for d,w in st['weeks'].items() if d>'2026-12-28'}
    for d,w in sorted(ws.items()):
        print(d, w['reading'], w['songOpen'], w['songMid'], w['songClose'], [(q['k'],q['title'][:25],q['mins'],q['ref']) for q in w['parts']][:4], 'president=',w['president'], 'auto=',w.get('autoFilled'))
    # semana nueva: abrir y ver
    page.goto('http://localhost:8765/index.html#/semana/2027-01-04'); page.wait_for_timeout(500)
    page.screenshot(path=S+'d_semana_new.png', full_page=True)
    # descargar PDF y Word
    page.goto('http://localhost:8765/index.html#/descargar'); page.wait_for_timeout(500)
    page.select_option('select[data-c="dlMonth"]', '2026-11')
    with page.expect_download() as dl:
        page.click('[data-a="dlGo"]')
    d=dl.value; d.save_as(OUT+'e2e_'+d.suggested_filename); print('PDF:', d.suggested_filename)
    page.click('[data-a="dlFmt"][data-f="docx"]')
    with page.expect_download() as dl2:
        page.click('[data-a="dlGo"]')
    d2=dl2.value; d2.save_as(OUT+'e2e_'+d2.suggested_filename); print('DOCX:', d2.suggested_filename)
    page.screenshot(path=S+'d_desc.png')
    print('\n'.join(logs))
    b.close()
