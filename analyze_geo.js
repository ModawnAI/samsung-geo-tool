const fs = require('fs');
const geoData = JSON.parse(fs.readFileSync('geo_data_analysis.json', 'utf8'));

// Analyze patterns between draft and final
console.log('=== GEO Modification Patterns Analysis ===');
console.log();

// Group by category
const byCategory = {};
geoData.forEach(row => {
    const cat = row.contentsCategory;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(row);
});

Object.keys(byCategory).forEach(cat => {
    console.log('\n=== Category:', cat, '(', byCategory[cat].length, 'items) ===');

    // Show 3 examples per category
    byCategory[cat].slice(0, 3).forEach((row, i) => {
        console.log('\n--- Example', i+1, ':', row.product, '---');
        console.log('YouTube Title:', row.youtubeTitle);
        console.log();
        console.log('DRAFT:');
        console.log(row.copyDraft);
        console.log();
        console.log('FINAL:');
        console.log(row.copyFinal);
        console.log('---');
    });
});
