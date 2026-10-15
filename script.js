
"use strict";

const imageInput = document.getElementById("imageInput");
const browseBtn = document.getElementById("browseBtn");
const dropZone = document.getElementById("dropZone");
const editor = document.getElementById("editor");
const previewImage = document.getElementById("previewImage");
const fileName = document.getElementById("fileName");
const fileInfo = document.getElementById("fileInfo");
const quality = document.getElementById("quality");
const qualityValue = document.getElementById("qualityValue");
const formatSelect = document.getElementById("format");
const compressBtn = document.getElementById("compressBtn");
const convertBtn = document.getElementById("convertBtn");
const pdfBtn = document.getElementById("pdfBtn");
const removeBtn = document.getElementById("removeBtn");
const statusBox = document.getElementById("status");
const toast = document.getElementById("toast");

let selectedFile = null;
let previewUrl = null;
let toastTimer = null;

document.getElementById("year").textContent = new Date().getFullYear();

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + " KB";
  }
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function setStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.style.color = isError ? "#ffabb8" : "#b6f1d1";
}

function setBusy(isBusy) {
  [compressBtn, convertBtn, pdfBtn].forEach(button => {
    button.disabled = isBusy;
    button.style.opacity = isBusy ? "0.6" : "1";
  });
}

function loadImage(file) {
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Please select a valid image file.");
    return;
  }

  if (file.size > 30 * 1024 * 1024) {
    showToast("Image is too large. Please choose an image under 30 MB.");
    return;
  }

  if (previewUrl) URL.revokeObjectURL(previewUrl);

  selectedFile = file;
  previewUrl = URL.createObjectURL(file);

  previewImage.src = previewUrl;
  fileName.textContent = file.name;
  fileInfo.textContent = formatBytes(file.size);
  editor.hidden = false;
  dropZone.hidden = true;
  setStatus("Image ready. Choose an operation below.");
  showToast("Image loaded successfully.");
}

function clearImage() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);

  selectedFile = null;
  previewUrl = null;
  imageInput.value = "";
  previewImage.removeAttribute("src");
  editor.hidden = true;
  dropZone.hidden = false;
  setStatus("");
}

browseBtn.addEventListener("click", () => imageInput.click());

imageInput.addEventListener("change", event => {
  loadImage(event.target.files[0]);
});

removeBtn.addEventListener("click", clearImage);

quality.addEventListener("input", () => {
  qualityValue.textContent = quality.value + "%";
});

["dragenter", "dragover"].forEach(eventName => {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach(eventName => {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
  });
});

dropZone.addEventListener("drop", event => {
  const file = event.dataTransfer.files[0];
  loadImage(file);
});

document.querySelectorAll("[data-tool]").forEach(button => {
  button.addEventListener("click", () => {
    document.getElementById("workspace").scrollIntoView({
      behavior: "smooth"
    });

    if (!selectedFile) {
      showToast("Upload an image to get started.");
      imageInput.click();
      return;
    }

    const tool = button.dataset.tool;

    if (tool === "compress") compressBtn.click();
    if (tool === "convert") convertBtn.click();
    if (tool === "pdf") pdfBtn.click();
  });
});

function readSelectedImage() {
  return new Promise((resolve, reject) => {
    if (!selectedFile) {
      reject(new Error("Please upload an image first."));
      return;
    }

    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(
      new Error("This image could not be opened. Try another image.")
    );

    image.src = previewUrl;
  });
}

function canvasToBlob(canvas, mimeType, qualityValue) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error("Could not process this image format."));
        return;
      }
      resolve(blob);
    }, mimeType, qualityValue);
  });
}

async function createImageBlob() {
  const image = await readSelectedImage();
  const mimeType = formatSelect.value;

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Your browser cannot process this image.");
  }

  // JPG does not support transparency, so use a white background.
  if (mimeType === "image/jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.drawImage(image, 0, 0);

  const qualityNumber = Number(quality.value) / 100;
  const blob = await canvasToBlob(
    canvas,
    mimeType,
    qualityNumber
  );

  // Some browsers may not support the requested output type.
  if (blob.type !== mimeType) {
    throw new Error("This browser does not support that output format. Try JPG or PNG.");
  }

  return blob;
}

function extensionFor(mimeType) {
  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };

  return extensions[mimeType] || "img";
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function outputName(suffix, extension) {
  const originalName = selectedFile.name.replace(/\.[^.]+$/, "");
  return `${originalName}-${suffix}.${extension}`;
}

async function processImage(mode) {
  if (!selectedFile) {
    showToast("Please upload an image first.");
    return;
  }

  setBusy(true);
  setStatus("Processing your image...");

  try {
    const originalSize = selectedFile.size;
    const blob = await createImageBlob();
    const extension = extensionFor(blob.type);
    const suffix = mode === "compress" ? "compressed" : "converted";

    downloadBlob(blob, outputName(suffix, extension));

    if (mode === "compress") {
      const difference = originalSize - blob.size;

      if (difference > 0) {
        const percent = (difference / originalSize * 100).toFixed(1);
        setStatus(
          `Done! Original: ${formatBytes(originalSize)}. ` +
          `New file: ${formatBytes(blob.size)}. ` +
          `Size reduced by ${percent}%.`
        );
      } else {
        setStatus(
          `Done! New file: ${formatBytes(blob.size)}. ` +
          "This format and quality did not reduce the file size."
        );
      }
    } else {
      setStatus(`Converted successfully. Output size: ${formatBytes(blob.size)}.`);
    }

    showToast("Your download is ready.");
  } catch (error) {
    setStatus(error.message || "Something went wrong.", true);
    showToast(error.message || "Image processing failed.");
  } finally {
    setBusy(false);
  }
}

compressBtn.addEventListener("click", () => processImage("compress"));
convertBtn.addEventListener("click", () => processImage("convert"));

pdfBtn.addEventListener("click", async () => {
  if (!selectedFile) {
    showToast("Please upload an image first.");
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    setStatus("PDF library did not load. Check your internet connection and refresh.", true);
    return;
  }

  setBusy(true);
  setStatus("Creating your PDF...");

  try {
    const image = await readSelectedImage();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext("2d");

    if (!context) throw new Error("Cannot process this image.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);

    const imageData = canvas.toDataURL("image/jpeg", 0.95);
    const landscape = image.naturalWidth > image.naturalHeight;

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: landscape ? "landscape" : "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;

    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;

    const scale = Math.min(
      maxWidth / image.naturalWidth,
      maxHeight / image.naturalHeight
    );

    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const x = (pageWidth - width) / 2;
    const y = (pageHeight - height) / 2;

    pdf.addImage(imageData, "JPEG", x, y, width, height);
    const originalName = selectedFile.name.replace(/\.[^.]+$/, "");

    pdf.save(`${originalName}.pdf`);
    setStatus("PDF created successfully and downloaded.");
    showToast("Your PDF is ready.");
  } catch (error) {
    setStatus(error.message || "Could not create the PDF.", true);
    showToast(error.message || "PDF creation failed.");
  } finally {
    setBusy(false);
  }
});
