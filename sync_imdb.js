const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const NAME_ID = process.argv[2] || 'nm10457842';
const BASE_DIR = __dirname;
const INDEX_PATH = path.join(BASE_DIR, 'index.html');
const POSTERS_DIR = path.join(BASE_DIR, 'assets', 'posters');
const PRIORITY_IDS = [
  'tt29414906',
  'tt34720347',
  'tt33055019',
  'tt36473776',
  'tt36671437',
  'tt22134246',
];

function fetchText(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 8) {
      reject(new Error(`Too many redirects for ${url}`));
      return;
    }

    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
      (res) => {
        const code = res.statusCode || 0;
        if (code >= 300 && code < 400 && res.headers.location) {
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).toString();
          fetchText(next, redirects + 1).then(resolve).catch(reject);
          return;
        }
        if (code < 200 || code >= 300) {
          reject(new Error(`HTTP ${code} for ${url}`));
          return;
        }

        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve(data));
      }
    );

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error(`Timeout for ${url}`));
    });
  });
}

function downloadFile(url, filePath, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 8) {
      reject(new Error(`Too many redirects for ${url}`));
      return;
    }

    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
      (res) => {
        const code = res.statusCode || 0;
        if (code >= 300 && code < 400 && res.headers.location) {
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).toString();
          downloadFile(next, filePath, redirects + 1).then(resolve).catch(reject);
          return;
        }
        if (code < 200 || code >= 300) {
          reject(new Error(`HTTP ${code} for ${url}`));
          return;
        }

        const tmpPath = `${filePath}.tmp`;
        const stream = fs.createWriteStream(tmpPath);
        res.pipe(stream);

        stream.on('finish', () => {
          stream.close(() => {
            fs.rename(tmpPath, filePath, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        });

        stream.on('error', (err) => {
          fs.unlink(tmpPath, () => reject(err));
        });
      }
    );

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error(`Timeout for ${url}`));
    });
  });
}

function walk(node, visitor) {
  if (!node || typeof node !== 'object') return;
  visitor(node);
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visitor);
  } else {
    for (const key of Object.keys(node)) walk(node[key], visitor);
  }
}

function normalizePosterUrl(url) {
  if (!url) return null;
  // IMDb accepts size parameters in this tokenized part.
  return url.replace(/\._V1_.*?\./, '._V1_QL75_UX500_.');
}

function htmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function titleTypeLabel(rawType) {
  if (!rawType) return 'Title';
  return rawType
    .replace(/tv mini series/i, 'TV Mini Series')
    .replace(/tv series/i, 'TV Series')
    .replace(/tv special/i, 'TV Special')
    .replace(/short/i, 'Short Film')
    .replace(/movie/i, 'Feature Film')
    .replace(/video game/i, 'Video Game');
}

function titleTypeKey(rawType) {
  if (!rawType) return 'title';
  const value = String(rawType).toLowerCase();
  if (value.includes('tv mini series')) return 'tv_mini_series';
  if (value.includes('tv series')) return 'tv_series';
  if (value.includes('tv special')) return 'tv_special';
  if (value.includes('short')) return 'short_film';
  if (value.includes('movie')) return 'feature_film';
  if (value.includes('music video')) return 'music_video';
  if (value.includes('video game')) return 'video_game';
  return 'title';
}

function extractCinematographerCredits(nextData) {
  const creditsById = new Map();

  walk(nextData, (node) => {
    if (!node || typeof node !== 'object') return;
    if (!node.creditedRoles || !node.title) return;

    const edges = node.creditedRoles.edges;
    if (!Array.isArray(edges) || edges.length === 0) return;

    const categories = edges
      .map((edge) => edge?.node?.category?.text)
      .filter(Boolean);

    const isCinematographer = categories.some((c) =>
      /(cinematographer|director of photography)/i.test(c)
    );
    if (!isCinematographer) return;

    const title = node.title;
    if (!title.id || !/^tt\d+$/.test(title.id)) return;

    const current = creditsById.get(title.id);
    const candidate = {
      id: title.id,
      name: title.titleText?.text || 'Untitled',
      year: title.releaseYear?.year || null,
      type: titleTypeLabel(title.titleType?.text || ''),
      typeKey: titleTypeKey(title.titleType?.text || ''),
      posterUrl: normalizePosterUrl(title.primaryImage?.url || null),
      imdbUrl: `https://www.imdb.com/title/${title.id}/`,
    };

    if (!current) {
      creditsById.set(title.id, candidate);
      return;
    }

    // Keep the richer record if duplicates appear in multiple sections.
    if (!current.posterUrl && candidate.posterUrl) current.posterUrl = candidate.posterUrl;
    if (!current.year && candidate.year) current.year = candidate.year;
    if ((!current.type || current.type === 'Title') && candidate.type) current.type = candidate.type;
    if ((!current.typeKey || current.typeKey === 'title') && candidate.typeKey) current.typeKey = candidate.typeKey;
  });

  const priorityIndex = new Map(PRIORITY_IDS.map((id, idx) => [id, idx]));

  return Array.from(creditsById.values()).sort((a, b) => {
    const aPriority = priorityIndex.has(a.id) ? priorityIndex.get(a.id) : Number.POSITIVE_INFINITY;
    const bPriority = priorityIndex.has(b.id) ? priorityIndex.get(b.id) : Number.POSITIVE_INFINITY;
    if (aPriority !== bPriority) return aPriority - bPriority;

    const ay = a.year || 0;
    const by = b.year || 0;
    if (ay !== by) return by - ay;
    return a.name.localeCompare(b.name);
  });
}

