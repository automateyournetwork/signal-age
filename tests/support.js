// Test support: load project files in the browser runner or in Node, and build
// small one-round content objects from the shipped media and plants so each
// hand-checked case from StarterKit/SPEC.md can be stated directly.

const inNode = typeof window === 'undefined';

export async function loadText(relativeUrl) {
  const url = new URL(relativeUrl, import.meta.url);
  if (inNode) {
    const { readFile } = await import('node:fs/promises');
    return readFile(url, 'utf8');
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`could not load ${url}: ${response.status}`);
  return response.text();
}

export async function loadJson(relativeUrl) {
  return JSON.parse(await loadText(relativeUrl));
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// One level with one round. `media` lists the unlocked medium ids; `infra`
// overrides the round's existing infrastructure.
export function singleRound(base, { media, request, infra = {}, roundId = 'test-round' }) {
  return {
    schemaVersion: base.schemaVersion,
    sources: clone(base.sources),
    plants: clone(base.plants || []),
    media: clone(base.media),
    levels: [
      {
        id: 'test-level',
        title: 'Test level',
        eraName: 'Test era',
        learningOutcome: 'LO1',
        briefing: { intro: ['Test briefing.'], concept: [], example: 'Test example.', note: 'Test note.' },
        sourceIds: [],
        unlockedMediumIds: media,
        rounds: [
          {
            id: roundId,
            growth: {
              yearLabel: 'Test year',
              settlements: [
                { id: 'a', name: 'A', tier: 'village', x: 20, y: 50, reason: '' },
                { id: 'b', name: 'B', tier: 'village', x: 80, y: 50, reason: '' },
              ],
            },
            request: { from: 'A', to: 'B', ...request },
            existingInfrastructure: { assets: [], existingTowerSites: 0, ...infra },
            hints: ['Method hint.', 'Worked step.'],
          },
        ],
      },
    ],
  };
}

export const LEVEL1_MEDIA = ['spoken-word', 'signal-drum', 'smoke-beacon', 'foot-courier', 'horse-relay'];
export const LEVEL2_MEDIA = [
  'optical-telegraph', 'electric-telegraph', 'telephone-line', 'analog-carrier',
  't1', 't3', 'oc-3', 'oc-12', 'oc-48',
];
export const LEVEL3_MEDIA = [
  'ethernet-fiber', 'cellular-2g', 'broadband-3g', 'lte-4g', 'midband-5g', 'fixed-wireless',
  'leo-satellite', 'geo-satellite',
];

export function seconds(rational) {
  return rational.num / rational.den;
}
