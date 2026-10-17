const sections = [
  {
    id: 'general', title: 'General', subtitle: 'The every-trip essentials', tag: 'EVERY TRIP',
    icon: '<rect x="5" y="8" width="14" height="13" rx="3"/><path d="M9 8V6a3 3 0 0 1 6 0v2M5 13h14M9 13v3m6-3v3"/>',
    groups: [
      { title: 'Rods & reels', items: [['rods', 'Rods'], ['reels', 'Reels']] },
      { title: 'Tackle & essentials', items: [['tacklebox', 'Tacklebox'], ['bag', 'Bag'], ['dry-bag', 'Dry bag'], ['rags', 'Rags'], ['ice-box', 'Icebox / bucket']] },
    ],
  },
  {
    id: 'boat', title: 'Boat', subtitle: 'For a day on the water', tag: 'ON THE WATER',
    icon: '<path d="m3 13 9-4 9 4-3 6H6l-3-6ZM12 9V3m-4 8V6h8v5M2 21c2-2 3 2 5 0s3 2 5 0 3 2 5 0 3 2 5 0"/>',
    groups: [
      { title: 'Outboard', items: [['outboard', 'Outboard'], ['gas-tank', 'Gas tank'], ['two-stroke-oil', '2-stroke oil']] },
      { title: 'Safety', items: [['vhf-radio', 'VHF radio'], ['lifejackets', 'Lifejackets']] },
      { title: 'Boat', items: [['boat', 'Boat'], ['boat-wheels', 'Wheels'], ['oars', 'Oars'], ['pump', 'Pump'], ['electric-pump', 'Electric pump']] },
    ],
  },
  {
    id: 'rocks', title: 'Rock fishing', subtitle: 'For your spot on the coast', tag: 'ON THE ROCKS',
    icon: '<path d="m2 20 5-8 6 2 4-8 5 14H2ZM7 12l3 8m3-6 4 6M4 5l3-2 3 2"/>',
    groups: [
      { title: 'Rods & reels', items: [['rock-rod', 'Rock rod'], ['rock-reel', 'Rock reel']] },
      { title: 'Bait & burley', items: [['bait', 'Bait'], ['burley', 'Burley']] },
      { title: 'Rock setup', items: [['rope', 'Rope'], ['ground-rock-stake', 'Ground / rock stake']] },
    ],
  },
].map(section => ({ ...section, items: section.groups.flatMap(group => group.items) }));

const storageKey = 'fishing-checklist:v1';
const validIds = new Set(sections.flatMap(section => section.items.map(([id]) => id)));
let checked = new Set();
let storageAvailable = true;

try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if (Array.isArray(saved)) checked = new Set(saved.filter(id => validIds.has(id)));
} catch {
  // A damaged saved list should not prevent a fresh checklist from working.
}

const container = document.querySelector('#checklist-sections');
container.innerHTML = sections.map(section => `
  <section class="checklist-card ${section.id}" aria-labelledby="${section.id}-title">
    <div class="card-header">
      <div class="section-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${section.icon}</svg></div>
      <span class="section-tag">${section.tag}</span>
      <h2 id="${section.id}-title">${section.title}</h2>
      <p>${section.subtitle}</p>
      <div class="section-progress"><span id="${section.id}-count"></span><span id="${section.id}-state"></span></div>
      <div class="section-track" aria-hidden="true"><div id="${section.id}-fill"></div></div>
    </div>
    <div class="gear-groups">${section.groups.map((group, index) => `
      <section class="gear-group" aria-labelledby="${section.id}-group-${index}">
        <h3 id="${section.id}-group-${index}">${group.title}</h3>
        <ul class="item-list">${group.items.map(([id, label]) => `
          <li><label class="checklist-item"><input type="checkbox" id="${id}" ${checked.has(id) ? 'checked' : ''}/><span class="checkbox-mark" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d="m3 8 3 3 7-7"/></svg></span><span class="item-label">${label}</span></label></li>
        `).join('')}</ul>
      </section>
    `).join('')}</div>
  </section>
`).join('');

const resetButton = document.querySelector('#reset-button');
const resetDialog = document.querySelector('#reset-dialog');
const soundButton = document.querySelector('#sound-button');
const soundKey = 'fishing-checklist:sound';
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let soundEnabled = true;
let audioContext;

try {
  soundEnabled = localStorage.getItem(soundKey) !== 'off';
} catch {
  // Sound controls still work when browser storage is blocked.
}

