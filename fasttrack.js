document.addEventListener("DOMContentLoaded", () => {
  const radios = document.querySelectorAll('input[name="title"]');
  const otherInput = document.getElementById("titleOtherText");

  radios.forEach((r) => {
    r.addEventListener("change", () => {
      if (document.getElementById("titleOtherRadio").checked) {
        otherInput.disabled = false;
        otherInput.required = true;
      } else {
        otherInput.disabled = true;
        otherInput.required = false;
        otherInput.value = "";
      }
    });
  });

  document.getElementById("phone").addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
  });

  const checkboxes = document.querySelectorAll('input[name="contact"]');
  const contactInput = document.getElementById("contactId");
  checkboxes.forEach((cb) => {
    cb.addEventListener("change", () => {
      const anyChecked = [...checkboxes].some((c) => c.checked);

      contactInput.disabled = !anyChecked;
      contactInput.required = anyChecked;

      if (!anyChecked) {
        contactInput.value = "";
      }
    });
  });

  // ==================== Custom Checkmarks & Radios ====================
  function initCustomMarks() {
    const allInputs = document.querySelectorAll(
      'input[type="radio"], input[type="checkbox"]',
    );

    allInputs.forEach((input) => {
      const mark = input.nextElementSibling;
      if (!mark) return;

      // Initial state
      if (input.checked) mark.classList.add("checked");

      input.addEventListener("change", () => {
        // Radio group
        if (input.type === "radio") {
          document
            .querySelectorAll(`input[name="${input.name}"]`)
            .forEach((radio) => {
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

  document
    .getElementById("regComplete")
    .addEventListener("change", toggleRegInputs);
  document
    .getElementById("regIncomplete")
    .addEventListener("change", toggleRegInputs);
  document
    .getElementById("regOther")
    .addEventListener("change", toggleRegInputs);
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
      y: (e.clientY || e.touches[0].clientY) - rect.top,
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

    // ==================== Export PDF (A4 clone — works on mobile & desktop) ====================
  window.exportPDF = async () => {
    const form = document.getElementById("FastTrackForm");
    if (!form.checkValidity()) { form.reportValidity(); return; }

    if (!document.getElementById("signatureData").value) {
      Swal.fire({ icon: "warning", title: "กรุณาลงนาม", text: "โปรดลงลายมือชื่อก่อนบันทึก PDF", confirmButtonColor: "#1a5276" });
      return;
    }

    const btn = document.getElementById("saveBtn");
    btn.disabled = true;
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> กำลังสร้าง PDF...`;
    btn.style.display = "none";

    // A4 @ 96dpi = 794px — render ขนาดนี้เสมอไม่ว่าจะดูบนอะไร
    const A4_PX   = 794;
    const A4_MM_W = 210;
    const A4_MM_H = 297;

    // off-screen container ขนาด A4 คงที่ วางนอกจอ
    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed; top: -99999px; left: -99999px;
      width: ${A4_PX}px; background: #fff;
      font-family: "Sarabun", serif;
    `;
    document.body.appendChild(container);

    try {
      const { jsPDF } = window.jspdf;
      const pdf   = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pages = document.querySelectorAll(".page");

      for (let i = 0; i < pages.length; i++) {
        // clone + override style เป็น A4 ทับ mobile style ทุกอย่าง
        const clone = pages[i].cloneNode(true);
        clone.style.cssText = `
          width: ${A4_PX}px !important;
          min-height: unset !important;
          margin: 0 !important;
          padding: 107px 84px !important;
          background: #fff !important;
          box-shadow: none !important;
          position: static !important;
          font-size: 15px !important;
        `;
        // ซ่อน placeholder และ bar
        clone.querySelectorAll(".sig-placeholder, .bar").forEach(el => el.style.display = "none");

        container.innerHTML = "";
        container.appendChild(clone);

        const cvs = await html2canvas(container, {
          scale: 2, useCORS: true, logging: false,
          backgroundColor: "#ffffff",
          width: A4_PX,
          windowWidth: A4_PX,
        });

        const imgData = cvs.toDataURL("image/jpeg", 0.95);
        const imgH    = A4_MM_W * (cvs.height / cvs.width);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, A4_MM_W, Math.min(imgH, A4_MM_H));
      }

      pdf.save("ใบสมัคร Fast Track.pdf");
      Swal.fire({
        icon: "success", title: "บันทึกสำเร็จ", text: "ไฟล์ PDF ถูกบันทึกแล้ว",
        confirmButtonColor: "#1a5276", timer: 2500, timerProgressBar: true,
      }).then(() => window.location.reload());

    } catch (err) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "ไม่สามารถสร้าง PDF ได้ กรุณาลองใหม่", confirmButtonColor: "#c0392b" });
      console.error(err);
    } finally {
      document.body.removeChild(container);
      btn.style.display = "flex";
      btn.disabled = false;
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> บันทึก PDF`;
    }
  };

  // Spin animation
  const style = document.createElement("style");
  style.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
});
