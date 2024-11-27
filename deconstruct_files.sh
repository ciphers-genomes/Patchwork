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

        # Ensure the file contains valid markers
        if ! grep -q "---FILE START---" "$combined_file"; then
            echo "Skipping $combined_file (does not contain valid markers)."
            continue
        fi

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
                    mkdir -p "$(dirname "$file_path")" || {
                        echo "Error creating directory for $file_path."
                        continue
                    }

                    # Write the content incrementally
                    echo -n "$file_content" > "$file_path" || {
                        echo "Error writing to $file_path."
                        continue
                    }

                    echo "Restored: $file_path"
                fi
                file_content=""
                file_path=""
                in_file=0
            elif [[ $in_file -eq 1 && "$line" == Path:* ]]; then
                # Extract file path
                file_path=$(echo "$line" | sed 's/^Path: //')
            elif [[ $in_file -eq 2 ]]; then
                # Collect file content incrementally
                file_content+="$line"$'\n'
            fi
        done < "$combined_file"
    done
}

# Run the function with an optional prefix argument
deconstruct_files "$1"
