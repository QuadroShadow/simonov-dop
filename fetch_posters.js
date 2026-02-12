const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const titles = [
    { id: 'tt33055019', name: 'Entropy' },
    { id: 'tt34365634', name: 'Rating Race' },
    { id: 'tt36671437', name: 'DOM (Home)' },
    { id: 'tt36558094', name: 'White Snail' },
    { id: 'tt28372664', name: 'Youth Eternal' },
    { id: 'tt39393813', name: 'Maxim Busel: Aust un Riet' },
    { id: 'tt34720347', name: 'The Barber' },
    { id: 'tt38151982', name: 'Elvira' },
    { id: 'tt36690747', name: 'Lostland' },
    { id: 'tt36473776', name: 'A Matter of Taste' },
    { id: 'tt36130910', name: 'T-Fest: Music Saved Me' },
    { id: 'tt32508583', name: 'The Birds Didnt Fly' },
    { id: 'tt29414906', name: 'Tea Time' },
    { id: 'tt26771448', name: 'UGA: Biedeigais B' },
    { id: 'tt27658646', name: 'Katastrofa' },
    { id: 'tt13364966', name: 'Anna LOL' },
    { id: 'tt13478664', name: 'Resistance is Futile' },
    { id: 'tt32916088', name: 'Kolektivs' },
    { id: 'tt27650510', name: 'Dignity' },
    { id: 'tt22134246', name: 'Fati' },
    { id: 'tt6442686', name: 'WarHunt' },
    { id: 'tt12881340', name: 'Lovable' },
    { id: 'tt14349032', name: 'The Good Neighbor' },
    { id: 'tt11041046', name: 'Survive' },
    { id: 'tt11555056', name: 'Jaungada Taksometrs 2' },
    { id: 'tt7243884', name: 'Catherine the Great' },
    { id: 'tt9140604', name: 'Fartblinda' },
];

const postersDir = path.join(__dirname, 'assets', 'posters');
if (!fs.existsSync(postersDir)) fs.mkdirSync(postersDir, { recursive: true });

function fetchPage(url) {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith('https') ? https : http;
        const req = mod.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchPage(res.headers.location).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    });
}

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith('https') ? https : http;
        const req = mod.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) { reject(new Error('Status ' + res.statusCode)); return; }
            const stream = fs.createWriteStream(dest);
            res.pipe(stream);
            stream.on('finish', () => { stream.close(); resolve(); });
        });
        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    });
}

async function processTitles() {
    const results = {};
    for (const t of titles) {
        const outFile = path.join(postersDir, t.id + '.jpg');
        if (fs.existsSync(outFile)) {
            console.log(`SKIP ${t.id} (${t.name}) - already downloaded`);
            results[t.id] = 'assets/posters/' + t.id + '.jpg';
            continue;
        }
        try {
            console.log(`Fetching ${t.id} (${t.name})...`);
            const html = await fetchPage('https://www.imdb.com/title/' + t.id + '/');
            // Try to find poster image in og:image meta tag
            let posterUrl = null;
            const ogMatch = html.match(/property="og:image"\s+content="([^"]+)"/);
            if (ogMatch) posterUrl = ogMatch[1];
            if (!posterUrl) {
                const ogMatch2 = html.match(/content="([^"]+)"\s+property="og:image"/);
                if (ogMatch2) posterUrl = ogMatch2[1];
            }
            if (posterUrl && !posterUrl.includes('imdb_fb_logo')) {
                // Resize to reasonable size - modify the URL to get smaller version
                // IMDb media URLs can be resized by changing the dimensions in the URL
                const resized = posterUrl.replace(/\._V1_.*\./, '._V1_QL75_UX300_.');
                console.log(`  Downloading poster: ${resized.substring(0, 80)}...`);
                await downloadFile(resized, outFile);
                results[t.id] = 'assets/posters/' + t.id + '.jpg';
                console.log(`  OK`);
            } else {
                console.log(`  No poster found`);
                results[t.id] = null;
            }
            // Small delay to be polite
            await new Promise(r => setTimeout(r, 500));
        } catch (e) {
            console.log(`  ERROR: ${e.message}`);
            results[t.id] = null;
        }
    }
    console.log('\n--- RESULTS ---');
    console.log(JSON.stringify(results, null, 2));
}

processTitles();
