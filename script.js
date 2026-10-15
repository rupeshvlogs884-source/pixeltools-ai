```javascript
/* =========================================
   PIXELTOOLS AI - COMPLETE JAVASCRIPT
========================================= */

"use strict";

const $ = (id) => document.getElementById(id);

const tools = {
  convert: {
    title: "Image Converter",
    description: "Convert images into PNG, JPG or WEBP.",
    accept: "image/*",
    mode: "image"
  },
  compress: {
    title: "Image Compressor",
    description: "Reduce image file size by adjusting quality.",
    accept: "image/*",
    mode: "image"
  },
  resize: {
    title: "Image Resizer",
    description: "Resize images using custom width and height.",
    accept: "image/*",
    mode: "image"
  },
  crop: {
    title: "Image Cropper",
    description: "Crop images using a selected aspect ratio.",
    accept: "image/*",
    mode: "image"
  },
  rotate: {
    title: "Rotate Image",
    description: "Rotate images by 90, 180 or 270 degrees.",
    accept: "image/*",
    mode: "image"
  },
  flip: {
    title: "Flip Image",
    description: "Flip images horizontally or vertically.",
    accept: "image/*",
    mode: "image"
  },
  pdf: {
    title: "Images to PDF",
    description: "Combine uploaded images into one PDF file.",
    accept: "image/*",
    mode: "image"
  },
  merge: {
    title: "Merge PDFs",
    description: "Combine multiple PDF documents into one.",
    accept: ".pdf,application/pdf",
    mode: "pdf"
  },
  split: {
    title: "Split PDF",
    description: "Extract selected pages into a new PDF.",
    accept: ".pdf,application/pdf",
    mode: "pdf"
  },
  png: {
    title: "PNG Converter",
    description: "Convert images into PNG format.",
    accept: "image/*",
    mode: "image",
    format: "image/png"
  },
  jpg: {
    title: "JPG Converter",
    description: "Convert images into JPG format.",
    accept: "image/*",
    mode: "image",
    format: "image/jpeg"
  },
  webp: {
    title: "WEBP Converter",
    description: "Convert images into WEBP format.",
    accept: "image/*",
    mode: "image",
    format: "image/webp"
  }
};

let activeTool = "convert";
let selectedFiles = [];
let generatedFiles = [];
let isProcessing = false;
let dragCounter = 0;

const toolCards = [...document.querySelectorAll(".tool-card")];

const settingsFields = [
  "formatField",
  "qualityField",
  "widthField",
  "heightField",
  "angleField",
  "flipField",
  "cropField",
  "rangeField"
];

function setStatus(message, type = "") {
  const status = $("status");
  status.textContent = message;
  status.className = type;
}

function setProgress(percent) {
  $("progressTrack").hidden = false;
  $("progressBar").style.width =
    Math.max(0, Math.min(100, percent)) + "%";
}

function finishProgress() {
  $("progressBar").style.width = "100%";

  setTimeout(() => {
    $("progressTrack").hidden = true;
    $("progressBar").style.width = "0%";
  }, 700);
}

function getExtension(mime) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "bin";
}

function safeName(name) {
  return name.replace(/\.[^/.]+$/, "").replace(/[^\w-]+/g, "_");
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + " KB";
  }
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function updateFileInput() {
  const config = tools[activeTool];
  $("fileInput").accept = config.accept;
  $("fileInput").value = "";
}

function showTool(toolName) {
  if (!tools[toolName]) return;

  activeTool = toolName;
  const config = tools[toolName];

  $("toolTitle").textContent = config.title;
  $("toolDescription").textContent = config.description;
  $("fileHint").textContent =
    config.mode === "pdf"
      ? "Select PDF files"
      : "Supported image formats: JPG, PNG, WEBP";

  toolCards.forEach((card) => {
    card.classList.toggle(
      "active",
      card.dataset.tool === toolName
    );
  });

  settingsFields.forEach((id) => {
    $(id).hidden = true;
  });

  if (config.mode === "image") {
    if (["convert", "png", "jpg", "webp"].includes(toolName)) {
      $("formatField").hidden = false;
    }

    if (toolName === "compress") {
      $("qualityField").hidden = false;
    }

    if (toolName === "resize") {
      $("widthField").hidden = false;
      $("heightField").hidden = false;
    }

    if (toolName === "crop") {
      $("cropField").hidden = false;
    }

    if (toolName === "rotate") {
      $("angleField").hidden = false;
    }

    if (toolName === "flip") {
      $("flipField").hidden = false;
    }

    if (toolName === "pdf") {
      $("qualityField").hidden = false;
    }
  }

  if (toolName === "split") {
    $("rangeField").hidden = false;
  }

  $("outputFormat").value =
    config.format || "image/png";

  updateFileInput();
  resetWorkspace(false);
  $("workspace").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  setStatus("Upload your files to get started.");
}

function resetWorkspace(clearStatus = true) {
  selectedFiles = [];
  generatedFiles = [];

  $("fileList").replaceChildren();
  $("results").replaceChildren();
  $("fileInput").value = "";
  $("downloadAllBtn").disabled = true;

  if (clearStatus) {
    setStatus("Workspace reset. Upload your files again.");
  }
}

function renderSelectedFiles() {
  const container = $("fileList");
  container.replaceChildren();

  selectedFiles.forEach((file, index) => {
    const card = document.createElement("div");
    card.className = "file-item";

    if (file.type.startsWith("image/")) {
      const image = document.createElement("img");
      image.alt = file.name;

      const url = URL.createObjectURL(file);
      image.src = url;
      image.onload = () => URL.revokeObjectURL(url);

      card.appendChild(image);
    } else {
      const icon = document.createElement("div");
      icon.className = "tool-icon";
      icon.textContent = "PDF";
      card.appendChild(icon);
    }

    const name = document.createElement("p");
    name.textContent = file.name;
    name.title = file.name;

    const size = document.createElement("p");
    size.textContent = formatBytes(file.size);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-file";
    remove.textContent = "Remove";

    remove.addEventListener("click", () => {
      selectedFiles.splice(index, 1);
      renderSelectedFiles();
      setStatus(selectedFiles.length + " file(s) selected.");
    });

    card.append(name, size, remove);
    container.appendChild(card);
  });
}

function addFiles(fileList) {
  if (isProcessing) return;

  const incoming = [...fileList];
  const config = tools[activeTool];

  const valid = incoming.filter((file) => {
    if (config.mode === "pdf") {
      return (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      );
    }

    return file.type.startsWith("image/");
  });

  if (valid.length !== incoming.length) {
    setStatus(
      "Some files were skipped. Please select the correct file type.",
      "error"
    );
  }

  selectedFiles.push(...valid);

  renderSelectedFiles();

  if (valid.length) {
    setStatus(selectedFiles.length + " file(s) ready.");
  } else if (!incoming.length) {
    setStatus("Choose at least one file.");
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not open image: " + file.name));
    };

    image.src = url;
  });
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Image conversion failed."));
        }
      },
      mime,
      quality
    );
  });
}

function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function getCropSize(width, height, ratio) {
  if (ratio === "free") {
    return { width, height };
  }

  const parts = ratio.split(":").map(Number);
  const targetRatio = parts[0] / parts[1];
  const sourceRatio = width / height;

  if (sourceRatio > targetRatio) {
    return {
      width: height * targetRatio,
      height
    };
  }

  return {
    width,
    height: width / targetRatio
  };
}

async function processImage(file) {
  const image = await loadImage(file);

  let width = image.naturalWidth;
  let height = image.naturalHeight;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas is not supported by this browser.");
  }

  if (activeTool === "resize") {
    const requestedWidth = Number($("imageWidth").value);
    const requestedHeight = Number($("imageHeight").value);

    if (requestedWidth > 0 && requestedHeight > 0) {
      width = requestedWidth;
      height = requestedHeight;
    } else if (requestedWidth > 0) {
      height = Math.round(
        image.naturalHeight * requestedWidth / image.naturalWidth
      );
      width = requestedWidth;
    } else if (requestedHeight > 0) {
      width = Math.round(
        image.naturalWidth * requestedHeight / image.naturalHeight
      );
      height = requestedHeight;
    } else {
      throw new Error("Enter a width or height for resizing.");
    }
  }

  if (activeTool === "crop") {
    const crop = getCropSize(
      image.naturalWidth,
      image.naturalHeight,
      $("cropRatio").value
    );

    canvas.width = Math.round(crop.width);
    canvas.height = Math.round(crop.height);

    ctx.drawImage(
      image,
      (image.naturalWidth - crop.width) / 2,
      (image.naturalHeight - crop.height) / 2,
      crop.width,
      crop.height,
      0,
      0,
      canvas.width,
      canvas.height
    );
  } else if (activeTool === "rotate") {
    const angle = Number($("angle").value);
    const radians = angle * Math.PI / 180;
    const sideways = angle === 90 || angle === 270;

    canvas.width = sideways ? image.naturalHeight : image.naturalWidth;
    canvas.height = sideways ? image.naturalWidth : image.naturalHeight;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(radians);

    ctx.drawImage(
      image,
      -image.naturalWidth / 2,
      -image.naturalHeight / 2
    );
  } else if (activeTool === "flip") {
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    ctx.translate(
      $("flipDirection").value === "horizontal"
        ? canvas.width
        : 0,
      $("flipDirection").value === "vertical"
        ? canvas.height
        : 0
    );

    ctx.scale(
      $("flipDirection").value === "horizontal" ? -1 : 1,
      $("flipDirection").value === "vertical" ? -1 : 1
    );

    ctx.drawImage(image, 0, 0);
  } else {
    canvas.width = width;
    canvas.height = height;

    if (activeTool === "compress" ||
        activeTool === "convert" ||
        activeTool === "png" ||
        activeTool === "jpg" ||
        activeTool === "webp") {
      // JPG does not support transparency.
      const mime = tools[activeTool].format ||
        $("outputFormat").value;

      if (mime === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }
    }

    ctx.drawImage(image, 0, 0, width, height);
  }

  let mime = "image/png";
  let quality = Number($("quality").value);

  if (activeTool === "compress") {
    mime = "image/jpeg";
  } else if (tools[activeTool].format) {
    mime = tools[activeTool].format;
  } else if (activeTool === "convert") {
    mime = $("outputFormat").value;
  }

  if (activeTool === "pdf") {
    mime = "image/jpeg";
    quality = Number($("quality").value);
  }

  const blob = await canvasToBlob(canvas, mime, quality);

  return {
    blob,
    width: canvas.width,
    height: canvas.height,
    mime,
    name: safeName(file.name) + "." + getExtension(mime)
  };
}

function addResult(fileName, blob, previewBlob = null) {
  const result = {
    name: fileName,
    blob
  };

  generatedFiles.push(result);

  const card = document.createElement("div");
  card.className = "result-item";

  if (previewBlob) {
    const image = document.createElement("img");
    image.alt = fileName;
    const url = URL.createObjectURL(previewBlob);
    image.src = url;
    image.onload = () => URL.revokeObjectURL(url);
    card.appendChild(image);
  }

  const name = document.createElement("p");
  name.textContent = fileName;

  const size = document.createElement("p");
  size.textContent = formatBytes(blob.size);

  const link = document.createElement("a");
  link.className = "download-link";
  link.textContent = "Download";
  link.href = URL.createObjectURL(blob);
  link.download = fileName;

  card.append(name, size, link);
  $("results").appendChild(card);

  $("downloadAllBtn").disabled = generatedFiles.length === 0;
}

async function imagesToPdf() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    throw new Error("PDF library failed to load. Check your internet connection.");
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4"
  });

  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];
    const image = await loadImage(file);

    if (i > 0) pdf.addPage();

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 24;

    const scale = Math.min(
      (pageWidth - margin * 2) / image.naturalWidth,
      (pageHeight - margin * 2) / image.naturalHeight
    );

    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;

    const canvas = makeCanvas(
      image.naturalWidth,
      image.naturalHeight
    );

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    const jpeg = await canvasToBlob(
      canvas,
      "image/jpeg",
      Number($("quality").value)
    );

    const dataUrl = await blobToDataUrl(jpeg);

    pdf.addImage(
      dataUrl,
      "JPEG",
      (pageWidth - drawWidth) / 2,
      (pageHeight - drawHeight) / 2,
      drawWidth,
      drawHeight
    );

    setProgress((i + 1) / selectedFiles.length * 100);
  }

  const blob = pdf.output("blob");
  addResult("images-to-pdf.pdf", blob);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file."));

    reader.readAsDataURL(blob);
  });
}

async function mergePdfs() {
  if (!window.PDFLib) {
    throw new Error("PDF library failed to load. Check your internet connection.");
  }

  const { PDFDocument } = window.PDFLib;
  const merged = await PDFDocument.create();

  for (let i = 0; i < selectedFiles.length; i++) {
    const bytes = await selectedFiles[i].arrayBuffer();
    const source = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(
      source,
      source.getPageIndices()
    );

    pages.forEach((page) => merged.addPage(page));
    setProgress((i + 1) / selectedFiles.length * 100);
  }

  const bytes = await merged.save();

  addResult(
    "merged.pdf",
    new Blob([bytes], { type: "application/pdf" })
  );
}

function parsePageRange(text, totalPages) {
  if (!text.trim()) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const pages = new Set();

  text.split(",").forEach((part) => {
    const value = part.trim();

    if (/^\d+$/.test(value)) {
      const page = Number(value);

      if (page >= 1 && page <= totalPages) {
        pages.add(page - 1);
      }

      return;
    }

    const match = value.match(/^(\d+)\s*-\s*(\d+)$/);

    if (match) {
      const start = Number(match[1]);
      const end = Number(match[2]);

      if (start > end) {
        throw new Error("Page range must be in ascending order.");
      }

      for (let page = start; page <= end; page++) {
        if (page >= 1 && page <= totalPages) {
          pages.add(page - 1);
        }
      }
    } else {
      throw new Error("Use a page range like 1-3,5.");
    }
  });

  return [...pages].sort((a, b) => a - b);
}

async function splitPdf() {
  if (!window.PDFLib) {
    throw new Error("PDF library failed to load. Check your internet connection.");
  }

  if (selectedFiles.length !== 1) {
    throw new Error("Select exactly one PDF to split.");
  }

  const { PDFDocument } = window.PDFLib;
  const sourceBytes = await selectedFiles[0].arrayBuffer();
  const source = await PDFDocument.load(sourceBytes);
  const totalPages = source.getPageCount();

  const pageIndexes = parsePageRange(
    $("pageRange").value,
    totalPages
  );

  if (!pageIndexes.length) {
    throw new Error("No valid pages found in the selected range.");
  }

  const output = await PDFDocument.create();
  const pages = await output.copyPages(source, pageIndexes);

  pages.forEach((page) => output.addPage(page));

  const bytes = await output.save();

  addResult(
    "split-pages.pdf",
    new Blob([bytes], { type: "application/pdf" })
  );

  setProgress(100);
}

async function processFiles() {
  if (isProcessing) return;

  if (!selectedFiles.length) {
    setStatus("Please upload at least one file first.", "error");
    return;
  }

  isProcessing = true;
  $("processBtn").disabled = true;
  $("downloadAllBtn").disabled = true;
  $("results").replaceChildren();
  generatedFiles = [];
  setProgress(0);

  try {
    if (activeTool === "pdf") {
      await imagesToPdf();
    } else if (activeTool === "merge") {
      if (selectedFiles.length < 2) {
        throw new Error("Select at least two PDF files to merge.");
      }

      await mergePdfs();
    } else if (activeTool === "split") {
      await splitPdf();
    } else {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const output = await processImage(file);

        addResult(
          output.name,
          output.blob,
          output.blob
        );

        setProgress((i + 1) / selectedFiles.length * 100);
      }
    }

    setStatus(
      "Success! " + generatedFiles.length + " output file(s) created.",
      "success"
    );
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Something went wrong.", "error");
  } finally {
    isProcessing = false;
    $("processBtn").disabled = false;
    $("downloadAllBtn").disabled = generatedFiles.length === 0;
    finishProgress();
  }
}

function downloadAll() {
  if (!generatedFiles.length) {
    setStatus("There are no files to download.", "error");
    return;
  }

  generatedFiles.forEach((file, index) => {
    setTimeout(() => {
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, index * 350);
  });
}

/* =========================================
   EVENT LISTENERS
========================================= */

toolCards.forEach((card) => {
  card.addEventListener("click", () => {
    showTool(card.dataset.tool);
  });
});

$("searchInput").addEventListener("input", () => {
  const query = $("searchInput").value.toLowerCase().trim();
  let visible = 0;

  toolCards.forEach((card) => {
    const matches = card.textContent.toLowerCase().includes(query);
    card.hidden = !matches;

    if (matches) visible++;
  });

  if (visible === 0) {
    setStatus("No tools found. Try another search.");
  }
});

$("fileInput").addEventListener("change", (event) => {
  addFiles(event.target.files);
});

$("uploadBox").addEventListener("dragenter", (event) => {
  event.preventDefault();
  dragCounter++;
  $("uploadBox").classList.add("drag-over");
});

$("uploadBox").addEventListener("dragover", (event) => {
  event.preventDefault();
});

$("uploadBox").addEventListener("dragleave", (event) => {
  event.preventDefault();
  dragCounter--;

  if (dragCounter <= 0) {
    dragCounter = 0;
    $("uploadBox").classList.remove("drag-over");
  }
});

$("uploadBox").addEventListener("drop", (event) => {
  event.preventDefault();
  dragCounter = 0;
  $("uploadBox").classList.remove("drag-over");
  addFiles(event.dataTransfer.files);
});

$("processBtn").addEventListener("click", processFiles);

$("downloadAllBtn").addEventListener("click", downloadAll);

$("resetBtn").addEventListener("click", () => {
  resetWorkspace();
});

$("outputFormat").addEventListener("change", () => {
  if (activeTool === "convert") {
    setStatus("Output format set to " + $("outputFormat").selectedOptions[0].text + ".");
  }
});

/* Initialize the website */

showTool("convert");
```
