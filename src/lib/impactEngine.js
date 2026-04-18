export const CATEGORIES = ['transport', 'diet', 'energy', 'reusables'];

export const CATEGORY_WEIGHTS = {
  transport: 3,
  diet: 2,
  energy: 2,
  reusables: 1,
};

export const CATEGORY_LABELS = {
  transport: 'Transport',
  diet: 'Diet',
  energy: 'Energy',
  reusables: 'Reusables',
};

const KEYWORDS = {
  transport: [
    'bike', 'cycled', 'cycle', 'walked', 'walking', 'transit', 'bus', 'train',
    'subway', 'metro', 'carpool', 'ev', 'electric car', 'skipped driving',
    'no car', 'stayed local', 'rideshare', 'rail',
  ],
  diet: [
    'vegan', 'vegetarian', 'plant-based', 'meatless', 'no meat', 'less meat',
    'tofu', 'legumes', 'lentils', 'beans', 'local produce', 'seasonal',
    'composted', 'compost', 'leftovers', 'no waste', 'zero waste meal',
  ],
  energy: [
    'thermostat', 'unplugged', 'turned off', 'led', 'lights off', 'cold wash',
    'air-dry', 'line dry', 'solar', 'shorter shower', 'less heating',
    'efficiency', 'insulation', 'smart plug',
  ],
  reusables: [
    'reusable', 'refill', 'refilled', 'tote', 'bottle', 'mug', 'container',
    'bamboo', 'cloth', 'second-hand', 'secondhand', 'thrift', 'repaired',
    'fixed', 'patched', 'mended',
  ],
};

function classify(text) {
  if (!text) return null;
  const t = String(text).toLowerCase();
  for (const cat of CATEGORIES) {
    for (const kw of KEYWORDS[cat]) {
      if (t.includes(kw)) return cat;
    }
  }
  return null;
}

export function computeImpactScore(memories = []) {
  const counts = { transport: 0, diet: 0, energy: 0, reusables: 0 };

  for (const m of memories) {
    const value = m?.value ?? {};
    const explicit = typeof value.category === 'string' ? value.category.toLowerCase() : null;
    const text =
      typeof value.habit === 'string'
        ? value.habit
        : typeof value === 'string'
          ? value
          : '';
    const cat = (explicit && counts[explicit] !== undefined) ? explicit : classify(text);
    if (cat) counts[cat] += 1;
  }

  let weightedSum = 0;
  let maxWeighted = 0;
  const breakdown = {};
  for (const cat of CATEGORIES) {
    const weight = CATEGORY_WEIGHTS[cat];
    const raw = counts[cat];
    // Diminishing returns so score keeps climbing but never snaps to 1000.
    const scaled = Math.log1p(raw) * weight;
    weightedSum += scaled;
    // Reference ceiling: 20 habits per category would feel "mastered".
    maxWeighted += Math.log1p(20) * weight;
    breakdown[cat] = {
      count: raw,
      weight,
      contribution: Math.round(scaled * 100) / 100,
    };
  }

  const normalized = maxWeighted > 0 ? weightedSum / maxWeighted : 0;
  const score = Math.min(1000, Math.round(normalized * 1000));

  return { score, breakdown, counts };
}
