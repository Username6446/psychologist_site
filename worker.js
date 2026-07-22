/**
 * worker.js
 * Безпечна версія без захардкоджених токенів
 */

const ALLOWED_ORIGIN = "*";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  // Додаємо параметр env для доступу до секретних змінних Cloudflare
  async fetch(request, env) {
    
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return jsonResponse({ success: false, error: "Метод не підтримується" }, 405);
    }

    try {
      const data = await request.json();
      const name = (data?.name || "").toString().trim();
      const contact = (data?.contact || "").toString().trim();
      const message = (data?.message || "").toString().trim();

      if (!name || !contact) {
        return jsonResponse(
          { success: false, error: "Заповніть обов'язкові поля (ім'я та контакт)" },
          400
        );
      }

      const telegramText =
        "📩 Нова заявка з сайту\n\n" +
        `👤 Ім'я: ${name}\n` +
        `📱 Контакт: ${contact}\n` +
        `💬 Запит: ${message || "—"}`;

      // Використовуємо ключі з об'єкта env (секрети Cloudflare)
      const telegramApiUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

      const telegramResponse = await fetch(telegramApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID, // Беремо ID з секретів
          text: telegramText,
        }),
      });

      if (!telegramResponse.ok) {
        const errorDetails = await telegramResponse.text();
        console.error("Telegram API error:", errorDetails);
        return jsonResponse(
          { success: false, error: "Не вдалося надіслати повідомлення в Telegram" },
          502
        );
      }

      return jsonResponse({ success: true }, 200);
    } catch (error) {
      console.error("Worker error:", error);
      return jsonResponse({ success: false, error: "Внутрішня помилка сервера" }, 500);
    }
  },
};

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}