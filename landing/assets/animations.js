/* ═══════════════════════════════════════════════════════════════
   Axis POS — animaciones GSAP + ScrollTrigger.
   Si el CDN no carga, main.js mantiene el reveal básico por CSS.
   ═══════════════════════════════════════════════════════════════ */
(() => {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add("has-gsap");

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ease = "power3.out";

  /* ── utilidades ──────────────────────────────────────────── */
  // Parte un titular en líneas (por <br>) envueltas en máscaras.
  const splitLines = (el) => {
    if (el.dataset.split) return el.querySelectorAll(".line__in");
    const parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = parts.map((p) => `<span class="line"><span class="line__in">${p.trim()}</span></span>`).join("");
    el.dataset.split = "1";
    return el.querySelectorAll(".line__in");
  };

  if (reduce) {
    // Sin movimiento: todo visible y listo.
    gsap.set(".reveal", { opacity: 1, y: 0 });
    window.axisCountUp?.();
    return;
  }

  /* ── barra de progreso ───────────────────────────────────── */
  const bar = document.createElement("div");
  bar.className = "progress";
  document.body.appendChild(bar);
  gsap.to(bar, { scaleX: 1, ease: "none", scrollTrigger: { scrub: 0.3, start: 0, end: "max" } });

  /* ── intro: nav + hero ───────────────────────────────────── */
  const intro = gsap.timeline({ defaults: { ease } });
  const h1Lines = splitLines(document.querySelector(".hero__title"));
  gsap.set(".hero__copy, .hero__mock", { opacity: 1, y: 0 });

  intro
    .from("#nav", { y: -24, opacity: 0, duration: 0.8 }, 0)
    .from(".hero__glow", { scale: 0.6, opacity: 0, duration: 1.6, stagger: 0.1, ease: "power2.out" }, 0)
    .from(".hero .eyebrow", { y: 14, opacity: 0, duration: 0.6 }, 0.25)
    .from(h1Lines, { yPercent: 110, duration: 1, stagger: 0.12, ease: "power4.out" }, 0.35)
    .from(".hero__lead", { y: 20, opacity: 0, duration: 0.8 }, 0.8)
    .from(".hero__cta .btn", { y: 16, opacity: 0, duration: 0.6, stagger: 0.08 }, 0.95)
    .from(".hero__proof li", { y: 12, opacity: 0, duration: 0.5, stagger: 0.08 }, 1.1)
    .from(".device", { y: 60, opacity: 0, rotateY: -18, rotateX: 8, transformPerspective: 1400, duration: 1.4, ease: "power3.out" }, 0.5)
    .from(".device__bar", { opacity: 0, duration: 0.4 }, 1.0)
    .from(".dash__side span", { x: -10, opacity: 0, stagger: 0.05, duration: 0.4 }, 1.05)
    .from(".dash__head", { y: 8, opacity: 0, duration: 0.5 }, 1.1)
    .from(".kpi", { y: 18, opacity: 0, scale: 0.96, stagger: 0.08, duration: 0.6 }, 1.15)
    .from(".dash__row .panel", { y: 18, opacity: 0, stagger: 0.08, duration: 0.6 }, 1.35)
    .add(() => window.axisCountUp?.(), 1.3);

  // La franja de proof cuenta sola.
  document.querySelectorAll(".hero__proof b").forEach((b) => {
    const m = b.textContent.match(/(\d+)/);
    if (!m) return;
    const target = Number(m[1]);
    const tpl = b.textContent;
    const obj = { v: 0 };
    gsap.to(obj, { v: target, duration: 1.4, delay: 1.2, ease: "power2.out", onUpdate: () => { b.textContent = tpl.replace(m[1], Math.round(obj.v)); } });
  });

  /* ── hero: parallax con el mouse y al hacer scroll ───────── */
  const hero = document.querySelector(".hero");
  const qx = gsap.quickTo(".device", "rotationY", { duration: 0.8, ease: "power2.out" });
  const qy = gsap.quickTo(".device", "rotationX", { duration: 0.8, ease: "power2.out" });
  const gx = gsap.quickTo(".hero__glow--a", "x", { duration: 1.2, ease: "power2.out" });
  const gy = gsap.quickTo(".hero__glow--a", "y", { duration: 1.2, ease: "power2.out" });
  if (window.matchMedia("(pointer: fine)").matches) {
    hero.addEventListener("mousemove", (e) => {
      const r = hero.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      qx(-6 + nx * 10);
      qy(2 - ny * 8);
      gx(nx * 60);
      gy(ny * 60);
    });
    hero.addEventListener("mouseleave", () => { qx(-6); qy(2); gx(0); gy(0); });
  }
  gsap.to(".hero__mock", { y: -80, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
  gsap.to(".hero__copy", { y: -40, opacity: 0.35, ease: "none", scrollTrigger: { trigger: hero, start: "40% top", end: "bottom top", scrub: true } });
  gsap.to(".hero__grid", { backgroundPosition: "0px 200px", ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });

  /* ── encabezados de sección: líneas enmascaradas ─────────── */
  document.querySelectorAll(".sheet__head, .sec__head").forEach((head) => {
    head.classList.remove("reveal");
    const lines = splitLines(head.querySelector(".h2"));
    const tl = gsap.timeline({ scrollTrigger: { trigger: head, start: "top 80%" }, defaults: { ease } });
    tl.from(head.querySelector(".eyebrow"), { y: 12, opacity: 0, duration: 0.5 })
      .from(lines, { yPercent: 110, duration: 0.9, stagger: 0.1, ease: "power4.out" }, 0.1);
    const lead = head.querySelector(".lead");
    if (lead) tl.from(lead, { y: 16, opacity: 0, duration: 0.7 }, 0.5);
  });

  /* ── hojas blancas: entran escalando como una tarjeta ────── */
  document.querySelectorAll(".sheet").forEach((sheet) => {
    gsap.from(sheet, {
      scale: 0.96, borderRadius: 48, opacity: 0.6, ease: "power2.out",
      scrollTrigger: { trigger: sheet, start: "top 95%", end: "top 55%", scrub: true },
    });
  });

  /* ── plataforma: tarjetas con parallax en el visual ──────── */
  document.querySelectorAll(".feature").forEach((f) => {
    f.classList.remove("reveal");
    const visual = f.querySelector(".feature__visual");
    const inner = visual.firstElementChild;
    gsap.from(f, { y: 60, opacity: 0, duration: 0.9, ease, scrollTrigger: { trigger: f, start: "top 85%" } });
    gsap.from(inner, { scale: 0.85, opacity: 0, duration: 1, ease: "back.out(1.4)", scrollTrigger: { trigger: f, start: "top 75%" } });
    gsap.to(inner, { y: -24, ease: "none", scrollTrigger: { trigger: f, start: "top bottom", end: "bottom top", scrub: true } });
    gsap.to(visual, { backgroundPosition: "100% 100%", ease: "none", scrollTrigger: { trigger: f, start: "top bottom", end: "bottom top", scrub: true } });
  });
  // Mesas: laten las ocupadas.
  gsap.to(".tb.is-busy", { boxShadow: "0 0 0 6px rgba(232,67,47,.25)", repeat: -1, yoyo: true, duration: 1.2, stagger: 0.3, ease: "sine.inOut" });
  // Comanda nueva: entra deslizando.
  gsap.from(".kds__card--new", { x: 40, opacity: 0, duration: 0.8, ease: "back.out(1.6)", scrollTrigger: { trigger: "#f-kds", start: "top 60%" } });
  // Reporte: barras crecen.
  gsap.from(".report__bars i", { scaleY: 0, transformOrigin: "bottom", stagger: 0.06, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: "#f-rep", start: "top 65%" } });
  // Kardex: filas.
  gsap.from(".kardex tr", { x: -16, opacity: 0, stagger: 0.08, duration: 0.5, ease, scrollTrigger: { trigger: "#f-inv", start: "top 65%" } });
  // Costeo: líneas.
  gsap.from(".cost > div", { y: 10, opacity: 0, stagger: 0.1, duration: 0.5, ease, scrollTrigger: { trigger: "#f-rec", start: "top 65%" } });
  gsap.from(".split__p", { y: 20, opacity: 0, stagger: 0.1, duration: 0.6, ease: "back.out(1.5)", scrollTrigger: { trigger: "#f-caja", start: "top 65%" } });

  /* ── roles: contenedor + cambio de tab animado ───────────── */
  const tabs = document.getElementById("roleTabs");
  if (tabs) {
    tabs.classList.remove("reveal");
    gsap.from(tabs, { y: 50, opacity: 0, duration: 0.9, ease, scrollTrigger: { trigger: tabs, start: "top 85%" } });
    tabs.querySelectorAll("[data-tab]").forEach((btn) => btn.addEventListener("click", () => {
      const panel = tabs.querySelector(".tabs__panel.is-active");
      if (!panel) return;
      gsap.fromTo(panel.querySelector("h3"), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease });
      gsap.fromTo(panel.querySelector("p"), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, delay: 0.08, ease });
      gsap.fromTo(panel.querySelectorAll(".checks li"), { x: -12, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, stagger: 0.07, delay: 0.15, ease });
    }));
  }

  /* ── capacidades: batch en cascada + glow que sigue al mouse ─ */
  const caps = gsap.utils.toArray(".cap");
  caps.forEach((c) => c.classList.remove("reveal"));
  ScrollTrigger.batch(caps, {
    start: "top 88%",
    onEnter: (els) => gsap.fromTo(els, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease, overwrite: true }),
  });
  gsap.set(caps, { opacity: 0 });
  caps.forEach((c) => c.addEventListener("mousemove", (e) => {
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", `${e.clientX - r.left}px`);
    c.style.setProperty("--my", `${e.clientY - r.top}px`);
  }));
  gsap.to(".cap__ico", { y: -3, repeat: -1, yoyo: true, duration: 1.6, stagger: 0.2, ease: "sine.inOut" });

  /* ── planes: entran en cascada, el destacado levita ──────── */
  const plans = gsap.utils.toArray(".plan");
  plans.forEach((p) => p.classList.remove("reveal"));
  gsap.from(plans, { y: 50, opacity: 0, duration: 0.8, stagger: 0.12, ease, scrollTrigger: { trigger: ".plans", start: "top 85%" } });
  gsap.to(".plan--hot", { y: -8, repeat: -1, yoyo: true, duration: 2.4, ease: "sine.inOut", delay: 1 });

  /* ── FAQ ─────────────────────────────────────────────────── */
  const faq = document.getElementById("faqList");
  if (faq) {
    faq.classList.remove("reveal");
    gsap.from(faq.querySelectorAll("details"), { y: 20, opacity: 0, duration: 0.6, stagger: 0.08, ease, scrollTrigger: { trigger: faq, start: "top 85%" } });
    faq.querySelectorAll("details").forEach((d) => d.addEventListener("toggle", () => {
      if (d.open) gsap.fromTo(d.querySelector("p"), { y: -8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease });
    }));
  }

  /* ── CTA: tarjeta + brillo respirando ─────────────────────── */
  const cta = document.querySelector(".cta__card");
  if (cta) {
    cta.classList.remove("reveal");
    gsap.from(cta, { y: 60, opacity: 0, scale: 0.97, duration: 1, ease, scrollTrigger: { trigger: cta, start: "top 85%" } });
    gsap.from(".cta__form > *", { y: 16, opacity: 0, stagger: 0.08, duration: 0.6, ease, scrollTrigger: { trigger: cta, start: "top 70%" } });
    gsap.to(".cta__glow", { opacity: 0.55, scale: 1.15, repeat: -1, yoyo: true, duration: 3, ease: "sine.inOut" });
  }

  /* ── footer ──────────────────────────────────────────────── */
  gsap.from(".footer__inner > *, .footer__legal", { y: 20, opacity: 0, stagger: 0.12, duration: 0.7, ease, scrollTrigger: { trigger: ".footer", start: "top 90%" } });

  /* ── lo que quedó con .reveal genérico ───────────────────── */
  gsap.utils.toArray(".reveal").forEach((el) => {
    gsap.fromTo(el, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease, delay: Number(el.dataset.delay || 0) / 1000, scrollTrigger: { trigger: el, start: "top 88%" } });
  });

  /* ── botones magnéticos ──────────────────────────────────── */
  if (window.matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll(".btn--primary, .fab").forEach((btn) => {
      const mx = gsap.quickTo(btn, "x", { duration: 0.4, ease: "power3.out" });
      const my = gsap.quickTo(btn, "y", { duration: 0.4, ease: "power3.out" });
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * 0.25);
        my((e.clientY - (r.top + r.height / 2)) * 0.25);
      });
      btn.addEventListener("mouseleave", () => { mx(0); my(0); });
    });
  }

  /* ── FAB: aparece pasado el hero ─────────────────────────── */
  gsap.set(".fab", { y: 80, opacity: 0 });
  ScrollTrigger.create({
    start: "top -60%",
    onEnter: () => gsap.to(".fab", { y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.6)" }),
    onLeaveBack: () => gsap.to(".fab", { y: 80, opacity: 0, duration: 0.4 }),
  });

  // Las fuentes cambian alturas: recalcula posiciones cuando cargan.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
})();
