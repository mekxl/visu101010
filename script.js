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

// Configuração do Áudio (Microfone ou Arquivo)
const btnStart = document.getElementById('btn-start');
const btnMode = document.getElementById('btn-mode');
const audioStatus = document.getElementById('audio-status');

btnStart.addEventListener('click', async () => {
    if (!isAudioInitialized) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;
            
            // Permissão de microfone como fonte reativa principal
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            microphone = audioContext.createMediaStreamSource(stream);
            microphone.connect(analyser);
            
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            isAudioInitialized = true;
            btnStart.textContent = "ÁUDIO ATIVO";
            btnStart.style.borderColor = "#ffffff";
            audioStatus.textContent = "Reagindo ao som ambiente/microfone";
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

// Alternar modo de visualização
btnMode.addEventListener('click', () => {
    if (currentMode === 'vertical') {
        currentMode = 'horizontal';
        btnMode.textContent = "MODO: HORIZONTAL";
    } else {
        currentMode = 'vertical';
        btnMode.textContent = "MODO: VERTICAL";
    }
});

// Malha de Vértices Estática (Apenas reage ao som)
const cols = 36;
const rows = 24;
let points = [];

function initGrid() {
    points = [];
    for (let r = 0; r <= rows; r++) {
        let row = [];
        for (let c = 0; c <= cols; c++) {
            row.push({
                xOrg: c / cols,
                yOrg: r / rows,
                z: 0
            });
        }
        points.push(row);
    }
}
initGrid();

let time = 0;

function animate() {
    requestAnimationFrame(animate);

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let audioLevel = 0;
    if (isAudioInitialized && analyser) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        audioLevel = sum / dataArray.length / 128.0; // Normalizado 0 a ~2+
    }

    time += 0.03 + (audioLevel * 0.05);

    // Projeção 3D para 2D
    const w = canvas.width;
    const h = canvas.height;

    let projectedGrid = [];

    for (let r = 0; r <= rows; r++) {
        let projectedRow = [];
        for (let c = 0; c <= cols; c++) {
            let p = points[r][c];
            
            // Coordenadas normalizadas -0.5 a 0.5
            let nx = p.xOrg - 0.5;
            let ny = p.yOrg - 0.5;
            let nz = 0;

            // Modulação por onda e áudio
            let wave = Math.sin(nx * 6 + time) * Math.cos(ny * 6 + time);
            let audioEffect = audioLevel * Math.sin(nx * 12 + ny * 12 - time * 2);
            nz = (wave * 0.2) + (audioEffect * 0.5);

            let px, py;

            if (currentMode === 'vertical') {
                // Modo Vertical (Chão inclinado em perspectiva)
                let scale = 1.0 / (p.yOrg * 1.5 + 0.5);
                px = w * 0.5 + nx * w * 1.8 * scale;
                py = h * 0.35 + (p.yOrg * h * 0.8) + (nz * h * 0.3);
            } else {
                // Modo Horizontal (Parede frontal completa cobrindo a tela)
                px = w * 0.5 + nx * w * 0.95;
                py = h * 0.5 + ny * h * 0.95 + (nz * h * 0.25);
            }

            projectedRow.push({ x: px, y: py, z: nz });
        }
        projectedGrid.push(projectedRow);
    }

    // Desenhar linhas da malha (Preto e Branco puro)
    ctx.lineWidth = 1.2;

    // Linhas Horizontais
    for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        for (let c = 0; c <= cols; c++) {
            let pt = projectedGrid[r][c];
            if (c === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        }
        // Intensidade de brilho baseada no Z (profundidade / reação ao som)
        let alpha = 0.15 + Math.abs(projectedGrid[r][0].z) * 0.8;
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(alpha, 1.0)})`;
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
        let alpha = 0.15 + Math.abs(projectedGrid[0][c].z) * 0.8;
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(alpha, 1.0)})`;
        ctx.stroke();
    }
}

animate();
