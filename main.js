// Signal Age · entry point: load the authored data, validate it, start the session.
import { validateContent } from './engine/content.js';
import { mount } from './ui/controls.js';
import { renderLoadError } from './ui/render.js';

async function loadContent() {
  const response = await fetch('data/levels.json');
  if (!response.ok) throw new Error(`data/levels.json returned HTTP ${response.status}`);
  return response.json();
}

async function start() {
  const root = document.getElementById('app');
  let content;
  try {
    content = await loadContent();
  } catch (error) {
    root.replaceChildren(renderLoadError([{ code: 'LOAD_FAILED', message: error.message }]));
    return;
  }
  const validation = validateContent(content);
  if (validation.fileErrors.length) {
    root.replaceChildren(renderLoadError(validation.fileErrors));
    return;
  }
  // Round-level errors do not stop the game: those rounds show "challenge unavailable".
  window.signalAge = mount({ content, root });
}

start();
