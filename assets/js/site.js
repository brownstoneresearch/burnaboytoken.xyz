/* =========================================================
  site.js (shared)
  - Edit CONFIG once, everything syncs:
    contract, dex url, socials, airdrop date
  - Auto-wires:
    #contractText, #contractFooter
    #explorerLink, #footerContract, #quickToken, #wl_token
    #buyNow / any DEXTools href
    #airdropTicker / #airdropCountdown / #airdropChip
    roadmap progress + active phase (optional)
========================================================== */

(() => {
  const CONFIG = {
    tokenSymbol: "BURNA",
    chainLabel: "Ethereum (ERC-20)",
    contract: "0x00b8a9bb1dcab2cf2375284d70b39e6ef7d86aae",
    dexToolsUrl:
      "https://www.dextools.io/app/en/ether/pair-explorer/0x4dec3aaba65caf1c2ad64d411fc575a23297532fb714518659530bb012015db0",
    socials: {
      x: "https://x.com/burnadapp?s=21",
      telegram: "https://t.me/burnatokencommunity",
      youtube: "https://www.youtube.com/@burnadapp",
    },
    // Airdrop target (local time of visitor)
    airdropStart: "2025-11-14T00:00:00",
  };

  const ETH_ADDR_RE = /^0x[a-fA-F0-9]{40}$/;
  const $ = (id) => document.getElementById(id);

  const toastEl = $("toast");
  function showToast(html) {
    if (!toastEl) return;
    toastEl.innerHTML = html;
    toastEl.style.display = "block";
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => (toastEl.style.display = "none"), 2800);
  }

  // ----- Contract sync -----
  const contractText = $("contractText");
  const contractFooter = $("contractFooter");
  const copyBtn = $("copyBtn");

  function setContractText() {
    if (contractText && !contractText.dataset.locked) {
      contractText.textContent = CONFIG.contract;
    }
    if (contractFooter) contractFooter.textContent = CONFIG.contract;
  }

  function wireTokenLink(a, valid, addr) {
    if (!a) return;
    if (valid) {
      a.href = `https://etherscan.io/token/${addr}`;
      a.setAttribute("aria-disabled", "false");
      a.title = "Open on Etherscan (Token)";
    } else {
      a.href = "#";
      a.setAttribute("aria-disabled", "true");
      a.title = "Invalid contract address";
    }
  }

  function syncExplorerLinks() {
    const addr = (contractText?.textContent || CONFIG.contract).trim();
    const valid = ETH_ADDR_RE.test(addr);

    wireTokenLink($("explorerLink"), valid, addr);
    wireTokenLink($("footerContract"), valid, addr);
    wireTokenLink($("quickToken"), valid, addr);
    wireTokenLink($("wl_token"), valid, addr);

    if (contractFooter) contractFooter.textContent = addr || "—";
  }

  async function copyContract() {
    const addr = (contractText?.textContent || "").trim();
    if (!ETH_ADDR_RE.test(addr)) {
      showToast("<strong>Invalid contract address</strong>");
      return;
    }
    try {
      await navigator.clipboard.writeText(addr);
      showToast("Copied: <span class='mono' style='opacity:.9'>" + addr + "</span>");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = addr;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        showToast("Copied: <span class='mono' style='opacity:.9'>" + addr + "</span>");
      } catch {
        showToast("<strong>Copy failed.</strong> Copy manually.");
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  // ----- DEXTools link safety -----
  function hardenDexLinks() {
    const url = CONFIG.dexToolsUrl;
    document.querySelectorAll(`#buyNow, a[href="${url}"]`).forEach((a) => {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    });
  }

  // ----- Airdrop countdown -----
  function initAirdropCountdown() {
    const chip = $("airdropChip");
    const cd = $("airdropCountdown");
    const tk = $("airdropTicker");
    if (!chip && !tk && !cd) return;

    const target = new Date(CONFIG.airdropStart);
    const z = (n) => String(n).padStart(2, "0");

    function setLive() {
      if (chip) {
        chip.innerHTML = "Airdrop: <strong>Live</strong>";
        chip.classList.add("live");
      }
      if (tk) {
        tk.classList.add("live");
        tk.innerHTML = "<span class='dot'></span> Airdrop: Live";
      }
    }

    (function tick() {
      const diff = target - new Date();
      if (diff <= 0) {
        setLive();
        return;
      }

      const dd = Math.floor(diff / 86400000);
      const hh = Math.floor((diff % 86400000) / 3600000);
      const mm = Math.floor((diff % 3600000) / 60000);

      if (cd) cd.textContent = `• ${dd}d ${z(hh)}h ${z(mm)}m`;
      if (tk) tk.innerHTML = `<span class="dot"></span> Airdrop: Starts Nov 14, 2025 • ${dd}d ${z(hh)}h ${z(mm)}m`;

      setTimeout(tick, 15000);
    })();
  }

  // ----- Roadmap highlight + progress (optional) -----
  function initRoadmap() {
    const nodes = [...document.querySelectorAll(".tl [data-start]")];
    const bar = $("roadmapProgress");
    if (!nodes.length || !bar) return;

    const toDate = (v) => (v ? new Date(v + "T00:00:00") : null);
    const now = new Date();

    const items = nodes
      .map((el) => ({ el, start: toDate(el.dataset.start), end: toDate(el.dataset.end) }))
      .sort((a, b) => (a.start?.getTime() || 0) - (b.start?.getTime() || 0));

    for (let i = 0; i < items.length; i++) {
      if (!items[i].end && items[i + 1]?.start) {
        const d = new Date(items[i + 1].start);
        d.setDate(d.getDate() - 1);
        items[i].end = d;
      }
    }

    let active = items.find((it) => it.start && it.end && now >= it.start && now <= it.end);
    if (!active) {
      const past = items.filter((it) => it.start && now >= it.start);
      active = past.length ? past[past.length - 1] : items[0];
    }

    items.forEach((it) => it.el.classList.remove("is-active"));
    (active?.el || items[0].el).classList.add("is-active");

    const pct = ((items.indexOf(active) + 1) / items.length) * 100;
    bar.style.width = Math.max(0, Math.min(100, pct)) + "%";
  }

  // ----- Year -----
  function setYear() {
    const y = $("year");
    if (y) y.textContent = new Date().getFullYear();
  }

  // Init
  function init() {
    setYear();
    setContractText();
    syncExplorerLinks();
    hardenDexLinks();
    initAirdropCountdown();
    initRoadmap();

    copyBtn?.addEventListener("click", copyContract);

    // If contractText changes dynamically, re-wire
    if (window.MutationObserver && contractText) {
      new MutationObserver(syncExplorerLinks).observe(contractText, {
        characterData: true,
        childList: true,
        subtree: true,
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
