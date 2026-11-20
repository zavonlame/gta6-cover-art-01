// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample photo
// loaded; ?shot=cover shows the finished cover on its own, full-bleed. The query
// picks the sample (photo), the words (caption, title) and the look (layout,
// grade). window.__shotReady is set once the scene is painted.
export async function runShot(shot, query, hooks) {
  const photo = query.get('photo') || 'pier';
  const caption = query.get('caption') || 'Sunset Heist';
  const layout = query.get('layout') || 'hero';
  const grade = query.get('grade') || 'sunset';
  const title = query.get('title') || 'NEON VICE';

  if (shot === 'cover') document.body.classList.add('shot-cover');
  await hooks.load(photo, caption, layout, grade, title);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
