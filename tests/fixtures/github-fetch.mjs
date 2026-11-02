// Opt-in disposable driver preload; there is no application test transport switch.
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.hostname !== 'api.github.com') return nativeFetch(input, init);
  const match = url.pathname.match(/^\/repos\/qa\/([a-z-]+)(\/languages)?$/);
  if (!match) return Response.json({ message: 'Fixture not found' }, { status: 404 });
  const repo = match[1];
  if (repo === 'limited') return Response.json({ message: 'Rate limited' }, { status: 429 });
  if (repo !== 'xr-studio') return Response.json({ message: 'Not found' }, { status: 404 });
  return Response.json(match[2] ? { TypeScript: 900, CSS: 100 } : { private: false, name: 'XR Studio Suggestions', description: 'Public repository metadata for deterministic QA.', html_url: 'https://github.com/qa/xr-studio', language: 'TypeScript' });
};
