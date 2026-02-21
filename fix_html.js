const fs = require('fs');
const path = String.raw`i:\PROJETOS\projetoA2\public\index.html`;

let content = fs.readFileSync(path, 'utf-8').replace(/\r\n/g, '\n');

const startMarker = '<!-- Card Despesas Fixas (Home) -->';
const endMarker = '<!-- Fim Dashboard Individual -->';

const s = content.indexOf(startMarker);
const e = content.indexOf(endMarker);

console.log('start:', s, 'end:', e);

if (s === -1 || e === -1) {
    console.log('Markers not found!');
    const d = content.indexOf('Despesas');
    console.log('Nearby:', content.slice(Math.max(0, d - 50), d + 300));
    process.exit(1);
}

const newBlock = `<!-- Card Despesas (accordion) -->
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
                <div id="despesas-sources-wrap">
                    <ul id="fixed-expense-list" class="expense-list" style="padding: 0 0.25rem;"></ul>
                </div>
                <div id="despesas-detail-wrap" class="hidden" style="border-top:1px solid #f0f4f8; padding-top:0.5rem;">
                    <ul id="fixed-expense-detail" class="expense-list" style="padding: 0 0.25rem;"></ul>
                </div>
            </section>
            <!-- Fim Dashboard Individual -->`;

content = content.slice(0, s) + newBlock + content.slice(e + endMarker.length);
fs.writeFileSync(path, content.replace(/\n/g, '\r\n'), 'utf-8');
console.log('SUCCESS – dashboard accordion replacement done!');
