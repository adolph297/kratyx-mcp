const fs = require('fs');
const path = require('path');
const https = require('https');

const connectorsDir = path.join(__dirname, '..', 'connectors');
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Map slugs to Simple Icons aliases if they differ
const SLUG_ALIASES = {
    'google-calendar': 'googlecalendar',
    'google-drive': 'googledrive',
    'google-sheets': 'googlesheets',
    'google-analytics': 'googleanalytics',
    'microsoft-teams': 'microsoftteams',
    'mongodb-atlas': 'mongodb',
    'google-compute': 'googlecloud',
    'massive-market-data': 'chartmogul', // proxy for finance
    'sp-global': 'sp',
    'massive-market-data': 'tradingview',
    'shadcn-ui': 'shadcnui',
    'razorpay': 'razorpay',
    'pophive': 'hive',
    'pdf-reader': 'adobeacrobatreader',
    'pdf-tools': 'adobe',
    'control-chrome': 'googlechrome',
    'control-mac': 'apple',
    'imessages': 'messages',
    'apple-notes': 'simplenotes',
    'massive-market-data': 'marketscale',
    '10x-genomics': 'genomics',
    'biorxiv': 'hal',
    'pubmed': 'google-scholar',
    'scholar-gateway': 'googlescholar',
    'fever': 'eventbrite',
    'local-falcon': 'f-secure',
    'vibe-prospecting': 'prospectus',
    'airops': 'aircan',
    'windsur': 'windstone'
};

function fetchSvg(slug, alias) {
    return new Promise((resolve, reject) => {
        const iconName = alias || slug.toLowerCase().replace(/[^a-z0-9]/g, '');
        const url = `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${iconName}.svg`;

        https.get(url, (res) => {
            if (res.statusCode === 200) {
                const filePath = path.join(iconsDir, `${slug}.svg`);
                const file = fs.createWriteStream(filePath);
                res.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve(true);
                });
            } else {
                resolve(false);
            }
        }).on('error', (err) => {
            console.error(`Error fetching ${slug}:`, err.message);
            resolve(false);
        });
    });
}

function generateFallbackSvg(name, slug) {
    const filePath = path.join(iconsDir, `${slug}.svg`);
    const color = '#3B82F6';
    const firstLetter = name.charAt(0).toUpperCase();
    const svg = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="${color}" fill-opacity="0.1"/>
        <text x="50" y="65" font-family="Arial, sans-serif" font-size="50" font-weight="bold" fill="${color}" text-anchor="middle">${firstLetter}</text>
    </svg>`;
    fs.writeFileSync(filePath, svg);
}

async function run() {
    console.log('--- ICON FETCHING START ---');
    const files = fs.readdirSync(connectorsDir).filter(f => f.endsWith('.json'));
    let successCount = 0;
    let fallbackCount = 0;

    for (const file of files) {
        const filePath = path.join(connectorsDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const { slug, name } = data;

        process.stdout.write(`Fetching ${slug}... `);

        let success = await fetchSvg(slug, SLUG_ALIASES[slug]);
        
        // Try fallback aliases if not found directly
        if (!success && slug.includes('-')) {
             const base = slug.split('-')[0];
             success = await fetchSvg(slug, base);
        }

        if (success) {
            console.log('✅');
            successCount++;
        } else {
            console.log('❌ (using generated)');
            generateFallbackSvg(name, slug);
            fallbackCount++;
        }
    }

    console.log('\n--- SUMMARY ---');
    console.log(`Successfully fetched from Simple Icons: ${successCount}`);
    console.log(`Generated high-quality fallbacks: ${fallbackCount}`);
    console.log(`Total icons in public/icons/: ${successCount + fallbackCount}`);
}

run();
