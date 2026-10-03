const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let audioContext, analyser, microphone, dataArray;
let isAudioInitialized = false;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const btnStart = document.getElementById('btn-start');
const audioStatus = document.getElementById('audio-status');

btnStart.addEventListener('click', async () => {
    if (!isAudioInitialized) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 128; // Poucas bandas para picos marcantes
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            microphone = audioContext.createMediaStreamSource(stream);
            microphone.connect(analyser);
            
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            isAudioInitialized = true;
            btnStart.textContent = "ÁUDIO ATIVO";
            btnStart.style.borderColor = "#ffffff";
            audioStatus.textContent = "Esfera reativa conectada ao espectro";
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

// Geração de uma esfera Low-Poly (estilo Icosaedro / Geodésica de baixa resolução)
let vertices = [];
let faces = [];

function createLowPolySphere(radius) {
    vertices = [];
    faces = [];

    let t = (1.0 + Math.sqrt(5.0)) / 2.0;
    
    let baseVerts = [
        [-1,  t,  0], [ 1,  t,  0], [-1, -t,  0], [ 1, -t,  0],
        [ 0, -1,  t], [ 0,  1,  t], [ 0, -1, -t], [ 0,  1, -t],
        [ t,  0, -1], [ t,  0,  1], [-t,  0, -1], [-t,  0,  1]
    ];

    for (let v of baseVerts) {
        let len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
        vertices.push({
            x: (v[0] / len) * radius,
            y: (v[1] / len) * radius,
            z: (v[2] / len) * radius,
            ox: v[0] / len,
            oy: v[1] / len,
            oz: v[2] / len
        });
    }

    let baseFaces = [
        [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
        [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
        [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];

    faces = baseFaces;
}

createLowPolySphere(180);

let rotX = 0;
let rotY = 0;
let time = 0;

function animate() {
    requestAnimationFrame(animate);

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (isAudioInitialized && analyser) {
        analyser.getByteFrequencyData(dataArray);
    }

    // Rotação lenta e constante da bola
    rotX += 0.004;
    rotY += 0.006;
    time += 0.03;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    let transformedVertices = vertices.map((v, index) => {
        let freqVal = 0;
        if (isAudioInitialized && dataArray) {
            let freqIndex = index % dataArray.length;
            freqVal = dataArray[freqIndex] / 255.0;
        }

        // Deformação pontual baseada na frequência específica do vértice
        let deform = 1.0 + Math.pow(freqVal, 1.4) * 0.7 + Math.sin(time * 2 + index) * 0.08;
        let x = v.ox * 160 * deform;
        let y = v.oy * 160 * deform;
        let z = v.oz * 160 * deform;

        // Rotação em Y
        let cosY = Math.cos(rotY);
        let sinY = Math.sin(rotY);
        let x1 = x * cosY - z * sinY;
        let z1 = z * cosY + x * sinY;

        // Rotação em X
        let cosX = Math.cos(rotX);
        let sinX = Math.sin(rotX);
        let y2 = y * cosX - z1 * sinX;
        let z2 = z1 * cosX + y * sinX;

        let perspective = 500 / (500 + z2);

        return {
            x: cx + x1 * perspective,
            y: cy + y2 * perspective,
            z: z2
        };
    });

    ctx.lineWidth = 1.2;

    for (let f of faces) {
        let p0 = transformedVertices[f[0]];
        let p1 = transformedVertices[f[1]];
        let p2 = transformedVertices[f[2]];

        let avgZ = (p0.z + p1.z + p2.z) / 3;
        let alpha = 0.15 + (avgZ + 160) / 320 * 0.85;

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.closePath();

        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(Math.max(alpha, 0.1), 1.0)})`;
        ctx.stroke();
    }
}

animate();
