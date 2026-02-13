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

function closeDrawerIfOpen(){
  const links = document.getElementById("navLinks");
  const overlay = document.getElementById("navOverlay");
  const btn = document.getElementById("navToggle");
  if(links && links.classList.contains("open")){
    links.classList.remove("open");
    overlay && overlay.classList.remove("show");
    btn && btn.setAttribute("aria-expanded","false");
    document.body.classList.remove("nav-locked");
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
      closeDrawerIfOpen();
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
  const overlay = document.getElementById("navOverlay");
  const closeBtn = document.getElementById("drawerClose");
  if(!btn || !links) return;

  btn.setAttribute("aria-expanded","false");
  btn.setAttribute("aria-controls","navLinks");
  links.setAttribute("role","dialog");
  links.setAttribute("aria-modal","true");

  const focusableSel = 'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
  let lastFocused = null;

  let __scrollY = 0;
  const lockBody = () => {
    __scrollY = window.scrollY || 0;
    document.body.classList.add("nav-locked");
    document.body.style.position = "fixed";
    document.body.style.top = `-${__scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  };
    const unlockBody = () => {
    document.body.classList.remove("nav-locked");
    const top = document.body.style.top;
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    const y = top ? Math.abs(parseInt(top, 10)) : __scrollY;
    window.scrollTo(0, y || 0);
  };

  const open = ()=> {
    // reset drawer scroll for consistent navigation
    links.scrollTop = 0;
    lastFocused = document.activeElement;
    links.classList.add("open");
    overlay && overlay.classList.add("show");
    btn.setAttribute("aria-expanded","true");
    lockBody();
    // focus first actionable item inside drawer
    const first = links.querySelector(focusableSel);
    if(first) setTimeout(()=>first.focus(), 30);
  };

  const close = ()=> {
    links.classList.remove("open");
    overlay && overlay.classList.remove("show");
    btn.setAttribute("aria-expanded","false");
    unlockBody();
    if(lastFocused && lastFocused.focus) setTimeout(()=>lastFocused.focus(), 30);
  };

  const toggle = ()=> (links.classList.contains("open") ? close() : open());

  btn.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); toggle(); });
  closeBtn && closeBtn.addEventListener("click", (e)=>{ e.preventDefault(); close(); });
  overlay && overlay.addEventListener("click", close);

  // close on internal link click
  links.querySelectorAll("a").forEach(a=>a.addEventListener("click", ()=> close()));

  // Focus trap when drawer open
  document.addEventListener("keydown", (e)=>{
    if(!links.classList.contains("open")) return;
    if(e.key === "Escape"){ e.preventDefault(); close(); return; }
    if(e.key !== "Tab") return;
    const focusables = Array.from(links.querySelectorAll(focusableSel)).filter(el=>!el.hasAttribute("disabled"));
    if(!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  });

  // Prevent wheel/scroll from affecting body when open (some mobile browsers)
  links.addEventListener("wheel", (e)=>{ if(links.classList.contains("open")) e.stopPropagation(); }, {passive:true});
}



function shortAddr(a){
  if(!a || a.length < 10) return a || "";
  return a.slice(0,6) + "…" + a.slice(-4);
}

async function ensureBSC(){
  if(!window.ethereum) return;
  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  if(chainId === "0x38") return;
  try{
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x38" }]
    });
  }catch(e){
    if(e && (e.code === 4902 || String(e.message||"").includes("4902"))){
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x38",
          chainName: "BNB Smart Chain",
          nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
          rpcUrls: ["https://bsc-dataseed.binance.org/"],
          blockExplorerUrls: ["https://bscscan.com/"]
        }]
      });
    }else{
      throw e;
    }
  }
}

async function connectWallet(){
  const btn = document.getElementById("connectWallet");
  if(!window.ethereum){
    window.toast && window.toast("Install MetaMask to connect.");
    return;
  }
  try{
    await ensureBSC();
    const accts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const addr = (accts && accts[0]) ? accts[0] : null;
    if(addr){
      window.toast && window.toast("Wallet connected");
      if(btn){
        btn.textContent = shortAddr(addr);
        btn.classList.add("wallet");
      }
      localStorage.setItem("bv_wallet", addr);
      updateWalletUI();
    }
  }catch(e){
    console.error(e);
    window.toast && window.toast("Wallet connection canceled.");
    updateWalletUI();
  }
}

function initWalletButton(){
  const btn = document.getElementById("connectWallet");
  if(!btn) return;
  btn.addEventListener("click", connectWallet);
  const saved = localStorage.getItem("bv_wallet");
  if(saved) btn.textContent = shortAddr(saved);
  if(window.ethereum && window.ethereum.on){
    window.ethereum.on("chainChanged", ()=>{ updateWalletUI(); });
    window.ethereum.on("accountsChanged", (accs)=>{
      const a = (accs && accs[0]) ? accs[0] : "";
      if(a){
        localStorage.setItem("bv_wallet", a);
        btn.textContent = shortAddr(a);
        updateWalletUI();
      }else{
        localStorage.removeItem("bv_wallet");
        btn.textContent = "Connect Wallet";
        updateWalletUI();
      }
    });
  }
}



async function getBNBBalance(address){
  if(!window.ethereum || !address) return null;
  // use eth_getBalance on current chain
  const hex = await window.ethereum.request({
    method: "eth_getBalance",
    params: [address, "latest"]
  });
  // hex to decimal BNB
  const wei = BigInt(hex);
  const bnb = Number(wei) / 1e18; // safe enough for display
  return bnb;
}

function setStatusChip(el, text, tone){
  if(!el) return;
  el.textContent = text;
  el.classList.remove("good","bad");
  if(tone) el.classList.add(tone);
}

async function updateWalletUI(){
  const btn = document.getElementById("connectWallet");
  const chip = document.getElementById("walletStatusChip");
  const bal = document.getElementById("walletBalance");
  if(!btn && !chip && !bal) return;

  if(!window.ethereum){
    if(chip) setStatusChip(chip, "Wallet: Not installed", "bad");
    if(bal) bal.textContent = "—";
    if(btn) btn.textContent = "Connect Wallet";
        updateWalletUI();
    return;
  }

  // Determine chain
  let chainId = null;
  try{
    chainId = await window.ethereum.request({ method: "eth_chainId" });
  }catch(e){}

  const isBSC = (chainId === "0x38");
  if(chip){
    if(!isBSC) setStatusChip(chip, "Network: Wrong (Switch to BSC)", "bad");
    else setStatusChip(chip, "Network: BSC", "good");
  }

  // Determine address (connected)
  let addr = localStorage.getItem("bv_wallet") || "";
  try{
    const accts = await window.ethereum.request({ method: "eth_accounts" });
    if(accts && accts[0]) addr = accts[0];
  }catch(e){}

  if(!addr){
    if(btn) btn.textContent = "Connect Wallet";
        updateWalletUI();
    if(bal) bal.textContent = "—";
    return;
  }

  // Update button label
  if(btn){
    btn.textContent = shortAddr(addr);
    btn.classList.add("wallet");
  }

  // Balance (only meaningful on BSC)
  try{
    const b = await getBNBBalance(addr);
    if(bal){
      if(b === null || Number.isNaN(b)) bal.textContent = "—";
      else bal.textContent = b.toFixed(b >= 1 ? 3 : 4) + " BNB";
    }
  }catch(e){
    if(bal) bal.textContent = "—";
  }
}



function initLiveStatsAuto(){
  const box = document.querySelector("[data-live-stats]");
  if(!box) return;

  const stamp = document.createElement("span");
  stamp.className = "chip";
  stamp.style.marginLeft = "auto";
  stamp.textContent = "Updated: —";
  const row = box.querySelector(".chipRow");
  if(row) row.appendChild(stamp);

  let timer = null;
  const run = async ()=>{
    try{
      await initLiveStats();
      const d = new Date();
      stamp.textContent = "Updated: " + d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
    }catch(_){}
  };

  const io = new IntersectionObserver((entries)=>{
    const vis = entries.some(e=>e.isIntersecting);
    if(vis){
      run();
      timer = timer || setInterval(run, 45000);
    }else{
      if(timer){ clearInterval(timer); timer = null; }
    }
  }, {threshold: 0.2});

  io.observe(box);
}



function initDrawerAccordion(){
  const sections = Array.from(document.querySelectorAll("[data-accordion]"));
  if(!sections.length) return;

  const openSection = (sec)=>{
    sections.forEach(s=>{ if(s!==sec) s.classList.remove("open"); });
    sec.classList.add("open");
  };

  sections.forEach(sec=>{
    const head = sec.querySelector("[data-accordion-head]");
    if(!head) return;
    head.addEventListener("click", ()=>{
      const isOpen = sec.classList.contains("open");
      if(isOpen) sec.classList.remove("open");
      else openSection(sec);
    });
  });

  // Auto-open section that contains current active nav
  const active = document.querySelector("#navLinks .pill.active");
  if(active){
    const parent = active.closest("[data-accordion]");
    if(parent) parent.classList.add("open");
  }
}


document.addEventListener("DOMContentLoaded", ()=>{
  initTheme();
  initNavDrawer();
  initDrawerAccordion();
  initWalletButton();
  updateWalletUI();
  initThemeToggle();
  initPageTransitions();
  animateCounters();
  initLiveStats();
  initLiveStatsAuto();
  initModal();
});
