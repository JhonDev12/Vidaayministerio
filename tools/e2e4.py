from playwright.sync_api import sync_playwright
OUT="/tmp/claude-0/-home-claude/05e824d9-50dc-531c-8567-c5912e50f409/scratchpad/"
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width':1100,'height':800}, accept_downloads=True)
    page = ctx.new_page()
    page.on('console', lambda m: print('C:',m.type, m.text[:300]) if m.type in('error','warning') and 'TUNNEL' not in m.text else None)
    page.on('pageerror', lambda e: print('PAGEERROR', e))
    page.goto('http://localhost:8765/index.html#/descargar'); page.wait_for_timeout(500)
    page.select_option('select[data-c="dlMonth"]', '2026-11')
    page.click('[data-a="dlFmt"][data-f="docx"]')
    page.click('[data-a="dlGo"]')
    page.wait_for_timeout(4000)
    print(page.inner_text('#toast'))
    b.close()
