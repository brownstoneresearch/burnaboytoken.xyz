/* Burnaverse Protocol (BUV) — app.js */
/* Static site helpers: copy contract, add token, active nav, quick link wiring */

window.CONFIG = {
  baseUrl: "https://burnaverseprotocol.xyz",
  contract: "0xd14Ec02A022D2BD4117a0EEba966423253a48ad1",
  tokenName: "Burnaverse Protocol",
  tokenSymbol: "BUV",
  decimals: 18,
  tokenImage: "", // optional: https://burnaverseprotocol.xyz/assets/logo.png
  bscscanToken: "https://bscscan.com/token/0xd14Ec02A022D2BD4117a0EEba966423253a48ad1",
  bscscanContract: "https://bscscan.com/address/0xd14Ec02A022D2BD4117a0EEba966423253a48ad1",
  pancakeswap: "https://pancakeswap.finance/" // replace with exact swap URL when live
};

window.toast = function toast(msg){
  const el = document.getElementById("toast");
  if(!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=>el.classList.remove("show"), 1800);
}

async function copyContract(){
  try{
    await navigator.clipboard.writeText(window.CONFIG.contract);
    toast("Contract copied");
  }catch(e){
    const t = document.createElement("textarea");
    t.value = window.CONFIG.contract;
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    t.remove();
    toast("Contract copied");
  }
}

async function addTokenToWallet(){
  if(!window.ethereum){
    toast("No wallet detected (install MetaMask)");
    return;
  }
  try{
    const wasAdded = await window.ethereum.request({
      method:"wallet_watchAsset",
      params:{
        type:"ERC20",
        options:{
          address: window.CONFIG.contract,
          symbol: window.CONFIG.tokenSymbol,
          decimals: window.CONFIG.decimals,
          image: window.CONFIG.tokenImage || undefined
        }
      }
    });
    toast(wasAdded ? "Token added to wallet" : "Token not added");
  }catch(err){
    console.error(err);
    toast("Could not add token");
  }
}

function setActiveNav(){
  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll("[data-nav]").forEach(a=>{
    const target = (a.getAttribute("href") || "").toLowerCase();
    if(target === path) a.classList.add("active");
  });
}

function fillGlobals(){
  document.querySelectorAll("[data-contract]").forEach(el=>el.textContent = window.CONFIG.contract);
  document.querySelectorAll("[data-symbol]").forEach(el=>el.textContent = window.CONFIG.tokenSymbol);
  document.querySelectorAll("[data-name]").forEach(el=>el.textContent = window.CONFIG.tokenName);

  document.querySelectorAll("[data-copy-contract]").forEach(btn=>btn.addEventListener("click", copyContract));
  document.querySelectorAll("[data-add-token]").forEach(btn=>btn.addEventListener("click", addTokenToWallet));

  document.querySelectorAll("[data-link='bscscan-token']").forEach(a=>a.href = window.CONFIG.bscscanToken);
  document.querySelectorAll("[data-link='bscscan-contract']").forEach(a=>a.href = window.CONFIG.bscscanContract);
  document.querySelectorAll("[data-link='pancakeswap']").forEach(a=>a.href = window.CONFIG.pancakeswap);

  // Social links (placeholders unless you set them)
  const socials = {
    telegram: "#",
    x: "#",
    discord: "#",
    medium: "#",
    email: "mailto:contact@burnaverseprotocol.xyz",
    whitepaper: "#",
    audit: "#",
    github: "#"
  };

  Object.entries(socials).forEach(([k,v])=>{
    document.querySelectorAll(`[data-social='${k}']`).forEach(a=>{
      a.href = v;
      if(v && v.startsWith("mailto:")) return;
      a.target = "_blank";
      a.rel = "noreferrer";
      if(!v || v === "#"){
        a.addEventListener("click",(e)=>{e.preventDefault(); toast("Link not set yet");});
      }
    });
  });

  const y = document.getElementById("year");
  if(y) y.textContent = new Date().getFullYear();
}

document.addEventListener("DOMContentLoaded", ()=>{
  setActiveNav();
  fillGlobals();
});
