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
    content = content.replace(/error: Backend Error \}/g, "error: 'Backend Error' }");
    fs.writeFileSync(file, content, 'utf8');
});
