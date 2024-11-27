const fs = require("fs");
const path = require("path");

// Helper function to read .gitignore and extract patterns
function loadGitignore() {
  const gitignorePath = path.resolve(".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    return [];
  }

  const patterns = fs
    .readFileSync(gitignorePath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#")); // Exclude blank lines and comments
  return patterns;
}

// Function to check if a file should be excluded
function shouldExclude(filePath, ignorePatterns, excludedExtensions) {
  // Exclude files based on .gitignore patterns
  for (const pattern of ignorePatterns) {
    const regex = new RegExp(
      pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") // Convert simple glob patterns to regex
    );
    if (regex.test(filePath)) {
      return true;
    }
  }

  // Exclude files based on extensions
  const ext = path.extname(filePath).toLowerCase();
  if (excludedExtensions.has(ext)) {
    return true;
  }

  return false;
}

// Function to combine files into chunks
async function constructFiles(outputPrefix = "combined", maxSizeMB = 30) {
  const excludedExtensions = new Set([
    ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".svg", // Images
    ".pdf", // PDFs
    ".mp3", ".wav", ".aac", ".flac", ".ogg", // Audio
    ".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv", // Videos
  ]);

  const ignorePatterns = loadGitignore();

  // Find all files in the current directory recursively
  const fileList = [];
  const traverseDirectory = (dir) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    files.forEach((file) => {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        traverseDirectory(fullPath);
      } else {
        fileList.push(fullPath);
      }
    });
  };
  traverseDirectory(".");

  // Filter files based on exclusion rules
  const filteredFiles = fileList.filter((file) =>
    !shouldExclude(path.relative(".", file), ignorePatterns, excludedExtensions)
  );

  // Combine files into output files
  let archiveCount = 1;
  let currentSize = 0;
  let outputFile = null;

  for (const file of filteredFiles) {
    const stats = fs.statSync(file);
    const fileSizeMB = stats.size / (1024 * 1024);

    // Create a new output file if the current one exceeds max size
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

    // Write file metadata and content
    const relativePath = path.relative(".", file);
    try {
      const content = fs.readFileSync(file, "utf8");
      outputFile.write(`---FILE START---\n`);
      outputFile.write(`Path: ${relativePath}\n`);
      outputFile.write(`---CONTENT START---\n`);
      outputFile.write(content);
      outputFile.write(`\n---CONTENT END---\n`);
      outputFile.write(`---FILE END---\n\n`);
    } catch (err) {
      console.error(`Error reading file ${file}: ${err.message}`);
      continue;
    }

    currentSize += fileSizeMB;
  }

  if (outputFile) {
    outputFile.close();
  }
  console.log("All files have been combined.");
}

// Run the function if the script is executed directly
if (require.main === module) {
  const [outputPrefix, maxSizeMB] = process.argv.slice(2);
  constructFiles(outputPrefix || "combined", Number(maxSizeMB) || 30);
}
