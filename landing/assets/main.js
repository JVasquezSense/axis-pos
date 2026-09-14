/* ═══════════════════════════════════════════════════════════════
   Axis POS — landing. Sin dependencias.
   Edita CONFIG y listo: enlaces, WhatsApp y precios se inyectan solos.
   ═══════════════════════════════════════════════════════════════ */

const CONFIG = {
  appUrl: "https://axis-pos-nine.vercel.app",
  whatsapp: "573000000000",            // sin "+", con indicativo de país
  whatsappText: "Hola, quiero una demo de Axis POS",
  instagram: "https://instagram.com/axispos",
  linkedin: "https://linkedin.com/company/axispos",
  privacy: "#",
  terms: "#",
  // Precios por plan (COP / mes). Deja null para mostrar "Consultar".
  prices: { mini: null, starter: null, growth: null, enterprise: "A medida" },
};

const fmtCOP = (n) => "$" + Math.round(n).toLocaleString("es-CO");

/* ── enlaces desde CONFIG ─────────────────────────────────── */
const wa = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(CONFIG.whatsappText)}`;
const LINKS = {
  app: CONFIG.appUrl,
  demo: "#contacto",
  whatsapp: wa,
  instagram: CONFIG.instagram,
  linkedin: CONFIG.linkedin,
  privacy: CONFIG.privacy,
  terms: CONFIG.terms,
};
document.querySelectorAll("[data-link]").forEach((a) => {
  const href = LINKS[a.dataset.link];
  if (!href) return;
  a.href = href;
  if (/^https?:/.test(href)) { a.target = "_blank"; a.rel = "noopener"; }
});

/* ── precios ──────────────────────────────────────────────── */
document.querySelectorAll("[data-price]").forEach((el) => {
  const v = CONFIG.prices[el.dataset.price];
  const b = el.querySelector("b");
  const unit = el.querySelector("span");
  if (typeof v === "number") { b.textContent = fmtCOP(v); }
  else if (typeof v === "string") { b.textContent = v; if (unit) unit.hidden = true; }
  else { b.textContent = "Consultar"; if (unit) unit.hidden = true; }
});

/* ── nav ──────────────────────────────────────────────────── */
const nav = document.getElementById("nav");
const burger = document.getElementById("navBurger");
burger.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  burger.setAttribute("aria-expanded", String(open));
});
document.getElementById("navLinks").addEventListener("click", (e) => {
  if (e.target.tagName === "A") { nav.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); }
});
const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 24);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ── reveal on scroll (fallback sin GSAP) ─────────────────── */
// Con GSAP cargado, animations.js toma el control de .reveal; esto solo
// corre si el CDN no responde, para que la página nunca quede en blanco.
const HAS_GSAP = typeof window.gsap !== "undefined";
const revealer = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const el = en.target;
    const delay = Number(el.dataset.delay || 0);
    setTimeout(() => el.classList.add("is-in"), delay);
    revealer.unobserve(el);
  });
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
if (!HAS_GSAP) {
  document.querySelectorAll(".reveal").forEach((el) => revealer.observe(el));
  // Lo que ya está en pantalla al cargar se muestra sin esperar al observer.
  window.addEventListener("load", () => {
    document.querySelectorAll(".reveal:not(.is-in)").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("is-in");
    });
  });
}

/* ── contadores del mockup ────────────────────────────────── */
const countUp = (el) => {
  const target = Number(el.dataset.count);
  const prefix = el.dataset.prefix || "";
  const suffix = el.dataset.suffix || "";
  const t0 = performance.now();
  const dur = 1400;
  const tick = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    const v = Math.round(target * eased);
    el.textContent = prefix + (prefix === "$" ? v.toLocaleString("es-CO") : v) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
const mock = document.querySelector(".hero__mock");
if (mock) {
  const bars = document.getElementById("bars");
  const heights = [18, 26, 22, 40, 62, 55, 48, 70, 88, 96, 74, 58, 44, 66, 82];
  bars.innerHTML = heights.map((h, i) => `<i style="--h:${h}%;--i:${i}"></i>`).join("");
  window.axisCountUp = () => mock.querySelectorAll("[data-count]").forEach(countUp);
  if (!HAS_GSAP) {
    const once = new IntersectionObserver((en) => {
      if (!en[0].isIntersecting) return;
      window.axisCountUp();
      once.disconnect();
    }, { threshold: 0.3 });
    once.observe(mock);
  }
}

/* ── scroll sincronizado (plataforma) ─────────────────────── */
const syncLinks = [...document.querySelectorAll("#syncList a")];
const features = syncLinks.map((a) => document.getElementById(a.dataset.target)).filter(Boolean);
const setActive = (id) => syncLinks.forEach((a) => a.classList.toggle("is-active", a.dataset.target === id));
const spy = new IntersectionObserver((entries) => {
  // Manda la tarjeta más cercana al centro de la pantalla.
  const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
  if (visible[0]) setActive(visible[0].target.id);
}, { rootMargin: "-35% 0px -45% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] });
features.forEach((f) => spy.observe(f));
syncLinks.forEach((a) => a.addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById(a.dataset.target)?.scrollIntoView({ behavior: "smooth", block: "center" });
}));

/* ── tabs de roles ────────────────────────────────────────── */
const tabs = document.getElementById("roleTabs");
if (tabs) {
  tabs.querySelectorAll("[data-tab]").forEach((btn) => btn.addEventListener("click", () => {
    tabs.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
    tabs.querySelectorAll("[data-panel]").forEach((p) => p.classList.toggle("is-active", p.dataset.panel === btn.dataset.tab));
  }));
}

/* ── FAQ: solo uno abierto ────────────────────────────────── */
const faq = document.getElementById("faqList");
if (faq) {
  faq.querySelectorAll("details").forEach((d) => d.addEventListener("toggle", () => {
    if (d.open) faq.querySelectorAll("details").forEach((o) => { if (o !== d) o.open = false; });
  }));
}

/* ── formulario → WhatsApp ────────────────────────────────── */
const form = document.getElementById("demoForm");
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let ok = true;
    form.querySelectorAll("input[required]").forEach((i) => {
      const bad = !i.value.trim();
      i.classList.toggle("is-error", bad);
      if (bad) ok = false;
    });
    if (!ok) return;
    const d = Object.fromEntries(new FormData(form).entries());
    const msg = `Hola, soy ${d.nombre} de ${d.restaurante}. Quiero una demo de Axis POS. Mi WhatsApp: ${d.telefono}`;
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    form.reset();
  });
  form.querySelectorAll("input").forEach((i) => i.addEventListener("input", () => i.classList.remove("is-error")));
}

document.getElementById("year").textContent = new Date().getFullYear();
