const btnMic = document.getElementById('btn-mic');
const audioUpload = document.getElementById('audio-upload');
const audioPlayer = document.getElementById('audio-player');
const uiContainer = document.getElementById('ui-container');
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

let audioCtx, analyser, dataArray, source;
let isAnimating = false;
let isPlayerConnected = false;

// Cérebro do áudio blindado contra erros de contexto
function initAudio() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 512;
            dataArray = new Uint8Array(analyser.frequencyBinCount);
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    } catch (e) {
        alert("Erro no AudioContext: " + e.message);
    }
}

// --------------------------------------------------------
// OPÇÃO 1: MICROFONE / SISTEMA
// --------------------------------------------------------
btnMic.addEventListener('click', async () => {
    try {
        initAudio();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        if (source) source.disconnect();
        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        
        comecarVisualizacao();
    } catch (err) {
        alert("Bloqueado!\nMotivo: " + err.message + "\n\nVocê abriu o index.html com 2 cliques? Navegadores bloqueiam o áudio assim. Teste pelo link do GitHub Pages!");
    }
});

// --------------------------------------------------------
// OPÇÃO 2: SUBIR ARQUIVO (MP3/WAV)
// --------------------------------------------------------
audioUpload.addEventListener('change', function(e) {
    try {
        const file = e.target.files[0];
        if (!file) return;

        initAudio();
        
        const fileURL = URL.createObjectURL(file);
        audioPlayer.src = fileURL;
        
        if (!isPlayerConnected) {
            source = audioCtx.createMediaElementSource(audioPlayer);
            source.connect(analyser);
            analyser.connect(audioCtx.destination);
            isPlayerConnected = true;
        }
        
        // Tenta reproduzir e avisa se o navegador impedir
        audioPlayer.play().then(() => {
            comecarVisualizacao();
            audioPlayer.style.display = 'block';
        }).catch(err => {
            alert("O navegador bloqueou o Autoplay: " + err.message);
        });
        
    } catch (err) {
        alert("Erro ao processar o arquivo: " + err.message);
    }
});

// --------------------------------------------------------
// MOTOR GRÁFICO (Sem alterações no design)
// --------------------------------------------------------
function comecarVisualizacao() {
    uiContainer.style.background = 'transparent';
    uiContainer.querySelector('h1').style.display = 'none';
    uiContainer.querySelector('.controls').style.display = 'none';
    
    if (!isAnimating) {
        isAnimating = true;
        animate();
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    ctx.fillStyle = 'rgba(3, 3, 3, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    analyser.getByteFrequencyData(dataArray);
    
    let bass = 0;
    for(let i = 0; i < 10; i++) bass += dataArray[i];
    bass = bass / 10; 
    
    let mids = 0;
    for(let i = 20; i < 100; i++) mids += dataArray[i];
    mids = mids / 80;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    let kickThreshold = 210;
    let shakeX = 0;
    let shakeY = 0;
    
    if (bass > kickThreshold) {
        shakeX = (Math.random() - 0.5) * 20;
        shakeY = (Math.random() - 0.5) * 20;
        ctx.strokeStyle = '#ff003c'; 
        ctx.lineWidth = 6;
    } else {
        ctx.strokeStyle = '#444'; 
        ctx.lineWidth = 2;
    }

    let baseRadius = 50;
    let reactiveRadius = baseRadius + (bass * 1.2);
    
    ctx.beginPath();
    ctx.arc(centerX + shakeX, centerY + shakeY, reactiveRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < dataArray.length; i++) {
        let angle = (i / dataArray.length) * Math.PI * 2;
        let amplitude = dataArray[i]; 
        
        let x = centerX + shakeX + Math.cos(angle) * (reactiveRadius + amplitude + 30);
        let y = centerY + shakeY + Math.sin(angle) * (reactiveRadius + amplitude + 30);
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
    
    ctx.strokeStyle = `rgb(${mids * 1.5}, ${mids * 0.5}, 255)`; 
    ctx.lineWidth = 1.5;
    ctx.stroke();
}
