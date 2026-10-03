const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let audioContext, analyser, microphone, dataArray;
let isAudioInitialized = false;

// Modos: 'vertical' (chão inclinado) ou 'horizontal' (parede frontal cobrindo a tela)
let currentMode = 'vertical'; 

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Controles UI
const btnStart = document.getElementById('btn-start');
const btnMode = document.getElementById('btn-mode');
const audioStatus = document.getElementById('audio-status');

btnStart.addEventListener('click', async () => {
    if (!isAudioInitialized) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256; // Reduzido para mapear blocos discretos de frequências
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            microphone = audioContext.createMediaStreamSource(stream);
            microphone.connect(analyser);
            
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            isAudioInitialized = true;
            btnStart.textContent = "ÁUDIO ATIVO";
            btnStart.style.borderColor = "#ffffff";
            audioStatus.textContent = "Espectro fragmentado por Hz ativo";
        } catch (err) {
            console.error("Erro ao acessar microfone:", err);
            audioStatus.textContent = "Erro ao acessar microfone. Verifique as permissões.";
        }
    } else {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }
});

btnMode.addEventListener('click', () => {
    if (currentMode === 'vertical') {
        currentMode = 'horizontal';
        btnMode.textContent = "MODO: HORIZONTAL";
    } else {
        currentMode = 'vertical';
        btnMode.textContent = "MODO: VERTICAL";
    }
});

// Malha de Vértices Estática
const cols = 40;
const rows = 28;
let points = [];

function initGrid() {
    points = [];
    for (let r = 0; r <= rows; r++) {
        let row = [];
        for (let c = 0; c <= cols; c++) {
            row.push({
                xOrg: c / cols,
                yOrg: r / rows
            });
        }
        points.push(row);
    }
}
initGrid();

function animate() {
    requestAnimationFrame(animate);

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Captura o espectro de frequências (se ativo)
    if (isAudioInitialized && analyser) {
        analyser.getByteFrequencyData(dataArray);
    }

    const w = canvas.width;
    const h = canvas.height;
    let projectedGrid = [];

    for (let r = 0; r <= rows; r++) {
        let projectedRow = [];
        for (let c = 0; c <= cols; c++) {
            let p = points[r][c];
            
            let nx = p.xOrg - 0.5;
            let ny = p.yOrg - 0.5;
            let nz = 0;

            if (isAudioInitialized && dataArray) {
                // Cada coluna e linha aponta para uma frequência específica (Hz) diferente do array
                // Isso cria picos isolados e psicodélicos espalhados pela malha
                let freqIndex = Math.floor(Math.abs(nx * ny * 45)) % dataArray.length;
                let rawAmp = dataArray[freqIndex] / 255.0; // Normalizado 0 a 1

                // Adiciona ruído estocástico psicodélico baseado na posição
                nz = Math.pow(rawAmp, 1.8) * (Math.sin(c * 1.5 + r * 1.5) * 0.8 + 0.6);
            }

            let px, py;

            if (currentMode === 'vertical') {
                // Modo Vertical (Chão inclinado)
                let scale = 1.0 / (p.yOrg * 1.6 + 0.4);
                px = w * 0.5 + nx * w * 1.8 * scale;
                py = h * 0.35 + (p.yOrg * h * 0.85) - (nz * h * 0.45);
            } else {
                // Modo Horizontal (Parede frontal completa)
                px = w * 0.5 + nx * w * 0.95;
                py = h * 0.5 + ny * h * 0.95 - (nz * h * 0.35);
            }

            projectedRow.push({ x: px, y: py, z: nz });
        }
        projectedGrid.push(projectedRow);
    }

    // Desenhar linhas da malha em Preto e Branco puro com intensidade reativa
    ctx.lineWidth = 1.2;

    // Linhas Horizontais
    for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        for (let c = 0; c <= cols; c++) {
            let pt = projectedGrid[r][c];
            if (c === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        }
        let avgZ = projectedGrid[r][Math.floor(cols/2)].z;
        let alpha = 0.1 + avgZ * 0.9;
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(Math.max(alpha, 0.1), 1.0)})`;
        ctx.stroke();
    }

    // Linhas Verticais
    for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        for (let r = 0; r <= rows; r++) {
            let pt = projectedGrid[r][c];
            if (r === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        }
        let avgZ = projectedGrid[Math.floor(rows/2)][c].z;
        let alpha = 0.1 + avgZ * 0.9;
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(Math.max(alpha, 0.1), 1.0)})`;
        ctx.stroke();
    }
}

animate();
