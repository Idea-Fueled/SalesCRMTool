const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'sales-crm-client', 'src', 'pages');

const processDirectory = (dir) => {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (file.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            // Regex to match breadcrumbs
            const regex = /(?:\{\/\*(?:.*?breadcrumb.*?|.*?Symmetric Navigation.*?)\*\/}\s*)?<div[^>]*text-\[10px\][^>]*>[\s\S]*?ChevronRight(?:Icon)? size=\{?10\}?[\s\S]*?<\/div>\s*/gi;
            
            if (regex.test(content)) {
                console.log(`Matching breadcrumbs found in ${fullPath}`);
                let newContent = content.replace(regex, '');
                fs.writeFileSync(fullPath, newContent, 'utf8');
            }
        }
    }
};

processDirectory(pagesDir);
console.log('Done.');
