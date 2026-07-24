const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '../../../frontend');
const frontendDistDir = path.join(frontendDir, 'dist');
const backendPublicDir = path.join(__dirname, '../../public');

try {
  console.log('1. Building frontend...');
  // Run npm run build in the frontend directory
  execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });

  console.log('\n2. Cleaning old public directory...');
  if (fs.existsSync(backendPublicDir)) {
    fs.rmSync(backendPublicDir, { recursive: true, force: true });
  }
  fs.mkdirSync(backendPublicDir, { recursive: true });

  console.log('\n3. Copying new build to backend public folder...');
  if (fs.cpSync) {
    fs.cpSync(frontendDistDir, backendPublicDir, { recursive: true });
  } else {
    // Fallback for older Node versions if needed (though cpSync is Node 16.7+)
    execSync(`xcopy /E /I /Y "${frontendDistDir}" "${backendPublicDir}"`);
  }

  console.log('\n✅ Frontend successfully built and copied to backend/public!');
} catch (error) {
  console.error('\n❌ Error during frontend build/copy process:', error.message);
  process.exit(1);
}
