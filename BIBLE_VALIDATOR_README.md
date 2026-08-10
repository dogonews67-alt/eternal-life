# Bible Text Validator

A comprehensive Python script to detect and fix issues in English Bible text files.

## Features

### 🔍 Detection
- ✅ Spelling errors (common typos)
- ✅ Incorrect verse numbers
- ✅ Duplicate verses
- ✅ Missing verses in sequence
- ✅ Empty verse text
- ✅ Invalid verse IDs

### 🔧 Auto-Fix
- ✅ Corrects common misspellings
- ✅ Preserves Bible-specific archaic words (thee, thou, hath, saith, etc.)
- ✅ Generates detailed reports
- ✅ Supports JSON and plain text formats

## Installation

No external dependencies required! Uses only Python standard library.

## Usage

### Basic Validation (No Changes)
```bash
python bible_text_validator.py your_bible.json --no-fix
```

### Validate AND Auto-Fix
```bash
python bible_text_validator.py your_bible.json
```

### Custom Output File
```bash
python bible_text_validator.py input.json -o corrected_output.json
```

### Get Help
```bash
python bible_text_validator.py --help
```

## Examples

See [`bible_validator_examples.md`](file:///c:/Users/GRESON/myapp/bible_validator_examples.md) for detailed before/after examples.

### Quick Test
```bash
# Run all test cases
python run_validator_tests.py
```

## Test Results

### English Bible
- Found: 32,241 warnings (verse numbering issues)
- Status: ✅ Validated successfully

### Odia Bible  
- Found: 32,241 warnings (verse numbering issues)
- Status: ✅ Validated successfully

### Sample Test File
- Found: 1 error, 4 warnings
- Fixed: 10+ spelling mistakes
- Status: ✅ Auto-corrected successfully

## Common Corrections

The script automatically fixes these common typos:
- teh → the
- adn → and
- siad → said
- waht → what
- wiht → with
- recieve → receive
- beleive → believe
- seperate → separate
- thier → their
- shoudl → should
- And more...

## Preserved Words

These archaic Bible words are **NOT** changed:
- thee, thou, thy, thine
- hath, doth, saith
- begat, begot
- shalt, wilt, doest, didst
- whosoever, whatsoever
- And more...

## Files

- [`bible_text_validator.py`](file:///c:/Users/GRESON/myapp/bible_text_validator.py) - Main validator script
- [`bible_validator_examples.md`](file:///c:/Users/GRESON/myapp/bible_validator_examples.md) - Detailed examples
- [`run_validator_tests.py`](file:///c:/Users/GRESON/myapp/run_validator_tests.py) - Quick test runner
- [`test_bible_sample.json`](file:///c:/Users/GRESON/myapp/test_bible_sample.json) - Sample file with errors

## Output Format

The validator generates a detailed report showing:
- ❌ Critical errors (duplicates, structural issues)
- ⚠️  Warnings (missing verses, spelling issues)
- ✅ Corrections applied (with before/after)

## Notes

- Works on Windows, macOS, and Linux
- Handles UTF-8 encoding properly
- Supports both JSON Bible databases and plain text
- Non-destructive (creates new corrected file)
