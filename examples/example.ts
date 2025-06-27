// Example TypeScript file with intentional issues for testing
import { readFile, writeFile } from 'fs/promises';
import * as path from 'path';

// This interface is never used (warning)
interface UnusedInterface {
  id: number;
  name: string;
}

// Function with missing return type annotation
export function processFile(filePath: string) {
  return readFile(filePath, 'utf-8');
}

// Function with unused parameter
export async function writeData(fileName: string, data: string, unusedParam: boolean): Promise<void> {
  const fullPath = path.join(process.cwd(), fileName);
  await writeFile(fullPath, data);
}

// Class with proper typing
export class FileProcessor {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async readFile(fileName: string): Promise<string> {
    const fullPath = path.join(this.basePath, fileName);
    return await readFile(fullPath, 'utf-8');
  }

  async writeFile(fileName: string, content: string): Promise<void> {
    const fullPath = path.join(this.basePath, fileName);
    await writeFile(fullPath, content);
  }
}

// Export default with potential issues
export default FileProcessor;
