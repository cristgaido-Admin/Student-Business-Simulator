const fs = require('fs');
const path = 'c:/Users/crist/Desktop/Proyecto_IA/ExpertOperaciones2026/index.html';
let html = fs.readFileSync(path, 'utf8');

// 1. Add tab 3
html = html.replace(
    '<button class="round-tab" id="tab-r2" onclick="switchRound(2)">',
    '<button class="round-tab" id="tab-results" onclick="switchRound(\'results\')">\n                    <span class="tab-number">03</span>\n                    <span class="tab-label">Resultados</span>\n                    <span class="tab-sublabel">Análisis de Desempeño</span>\n                </button>\n                <button class="round-tab" id="tab-r2" onclick="switchRound(2)">'
);

// 2. Wrap sim-form content? No, sim-form is already there. Just replace the results section.
const resultsStart = html.indexOf('<div class="dashboard" style="margin-top: 2rem;">');
const resultsEnd = html.indexOf('</div>\n            </div>\n        </div>\n    </div>\n    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>');

if (resultsStart > -1 && resultsEnd > -1) {
    const originalResults = html.substring(resultsStart, resultsEnd);
    
    // Extract inner HTML of the results-card to duplicate it
    const cardContentStart = originalResults.indexOf('<h2>Resultados Grupo');
    const cardContentEnd = originalResults.indexOf('</div>\n                    <div class="empty-state" id="empty-state">');
    
    const baseCard = originalResults.substring(cardContentStart, cardContentEnd);
    
    // Create R1 card
    let cardR1 = baseCard.replace(/id="([^"]+)"/g, 'id="$1-r1"');
    cardR1 = cardR1.replace('<h2>Resultados Grupo <span id="results-round-badge-r1" class="round-badge">Ronda 1</span></h2>', '<h2>Resultados de la <span class="round-badge">Ronda 1</span></h2>');
    
    // Create R2 card
    let cardR2 = baseCard.replace(/id="([^"]+)"/g, 'id="$1-r2"');
    cardR2 = cardR2.replace('<h2>Resultados Grupo <span id="results-round-badge-r2" class="round-badge">Ronda 1</span></h2>', '<h2>Resultados de la <span class="round-badge r2">Ronda 2</span></h2>');

    const newResultsTab = `
            <div id="results-tab-screen" class="hidden">
                <div id="winner-trophy-container" style="margin-bottom: 2rem;"></div>
                <div class="dashboard" style="margin-top: 2rem; display: flex; flex-direction: column; gap: 2rem;">
                    <div class="card results-card" id="results-panel-r1">
                        ${cardR1}
                        </div>
                    </div>
                    <div class="card results-card hidden" id="results-panel-r2">
                        ${cardR2}
                        </div>
                    </div>
                </div>
            </div>
`;
    html = html.substring(0, resultsStart) + newResultsTab + '\n' + html.substring(resultsEnd);
    fs.writeFileSync(path, html);
    console.log('HTML updated successfully');
} else {
    console.log('Could not find results boundaries.');
}

