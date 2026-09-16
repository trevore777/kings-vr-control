const shell = document.querySelector('#lesson-shell');
const tabs = [...document.querySelectorAll('.tab')];
const storageKey = 'kings-vr-investigation-v1';
let saved = {};
let currentLesson = Number(localStorage.getItem('kings-vr-current') || 1);
let timerId;

try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { saved = {}; }
// Remove the identifiable field used by the original lesson version.
if (saved.studentName !== undefined) {
  delete saved.studentName;
  localStorage.setItem(storageKey, JSON.stringify(saved));
}

function persist(message = 'Saved on this iPad') {
  localStorage.setItem(storageKey, JSON.stringify(saved));
  const state = document.querySelector('#save-state');
  state.textContent = message;
  clearTimeout(state._timer);
  state._timer = setTimeout(() => state.textContent = 'Saved on this iPad', 1600);
}

function bindSavedFields(root = document) {
  root.querySelectorAll('[data-save]').forEach(field => {
    const key = field.dataset.save;
    if (field.type === 'checkbox') field.checked = Boolean(saved[key]);
    else if (saved[key] !== undefined) field.value = saved[key];
    field.addEventListener('input', () => {
      if (key === 'studentNumber') field.value = field.value.replace(/\D/g, '').slice(0, 12);
      saved[key] = field.type === 'checkbox' ? field.checked : field.value;
      persist('Saving…');
      if (key === 'l3score1' || key === 'l3score2') updateScore();
    });
  });
}

function updateScore() {
  const output = document.querySelector('#score-change');
  if (!output) return;
  const first = Number(saved.l3score1); const second = Number(saved.l3score2);
  output.textContent = saved.l3score1 !== undefined && saved.l3score2 !== undefined ? `${second-first >= 0 ? '+' : ''}${second-first}` : '—';
}

function setupMulti(root) {
  root.querySelectorAll('[data-multi]').forEach(group => {
    const key = group.dataset.multi; const values = new Set(saved[key] || []);
    group.querySelectorAll('button').forEach(button => {
      button.classList.toggle('selected', values.has(button.dataset.value));
      button.addEventListener('click', () => {
        values.has(button.dataset.value) ? values.delete(button.dataset.value) : values.add(button.dataset.value);
        saved[key] = [...values]; button.classList.toggle('selected'); persist();
      });
    });
  });
}

function setupQuiz(root) {
  root.querySelectorAll('[data-quiz] button').forEach(button => button.addEventListener('click', () => {
    const group = button.closest('[data-quiz]');
    group.querySelectorAll('button').forEach(item => item.classList.remove('selected','wrong'));
    button.classList.add(button.dataset.correct ? 'selected' : 'wrong');
    document.querySelector('#motion-feedback').textContent = button.dataset.correct ? 'Correct — visual drop and louder wind suggest increasing speed.' : 'Try again. Look for clues about direction and speed.';
  }));
}

function setupTimers(root) {
  root.querySelectorAll('[data-timer]').forEach(button => button.addEventListener('click', () => {
    clearInterval(timerId); let seconds = Number(button.dataset.timer); const output = button.nextElementSibling;
    button.textContent = 'Rotation running'; button.disabled = true;
    const draw = () => { output.textContent = `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`; };
    draw(); timerId = setInterval(() => { seconds -= 1; draw(); if (seconds <= 0) { clearInterval(timerId); button.textContent='Start rotation again'; button.disabled=false; output.textContent='Change stations'; } },1000);
  }));
}

function setupReaction(root) {
  const button = root.querySelector('#reaction-button'); if (!button) return;
  let start; let timeout; let waiting = false; const attempts = saved.reactionTimes || [];
  const result = root.querySelector('#reaction-result');
  const show = () => result.textContent = attempts.length ? `Attempts: ${attempts.join(' ms, ')} ms${attempts.length >= 3 ? ` · Best: ${Math.min(...attempts)} ms` : ''}` : 'Complete three attempts.';
  show();
  button.addEventListener('click', () => {
    if (button.classList.contains('go')) { const value=Math.round(performance.now()-start); attempts.push(value); if(attempts.length>3) attempts.shift(); saved.reactionTimes=attempts; persist(); button.className='reaction-button'; button.textContent='Start another attempt'; show(); return; }
    if (waiting) { clearTimeout(timeout); waiting=false; button.className='reaction-button'; button.textContent='Too early — try again'; return; }
    waiting=true; button.className='reaction-button waiting'; button.textContent='Wait for green…';
    timeout=setTimeout(()=>{waiting=false;start=performance.now();button.className='reaction-button go';button.textContent='TAP NOW';},1200+Math.random()*2500);
  });
}

function showLesson(number) {
  clearInterval(timerId); currentLesson = number; localStorage.setItem('kings-vr-current', String(number));
  shell.innerHTML = ''; shell.append(document.querySelector(`#lesson-${number}`).content.cloneNode(true));
  tabs.forEach(tab => { const active=Number(tab.dataset.lesson)===number; tab.classList.toggle('active',active); tab.setAttribute('aria-current',active?'page':'false'); });
  bindSavedFields(shell); setupMulti(shell); setupQuiz(shell); setupTimers(shell); setupReaction(shell); updateScore();
  const print = shell.querySelector('#print-work'); if (print) print.addEventListener('click', printAll);
  window.scrollTo({top: document.querySelector('.lesson-tabs').offsetTop - 86, behavior:'smooth'});
}

function printAll() {
  const original = shell.innerHTML; shell.innerHTML='';
  for(let n=1;n<=4;n++) shell.append(document.querySelector(`#lesson-${n}`).content.cloneNode(true));
  bindSavedFields(shell); updateScore(); window.print(); shell.innerHTML=original; showLesson(currentLesson);
}

tabs.forEach(tab => tab.addEventListener('click', () => showLesson(Number(tab.dataset.lesson))));
bindSavedFields(document); showLesson(currentLesson);
