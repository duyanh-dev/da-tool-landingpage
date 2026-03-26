function demoCompile() {
    const input = document.getElementById('scss-input').value;
    const output = document.getElementById('css-output');
    output.innerText = "Compiling...";
    setTimeout(() => {
        let res = input.replace(/\$primary:\s*([^;]+);/g, "").replace(/\$radius:\s*([^;]+);/g, "").replace(/\$primary/g, "#6366f1").replace(/\$radius/g, "24px").replace(/&:hover\s*{([^}]+)}/g, ".card:hover {$1}").trim();
        output.innerText = res + "\n\n/* Success! */";
    }, 500);
}
function demoJson() {
    const input = document.getElementById('json-input');
    try { input.value = JSON.stringify(JSON.parse(input.value), null, 4); } catch(e) { alert("Invalid JSON."); }
}
function runStudio() {
    const html = document.getElementById('html-code').value;
    const css = `<style>${document.getElementById('css-code').value}</style>`;
    const js = `<script>${document.getElementById('js-code').value}<\/script>`;
    document.getElementById('studio-preview').srcdoc = `<html><body style="margin:0;">${html}${css}${js}</body></html>`;
}
window.onload = runStudio;

let clPoints = [{x: 25, y: 25}, {x: 75, y: 25}, {x: 75, y: 75}, {x: 25, y: 75}];
let draggingIdx = null;
const canvas = document.getElementById('mini-cl-canvas');
const preview = document.getElementById('cl-preview');
const guides = document.getElementById('cl-guides');

function initCodeLabDemo() {
    canvas.querySelectorAll('.dot-handle').forEach(d => d.remove());
    clPoints.forEach((p, idx) => {
        const dot = document.createElement('div');
        dot.className = 'absolute w-5 h-5 bg-indigo-600 rounded-full dot-handle border-4 border-slate-950 z-20 shadow-xl';
        dot.style.left = `calc(${p.x}% - 10px)`;
        dot.style.top = `calc(${p.y}% - 10px)`;
        dot.onmousedown = (e) => { e.preventDefault(); draggingIdx = idx; guides.style.opacity = '1'; };
        canvas.appendChild(dot);
    });
    preview.style.clipPath = `polygon(${clPoints.map(p => `${p.x}% ${p.y}%`).join(', ')})`;
}

window.addEventListener('mousemove', (e) => {
    if (draggingIdx === null) return;
    const rect = canvas.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    if (Math.abs(x - 50) < 4) x = 50; if (Math.abs(y - 50) < 4) y = 50;
    document.getElementById('guide-x').setAttribute('y1', `${y}%`); document.getElementById('guide-x').setAttribute('y2', `${y}%`);
    document.getElementById('guide-y').setAttribute('x1', `${x}%`); document.getElementById('guide-y').setAttribute('x2', `${x}%`);
    clPoints[draggingIdx] = {x, y};
    initCodeLabDemo();
});

window.addEventListener('mouseup', () => { draggingIdx = null; guides.style.opacity = '0'; });
function scrollToId(id) { document.getElementById(id).scrollIntoView({ behavior: 'smooth' }); }
initCodeLabDemo();