document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const folderInput = document.getElementById('folderInput');
    const patternsTextarea = document.getElementById('patternsTextarea');
    const generateBtn = document.getElementById('generateBtn');
    const outputCode = document.getElementById('output');
    const copyBtn = document.getElementById('copyBtn');
    const modeSwitchBtn = document.getElementById('modeSwitchBtn');
    const configTitle = document.getElementById('configTitle');
    const configDescription = document.getElementById('configDescription');

    // --- State Management ---
    let currentMode = 'ignore'; // 'ignore' or 'include'

    // --- Default Patterns ---
    const defaultIgnorePatterns = [
        // Git, IDEs, Build outputs, Dependencies etc.
        '.git/', '.idea/', '.vscode/', '.DS_Store', 'build/', 'dist/', 'out/',
        'node_modules/', 'vendor/', 'Pods/', 'package-lock.json', 'yarn.lock',
        '.gradle/', 'gradle/', 'gradlew', 'gradlew.bat', 'local.properties',
        // Common binary file extensions
        '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.pdf',
        '.zip', '.jar', '.exe', '.dll', '.ttf', '.woff', '.woff2',
    ].join('\n');
    
    const includeModeDescription = `List the specific files or folders you want to include (one per line).
    <strong>Example File:</strong> <code>app/src/main/java/com/example/myproject/File1.kt</code>
    <strong>Example Folder:</strong> <code>app/src/main/res/color/</code> (includes all files in this folder)`;
    
    const ignoreModeDescription = 'Add file or folder patterns to ignore (one per line). Similar to a <code>.gitignore</code> file.';

    // --- UI Update Function ---
    const updateUIMode = () => {
        if (currentMode === 'ignore') {
            configTitle.textContent = '2. Configure Ignore Patterns';
            configDescription.innerHTML = ignoreModeDescription;
            patternsTextarea.value = defaultIgnorePatterns;
            patternsTextarea.placeholder = 'e.g., build/ or .DS_Store';
        } else { // 'include' mode
            configTitle.textContent = '2. Scan Only Listed Files/Folders';
            configDescription.innerHTML = includeModeDescription;
            patternsTextarea.value = '';
            patternsTextarea.placeholder = 'app/src/main/java/com/example/myproject/File1.kt\napp/src/main/res/values/';
        }
    };

    // --- Event Listeners ---
    modeSwitchBtn.addEventListener('click', () => {
        currentMode = currentMode === 'ignore' ? 'include' : 'ignore';
        updateUIMode();
    });

    generateBtn.addEventListener('click', async () => {
        const files = folderInput.files;
        if (files.length === 0) {
            outputCode.textContent = 'Error: Please select a folder first.';
            return;
        }

        outputCode.textContent = 'Processing files...';
        
        // This is the project's root directory name (e.g., "my-android-project")
        const rootDirName = files[0].webkitRelativePath.split('/')[0];
        const patterns = patternsTextarea.value.split('\n').filter(p => p.trim() !== '');

        let finalPrompt = '';
        const filePromises = [];

        for (const file of files) {
            // Full path including root, e.g., "my-project/src/index.js"
            const fullPath = file.webkitRelativePath; 
            // Path relative to root, e.g., "src/index.js"
            const relativePath = fullPath.substring(rootDirName.length + 1);

            let shouldProcess = false;

            // --- CORE LOGIC: Check if the file should be processed based on the mode ---
            if (currentMode === 'ignore') {
                const isIgnored = patterns.some(pattern => {
                    // If pattern is a directory (ends with /), check if path starts with it
                    if (pattern.endsWith('/')) return relativePath.startsWith(pattern);
                    // Otherwise, check if path ends with the pattern (for files like .DS_Store)
                    return relativePath.endsWith(pattern);
                });
                if (!isIgnored) {
                    shouldProcess = true;
                }
            } else { // 'include' mode
                const isIncluded = patterns.some(pattern => {
                    // If pattern is a directory (ends with /), check if the file is inside it
                    if (pattern.endsWith('/')) return relativePath.startsWith(pattern);
                    // Otherwise, it's a file, check for an exact match
                    return relativePath === pattern;
                });
                if (isIncluded) {
                    shouldProcess = true;
                }
            }

            if (!shouldProcess) {
                console.log(`Skipping: ${fullPath}`);
                continue;
            }
            
            // --- File Reading (same as before) ---
            const promise = new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result;
                    if (content.includes('\0')) { // Basic binary file check
                        console.log(`Ignoring binary file: ${fullPath}`);
                        resolve(''); 
                        return;
                    }
                    // We use the fullPath for the header to be clear
                    const fileBlock = `\n\nFile: ${fullPath}\n\n\`\`\`\n${content}\n\`\`\``;
                    resolve(fileBlock);
                };
                reader.onerror = () => {
                    console.error(`Error reading file: ${fullPath}`);
                    resolve('');
                };
                reader.readAsText(file);
            });
            filePromises.push(promise);
        }

        const allFileBlocks = await Promise.all(filePromises);
        finalPrompt = allFileBlocks.join('').trim();
        outputCode.textContent = finalPrompt || 'No files found matching your criteria.';
    });

    copyBtn.addEventListener('click', () => {
        if (navigator.clipboard && outputCode.textContent) {
            navigator.clipboard.writeText(outputCode.textContent)
                .then(() => {
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => { copyBtn.textContent = 'Copy to Clipboard'; }, 2000);
                });
        }
    });

    // --- Initialize UI ---
    updateUIMode();
});