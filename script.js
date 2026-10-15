```javascript
const imageInput = document.getElementById("imageInput");
const previewGrid = document.getElementById("previewGrid");
const fileInfo = document.getElementById("fileInfo");
const status = document.getElementById("status");

const pdfBtn = document.getElementById("pdfBtn");
const convertBtn = document.getElementById("convertBtn");
const compressBtn = document.getElementById("compressBtn");
const clearBtn = document.getElementById("clearBtn");

const formatSelect = document.getElementById("format");
const qualitySelect = document.getElementById("quality");

let selectedFiles = [];
let previewURLs = [];

document.getElementById("year").textContent =
    new Date().getFullYear();

function showStatus(message) {
    status.textContent = message;
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + " KB";
    }
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function clearPreviews() {
    previewURLs.forEach(function (url) {
        URL.revokeObjectURL(url);
    });

    previewURLs = [];
    previewGrid.innerHTML = "";
}

function renderPreviews() {
    clearPreviews();

    const totalSize = selectedFiles.reduce(function (total, file) {
        return total + file.size;
    }, 0);

    fileInfo.textContent = selectedFiles.length
        ? selectedFiles.length + " photo(s) selected • " +
          formatBytes(totalSize)
        : "No photos selected";

    selectedFiles.forEach(function (file, index) {
        const url = URL.createObjectURL(file);
        previewURLs.push(url);

        const item = document.createElement("div");
        item.className = "preview-item";

        const img = document.createElement("img");
        img.src = url;
        img.alt = file.name;

        const name = document.createElement("p");
        name.textContent = (index + 1) + ". " + file.name;

        item.appendChild(img);
        item.appendChild(name);
        previewGrid.appendChild(item);
    });
}

imageInput.addEventListener("change", function () {
    const newFiles = Array.from(imageInput.files || []).filter(
        function (file) {
            return file.type.startsWith("image/");
        }
    );

    selectedFiles = newFiles;
    renderPreviews();

    showStatus(
        selectedFiles.length
            ? selectedFiles.length + " photos ready."
            : "Please select image files."
    );
});

clearBtn.addEventListener("click", function () {
    selectedFiles = [];
    imageInput.value = "";
    renderPreviews();
    showStatus("All photos cleared.");
});

function readFile(file) {
    return new Promise(function (resolve, reject) {
        const reader = new FileReader();

        reader.onload = function () {
            resolve(reader.result);
        };

        reader.onerror = function () {
            reject(new Error("Could not read image."));
        };

        reader.readAsDataURL(file);
    });
}

function loadImage(source) {
    return new Promise(function (resolve, reject) {
        const image = new Image();

        image.onload = function () {
            resolve(image);
        };

        image.onerror = function () {
            reject(new Error("Could not load image."));
        };

        image.src = source;
    });
}

async function createImageData(file, outputType, imageQuality) {
    const source = await readFile(file);
    const image = await loadImage(source);

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext("2d");

    if (outputType === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.drawImage(image, 0, 0);

    return canvas.toDataURL(outputType, imageQuality);
}

function downloadFile(dataURL, filename) {
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();
}

// Convert the first selected photo
convertBtn.addEventListener("click", async function () {
    if (!selectedFiles.length) {
        showStatus("Please select a photo first.");
        return;
    }

    convertBtn.disabled = true;

    try {
        const mimeType = formatSelect.value;
        const extension = mimeType === "image/png" ? "png" : "jpg";

        const result = await createImageData(
            selectedFiles[0],
            mimeType,
            0.95
        );

        downloadFile(result, "PixelTools-Converted." + extension);
        showStatus("Converted image downloaded.");
    } catch (error) {
        console.error(error);
        showStatus("Conversion failed. Try another image.");
    } finally {
        convertBtn.disabled = false;
    }
});

// Compress the first selected photo
compressBtn.addEventListener("click", async function () {
    if (!selectedFiles.length) {
        showStatus("Please select a photo first.");
        return;
    }

    compressBtn.disabled = true;

    try {
        const imageQuality = Number(qualitySelect.value);

        const result = await createImageData(
            selectedFiles[0],
            "image/jpeg",
            imageQuality
        );

        downloadFile(result, "PixelTools-Compressed.jpg");
        showStatus("Compressed image downloaded.");
    } catch (error) {
        console.error(error);
        showStatus("Compression failed. Try another image.");
    } finally {
        compressBtn.disabled = false;
    }
});

// Convert ALL selected photos into one PDF
pdfBtn.addEventListener("click", async function () {
    if (!selectedFiles.length) {
        showStatus("Please select one or more photos first.");
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        showStatus("PDF library failed to load. Check your internet.");
        return;
    }

    pdfBtn.disabled = true;

    try {
        const jsPDF = window.jspdf.jsPDF;
        const pdf = new jsPDF("p", "mm", "a4");

        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 10;

        for (let i = 0; i < selectedFiles.length; i++) {
            showStatus(
                "Creating PDF: photo " +
                (i + 1) + " of " + selectedFiles.length
            );

            const jpegData = await createImageData(
                selectedFiles[i],
                "image/jpeg",
                0.95
            );

            const image = await loadImage(jpegData);

            if (i > 0) {
                pdf.addPage("a4", "portrait");
            }

            const scale = Math.min(
                (pageWidth - margin * 2) / image.naturalWidth,
                (pageHeight - margin * 2) / image.naturalHeight
            );

            const width = image.naturalWidth * scale;
            const height = image.naturalHeight * scale;

            const x = (pageWidth - width) / 2;
            const y = (pageHeight - height) / 2;

            pdf.addImage(
                jpegData,
                "JPEG",
                x,
                y,
                width,
                height
            );
        }

        pdf.save("PixelTools-Multiple-Photos.pdf");

        showStatus(
            "Success! " + selectedFiles.length +
            " photos saved in one PDF."
        );
    } catch (error) {
        console.error(error);
        showStatus("PDF creation failed. Refresh and try again.");
    } finally {
        pdfBtn.disabled = false;
    }
});
```
