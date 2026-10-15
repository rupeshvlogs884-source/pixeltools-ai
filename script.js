
document.getElementById("pdfBtn").addEventListener("click", async () => {
  const input = document.getElementById("imageInput");
  const files = Array.from(input.files || []).filter(file =>
    file.type.startsWith("image/")
  );

  const status = document.getElementById("status");

  if (!files.length) {
    status.textContent = "Pehle multiple photos select karo.";
    return;
  }

  if (!window.jspdf) {
    status.textContent = "PDF library load nahi hui. Internet check karo.";
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");

    for (let i = 0; i < files.length; i++) {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(files[i]);
      });

      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = dataUrl;
      });

      if (i > 0) pdf.addPage();

      const pageW = 210;
      const pageH = 297;
      const margin = 10;
      const scale = Math.min(
        (pageW - margin * 2) / img.width,
        (pageH - margin * 2) / img.height
      );

      const w = img.width * scale;
      const h = img.height * scale;
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;

      const format = files[i].type === "image/png" ? "PNG" :
                     files[i].type === "image/webp" ? "WEBP" : "JPEG";

      pdf.addImage(dataUrl, format, x, y, w, h);
    }

    pdf.save("PixelTools-Multiple-Images.pdf");
    status.textContent = `${files.length} photos ek PDF mein download ho gayi!`;
  } catch (error) {
    console.error(error);
    status.textContent = "PDF banane mein error aaya. Dobara try karo.";
  }
});
