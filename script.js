const MIN = 1;
const MAX = 30;

const display = document.getElementById('display');
const feedback = document.getElementById('feedback');
const guessInput = document.getElementById('guessInput');
const guessBtn = document.getElementById('guessBtn');
const playAgain = document.getElementById('playAgain');
const attemptsEl = document.getElementById('attempts');
const historyList = document.getElementById('historyList');
const livesEl = document.getElementById('lives');
const highScoreEl = document.getElementById('highScore');
const themeSelect = document.getElementById('themeSelect');
const customTheme = document.getElementById('customThemeSelect');
const customTrigger = document.getElementById('customThemeTrigger');
const customOptions = document.getElementById('customThemeOptions');

function syncCustomToNative(value){
  // update native select and custom UI
  if(themeSelect) themeSelect.value = value;

  Array.from(customOptions.children).forEach(li=>{
    const selected = li.dataset.value === value;
    li.classList.toggle('selected', selected);
    li.setAttribute('aria-selected', selected ? 'true' : 'false');
  });

  const activeId = customOptions.querySelector('.selected')?.id;
  if(activeId){ customOptions.setAttribute('aria-activedescendant', activeId); }

  customTrigger.textContent = customOptions.querySelector('.selected')?.textContent || value;
}

function closeCustom(){ customTheme.classList.remove('open'); }
function openCustom(){ customTheme.classList.add('open'); }

let secret, attempts, lives, history;

function pick() {
  return Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
}

function loadHighScore(){
  return Number(localStorage.getItem('gtn-high')) || null;
}

function saveHighScore(v){
  const cur = loadHighScore();
  if (!cur || v < cur) localStorage.setItem('gtn-high', String(v));
}

function renderLives(){
  livesEl.innerHTML = '';
  for(let i=0;i<lives;i++){
    const d = document.createElement('div'); d.className='life'; livesEl.appendChild(d);
  }
}

function renderHistory(){
  historyList.innerHTML='';
  history.forEach(h=>{
    const li = document.createElement('li'); li.textContent = `${h.value} — ${h.note}`; historyList.appendChild(li);
  });
}

function newGame(){
  secret = pick(); attempts = 0; lives = 5; history = [];
  display.textContent = '?'; feedback.textContent = 'Make your guess!';
  guessInput.disabled = false; guessBtn.disabled = false; playAgain.style.display='none';
  guessInput.value = '';
  try { guessInput.focus(); } catch(e) {}
  attemptsEl.textContent = attempts; renderLives(); renderHistory();
  const hs = loadHighScore(); highScoreEl.textContent = hs?hs:'—';
}

function applyTheme(theme){
  const root = document.documentElement;
  const normalized = theme || 'frontier';
  root.classList.remove('theme-frontier','theme-ocean','theme-sunset');
  root.classList.add(`theme-${normalized}`);
  root.setAttribute('data-theme', normalized);
  document.body.setAttribute('data-theme', normalized);
}

function loadTheme(){
  return localStorage.getItem('gtn-theme') || 'frontier';
}

function saveTheme(theme){
  localStorage.setItem('gtn-theme', theme);
}

function endRound(win){
  guessInput.disabled = true; guessBtn.disabled = true; playAgain.style.display='inline-block';
  if(win) saveHighScore(attempts);
  const hs = loadHighScore(); highScoreEl.textContent = hs?hs:'—';
}

guessBtn.addEventListener('click', ()=>{
  const val = Number(guessInput.value);
  if(!val || val<MIN || val>MAX){ feedback.textContent = `Please enter a number between ${MIN} and ${MAX}.`; return; }
  // button press animation
  guessBtn.classList.add('btn-press'); setTimeout(()=>guessBtn.classList.remove('btn-press'),160);
  attempts++; attemptsEl.textContent = attempts;
  // clear any flash then flash feedback
  feedback.classList.remove('flash');
  if(val === secret){
    display.textContent = String(secret);
    feedback.textContent = '🎉 Correct! You found it.';
    history.unshift({value: val, note: 'Correct'});
    renderHistory(); confettiBurst(); playSound('win'); feedback.classList.add('flash'); endRound(true);
    return;
  }

  const note = val < secret ? 'Too Low' : 'Too High';
  feedback.textContent = note === 'Too Low' ? '⬇️ Too Low!' : '⬆️ Too High!';
  display.textContent = String(val);
  lives--; playSound('wrong'); history.unshift({value: val, note}); renderHistory(); renderLives();

  if(lives<=0){
    feedback.textContent = `Game Over — it was ${secret}.`;
    playSound('gameover'); feedback.classList.add('flash'); endRound(false);
  }
});

// allow Enter key to submit
guessInput.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter'){
    e.preventDefault(); guessBtn.click();
  }
});

playAgain.addEventListener('click', newGame);

themeSelect.addEventListener('change', e=>{
  const theme = e.target.value;
  applyTheme(theme);
  saveTheme(theme);
});

