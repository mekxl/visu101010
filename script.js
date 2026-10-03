const btnMic = document.getElementById('btn-mic');
const audioUpload = document.getElementById('audio-upload');
const audioPlayer = document.getElementById('audio-player');
const uiContainer = document.getElementById('ui-container');

let audioCtx, analyser, dataArray, source;
let isAnimating = false;
let isPlayerConnected = false;

// --------------------------------------------------------
// SETUP 3D (THREE.JS) - ESTÉTICA DARK TECHNO PIXELADA
// --------------------------------------------------------
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020202, 0.02);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 18, 45);
camera.lookAt(0, 0, 0);

// ANTIALIAS: FALSE (Garante o visual pixelado/retro de jogo indie underground)
const renderer = new THREE.WebGLRenderer({ 
    canvas: document.getElementById('visualizer'), 
    antialias: false 
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x020202);

// REDUZ RESOLUÇÃO INTERNA PARA ACRESCENTAR PIXEL ART NATIVA
renderer.setPixelRatio(window.devicePixelRatio > 1 ? 1.5 : 1);

// 1. MALHA DO CHÃO (Reage fortemente aos graves)
const planeGeometry = new THREE.PlaneGeometry(160, 160, 64, 64);
planeGeometry.rotateX(-Math.PI / 2);

const planeMaterial = new THREE.MeshBasicMaterial({
    color: 0xff003c, // Vermelho sangue industrial
    wireframe: true,
    transparent: true,
    opacity: 0.5
});
const terrain = new THREE.Mesh(planeGeometry, planeMaterial);
scene.add(terrain);

// 2. NÚCLEO CENTRAL (Poliedro flutuante que reage aos médios/synths)
const coreGeometry = new THREE.IcosahedronGeometry(8, 1);
const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff, // Ciano estourado
    wireframe: true
});
const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
coreMesh.position.set(0, 12, 0);
scene.add(coreMesh);

// Redimensionamento responsivo
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --------------------------------------------------------
// SISTEMA DE ÁUDIO À PROVA DE FALHAS
// --------------------------------------------------------
function initAudio() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256; // Bandas otimizadas
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
        alert("Acesso ao microfone negado ou indisponível.");
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
    }).catch(err => alert("O navegador bloqueou a execução automática. Dê play no player."));
});

// --------------------------------------------------------
// LOOP DE ANIMAÇÃO E SINCRONIZAÇÃO RÍTMICA
// --------------------------------------------------------
function comecarVisualizacao() {
    uiContainer.style.opacity = '0';
    setTimeout(() => {
        uiContainer.style.display = 'none';
    }, 500);
    
    if (!isAnimating) {
        isAnimating = true;
        animate();
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    analyser.getByteFrequencyData(dataArray);
    
    // Análise de frequências específicas
    let bass = 0;
    for(let i = 0; i < 4; i++) bass += dataArray[i];
    bass = bass / 4; // Graves profundos (Kicks)
    
    let mids = 0;
    for(let i = 10; i < 30; i++) mids += dataArray[i];
    mids = mids / 20; // Médios / Synths

    // --- REAÇÃO VISUAL AGRESSIVA ---
    
    // Se o bumbo bater forte, a cor do terreno fica branca/estourada e a câmera treme
    if (bass > 210) {
        planeMaterial.color.setHex(0xffffff);
        camera.position.x = (Math.random() - 0.5) * 3;
        camera.position.y = 18 + (Math.random() - 0.5) * 3;
    } else {
        planeMaterial.color.setHex(0xff003c); // Vermelho industrial padrão
        camera.position.x = 0;
        camera.position.y = 18;
    }

    // Deforma a malha do chão com base nas frequências espalhadas
    const positions = planeGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        const distance = Math.sqrt(x * x + z * z);

        let index = Math.floor((distance / 160) * dataArray.length);
        if (index >= dataArray.length) index = dataArray.length - 1;

        const amp = dataArray[index];
        const boost = (index < 6) ? 2.8 : 1.0; // Dá mais altura pross sub-graves do centro
        const height = (amp / 255) * 18 * boost;

        positions.setY(i, height);
    }
    positions.needsUpdate = true;

    // Faz o núcleo geométrico central pulsar e girar conforme os synths e médios
    let coreScale = 1 + (mids / 120);
    coreMesh.scale.set(coreScale, coreScale, coreScale);
    coreMesh.rotation.x += 0.01;
    coreMesh.rotation.y += 0.015;

    // Rotação lenta e claustrofóbica do terreno
    terrain.rotation.z -= 0.0015;

    renderer.render(scene, camera);
}
