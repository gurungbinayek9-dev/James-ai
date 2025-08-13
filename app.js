\
/* James PWA — Enhanced: mood analysis, Nepali adaptation, improved planning.
   Offline-first. Stores memory in localStorage. Designed for iPhone Safari. */

const log = document.getElementById('log');
const input = document.getElementById('input');
const micBtn = document.getElementById('mic');
const askBtn = document.getElementById('ask');
const clearBtn = document.getElementById('clear');
const moodEl = document.getElementById('mood');
const onlineEl = document.getElementById('online');
const voiceSel = document.getElementById('voice');
const rateEl = document.getElementById('rate');
const pitchEl = document.getElementById('pitch');
const forceNep = document.getElementById('forceNep');
const onlineMood = document.getElementById('onlineMood');

let voices = [];
function refreshVoices() {
  voices = speechSynthesis.getVoices();
  voiceSel.innerHTML = '';
  voices.forEach(v => {
    const o = document.createElement('option');
    o.value = v.name; o.textContent = `${v.name} (${v.lang})`;
    if (v.name === 'Alex') o.selected = true;
    voiceSel.appendChild(o);
  });
}
speechSynthesis.onvoiceschanged = refreshVoices;
refreshVoices();

// memory
let memory = JSON.parse(localStorage.getItem('jamesMemory')) || {
  owner: 'Binayak Gurung',
  creator: 'Binayak Gurung',
  facts: [],
  nepaliPhrases: {},
  moodHistory: []
};
function saveMemory(){ localStorage.setItem('jamesMemory', JSON.stringify(memory)); }

// UI helpers
function addMsg(text, who='james') {
  const d = document.createElement('div'); d.className = 'msg ' + who;
  const w = document.createElement('span'); w.className='who'; w.textContent = who==='user' ? memory.owner : 'James';
  const b = document.createElement('div'); b.className='body'; b.textContent = text;
  d.appendChild(w); d.appendChild(b);
  log.appendChild(d); log.scrollTop = log.scrollHeight;
}
function setThinking(on) {
  if (on) {
    const t = document.createElement('div'); t.className='msg james'; t.id='thinking';
    t.innerHTML = '<span class="who">James</span><span class="think"></span>Thinking...';
    log.appendChild(t); log.scrollTop = log.scrollHeight;
  } else {
    const t = document.getElementById('thinking'); if (t) t.remove();
  }
}

// speak
function speak(text, langHint='en') {
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const pick = voices.find(v=>v.name===voiceSel.value) || voices.find(v=>v.name==='Alex') || voices[0];
  if (pick) utter.voice = pick;
  utter.rate = parseFloat(rateEl.value || '0.9');
  utter.pitch = parseFloat(pitchEl.value || '0.95');
  // prefer Nepali/Hindi-like voices for Nepali hint
  if (langHint==='ne') {
    const ne = voices.find(v => v.lang && (v.lang.startsWith('ne') || v.lang.startsWith('hi')));
    if (ne) utter.voice = ne;
  }
  speechSynthesis.speak(utter);
}

// language detect (simple)
function detectLang(s) {
  for (let ch of s) {
    if (ch.charCodeAt(0) >= 0x0900 && ch.charCodeAt(0) <= 0x097F) return 'ne';
  }
  const neWords = ['छ','हो','कहाँ','कसरी','तिमी','म','धन्यवाद','गर','जाऊ','दाई','बोल','सम्झ'];
  const l = s.toLowerCase();
  if (neWords.some(w=>l.includes(w))) return 'ne';
  return 'en';
}

// Nepali learning
function learnNepali(s) {
  const lang = detectLang(s);
  if (lang !== 'ne') return;
  const tokens = s.replace(/[^\p{L}\p{N}\s]+/gu,' ').split(/\s+/).filter(Boolean);
  for (let i=0;i<tokens.length-1;i++){
    const big = (tokens[i] + ' ' + tokens[i+1]).trim();
    memory.nepaliPhrases[big] = (memory.nepaliPhrases[big]||0)+1;
  }
  saveMemory();
}
function favoriteNepali() {
  const items = Object.entries(memory.nepaliPhrases);
  items.sort((a,b)=>b[1]-a[1]);
  return items.length ? items[0][0] : '';
}

