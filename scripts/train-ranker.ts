import fs from 'fs';
import path from 'path';

export interface TrainingSample {
  embedding: number[];
  type: 'truth' | 'dare';
  tier: 'mild' | 'spicy' | 'legend';
  isFire: boolean;
}

export interface ModelWeights {
  intercept: number;
  weights: number[];
  accuracy: number;
  wilsonBaseline: number;
  trainedAt: string;
}

/**
 * Feature encoder: embedding vector + one-hot encoded type and tier
 */
function extractFeatures(sample: TrainingSample): number[] {
  const typeFeature = sample.type === 'truth' ? 1 : 0;
  const tierFeatures = [
    sample.tier === 'mild' ? 1 : 0,
    sample.tier === 'spicy' ? 1 : 0,
    sample.tier === 'legend' ? 1 : 0,
  ];
  return [...sample.embedding, typeFeature, ...tierFeatures];
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-Math.max(-50, Math.min(50, z))));
}

export function trainLogisticRegression(samples: TrainingSample[]): ModelWeights | null {
  if (samples.length < 300) {
    console.log(`⚠️ Insufficient samples (${samples.length}/300 required). Server continues using Wilson ranking.`);
    return null;
  }

  // Split 80% train, 20% test
  const shuffled = [...samples].sort(() => Math.random() - 0.5);
  const trainCount = Math.floor(shuffled.length * 0.8);
  const trainData = shuffled.slice(0, trainCount);
  const testData = shuffled.slice(trainCount);

  const numFeatures = extractFeatures(samples[0]).length;
  let weights = new Array(numFeatures).fill(0);
  let intercept = 0;
  const lr = 0.05;
  const epochs = 100;

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (const sample of trainData) {
      const x = extractFeatures(sample);
      const y = sample.isFire ? 1 : 0;
      let dot = intercept;
      for (let i = 0; i < numFeatures; i++) {
        dot += weights[i] * x[i];
      }
      const pred = sigmoid(dot);
      const error = y - pred;
      intercept += lr * error;
      for (let i = 0; i < numFeatures; i++) {
        weights[i] += lr * error * x[i];
      }
    }
  }

  // Calculate held-out test accuracy
  let correct = 0;
  let positiveCount = 0;
  for (const sample of testData) {
    const x = extractFeatures(sample);
    const y = sample.isFire ? 1 : 0;
    if (y === 1) positiveCount++;

    let dot = intercept;
    for (let i = 0; i < numFeatures; i++) dot += weights[i] * x[i];
    const pred = sigmoid(dot) >= 0.5 ? 1 : 0;
    if (pred === y) correct++;
  }

  const accuracy = correct / testData.length;
  // Wilson baseline accuracy: predicting majority class
  const majorityClassAccuracy = Math.max(positiveCount, testData.length - positiveCount) / testData.length;

  console.log(`📊 Model Held-Out Accuracy: ${(accuracy * 100).toFixed(1)}%`);
  console.log(`📊 Wilson / Majority Baseline: ${(majorityClassAccuracy * 100).toFixed(1)}%`);

  if (accuracy <= majorityClassAccuracy) {
    console.warn('❌ Refusing to save weights: Model accuracy did not beat the Wilson baseline.');
    return null;
  }

  const model: ModelWeights = {
    intercept,
    weights,
    accuracy,
    wilsonBaseline: majorityClassAccuracy,
    trainedAt: new Date().toISOString(),
  };

  const outputPath = path.resolve('src/data/ranker-weights.json');
  fs.writeFileSync(outputPath, JSON.stringify(model, null, 2));
  console.log(`✅ Saved trained model weights to ${outputPath}`);
  return model;
}

// When executed directly as CLI script
if (process.argv[1]?.endsWith('train-ranker.ts')) {
  console.log('🤖 Checking rated chit plays for ranker training...');
  // Currently checking existing candidate pool
  trainLogisticRegression([]);
}
