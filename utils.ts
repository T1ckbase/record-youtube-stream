import { join } from '@std/path';
import { exists } from '@std/fs';

export async function getDirectoryStructureString(
  dirPath: string,
  indent: string = '',
  maxDepth?: number,
  currentDepth: number = 0,
): Promise<string> {
  let structureString = ''; // Initialize the string to build

  // Stop if maxDepth is defined and reached
  if (maxDepth !== undefined && currentDepth > maxDepth) {
    return ''; // Return empty string if max depth exceeded
  }

  try {
    const entries = [];
    for await (const entry of Deno.readDir(dirPath)) {
      entries.push(entry);
    }

    // Sort entries alphabetically, directories first
    entries.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const isLast = i === entries.length - 1;
      const marker = isLast ? '└── ' : '├── ';
      const entryPath = join(dirPath, entry.name);

      // Append the current entry line to the string
      structureString += `${indent}${marker}${entry.name}${entry.isDirectory ? '/' : ''}\n`; // Add newline

      if (entry.isDirectory) {
        const nextIndent = indent + (isLast ? '    ' : '│   ');
        // Await the recursive call and append its result string
        const subStructure = await getDirectoryStructureString(entryPath, nextIndent, maxDepth, currentDepth + 1);
        structureString += subStructure;
      }
    }
  } catch (error) {
    // Append error messages to the string instead of logging them directly
    if (error instanceof Deno.errors.PermissionDenied) {
      structureString += `${indent}└── [Permission Denied for ${dirPath}]\n`;
    } else if (error instanceof Deno.errors.NotFound) {
      structureString += `${indent}└── [Directory Not Found: ${dirPath}]\n`;
    } else {
      // Append a generic error message; you might still want to log the full error separately
      structureString += `${indent}└── [Error reading ${dirPath}]\n`;
      console.error(`Error details during structure generation for ${dirPath}:`, error); // Optionally log full error
    }
  }
  return structureString; // Return the accumulated string
}

export async function getFilesInDirectory(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(dirPath)) {
    if (entry.isFile) {
      files.push(entry.name);
    }
  }
  return files;
}

export async function cleanDirectory(directoryPath: string) {
  if (await exists(directoryPath, { isDirectory: true })) {
    console.info(`Cleaning up ${directoryPath}...`);
    for await (const entry of Deno.readDir(directoryPath)) {
      try {
        await Deno.remove(`${directoryPath}/${entry.name}`, { recursive: true });
      } catch (e) {
        console.error(`Failed to remove ${directoryPath}/${entry.name}:`, e);
      }
    }
  } else {
    // console.info(`${directoryPath} does not exist, skipping cleanup.`);
  }
}
