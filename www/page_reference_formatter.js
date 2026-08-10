// Function to format page references from padded strings to concise chapter.verse format
function formatPageReference(paddedString, chapterNum) {
    // Remove the first digit (book identifier)
    const versePart = paddedString.slice(1);
    // Parse the verse number and add 1 (since padded starts from 000000 for verse 1)
    const verseNum = parseInt(versePart) + 1;
    // Return formatted string as chapter.verse
    return chapterNum + "." + verseNum;
}

// Function to replace all padded page references in the given text
function replacePageReferences(text, chapterNum) {
    // Regex to match 7-digit strings starting with 1 (assuming format like 1000000)
    const regex = /1\d{6}/g;
    return text.replace(regex, (match) => formatPageReference(match, chapterNum));
}

// Example usage:
// console.log(formatPageReference("1000000", 1)); // Outputs: "1.1"
// console.log(formatPageReference("1000001", 1)); // Outputs: "1.2"
// console.log(formatPageReference("1000002", 1)); // Outputs: "1.3"
// console.log(formatPageReference("1000010", 1)); // Outputs: "1.11"

// To replace in text:
// const originalText = "ଯାତ୍ରା ପୁସ୍ତକ - Chapter 1\n1000000text1000001text";
// const formattedText = replacePageReferences(originalText, 1);
// console.log(formattedText); // Replaces 1000000 with 1.1, 1000001 with 1.2, etc.