(() => {
  "use strict";

  const byId = id => document.getElementById(id);

  const initVisitCounter = () => {
    const visits = Number(localStorage.getItem("app_visits") || 0) + 1;
    localStorage.setItem("app_visits", String(visits));
    byId("visitCount").textContent = String(visits);
  };

  const initTabs = () => {
    const buttons = document.querySelectorAll(".tab-btn");
    const contents = document.querySelectorAll(".tab-content");
    buttons.forEach(button => button.addEventListener("click", () => {
      buttons.forEach(item => item.classList.toggle("is-active", item === button));
      contents.forEach(content => content.classList.toggle("is-active", content.id === button.dataset.target));
      window.dispatchEvent(new Event("resize"));
    }));
  };

  const initDomAnimations = () => {
    const cards = document.querySelectorAll(".anim-card");
    const speed = byId("domSpeed");
    const updateSpeed = () => {
      const multiplier = Number(speed.value);
      document.documentElement.style.setProperty("--anim-speed", `${0.8 / multiplier}s`);
      byId("domSpeedValue").textContent = `${multiplier}x`;
    };
    cards.forEach(card => card.addEventListener("click", () => {
      const className = `anim-${card.dataset.anim}`;
      const active = card.classList.contains(className);
      cards.forEach(item => item.classList.remove("anim-bounce", "anim-pulse", "anim-rotate"));
      if (!active) card.classList.add(className);
      byId("domStatus").textContent = active ? "Animación detenida." : `Animación ${card.dataset.anim} aplicada al elemento DOM seleccionado.`;
    }));
    speed.addEventListener("input", updateSpeed);
    updateSpeed();
  };

  const initWhiteboard = () => {
    const canvas = byId("whiteboardCanvas");
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const state = { width: 0, height: 0, dpr: 1, tool: "select", strokeWidth: 3, strokeColor: "#1e1e1e", fillColor: "#e0f2fe" };
    let elements = [];
    let draft = null;
    let drawing = false;
    let lastTime = performance.now();
    let frames = 0;
    let elapsed = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      state.width = rect.width; state.height = rect.height; state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * state.dpr)); canvas.height = Math.max(1, Math.floor(rect.height * state.dpr));
      context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    };
    let selected = null;
    let dragOffset = { x: 0, y: 0 };
    const draw = element => {
      context.save(); context.strokeStyle = element.strokeColor; context.fillStyle = element.fillColor; context.lineWidth = element.strokeWidth;
      if (element.type === "pencil") { context.beginPath(); element.points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)); context.stroke(); }
      if (element.type === "rectangle") { context.fillRect(element.x, element.y, element.w, element.h); context.strokeRect(element.x, element.y, element.w, element.h); }
      if (element.type === "circle") { context.beginPath(); context.arc(element.x, element.y, element.radius, 0, Math.PI * 2); context.fill(); context.stroke(); }
      if (element.type === "text") { context.font = `${element.fontSize}px ${element.fontFamily}`; context.fillStyle = element.strokeColor; context.fillText(element.text, element.x, element.y); }
      if (element === selected) { const bounds = getBounds(element); context.setLineDash([5, 4]); context.strokeStyle = "#3b82f6"; context.strokeRect(bounds.x - 6, bounds.y - 6, bounds.width + 12, bounds.height + 12); }
      context.restore();
    };
    const getBounds = element => {
      if (element.type === "circle") return { x: element.x - element.radius, y: element.y - element.radius, width: element.radius * 2, height: element.radius * 2 };
      if (element.type === "pencil") { const xs = element.points.map(point => point.x); const ys = element.points.map(point => point.y); const x = Math.min(...xs); const y = Math.min(...ys); return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }; }
      if (element.type === "text") return { x: element.x, y: element.y - element.fontSize, width: element.text.length * element.fontSize * 0.6, height: element.fontSize };
      return { x: Math.min(element.x, element.x + element.w), y: Math.min(element.y, element.y + element.h), width: Math.abs(element.w), height: Math.abs(element.h) };
    };
    const containsPoint = (element, point) => {
      const bounds = getBounds(element); const padding = Math.max(8, state.strokeWidth * 2);
      if (element.type === "circle") return Math.hypot(point.x - element.x, point.y - element.y) <= element.radius + padding;
      return point.x >= bounds.x - padding && point.x <= bounds.x + bounds.width + padding && point.y >= bounds.y - padding && point.y <= bounds.y + bounds.height + padding;
    };
    const render = time => {
      const delta = Math.min((time - lastTime) / 1000, 0.05); lastTime = time; frames += 1; elapsed += delta;
      if (elapsed >= 0.5) { const currentFps = Math.round(frames / elapsed); byId("perfFps").textContent = String(currentFps); frames = 0; elapsed = 0; if (performance.memory) byId("perfMemory").textContent = `${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB`; window.__recordPerformanceSample?.(currentFps); }
      context.clearRect(0, 0, state.width, state.height); elements.forEach(draw); if (draft) draw(draft); requestAnimationFrame(render);
    };
    const pointFromEvent = event => { const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
    canvas.addEventListener("pointerdown", event => {
      const point = pointFromEvent(event); canvas.setPointerCapture(event.pointerId); drawing = true;
      if (state.tool === "eraser") { elements = elements.filter(element => !containsPoint(element, point)); drawing = false; }
      else if (state.tool === "text") { const text = window.prompt("Escribe el texto para el lienzo:"); if (text?.trim()) elements.push({ type: "text", text: text.trim(), x: point.x, y: point.y, fontSize: Math.max(14, state.strokeWidth * 5), fontFamily: "Trebuchet MS", strokeColor: state.strokeColor, fillColor: state.fillColor, strokeWidth: state.strokeWidth }); drawing = false; }
      else if (state.tool === "select") { selected = [...elements].reverse().find(element => containsPoint(element, point)) || null; if (selected) { const bounds = getBounds(selected); dragOffset = { x: point.x - bounds.x, y: point.y - bounds.y }; } }
      else draft = { type: state.tool, strokeColor: state.strokeColor, fillColor: state.fillColor, strokeWidth: state.strokeWidth, x: point.x, y: point.y, w: 0, h: 0, radius: 0, points: [point] };
    });
    canvas.addEventListener("pointermove", event => { if (!drawing) return; const point = pointFromEvent(event); if (selected && state.tool === "select") { const bounds = getBounds(selected); const nextX = point.x - dragOffset.x; const nextY = point.y - dragOffset.y; const dx = nextX - bounds.x; const dy = nextY - bounds.y; if (selected.type === "pencil") selected.points.forEach(item => { item.x += dx; item.y += dy; }); else { selected.x += dx; selected.y += dy; } return; } if (!draft) return; if (draft.type === "pencil") draft.points.push(point); if (draft.type === "rectangle") { draft.w = point.x - draft.x; draft.h = point.y - draft.y; } if (draft.type === "circle") draft.radius = Math.hypot(point.x - draft.x, point.y - draft.y); });
    const finishPointer = () => { if (draft) elements.push(draft); draft = null; selected = null; drawing = false; };
    canvas.addEventListener("pointerup", finishPointer);
    canvas.addEventListener("pointercancel", finishPointer);
    document.querySelectorAll(".tool-btn").forEach(button => button.addEventListener("click", () => { state.tool = button.id.replace("tool", "").toLowerCase(); document.querySelectorAll(".tool-btn").forEach(item => item.classList.toggle("is-active", item === button)); }));
    byId("strokeWidthRange").addEventListener("input", event => { state.strokeWidth = Number(event.target.value); byId("strokeWidthValue").textContent = `${event.target.value}px`; });
    byId("strokeColorPicker").addEventListener("input", event => { state.strokeColor = event.target.value; });
    byId("fillColorPicker").addEventListener("input", event => { state.fillColor = event.target.value; });
    byId("clearCanvas").addEventListener("click", () => { elements = []; draft = null; });
    byId("exportPng").addEventListener("click", () => { const link = document.createElement("a"); link.download = "pizarra.png"; link.href = canvas.toDataURL("image/png"); link.click(); });
    window.addEventListener("resize", resize, { passive: true }); resize(); requestAnimationFrame(render);
  };

  const initRafExperiment = () => {
    const canvas = byId("rafCanvas");
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let particles = []; let pointer = { x: -100, y: -100 }; let paused = false; let frames = 0; let lastTime = performance.now(); let fpsTime = lastTime;
    const reset = () => { particles = Array.from({ length: 42 }, (_, index) => ({ x: (index * 47) % canvas.clientWidth, y: (index * 83) % canvas.clientHeight, vx: (index % 3 - 1) * 0.6, vy: (index % 2 ? 1 : -1) * 0.45, size: 2 + index % 4 })); };
    const resize = () => { const rect = canvas.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; context.setTransform(dpr, 0, 0, dpr, 0, 0); if (!particles.length) reset(); };
    const render = time => {
      const delta = Math.min((time - lastTime) / 16.67, 2); lastTime = time; frames += 1;
      if (time - fpsTime > 500) { byId("rafFps").textContent = String(Math.round(frames * 1000 / (time - fpsTime))); frames = 0; fpsTime = time; }
      if (!paused) particles.forEach(particle => { const dx = pointer.x - particle.x; const dy = pointer.y - particle.y; particle.vx += dx * 0.00008 * delta; particle.vy += dy * 0.00008 * delta; particle.x += particle.vx * delta; particle.y += particle.vy * delta; if (particle.x < 0 || particle.x > canvas.clientWidth) particle.vx *= -1; if (particle.y < 0 || particle.y > canvas.clientHeight) particle.vy *= -1; });
      context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight); particles.forEach(particle => { context.fillStyle = "#f7c59f"; context.beginPath(); context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); context.fill(); }); requestAnimationFrame(render);
    };
    canvas.addEventListener("pointermove", event => { const rect = canvas.getBoundingClientRect(); pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top }; });
    byId("rafToggle").addEventListener("click", event => { paused = !paused; event.currentTarget.innerHTML = paused ? '<i data-lucide="play"></i> Reanudar' : '<i data-lucide="pause"></i> Pausar'; window.lucide?.createIcons(); });
    byId("rafReset").addEventListener("click", reset); window.addEventListener("resize", resize, { passive: true }); resize(); requestAnimationFrame(render);
  };

  const initPerformance = () => {
    const chart = byId("performanceChart");
    const context = chart?.getContext("2d");
    const samples = [];
    let extracting = true;
    const resizeChart = () => { if (!chart || !context) return; const rect = chart.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2); chart.width = Math.max(1, rect.width * dpr); chart.height = Math.max(1, rect.height * dpr); context.setTransform(dpr, 0, 0, dpr, 0, 0); drawChart(); };
    const drawChart = () => {
      if (!chart || !context) return;
      const width = chart.clientWidth; const height = chart.clientHeight; context.clearRect(0, 0, width, height);
      context.strokeStyle = "#e6ebf1"; context.lineWidth = 1;
      for (let row = 1; row < 4; row++) { const y = height * row / 4; context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
      if (samples.length < 2) return;
      const max = Math.max(60, ...samples); const min = Math.min(0, ...samples); const step = width / (samples.length - 1);
      context.beginPath(); samples.forEach((value, index) => { const x = index * step; const y = height - ((value - min) / (max - min)) * (height - 12) - 6; index ? context.lineTo(x, y) : context.moveTo(x, y); });
      context.strokeStyle = "#e76f51"; context.lineWidth = 2; context.stroke();
      const lastX = (samples.length - 1) * step; const lastY = height - ((samples.at(-1) - min) / (max - min)) * (height - 12) - 6; context.fillStyle = "#e76f51"; context.beginPath(); context.arc(lastX, lastY, 3, 0, Math.PI * 2); context.fill();
    };
    window.__recordPerformanceSample = fps => { samples.push(fps); if (samples.length > 30) samples.shift(); drawChart(); byId("perfLoadTitle").textContent = "Datos actualizados"; byId("perfLoadStatus").innerHTML = "Muestras recibidas del navegador<span class=\"loading-dots\">...</span>"; extracting = false; };
    byId("refreshPerformance").addEventListener("click", () => { extracting = true; byId("perfLoadTitle").textContent = "Extrayendo datos"; byId("perfLoadStatus").innerHTML = "Sincronizando con el navegador<span class=\"loading-dots\">...</span>"; });
    window.addEventListener("resize", resizeChart, { passive: true });
    if (navigator.deviceMemory) { byId("perfRam").textContent = `Aprox. ${navigator.deviceMemory} GB`; byId("resourceNote").textContent = "RAM estimada por el navegador"; }
    if (!performance.memory) byId("perfMemory").textContent = "No expuesto";
    resizeChart();
  };

  initVisitCounter(); initTabs(); initDomAnimations(); initWhiteboard(); initRafExperiment(); initPerformance(); window.lucide?.createIcons();
})();
