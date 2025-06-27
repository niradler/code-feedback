// Example JavaScript file with intentional issues
const fs = require('fs').promises;
const path = require('path');

// Function with syntax error (missing closing brace)  
function badFunction() {
  console.log('This function has issues');
  // Missing closing brace - will cause syntax error

// Function with no issues
async function goodFunction(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
}

// Unused variable
const unusedVariable = 'This variable is never used';

// Export
module.exports = {
  goodFunction,
  badFunction
};
