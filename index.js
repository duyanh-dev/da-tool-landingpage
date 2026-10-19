/* always start at the top: keeps preloader, pins and scroll triggers consistent after a reload */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
scrollTo(0, 0);

/* ===== ORIGINAL LOGIC (unchanged) ===== */
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
window.addEventListener('load', runStudio);

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

/* ===== GSAP + THREE.JS EXPERIENCE ===== */
(function () {
    if (!window.gsap || !window.THREE) return;
    gsap.registerPlugin(ScrollTrigger);
    addEventListener('load', () => ScrollTrigger.refresh());
    document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = matchMedia('(pointer:fine)').matches;
    const LIGHT = new THREE.Color(0xe4e7ec), DARK = new THREE.Color(0x0b0d12);

    function split(el, by) {
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [];
        while (w.nextNode()) nodes.push(w.currentNode);
        nodes.forEach(n => {
            const f = document.createDocumentFragment();
            const parts = by === 'word' ? n.textContent.split(/(\s+)/) : n.textContent.split('');
            parts.forEach(p => {
                if (!p.trim()) { f.append(p.length ? ' ' : ''); return; }
                const s = document.createElement('span');
                s.className = by === 'word' ? 'wd' : 'ch';
                s.textContent = p; f.append(s);
                if (by === 'word') f.append(' ');
            });
            n.replaceWith(f);
        });
        return el.querySelectorAll(by === 'word' ? '.wd' : '.ch');
    }

    /* --- three.js: a calm, breathing field of dots (all motion runs on the GPU) --- */
    const cv = document.getElementById('bg3d');
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    const PR = Math.min(devicePixelRatio, 2);
    renderer.setPixelRatio(PR);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    const small = innerWidth < 768;
    const COLS = small ? 90 : 170, ROWS = small ? 60 : 100, GX = 80, GZ = 52;
    const pos = new Float32Array(COLS * ROWS * 3);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const i = (r * COLS + c) * 3;
        pos[i] = (c / (COLS - 1) - .5) * GX; pos[i + 1] = 0; pos[i + 2] = 8 - (r / (ROWS - 1)) * GZ;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const U = {
        uTime: { value: 0 }, uFlow: { value: 0 }, uIntro: { value: 0 }, uPx: { value: PR }, uSize: { value: small ? 2.2 : 2.6 },
        uMouse: { value: new THREE.Vector2(0, -99) }, uOpacity: { value: .4 },
        uBase: { value: new THREE.Color(0x0f1115) }, uAccent: { value: new THREE.Color(0x3a43ff) }
    };
    const field = new THREE.Points(geo, new THREE.ShaderMaterial({
        uniforms: U, transparent: true, depthWrite: false,
        vertexShader: `
            uniform float uTime, uFlow, uPx, uSize, uIntro; uniform vec2 uMouse;
            varying float vA; varying float vH;
            void main() {
                vec3 p = position; float z = p.z + uFlow;
                float h = sin(p.x * .22 + uTime * .35) * .6 + sin(z * .25 - uTime * .3 + p.x * .1) * .7 + sin((p.x * .6 + z) * .12 + uTime * .2) * .8;
                float d = distance(p.xz, uMouse);
                h += exp(-d * d * .05) * (.9 + .3 * sin(d * 1.6 - uTime * 2.));
                p.y = h * uIntro;
                vec4 mv = modelViewMatrix * vec4(p, 1.);
                gl_Position = projectionMatrix * mv;
                float dist = -mv.z;
                gl_PointSize = uSize * uPx * (14. / dist) * (1. + h * .12);
                vA = smoothstep(3., 9., dist) * (1. - smoothstep(22., 46., dist)) * (1. - smoothstep(.55, 1., abs(p.x) / 40.));
                vH = h;
            }`,
        fragmentShader: `
            uniform vec3 uBase, uAccent; uniform float uOpacity; varying float vA; varying float vH;
            void main() {
                float a = smoothstep(.5, .2, length(gl_PointCoord - .5));
                vec3 col = mix(uBase, uAccent, smoothstep(.4, 1.8, vH));
                gl_FragColor = vec4(col, a * vA * uOpacity);
            }`
    }));
    field.frustumCulled = false; scene.add(field);

    const S = { flow: 0, cy: 0 }, mouse = { x: 0, y: 0, nx: 0, ny: 0 };
    function resize() {
        const w = innerWidth, h = innerHeight;
        renderer.setSize(w, h, false); cam.aspect = w / h;
        cam.fov = w < 768 ? 65 : 50; cam.updateProjectionMatrix();
    }
    resize(); addEventListener('resize', resize);
    addEventListener('mousemove', e => { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = -(e.clientY / innerHeight) * 2 + 1; });

    const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3(), hit2 = new THREE.Vector2(), clock = new THREE.Clock();
    (function loop() {
        const t = clock.getElapsedTime();
        U.uTime.value = reduce ? 0 : t; U.uFlow.value = S.flow;
        mouse.nx += (mouse.x - mouse.nx) * 0.05; mouse.ny += (mouse.y - mouse.ny) * 0.05;
        cam.position.set(mouse.nx * 1.5, 6.5 + S.cy, 12);
        cam.lookAt(0, 0, -6);
        if (fine) {
            ray.setFromCamera(new THREE.Vector2(mouse.x, mouse.y), cam);
            if (ray.ray.intersectPlane(plane, hit)) U.uMouse.value.lerp(hit2.set(hit.x, hit.z), .08);
        }
        renderer.render(scene, cam);
        requestAnimationFrame(loop);
    })();

    /* scroll = the field slowly flows past, camera rises a touch */
    gsap.to(S, { flow: 40, cy: 2.5, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1.5, refreshPriority: -1 } });

    /* tone: page goes dark for the zoom chapter, then returns */
    const tone = { v: 0 };
    function applyTone() {
        const c = LIGHT.clone().lerp(DARK, tone.v);
        document.body.style.backgroundColor = '#' + c.getHexString();
        U.uBase.value.setHex(0x0f1115).lerp(new THREE.Color(0xffffff), tone.v);
        U.uOpacity.value = .4 - tone.v * .1;
        const root = document.documentElement.style, mix = (a, b) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), tone.v).getHexString();
        root.setProperty('--fg', mix(0x0f1115, 0xf4f5f7)); root.setProperty('--fg2', mix(0x475063, 0xc3c8d4));
        
        document.documentElement.style.setProperty('--veil', [c.r, c.g, c.b].map(v => Math.round(v * 255)).join(','));
    }

    /* --- hero intro (paused until preloader finishes) --- */
    const chars = split(document.getElementById('hero-title'), 'char');
    const intro = gsap.timeline({ paused: true, defaults: { ease: 'power4.out' } });
    window.__intro = intro;
    if (!reduce) {
        gsap.set(chars, { yPercent: 110, rotate: 8, opacity: 0 });
        gsap.set(['#hero-sub', '#hero-cta > *', 'nav > div'], { opacity: 0 });
        intro
            .to(chars, { yPercent: 0, rotate: 0, opacity: 1, duration: 1.1, stagger: 0.025 })
            .to('#hero-sub', { opacity: 1, y: 0, startAt: { y: 30 }, duration: .9 }, '-=.6')
            .to('#hero-cta > *', { opacity: 1, y: 0, scale: 1, startAt: { y: 40, scale: .9 }, duration: .8, stagger: .12 }, '-=.6')
            .to('nav > div', { opacity: 1, y: 0, startAt: { y: -80 }, duration: .9 }, 0.2)
            .to(U.uIntro, { value: 1, duration: 2.6, ease: 'power2.out' }, 0)
            .from(cam, { fov: 80, duration: 2.2, ease: 'power3.out', onUpdate: () => cam.updateProjectionMatrix() }, 0);
        gsap.to('#hero .max-w-5xl', { yPercent: -18, opacity: 0, scrollTrigger: { trigger: '#hero', start: 'center center', end: 'bottom top', scrub: true } });
    }

    if (reduce) { U.uIntro.value = 1; return; }

    /* story: words light up as you scroll */
    document.querySelectorAll('.story-p').forEach(p => {
        gsap.to(split(p, 'word'), { opacity: 1, stagger: .05, ease: 'none',
            scrollTrigger: { trigger: p, start: 'top 80%', end: 'bottom 45%', scrub: true } });
    });

    /* headings + cards reveal */
    gsap.utils.toArray('section h2').forEach(h => { if (h.closest('#zoom')) return; gsap.from(h, { yPercent: 60, opacity: 0, duration: 1, ease: 'power4.out', scrollTrigger: { trigger: h, start: 'top 88%' } }); });
    gsap.utils.toArray('.bento-card').forEach(c => gsap.from(c, { y: 90, opacity: 0, scale: .94, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 90%' } }));
    gsap.from('.prod-li', { x: -50, opacity: 0, stagger: .18, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: '.prod-li', start: 'top 85%' } });
    gsap.from('#chips .chip', { y: 60, opacity: 0, rotate: () => gsap.utils.random(-12, 12), stagger: .09, duration: 1, ease: 'back.out(2)', scrollTrigger: { trigger: '#chips', start: 'top 90%' } });

    /* --- section-to-section transitions --- */
    // outgoing sections recede (scale down + fade) as they leave the viewport
    ['#story', '#features'].forEach(sel => gsap.to(sel, { scale: .92, opacity: .2, y: -40, transformOrigin: 'center bottom', ease: 'none',
        scrollTrigger: { trigger: sel, start: 'bottom 75%', end: 'bottom 5%', scrub: true } }));
    // codelab opens like an aperture
    gsap.fromTo('#codelab', { clipPath: 'inset(10% 8% 10% 8% round 60px)' }, { clipPath: 'inset(0% 0% 0% 0% round 40px)', ease: 'none',
        scrollTrigger: { trigger: '#codelab', start: 'top 95%', end: 'top 25%', scrub: true } });
    gsap.to('#codelab', { scale: .94, opacity: .25, transformOrigin: 'center bottom', ease: 'none',
        scrollTrigger: { trigger: '#codelab', start: 'bottom 70%', end: 'bottom 5%', scrub: true } });
    gsap.from('#tech', { scale: 1.12, opacity: 0, ease: 'none', transformOrigin: 'center top',
        scrollTrigger: { trigger: '#tech', start: 'top 100%', end: 'top 45%', scrub: true } });

    /* --- ZOOM chapter: frame zooms in while approaching, text is visible the moment it is pinned --- */
    if (document.getElementById('zoom')) {
        const slides = gsap.utils.toArray('.zs');
        gsap.set(slides[0], { opacity: 1 });
        gsap.to(tone, { v: 1, ease: 'none', onUpdate: applyTone, scrollTrigger: { trigger: '#zoom', start: 'top bottom', end: 'top top', scrub: true } });
        gsap.fromTo('#zoom-frame', { scale: .3, borderRadius: 220, opacity: 0 }, { scale: 1, borderRadius: 40, opacity: 1, ease: 'none',
            scrollTrigger: { trigger: '#zoom', start: 'top bottom', end: 'top top', scrub: true } });
        const tl = gsap.timeline({ defaults: { ease: 'none' },
            scrollTrigger: { trigger: '#zoom', start: 'top top', end: '+=220%', pin: true, scrub: .8, refreshPriority: 1 } });
        tl.fromTo('#zoom-bar', { scaleX: 0 }, { scaleX: 1, duration: slides.length * 1.4, transformOrigin: 'left center', immediateRender: false }, 0);
        slides.forEach((s, i) => {
            if (i > 0) tl.fromTo(s, { scale: .5, opacity: 0, filter: 'blur(14px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: .7, ease: 'power3.out' });
            if (i < slides.length - 1) tl.to(s, { scale: 2.6, opacity: 0, filter: 'blur(18px)', duration: .7, ease: 'power2.in' }, '+=.3');
            else tl.to({}, { duration: .4 });
        });
        tl.fromTo('#zoom-frame', { scale: 1, opacity: 1, borderRadius: 40 }, { scale: .5, opacity: 0, borderRadius: 220, duration: .9, ease: 'power2.in', immediateRender: false })
          .fromTo(tone, { v: 1 }, { v: 0, duration: .9, onUpdate: applyTone, immediateRender: false }, '<');
    }

    /* auto-morph the clip-path demo until the user touches it */
    const morph = { t: 0 }; let touched = false;
    canvas.addEventListener('mousedown', () => { touched = true; });
    gsap.to(morph, { t: 1, duration: 3.5, repeat: -1, yoyo: true, ease: 'sine.inOut', onUpdate: () => {
        if (touched || draggingIdx !== null) return;
        const m = morph.t;
        clPoints = [{ x: 25 - 15 * m, y: 25 + 15 * m }, { x: 75 + 15 * m, y: 25 - 15 * m }, { x: 75 + 5 * m, y: 75 + 15 * m }, { x: 25 - 5 * m, y: 75 - 15 * m }];
        initCodeLabDemo();
    } });

    /* --- footer: curtain opens, headline rises, wordmark builds letter by letter --- */
    if (document.getElementById('footer')) {
        gsap.fromTo('#footer', { clipPath: 'inset(8% 5% 0% 5% round 48px 48px 0 0)' }, { clipPath: 'inset(0% 0% 0% 0% round 48px 48px 0 0)', ease: 'none',
            scrollTrigger: { trigger: '#footer', start: 'top 100%', end: 'top 35%', scrub: true } });
        gsap.from('#ft-title', { yPercent: 40, opacity: 0, duration: 1.1, ease: 'power4.out', scrollTrigger: { trigger: '#ft-title', start: 'top 88%' } });
        gsap.from('.ft-cta', { scale: 0, rotate: -90, duration: 1.1, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.ft-cta', start: 'top 92%' } });
        gsap.from('.ft-col', { y: 40, opacity: 0, stagger: .1, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: '.ft-cols', start: 'top 90%' } });
        const fw = document.getElementById('ft-word');
        gsap.from(split(fw, 'char'), { yPercent: 105, stagger: .04, ease: 'none', scrollTrigger: { trigger: '#ft-word-wrap', start: 'top 105%', end: 'bottom 85%', scrub: true } });
    }

    if (!fine) return;

    document.querySelectorAll('.tilt, .tilt-soft').forEach(c => {
        const k = c.classList.contains('tilt') ? 7 : 2.5;
        c.addEventListener('mousemove', e => {
            const r = c.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
            gsap.to(c, { rotateY: x * k, rotateX: -y * k, transformPerspective: 1000, duration: .5, ease: 'power2.out', overwrite: 'auto' });
        });
        c.addEventListener('mouseleave', () => gsap.to(c, { rotateX: 0, rotateY: 0, duration: .9, ease: 'elastic.out(1,.5)', overwrite: 'auto' }));
    });

    document.querySelectorAll('.mag').forEach(b => {
        b.addEventListener('mousemove', e => {
            const r = b.getBoundingClientRect();
            gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * .3, y: (e.clientY - r.top - r.height / 2) * .4, duration: .4, ease: 'power3.out' });
        });
        b.addEventListener('mouseleave', () => gsap.to(b, { x: 0, y: 0, duration: .8, ease: 'elastic.out(1,.4)' }));
    });
})();

/* ===== PRELOADER: ring + ruler + boot log + counter, then the screen parts along a cobalt seam ===== */
(function () {
    const pre = document.getElementById('pre');
    if (!pre) return;
    const done = () => { pre.remove(); document.documentElement.classList.remove('is-loading'); window.ScrollTrigger && ScrollTrigger.refresh(); };
    if (!window.gsap) return done();

    const $ = id => document.getElementById(id);
    const num = $('pre-n'), arc = $('pre-arc'), ruler = $('pre-ruler'), lis = [...document.querySelectorAll('#pre-log li')];
    const TICKS = 41, ticks = [];
    for (let i = 0; i < TICKS; i++) { const t = document.createElement('i'); if (i % 5 === 0) t.className = 'm'; ruler.appendChild(t); ticks.push(t); }

    const GL = '!<>-_/[]{}=+*^?#';
    function scramble(el, text, dur = .7) {
        const o = { p: 0 };
        gsap.to(o, { p: 1, duration: dur, ease: 'none', onUpdate: () => {
            const n = Math.floor(o.p * text.length);
            el.textContent = text.slice(0, n) + [...text.slice(n)].map(c => c === ' ' ? ' ' : GL[Math.random() * GL.length | 0]).join('');
        }, onComplete: () => { el.textContent = text; } });
    }
    const logs = [[0, 'mount workspace'], [28, 'sync supabase client'], [58, 'compile scss pipeline'], [88, 'ready to launch']];
    let shown = -1;
    const p = { v: 0 };
    const render = () => {
        const v = p.v;
        num.textContent = String(Math.round(v)).padStart(3, '0');
        arc.style.strokeDashoffset = 339.3 * (1 - v / 100);
        const on = Math.floor(v / 100 * TICKS); ticks.forEach((t, i) => t.classList.toggle('on', i < on));
        logs.forEach(([at, txt], i) => {
            if (v >= at && i > shown) {
                shown = i;
                if (lis[i - 1]) { lis[i - 1].classList.add('done'); lis[i - 1].textContent = lis[i - 1].textContent.replace('›', '✓'); }
                lis[i].style.opacity = 1; scramble(lis[i], '› ' + txt, .6);
            }
        });
    };

    gsap.from('.pc', { scale: 0, opacity: 0, duration: .8, stagger: .08, ease: 'back.out(2)' });
    gsap.from('#pre-logo', { scale: .6, opacity: 0, duration: 1, ease: 'power3.out' });
    gsap.from('#pre-ruler i', { scaleY: 0, transformOrigin: 'bottom', duration: .5, stagger: { each: .012, from: 'center' }, ease: 'power2.out' });
    scramble($('pre-brand'), 'DUYANH.DESKTOPLAB', 1);
    gsap.to(p, { v: 88, duration: 2.2, ease: 'power2.inOut', onUpdate: render });

    const loaded = new Promise(r => document.readyState === 'complete' ? r() : addEventListener('load', r));
    Promise.all([loaded, new Promise(r => setTimeout(r, 2300))]).then(() => {
        gsap.timeline({ onComplete: done })
            .to(p, { v: 100, duration: .6, ease: 'power2.out', onUpdate: render })
            .to('#pre-logo', { scale: 1.12, duration: .35, ease: 'power2.out' }, '+=.1')
            .to('#pre-logo', { scale: 1, duration: .5, ease: 'elastic.out(1,.5)' })
            .to(['.pre-top', '#pre-ruler', '.pre-bot', '.pc'], { opacity: 0, y: (i, el) => el.classList.contains('pre-bot') ? 20 : 0, duration: .5, ease: 'power2.in' }, '+=.15')
            .to('#pre-center', { scale: .4, opacity: 0, duration: .55, ease: 'power3.in' }, '<')
            .to('#pre-seam', { scaleX: 1, duration: .6, ease: 'power4.inOut' }, '<.1')
            .to('#pre-t', { yPercent: -100, duration: 1.1, ease: 'power4.inOut' }, '>-.05')
            .to('#pre-b', { yPercent: 100, duration: 1.1, ease: 'power4.inOut' }, '<')
            .to('#pre-seam', { opacity: 0, duration: .5 }, '<.1')
            .add(() => window.__intro && window.__intro.play(), '-=.8');
    });
})();