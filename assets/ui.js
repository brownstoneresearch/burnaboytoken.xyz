async function fetchDexScreener(tokenAddress){
  const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
  const r = await fetch(url, {cache:"no-store"});
  if(!r.ok) throw new Error("DexScreener fetch failed");
  return r.json();
}
function formatUSD(n){
  if(n === null || n === undefined || Number.isNaN(n)) return "—";
  const num = Number(n);
  if(num >= 1e9) return "$" + (num/1e9).toFixed(2) + "B";
  if(num >= 1e6) return "$" + (num/1e6).toFixed(2) + "M";
  if(num >= 1e3) return "$" + (num/1e3).toFixed(2) + "K";
  return "$" + num.toFixed(num >= 1 ? 2 : 6);
}
function formatNum(n){
  if(n === null || n === undefined || Number.isNaN(n)) return "—";
  const num = Number(n);
  if(num >= 1e9) return (num/1e9).toFixed(2) + "B";
  if(num >= 1e6) return (num/1e6).toFixed(2) + "M";
  if(num >= 1e3) return (num/1e3).toFixed(2) + "K";
  return String(Math.round(num));
}
function setTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("bv_theme", theme);
  const t = document.getElementById("themeToggleText");
  if(t) t.textContent = theme === "light" ? "Light" : "Dark";
}
function initTheme(){
  const saved = localStorage.getItem("bv_theme");
  setTheme(saved || "dark");
}
function initThemeToggle(){
  const btn = document.querySelector("[data-theme-toggle]");
  if(!btn) return;
  btn.addEventListener("click", ()=>{
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    setTheme(cur === "dark" ? "light" : "dark");
  });
}
function initPageTransitions(){
  document.querySelectorAll("a[href]").forEach(a=>{
    const href = a.getAttribute("href");
    if(!href) return;
    const isExternal = href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("#") || href.startsWith("assets/");
    if(isExternal) return;
    a.addEventListener("click", (e)=>{
      if(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      document.body.classList.add("page-leave");
      setTimeout(()=>{ window.location.href = href; }, 180);
    });
  });
  document.body.classList.add("page-enter");
}
function animateCounters(){
  const els = document.querySelectorAll("[data-count-to]");
  if(!els.length) return;
  const io = new IntersectionObserver((entries)=>{
    for(const en of entries){
      if(!en.isIntersecting) continue;
      const el = en.target;
      io.unobserve(el);
      const target = Number(el.getAttribute("data-count-to") || "0");
      const prefix = el.getAttribute("data-count-prefix") || "";
      const suffix = el.getAttribute("data-count-suffix") || "";
      const dur = 900;
      const start = performance.now();
      const tick = (t)=>{
        const p = Math.min(1, (t - start)/dur);
        const val = target*(1 - Math.pow(1-p, 3));
        el.textContent = prefix + formatNum(val) + suffix;
        if(p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, {threshold: 0.35});
  els.forEach(el=>io.observe(el));
}
async function initLiveStats(){
  const box = document.querySelector("[data-live-stats]");
  if(!box) return;
  const addr = (window.CONFIG && window.CONFIG.contract) ? window.CONFIG.contract : null;
  if(!addr) return;

  const status = box.querySelector("[data-live-status]");
  const priceEl = box.querySelector("[data-live-price]");
  const liqEl = box.querySelector("[data-live-liquidity]");
  const volEl = box.querySelector("[data-live-volume]");
  const fdvEl = box.querySelector("[data-live-fdv]");
  const pairEl = box.querySelector("[data-live-pair]");
  const chgEl = box.querySelector("[data-live-change]");

  const setStatus = (txt, type)=>{
    if(!status) return;
    status.textContent = txt;
    status.classList.remove("good","bad");
    if(type) status.classList.add(type);
  };

  try{
    setStatus("Loading live market data…");
    const data = await fetchDexScreener(addr);
    const pairs = (data && data.pairs) ? data.pairs : [];
    if(!pairs.length){
      setStatus("No live pair data yet (liquidity not detected).", "bad");
      return;
    }
    pairs.sort((a,b)=> (Number(b.liquidity?.usd||0) - Number(a.liquidity?.usd||0)));
    const p = pairs[0];
    setStatus("Live market data", "good");
    if(priceEl) priceEl.textContent = formatUSD(p.priceUsd);
    if(liqEl) liqEl.textContent = formatUSD(p.liquidity?.usd);
    if(volEl) volEl.textContent = formatUSD(p.volume?.h24);
    if(fdvEl) fdvEl.textContent = formatUSD(p.fdv);
    if(pairEl) pairEl.textContent = `${(p.dexId||"DEX").toUpperCase()} • ${(p.chainId||"BSC").toUpperCase()}`;
    if(chgEl){
      const ch = p.priceChange?.h24;
      if(ch === undefined || ch === null) chgEl.textContent = "—";
      else{
        const num = Number(ch);
        chgEl.textContent = (num>0?"+":"") + num.toFixed(2) + "%";
      }
    }
  }catch(e){
    console.error(e);
    setStatus("Live market data unavailable.", "bad");
  }
}
function initModal(){
  const back = document.getElementById("modalBack");
  if(!back) return;
  const close = ()=> back.classList.remove("show");
  back.addEventListener("click",(e)=>{ if(e.target === back) close(); });
  document.querySelectorAll("[data-modal-close]").forEach(b=>b.addEventListener("click", close));
  document.addEventListener("keydown",(e)=>{ if(e.key === "Escape") close(); });

  document.querySelectorAll("[data-open-modal]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      back.classList.add("show");
      const first = back.querySelector("input,textarea,select,button");
      if(first) setTimeout(()=>first.focus(), 50);
    });
  });

  const form = document.getElementById("applyForm");
  if(form){
    form.addEventListener("submit",(e)=>{
      e.preventDefault();
      const fd = new FormData(form);
      const obj = {};
      fd.forEach((v,k)=> obj[k]=String(v).trim());
      if(!obj.name || !obj.email || !obj.category || !obj.message){
        window.toast && window.toast("Please complete the required fields.");
        return;
      }
      const key = "bv_submissions";
      const cur = JSON.parse(localStorage.getItem(key) || "[]");
      cur.unshift({ ...obj, ts: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(cur).slice(0, 200000));
      form.reset();
      close();
      window.toast && window.toast("Submitted. We’ll reach out if selected.");
    });
  }
}

function initNavDrawer(){
  const btn = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  if(!btn || !links) return;

  const close = ()=> links.classList.remove("open");
  const toggle = ()=> links.classList.toggle("open");

  btn.addEventListener("click", (e)=>{ e.stopPropagation(); toggle(); });

  links.querySelectorAll("a").forEach(a=>a.addEventListener("click", close));

  document.addEventListener("click",(e)=>{
    if(links.classList.contains("open")){
      if(!links.contains(e.target) && !btn.contains(e.target)) close();
    }
  });

  document.addEventListener("keydown",(e)=>{ if(e.key === "Escape") close(); });
}


document.addEventListener("DOMContentLoaded", ()=>{
  initTheme();
  initNavDrawer();
  initThemeToggle();
  initPageTransitions();
  animateCounters();
  initLiveStats();
  initModal();
});
