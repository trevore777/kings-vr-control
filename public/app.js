let state; let selected;
const $ = selector => document.querySelector(selector);
const label = {ready:'Ready',active:'In use',attention:'Needs attention',charging:'Charging'};
const esc = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

async function api(url, options={}) {
  const response = await fetch(url,{headers:{'content-type':'application/json'},...options});
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function render() {
  $('#session-name').value = state.session.name;
  $('#session-toggle').textContent = state.session.active ? 'End session' : 'Start session';
  $('#session-meta').textContent = state.session.active ? `Started ${new Date(state.session.startedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}` : 'Ready to begin';
  $('#ready-count').textContent = state.devices.filter(d=>d.status==='ready').length;
  $('#active-count').textContent = state.devices.filter(d=>d.status==='active').length;
  $('#attention-count').textContent = state.devices.filter(d=>d.status==='attention').length;
  $('#average-battery').textContent = `${Math.round(state.devices.reduce((n,d)=>n+Number(d.battery||0),0)/state.devices.length)}%`;
  $('#devices').innerHTML = state.devices.map(d=>`<button class="device" data-id="${d.id}"><div class="device-top"><span class="status ${esc(d.status)}">${esc(label[d.status]||d.status)}</span><span class="battery">${esc(d.battery)}%</span></div><h3>${d.id}</h3><span class="model">${esc(d.model)}</span><div class="student">${esc(d.student||'Unallocated')}</div><div class="activity">${esc(d.activity||'No activity selected')}</div></button>`).join('');
  $('#events').innerHTML = state.events.length ? state.events.slice(0,6).map(e=>`<div class="event"><span>${esc(e.message)}</span><time>${new Date(e.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time></div>`).join('') : '<p class="muted">No activity recorded yet.</p>';
  document.querySelectorAll('.device').forEach(el=>el.addEventListener('click',()=>openDevice(el.dataset.id)));
}

async function refresh() { try { state = await api('/api/state'); render(); } catch (error) { console.error(error); } }
function openDevice(id) { selected=state.devices.find(d=>d.id===id); $('#dialog-model').textContent=selected.model; $('#dialog-title').textContent=selected.id; $('#student').value=selected.student; $('#activity').value=selected.activity; $('#status').value=selected.status; $('#device-dialog').showModal(); }

$('#save-device').addEventListener('click',async event=>{event.preventDefault();await api(`/api/devices/${selected.id}`,{method:'PATCH',body:JSON.stringify({student:$('#student').value,activity:$('#activity').value,status:$('#status').value})});$('#device-dialog').close();await refresh();});
$('#session-toggle').addEventListener('click',async()=>{await api('/api/session',{method:'PATCH',body:JSON.stringify({name:$('#session-name').value,active:!state.session.active})});await refresh();});
$('#session-name').addEventListener('change',async()=>{await api('/api/session',{method:'PATCH',body:JSON.stringify({name:$('#session-name').value})});await refresh();});
$('#cast').addEventListener('click',()=>window.open('https://horizon.meta.com/casting','_blank','noopener'));
setInterval(()=>{$('#clock').textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});},1000);
setInterval(refresh,10000); refresh();
