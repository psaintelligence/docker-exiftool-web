
import { parseMetadata } from '/index.esm.js';

document.addEventListener('DOMContentLoaded', function () {

    let currentFileExtract = null;
    let modifiedFileData = null;

    // Tab switching
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });

    // Extract Tab Functionality
    setupExtractTab();

    function setupExtractTab() {
        const dropzone = document.getElementById('dropzone-extract');
        const fileInput = document.getElementById('fileInput-extract');
        const selectedFile = document.getElementById('selectedFile-extract');
        const fileName = document.getElementById('fileName-extract');
        const fileSize = document.getElementById('fileSize-extract');
        const removeFile = document.getElementById('removeFile-extract');
        const runExifTool = document.getElementById('runExifTool-extract');
        const resetBtn = document.getElementById('resetBtn-extract');
        const spinner = document.getElementById('spinner-extract');
        const resultContainer = document.getElementById('resultContainer-extract');
        const status = document.getElementById('status-extract');
        const metadataOutput = document.getElementById('metadataOutput-extract');
        const copyBtn = document.getElementById('copyBtn-extract');
        const downloadBtn = document.getElementById('downloadBtn-extract');
        const jsonOutput = document.getElementById('jsonOutput-extract');
        const numericalOutput = document.getElementById('numericalOutput-extract');

        setupFileHandling(dropzone, fileInput, selectedFile, fileName, fileSize, removeFile,
            runExifTool, resetBtn, (file) => { currentFileExtract = file; });

        runExifTool.addEventListener('click', async function () {
            if (!currentFileExtract) return;

            spinner.style.display = 'inline-block';
            runExifTool.disabled = true;

            try {
                const args = [];
                if (jsonOutput.checked) args.push("-json");
                if (numericalOutput.checked) args.push("-n");

                const result = await parseMetadata(currentFileExtract, {
                    args: args,
                    transform: (data) => {
                        return jsonOutput.checked ? JSON.parse(data) : data;
                    }
                });

                if (result.success) {
                    showResults(resultContainer, status, metadataOutput, result.data);
                } else {
                    showError(resultContainer, status, metadataOutput, result.error);
                }
            } catch (error) {
                showError(resultContainer, status, metadataOutput, error.message || 'Failed to extract metadata');
            } finally {
                spinner.style.display = 'none';
                runExifTool.disabled = false;
            }
        });

        copyBtn.addEventListener('click', () => copyToClipboard(metadataOutput, copyBtn));
        downloadBtn.addEventListener('click', () => downloadJSON(metadataOutput, currentFileExtract));
    }

    function setupFileHandling(dropzone, fileInput, selectedFile, fileName, fileSize, removeFile,
        actionBtn, resetBtn, onFileSelect) {
        fileInput.addEventListener('change', function (e) {
            if (fileInput.files.length > 0) {
                handleFileSelection(fileInput.files[0]);
            }
        });

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, function (e) {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        dropzone.addEventListener('dragenter', () => {
            dropzone.style.backgroundColor = 'var(--light-gray)';
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.style.backgroundColor = '';
        });

        dropzone.addEventListener('drop', function (e) {
            dropzone.style.backgroundColor = '';
            if (e.dataTransfer.files.length > 0) {
                handleFileSelection(e.dataTransfer.files[0]);
            }
        });

        dropzone.addEventListener('click', () => {
            fileInput.click();
        });

        function handleFileSelection(file) {
            onFileSelect(file);
            fileName.textContent = file.name;
            fileSize.textContent = formatFileSize(file.size);
            selectedFile.style.display = 'flex';
            dropzone.style.display = 'none';
            actionBtn.disabled = false;
            resetBtn.disabled = false;
        }

        removeFile.addEventListener('click', () => {
            resetUI();
        });

        resetBtn.addEventListener('click', () => {
            resetUI();
        });

        function resetUI() {
            onFileSelect(null);
            fileInput.value = '';
            selectedFile.style.display = 'none';
            dropzone.style.display = 'block';
            actionBtn.disabled = true;
            resetBtn.disabled = true;

            // Reset metadata editor if it exists
            const metadataEditor = document.getElementById('metadataEditor');
            const resultContainer = dropzone.closest('.box').parentElement.querySelector('.result-container');
            if (metadataEditor) {
                metadataEditor.style.display = 'none';
                document.getElementById('metadataFields').innerHTML = '';
            }
            if (resultContainer) {
                resultContainer.style.display = 'none';
            }
        }
    }

    function addMetadataField(container, tag = '', value = '') {
        const field = document.createElement('div');
        field.className = 'metadata-field';
        field.innerHTML = `
            <input type="text" placeholder="Tag name" value="${tag}">
            <input type="text" placeholder="Value" value="${value}">
            <button type="button">×</button>
        `;

        field.querySelector('button').addEventListener('click', () => {
            field.remove();
        });

        container.appendChild(field);

        // Focus the first empty input
        const inputs = field.querySelectorAll('input');
        if (!tag) inputs[0].focus();
        else if (!value) inputs[1].focus();
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function showResults(resultContainer, status, metadataOutput, data) {
        resultContainer.style.display = 'block';
        status.className = 'status-message';
        status.style.display = 'block';
        status.textContent = 'Metadata extracted successfully!';

        const output = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        metadataOutput.textContent = output;
    }

    function showError(resultContainer, status, metadataOutput, message) {
        resultContainer.style.display = 'block';
        status.className = 'status-message status-error';
        status.style.display = 'block';
        status.textContent = message || 'An error occurred';
        if (metadataOutput) {
            metadataOutput.textContent = 'Failed to process file.';
        }
    }

    function showWriteSuccess(resultContainer, status, downloadContainer) {
        resultContainer.style.display = 'block';
        status.className = 'status-message';
        status.style.display = 'block';
        status.textContent = 'Metadata written successfully!';
        downloadContainer.style.display = 'block';
    }

    function copyToClipboard(metadataOutput, copyBtn) {
        navigator.clipboard.writeText(metadataOutput.textContent)
            .then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = 'Copy';
                }, 2000);
            });
    }

    function downloadJSON(metadataOutput, currentFile) {
        const blob = new Blob([metadataOutput.textContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentFile.name}-metadata.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});
