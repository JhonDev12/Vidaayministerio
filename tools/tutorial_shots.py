import re, json
from playwright.sync_api import sync_playwright
T='/tmp/claude-0/-home-claude/05e824d9-50dc-531c-8567-c5912e50f409/scratchpad/tut/'
CODE=open('/home/claude/programa/privado/CODIGO.txt').read().strip()
src=open('/home/claude/programa/tools/e2e3.py').read().split('with sync_playwright()')[0]
exec(src.split('S="')[0]); exec('def article'+src.split('def article')[1])
BOX={}
def shot(pg,name,targets={},full=False):
    pg.wait_for_timeout(350)
    pg.screenshot(path=T+name+'.png',full_page=full)
    vp=pg.viewport_size
    bx={}
    for k,sel in targets.items():
        r=pg.evaluate("""(s)=>{const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return [r.x,r.y,r.width,r.height]}""",sel)
        if r: bx[k]=r
    BOX[name]={'w':vp['width'],'h':vp['height'],'t':bx}
def handler(route):
    url=route.request.url; cors={'access-control-allow-origin':'*'}
    m=re.search(r'/meetings/r4/lp-s/(\d+)/(\d+)',url)
    if m:
        html=meet(int(m.group(1)),int(m.group(2)))
        route.fulfill(status=404 if html is None else 200,body=html or 'nf',content_type='text/html',headers=cors); return
    m=re.search(r'/wol/d/r4/lp-s/2027(\d)00',url)
    if m:
        w=int(m.group(1)); route.fulfill(status=200,body=article(f'{w}-{w+6} DE ENERO','EZEQUIEL 11, 12',[10+w,20+w,30+w],[f'Parte uno semana {w}',f'Parte NVC semana {w}']),content_type='text/html',headers=cors); return
    route.abort()
def unlock(pg,url='http://localhost:8765/'):
    pg.goto(url); pg.fill('#g_code',CODE); pg.click('#g_go'); pg.wait_for_selector('.pagehead',timeout=20000)
