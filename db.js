const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

const defaultData = {
  users: [],
  projects: [],
  projectMembers: [],
  tasks: [],
};

function load() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(defaultData));
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

let db = load();

module.exports = {
  get: () => db,
  save: () => save(db),
  reset: () => { db = JSON.parse(JSON.stringify(defaultData)); save(db); }
};
