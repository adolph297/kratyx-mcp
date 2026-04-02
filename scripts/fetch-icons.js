const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const connectorsDir = path.join(__dirname, '..', 'connectors');
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Extensive mapping of common MCP slugs to SimpleIcons aliases
const SLUG_ALIASES = {
    'google-calendar': 'googlecalendar',
    'google-drive': 'googledrive',
    'google-sheets': 'googlesheets',
    'google-analytics': 'googleanalytics',
    'microsoft-teams': 'microsoftteams',
    'mongodb-atlas': 'mongodb',
    'google-compute': 'googlecloud',
    'google-cloud': 'googlecloud',
    'massive-market-data': 'chartmogul', 
    'sp-global': 'sp',
    'shadcn-ui': 'shadcnui',
    'razorpay': 'razorpay',
    'pophive': 'hive',
    'pdf-reader': 'adobeacrobatreader',
    'pdf-tools': 'adobe',
    'control-chrome': 'googlechrome',
    'control-mac': 'apple',
    'imessages': 'messages',
    'apple-notes': 'simplenotes',
    '10x-genomics': 'genomics',
    'biorxiv': 'hal',
    'pubmed': 'google-scholar',
    'scholar-gateway': 'googlescholar',
    'fever': 'eventbrite',
    'local-falcon': 'f-secure',
    'vibe-prospecting': 'prospectus',
    'airops': 'aircan',
    'windsur': 'windstone',
    'windows-mcp': 'windows',
    'android-mcp': 'android',
    'kubernetes-mcp': 'kubernetes',
    'pan-os': 'paloaltonetworks',
    'sap-fiori': 'sap',
    'sap-cap': 'sap',
    'sap-mdk': 'sap',
    'pg-aiguide': 'postgresql',
    'active-campaign': 'activecampaign',
    'ad-guard': 'adguard',
    'adobe-creative-cloud': 'adobecreativecloud',
    'air-table': 'airtable',
    'amazon-web-services': 'amazons3',
    'app-store': 'appstore',
    'apple-music': 'applemusic',
    'atlassian-confluence': 'confluence',
    'atlassian-jira': 'jira',
    'aws-lambda': 'awslambda',
    'bing-web-search': 'bing',
    'bit-bucket': 'bitbucket',
    'cloud-flare': 'cloudflare',
    'code-cademy': 'codecademy',
    'digital-ocean': 'digitalocean',
    'elastic-search': 'elasticsearch',
    'f-secure': 'fsecure',
    'fresh-books': 'freshbooks',
    'fresh-desk': 'freshdesk',
    'git-hub': 'github',
    'git-lab': 'gitlab',
    'google-ads': 'googleads',
    'google-maps': 'googlemaps',
    'google-meet': 'googlemeet',
    'google-photos': 'googlephotos',
    'google-search': 'googlesearch',
    'hashi-corp': 'hashicorp',
    'hot-jar': 'hotjar',
    'hub-spot': 'hubspot',
    'ibm-cloud': 'ibmcloud',
    'intuit-quickbooks': 'quickbooks',
    'mail-chimp': 'mailchimp',
    'microsoft-365': 'microsoft365',
    'microsoft-azure': 'microsoftazure',
    'microsoft-excel': 'microsoftexcel',
    'microsoft-outlook': 'microsoftoutlook',
    'microsoft-powerpoint': 'microsoftpowerpoint',
    'microsoft-word': 'microsoftword',
    'net-flix': 'netflix',
    'open-ai': 'openai',
    'open-streetmap': 'openstreetmap',
    'oracle-cloud': 'oracle',
    'palo-alto-networks': 'paloaltonetworks',
    'post-gresql': 'postgresql',
    'sales-force': 'salesforce',
    's-p-global': 'sp',
    'stack-overflow': 'stackoverflow',
    'unity-engine': 'unity',
    'visual-studio-code': 'visualstudiocode',
    'vs-code': 'visualstudiocode',
    'zapier-automation': 'zapier',
    'zoho-books': 'zoho',
    'zoho-crm': 'zoho',
    'zoho-projects': 'zoho'
};

function getDomain(url, slug) {
    if (!url || url === '#' || !url.includes('.')) {
        if (!slug.includes('-')) return `${slug}.com`;
        const base = slug.split('-')[0];
        if (base.length > 3) return `${base}.com`;
        return null;
    }
    try {
        const u = new URL(url.startsWith('http') ? url : `https://${url}`);
        return u.hostname.replace('www.', '');
    } catch (e) {
        return null;
    }
}

