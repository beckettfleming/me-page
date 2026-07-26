const editor = document.getElementById('editor');
const status = document.getElementById('status');

let saveTimer = null;
let dirty = false;

async function load() {
  status.textContent = 'loading...';
  const res = await fetch('/api/note');
  const data = await res.json();
  editor.value = data.content;
  status.textContent = 'saved';
}

async function save() {
  status.textContent = 'saving...';
  await fetch('/api/note', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: editor.value }),
  });
  status.textContent = 'saved';
  dirty = false;
}

editor.addEventListener('input', () => {
  dirty = true;
  status.textContent = 'editing...';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 600);
});

window.addEventListener('beforeunload', (e) => {
  if (dirty) save();
});

load();