// Decision maker
function createPlan(goal, mood, lang) {
  // more detailed plan with practical tips
  const steps_en = [
    `1) Clarify the goal: write one sentence describing success for "${goal}".`,
    '2) List resources and constraints (time, people, tools).',
    '3) Break into 3-5 milestones and assign rough times.',
    '4) Pick the next small action and do it today (25-60 mins).',
    '5) Review progress and adjust; log what worked.'
  ];
  const cons_en = [
    '1) Increased clarity and focus (+)',
    '2) Possible schedule conflicts (±)',
    '3) Risk of overcommitment if scope grows (–)',
    '4) Quick wins build momentum (+)',
    '5) You’ll learn faster with iterative review (+)'
  ];
  const steps_ne = [
    `1) लक्ष्य स्पष्ट बनाऊ: "${goal}" सफल भए कस्तो हुन्छ भनेर लेख।`,
    '2) समय/स्रोत/सीमाहरू लेख।',
    '3) 3-5 साना लक्ष्य बनाऊ र समय तालिका राख।',
    '4) आजको सानो काम छान् र 25-60 मिनेट काम गर।',
    '5) समीक्षा गर र सिकेका कुरा नोट गर।'
  ];
  const cons_ne = [
    '1) ध्यान र स्पष्टता बढ्छ (+)',
    '2) समय मिलाउनु पर्ने हुन सक्छ (±)',
    '3) काम बिस्तार बढ्न सक्छ अगर सीमा नखिचे (–)',
    '4) सानो उपलब्धिले उत्साह बढाउँछ (+)',
    '5) निरन्तर सुधारले परिणाम सुध्रिन्छ (+)'
  ];

  let steps = lang==='ne' ? steps_ne : steps_en;
  let cons = lang==='ne' ? cons_ne : cons_en;

  if (mood==='tired') {
    if (lang==='ne') steps[3] = '4) आज 25 मिनेट मात्र काम गर र राम्ररी विश्राम ले।';
    else steps[3] = '4) Work a short focused session today (25 mins) and rest.';
  }
  if (mood==='upset') {
    if (lang==='ne') steps[0] = '1) पहिले 2-3 गहिरा सास फेरेर मन शान्त गर।';
    else steps[0] = '1) Start with a brief calming breath (2 deep breaths) before planning.';
  }
  return {steps, cons};
}

// better planner text
function planText(goal, mood, lang) {
  const p = createPlan(goal, mood, lang);
  const header = lang==='ne' ? '५ स्टेप योजना:' : '5-step plan:';
  const consHeader = lang==='ne' ? '५ सम्भावित परिणाम:' : '5 possible consequences:';
  return `${header}\n${p.steps.join('\n')}\n\n${consHeader}\n${p.cons.join('\n')}`;
}

// mood detection (audio analysis)
let audioCtx, analyser, dataArray, sourceStream;
let currentMood = 'neutral';
async function startAudioAnalysis() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    sourceStream = stream;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
    dataArray = new Float32Array(analyser.fftSize);
    analyseLoop();
  } catch(e) {
    console.log('mic failed', e);
  }
}
function analyseLoop() {
  analyser.getFloatTimeDomainData(dataArray);
  // RMS loudness
  let sum=0; for (let i=0;i<dataArray.length;i++){ sum += dataArray[i]*dataArray[i]; }
  const rms = Math.sqrt(sum/dataArray.length);
  const pitch = estimatePitch(dataArray, audioCtx.sampleRate);
  let mood = 'neutral';
  if (rms > 0.07 && pitch > 180) mood='happy';
  if (rms < 0.02 && pitch < 140) mood='tired';
  if (rms > 0.085 && pitch < 160) mood='upset';
  if (mood !== currentMood) {
    currentMood = mood;
    moodEl.textContent = 'mood: ' + mood;
    memory.moodHistory.push({ts:Date.now(), mood});
    if (memory.moodHistory.length>200) memory.moodHistory.shift();
    saveMemory();
  }
  requestAnimationFrame(analyseLoop);
}
// autocorrelation pitch estimation (same as earlier)
function estimatePitch(buf, sr) {
  let best = -1, bestCorr=0;
  const size = buf.length;
  let last=1;
  let rms=0;
  for (let i=0;i<size;i++) rms += buf[i]*buf[i];
  rms = Math.sqrt(rms/size);
  if (rms < 0.01) return 0;
  for (let offset=32; offset<512; offset++) {
    let corr=0;
    for (let i=0;i<size-offset;i++) corr += buf[i]*buf[i+offset];
    corr = corr/(size-offset);
    if (corr > 0.9 && corr > last) { bestCorr = corr; best = offset; }
    last = corr;
  }
  if (best>0) return sr/best;
  return 0;
}