function downloadFile(url, destPath) {
    return new Promise((resolve) => {
        const protocol = url.startsWith('https') ? https : http;
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            }
        };
        protocol.get(url, options, (res) => {
            if (res.statusCode === 200) {
                const contentType = res.headers['content-type'] || '';
                // Basic check to ensure it's an image
                if (contentType.includes('image') || contentType.includes('application/octet-stream') || url.includes('.svg')) {
                    const file = fs.createWriteStream(destPath);
                    res.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        resolve(true);
                    });
                } else {
                    resolve(false);
                }
            } else if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
                let nextUrl = res.headers.location;
                if (!nextUrl.startsWith('http')) {
                    const originalUrl = new URL(url);
                    nextUrl = `${originalUrl.protocol}//${originalUrl.host}${nextUrl}`;
                }
                downloadFile(nextUrl, destPath).then(resolve);
            } else {
                resolve(false);
            }
        }).on('error', () => {
            resolve(false);
        });
    });
}

async function tryFetchIcon(slug, alias, domain) {
    const iconName = alias || slug.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
    const filePath = path.join(iconsDir, `${slug}.svg`);
    const pngPath = path.join(iconsDir, `${slug}.png`);

    // 1. Simple Icons (SVG)
    if (await downloadFile(`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${iconName}.svg`, filePath)) return { source: 'SimpleIcons', ext: 'svg' };
    if (await downloadFile(`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${cleanSlug}.svg`, filePath)) return { source: 'SimpleIcons', ext: 'svg' };

    // 2. Vector Logo Zone (SVG)
    if (await downloadFile(`https://www.vectorlogo.zone/logos/${iconName}/${iconName}-icon.svg`, filePath)) return { source: 'VectorLogoZone', ext: 'svg' };
    if (await downloadFile(`https://www.vectorlogo.zone/logos/${cleanSlug}/${cleanSlug}-icon.svg`, filePath)) return { source: 'VectorLogoZone', ext: 'svg' };

    // 3. SVGPorn (SVG)
    if (await downloadFile(`https://cdn.jsdelivr.net/gh/gilbarbara/logos@master/logos/${iconName}.svg`, filePath)) return { source: 'SVGPorn', ext: 'svg' };
    if (await downloadFile(`https://cdn.jsdelivr.net/gh/gilbarbara/logos@master/logos/${cleanSlug}.svg`, filePath)) return { source: 'SVGPorn', ext: 'svg' };

    // 4. Clearbit (PNG)
    if (domain) {
        if (await downloadFile(`https://logo.clearbit.com/${domain}?size=128`, pngPath)) return { source: 'Clearbit', ext: 'png' };
    }

    // 5. Google Favicon API (PNG) - Higher certainty than Favicon.horse
    if (domain) {
        if (await downloadFile(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`, pngPath)) return { source: 'Google', ext: 'png' };
    }

    // 6. Favicon.horse (PNG)
    if (domain) {
        if (await downloadFile(`https://favicon.horse/icon/${domain}`, pngPath)) return { source: 'Favicon.horse', ext: 'png' };
    }

    return null;
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
    console.log('\x1b[36m%s\x1b[0m', '--- FINAL AGGRESSIVE ICON EXTRACTION START ---');
    const files = fs.readdirSync(connectorsDir).filter(f => f.endsWith('.json'));
    let stats = {
        SimpleIcons: 0,
        VectorLogoZone: 0,
        SVGPorn: 0,
        Clearbit: 0,
        Google: 0,
        'Favicon.horse': 0,
        Fallback: 0
    };

    for (const file of files) {
        const filePath = path.join(connectorsDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const { slug, name, website } = data;
        const domain = getDomain(website, slug);

        process.stdout.write(`Fetching ${slug}... `);

        // Delete existing fallbacks before trying
        const svgPath = path.join(iconsDir, `${slug}.svg`);
        const pngPath = path.join(iconsDir, `${slug}.png`);
        
        if (fs.existsSync(svgPath)) {
            const content = fs.readFileSync(svgPath, 'utf8');
            if (content.includes('text-anchor="middle"')) {
                fs.unlinkSync(svgPath);
            }
        }

        const result = await tryFetchIcon(slug, SLUG_ALIASES[slug], domain);

        if (result) {
            const { source, ext } = result;
            console.log(`\x1b[32m✅ [${source}]\x1b[0m`);
            stats[source]++;
            
            // Clean up opposing extension
            if (ext === 'png' && fs.existsSync(svgPath)) fs.unlinkSync(svgPath);
            if (ext === 'svg' && fs.existsSync(pngPath)) fs.unlinkSync(pngPath);
        } else {
            console.log('\x1b[33m❌ (using generated)\x1b[0m');
            generateFallbackSvg(name, slug);
            stats.Fallback++;
        }
    }

    console.log('\n\x1b[36m--- SUMMARY ---\x1b[0m');
    Object.entries(stats).forEach(([source, count]) => {
        if (count > 0 || source === 'Fallback') {
            console.log(`${source.padEnd(15)}: ${count}`);
        }
    });
    const totalFound = Object.values(stats).reduce((a, b) => a + b, 0) - stats.Fallback;
    console.log(`Total Icons Found: ${totalFound}`);
    console.log(`Total Connectors : ${files.length}`);
}

run();
