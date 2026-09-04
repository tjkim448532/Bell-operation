const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('route.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('src/app/api');
let changedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // 1. Fix missing status on !res.ok 
    // pattern: return NextResponse.json({ success: false, error: Backend returned : , data: null });
    content = content.replace(
        /return NextResponse\.json\(\{\s*success:\s*false,\s*error:\s*([^,]+),\s*data:\s*([^}]+)\}\);/g,
        'return NextResponse.json({ success: false, error:  }, { status: res.status });'
    );
    // same but with backticks for error
    content = content.replace(
        /return NextResponse\.json\(\{\s*success:\s*false,\s*error:\s*Backend returned \$\{res\.status\}([^]+),\s*data:\s*([^}]+)\}\);/g,
        'return NextResponse.json({ success: false, error: Backend returned  }, { status: res.status });'
    );
    // same but general without status
    content = content.replace(
        /return NextResponse\.json\(\{\s*success:\s*false,\s*error:\s*Backend returned \$\{res\.status\},\s*data:\s*\{[^\}]+\}\s*\}\);/g,
        'return NextResponse.json({ success: false, error: Backend returned  }, { status: res.status });'
    );

    // 2. Fix status 500 blocks that have dummy data
    // pattern: return NextResponse.json({ success: false, error: error.message || '서버 오류가 발생했습니다.', data: null }, { status: 500 });
    content = content.replace(
        /,\s*data:\s*(null|\{\s*summary:\s*\{\},\s*categories:\s*\[\]\s*\}|\{\s*summary:\s*\{\},\s*segments:\s*\[\]\s*\})/g,
        ''
    );

    // 3. One more check for room-channel-sales which has data: { summary: {}, segments: [] }
    content = content.replace(
        /return NextResponse\.json\(\{\s*success:\s*false,\s*error:\s*([^,]+),\s*data:\s*\{\s*summary:\s*\{\},\s*segments:\s*\[\]\s*\}\s*\}\);/g,
        'return NextResponse.json({ success: false, error:  }, { status: res.status });'
    );
    
    // Catch-all for data: null in error responses that might lack status
    content = content.replace(
        /return NextResponse\.json\(\{\s*success:\s*false,\s*error:\s*([^,]+)\s*\}\);/g,
        'return NextResponse.json({ success: false, error:  }, { status: 500 });'
    );

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed:', file);
        changedFiles++;
    }
});

console.log('Total fixed files:', changedFiles);