// speech recognition
let recognizer;
function startRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Speech recognition not supported in this browser. Use Safari on iPhone.'); return; }
  recognizer = new SR();
  recognizer.lang = forceNep.checked ? 'ne-NP' : 'en-US';
  recognizer.interimResults = false;
  recognizer.onresult = (e) => {
    const t = Array.from(e.results).map(r=>r[0].transcript).join(' ');
    input.value = t;
    handleInput(t);
  }
  recognizer.onend = ()=> micBtn.textContent = '🎤 Listen';
  micBtn.textContent = '🛑 Stop';
  recognizer.start();
}

function stopRecognition() { if (recognizer) recognizer.stop(); micBtn.textContent='🎤 Listen'; }

// handlers
micBtn.addEventListener('click', ()=> {
  if (recognizer) { stopRecognition(); recognizer=null; }
  else { startRecognition(); }
});
askBtn.addEventListener('click', ()=> handleInput(input.value));
clearBtn.addEventListener('click', ()=> { log.innerHTML=''; });

// core handler
function handleInput(text) {
  if (!text || !text.trim()) return;
  addMsg(text, 'user');
  learnNepali(text);
  setThinking(true);
  const lang = forceNep.checked ? 'ne' : detectLang(text);
  const lower = text.toLowerCase();

  // memory commands
  if (lower.startsWith('remember ') || lower.includes('सम्झ')) {
    const fact = text.replace(/remember\s+/i,'').replace(/सम्झ\s*/i,'').trim();
    memory.facts.push({ts:Date.now(), text:fact});
    saveMemory();
    respond(lang==='ne' ? 'ठीक छ, मैले सम्झेँ।' : 'Saved to memory.');
    return;
  }
  if (lower.includes('recall') || lower.includes('के सम्झेको')) {
    const last = memory.facts.slice(-5).map((f,i)=>`${i+1}. ${f.text}`).join('\n');
    respond(last || (lang==='ne'?'अहिले केही छैन।':'Nothing saved yet.'), lang);
    return;
  }

  // plan request
  if (lower.includes('plan') || lower.includes('योजना') || lower.includes('स्टेप')) {
    const txt = planText(text, currentMood, lang);
    respond(txt, lang);
    return;
  }

  // search
  if (lower.startsWith('search ') || lower.includes('खोज')) {
    const q = encodeURIComponent(text.replace(/^search\s+/i,''));
    respond(lang==='ne'?'खोज्दै…':'' , lang);
    window.open(`https://www.google.com/search?q=${q}`, '_blank');
    return;
  }

  // smalltalk / default reply with mood-aware style
  let reply = '';
  const name = memory.owner.split(' ')[0] || 'friend';
  if (lang==='ne') {
    const fav = favoriteNepali();
    const pre = currentMood==='happy' ? 'वाह, ' : currentMood==='tired' ? 'आफ्नो ध्यान देऊ, ' : currentMood==='upset' ? 'शान्त होऊ, ' : '';
    reply = `${pre}${name}, मैले सुनेँ: "${text}"${fav? ', '+fav : ''}।`;
  } else {
    if (currentMood==='happy') reply = `Love the energy, ${name}! I heard "${text}". Want a 5-step plan?`;
    else if (currentMood==='tired') reply = `You sound tired, ${name}. Short steps, okay? I heard "${text}"`;
    else if (currentMood==='upset') reply = `I’m here, ${name}. Breathe. I heard "${text}"`;
    else reply = `Heard you, ${name}: "${text}". What’s the goal—want a plan?`;
  }
  respond(reply, lang);
}

function respond(text, lang='en') {
  setThinking(false);
  addMsg(text, 'james');
  speak(text, lang);
}

// start analysis on load
startAudioAnalysis();

// register service worker if available
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}

// expose some helpers for debugging
window.__james = {memory, createPlan, startAudioAnalysis, detectLang};
