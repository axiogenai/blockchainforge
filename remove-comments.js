const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, 'src', 'lib', 'templates');
const files = ['app.ts', 'modules.ts', 'proto.ts'];

for (const file of files) {
  const filePath = path.join(templatesDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove lines that are just comments (e.g. "// Some comment" or "  // Some comment")
    // We make sure not to remove lines with actual code and a trailing comment, 
    // but the prompt is mostly about standalone comment lines.
    content = content.replace(/^\s*\/\/.*$/gm, '');
    
    // Remove multiple consecutive blank lines that might result from deleting comments
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Cleaned comments from ${file}`);
  }
}
