const btnMic = document.getElementById('btn-mic');
const audioUpload = document.getElementById('audio-upload');
const audioPlayer = document.getElementById('audio-player');
const uiContainer = document.getElementById('ui-container');

const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let audioCtx, analyser, dataArray, source;
let isAnimating = false;
let isPlayerConnected = false;

// Função para inicializar o cérebro do áudio (precisa ser ativada por um clique)
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// --------------------------------------------------------
// OPÇÃO 1: MICROFONE / SISTEMA
// --------------------------------------------------------
btnMic.addEventListener('click', async () => {
    initAudio();
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Se já tinha um source antes, desconecta para evitar conflitos
        if (source) source.disconnect(); 
        
        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        // Atenção: Não conectamos o microfone ao 'destination' (caixas de som) para não dar eco.
        
        comecarVisualizacao();
    } catch (err) {
        alert('Erro ao acessar microfone. Verifique as permissões do navegador.');
        console.error(err);
    }
});

// --------------------------------------------------------
// OPÇÃO 2: SUBIR ARQUIVO DE ÁUDIO
// --------------------------------------------------------
audioUpload.addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;

    initAudio();
    
    // Cria uma URL temporária para o arquivo e joga no player
    const fileURL = URL.createObjectURL(file);
    audioPlayer.src = fileURL;
    
    // Conecta o player de áudio ao analisador apenas uma vez
    if (!isPlayerConnected) {
        source = audioCtx.createMediaElementSource(audioPlayer);
        source.connect(analyser);
        analyser.connect(audioCtx.destination); // Envia o som para as caixas de som
        isPlayerConnected = true;
    }
    
    audioPlayer.play();
    audioPlayer.style.display = 'block'; // Mostra o player para pausar/avançar
    comecarVisualizacao();
});

// --------------------------------------------------------
// MOTOR GRÁFICO
// --------------------------------------------------------
function comecarVisualizacao() {
    uiContainer.style.background = 'transparent'; // Remove o fundo preto do menu
    uiContainer.querySelector('h1').style.display = 'none'; // Esconde o título
    uiContainer.querySelector('.controls').style.display = 'none'; // Esconde os botões
    
    if (!isAnimating) {
        isAnimating = true;
        animate();
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    // Efeito de rastro (motion blur)
    ctx.fillStyle = 'rgba(3, 3, 3, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    analyser.getByteFrequencyData(dataArray);
    
    // Isolamento de frequências
    let bass = 0;
    for(let i = 0; i < 10; i++) bass += dataArray[i];
    bass = bass / 10; 
    
    let mids = 0;
    for(let i = 20; i < 100; i++) mids += dataArray[i];
    mids = mids / 80;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Configuração do kick (Bumbo)
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

    // Desenho do núcleo
    let baseRadius = 50;
    let reactiveRadius = baseRadius + (bass * 1.2);
    
    ctx.beginPath();
    ctx.arc(centerX + shakeX, centerY + shakeY, reactiveRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Desenho das ondas externas
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

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
