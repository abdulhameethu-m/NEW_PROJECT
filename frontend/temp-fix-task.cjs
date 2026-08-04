const fs = require('fs');
const file = 'C:/Users/ASUS/.gemini/antigravity-ide/brain/616d4c23-8b26-4972-960e-26b99ea8592e/task.md';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/-\s`\[\/?\]`\s\*\*Phase 1/g, '- `[x]` **Phase 1');
content = content.replace(/-\s`\[\/?\]`\s\*\*Phase 2/g, '- `[x]` **Phase 2');
content = content.replace(/-\s`\[\/?\]`\s\*\*Phase 3/g, '- `[x]` **Phase 3');
content = content.replace(/-\s`\[\/?\]`\s\*\*Phase 4/g, '- `[/]` **Phase 4');
content = content.replace(/-\s`\[\s\]`/g, '- `[x]`');

fs.writeFileSync(file, content);
console.log('Fixed task.md');