// Custom select interactions
if(customTheme){
  customTheme.addEventListener('click', (e)=>{
    if(customTheme.classList.contains('open')){ closeCustom(); } else { openCustom(); }
  });

  customOptions.addEventListener('click', (e)=>{
    const li = e.target.closest('li'); if(!li) return;
    const val = li.dataset.value;
    syncCustomToNative(val);
    applyTheme(val); saveTheme(val);
    closeCustom();
  });

  // keyboard support
  customTheme.addEventListener('keydown', (e)=>{
    const focused = customOptions.querySelector('[aria-selected="true"]');
    const items = Array.from(customOptions.querySelectorAll('li'));
    const currentIndex = items.indexOf(focused);

    if(e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if(customTheme.classList.contains('open')){
        const selected = items[currentIndex] || items[0];
        if(selected){
          const val = selected.dataset.value;
          syncCustomToNative(val);
          applyTheme(val); saveTheme(val);
          closeCustom();
        }
      } else {
        openCustom();
      }
      return;
    }

    if(e.key === 'Escape') { closeCustom(); return; }

    if(e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      openCustom();
      const nextIndex = e.key === 'ArrowDown'
        ? Math.min(currentIndex + 1, items.length - 1)
        : Math.max(currentIndex - 1, 0);
      const next = items[nextIndex];
      if(next){
        items.forEach(item => item.setAttribute('aria-selected', 'false'));
        next.setAttribute('aria-selected', 'true');
        customOptions.setAttribute('aria-activedescendant', next.id);
      }
      return;
    }
  });

  customTheme.addEventListener('blur', () => { closeCustom(); });

  // initialize
  syncCustomToNative(loadTheme());
  document.addEventListener('click', (e)=>{ if(!customTheme.contains(e.target)) closeCustom(); });
}

// apply theme at start
const initialTheme = loadTheme();
if(themeSelect){ themeSelect.value = initialTheme; }
applyTheme(initialTheme);

// Background particles (simple)
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
let W, H, particles=[];

function resize(){ W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
window.addEventListener('resize', resize); resize();

function makeParticles(){ particles = []; for(let i=0;i<80;i++){ particles.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.6+0.4,dx:(Math.random()-0.5)*0.3,dy:(Math.random()-0.5)*0.3}) } }
makeParticles();

function tick(){ ctx.clearRect(0,0,W,H); for(const p of particles){ p.x+=p.dx; p.y+=p.dy; if(p.x<0)p.x=W; if(p.x>W)p.x=0; if(p.y<0)p.y=H; if(p.y>H)p.y=0; ctx.beginPath(); ctx.fillStyle='rgba(255,255,255,0.03)'; ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); } requestAnimationFrame(tick); }
tick();

newGame();

// Confetti overlay
const confettiCanvas = document.getElementById('confettiCanvas');
const cctx = confettiCanvas.getContext('2d');
let cW, cH, confettiPieces = [], confettiAnimating = false;

function resizeConfetti(){ cW = confettiCanvas.width = innerWidth; cH = confettiCanvas.height = innerHeight; }
window.addEventListener('resize', resizeConfetti); resizeConfetti();

function makeConfetti(){
  confettiPieces = [];
  const colors = ['#ffd166','#ff7b7b','#7bf1ff','#9b7bff','#7bffb2'];
  for(let i=0;i<120;i++){
    confettiPieces.push({
      x: Math.random()*cW,
      y: Math.random()*-cH,
      w: Math.random()*8+6,
      h: Math.random()*12+8,
      r: Math.random()*360,
      vx: (Math.random()-0.5)*6,
      vy: Math.random()*6+2,
      color: colors[Math.floor(Math.random()*colors.length)],
      rotSpeed: (Math.random()-0.5)*10
    });
  }
}

function confettiTick(){
  if(!confettiAnimating) return;
  cctx.clearRect(0,0,cW,cH);
  for(const p of confettiPieces){
    p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.r += p.rotSpeed;
    cctx.save(); cctx.translate(p.x,p.y); cctx.rotate(p.r*Math.PI/180);
    cctx.fillStyle = p.color; cctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
    cctx.restore();
  }
  // fade pieces out when below screen
  confettiPieces = confettiPieces.filter(p=>p.y < cH + 100);
  if(confettiPieces.length===0){ confettiAnimating=false; cctx.clearRect(0,0,cW,cH); return; }
  requestAnimationFrame(confettiTick);
}

function confettiBurst(){
  if(confettiAnimating) return;
  makeConfetti(); confettiAnimating = true; confettiTick();
}

// expose for debugging
window.confettiBurst = confettiBurst;

// Audio helper
function getAudioCtx(){
  try{
    if(!window._ac){
      const AC = window.AudioContext || window.webkitAudioContext;
      window._ac = new AC();
    }
    return window._ac;
  }catch(e){ return null; }
}

function playTone(freq, dur=0.12, type='sine'){
  const ac = getAudioCtx(); if(!ac) return;
  try{
    const o = ac.createOscillator(); const g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, ac.currentTime);
    g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.18, ac.currentTime+0.01);
    o.connect(g); g.connect(ac.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime+dur);
    o.stop(ac.currentTime+dur+0.02);
  }catch(e){}
}

function playSound(kind){
  const ac = getAudioCtx(); if(!ac) return;
  try{
    if(kind === 'win'){
      playTone(660, 0.10); setTimeout(()=>playTone(880,0.10), 100); setTimeout(()=>playTone(1040,0.12),210);
    } else if(kind === 'wrong'){
      playTone(220, 0.18, 'sawtooth');
    } else if(kind === 'gameover'){
      playTone(120, 0.28, 'square');
    }
  }catch(e){}
}
