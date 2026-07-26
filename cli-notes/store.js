const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

function load() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const initial = { notes: {}, devices: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function save(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function newNoteId() {
  return crypto.randomBytes(8).toString('hex');
}

function ensureDevice(db, ip) {
  let device = db.devices[ip];
  if (!device) {
    const noteId = newNoteId();
    db.notes[noteId] = { content: '', updatedAt: new Date().toISOString() };
    device = { noteId, lastSeen: new Date().toISOString() };
    db.devices[ip] = device;
  } else {
    device.lastSeen = new Date().toISOString();
  }
  return device;
}

function gcNotes(db) {
  const used = new Set(Object.values(db.devices).map((d) => d.noteId));
  for (const id of Object.keys(db.notes)) {
    if (!used.has(id)) delete db.notes[id];
  }
}

function getNote(ip) {
  const db = load();
  const device = ensureDevice(db, ip);
  save(db);
  return db.notes[device.noteId].content;
}

function setNote(ip, content) {
  const db = load();
  const device = ensureDevice(db, ip);
  db.notes[device.noteId] = { content, updatedAt: new Date().toISOString() };
  save(db);
}

function listDevices() {
  const db = load();
  return Object.entries(db.devices).map(([ip, device]) => ({
    ip,
    noteId: device.noteId,
    lastSeen: device.lastSeen,
    preview: (db.notes[device.noteId]?.content || '').slice(0, 60),
  }));
}

// Link two IPs so they share the same note. The first IP's note becomes
// the shared one; the second IP's prior note is dropped (orphan-collected).
function linkDevices(ipA, ipB) {
  const db = load();
  ensureDevice(db, ipA);
  ensureDevice(db, ipB);
  db.devices[ipB].noteId = db.devices[ipA].noteId;
  gcNotes(db);
  save(db);
}

// Give an IP its own fresh, empty note again, detaching it from any group.
function unlinkDevice(ip) {
  const db = load();
  if (!db.devices[ip]) return;
  const noteId = newNoteId();
  db.notes[noteId] = { content: '', updatedAt: new Date().toISOString() };
  db.devices[ip].noteId = noteId;
  gcNotes(db);
  save(db);
}

function forgetDevice(ip) {
  const db = load();
  delete db.devices[ip];
  gcNotes(db);
  save(db);
}

module.exports = { getNote, setNote, listDevices, linkDevices, unlinkDevice, forgetDevice };