function renderCardsHtml(credits) {
  if (credits.length === 0) {
    return [
      '<!-- AUTO-IMDB-START -->',
      '<p class="project-empty" data-i18n="no_credits">No cinematographer credits found on IMDb.</p>',
      '<!-- AUTO-IMDB-END -->',
    ].join('\n');
  }

  const lines = ['<!-- AUTO-IMDB-START -->'];
  for (const c of credits) {
    const year = c.year || '----';
    const posterPath = `assets/posters/${c.id}.jpg`;
    lines.push(
      `            <a href="${htmlEscape(c.imdbUrl)}" target="_blank" rel="noopener" class="project-card">`
    );
    lines.push(
      `                <img class="project-poster" src="${posterPath}" alt="${htmlEscape(c.name)} poster" loading="lazy">`
    );
    lines.push(`                <span class="project-year">${year}</span>`);
    lines.push(`                <h3 class="project-name">${htmlEscape(c.name)}</h3>`);
    lines.push(
      `                <p class="project-desc" data-type-key="${htmlEscape(c.typeKey || 'title')}" data-type-fallback="${htmlEscape(c.type)}">${htmlEscape(c.type)}</p>`
    );
    lines.push('            </a>');
  }
  lines.push('<!-- AUTO-IMDB-END -->');
  return lines.join('\n');
}

async function sync() {
  if (!fs.existsSync(POSTERS_DIR)) {
    fs.mkdirSync(POSTERS_DIR, { recursive: true });
  }

  const pageUrl = `https://m.imdb.com/name/${NAME_ID}/`;
  console.log(`Fetching IMDb name page: ${pageUrl}`);
  const html = await fetchText(pageUrl);

  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (!nextDataMatch) {
    throw new Error('IMDb __NEXT_DATA__ not found. The page format may have changed.');
  }

  const nextData = JSON.parse(nextDataMatch[1]);
  const credits = extractCinematographerCredits(nextData);
  console.log(`Found ${credits.length} unique cinematographer titles.`);
  const keepPosterIds = new Set(credits.map((c) => c.id));

  for (const credit of credits) {
    if (!credit.posterUrl) continue;
    const posterFile = path.join(POSTERS_DIR, `${credit.id}.jpg`);
    if (fs.existsSync(posterFile)) continue;
    try {
      console.log(`Downloading poster ${credit.id} (${credit.name})`);
      await downloadFile(credit.posterUrl, posterFile);
    } catch (err) {
      console.warn(`Poster download failed for ${credit.id}: ${err.message}`);
    }
  }

  // Remove stale posters that are no longer in cinematographer credits.
  const posterFiles = fs.readdirSync(POSTERS_DIR).filter((f) => f.endsWith('.jpg'));
  for (const fileName of posterFiles) {
    const id = fileName.replace(/\.jpg$/, '');
    if (keepPosterIds.has(id)) continue;
    const filePath = path.join(POSTERS_DIR, fileName);
    fs.unlinkSync(filePath);
    console.log(`Removed stale poster: ${fileName}`);
  }

  const indexHtml = fs.readFileSync(INDEX_PATH, 'utf8');
  const blockRegex =
    /(<div class="projects-track">\s*)([\s\S]*?)(\s*<\/div>\s*<\/section>)/;
  if (!blockRegex.test(indexHtml)) {
    throw new Error('Could not find projects track block in index.html.');
  }

  const cardsHtml = renderCardsHtml(credits);
  const nextHtml = indexHtml.replace(blockRegex, `$1${cardsHtml}$3`);
  fs.writeFileSync(INDEX_PATH, nextHtml, 'utf8');

  console.log('Updated index.html with auto-generated IMDb cards.');
  console.log('Done.');
}

sync().catch((err) => {
  console.error(err);
  process.exit(1);
});
