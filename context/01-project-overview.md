# CONTEXT: Воркшоп по ИИ агентам + Kitana SDK
> Срез контекста для продолжения работы в Claude Code

---

## Что строим

Два параллельных трека:

### Трек 1 — Воркшоп "AI Agents from Scratch"
Офлайн, 2 часа, 12-20 технарей (знают JS/TS).  
Цель участника: уйти с пониманием как агенты устроены изнутри + рабочий код под свою задачу.

### Трек 2 — Kitana SDK
OSS пакет. Прокси к локальным AI CLI без API ключей.  
Уже опубликован: `@kitana-sdk/server` на npm.

---

## Технический стек

```
Google ADK          — оркестратор агентов
@kitana-sdk/server  — OpenAI-compatible HTTP сервер → claude CLI
@kitana-sdk/core    — detector + runner + failover + bible (в разработке)
gramjs              — парсер Telegram (MTProto)
Playwright          — парсер Instagram
YouTube Data API v3 — парсер YouTube (бесплатный)
snoowrap            — парсер Reddit
```

Twitter/X — убран (платный с февраля 2026).

---

## Kitana SDK — что уже есть

### @kitana-sdk/server (ОПУБЛИКОВАН)
OpenAI-compatible HTTP сервер.  
Под капотом вызывает `claude -p` через `@kitana-sdk/core`.

```bash
npx @kitana-sdk/server
# POST /v1/chat/completions  — OpenAI-compatible, stream: true
# GET  /v1/models
# GET  /health
```

Работает как drop-in провайдер для Google ADK через LiteLLM:
```
OPENAI_BASE_URL=http://localhost:4141/v1
OPENAI_API_KEY=kitana
MODEL=auto
```

### @kitana-sdk/core (В РАЗРАБОТКЕ)
Нужно написать:
- `detector.ts` — сканирует окружение (claude/ollama/gemini CLI)
- `runner.ts` — spawnSync вызов CLI, парсит ответ
- `failover.ts` — цепочка провайдеров из конфига
- `bible.ts` — TypeScript типы + I/O для `.kitana/bible/`
- `compressor.ts` — dense format сжатие контекста при переключении модели

### @kitana-sdk/adk (ПЛАНИРУЕТСЯ)
Адаптер чтобы Kitana выглядела как провайдер для Google ADK.  
Нужен для Electron приложения в будущем.

---

## Архитектура пайплайна (Lead Finder)

```
Источники (Telegram/YouTube/Reddit/Instagram)
      ↓ gramjs / YouTube API / snoowrap / Playwright
ParseResult { platform, comments[] }  ← единый формат
      ↓
Google ADK — SequentialAgent
  ├── Агент-аналитик   → топ-5 лидов по ICP → JSON
  ├── Агент-копирайтер → персональные офферы → JSON
  └── Агент-валидатор  → отклоняет шаблонные, переписывает
      ↓
Kitana.ask(prompt)
      ↓
detector → runner → failover
      ↓
claude CLI / ollama / gemini CLI
```

---

## Библия проекта

Живой документ на диске. Хранит состояние пайплайна между запусками.  
Решает две проблемы:
1. Пайплайн упал на шаге 2 → возобновляется с места остановки
2. Провайдер сменился → новая модель получает контекст предыдущих шагов

```
.kitana/
  bible/
    mission.md          — цель, ICP, не меняется
    progress.md         — что сделал каждый агент
    snapshots/
      01_analyst.json
      02_copywriter.json
```

Сжатие при failover: `compressor.ts` переписывает Библию в dense format  
(убирает воду, оставляет факты) — ~60-70% сжатие без потери смысла.  
Китайские иероглифы — отложено до версии 0.3, нужны тесты на разных моделях.

---

## Провайдеры на воркшопе

Четыре варианта в `.env.example`:

```
A: Kitana Server    — npx @kitana-sdk/server  (Claude подписка, рекомендуется)
B: Gemini Flash     — GOOGLE_API_KEY=AIza...  (бесплатно, 15 rpm лимит)
C: Ollama           — ollama pull llama3.2    (полностью локально)
D: Claude API       — ANTHROPIC_API_KEY=...   (платный)
```

---

## Ключевые решения

| Решение | Выбор | Причина |
|---|---|---|
| Оркестратор | Google ADK | встроенный Model Routing, adk web дебаггер |
| Прокси к CLI | @kitana-sdk/server | уже написан, OpenAI-compatible |
| Instagram | Playwright + stealth | официальный API убрал комментарии в 2020 |
| Twitter/X | убран | платный с февраля 2026 |
| Сжатие контекста | dense format | работает на любой модели в отличие от китайского |
| Kitana API | класс `new Kitana({providers})` | порядок providers = приоритет failover |
| Конфиг | .env первично, конструктор override | участник не лезет в код |
