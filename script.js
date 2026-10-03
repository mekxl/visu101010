const btnMic = document.getElementById('btn-mic');
const audioUpload = document.getElementById('audio-upload');
const audioPlayer = document.getElementById('audio-player');
const uiContainer = document.getElementById('ui-container');

let audioCtx, analyser, dataArray, source;
let isAnimating = false;
let isPlayerConnected = false;

// --------------------------------------------------------
// SETUP DO MUNDO 3D (THREE.JS)
// --------------------------------------------------------
const scene = new THREE.Scene();
// Adiciona uma névoa escura ao fundo para dar sensação de profundidade e sumir com as bordas
scene.fog = new THREE.FogExp2(0x030303, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// Posiciona a câmera olhando de cima e meio de lado para a malha
camera.position.set(0, 20, 50);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ 
    canvas: document.getElementById('visualizer'), 
    antialias: true 
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x030303);

// CRIAÇÃO DA MALHA (O Terreno)
// Largura, Altura, SegmentosX, SegmentosY (128x128 gera muitos vértices para reagir ao som)
const geometry = new THREE.PlaneGeometry(150, 150, 128, 128);
geometry.rotateX(-Math.PI / 2); // Deita o plano para virar um chão

const material = new THREE.MeshBasicMaterial({
    color: 0xff003c, // O vermelho agressivo do Mekxl
    wireframe: true, // Modo arame (sem preenchimento)
    transparent: true,
    opacity: 0.6
});

const plane = new THREE.Mesh(geometry, material);
scene.add(plane);

// Redimensionamento de tela
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --------------------------------------------------------
// CÉREBRO DO ÁUDIO
// --------------------------------------------------------
function initAudio() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 512; // 256 bandas de frequência
            dataArray = new Uint8Array(analyser.frequencyBinCount);
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) {
        alert("Erro no AudioContext: " + e.message);
    }
}

btnMic.addEventListener('click', async () => {
    try {
        initAudio();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (source) source.disconnect();
        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        comecarVisualizacao();
    } catch (err) {
        alert("Microfone bloqueado ou indisponível!");
    }
});

audioUpload.addEventListener('change', function(e) {
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
    
    audioPlayer.play().then(() => {
        comecarVisualizacao();
        audioPlayer.style.display = 'block';
    }).catch(err => alert("O navegador bloqueou o Autoplay"));
});

// --------------------------------------------------------
// MOTOR DE ANIMAÇÃO (A MÁGICA HZ -> 3D ACONTECE AQUI)
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
    
    analyser.getByteFrequencyData(dataArray);
    
    // Captura os vértices (os pontinhos) da nossa malha 3D
    const positions = geometry.attributes.position;
    
    // Lógica para dar um pulo extra na câmera quando o grave bate forte
    let bass = 0;
    for(let i = 0; i < 5; i++) bass += dataArray[i];
    bass = bass / 5;
    
    if (bass > 220) {
        camera.position.z = 50 + (Math.random() - 0.5) * 2; // Shake na câmera
        material.color.setHex(0xffffff); // Pisca branco no Kick forte
    } else {
        camera.position.z = 50;
        material.color.setHex(0xff003c); // Volta pro vermelho
    }

    // MAPEAR FREQUÊNCIAS PARA A MALHA
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);

        // Calcula a distância do vértice até o centro do mundo (0,0)
        // Isso cria um efeito de ondas que saem do centro para as bordas
        const distance = Math.sqrt(x * x + z * z);

        // Transforma a distância num índice do array de frequências (0 a 255)
        // O centro (distância baixa) vai ler os graves.
        // As bordas (distância alta) vão ler os agudos.
        let index = Math.floor(distance * 1.5); 
        
        // Garante que o índice não passe do limite do array
        if (index > dataArray.length - 1) index = dataArray.length - 1;

        // Pega o volume daquela frequência específica
        const amplitude = dataArray[index];
        
        // Define a altura (Y) do ponto na malha com base no volume
        // Frequências graves (centro) têm um multiplicador extra para as montanhas ficarem mais altas
        const kickMultiplier = (index < 20) ? 2.5 : 1;
        const height = (amplitude / 255) * 15 * kickMultiplier;

        positions.setY(i, height);
    }
    
    // Avisa a placa de vídeo que a malha foi deformada e precisa ser redesenhada
    positions.needsUpdate = true;
    
    // Gira a malha devagarzinho pra dar um efeito cinematográfico
    plane.rotation.z -= 0.002;

    renderer.render(scene, camera);
}
