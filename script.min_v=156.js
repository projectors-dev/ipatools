(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const pages = $$(".page");
  const internalNavLinks = $$('.bottom-nav-glass .nav-link[data-target]');

  function openPage(targetId, updateHash = false) {
    const target = document.getElementById(targetId);
    if (!target) return;

    pages.forEach(page => page.classList.remove("active"));
    target.classList.add("active");

    internalNavLinks.forEach(link => {
      link.classList.toggle("active", link.dataset.target === targetId);
    });

    if (targetId === "page-tools") {
      loadIPATools();
    }

    if (updateHash) {
      const reverseMap = {
        "page-library": "installer",
        "page-tools": "library",
        "page-signer": "signer",
        "page-source": "jailbreak"
      };
      const hash = reverseMap[targetId];
      if (hash && location.hash !== `#${hash}`) {
        history.replaceState(null, "", `#${hash}`);
      }
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  internalNavLinks.forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      openPage(link.dataset.target, true);
    });
  });


  /* ================= HEADER ACTIONS ================= */
  const openSearchButton = document.getElementById("openSearch");

  openSearchButton?.addEventListener("click", () => {
    openPage("page-tools", true);
    setTimeout(() => {
      const field = document.getElementById("toolsSearch");
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      field?.focus();
    }, 280);
  });

  /* Home category tabs: ESign / Scarlet / KSign / SideInstaller / Certs only. */
  $$("#page-library .sub-tab[data-cat]").forEach(tab => {
    tab.addEventListener("click", () => {
      const container = tab.closest(".page-container");
      if (!container) return;

      $$(".sub-tabs .sub-tab", container).forEach(item => {
        item.classList.toggle("active", item === tab);
      });

      $$(".cat-list", container).forEach(list => {
        list.style.display = list.id === `cat-${tab.dataset.cat}` ? "" : "none";
      });
    });
  });

  /* Visual-only redesign of the existing DNS metadata. Text meaning is unchanged. */
  const dnsShield = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 20 5v6c0 5.2-3.4 9.6-8 11-4.6-1.4-8-5.8-8-11V5l8-3Zm0 3.1L7 7v4c0 3.5 2 6.6 5 7.8 3-1.2 5-4.3 5-7.8V7l-5-1.9Z"/>
      <path d="M8.6 10.7c2-1.8 4.8-1.8 6.8 0l-1.2 1.3a3.3 3.3 0 0 0-4.4 0l-1.2-1.3Zm2 2.2a2.1 2.1 0 0 1 2.8 0L12 14.4l-1.4-1.5Z"/>
    </svg>`;

  $$("#page-library .cat-list .card").forEach(card => {
    const title = $("h3", card)?.textContent.trim() || "";
    const meta = $("small.meta, .meta", card);

    if (card.closest("#cat-certificate")) {
      card.classList.add("download-only-card");
    }

    if (!meta) return;

    const raw = meta.textContent.replace(/\s+/g, " ").trim();

    if (title === "AppleJr DNS" && /Anti-Revoke/i.test(raw)) {
      meta.classList.add("dns-meta-redesign", "anti-revoke-meta");
      meta.innerHTML = `
        <span class="required-pill">Required</span>
        <span class="dns-name">Anti-Revoke</span>`;
      return;
    }

    const match = raw.match(/^DNS\s*[•·-]\s*(.+)$/i);
    if (!match) return;

    const dnsName = match[1].trim();
    meta.classList.add("dns-meta-redesign");
    meta.innerHTML = `
      <span class="dns-pill">${dnsShield}<span>DNS</span></span>
      <span class="dns-name"></span>`;
    $(".dns-name", meta).textContent = dnsName;
  });

  /* ================= FEATURED HERO ================= */
  const slider = document.getElementById("featuredSlider");
  let heroCards = slider ? $$(".hero-card:not(.hero-loop-clone)", slider) : [];
  const heroDots = $$("#heroDots .hero-dot");
  let heroIndex = 0;
  let heroTimer = null;
  let heroScrollTimer = null;
  let loopResetTimer = null;
  let isPointerDown = false;

  /* Clone the first slide once so 4 -> 1 feels like a real forward loop
     instead of visibly scrolling backwards across the whole carousel. */
  let heroLoopClone = null;
  if (slider && heroCards.length > 1) {
    slider.querySelectorAll(".hero-loop-clone").forEach(node => node.remove());
    heroLoopClone = heroCards[0].cloneNode(true);
    heroLoopClone.classList.add("hero-loop-clone");
    heroLoopClone.setAttribute("aria-hidden", "true");
    heroLoopClone.removeAttribute("data-feature");
    heroLoopClone.querySelectorAll("a,button").forEach(el => el.setAttribute("tabindex", "-1"));
    slider.appendChild(heroLoopClone);
  }

  function updateHeroDots(index) {
    const realIndex = ((index % heroCards.length) + heroCards.length) % heroCards.length;
    heroDots.forEach((dot, i) => dot.classList.toggle("active", i === realIndex));
  }

  function heroTargetLeft(card) {
    if (!slider || !card) return 0;
    const sliderRect = slider.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    return slider.scrollLeft + (cardRect.left - sliderRect.left);
  }

  function scrollHeroTo(index, behavior = "smooth") {
    if (!slider || !heroCards.length) return;
    clearTimeout(loopResetTimer);

    /* Forward loop: after the last real card, animate to the cloned first card. */
    if (index >= heroCards.length && heroLoopClone) {
      heroIndex = 0;
      updateHeroDots(0);
      slider.scrollTo({ left: heroTargetLeft(heroLoopClone), behavior });
      loopResetTimer = setTimeout(() => {
        slider.scrollTo({ left: heroTargetLeft(heroCards[0]), behavior: "auto" });
      }, 650);
      return;
    }

    const normalized = ((index % heroCards.length) + heroCards.length) % heroCards.length;
    heroIndex = normalized;
    updateHeroDots(normalized);
    slider.scrollTo({ left: heroTargetLeft(heroCards[normalized]), behavior });
  }

  function nextHero() {
    if (!heroCards.length) return;
    if (heroIndex === heroCards.length - 1) scrollHeroTo(heroCards.length);
    else scrollHeroTo(heroIndex + 1);
  }

  function restartHeroAutoplay() {
    clearInterval(heroTimer);
    if (heroCards.length < 2 || document.hidden) return;
    heroTimer = setInterval(nextHero, 5000);
  }

  heroDots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      scrollHeroTo(index);
      restartHeroAutoplay();
    });
  });

  if (slider && heroCards.length) {
    updateHeroDots(0);
    restartHeroAutoplay();

    slider.addEventListener("scroll", () => {
      if (!isPointerDown) return;
      clearTimeout(heroScrollTimer);
      heroScrollTimer = setTimeout(() => {
        let bestIndex = 0;
        let bestDistance = Infinity;
        heroCards.forEach((card, index) => {
          const distance = Math.abs(heroTargetLeft(card) - slider.scrollLeft);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
          }
        });
        heroIndex = bestIndex;
        updateHeroDots(bestIndex);
      }, 90);
    }, { passive: true });

    slider.addEventListener("pointerdown", () => {
      isPointerDown = true;
      clearInterval(heroTimer);
      clearTimeout(loopResetTimer);
    });

    const finishHeroGesture = () => {
      if (!isPointerDown) return;
      isPointerDown = false;
      let bestIndex = 0;
      let bestDistance = Infinity;
      heroCards.forEach((card, index) => {
        const distance = Math.abs(heroTargetLeft(card) - slider.scrollLeft);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });
      scrollHeroTo(bestIndex);
      restartHeroAutoplay();
    };

    slider.addEventListener("pointerup", finishHeroGesture);
    slider.addEventListener("pointercancel", finishHeroGesture);
    slider.addEventListener("mouseleave", () => {
      if (isPointerDown) finishHeroGesture();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clearInterval(heroTimer);
      else restartHeroAutoplay();
    });
  }

  const modal = document.getElementById("featureModal");
  const modalBody = document.getElementById("modalBody");
  const closeBtn = document.getElementById("modalClose");

  heroCards.forEach(card => {
    card.addEventListener("click", event => {
      const key = card.dataset.feature;
      if (key === "delta") {
        if (event.target.closest("a")) return;
        return;
      }
      if (key === "library") {
        openPage("page-tools", true);
        return;
      }
      if (key === "signer") {
        openPage("page-signer", true);
        return;
      }
      if (key !== "esign" || !modal || !modalBody) return;

      const destination = "/post/unable-to-verify.html";
      modal.style.display = "flex";
      modalBody.innerHTML = "<p>⏳ Loading...</p>";
      fetch(destination)
        .then(response => {
          if (!response.ok) throw new Error("Article not found");
          return response.text();
        })
        .then(html => {
          const cleaned = html
            .replace(/<head[\s\S]*?<\/head>/gi, "")
            .replace(/<script[\s\S]*?<\/script>/gi, "");
          modalBody.innerHTML = `<div class="article-body">${cleaned}</div>`;
        })
        .catch(error => {
          modalBody.innerHTML = `<p>Unable to load this guide.</p><p>${error.message}</p>`;
        });
    });
  });

  closeBtn?.addEventListener("click", () => { modal.style.display = "none"; });
  modal?.addEventListener("click", event => {
    if (event.target === modal) modal.style.display = "none";
  });

  /* ================= SIGNER ================= */
  const certToggle = document.getElementById("certToggle");
  const serverCertSection = document.getElementById("serverCertSection");
  const manualCertSection = document.getElementById("manualCertSection");

  certToggle?.addEventListener("change", () => {
    if (serverCertSection) serverCertSection.style.display = certToggle.checked ? "none" : "block";
    if (manualCertSection) manualCertSection.style.display = certToggle.checked ? "block" : "none";
  });

  const dropZone = document.getElementById("dropZone");
  const ipaInput = document.getElementById("ipa_file");

  dropZone?.addEventListener("click", () => ipaInput?.click());
  dropZone?.addEventListener("dragover", event => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });
  dropZone?.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
  dropZone?.addEventListener("drop", event => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
    if (!ipaInput || !event.dataTransfer.files.length) return;
    ipaInput.files = event.dataTransfer.files;
    dropZone.textContent = `📦 ${ipaInput.files[0].name}`;
  });
  ipaInput?.addEventListener("change", () => {
    if (ipaInput.files.length) dropZone.textContent = `📦 ${ipaInput.files[0].name}`;
  });

  const form = document.getElementById("uploadForm");
  const submitBtn = document.getElementById("submitBtn");
  const loader = document.getElementById("loader");
  const resultBtns = document.getElementById("resultBtns");
  const installLink = document.getElementById("installLink");
  const downloadLink = document.getElementById("downloadLink");
  const progressBar = document.getElementById("progressBar");
  const progressFill = progressBar?.querySelector("div");

  let progressText = null;
  if (progressBar) {
    progressText = document.createElement("div");
    progressText.style.cssText = "text-align:center;margin-top:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;color:#7ab9ff";
    progressBar.insertAdjacentElement("afterend", progressText);
  }

  form?.addEventListener("submit", event => {
    event.preventDefault();

    if (!submitBtn || !loader || !progressBar || !progressFill) return;

    submitBtn.style.display = "none";
    loader.style.display = "block";
    progressBar.style.display = "block";
    progressFill.style.width = "0";
    if (progressText) progressText.textContent = "";

    const formData = new FormData(form);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/upload", true);

    const startedAt = Date.now();

    xhr.upload.addEventListener("progress", progressEvent => {
      if (!progressEvent.lengthComputable) return;

      const percent = (progressEvent.loaded / progressEvent.total) * 100;
      const seconds = Math.max((Date.now() - startedAt) / 1000, 0.1);
      const speed = (progressEvent.loaded / 1024 / 1024 / seconds).toFixed(2);
      const loadedMB = (progressEvent.loaded / 1024 / 1024).toFixed(1);
      const totalMB = (progressEvent.total / 1024 / 1024).toFixed(1);

      progressFill.style.width = `${percent}%`;
      if (progressText) progressText.textContent = `${percent.toFixed(1)}% (${loadedMB}/${totalMB} MB) • ${speed} MB/s`;
    });

    xhr.onload = () => {
      loader.style.display = "none";
      progressBar.style.display = "none";
      if (progressText) progressText.textContent = "";

      try {
        const response = JSON.parse(xhr.responseText);
        if (response.install_url && response.download_url) {
          installLink.href = response.install_url;
          downloadLink.href = response.download_url;
          resultBtns.style.display = "block";
        } else {
          alert("❌ Error Password.");
          submitBtn.style.display = "block";
        }
      } catch (_) {
        alert("❌ Error during signing.");
        submitBtn.style.display = "block";
      }
    };

    xhr.onerror = () => {
      alert("❌ Upload failed.");
      loader.style.display = "none";
      progressBar.style.display = "none";
      if (progressText) progressText.textContent = "";
      submitBtn.style.display = "block";
    };

    xhr.send(formData);
  });

  document.getElementById("signNewBtn")?.addEventListener("click", event => {
    event.preventDefault();
    window.location.reload();
  });

  /* ================= IPA LIBRARY ================= */
  /*
     AppleJR V155 — FastSign full repo via a local static snapshot.

     Upstream source (server sync only): https://fastsign.dev/repo.json
     Browser source: /assets/data/fastsign/manifest.json + chunk files

     Why this is intentionally NOT a direct browser fetch:
     - fastsign.dev/repo.json is cross-origin and currently blocked by CORS from AppleJR.
     - the full repo is large; downloading/parsing it for every visitor is wasteful.
     - sync-fastsign.sh downloads it once on the AppleJR server and writes compact chunks.
     - the browser loads only the compact chunks it actually needs; no full-repo background preload.
  */
  let ipaToolsData = [];
  let filteredIPATools = [];
  let ipaToolsVisible = 0;
  let ipaToolsLoading = false;
  let ipaToolsLoaded = false;

  const IPA_TOOLS_STEP = 8;
  const APPLEJR_IPA_BUILD = "156-fastsign-latest-only";
  const FASTSIGN_MANIFEST_URL = "/assets/data/fastsign/manifest.json";

  let fastSignManifest = null;
  let fastSignNextChunk = 0;
  let fastSignAllLoaded = false;
  let fastSignChunkLoading = null;
  let fastSignSearchToken = 0;
  let currentToolsCategory = "all";
  let currentToolsQuery = "";
  const fastSignKeys = new Set();

  function detectCategory(app) {
    const text = `${app.name || ""} ${app.bundleID || ""} ${app.bundleIdentifier || ""} ${app.localizedDescription || ""} ${app.subtitle || ""}`.toLowerCase();

    if (/emulator|emulation|retroarch|ppsspp|delta emulator|provenance|folium|utm|rpcs3|psx|ps2|ps3|ps4|ps5|switch emulator|dolphin/.test(text)) return "emulator";
    if (/jailbreak|dopamine|unc0ver|palera1n|checkra1n|taurine|sileo|zebra|bootstrap|serotonin|roothide/.test(text)) return "jailbreak";
    if (/game|launcher|minecraft|coin|legend|3d|zombie|township|block|farm|puzzle|roblox|gta|fps|racing|games|play|arcade/.test(text)) return "games";
    if (/instagram|gram|insta|facebook|badoo|tantan|tinder|wechat|chat|twitter|telegram|snapchat|messenger|nicegram|twitch|vk|tumblr|like|follower|follow|watushi|discord|whatsapp|tiktok/.test(text)) return "social-media";
    if (/music|audio|radio|piano|guitar|drum|vocal|song|sing|beat|eeve|spotify|player|sampler|dj|koala|speak|mix|garageband/.test(text)) return "music";
    if (/photo|video|studio|vsco|beauty|design|vn|vlog|face|procreate|camera|color|art|kinemaster|pic|picture|adobe|pixel|edit|editor|filter|tv|iptv|oldroll|eraser|capcut|reel|davinci/.test(text)) return "photo-video";
    return "tweak";
  }

  function normalizeFastSignCompact(app) {
    if (!app || typeof app !== "object") return null;

    const bundleIdentifier = app.bundleIdentifier || app.bundleID || app.identifier || "";
    const downloadURL = app.downloadURL || app.downloadUrl || app.download_url || app.url || "";
    if (!downloadURL) return null;

    return {
      name: app.name || bundleIdentifier || "App",
      iconURL: app.iconURL || app.icon || "",
      developerName: app.developerName || app.developer || app.author || "FastSign",
      downloadURL,
      category: app.category || detectCategory(app),
      versionDate: app.versionDate || app.date || app.releaseDate || app.fullDate || "",
      bundleIdentifier,
      sourceRepo: "FastSign",
      localizedDescription: app.localizedDescription || "",
      subtitle: app.subtitle || "",
      key: String(app.key || `${bundleIdentifier}|${app.name || ""}|${downloadURL}`).toLowerCase().trim()
    };
  }

  function addFastSignApps(rawApps) {
    if (!Array.isArray(rawApps) || !rawApps.length) return 0;
    let added = 0;

    for (const raw of rawApps) {
      const app = normalizeFastSignCompact(raw);
      if (!app || fastSignKeys.has(app.key)) continue;
      fastSignKeys.add(app.key);
      ipaToolsData.push(app);
      added++;
    }

    return added;
  }

  async function fetchJson(url, timeoutMs = 20000, cacheMode = "default") {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        credentials: "same-origin",
        cache: cacheMode,
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function loadFastSignManifest() {
    if (fastSignManifest) return fastSignManifest;

    /* manifest.json changes every sync, but your Nginx marks static files immutable.
       The tiny cache-busting query guarantees we always discover the newest
       timestamped chunk generation without disabling cache for the chunks. */
    const manifestUrl = `${FASTSIGN_MANIFEST_URL}?v=${Date.now()}`;
    const manifest = await fetchJson(manifestUrl, 15000, "no-store");
    if (!manifest || !Array.isArray(manifest.chunks) || !manifest.chunks.length) {
      throw new Error("FastSign local manifest is missing or empty");
    }

    fastSignManifest = manifest;
    return manifest;
  }

  function chunkUrl(name) {
    return `/assets/data/fastsign/${encodeURIComponent(name)}`;
  }

  async function loadNextFastSignChunk() {
    if (fastSignAllLoaded) return 0;
    if (fastSignChunkLoading) return fastSignChunkLoading;

    fastSignChunkLoading = (async () => {
      const manifest = await loadFastSignManifest();
      if (fastSignNextChunk >= manifest.chunks.length) {
        fastSignAllLoaded = true;
        return 0;
      }

      const file = manifest.chunks[fastSignNextChunk];
      const raw = await fetchJson(chunkUrl(file), 20000);
      const apps = Array.isArray(raw) ? raw : (Array.isArray(raw?.apps) ? raw.apps : []);
      const added = addFastSignApps(apps);

      fastSignNextChunk++;
      if (fastSignNextChunk >= manifest.chunks.length) fastSignAllLoaded = true;

      console.info(`[AppleJR IPA] FastSign chunk ${fastSignNextChunk}/${manifest.chunks.length}: +${added}, total ${ipaToolsData.length}`);
      return added;
    })().finally(() => {
      fastSignChunkLoading = null;
    });

    return fastSignChunkLoading;
  }

  async function ensureFastSignCount(minimum) {
    while (!fastSignAllLoaded && ipaToolsData.length < minimum) {
      await loadNextFastSignChunk();
    }
  }

  function appMatchesToolsFilter(app) {
    if (currentToolsCategory !== "all" && app.category !== currentToolsCategory) return false;
    if (!currentToolsQuery) return true;

    const haystack = `${app.name} ${app.developerName} ${app.category} ${app.bundleIdentifier || ""} ${app.localizedDescription || ""} ${app.subtitle || ""}`.toLowerCase();
    return currentToolsQuery.split(/\s+/).every(word => haystack.includes(word));
  }

  function rebuildFilteredIPATools() {
    filteredIPATools = ipaToolsData.filter(appMatchesToolsFilter);
  }

  async function ensureFilteredCount(minimum) {
    rebuildFilteredIPATools();
    while (!fastSignAllLoaded && filteredIPATools.length < minimum) {
      await loadNextFastSignChunk();
      rebuildFilteredIPATools();
    }
    return filteredIPATools.length;
  }

  async function loadIPATools() {
    const page = document.getElementById("page-tools");
    const grid = document.getElementById("toolsGrid");
    if (!page || !grid || ipaToolsLoading || ipaToolsLoaded) return;

    ipaToolsLoading = true;
    grid.innerHTML = '<div style="grid-column:1/-1;padding:26px;text-align:center;color:#7d8590;font-size:11px">⏳ Loading IPA Library...</div>';

    try {
      await loadFastSignManifest();
      await ensureFastSignCount(IPA_TOOLS_STEP);

      if (!ipaToolsData.length) throw new Error("FastSign local snapshot contains no usable apps");

      rebuildFilteredIPATools();
      ipaToolsVisible = 0;
      ipaToolsLoaded = true;
      renderIPATools(true);
    } catch (error) {
      console.error("IPA TOOLS ERROR:", error);
      grid.innerHTML = `
        <div style="grid-column:1/-1;padding:26px;text-align:center;color:#7d8590;font-size:11px;line-height:1.7">
          ❌ FastSign snapshot is not ready.<br>
          <span style="opacity:.72">Run sync-fastsign.sh once on the AppleJR server.</span>
        </div>`;
    } finally {
      ipaToolsLoading = false;
    }
  }

  window.__APPLEJR_IPA_BUILD__ = APPLEJR_IPA_BUILD;
  window.__APPLEJR_FASTSIGN_STATUS__ = async function () {
    const started = performance.now();
    const manifest = await fetchJson(`${FASTSIGN_MANIFEST_URL}?check=${Date.now()}`, 15000, "no-store");
    return {
      build: APPLEJR_IPA_BUILD,
      source: "https://fastsign.dev/repo.json",
      browserEndpoint: FASTSIGN_MANIFEST_URL,
      rawCount: Number(manifest.rawCount || manifest.count || 0),
      count: Number(manifest.count || 0),
      duplicatesRemoved: Number(manifest.duplicatesRemoved || 0),
      dedupe: manifest.dedupe || null,
      chunks: Array.isArray(manifest.chunks) ? manifest.chunks.length : 0,
      updatedAt: manifest.updatedAt || null,
      ms: Math.round(performance.now() - started)
    };
  };

  const SAFARI_DOWNLOAD_BRIDGE = "https://applejr.xyz/p/open-download.html?url=";
  function getSafariDownloadUrl(url) {
    if (!url) return "#";
    return url.startsWith("itms-services://") ? url : SAFARI_DOWNLOAD_BRIDGE + encodeURIComponent(url);
  }

  function renderIPATools(reset = false) {
    const grid = document.getElementById("toolsGrid");
    const loadMore = document.getElementById("toolsLoadMore");
    if (!grid || !loadMore) return;

    if (reset) {
      grid.innerHTML = "";
      ipaToolsVisible = 0;
    }

    const items = filteredIPATools.slice(ipaToolsVisible, ipaToolsVisible + IPA_TOOLS_STEP);

    items.forEach(app => {
      const card = document.createElement("article");
      card.className = "tool-card";

      const image = document.createElement("img");
      image.src = app.iconURL || "";
      image.alt = app.name || "IPA app";
      image.loading = "lazy";
      image.decoding = "async";

      const title = document.createElement("h4");
      title.textContent = app.name || "App";

      const developer = document.createElement("small");
      developer.textContent = app.developerName || "FastSign";

      const link = document.createElement("a");
      link.href = getSafariDownloadUrl(app.downloadURL);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Download";

      card.append(image, title, developer, link);
      grid.appendChild(card);
    });

    ipaToolsVisible += items.length;
    const mayHaveMore = ipaToolsVisible < filteredIPATools.length || !fastSignAllLoaded;
    loadMore.style.display = mayHaveMore ? "block" : "none";
  }

  document.getElementById("toolsLoadMore")?.addEventListener("click", async () => {
    const needed = ipaToolsVisible + IPA_TOOLS_STEP;
    try {
      await ensureFilteredCount(needed);
    } catch (error) {
      console.warn("[AppleJR IPA] Load More chunk failed:", error);
    }
    renderIPATools(false);
  });

  $$(".tool-cat").forEach(button => {
    button.addEventListener("click", async () => {
      $$(".tool-cat").forEach(item => item.classList.remove("active"));
      button.classList.add("active");

      currentToolsCategory = button.dataset.cat || "all";
      ipaToolsVisible = 0;

      try {
        await ensureFilteredCount(IPA_TOOLS_STEP);
      } catch (error) {
        console.warn("[AppleJR IPA] Category chunk scan paused:", error);
      }
      renderIPATools(true);
    });
  });

  let toolsSearchTimer = null;
  document.getElementById("toolsSearch")?.addEventListener("input", event => {
    clearTimeout(toolsSearchTimer);
    currentToolsQuery = event.target.value.toLowerCase().trim();
    const token = ++fastSignSearchToken;

    toolsSearchTimer = setTimeout(async () => {
      try {
        await ensureFilteredCount(IPA_TOOLS_STEP);
      } catch (error) {
        console.warn("[AppleJR IPA] Search chunk scan paused:", error);
      }
      if (token !== fastSignSearchToken) return;
      renderIPATools(true);
    }, 250);
  });

  /* Existing helper buttons inside IPA Library copy. */
  $$(".goto-library").forEach(button => {
    button.addEventListener("click", () => {
      openPage("page-library", true);
      const sub = button.dataset.sub;
      const tab = $(`#page-library .sub-tab[data-cat="${sub}"]`);
      tab?.click();
    });
  });

  $$(".goto-signer").forEach(button => {
    button.addEventListener("click", () => openPage("page-signer", true));
  });

  /* Soft press feedback for direct-install cards. */
  $$(".featured-item").forEach(item => {
    item.addEventListener("pointerdown", () => item.style.transform = "scale(.985)");
    ["pointerup", "pointercancel", "pointerleave"].forEach(type => {
      item.addEventListener(type, () => item.style.transform = "");
    });
  });

  /* Hash and existing ?page=signer compatibility. */
  const tabMap = {
    installer: "page-library",
    library: "page-tools",
    signer: "page-signer",
    jailbreak: "page-source"
  };

  function openRequestedTab() {
    const queryPage = new URLSearchParams(location.search).get("page");
    if (queryPage === "signer") {
      openPage("page-signer", false);
      return;
    }

    const hash = location.hash.replace(/^#/, "").trim().toLowerCase();
    if (tabMap[hash]) openPage(tabMap[hash], false);
  }

  window.addEventListener("hashchange", openRequestedTab);
  openRequestedTab();

  /* Existing AppleJr analytics preserved from production. */
  var _Hasync = window._Hasync || [];
  _Hasync.push(["Histats.start", "1,4981436,4,0,0,0,00010000"]);
  _Hasync.push(["Histats.fasi", "1"]);
  _Hasync.push(["Histats.track_hits", ""]);
  (function () {
    var hs = document.createElement("script");
    hs.type = "text/javascript";
    hs.async = true;
    hs.src = "//s10.histats.com/js15_as.js";
    (document.head || document.body).appendChild(hs);
  })();

})();

/* APPLEJR_REFRESH_BUTTON_START */
(function () {
  const button = document.getElementById("refreshButton");

  if (!button) return;

  button.addEventListener("click", function (event) {
    event.preventDefault();

    const url = new URL(window.location.href);

    url.searchParams.set(
      "refresh",
      Date.now().toString()
    );

    window.location.replace(url.toString());
  });
})();
/* APPLEJR_REFRESH_BUTTON_END */

