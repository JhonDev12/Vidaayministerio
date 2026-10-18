import json
T='/tmp/claude-0/-home-claude/05e824d9-50dc-531c-8567-c5912e50f409/scratchpad/tut/'
BOX=json.load(open(T+'boxes.json'))
def fig(name,marks=(),kind='phone',w=None,cap=''):
    b=BOX[name]; ov=''
    for i,(k,n) in enumerate(marks):
        r=b['t'].get(k)
        if not r: continue
        x,y,ww,hh=r; hh=min(hh,b['h']-y)
        ov+=f'<div class="mk" style="left:{x/b["w"]*100:.2f}%;top:{y/b["h"]*100:.2f}%;width:{ww/b["w"]*100:.2f}%;height:{hh/b["h"]*100:.2f}%"><span>{n}</span></div>'
    st=f'style="width:{w}"' if w else ''
    chrome='<div class="bar"><i></i><i></i><i></i></div>' if kind=='desk' else ''
    c=f'<div class="cap">{cap}</div>' if cap else ''
    return f'<figure class="fig {kind}" {st}>{chrome}<div class="shot"><img src="{name}.png">{ov}</div>{c}</figure>'
def legend(items):
    return '<ol class="leg">'+''.join(f'<li><b>{n}</b><span>{t}</span></li>' for n,t in items)+'</ol>'
def page(tag,title,body,color='#1c4faa'):
    return f'<section class="page"><header style="--c:{color}"><span class="tag">{tag}</span><h1>{title}</h1></header>{body}</section>'
