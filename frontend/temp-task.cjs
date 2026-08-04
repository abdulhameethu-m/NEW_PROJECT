const fs = require('fs');
const file = 'C:/Users/ASUS/.gemini/antigravity-ide/brain/616d4c23-8b26-4972-960e-26b99ea8592e/task.md';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '- `[ ]` Implement `react-window` for Admin and Vendor tables.',
  '- `[x]` Implement `react-window` for Admin and Vendor tables.'
);
content = content.replace(
  '- `[ ]` Enforce `<img loading="lazy" decoding="async" />` universally.',
  '- `[x]` Enforce `<img loading="lazy" decoding="async" />` universally.'
);
content = content.replace(
  '- `[/]` **Phase 3: Medium Priority (Frontend)**',
  '- `[x]` **Phase 3: Medium Priority (Frontend)**'
);
content = content.replace(
  '- `[ ]` **Phase 4: Future Optimizations (Architecture)**',
  '- `[/]` **Phase 4: Future Optimizations (Architecture)**'
);

fs.writeFileSync(file, content);
console.log('Task updated');
