"use strict";

const statusText = document.getElementById("status");
const downloadArea = document.getElementById("downloadArea");

function showStatus(message) {
  statusText.textContent = message;
  downloadArea.replaceChildren();
}

function showDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.textContent = "⬇ Download " + filename;

  link.addEventListener("click", () => {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });

  downloadArea.appendChild(link);
  statusText.textContent = "Done! Your file is ready.";
}

function safeName(filename) {
  return filename.replace(/\.[^/.]+$/, "").replace(/[^\w-]+/g, "_") || "file";
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image open nahi ho payi. Dusri image try karo."));
    };

    img.src = url;
  });
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Image convert nahi ho payi."));
      }
    }, type, quality);
  });
}

async function imageToCanvas(file) {
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");

  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  return canvas;
}

// 1. IMAGE TO PDF
document.getElementById("imagePdfInput").addEventListener("change", async event => {
  const files = Array.from(event.target.files || []);
  event.target.value = "";

  if (!files.length) return;

  showStatus("Creating PDF... Please wait.");

  try {
    if (!window.PDFLib) {
      throw new Error("PDF library load nahi hui. Internet check karke page refresh karo.");
    }

    const pdf = await PDFLib.PDFDocument.create();

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;

      const canvas = await imageToCanvas(file);
      const jpegBlob = await canvasBlob(canvas, "image/jpeg", 0.95);
      const bytes = new Uint8Array(await jpegBlob.arrayBuffer());
      const image = await pdf.embedJpg(bytes);

      const page = pdf.addPage([image.width, image.height]);

      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height
      });
    }

    if (pdf.getPageCount() === 0) {
      throw new Error("Koi valid image select nahi hui.");
    }

    const pdfBytes = await pdf.save();
    showDownload(
      new Blob([pdfBytes], { type: "application/pdf" }),
      "images-to-pdf.pdf"
    );
  } catch (error) {
    showStatus("Error: " + error.message);
  }
});

// 2. IMAGE CONVERTER
document.getElementById("convertInput").addEventListener("change", async event => {
  const file = event.target.files[0];
  event.target.value = "";

  if (!file) return;

  showStatus("Converting image...");

  try {
    const format = document.getElementById("convertFormat").value;
    const canvas = await imageToCanvas(file);

    const blob = await canvasBlob(canvas, format, 0.92);
    const extension = format === "image/jpeg"
      ? "jpg"
      : format === "image/png"
        ? "png"
        : "webp";

    showDownload(
      blob,
      safeName(file.name) + "." + extension
    );
  } catch (error) {
    showStatus("Error: " + error.message);
  }
});

// 3. IMAGE COMPRESSOR
const qualitySlider = document.getElementById("quality");
const qualityValue = document.getElementById("qualityValue");

qualitySlider.addEventListener("input", () => {
  qualityValue.textContent = qualitySlider.value + "%";
});

document.getElementById("compressInput").addEventListener("change", async event => {
  const file = event.target.files[0];
  event.target.value = "";

  if (!file) return;

  showStatus("Compressing image...");

  try {
    const canvas = await imageToCanvas(file);
    const quality = Number(qualitySlider.value) / 100;

    // JPEG compression generally reduces file size.
    const blob = await canvasBlob(canvas, "image/jpeg", quality);

    showDownload(
      blob,
      safeName(file.name) + "-compressed.jpg"
    );

    statusText.textContent +=
      " Original: " + formatBytes(file.size) +
      " | New: " + formatBytes(blob.size);
  } catch (error) {
    showStatus("Error: " + error.message);
  }
});

// 4. MERGE PDF FILES
document.getElementById("mergeInput").addEventListener("change", async event => {
  const files = Array.from(event.target.files || []);
  event.target.value = "";

  if (!files.length) return;

  showStatus("Merging PDF files... Please wait.");

  try {
    if (!window.PDFLib) {
      throw new Error("PDF library load nahi hui. Internet check karke page refresh karo.");
    }

    const mergedPdf = await PDFLib.PDFDocument.create();
    let validFiles = 0;

    for (const file of files) {
      if (file.type !== "application/pdf" &&
          !file.name.toLowerCase().endsWith(".pdf")) {
        continue;
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      const sourcePdf = await PDFLib.PDFDocument.load(bytes);
      const copiedPages = await mergedPdf.copyPages(
        sourcePdf,
        sourcePdf.getPageIndices()
      );

      copiedPages.forEach(page => mergedPdf.addPage(page));
      validFiles++;
    }

    if (validFiles === 0 || mergedPdf.getPageCount() === 0) {
      throw new Error("Valid PDF files select karo.");
    }

    const mergedBytes = await mergedPdf.save();

    showDownload(
      new Blob([mergedBytes], { type: "application/pdf" }),
      "merged-pdf.pdf"
    );
  } catch (error) {
    showStatus(
      "PDF merge nahi hua. File password-protected ya invalid ho sakti hai. " +
      error.message
    );
  }
});

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}
