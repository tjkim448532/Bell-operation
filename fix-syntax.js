const fs = require('fs');
const path = require('path');

const files = [
    'src/app/api/business-plan/route.ts',
    'src/app/api/monthly-trends/route.ts',
    'src/app/api/organization/route.ts',
    'src/app/api/room-channel-sales/route.ts',
    'src/app/api/settings/leisure-teams/route.ts',
    'src/app/api/team-expenses/route.ts',
    'src/app/api/team-report/route.ts',
    'src/app/api/venue-analytics/route.ts'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    // Fix syntax errors caused by previous regex
    content = content.replace(/error:\s*\}\s*,\s*\{\s*status:/g, 'error: Backend Error }, { status:');
    
    // specifically for room-channel-sales: error:  }, { status: 500 });
    content = content.replace(/error:\s*\}\s*,\s*\{\s*status:\s*500\s*\}/g, "error: Backend Error }, { status: 500 }");
    
    fs.writeFileSync(file, content, 'utf8');
});
