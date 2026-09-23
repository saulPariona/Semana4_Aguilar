# Laboratorio Web Avanzado: Arquitectura y Rendimiento (Semana 04)

**Estudiante:** Pariona Ramos Saul Anibal  
**Institución:** Universidad Nacional del Centro del Perú (UNCP)  
**Curso:** Desarrollo de Aplicaciones Web — Facultad de Ingeniería de Sistemas  

---

Aplicación web interactiva desarrollada como parte de la asignatura de **Desarrollo de Aplicaciones Web (IS093A)** de la Facultad de Ingeniería de Sistemas de la **Universidad Nacional del Centro del Perú (UNCP)**. Este proyecto implementa buenas prácticas de ingeniería frontend, optimización del DOM, manipulación eficiente de la API de Canvas y control riguroso del ciclo de renderizado.

---

## Tecnologías y Estándares Utilizados

* **Lenguaje:** JavaScript Moderno (ES6+) estrictamente tipado y estructurado en **Vanilla JS**.
* **Estructura:** HTML5 semántico con carga diferida de scripts mediante el atributo `defer`.
* **Estilos:** CSS3 modular con soporte para variables personalizadas dinámicas (`--anim-speed`).
* **Gráficos:** Canvas API 2D optimizado para pantallas de alta densidad de píxeles (Retina/DPR).

---

## Cumplimiento de la Guía Práctica (Semana 04)

La arquitectura técnica se alinea de manera directa con los cinco pilares exigidos en la práctica de desarrollo web:

1. **Estructuración y Carga Diferida:**
   * Archivos organizados en una estructura modular (`inde_3.html`, `styles_3.css`, `app_3.js`).
   * Carga óptima del DOM mediante script `defer` para evitar bloqueos en el navegador.

2. **Aislamiento de Scope (IIFE) y Closures:**
   * Uso estricto de **IIFE (Immediately Invoked Function Expression)** con modo estricto (`"use strict";`) para prevenir la contaminación del ámbito global.
   * Empleo de **Arrow Functions** y closures para la persistencia encapsulada del estado del lienzo y herramientas.

3. **Optimización del DOM y Rendimiento:**
   * Gestión eficiente de eventos y actualización de estilos mediante `classList.toggle` y variables CSS dinámicas para mitigar costos de *reflow* y *repaint*.

4. **Sincronización con el Ciclo de Renderizado:**
   * **Prohibición de `setInterval`** para animaciones; en su lugar, se implementó `requestAnimationFrame` acoplado al cálculo de **Delta Time (`delta`)** para garantizar fluidez independiente del hardware.
   * Escalado automático del contexto 2D para pantallas de alta definición.

5. **Depuración y Métricas en Tiempo Real:**
   * Monitoreo activo de fotogramas por segundo (FPS) en tiempo real.
   * Lectura opcional del consumo de memoria del navegador mediante `performance.memory`.
   * Control estricto del ciclo de vida de los listeners y limpieza de nodos para evitar fugas de memoria.