function renderSoundButton() {
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
  document.querySelector('#sound-label').textContent = soundEnabled ? 'Sound on' : 'Sound off';
}

if (!AudioContextClass) {
  soundEnabled = false;
  soundButton.disabled = true;
  soundButton.title = 'Packing sounds are unavailable in this browser';
}
renderSoundButton();

async function playPackingSound(sectionComplete = false) {
  if (!soundEnabled || !AudioContextClass) return;
  try {
    // Create and resume audio only in response to a tap or keyboard action.
    audioContext ||= new AudioContextClass();
    if (audioContext.state === 'suspended') await audioContext.resume();
    if (!soundEnabled || audioContext.state !== 'running') return;
    const start = audioContext.currentTime;
    const notes = sectionComplete ? [784, 1047] : [740];
    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const time = start + index * 0.085;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, time);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.35, time + 0.025);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.7, time + 0.15);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.075, time + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(time);
      oscillator.stop(time + 0.18);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  } catch {
    // Audio restrictions should never interrupt ticking an item.
  }
}

soundButton.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  renderSoundButton();
  try { localStorage.setItem(soundKey, soundEnabled ? 'on' : 'off'); } catch {}
  if (!soundEnabled && audioContext) {
    void audioContext.suspend().catch(() => {});
  } else {
    void playPackingSound();
  }
});

function celebrateItem(input) {
  const row = input.closest('.checklist-item');
  row.classList.remove('just-packed');
  if (!input.checked) return;
  const section = sections.find(section => section.items.some(([id]) => id === input.id));
  void playPackingSound(section.items.every(([id]) => checked.has(id)));
  if (reducedMotion.matches) return;
  // Restart the animation even when an item is quickly unticked and reticked.
  void row.offsetWidth;
  row.classList.add('just-packed');
}

container.addEventListener('animationend', event => {
  if (event.animationName === 'packed-glow') event.target.classList.remove('just-packed');
});

function renderProgress() {
  const count = checked.size;
  const total = validIds.size;
  const percent = Math.round(count / total * 100);
  document.querySelector('#total-packed').textContent = count;
  document.querySelector('#total-count').textContent = ` / ${total} items packed`;
  document.querySelector('#total-percent').textContent = `${percent}%`;
  document.querySelector('#total-progress-fill').style.width = `${percent}%`;
  document.querySelector('#total-progress').setAttribute('aria-valuenow', count);
  document.querySelector('#total-progress').setAttribute('aria-valuemax', total);
  const complete = count === total;
  document.querySelector('#packing-status').textContent = complete ? 'Everything is packed. Tight lines!' : count ? 'Your next trip is taking shape' : "Let's get you packed";
  resetButton.disabled = count === 0;

  for (const section of sections) {
    const packed = section.items.filter(([id]) => checked.has(id)).length;
    const done = packed === section.items.length;
    document.querySelector(`#${section.id}-count`).textContent = `${packed} / ${section.items.length} packed`;
    document.querySelector(`#${section.id}-state`).textContent = done ? 'All packed ✓' : 'To pack';
    document.querySelector(`#${section.id}-fill`).style.width = `${packed / section.items.length * 100}%`;
    document.querySelector(`.${section.id}`).classList.toggle('complete', done);
  }
}

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...checked]));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  document.querySelector('#storage-notice').hidden = storageAvailable;
  document.querySelector('#save-note').hidden = !storageAvailable;
}

container.addEventListener('change', event => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !validIds.has(input.id)) return;
  if (input.checked) checked.add(input.id);
  else checked.delete(input.id);
  save();
  renderProgress();
  celebrateItem(input);
  document.querySelector('#announcements').textContent = `${checked.size} of ${validIds.size} items packed.`;
});

resetButton.addEventListener('click', () => {
  resetDialog.returnValue = '';
  resetDialog.showModal();
});

resetDialog.addEventListener('close', () => {
  if (resetDialog.returnValue !== 'reset') return;
  checked.clear();
  for (const input of container.querySelectorAll('input')) {
    input.checked = false;
    input.closest('.checklist-item').classList.remove('just-packed');
  }
  save();
  renderProgress();
  document.querySelector('#announcements').textContent = 'Checklist reset. Ready for a fresh trip.';
  // The reset button becomes disabled; focus the first item instead.
  container.querySelector('input').focus();
});

save();
renderProgress();
