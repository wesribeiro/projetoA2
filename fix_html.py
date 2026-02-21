import re

path = r'i:\PROJETOS\projetoA2\public\index.html'
with open(path, 'r', encoding='utf-8') as f:
    raw = f.read()

# Work with LF for reliable matching
content = raw.replace('\r\n', '\n')

# The marker we know exists
marker_start = '<!-- Card Despesas Fixas (Home) -->'
marker_end = '<!-- Fim Dashboard Individual -->'

s = content.find(marker_start)
e = content.find(marker_end)
if s == -1 or e == -1:
    print(f"MARKERS NOT FOUND: start={s}, end={e}")
    idx = content.find('Despesas Fixas')
    print("Nearby:", repr(content[max(0,idx-30):idx+200]))
else:
    new_block = """<!-- Card Despesas (accordion) -->
            <section class="card" style="margin-top: 1rem;" id="card-despesas">
                <div class="card-header" onclick="toggleDespesasAccordion()" style="cursor:pointer;">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <h3 style="margin:0;">Despesas</h3>
                        <span id="despesas-subtitle" style="font-size:0.75rem; color:var(--text-muted);">Clique para detalhar</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:0.8rem;">
                        <strong id="fixed-spent" class="text-danger">R$ 0,00</strong>
                        <i class="ph ph-caret-down" id="despesas-chevron" style="font-size:1.1rem; color:var(--text-muted); transition:transform 0.3s;"></i>
                    </div>
                </div>
                <!-- Lista resumida por fonte -->
                <div id="despesas-sources-wrap">
                    <ul id="fixed-expense-list" class="expense-list" style="padding: 0 0.25rem;"></ul>
                </div>
                <!-- Lista expandida com todos os itens -->
                <div id="despesas-detail-wrap" class="hidden" style="border-top:1px solid #f0f4f8; padding-top:0.5rem;">
                    <ul id="fixed-expense-detail" class="expense-list" style="padding: 0 0.25rem;"></ul>
                </div>
            </section>
            <!-- Fim Dashboard Individual -->"""
    # Replace from marker_start up to and including marker_end
    content = content[:s] + new_block + content[e + len(marker_end):]
    # Write back with CRLF
    result = content.replace('\n', '\r\n')
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(result)
    print("SUCCESS")
