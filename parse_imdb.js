const fs = require('fs');
const html = fs.readFileSync(process.env.TEMP + '/imdb_page.html', 'utf8');

// Find the cinematographer section specifically
// IMDb uses sections with data-testid for different credit categories
// Look for "Cinematographer" section and extract titles only from that section

// Try to find the cinematographer section boundaries
const sections = html.split(/(?=cinematographer)/i);
console.log('Found', sections.length, 'sections containing "cinematographer"');
console.log('---');

// Look for structured data around cinematographer credits
// IMDb modern pages use JSON data embedded in the page
const jsonMatches = html.match(/__NEXT_DATA__[^>]*>([\s\S]*?)<\/script/);
if (jsonMatches) {
    try {
        const data = JSON.parse(jsonMatches[1]);
        // Navigate the Next.js data structure to find credits
        const str = JSON.stringify(data);
        // Find cinematographer section
        const cinIdx = str.indexOf('"Cinematographer"');
        if (cinIdx > -1) {
            // Get surrounding context
            const context = str.substring(Math.max(0, cinIdx - 200), Math.min(str.length, cinIdx + 2000));
            console.log('NEXT_DATA context around Cinematographer:');
            console.log(context.substring(0, 500));
            console.log('...');
        }
    } catch (e) {
        console.log('No NEXT_DATA JSON found or parse error:', e.message);
    }
}

// Alternative: look for the credit section pattern in raw HTML
// IMDb uses specific patterns for credit sections
const cinematographerPattern = /cinematographer/gi;
let match;
let positions = [];
while ((match = cinematographerPattern.exec(html)) !== null) {
    positions.push(match.index);
}
console.log('\nPositions of "cinematographer" in HTML:', positions.length);

// Extract a chunk of HTML around the first few cinematographer mentions to understand structure
for (let i = 0; i < Math.min(3, positions.length); i++) {
    const start = Math.max(0, positions[i] - 100);
    const end = Math.min(html.length, positions[i] + 300);
    const chunk = html.substring(start, end).replace(/\n/g, ' ').replace(/\s+/g, ' ');
    console.log(`\n--- Context ${i} (pos ${positions[i]}) ---`);
    console.log(chunk);
}

// Try to find credit category headers with their associated title IDs
// Look for patterns like: Cinematographer ... /title/ttXXXX
const creditBlocks = html.split(/(?=id="cinematographer")/i);
console.log('\n\nCredit blocks split by id="cinematographer":', creditBlocks.length);

// Search for accordion or section markers
const sectionMarkers = html.match(/data-testid="nm-flmg-c[^"]*"/g);
if (sectionMarkers) {
    console.log('\nSection markers found:', sectionMarkers);
}
