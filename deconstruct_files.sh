#!/bin/bash

# Function to deconstruct combined files back into original file structure
deconstruct_files() {
    input_prefix="${1:-combined}" # Default prefix is "combined"
    combined_files=$(ls "${input_prefix}_*.txt" 2>/dev/null)

    if [ -z "$combined_files" ]; then
        echo "No combined files found."
        return
    fi

    for combined_file in $combined_files; do
        echo "Processing $combined_file..."

        # Read the file line by line
        file_content=""
        file_path=""
        in_file=0
        while IFS= read -r line || [ -n "$line" ]; do
            if [[ "$line" == "---FILE START---" ]]; then
                in_file=1
                file_content=""
                file_path=""
            elif [[ "$line" == "---CONTENT START---" ]]; then
                in_file=2
            elif [[ "$line" == "---CONTENT END---" ]]; then
                in_file=1
            elif [[ "$line" == "---FILE END---" ]]; then
                if [ -n "$file_path" ]; then
                    # Ensure the directory exists
                    mkdir -p "$(dirname "$file_path")"

                    # Write the content to the file
                    echo -n "$file_content" > "$file_path"
                    echo "Restored: $file_path"
                fi
                file_content=""
                file_path=""
                in_file=0
            elif [[ $in_file -eq 1 && "$line" == Path:* ]];
