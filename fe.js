  // ==================== Export PDF (ช่องลายเซ็น + Error Handling ดีขึ้น) ====================
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
      const clone = originalPage.cloneNode(true);

      // Force A4 + Desktop layout
      clone.style.setProperty("position", "absolute", "important");
      clone.style.setProperty("left", "-99999px", "important");
      clone.style.setProperty("top", "0", "important");
      clone.style.setProperty("width", "21cm", "important");
      clone.style.setProperty("min-height", "29.7cm", "important");
      clone.style.setProperty("padding", "2.8cm 2.2cm 2cm", "important");
      clone.style.setProperty("margin", "0", "important");
      clone.style.setProperty("box-shadow", "none", "important");
      clone.style.setProperty("background", "#ffffff", "important");

      // ปรับช่องลายเซ็นให้พอดีกับกระดาษ A4
      const sigSection = clone.querySelector(".signature-section");
      if (sigSection) sigSection.style.setProperty("margin-left", "5cm", "important");

      const sigBox = clone.querySelector(".sig-box");
      if (sigBox) {
        sigBox.style.setProperty("width", "6cm", "important");
        sigBox.style.setProperty("min-height", "1.1cm", "important");
      }

      const sigImg = clone.querySelector("#signaturePrev");
      if (sigImg) {
        sigImg.style.setProperty("max-width", "100%", "important");
        sigImg.style.setProperty("max-height", "1.1cm", "important");
        sigImg.style.setProperty("object-fit", "contain", "important");
      }

      clone.querySelectorAll(".sig-placeholder, .bar").forEach(el => el.style.display = "none");

      document.body.appendChild(clone);

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const canvasImg = await html2canvas(clone, {
        scale: 3.2,                    // ลดลงนิดเพื่อมือถือไม่ error
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        allowTaint: true,
      });

      const imgData = canvasImg.toDataURL("image/jpeg", 0.95);
      const pdfWidth = 210;
      const pdfHeight = (canvasImg.height * pdfWidth) / canvasImg.width;

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, Math.min(pdfHeight, 297));
      pdf.save("ใบสมัคร_Fast_Track.pdf");

      Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ",
        text: "PDF ออกมาสวยเหมือนบนคอมแล้ว",
        confirmButtonColor: "#1a5276",
        timer: 2000,
      }).then(() => location.reload());

    } catch (err) {
      console.error("❌ PDF Export Error:", err);   // ดู error เอาจริงใน console

      // แสดง error จริงให้ผู้ใช้เห็น (ช่วย debug)
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        html: `
          ไม่สามารถสร้าง PDF ได้<br>
          <small style="color:#c0392b; font-size:0.9rem;">
            ${err.message || err.toString()}
          </small>
        `,
        confirmButtonColor: "#c0392b",
        footer: "ลองรีโหลดหน้าแล้วลองใหม่ หรือบอก developer ด้วยข้อความด้านบน",
      });
    } finally {
      // ลบ clone
      const cloneEl = document.querySelector(".page[style*='left: -99999px']");
      if (cloneEl) cloneEl.remove();

      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  };