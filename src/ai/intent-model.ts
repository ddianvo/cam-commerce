import { normalizeText } from '../products/product-search';
import training from './intent-training.json';

function features(text: string) {
  const words = normalizeText(text).split(' ').filter(Boolean);
  const vector = new Map<string, number>();
  words.forEach((word, index) => {
    vector.set(word, 1);
    if (index) vector.set(words[index - 1] + ' ' + word, 2);
  });
  return unitVector(vector);
}

function unitVector(vector: Map<string, number>) {
  const norm = Math.hypot(...vector.values());
  return new Map([...vector].map(([feature, weight]) => [feature, weight / norm]));
}

// Supervised training: average the example vectors for each labeled shopping intent.
const centroids = Object.entries(training).map(([query, examples]) => {
  const sum = new Map<string, number>();
  for (const example of examples) {
    for (const [feature, weight] of features(example)) {
      sum.set(feature, (sum.get(feature) ?? 0) + weight);
    }
  }
  return { query, vector: unitVector(sum) };
});

export function predictProductQuery(text: string): string | undefined {
  const input = features(text);
  const [first, second] = centroids
    .map(({ query, vector }) => {
      let score = 0;
      let matchedWords = 0;
      for (const [feature, weight] of input) {
        const learnedWeight = vector.get(feature);
        if (learnedWeight === undefined) continue;
        score += weight * learnedWeight;
        if (!feature.includes(' ')) matchedWords++;
      }
      return { query, score, matchedWords };
    })
    .sort((a, b) => b.score - a.score);
  if (first.matchedWords >= 2 && first.score >= 0.39 && first.score - second.score >= 0.08)
    return first.query;
}
