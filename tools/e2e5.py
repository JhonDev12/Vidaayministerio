import sys, re
from playwright.sync_api import sync_playwright
OUT='/tmp/claude-0/-home-claude/05e824d9-50dc-531c-8567-c5912e50f409/scratchpad/shots2/'
CODE=open('/home/claude/programa/privado/CODIGO.txt').read().strip()
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,color_scheme='light',accept_downloads=True)
    pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
    pg.goto('http://localhost:8765/'); pg.wait_for_selector('#g_code')
    pg.screenshot(path=OUT+'01_welcome.png')
    pg.fill('#g_code','AAAA-BBBB-CCCC'); pg.click('#g_go'); pg.wait_for_function("document.querySelector('#g_err').textContent.length>0",timeout=20000)
    print('wrong code ->',pg.inner_text('#g_err'))
    pg.fill('#g_code',CODE.lower()); pg.click('#g_go'); pg.wait_for_selector('.hero',timeout=20000)
    pg.evaluate("localStorage.setItem('vym.state.v1', localStorage.getItem('vym.state.v1'))")
    # mover "hoy" no es posible; abrir septiembre
    pg.screenshot(path=OUT+'02_programa_light.png',full_page=True)
    print('people', pg.evaluate("JSON.parse(localStorage.getItem('vym.state.v1')).people.length"))
    # elegir mes noviembre
    pg.click('.mtile:has-text("Nov")'); pg.wait_for_selector('.week')
    pg.screenshot(path=OUT+'03_noviembre.png',full_page=True)
    pg.click('.week:not(:has-text("Sin reunión")) >> nth=1'); pg.wait_for_selector('.weekhead')
    pg.screenshot(path=OUT+'04_semana.png',full_page=True)
    # picker + filtro
    pg.click('[data-a="pick"][data-slot="president"]'); pg.wait_for_selector('#plist .pitem')
    n0=pg.locator('#plist .pitem').count()
    pg.fill('#pq','lopez'); pg.wait_for_timeout(200)
    n1=pg.locator('#plist .pitem').count(); names=pg.locator('#plist .pitem .n').all_inner_texts()[:5]
    print('picker',n0,'->',n1,names)
    pg.fill('#pq','luis lopez'); pg.wait_for_timeout(200); print('luis lopez ->',pg.locator('#plist .pitem .n').all_inner_texts()[:3])
    pg.fill('#pq',''); pg.click('#pgpills .pill:has-text("Hermanas")'); pg.wait_for_timeout(200)
    print('hermanas', pg.locator('#plist .pitem').count()); 
    pg.screenshot(path=OUT+'05_picker.png')
    pg.click('#pgpills .pill:has-text("Todos")'); pg.fill('#pq','zzzz'); pg.wait_for_timeout(100); print('sin resultados ->', pg.locator('#plist').inner_text()[:60].replace('\n',' '))
    pg.fill('#pq','harold'); pg.wait_for_timeout(100); pg.click('#plist .pitem >> nth=0'); pg.wait_for_timeout(300)
    print('asignado ->', pg.locator('[data-slot="president"] .v').inner_text())
    # personas filtro
    pg.click('.nav button:has-text("Personas")'); pg.wait_for_selector('#personq')
    pg.fill('#personq','orozco'); pg.wait_for_timeout(150); print('personas orozco ->', pg.locator('#plistp .pitem .n').all_inner_texts())
    pg.fill('#personq',''); pg.click('.pill:has-text("Hermanas")'); pg.wait_for_timeout(150); pg.fill('#personq','mar'); pg.wait_for_timeout(150); print('hermanas mar ->', pg.locator('#plistp .pitem .n').count())
    pg.screenshot(path=OUT+'06_personas.png')
    # descargar elegir
    pg.click('.nav button:has-text("Descargar")'); pg.click('[data-a="dlMode"][data-m="pick"]'); pg.wait_for_selector('.pickweeks')
    pg.click('[data-a="dlPickN"][data-n="999"]'); pg.wait_for_timeout(200)
    print('sel', pg.inner_text('.sumbox').replace('\n',' '))
    pg.screenshot(path=OUT+'07_descargar.png',full_page=True)
    with pg.expect_download() as d: pg.click('[data-a="dlGo"]')
    dl=d.value; dl.save_as(OUT+'multi.pdf'); print('pdf',dl.suggested_filename)
    # tema oscuro
    pg.click('.themebtn'); pg.wait_for_timeout(300)
    print('theme attr', pg.evaluate("document.documentElement.getAttribute('data-theme')"))
    pg.click('.nav button:has-text("Programa")'); pg.wait_for_selector('.hero'); pg.screenshot(path=OUT+'08_programa_dark.png',full_page=True)
    # ajustes + PIN
    pg.click('.nav button:has-text("Ajustes")'); pg.screenshot(path=OUT+'09_ajustes_dark.png',full_page=True)
    pg.click('[data-a="pinSet"]'); pg.fill('#pin1','2468'); pg.fill('#pin2','2468'); pg.click('[data-a="pinSetGo"]'); pg.wait_for_timeout(600)
    pg.reload(); pg.wait_for_selector('#g_pin')
    pg.screenshot(path=OUT+'10_lock.png')
    pg.fill('#g_pin','1111'); pg.wait_for_timeout(700); print('pin malo ->',pg.inner_text('#g_err'))
    pg.fill('#g_pin','2468'); pg.wait_for_selector('.pagehead',timeout=10000); print('pin ok; theme persiste:',pg.evaluate("document.documentElement.getAttribute('data-theme')"))
    # ayuda
    pg.click('.nav button:has-text("Ayuda")'); pg.screenshot(path=OUT+'11_ayuda.png',full_page=True)
    # escritorio claro
    ctx2=b.new_context(viewport={'width':1280,'height':800},color_scheme='light'); p2=ctx2.new_page()
    p2.goto('http://localhost:8765/'); p2.fill('#g_code',CODE); p2.click('#g_go'); p2.wait_for_selector('.hero',timeout=20000)
    p2.screenshot(path=OUT+'12_desktop_programa.png'); p2.click('.week >> nth=0'); p2.wait_for_selector('.weekhead'); p2.screenshot(path=OUT+'13_desktop_semana.png')
    print('ERRORS',errs)
    b.close()
