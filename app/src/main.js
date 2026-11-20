// Neon Vice — wires the editor page: state, controls, live preview, PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, renderExport, LAYOUTS, GRADES_LIST, EXPORT_SIZES } from './cover.js';
import { runShot } from './shots.js';

const preview = document.getElementById('preview');
const titleInput = document.getElementById('title');
const captionInput = document.getElementById('caption');
const statusLine = document.getElementById('status');
const panelList = document.getElementById('panels');
const layoutRow = document.getElementById('layouts');
const gradeRow = document.getElementById('grades');
const exportRow = document.getElementById('exports');

const PANEL_COUNT = { hero: 1, split: 2, trio: 3, grid: 4 };

const state = {
  layout: 'hero',
  grade: 'sunset',
  title: 'NEON VICE',
  caption: 'Sunset Heist',
  panels: [],
};

function blankPanel(img) {
  return { img: img || null, zoom: 1, ox: 0, oy: 0 };
}

function setLayout(layout) {
  state.layout = layout;
  const want = PANEL_COUNT[layout];
  while (state.panels.length < want) {
    state.panels.push(blankPanel(state.panels[0] ? state.panels[0].img : null));
  }
  state.panels.length = want;
  buildPanelControls();
  refresh();
}

function setGrade(grade) {
  state.grade = grade;
  refresh();
}

function refresh() {
  drawCover(preview, state);
  layoutRow.querySelectorAll('button').forEach((b) => {
    b.classList.toggle('on', b.dataset.layout === state.layout);
  });
  gradeRow.querySelectorAll('button').forEach((b) => {
    b.classList.toggle('on', b.dataset.grade === state.grade);
  });
}

function note(text) {
  statusLine.textContent = text;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load ' + url));
    img.src = url;
  });
}

async function loadSample(name, everywhere) {
  const img = await loadImage('samples/' + name + '.jpg');
  if (everywhere) {
    state.panels = state.panels.map(() => blankPanel(img));
  } else {
    const firstEmpty = state.panels.findIndex((p) => !p.img);
    const target = firstEmpty === -1 ? 0 : firstEmpty;
    state.panels[target] = blankPanel(img);
  }
  buildPanelControls();
  refresh();
  note('Loaded sample ' + name + '.jpg');
}

function buildPanelControls() {
  panelList.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const card = document.createElement('div');
    card.className = 'panel-card';
    card.innerHTML =
      '<h3>Panel ' + (i + 1) + '</h3>' +
      '<label>Photo <input type="file" accept="image/*" data-panel="' + i + '"></label>' +
      '<label>Zoom <input type="range" min="0.6" max="2.5" step="0.05" value="' + panel.zoom + '" data-zoom="' + i + '"></label>' +
      '<label>Pan left–right <input type="range" min="-0.5" max="0.5" step="0.02" value="' + panel.ox + '" data-panx="' + i + '"></label>' +
      '<label>Pan up–down <input type="range" min="-0.5" max="0.5" step="0.02" value="' + panel.oy + '" data-pany="' + i + '"></label>' +
      '<div class="row"><button type="button" data-sample="boulevard" data-panel="' + i + '">Boulevard</button>' +
      '<button type="button" data-sample="pier" data-panel="' + i + '">Pier</button></div>';
    panelList.appendChild(card);
  });

  panelList.querySelectorAll('input[type=file]').forEach((input) => {
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const i = Number(e.target.dataset.panel);
      state.panels[i].img = await loadImage(URL.createObjectURL(file));
      state.panels[i].zoom = 1;
      state.panels[i].ox = 0;
      state.panels[i].oy = 0;
      refresh();
      note('Photo loaded into panel ' + (i + 1));
    });
  });
  panelList.querySelectorAll('[data-zoom]').forEach((input) => {
    input.addEventListener('input', (e) => {
      state.panels[Number(e.target.dataset.zoom)].zoom = Number(e.target.value);
      refresh();
    });
  });
  panelList.querySelectorAll('[data-panx]').forEach((input) => {
    input.addEventListener('input', (e) => {
      state.panels[Number(e.target.dataset.panx)].ox = Number(e.target.value);
      refresh();
    });
  });
  panelList.querySelectorAll('[data-pany]').forEach((input) => {
    input.addEventListener('input', (e) => {
      state.panels[Number(e.target.dataset.pany)].oy = Number(e.target.value);
      refresh();
    });
  });
  panelList.querySelectorAll('[data-sample]').forEach((button) => {
    button.addEventListener('click', async (e) => {
      const i = Number(e.target.dataset.panel);
      state.panels[i].img = await loadImage('samples/' + e.target.dataset.sample + '.jpg');
      refresh();
      note('Sample loaded into panel ' + (i + 1));
    });
  });
}

function buildPicker(row, items, attr, onPick) {
  items.forEach((item) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = item.label;
    b.dataset[attr] = item.value;
    b.addEventListener('click', () => onPick(item.value));
    row.appendChild(b);
  });
}

buildPicker(layoutRow, LAYOUTS.map((l) => ({ label: l[0].toUpperCase() + l.slice(1), value: l })), 'layout', setLayout);
buildPicker(gradeRow, [
  { label: 'Vice Sunset', value: 'sunset' },
  { label: 'Neon Night', value: 'night' },
  { label: 'Palm Dusk', value: 'dusk' },
], 'grade', setGrade);

EXPORT_SIZES.forEach((size) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = 'Export PNG ' + size.label;
  b.addEventListener('click', () => exportCover(size));
  exportRow.appendChild(b);
});

titleInput.addEventListener('input', () => { state.title = titleInput.value; refresh(); });
captionInput.addEventListener('input', () => { state.caption = captionInput.value; refresh(); });

// Double-click the preview to cycle through the layouts, a quick way to try them.
preview.addEventListener('dblclick', () => {
  const next = LAYOUTS[(LAYOUTS.indexOf(state.layout) + 1) % LAYOUTS.length];
  setLayout(next);
  note('Layout: ' + next);
});

document.getElementById('sample-boulevard').addEventListener('click', () => loadSample('boulevard', true));
document.getElementById('sample-pier').addEventListener('click', () => loadSample('pier', true));

/** Renders the current state at an exact size and downloads it as a PNG. */
export function exportCover(size) {
  const canvas = renderExport(state, size.w, size.h);
  canvas.toBlob((blob) => {
    if (!blob) { note('Export failed'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'neon-vice-' + size.w + 'x' + size.h + '.png';
    a.click();
    note('Saved neon-vice-' + size.w + 'x' + size.h + '.png');
  }, 'image/png');
}

/** Test hook: renders at an exact size and resolves to a PNG data URL. */
window.__exportPNG = function exportPNG(width, height) {
  return new Promise((resolve) => {
    renderExport(state, width, height).toBlob((blob) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    }, 'image/png');
  });
};

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, {
    async load(photo, text, layout, grade, title) {
      state.layout = layout;
      state.grade = grade;
      state.title = title;
      state.caption = text;
      const img = await loadImage('samples/' + photo + '.jpg');
      const want = PANEL_COUNT[layout];
      state.panels = Array.from({ length: want }, () => blankPanel(img));
      buildPanelControls();
      refresh();
    },
  });
} else {
  setLayout('hero');
  loadSample('pier', true).catch(() => refresh());
}
