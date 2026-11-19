// Fixed scenes for screenshots: ?shot=editor shows the page with a sample
// photo; ?shot=cover shows the cover alone. Query params pick the sample
// photo, caption, layout, grade and export size:
//   ?shot=cover&photo=pier&caption=Sunset%20Heist&layout=trio&grade=sunset&size=1080x1080
// window.__shotReady is set once the scene has painted.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const opts = {
    layout: query.get('layout') || 'trio',
    grade: query.get('grade') || 'sunset',
    size: query.get('size') || '1080x1080',
    sub: query.get('sub') || 'Neon Vice',
  };
  await load(
    query.get('photo') ?? 'pier',
    query.get('caption') ?? 'Sunset Heist',
    opts,
  );
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
