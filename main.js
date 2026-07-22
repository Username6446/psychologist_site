/**
 * main.js
 * -----------------------------------------------------------------------
 * Логіка фронтенду лендінгу психолога:
 *   1. Ініціалізація бібліотек (Lucide Icons, AOS)
 *   2. Мобільне меню (гамбургер)
 *   3. Ефект glassmorphism у хедері при скролі
 *   4. Відправка контактної форми на Cloudflare Worker
 * -----------------------------------------------------------------------
 */

// ============================================================================
// 0. НАЛАШТУВАННЯ
// ============================================================================

// ВАЖЛИВО: після деплою Worker'а (див. кроки в README.md) вставте сюди його URL.
// Приклад: "https://psychologist-form.your-subdomain.workers.dev"
const WORKER_URL = "https://YOUR_WORKER_SUBDOMAIN.workers.dev";

// ============================================================================
// 1. ІНІЦІАЛІЗАЦІЯ БІБЛІОТЕК
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  // Малюємо іконки Lucide: замінює всі <i data-lucide="..."> на готові SVG-іконки.
  if (window.lucide) {
    lucide.createIcons();
  }

  // Ініціалізуємо анімації появи блоків при скролі (AOS.js).
  if (window.AOS) {
    AOS.init({
      duration: 700,
      once: true, // кожен блок анімується лише один раз, при першій появі
      easing: "ease-out-cubic",
      // Вимикаємо анімації для людей, які обрали "менше руху" в налаштуваннях ОС
      disable: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
  }
});

// ============================================================================
// 2. МОБІЛЬНЕ МЕНЮ (Hamburger Toggle)
// ============================================================================

const mobileMenuButton = document.getElementById("mobile-menu-button");
const mobileMenu = document.getElementById("mobile-menu");
const iconMenuOpen = document.getElementById("icon-menu-open");
const iconMenuClose = document.getElementById("icon-menu-close");

/**
 * Відкриває/закриває мобільне меню та перемикає іконку "гамбургер" <-> "хрестик".
 */
function toggleMobileMenu() {
  const isCurrentlyOpen = mobileMenu.classList.contains("flex");

  mobileMenu.classList.toggle("hidden", isCurrentlyOpen);
  mobileMenu.classList.toggle("flex", !isCurrentlyOpen);

  iconMenuOpen.classList.toggle("hidden", !isCurrentlyOpen);
  iconMenuClose.classList.toggle("hidden", isCurrentlyOpen);

  mobileMenuButton.setAttribute("aria-expanded", String(!isCurrentlyOpen));
}

if (mobileMenuButton) {
  mobileMenuButton.addEventListener("click", toggleMobileMenu);
}

// Закриваємо мобільне меню автоматично, коли людина натискає на посилання в ньому
if (mobileMenu) {
  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (mobileMenu.classList.contains("flex")) {
        toggleMobileMenu();
      }
    });
  });
}

// ============================================================================
// 3. ЕФЕКТ ХЕДЕРА ПРИ СКРОЛІ (Glassmorphism)
// ============================================================================

const siteHeader = document.getElementById("site-header");
const SCROLL_THRESHOLD_PX = 20; // після скількох пікселів скролу вмикати ефект

function updateHeaderOnScroll() {
  if (window.scrollY > SCROLL_THRESHOLD_PX) {
    siteHeader.classList.add("header-scrolled");
  } else {
    siteHeader.classList.remove("header-scrolled");
  }
}

window.addEventListener("scroll", updateHeaderOnScroll);
updateHeaderOnScroll(); // одразу перевіряємо позицію (напр. при перезавантаженні сторінки)

// ============================================================================
// 4. ВІДПРАВКА КОНТАКТНОЇ ФОРМИ
// ============================================================================

const contactForm = document.getElementById("contact-form");
const submitButton = document.getElementById("submit-button");
const submitButtonText = document.getElementById("submit-button-text");
const formStatusMessage = document.getElementById("form-status-message");

const BUTTON_TEXT_DEFAULT = "Надіслати";
const BUTTON_TEXT_LOADING = "Відправка...";

/**
 * Показує повідомлення про статус відправки форми під кнопкою.
 * @param {string} message - текст повідомлення
 * @param {boolean} isError - true для помилки (текст стане теракотовим)
 */
function setFormStatusMessage(message, isError) {
  formStatusMessage.textContent = message;
  formStatusMessage.classList.remove("hidden", "text-terracotta", "text-graphite");
  formStatusMessage.classList.add(isError ? "text-terracotta" : "text-graphite");
}

/**
 * Обробляє сабміт форми: блокує кнопку, надсилає дані на Cloudflare Worker,
 * показує результат і повертає форму в звичайний стан.
 */
async function handleContactFormSubmit(event) {
  event.preventDefault(); // не даємо сторінці перезавантажитись

  const formData = new FormData(contactForm);
  const payload = {
    name: (formData.get("name") || "").trim(),
    contact: (formData.get("contact") || "").trim(),
    message: (formData.get("message") || "").trim(),
  };

  // Переводимо кнопку у стан завантаження, щоб людина не натиснула двічі
  submitButton.disabled = true;
  submitButtonText.textContent = BUTTON_TEXT_LOADING;
  formStatusMessage.classList.add("hidden");

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      contactForm.reset();
      setFormStatusMessage(
        "Дякую, заявка відправлена! Я зв'яжусь з вами найближчим часом.",
        false
      );
    } else {
      setFormStatusMessage(
        "Щось пішло не так. Спробуйте, будь ласка, ще раз або напишіть напряму в Telegram.",
        true
      );
    }
  } catch (error) {
    // Помилка мережі, або Worker ще не задеплоєний / URL не оновлено
    console.error("Form submission error:", error);
    setFormStatusMessage(
      "Не вдалося надіслати форму. Перевірте інтернет-з'єднання та спробуйте знову.",
      true
    );
  } finally {
    submitButton.disabled = false;
    submitButtonText.textContent = BUTTON_TEXT_DEFAULT;
  }
}

if (contactForm) {
  contactForm.addEventListener("submit", handleContactFormSubmit);
}