const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');

async function main() {
  const project = new Project();
  
  console.log("Reading lint-results.json...");
  const rawData = fs.readFileSync('lint-results.json', 'utf8').replace(/^\uFEFF/, '');
  const results = JSON.parse(rawData);

  let totalRemoved = 0;

  for (const result of results) {
    if (result.errorCount > 0 || result.warningCount > 0) {
      console.log(`Processing file: ${result.filePath}`);
      const sourceFile = project.addSourceFileAtPath(result.filePath);
      let modified = false;

      for (const msg of result.messages) {
        if (msg.ruleId === 'no-unused-vars' || msg.ruleId === 'unused-imports/no-unused-vars') {
          const match = msg.message.match(/'([^']+)'/);
          if (match && match[1]) {
            const varName = match[1];
            
            // 1. Root functions
            const funcDecl = sourceFile.getFunction(varName);
            if (funcDecl) {
              funcDecl.remove();
              modified = true;
              totalRemoved++;
              continue;
            }

            // 2. All nested variable declarations
            const allVarDecls = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
            const targetVarDecl = allVarDecls.find(v => v.getName() === varName);
            if (targetVarDecl) {
              const statement = targetVarDecl.getVariableStatement();
              if (statement) {
                statement.remove();
                modified = true;
                totalRemoved++;
                continue;
              }
            }

            // 3. All nested functions
            const allFuncDecls = sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration);
            const targetFuncDecl = allFuncDecls.find(f => f.getName() === varName);
            if (targetFuncDecl) {
                targetFuncDecl.remove();
                modified = true;
                totalRemoved++;
                continue;
            }
          }
        }
      }
      
      if (modified) {
        sourceFile.saveSync();
      }
    }
  }
  
  console.log(`\nCleanup pass 2 complete! Total unused removed: ${totalRemoved}`);
}

main().catch(console.error);
