/**
 * Deduplica leaderboards/{mode}/entries por displayName (case-insensitive),
 * mantém o maior score, seeda leaderboard_nicks com legacy: true.
 *
 * Uso (em sites-firebase/scripts):
 *   node cleanup-leaderboard-duplicates.mjs --dry-run
 *   node cleanup-leaderboard-duplicates.mjs
 *   node cleanup-leaderboard-duplicates.mjs --release-nick=Nome
 *
 * Credenciais: token do `firebase login` (ou ADC se disponível).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

const PROJECT_ID = 'apps-84516';
const MODES = ['classic', 'blitz', 'tetris'];

/** OAuth público do Firebase CLI (mesmo de firebase-tools/lib/api.js). */
const FIREBASE_CLI_CLIENT_ID =
  '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const releaseArg = args.find((a) => a.startsWith('--release-nick='));
const releaseNick = releaseArg ? releaseArg.slice('--release-nick='.length) : null;

function normalizeDisplayName(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase();
}

function toMillis(updatedAt) {
  if (!updatedAt) return 0;
  if (updatedAt instanceof Timestamp) return updatedAt.toMillis();
  if (typeof updatedAt.toMillis === 'function') return updatedAt.toMillis();
  if (updatedAt._seconds != null) return updatedAt._seconds * 1000;
  return 0;
}

function firebaseToolsConfigPath() {
  const home = os.homedir();
  return path.join(home, '.config', 'configstore', 'firebase-tools.json');
}

/** Credencial ADC a partir do `firebase login` (arquivo authorized_user). */
function credentialPathFromFirebaseCli() {
  const configPath = firebaseToolsConfigPath();
  if (!fs.existsSync(configPath)) {
    throw new Error(`firebase-tools.json não encontrado em ${configPath}`);
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const refreshToken = config?.tokens?.refresh_token;
  if (!refreshToken) {
    throw new Error('Sem refresh_token. Rode: firebase login');
  }
  const email = config?.user?.email || 'unknown_user';
  const slug = String(email).replace('@', '_').replace(/\./g, '_');
  const dir = path.join(
    process.env.APPDATA || path.join(os.homedir(), '.config'),
    'firebase',
  );
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, `${slug}_application_default_credentials.json`);
  const payload = {
    client_id: FIREBASE_CLI_CLIENT_ID,
    client_secret: FIREBASE_CLI_CLIENT_SECRET,
    refresh_token: refreshToken,
    type: 'authorized_user',
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  return outPath;
}

async function initAdmin() {
  try {
    const credPath = credentialPathFromFirebaseCli();
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
    initializeApp({
      credential: applicationDefault(),
      projectId: PROJECT_ID,
    });
    console.log(`Auth: firebase login → ${credPath}`);
    return;
  } catch (cliErr) {
    console.warn('CLI auth falhou, tentando ADC:', cliErr.message);
  }
  initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID,
  });
  console.log('Auth: applicationDefault()');
}

await initAdmin();
const db = getFirestore();

async function releaseNickname(rawName) {
  const key = normalizeDisplayName(rawName);
  if (!key) {
    console.error('Nick vazio.');
    process.exit(1);
  }
  const ref = db.collection('leaderboard_nicks').doc(key);
  const snap = await ref.get();
  if (!snap.exists) {
    console.log(`Nada a liberar: leaderboard_nicks/${key} não existe.`);
    return;
  }
  if (dryRun) {
    console.log(`[dry-run] delete leaderboard_nicks/${key}`, snap.data());
    return;
  }
  await ref.delete();
  console.log(`Liberado: leaderboard_nicks/${key}`);
}

async function cleanupMode(mode) {
  const col = db.collection('leaderboards').doc(mode).collection('entries');
  const snap = await col.get();
  console.log(`\n=== ${mode}: ${snap.size} entries ===`);

  /** @type {Map<string, Array<{id: string, data: FirebaseFirestore.DocumentData}>>} */
  const groups = new Map();

  for (const doc of snap.docs) {
    const data = doc.data();
    const key = normalizeDisplayName(data.displayName);
    if (!key) {
      console.warn(`  skip ${doc.id}: displayName vazio`);
      continue;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ id: doc.id, data });
  }

  const toDelete = [];
  /** @type {Array<{key: string, displayName: string, playerId: string, score: number}>} */
  const winners = [];

  for (const [key, entries] of groups) {
    entries.sort((a, b) => {
      const scoreA = Number(a.data.score) || 0;
      const scoreB = Number(b.data.score) || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return toMillis(b.data.updatedAt) - toMillis(a.data.updatedAt);
    });
    const keep = entries[0];
    const dupes = entries.slice(1);
    winners.push({
      key,
      displayName: String(keep.data.displayName).trim(),
      playerId: keep.id,
      score: Number(keep.data.score) || 0,
    });
    if (dupes.length > 0) {
      console.log(
        `  nick "${key}": keep ${keep.id} (score=${keep.data.score}), delete ${dupes.length}`,
      );
      for (const d of dupes) {
        toDelete.push({ mode, id: d.id, score: d.data.score, name: d.data.displayName });
      }
    } else {
      console.log(`  nick "${key}": único ${keep.id} (score=${keep.data.score})`);
    }
  }

  if (dryRun) {
    console.log(`  [dry-run] apagaria ${toDelete.length} docs`);
    for (const d of toDelete) {
      console.log(`    - leaderboards/${d.mode}/entries/${d.id} (${d.name}, ${d.score})`);
    }
  } else {
    for (const d of toDelete) {
      await col.doc(d.id).delete();
    }
    console.log(`  apagados: ${toDelete.length}`);
  }

  return winners;
}

/**
 * Entre modos, o mesmo nick pode ter winners com UIDs diferentes.
 * Fica com o playerId do maior score global; marca legacy: true.
 */
function mergeNickWinners(allWinners) {
  /** @type {Map<string, {key: string, displayName: string, playerId: string, score: number}>} */
  const best = new Map();
  for (const w of allWinners) {
    const prev = best.get(w.key);
    if (!prev || w.score > prev.score) {
      best.set(w.key, w);
    }
  }
  return [...best.values()];
}

async function seedNicks(winners) {
  console.log(`\n=== seed leaderboard_nicks (${winners.length}) ===`);
  for (const w of winners) {
    const ref = db.collection('leaderboard_nicks').doc(w.key);
    const payload = {
      displayName: w.displayName.slice(0, 24),
      playerId: w.playerId,
      legacy: true,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (dryRun) {
      console.log(`  [dry-run] set leaderboard_nicks/${w.key}`, {
        displayName: payload.displayName,
        playerId: payload.playerId,
        legacy: true,
      });
      continue;
    }
    await ref.set(payload, { merge: true });
    console.log(`  seeded ${w.key} → ${w.playerId}`);
  }
}

async function main() {
  console.log(`Projeto: ${PROJECT_ID} | dry-run=${dryRun}`);

  if (releaseNick) {
    await releaseNickname(releaseNick);
    return;
  }

  const allWinners = [];
  for (const mode of MODES) {
    const winners = await cleanupMode(mode);
    allWinners.push(...winners);
  }

  const nickSeeds = mergeNickWinners(allWinners);
  await seedNicks(nickSeeds);

  console.log('\nConcluído.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
