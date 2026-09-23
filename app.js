(() => {
  "use strict";

  const byId = id => document.getElementById(id);

  const initVisitCounter = () => {
    const visits = Number(localStorage.getItem("app_visits") || 0) + 1;
    localStorage.setItem("app_visits", String(visits));
    const counterEl = byId("visitCount");
    if (counterEl) counterEl.textContent = String(visits);
  };

  const initWhiteboardUnified = () => {
    const canvas = byId("whiteboardCanvas");
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const state = {
      width: 0,
      height: 0,
      dpr: 1,
      tool: "select",
      strokeWidth: 3,
      strokeColor: "#e2e8f0",
      fillColor: "#3b0764",
      shapeAnim: "none"
    };

    let elements = [];
    let draft = null;
    let drawing = false;
    let selected = null;
    let dragOffset = { x: 0, y: 0 };

    let particles = [];
    let pointer = { x: -100, y: -100 };
    let lastTime = performance.now();
    let frames = 0;
    let elapsed = 0;

    const resetParticles = () => {
      particles = Array.from({ length: 50 }, (_, index) => ({
        x: (index * 47) % (canvas.clientWidth || 800),
        y: (index * 83) % (canvas.clientHeight || 600),
        vx: (index % 3 - 1) * 0.3,
        vy: (index % 2 ? 1 : -1) * 0.25,
        size: 1.5 + (index % 3)
      }));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      state.width = rect.width;
      state.height = rect.height;
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * state.dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * state.dpr));
      context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      if (!particles.length) resetParticles();
    };

    const getBounds = element => {
      if (element.type === "circle") return { x: element.x - element.radius, y: element.y - element.radius, width: element.radius * 2, height: element.radius * 2 };
      if (element.type === "pencil") {
        const xs = element.points.map(p => p.x);
        const ys = element.points.map(p => p.y);
        const x = Math.min(...xs); const y = Math.min(...ys);
        return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
      }
      if (element.type === "text") return { x: element.x, y: element.y - element.fontSize, width: element.text.length * element.fontSize * 0.6, height: element.fontSize };
      return { x: Math.min(element.x, element.x + element.w), y: Math.min(element.y, element.y + element.h), width: Math.abs(element.w), height: Math.abs(element.h) };
    };

    const containsPoint = (element, point) => {
      const bounds = getBounds(element);
      const padding = Math.max(8, state.strokeWidth * 2);
      if (element.type === "circle") return Math.hypot(point.x - element.x, point.y - element.y) <= element.radius + padding;
      return point.x >= bounds.x - padding && point.x <= bounds.x + bounds.width + padding && point.y >= bounds.y - padding && point.y <= bounds.y + bounds.height + padding;
    };

    const drawElement = (element, time) => {
      context.save();
      context.strokeStyle = element.strokeColor;
      context.fillStyle = element.fillColor;
      context.lineWidth = element.strokeWidth;

      let offsetX = 0;
      let offsetY = 0;
      let scaleVal = 1;
      let rotVal = 0;

      if ((element.type === "rectangle" || element.type === "circle") && element.animation && element.animation !== "none") {
        const t = time / 1000;
        if (element.animation === "bounce") {
          offsetY = Math.sin(t * 6) * 14;
        } else if (element.animation === "pulse") {
          scaleVal = 1 + Math.sin(t * 5) * 0.12;
        } else if (element.animation === "rotate") {
          rotVal = t * 2;
        }
      }

      context.translate(element.type === "circle" ? element.x : 0, element.type === "circle" ? element.y : 0);
      if (scaleVal !== 1 || rotVal !== 0) {
        context.scale(scaleVal, scaleVal);
        context.rotate(rotVal);
      }
      if (element.type === "circle") {
        context.translate(-element.x, -element.y);
      }

      const drawX = element.x + offsetX;
      const drawY = element.y + offsetY;

      if (element.type === "pencil") {
        context.beginPath();
        element.points.forEach((p, idx) => idx ? context.lineTo(p.x, p.y) : context.moveTo(p.x, p.y));
        context.stroke();
      } else if (element.type === "rectangle") {
        context.fillRect(drawX, drawY, element.w, element.h);
        context.strokeRect(drawX, drawY, element.w, element.h);
      } else if (element.type === "circle") {
        context.beginPath();
        context.arc(element.x, element.y, element.radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      } else if (element.type === "text") {
        context.font = `${element.fontSize}px Trebuchet MS`;
        context.fillStyle = element.strokeColor;
        context.fillText(element.text, drawX, drawY);
      }

      context.restore();

      if (element === selected) {
        const bounds = getBounds(element);
        context.save();
        context.setLineDash([5, 4]);
        context.strokeStyle = "#8b5cf6";
        context.strokeRect(bounds.x - 6, bounds.y - 6, bounds.width + 12, bounds.height + 12);
        context.restore();
      }
    };

    const render = time => {
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      frames += 1;
      elapsed += delta;

      if (elapsed >= 0.5) {
        const currentFps = Math.round(frames / elapsed);
        const fpsEl = byId("perfFps");
        if (fpsEl) fpsEl.textContent = String(currentFps);
        frames = 0;
        elapsed = 0;
        if (performance && performance.memory) {
          const memEl = byId("perfMemory");
          if (memEl) memEl.textContent = `${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB`;
        }
      }

      context.clearRect(0, 0, state.width, state.height);

      particles.forEach(p => {
        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        p.vx += dx * 0.00005;
        p.vy += dy * 0.00005;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > state.width) p.vx *= -1;
        if (p.y < 0 || p.y > state.height) p.vy *= -1;

        context.fillStyle = "rgba(139, 92, 246, 0.25)";
        context.beginPath();
        context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        context.fill();
      });

      elements.forEach(el => drawElement(el, time));
      if (draft) drawElement(draft, time);

      requestAnimationFrame(render);
    };

    const pointFromEvent = event => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    canvas.addEventListener("pointermove", event => {
      const point = pointFromEvent(event);
      pointer = point;

      if (!drawing) return;
      if (selected && state.tool === "select") {
        const bounds = getBounds(selected);
        const nextX = point.x - dragOffset.x;
        const nextY = point.y - dragOffset.y;
        const dx = nextX - bounds.x;
        const dy = nextY - bounds.y;
        if (selected.type === "pencil") {
          selected.points.forEach(item => { item.x += dx; item.y += dy; });
        } else {
          selected.x += dx; selected.y += dy;
        }
        return;
      }
      if (!draft) return;
      if (draft.type === "pencil") draft.points.push(point);
      if (draft.type === "rectangle") { draft.w = point.x - draft.x; draft.h = point.y - draft.y; }
      if (draft.type === "circle") draft.radius = Math.hypot(point.x - draft.x, point.y - draft.y);
    });

    canvas.addEventListener("pointerdown", event => {
      const point = pointFromEvent(event);
      canvas.setPointerCapture(event.pointerId);
      drawing = true;

      if (state.tool === "eraser") {
        elements = elements.filter(el => !containsPoint(el, point));
        drawing = false;
      } else if (state.tool === "text") {
        const text = window.prompt("Escribe el texto para el lienzo:");
        if (text?.trim()) {
          elements.push({
            type: "text",
            text: text.trim(),
            x: point.x,
            y: point.y,
            fontSize: Math.max(16, state.strokeWidth * 5),
            strokeColor: state.strokeColor,
            fillColor: state.fillColor,
            strokeWidth: state.strokeWidth,
            animation: "none"
          });
        }
        drawing = false;
      } else if (state.tool === "select") {
        selected = [...elements].reverse().find(el => containsPoint(el, point)) || null;
        if (selected) {
          const bounds = getBounds(selected);
          dragOffset = { x: point.x - bounds.x, y: point.y - bounds.y };
          const animSelect = byId("shapeAnimationSelect");
          if (animSelect) animSelect.value = selected.animation || "none";
        }
      } else {
        draft = {
          type: state.tool,
          strokeColor: state.strokeColor,
          fillColor: state.fillColor,
          strokeWidth: state.strokeWidth,
          x: point.x,
          y: point.y,
          w: 0,
          h: 0,
          radius: 0,
          points: [point],
          animation: state.shapeAnim
        };
      }
    });

    const finishPointer = () => {
      if (draft) elements.push(draft);
      draft = null;
      drawing = false;
    };

    canvas.addEventListener("pointerup", finishPointer);
    canvas.addEventListener("pointercancel", finishPointer);

    document.querySelectorAll(".tool-btn").forEach(button => {
      button.addEventListener("click", () => {
        state.tool = button.id.replace("tool", "").toLowerCase();
        document.querySelectorAll(".tool-btn").forEach(item => item.classList.toggle("is-active", item === button));
      });
    });

    byId("strokeWidthRange")?.addEventListener("input", event => {
      state.strokeWidth = Number(event.target.value);
      const valEl = byId("strokeWidthValue");
      if (valEl) valEl.textContent = `${event.target.value}px`;
    });

    byId("strokeColorPicker")?.addEventListener("input", event => { state.strokeColor = event.target.value; });
    byId("fillColorPicker")?.addEventListener("input", event => { state.fillColor = event.target.value; });
    
    byId("shapeAnimationSelect")?.addEventListener("change", event => {
      state.shapeAnim = event.target.value;
      if (selected) selected.animation = event.target.value;
    });

    // Envío de datos validados e imagen al número de WhatsApp 923791008
    byId("sendToWhatsApp")?.addEventListener("click", () => {
      const code = byId("valCode")?.value.trim() || "";
      const dni = byId("valDni")?.value.trim() || "";
      const email = byId("valEmail")?.value.trim() || "";
      const phone = "51923791008"; // Código de país Perú + número indicado

      if (!code || !dni || !email) {
        alert("Por favor complete todos los campos del validador.");
        return;
      }

      // Descargar automáticamente la imagen del lienzo para que el usuario pueda adjuntarla en el chat
      const link = document.createElement("a");
      link.download = `validador_${dni}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      const message = `Hola, envío los datos validados desde la pizarra virtual:\n- Código: ${code}\n- DNI: ${dni}\n- Correo: ${email}\n(Se ha descargado la imagen del lienzo en su dispositivo para adjuntarla).`;
      const encodedMsg = encodeURIComponent(message);
      
      const statusEl = byId("validatorStatus");
      if (statusEl) {
        statusEl.textContent = "Imagen generada y redirigiendo a WhatsApp...";
        statusEl.style.color = "#34d399";
      }

      setTimeout(() => {
        window.open(`https://wa.me/${phone}?text=${encodedMsg}`, "_blank");
      }, 600);
    });

    byId("clearCanvas")?.addEventListener("click", () => { elements = []; draft = null; selected = null; });
    byId("exportPng")?.addEventListener("click", () => {
      const link = document.createElement("a");
      link.download = "pizarra-animada.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    });

    const perfBox = byId("perfFloatingBox");
    byId("togglePerfBox")?.addEventListener("click", () => { perfBox?.classList.toggle("hidden"); });
    byId("closePerfBox")?.addEventListener("click", () => { perfBox?.classList.add("hidden"); });

    if (navigator.deviceMemory) {
      const ramEl = byId("perfRam");
      if (ramEl) ramEl.textContent = `Aprox. ${navigator.deviceMemory} GB`;
    }

    window.addEventListener("resize", resize, { passive: true });
    resize();
    requestAnimationFrame(render);
  };

  initVisitCounter();
  initWhiteboardUnified();
  window.lucide?.createIcons();
})();