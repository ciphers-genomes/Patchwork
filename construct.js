const fs = require("fs");
const path = require("path");
const readline = require("readline");

async function loadGitignore() {
  // Load patterns from .gitignore
  const gitignorePath = path.resolve(".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    return [];
  }

  const patterns = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(gitignorePath),
    output: process.stdout,
    terminal: false,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      patterns.push(trimmed);
    }
  }

  return patterns;
}

function shouldExclude(filePath, ignorePatterns, excludedExtensions) {
  // Exclude based on .gitignore patterns
  for (const pattern of ignorePatterns) {
    const regex = new RegExp(pattern.replace(/\./g, "\\.").replace(/\*/g, ".*"));
    if (regex.test(filePath)) {
      return true;
    }
  }

  // Exclude based on file extensions
  const ext = path.extname(filePath).toLowerCase();
  if (excludedExtensions.has(ext)) {
    return true;
  }

  return false;
}

async function combineFiles(outputPrefix = "combined", maxSizeMB = 30) {
  const excludedExtensions = new Set([
    ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".svg", // Images
    ".pdf", // PDFs
    ".mp3", ".wav", ".aac", ".flac", ".ogg", // Audio
    ".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv", // Videos
  ]);

  const ignorePatterns = await loadGitignore();

  const fileList = [];
  const traverseDirectory = (dir) => {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        traverseDirectory(fullPath);
      } else {
        fileList.push(fullPath);
      }
    });
  };

  traverseDirectory(".");
  
  const filteredFiles = fileList.filter((file) => {
    const relativePath = path.relative(".", file);
    return !shouldExclude(relativePath, ignorePatterns, excludedExtensions);
  });

  let archiveCount = 1;
  let currentSize = 0;
  let outputFile = null;

  for (const file of filteredFiles) {
    const stats = fs.statSync(file);
    const fileSizeMB = stats.size / (1024 * 1024);

    if (!outputFile || currentSize + fileSizeMB > maxSizeMB) {
      if (outputFile) {
        outputFile.close();
      }

      const outputFileName = `${outputPrefix}_${archiveCount}.txt`;
      outputFile = fs.createWriteStream(outputFileName, { encoding: "utf8" });
      console.log(`Creating combined file: ${outputFileName}`);
      archiveCount++;
      currentSize = 0;
    }

    const relativePath = path.relative(".", file);
    let content = "";

    try {
      content = fs.readFileSync(file, "utf8");
    } catch (err) {
      console.error(`Error reading file ${file}: ${err.message}`);
      continue;
    }

    outputFile.write(`---FILE START---\n`);
    outputFile.write(`Path: ${relativePath}\n`);
    outputFile.write(`---CONTENT START---\n`);
    outputFile.write(content);
    outputFile.write(`\n---CONTENT END---\n`);
    outputFile.write(`---FILE END---\n\n`);

    currentSize += fileSizeMB;
  }

  if (outputFile) {
    outputFile.close();
    console.log("All files have been combined.");
  }
}

combineFiles();