P=[]
P.append('''<section class="page cover"><div class="mk3"><i></i><i></i><i></i></div><h1>Programa VyM</h1><h2>Guía paso a paso</h2><p>Reunión de entre semana · Vida y Ministerio</p>
<div class="covercards"><div><b>💻</b>Computadora</div><div><b>📱</b>Celular</div><div><b>📲</b>Tableta</div></div>
<p class="small">Cómo traer las semanas, asignar las partes, y descargar el programa en PDF o Word idéntico al original.</p></section>''')
P.append(page('Empezar','1 · Instalar y abrir por primera vez','''
<div class="cols3">
<div class="card"><h3>💻 Windows</h3><ol><li>Haz doble clic en <b>Instalador-Programa-VyM</b>.</li><li>Si Windows avisa «editor desconocido»: <b>Más información → Ejecutar de todas formas</b>.</li><li>Sigue los pasos y abre el ícono del escritorio.</li></ol></div>
<div class="card"><h3>🤖 Android</h3><ol><li>Abre el archivo <b>.apk</b> en el celular o tableta.</li><li>Permite «instalar apps de origen desconocido» si lo pide.</li><li>Abre <b>Programa VyM</b>.</li></ol></div>
<div class="card"><h3>🍎 iPhone / iPad</h3><ol><li>Abre el enlace seguro en <b>Safari</b>.</li><li>Toca <b>Compartir</b> (cuadro con flecha).</li><li><b>Añadir a pantalla de inicio</b>. Listo: funciona como una app.</li></ol></div></div>
<h3 style="margin:18px 0 8px">Primera vez en cada dispositivo</h3>
<div class="row2">'''+fig('m_welcome',[('code',1),('go',2),('blank',3)],w='2.5in')+'''<div>'''+legend([(1,'Escribe el <b>código de la congregación</b> (lo tiene el administrador). Solo se pide esta vez.'),(2,'Toca <b>Entrar</b>: se cargan las personas y los programas.'),(3,'Sin código puedes <b>empezar en blanco</b> y agregar todo tú mismo.')])+'''
<div class="note">🔒 Los datos viajan <b>cifrados</b>. Quien abra el enlace sin el código solo ve esta pantalla. Tus cambios se guardan <b>solo en tu dispositivo</b>: el celular y la computadora son independientes.</div></div></div>'''))
P.append(page('Computadora','2 · Conoce la pantalla',fig('d_home',[('nav',1),('hero',2),('upd',3),('theme',4)],'desk')+legend([(1,'<b>Menú:</b> Programa, Personas, Descargar, Ayuda y Ajustes.'),(2,'<b>Próxima reunión:</b> fecha, lectura y porcentaje de asignaciones completas. Toca «Completar asignaciones».'),(3,'<b>Actualizar el programa:</b> trae las semanas nuevas desde jw.org.'),(4,'<b>Modo oscuro / claro:</b> cámbialo cuando quieras.')])+'''<div class="note">Colores: <b style="color:#1c8f8f">Tesoros</b> · <b style="color:#c98b1e">Maestros</b> · <b style="color:#b5342e">Vida cristiana</b>. Los puntitos de cada semana muestran qué partes ya tienen persona.</div>''','#1c8f8f'))
P.append(page('Computadora','3 · Traer las semanas del próximo año','<div class="row2">'+fig('d_update',[('btn',1),('tiles',2)],'desk',w='3.6in')+fig('d_sync',[('msg',3)],'desk',w='3.6in')+'</div>'+legend([(1,'Toca <b>Traer semanas nuevas</b>. Siempre continúa desde la última semana que ya tienes (por ejemplo, de enero 2027 en adelante).'),(2,'El <b>calendario del año</b> muestra cada mes: barra llena = mes cargado; punteado = aún sin cargar. Usa las flechas para ver 2027, 2028…'),(3,'Al terminar te dice cuántas semanas agregó y desde cuándo <b>jw.org aún no publica</b>.')])+'''
<div class="cols2"><div class="card"><h3>¿Y si todavía no está publicado?</h3><p>No pasa nada: la app lo vuelve a intentar <b>sola una vez al día</b> al abrirla. También puedes tocar el botón otra vez cuando quieras.</p></div>
<div class="card"><h3>¿Sin internet?</h3><p>Ve a <b>Ajustes → Pegar guía de actividades</b> y pega el texto de la semana, o toca un mes vacío del calendario y elige <b>Crear semanas en blanco</b>.</p></div></div>''','#c98b1e'))
P.append(page('Computadora','4 · Llenar una semana','<div class="row2">'+fig('d_week',[('ring',1),('suggest',2),('prev',3)],'desk',w='3.6in')+fig('d_pick',[('search',4),('pills',5),('item',6)],'desk',w='3.6in')+'</div>'+legend([(1,'El círculo muestra cuántas asignaciones están completas.'),(2,'<b>Sugerir asignaciones:</b> reparte las partes vacías de forma justa (quien lleva más tiempo sin esa parte, sin repetir en la semana).'),(3,'<b>Vista previa:</b> la hoja idéntica al PDF original.'),(4,'Toca cualquier recuadro con nombre para cambiarlo y <b>escribe parte del nombre o apellido</b> en el buscador.'),(5,'Filtra por <b>Hermanos</b> o <b>Hermanas</b>.'),(6,'Verás «Sugerido», «Ya tiene parte» o «No disponible» para decidir rápido. Usa <b>Escribir otro nombre…</b> para una persona que no esté en la lista.')])+fig('d_week2',[('banner',7),('field',8)],'desk',w='5in'),'#1c4faa'))
P.append(page('Computadora','5 · Descargar en PDF o Word',fig('d_dl',[('seg',1),('picks',2),('fmt',3),('go',4)],'desk')+legend([(1,'Elige: <b>Un mes</b>, <b>Seguidas</b> (de una fecha a otra) o <b>Elegir</b> (marcas las semanas que quieras).'),(2,'En «Elegir» usa los atajos: Próximas 4, Próximas 12, Todas o Ninguna.'),(3,'Formato: <b>PDF</b> para imprimir o enviar · <b>Word</b> para seguir editando. Ambos con el diseño exacto del programa, una semana por página.'),(4,'Toca <b>Descargar</b>. En Windows el archivo queda en tu carpeta de Descargas.')])+'<div class="note">Si una semana tiene partes sin asignar, la app te avisa; igual sale, con el espacio en blanco para llenarlo a mano.</div>','#b5342e'))
P.append(page('Celular y tableta','6 · Llenar el programa desde el celular','<div class="row3">'+fig('m_home',[('hero',1),('theme',2)],w='2.1in')+fig('m_week',[('ring',3),('suggest',4)],w='2.1in')+fig('m_pick',[('search',5),('pills',6),('item',7)],w='2.1in')+'</div>'+legend([(1,'En <b>Programa</b> toca la tarjeta azul de la próxima reunión.'),(2,'Botón de luna/sol: <b>modo oscuro</b> o claro.'),(3,'Dentro de la semana verás el avance.'),(4,'<b>Sugerir asignaciones</b>: la app propone y tú ajustas.'),(5,'Toca un recuadro vacío (línea punteada roja) y <b>escribe parte del nombre</b>.'),(6,'Filtros Todos / Hermanos / Hermanas.'),(7,'Toca a la persona para asignarla.')])+'<div class="row2" style="align-items:center">'+fig('t_week',[],'tablet',w='3in')+'<div class="note">📲 <b>En tableta</b> funciona igual, con más espacio: el menú queda a la izquierda cuando la pantalla es ancha.</div></div>','#1c4faa'))
P.append(page('Celular y tableta','7 · Descargar varias semanas','<div class="row3">'+fig('m_dl',[('seg',1),('picks',2)],w='2.1in')+fig('m_dl2',[('fmt',3),('go',4)],w='2.1in')+fig('m_prev',[],w='2.1in')+'</div>'+legend([(1,'En <b>Descargar</b> toca <b>Elegir</b>.'),(2,'Marca las semanas con un toque (o usa Próximas 4 / Todas).'),(3,'Escoge <b>PDF</b> o <b>Word</b>.'),(4,'Toca <b>Descargar</b>. Se abre el menú del teléfono: <b>Guardar en archivos</b>, enviarlo por <b>WhatsApp</b>, correo, imprimir…')])+'<div class="note">La <b>Vista previa</b> (tercera imagen) muestra exactamente lo que se imprimirá. Tócala desde cualquier semana.</div>','#b5342e'))
P.append(page('Para todos','8 · Modo oscuro, PIN y copias de seguridad','<div class="row3">'+fig('m_set',[('theme',1),('pin',2)],w='2.1in')+fig('m_dark',[],w='2.1in')+fig('m_dark2',[],w='2.1in')+'</div>'+legend([(1,'<b>Ajustes → Apariencia:</b> Claro, Oscuro o Automático (sigue al teléfono).'),(2,'<b>Crear PIN:</b> pide un número de 4 a 8 dígitos al abrir la app y tras unos minutos sin usarla.')])+'''
<div class="cols2"><div class="card"><h3>🔒 Seguridad</h3><ul><li>Los datos de la congregación van <b>cifrados</b> y solo se abren con el código.</li><li>Lo que escribes se queda <b>en tu dispositivo</b>; nadie más lo ve ni lo cambia.</li><li>Pon un <b>PIN</b> y, en GitHub, activa la verificación en dos pasos.</li></ul></div>
<div class="card"><h3>💾 Copias de seguridad</h3><ul><li><b>Ajustes → Guardar copia</b> crea un archivo.</li><li>Para pasar los datos a otro equipo: <b>Restaurar copia</b>.</li><li>Haz una copia cada vez que termines un mes.</li></ul></div></div>''','#1c8f8f'))
P.append(page('Ayuda','9 · Preguntas frecuentes','''<div class="faq"><div><b>El buscador no encuentra a alguien.</b><p>Escribe solo una parte del nombre o del apellido (no importan tildes ni mayúsculas). Si la persona no tiene activada esa parte, aparece en «Otras personas» más abajo; actívala en <b>Personas</b>.</p></div>
<div><b>¿Cómo agrego a alguien nuevo?</b><p>Personas → <b>Agregar persona</b> (o «Varias» para pegar una lista). Marca qué partes puede recibir y sale en las sugerencias.</p></div>
<div><b>Esta semana no hay reunión (asamblea, visita).</b><p>Abre la semana → botón ⋯ → <b>Esta semana no hay reunión</b>.</p></div>
<div><b>Cambió un título en jw.org.</b><p>Abre la semana → ⋯ → <b>Volver a leer los títulos desde jw.org</b>.</p></div>
<div><b>Quiero cambiar la hora de inicio o el nombre de la congregación.</b><p>Ajustes → Congregación.</p></div>
<div><b>Cambié de celular.</b><p>En el anterior: Ajustes → Guardar copia. En el nuevo: abre la app con el código y toca Restaurar copia.</p></div>
<div><b>Olvidé mi PIN.</b><p>Borra los datos de la app del dispositivo (o reinstálala), abre con el código y restaura tu copia.</p></div></div>
<div class="note">¿Algo no funciona? Toca <b>Ayuda</b> dentro de la app: allí está esta guía resumida.</div>''','#1c4faa'))
css='''
@page{size:Letter;margin:0}*{box-sizing:border-box}body{margin:0;font:11pt/1.4 "Inter","Segoe UI",sans-serif;color:#141a2a}
.page{width:8.5in;height:11in;padding:.5in .55in;position:relative;overflow:hidden;page-break-after:always;background:#fff}
header{display:flex;align-items:center;gap:14px;margin:-.1in 0 .18in;padding-bottom:.12in;border-bottom:4px solid var(--c)}
header .tag{background:var(--c);color:#fff;font-weight:800;font-size:9pt;letter-spacing:.08em;text-transform:uppercase;border-radius:99px;padding:5px 12px}
h1{font-size:21pt;margin:0;letter-spacing:-.02em}h3{margin:0 0 6px;font-size:12.5pt}
.cover{background:linear-gradient(135deg,#12306f,#2459c9);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.cover h1{font-size:46pt}.cover h2{font-size:22pt;font-weight:600;margin:6px 0 4px}.cover p{opacity:.9;font-size:13pt}.cover .small{font-size:11pt;max-width:5in;margin-top:.4in}
.mk3{display:flex;align-items:flex-end;gap:7px;width:1.5in;height:1.5in;background:#1c4faa;border:3px solid rgba(255,255,255,.35);border-radius:.38in;padding:.3in;margin-bottom:.3in}
.mk3 i{flex:1;border-radius:4px}.mk3 i:nth-child(1){background:#54d3cf;height:100%}.mk3 i:nth-child(2){background:#ffc857;height:62%}.mk3 i:nth-child(3){background:#ff7b72;height:80%}
.covercards{display:flex;gap:.25in;margin-top:.35in}.covercards div{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.35);border-radius:16px;padding:.18in .3in;font-weight:700;font-size:12pt}.covercards b{display:block;font-size:26pt}
.cols3{display:grid;grid-template-columns:repeat(3,1fr);gap:.15in}.cols2{display:grid;grid-template-columns:1fr 1fr;gap:.15in;margin-top:.15in}
.card{border:1px solid #dfe4ee;border-radius:14px;padding:.14in .16in;background:#f7f8fc}.card ol,.card ul{margin:0;padding-left:18px}.card li{margin:3px 0}.card p{margin:0}
.row2{display:flex;gap:.2in;align-items:flex-start}.row2>div:last-child{flex:1}.row3{display:flex;gap:.18in;justify-content:center;margin-bottom:.12in}
.fig{margin:0 0 .1in;position:relative}.shot{position:relative;line-height:0}.shot img{width:100%;display:block}
.fig.phone{border:5px solid #1b2233;border-radius:22px;overflow:hidden;background:#1b2233;box-shadow:0 6px 18px rgba(20,30,60,.25)}
.fig.tablet .shot{max-height:2.4in;overflow:hidden}.fig.tablet{border:7px solid #1b2233;border-radius:20px;overflow:hidden}
.fig.desk{border:1px solid #cfd5e3;border-radius:10px;overflow:hidden;box-shadow:0 6px 18px rgba(20,30,60,.15);width:100%}
.bar{background:#e9edf5;height:22px;display:flex;align-items:center;gap:5px;padding:0 9px}.bar i{width:9px;height:9px;border-radius:50%;background:#b9c1d3}
.mk{position:absolute;border:2.5px solid #ff4d00;border-radius:8px;box-shadow:0 0 0 2px rgba(255,255,255,.7)}
.mk span{position:absolute;left:-9px;top:-11px;background:#ff4d00;color:#fff;font:800 10pt/1 sans-serif;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center}
.leg{list-style:none;padding:0;margin:.08in 0}.leg li{display:flex;gap:10px;margin:5px 0;align-items:flex-start}
.leg>li>b{flex:none;width:21px;height:21px;border-radius:50%;background:#ff4d00;color:#fff;display:flex;align-items:center;justify-content:center;font-size:10pt}
.note{background:#e8eefc;border-radius:12px;padding:.1in .15in;margin-top:.12in;font-size:10.5pt}.small{font-size:10pt}
.faq>div{border-left:5px solid #1c4faa;background:#f7f8fc;padding:.08in .15in;margin:.09in 0;border-radius:0 10px 10px 0}.faq p{margin:2px 0 0}
'''
html='<!doctype html><meta charset=utf-8><style>'+css+'</style>'+''.join(P)
open(T+'tutorial.html','w').write(html)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); pg.goto('file://'+T+'tutorial.html'); pg.wait_for_timeout(800)
    pg.pdf(path=T+'Tutorial-Programa-VyM.pdf',format='Letter',print_background=True,prefer_css_page_size=True); b.close()
print('pdf ok')
