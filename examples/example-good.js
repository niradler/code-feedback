// Example JavaScript file without syntax errors but with linting issues
const fs = require('fs').promises;
const path = require('path');

// Function with linting issues but valid syntax
function processData(data, options) {
  var result = [];  // Should use const/let instead of var
  
  for (var i = 0; i < data.length; i++) {  // Should use const/let instead of var
    if (data[i]) {
      result.push(data[i].toString());
    }
  }
  
  return result;
}

// Async function with proper error handling
async function readAndProcess(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    return processData(lines, {});
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
}

// Class example
class DataProcessor {
  constructor(basePath) {
    this.basePath = basePath;
  }
  
  async processFile(fileName) {
    const fullPath = path.join(this.basePath, fileName);
    return await readAndProcess(fullPath);
  }
}

module.exports = {
  processData,
  readAndProcess,
  DataProcessor
};
