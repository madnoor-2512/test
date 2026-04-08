document.addEventListener("DOMContentLoaded", () => {
  // ==================== Title Other Input ====================
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

  // ==================== Phone Number Filter ====================
  document.getElementById("phone").addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
  });

  // ==================== Contact Checkboxes ====================
  const checkboxes = document.querySelectorAll('input[name="contact"]');
  const contactInput = document.getElementById("contactId");
  checkboxes.forEach((cb) => {
    cb.addEventListener("change", () => {
      const anyChecked = [...checkboxes].some((c) => c.checked);
      contactInput.disabled = !anyChecked;
      contactInput.required = anyChecked;
      if (!anyChecked) contactInput.value = "";
    });
  });

  // ==================== Custom Checkmarks & Radios ====================
  function initCustomMarks() {
    const allInputs = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
    allInputs.forEach((input) => {
      const mark = input.nextElementSibling;
      if (!mark) return;
      if (input.checked) mark.classList.add("checked");
      input.addEventListener("change", () => {
        if (input.type === "radio") {
          document.querySelectorAll(`input[name="${input.name}"]`).forEach((radio) => {
            const rMark = radio.nextElementSibling;
            if (rMark) rMark.classList.remove("checked");
          });
        }
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

    incInput.disabled = !incomplete; incInput.required = incomplete;
    if (!incomplete) incInput.value = "";

    othInput.disabled = !other; othInput.required = other;
    if (!other) othInput.value = "";
  }

  document.getElementById("regComplete").addEventListener("change", toggleRegInputs);
  document.getElementById("regIncomplete").addEventListener("change", toggleRegInputs);
  document.getElementById("regOther").addEventListener("change", toggleRegInputs);
  toggleRegInputs();

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

  function startDraw(e) { e.preventDefault(); drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
  function draw(e) { if (!drawing) return; e.preventDefault(); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); }
  function stopDraw() { drawing = false; }

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDraw);
  canvas.addEventListener("mouseleave", stopDraw);
  canvas.addEventListener("touchstart", startDraw);
  canvas.addEventListener("touchmove", draw);
  canvas.addEventListener("touchend", stopDraw);

  window.clearCanvas = () => ctx.clearRect(0, 0, canvas.width, canvas.height);
  window.openSignatureModal = () => { clearCanvas(); document.getElementById("signatureModal").classList.add("open"); };
  window.closeSignatureModal = () => { document.getElementById("signatureModal").classList.remove("open"); };
  window.saveSignature = () => {
    const dataURL = canvas.toDataURL("image/png", 1.0);
    document.getElementById("signatureData").value = dataURL;
    const img = document.getElementById("signaturePrev");
    img.src = dataURL; img.style.display = "block";
    document.getElementById("placeholderText").style.display = "none";
    closeSignatureModal();
  };

  document.getElementById("signatureModal").addEventListener("click", (e) => {
    if (e.target.id === "signatureModal") closeSignatureModal();
  });

  // ==================== Export PDF (Hybrid: Safari → Print / อื่น ๆ → PDF) ====================
  window.exportPDF = async () => {
    const form = document.getElementById("FastTrackForm");
    if (!form.checkValidity()) { form.reportValidity(); return; }

    if (!document.getElementById("signatureData").value) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาลงนาม",
        text: "โปรดลงลายมือชื่อก่อนบันทึก",
        confirmButtonColor: "#1a5276",
      });
      return;
    }

    const btn = document.getElementById("saveBtn");
    const originalHTML = btn.innerHTML;

    // ตรวจสอบว่าเป็น Safari หรือไม่
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isSafari) {
      // ==================== Safari → ใช้ window.print() ====================
      btn.disabled = true;
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg> กำลังเตรียมพิมพ์...
      `;

      await new Promise(r => setTimeout(r, 150));
      window.print();
      setTimeout(() => window.location.reload(), 500);

      btn.disabled = false;
      btn.innerHTML = originalHTML;
    } else {
      // ==================== อื่น ๆ → ใช้ html2canvas + jsPDF ====================
      btn.disabled = true;
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> กำลังสร้าง PDF...`;
      btn.style.display = "none";

      const A4_PX = 794;
      const A4_MM_W = 210;
      const A4_MM_H = 297;

      const wrapper = document.createElement("div");
      wrapper.style.cssText = `position:absolute;top:0;left:0;width:${A4_PX}px;overflow:hidden;height:1px;opacity:0;pointer-events:none;z-index:-1;`;
      const container = document.createElement("div");
      container.style.cssText = `width:${A4_PX}px;background:#fff;font-family:"Sarabun",serif;`;
      wrapper.appendChild(container);
      document.body.appendChild(wrapper);

      try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
        const pages = document.querySelectorAll(".page");

        for (let i = 0; i < pages.length; i++) {
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
          clone.querySelectorAll(".sig-placeholder, .bar").forEach(el => el.style.display = "none");
          // const style = window.getComputedStyle(el);

          clone.querySelectorAll("*").forEach(el => {
          const style = window.getComputedStyle(el);
            if (
              style.color.includes("color(") ||
              style.backgroundColor.includes("color(")
            ) {
              console.warn("❌ BAD COLOR:", el, style.color);

              el.style.color = "#000";
              el.style.backgroundColor = "#fff";
            }
          });

          container.innerHTML = "";
          container.appendChild(clone);

          const cvs = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            width: A4_PX,
            windowWidth: A4_PX,
            scrollX: 0,
            scrollY: 0,
          });

          const imgData = cvs.toDataURL("image/jpeg", 0.92);
          const imgH = A4_MM_W * (cvs.height / cvs.width);
          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, "JPEG", 0, 0, A4_MM_W, Math.min(imgH, A4_MM_H));
        }

        const pdfBlob = pdf.output("blob");
        const blobUrl = URL.createObjectURL(pdfBlob);

        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = "ใบสมัคร Fast Track.pdf";
        a.click();
        URL.revokeObjectURL(blobUrl);

        Swal.fire({
          icon: "success",
          title: "บันทึกสำเร็จ",
          text: "ไฟล์ PDF ถูกบันทึกแล้ว",
          confirmButtonColor: "#1a5276",
          timer: 2500,
          timerProgressBar: true,
        }).then(() => window.location.reload());

      } catch (err) {
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "ไม่สามารถสร้าง PDF ได้ กรุณาลองใหม่", confirmButtonColor: "#c0392b" });
        console.error(err);
      } finally {
        document.body.removeChild(wrapper);
        btn.style.display = "flex";
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }
    }
  };

  // Spin animation
  const style = document.createElement("style");
  style.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
});