with sync_playwright() as p:
    b=p.chromium.launch()
    # ---------------- móvil
    ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,color_scheme='light',locale='es-CO',timezone_id='America/Bogota',accept_downloads=True)
    ctx.route('**/wol.jw.org/**',handler)
    pg=ctx.new_page()
    pg.goto('http://localhost:8765/'); pg.wait_for_selector('#g_code'); shot(pg,'m_welcome',{'code':'#g_code','go':'#g_go','blank':'#g_blank'})
    unlock(pg)
    pg.evaluate("localStorage.setItem('vym.pinoff','1')")
    shot(pg,'m_home',{'hero':'.hero','theme':'.themebtn','nav':'.nav'})
    pg.evaluate("document.querySelector('.updcard').scrollIntoView({block:'start'}); window.scrollBy(0,-14)")
    shot(pg,'m_update',{'btn':'.updcard .btn.primary','steps':'.steps3','tiles':'.months'})
    pg.click('.updcard .btn.primary'); pg.wait_for_selector('text=Entendido',timeout=20000)
    shot(pg,'m_sync',{'msg':'.sheet'})
    pg.click('text=Entendido')
    pg.evaluate("window.scrollTo(0,0)")
    pg.goto('http://localhost:8765/#/semana/2026-11-30'); pg.wait_for_selector('.weekhead')
    shot(pg,'m_week',{'ring':'.weekhead .ring','suggest':'.toolbar .btn.primary','prev':'.toolbar .btn:nth-child(2)','field':'.card.pad .fieldbtn >> nth=0'} if False else {'ring':'.weekhead .ring','suggest':'.toolbar .btn.primary','prev':'.toolbar .btn:nth-child(2)','field':'.fieldbtn'})
    pg.evaluate("document.querySelector('.fieldbtn.empty').scrollIntoView({block:'center'})")
    shot(pg,'m_week2',{'empty':'.fieldbtn.empty','banner':'.banner.v'})
    pg.click('.fieldbtn.empty'); pg.wait_for_selector('#plist .pitem')
    shot(pg,'m_pick',{'search':'#pq','pills':'#pgpills','item':'#plist .pitem'})
    pg.fill('#pq','lopez'); shot(pg,'m_pick2',{'search':'#pq','item':'#plist .pitem'})
    pg.keyboard.press('Escape')
    pg.goto('http://localhost:8765/#/descargar'); pg.wait_for_selector('.seg')
    pg.click('[data-a="dlMode"][data-m="pick"]'); pg.wait_for_selector('.pickweeks')
    shot(pg,'m_dl',{'seg':'.seg','picks':'.pickweeks','fmt':'.fmtcards','go':'[data-a="dlGo"]'})
    pg.evaluate("document.querySelector('.fmtcards').scrollIntoView({block:'start'}); window.scrollBy(0,-20)")
    shot(pg,'m_dl2',{'fmt':'.fmtcards','sum':'.sumbox','go':'[data-a="dlGo"]'})
    pg.goto('http://localhost:8765/#/semana/2026-11-16'); pg.wait_for_selector('.weekhead')
    pg.click('.toolbar [data-a="preview"]'); pg.wait_for_selector('.pvwrap')
    shot(pg,'m_prev',{'pv':'.pvwrap'}); pg.keyboard.press('Escape')
    pg.goto('http://localhost:8765/#/ajustes'); pg.wait_for_selector('.seg')
    shot(pg,'m_set',{'theme':'.seg','pin':'[data-a="pinSet"]'})
    pg.click('[data-a="setTheme"][data-t="dark"]'); pg.goto('http://localhost:8765/#/'); pg.wait_for_selector('.hero')
    shot(pg,'m_dark',{})
    pg.goto('http://localhost:8765/#/semana/2026-11-16'); pg.wait_for_selector('.weekhead'); pg.evaluate("document.querySelector('.banner.m').scrollIntoView({block:'start'})"); shot(pg,'m_dark2',{})
    ctx.close()
    # ---------------- escritorio
    ctx=b.new_context(viewport={'width':1280,'height':800},device_scale_factor=1.5,color_scheme='light',locale='es-CO',timezone_id='America/Bogota')
    ctx.route('**/wol.jw.org/**',handler)
    pg=ctx.new_page(); unlock(pg)
    shot(pg,'d_home',{'nav':'.nav','hero':'.hero','upd':'.updcard','theme':'.navfoot button'})
    pg.evaluate("document.querySelector('.updcard').scrollIntoView({block:'start'}); window.scrollBy(0,-20)")
    shot(pg,'d_update',{'btn':'.updcard .btn.primary','tiles':'.months'})
    pg.click('.updcard .btn.primary'); pg.wait_for_selector('text=Entendido',timeout=20000); shot(pg,'d_sync',{'msg':'.sheet'}); pg.click('text=Entendido')
    pg.goto('http://localhost:8765/#/semana/2026-11-30'); pg.wait_for_selector('.weekhead')
    shot(pg,'d_week',{'ring':'.weekhead .ring','suggest':'.toolbar .btn.primary','prev':'.toolbar .btn:nth-child(2)','field':'.fieldbtn'})
    pg.evaluate("document.querySelector('.banner.m').scrollIntoView({block:'start'}); window.scrollBy(0,-20)")
    shot(pg,'d_week2',{'banner':'.banner.m','part':'.part.m','field':'.part.m .fieldbtn'})
    pg.evaluate("document.querySelector('.fieldbtn.empty').scrollIntoView({block:'center'})"); pg.click('.fieldbtn.empty'); pg.wait_for_selector('#plist .pitem')
    shot(pg,'d_pick',{'search':'#pq','pills':'#pgpills','item':'#plist .pitem'}); pg.keyboard.press('Escape')
    pg.goto('http://localhost:8765/#/descargar'); pg.wait_for_selector('.seg'); pg.click('[data-a="dlMode"][data-m="pick"]'); pg.wait_for_selector('.pickweeks')
    shot(pg,'d_dl',{'seg':'.seg','picks':'.pickweeks','fmt':'.fmtcards','go':'[data-a="dlGo"]'})
    pg.goto('http://localhost:8765/#/personas'); pg.wait_for_selector('#personq'); pg.fill('#personq','mar'); shot(pg,'d_people',{'search':'#personq','add':'.fab','pills':'.pills'})
    ctx.close()
    # ---------------- tableta
    ctx=b.new_context(viewport={'width':820,'height':1180},device_scale_factor=1.5,color_scheme='light',locale='es-CO',timezone_id='America/Bogota',has_touch=True)
    pg=ctx.new_page(); unlock(pg); pg.goto('http://localhost:8765/#/semana/2026-11-16'); pg.wait_for_selector('.weekhead'); shot(pg,'t_week',{})
    b.close()
json.dump(BOX,open(T+'boxes.json','w'))
print('ok',len(BOX))
