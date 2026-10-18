import sys, json
from playwright.sync_api import sync_playwright
S="/tmp/claude-0/-home-claude/05e824d9-50dc-531c-8567-c5912e50f409/scratchpad/shots/"
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, accept_downloads=True, locale='es-CO', timezone_id='America/Bogota')
    page = ctx.new_page()
    logs=[]
    page.on('console', lambda m: logs.append(m.type+': '+m.text))
    page.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)))
    page.goto('http://localhost:8765/index.html')
    page.wait_for_timeout(800)
    page.screenshot(path=S+'m_programa.png')
    page.click('text=Mostrar semanas anteriores')
    page.wait_for_timeout(200)
    page.goto('http://localhost:8765/index.html#/semana/2026-11-16')
    page.wait_for_timeout(600)
    page.screenshot(path=S+'m_semana.png', full_page=True)
    print('\n'.join(logs))
    b.close()
