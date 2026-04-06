// fasttrack.js (ปรับปรุงใหม่)
document.addEventListener("DOMContentLoaded", () => {

  // ==================== Custom Checkmarks & Radios ====================
  function initCustomMarks() {
    const allInputs = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
    
    allInputs.forEach(input => {
      const mark = input.nextElementSibling;
      if (!mark) return;

      // Initial state
      if (input.checked) mark.classList.add("checked");

      input.addEventListener("change", () => {
        // Radio group
        if (input.type === "radio") {
          document.querySelectorAll(`input[name="${input.name}"]`).forEach(radio => {
            const rMark = radio.nextElementSibling;
            if (rMark) rMark.classList.remove("checked");
          });
        }
        // Checkbox / Radio toggle
        mark.classList.toggle("checked", input.checked);
      });
    });
  }
  initCustomMarks();

  // ==================== Toggle Reason Inputs ====================
  function toggleRegInputs() {
    const incomplete = document.getElementById("regIncomplete").checked;
    const other = document.getElementById("regOther").checked;

    const incInput = document.getElementById("incompleteReason");
    const othInput = document.getElementById("otherReason");

    incInput.disabled = !incomplete;
    incInput.required = incomplete;
    if (!incomplete) incInput.value = "";

    othInput.disabled = !other;
    othInput.required = other;
    if (!other) othInput.value = "";
  }

  document.getElementById("regComplete").addEventListener("change", toggleRegInputs);
  document.getElementById("regIncomplete").addEventListener("change", toggleRegInputs);
  document.getElementById("regOther").addEventListener("change", toggleRegInputs);
  toggleRegInputs(); // Initial call

  // ==================== Signature Canvas ====================
  const canvas = document.getElementById("signatureCanvas");
  const ctx = canvas.getContext("2d", { alpha: true });
  let drawing = false;

  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { 
      x: (e.clientX || e.touches[0].clientX) - rect.left,
      y: (e.clientY || e.touches[0].clientY) - rect.top 
    };
  }

  function startDraw(e) {
    e.preventDefault();
    drawing = true;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function stopDraw() {
    drawing = false;
  }

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDraw);
  canvas.addEventListener("mouseleave", stopDraw);

  canvas.addEventListener("touchstart", startDraw);
  canvas.addEventListener("touchmove", draw);
  canvas.addEventListener("touchend", stopDraw);

  window.clearCanvas = () => ctx.clearRect(0, 0, canvas.width, canvas.height);

  window.openSignatureModal = () => {
    clearCanvas();
    document.getElementById("signatureModal").classList.add("open");
  };

  window.closeSignatureModal = () => {
    document.getElementById("signatureModal").classList.remove("open");
  };

  window.saveSignature = () => {
    const dataURL = canvas.toDataURL("image/png", 1.0);
    document.getElementById("signatureData").value = dataURL;
    
    const img = document.getElementById("signaturePrev");
    img.src = dataURL;
    img.style.display = "block";
    document.getElementById("placeholderText").style.display = "none";
    
    closeSignatureModal();
  };

  // Close modal when click outside
  document.getElementById("signatureModal").addEventListener("click", (e) => {
    if (e.target.id === "signatureModal") closeSignatureModal();
  });

  // ==================== Export PDF ====================
  // ==================== Export PDF (ไม่กระตุกทั้งคอมและมือถือ) ====================
  window.exportPDF = async () => {
    const form = document.getElementById("FastTrackForm");
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (!document.getElementById("signatureData").value) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาลงนาม",
        text: "โปรดลงลายมือชื่อก่อนบันทึก PDF",
        confirmButtonColor: "#1a5276",
      });
      return;
    }

    const btn = document.getElementById("saveBtn");
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `กำลังสร้าง PDF... <span style="animation:spin 1s linear infinite">⟳</span>`;

    const originalPage = document.querySelector(".page");

    try {
      // === สร้าง Clone เพื่อไม่ให้หน้าเดิมกระตุกเลย ===
      const clone = originalPage.cloneNode(true);
      
      // ตั้งค่าคลอนให้เป็นขนาด A4 จริง
      clone.style.position = "absolute";
      clone.style.left = "-99999px";
      clone.style.top = "0";
      clone.style.width = "21cm";
      clone.style.minHeight = "29.7cm";
      clone.style.padding = "2.8cm 2.2cm 2cm";
      clone.style.margin = "0";
      clone.style.boxShadow = "none";
      clone.style.background = "#fff";

      // ซ่อนเฉพาะใน clone (หน้าเดิมไม่ถูกแตะ)
      clone.querySelectorAll(".sig-placeholder, .bar").forEach(el => {
        el.style.display = "none";
      });

      document.body.appendChild(clone);

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const canvasImg = await html2canvas(clone, {
        scale: 3.5,           // ความคมชัดสูงมาก
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        allowTaint: true
      });

      const imgData = canvasImg.toDataURL("image/jpeg", 0.98);
      const pdfWidth = 210;
      const pdfHeight = (canvasImg.height * pdfWidth) / canvasImg.width;

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, Math.min(pdfHeight, 297));
      pdf.save("ใบสมัคร Fast Track.pdf");

      Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ",
        text: "PDF ออกมาเหมือนคอมพิวเตอร์ (ไม่กระตุกแล้ว)",
        confirmButtonColor: "#1a5276",
        timer: 2200
      }).then(() => location.reload());

    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถสร้าง PDF ได้ กรุณาลองใหม่",
        confirmButtonColor: "#c0392b"
      });
    } finally {
      // ลบ clone และคืนปุ่มเป็นปกติ
      const cloneEl = document.querySelector(".page[style*='left: -99999px']");
      if (cloneEl) cloneEl.remove();
      
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  };

  // Spin animation
  const style = document.createElement("style");
  style.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
});