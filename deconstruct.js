const fs = require("fs");
const path = require("path");

function deconstructFiles(inputPrefix = "combined") {
  // Find all combined files matching the input prefix
  const combinedFiles = fs
    .readdirSync(".")
    .filter((file) => file.startsWith(inputPrefix) && file.endsWith(".txt"))
    .sort();

  if (combinedFiles.length === 0) {
    console.log("No combined files found.");
    return;
  }

  combinedFiles.forEach((combinedFile) => {
    console.log(`Processing ${combinedFile}...`);

    let content;
    try {
      content = fs.readFileSync(combinedFile, "utf8");
    } catch (err) {
      console.error(`Error reading file ${combinedFile}: ${err.message}`);
      return;
    }

    // Split the content into individual file sections
    const files = content.split("---FILE START---").slice(1);
    files.forEach((fileData) => {
      try {
        const [pathLine, fileBody] = fileData.split("---CONTENT START---");
        const filePath = pathLine.split("Path: ")[1].trim();
        const fileContent = fileBody.split("---CONTENT END---")[0].trim();

        // Create the necessary directories and write the file
        const outputPath = path.resolve(filePath);
        const outputDir = path.dirname(outputPath);

        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, fileContent, "utf8");
        console.log(`Restored: ${outputPath}`);
      } catch (err) {
        console.error(`Error processing file: ${err.message}`);
      }
    });
  });
}

// Run the script if executed directly
if (require.main === module) {
  deconstructFiles();
}
