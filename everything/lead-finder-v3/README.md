# Lead Finder v3 — Воркшоп по ИИ агентам

Четыре источника, один пайплайн. Меняешь `SOURCE=` в `.env` — всё остальное работает одинаково.

## Источники

| SOURCE | Библиотека | Что нужно | Сложность |
|---|---|---|---|
| `telegram` | gramjs (MTProto) | API ID + Hash на [my.telegram.org](https://my.telegram.org) | ⭐ |
| `youtube` | YouTube Data API v3 | API Key на [console.cloud.google.com](https://console.cloud.google.com) | ⭐ |
| `reddit` | snoowrap | App credentials на [reddit.com/prefs/apps](https://reddit.com/prefs/apps) | ⭐⭐ |
| `instagram` | Playwright + stealth | Логин/пароль аккаунта Instagram | ⭐⭐ |

> Twitter/X убран — платный с февраля 2026 (~$100/мес).

---

## Быстрый старт

```bash
# 1. Зависимости
npm install
npm run install-browsers   # скачивает Chromium для Playwright

# 2. Claude Code (токены с подписки, не с API)
npm install -g @anthropic-ai/claude-code
claude login

# 3. Конфиг
cp .env.example .env
# Выбери SOURCE= и заполни нужный блок

# 4. Запуск
npm start

# Только парсер (без Claude):
npm run parse-only
```

---

## Как работает Instagram парсер

Playwright открывает реальный Chromium, логинится в Instagram и перехватывает GraphQL-запросы пока скроллит комментарии.

```
Playwright (Chromium + stealth)
  → логин → instagram.com/p/POST/
  → скролл комментариев
  → перехват GraphQL /graphql/query → извлекаем JSON
  → собираем Comment[]
```

**Первый запуск** — Playwright попросит подождать пока он логинится. Сессия сохраняется в `instagram_session.json`, повторный вход не нужен.

**Если есть 2FA** — запусти с `IG_HEADLESS=false` в `.env`, откроется видимый браузер, введи код вручную.

**Stealth** — `playwright-extra` + `puppeteer-extra-plugin-stealth` маскируют браузер под обычного пользователя. Без stealth Instagram быстро блокирует headless Chromium.

---

## Структура проекта

```
pipeline.ts              — оркестратор (аналитик + копирайтер)
parsers/
  index.ts               — роутер по SOURCE=
  types.ts               — единый формат Comment / ParseResult
  youtube.ts             — YouTube Data API v3
  reddit.ts              — snoowrap
  instagram.ts           — Playwright + GraphQL перехват
telegram-parser.ts       — gramjs (Telegram)
.env.example             — шаблон конфига
instagram_session.json   — сессия Instagram (не коммить!)
.telegram_session        — сессия Telegram (не коммить!)
```

---

## Задания для воркшопа

**1 — Смени источник**
Поменяй `SOURCE=` в `.env`. Сравни качество лидов — где аудитория "горячее"?

**2 — Настрой ICP**
В `pipeline.ts` найди константу `ICP` и опиши своего реального клиента.

**3 — Смени тон**
`OFFER_TONE=экспертный` или `OFFER_TONE=прямой`.

**4 — Добавь валидатора**
После копирайтера добавь `stepValidate()` — он отклоняет шаблонные офферы.

**5 — Параллельный анализ**
Замени последовательный `stepAnalyze()` на `Promise.all()` по комментариям.

---

## Gitignore

```
.env
instagram_session.json
.telegram_session
leads_*.json
node_modules/
```
