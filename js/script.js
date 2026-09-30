// ---- Edit this with your real Discord info ----
const DISCORD_HANDLE = "YourDiscordHandle"; // e.g. "elixerlabs" or "elixerlabs#1234"
const DISCORD_INVITE_URL = "https://discord.gg/5DpXs8u8KZ"; // e.g. "https://discord.gg/yourinvite" — leave blank to just show the handle
// ------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".footer-contact strong").forEach(el => {
    el.textContent = DISCORD_HANDLE;
  });

  // Jiggle things into view as you scroll past them.
  const revealTargets = document.querySelectorAll(
    ".card, .step, .faq-list details, .listing-stats li, .hero-stats > div, .review-card"
  );
  if (revealTargets.length && "IntersectionObserver" in window) {
    revealTargets.forEach(el => el.classList.add("js-reveal"));

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const el = entry.target;
          if (entry.isIntersecting) {
            el.classList.remove("in-view");
            void el.offsetWidth; // restart the animation every time it re-enters view
            el.classList.add("in-view");
          } else {
            el.classList.remove("in-view");
          }
        });
      },
      { threshold: 0.2 }
    );

    revealTargets.forEach(el => revealObserver.observe(el));
  }

  // Right-click an image to zoom in on the spot you clicked; right-click again to zoom back out.
  const resetZoom = (img) => img.classList.remove("img-zoomed");
  const setupRightClickZoom = (img) => {
    img.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (img.classList.contains("img-zoomed")) {
        resetZoom(img);
        return;
      }
      const rect = img.getBoundingClientRect();
      const originX = ((e.clientX - rect.left) / rect.width) * 100;
      const originY = ((e.clientY - rect.top) / rect.height) * 100;
      img.style.transformOrigin = `${originX}% ${originY}%`;
      img.classList.add("img-zoomed");
    });
  };

  // Listing detail page gallery: click a thumbnail to swap the main photo.
  const gallery = document.querySelector(".gallery");
  if (gallery) {
    const mainImg = gallery.querySelector(".gallery-main img");
    const thumbs = Array.from(gallery.querySelectorAll(".gallery-thumb"));
    const photos = thumbs.map(t => t.dataset.full || t.src);

    setupRightClickZoom(mainImg);

    thumbs.forEach((thumb, i) => {
      thumb.addEventListener("click", () => {
        mainImg.src = photos[i];
        resetZoom(mainImg);
        thumbs.forEach(t => t.classList.remove("active"));
        thumb.classList.add("active");
      });
    });

    // Lightbox: click any photo to view it full-size, with next/prev through all photos.
    const lightbox = document.getElementById("lightbox");
    if (lightbox) {
      const lightboxImg = lightbox.querySelector(".lightbox-img");
      const closeBtn = lightbox.querySelector(".lightbox-close");
      const prevBtn = lightbox.querySelector(".lightbox-prev");
      const nextBtn = lightbox.querySelector(".lightbox-next");
      let current = 0;

      setupRightClickZoom(lightboxImg);

      const show = (i) => {
        current = (i + photos.length) % photos.length;
        lightboxImg.src = photos[current];
        resetZoom(lightboxImg);
      };
      const open = (i) => {
        show(i);
        lightbox.classList.add("active");
      };
      const close = () => {
        lightbox.classList.remove("active");
        resetZoom(lightboxImg);
      };

      mainImg.addEventListener("click", () => {
        const activeIndex = thumbs.findIndex(t => t.classList.contains("active"));
        open(activeIndex >= 0 ? activeIndex : 0);
      });
      thumbs.forEach((thumb, i) => {
        thumb.addEventListener("click", () => open(i));
      });

      closeBtn.addEventListener("click", close);
      prevBtn.addEventListener("click", () => show(current - 1));
      nextBtn.addEventListener("click", () => show(current + 1));
      lightbox.addEventListener("click", (e) => {
        if (e.target === lightbox) close();
      });
      document.addEventListener("keydown", (e) => {
        if (!lightbox.classList.contains("active")) return;
        if (e.key === "Escape") close();
        if (e.key === "ArrowLeft") show(current - 1);
        if (e.key === "ArrowRight") show(current + 1);
      });
    }
  }

  const discordLink = document.getElementById("discord-link");
  if (discordLink) {
    if (DISCORD_INVITE_URL) {
      discordLink.href = DISCORD_INVITE_URL;
      discordLink.target = "_blank";
      discordLink.rel = "noopener";
    } else {
      discordLink.addEventListener("click", (e) => {
        e.preventDefault();
        navigator.clipboard?.writeText(DISCORD_HANDLE);
        discordLink.textContent = "Discord handle copied!";
        setTimeout(() => (discordLink.textContent = "Message on Discord"), 1800);
      });
    }
  }
});
