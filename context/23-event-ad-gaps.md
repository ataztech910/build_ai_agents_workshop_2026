# Объявление vs реальность — расхождения перед ивентом

Ивент **завтра**. Подстраиваем реальность под уже опубликованный текст
объявления (не наоборот). Ниже — статус по каждому найденному расхождению.
Обновлять этот файл по ходу, не держать в голове/в чате.

Текст объявления (кусок, который сверяли):

```
What you'll build:
A 3-agent sequential pipeline — analyst → copywriter → validator — pulling
data from Telegram, YouTube, Reddit, or Instagram.

What you'll learn:
— How Google ADK orchestrates agents (SequentialAgent, ParallelAgent, Model Routing)
— How to connect Claude, Gemini, or run fully local with Ollama
— How multi-agent pipelines handle errors, retries, and model switching
— How to structure reusable agent code for real projects

For whom:
Developers comfortable with TypeScript or Python. No prior agent experience
needed — just bring your laptop.
```

---

## Статус по пунктам

| # | Пункт | Критичность | Статус | Решение |
|---|---|---|---|---|
| 1 | Telegram / YouTube / Reddit / Instagram | 🔴 Высокая | **✅ Закрыт** | Решение (по мнению ассистента, подтверждено пользователем): живой краулинг на сцене не нужен — портал уже учит тому же навыку без риска сломаться перед залом. Компромисс: показываем РЕАЛЬНЫЙ КОД парсеров как "вот как это выглядело бы по-настоящему", без живого демо. `tasks/02-api.md` обновлён — явно перечисляет все 3 легитимных парсера (`telegram-parser.ts`'s `parseChannel()`, `parsers/youtube.ts`'s `parseYouTube()`, `parsers/reddit.ts`'s `parseReddit()`) с пометкой "официальные API, не скрейпинг". Заодно починил реальный баг: `lead-finder-v3/package.json`'s `@types/snoowrap` был запинен на несуществующую `^1.23.0` (реальный максимум — `1.19.0`) — `npm install` там падал в принципе. Исправлено, `npm install` теперь проходит чисто (252 пакета). Instagram — не чиним, не демонстрируем, не продвигаем (ToS/`puppeteer-extra-plugin-stealth` — обход антибот-детекта).
| 2 | Model Routing (learning outcome) | 🟡 Средняя | **✅ Закрыт** | Два механизма теперь показываем: (a) Kitana `chain` — практический failover, уже виден живьём в Lead Finder. (b) `RoutedLlm` — ADK-нативный (не Kitana) routing, отдельный presenter-only демо-файл `examples/01-adk/model-routing-demo.ts`. Детерминированный (primary — заведомо несуществующая модель, всегда падает мгновенно; fallback — рабочий `gemini-flash-latest`), не зависит от случайного реального сбоя на сцене. Использует уже проверенный ранее `modelName`-воркэраунд бага RoutedLlm. **Проверен живьём с реальным ключом** — exit 0, ответ "4", без 400-ошибки. Осталось: одна фраза ведущего, явно называющая это "model routing" (ADK's own, отдельно от Kitana chain).
| 3 | "How to connect Claude, Gemini, or run fully local with Ollama" | ✅ Закрыт | **Не требует действий** | Уже полностью покрыто существующим `pickModel()` toggle-паттерном в каждом файле с самого начала: Gemini напрямую, Claude через Kitana-chain (CLI-подписка, БЕЗ ключа), Ollama локально. Отдельное упражнение "connect Claude via API key" (`claude-agent.ts`) не нужно — создавалось и удалено обратно в этом же разговоре, была ошибка полагать что нужен отдельный API-key путь.
| 4 | "Developers comfortable with TypeScript or Python" | 🟠 Средняя | **✅ Закрыт (частично)** | Рабочее мини-демо: `examples/01-adk/hello_agent.py` — `google-adk` (Python, версия 2.8.0), `LlmAgent`+`InMemoryRunner`, тот же рецепт, что `hello-agent.ts`. **Проверено живьём с реальным ключом** — exit 0, реальный ответ Gemini. Gemini-путь по умолчанию, `LiteLlm`-путь (для Claude) закомментирован с пометкой — **не проверен живьём** (нет Anthropic-ключа под рукой), но структурно корректен (сигнатура `LiteLlm(model: str, **kwargs)` подтверждена в реальном пакете). Явная пометка в файле: `LiteLlm` всегда требует настоящий API-ключ, в отличие от Kitana не может подцепиться к `claude` CLI-подписке. Побочная находка: Python `google-genai` SDK читает `GOOGLE_API_KEY`/`GEMINI_API_KEY` — НЕ `GOOGLE_GENAI_API_KEY` (это имя специфично для JS SDK), лёгкая ловушка если участник скопирует TS `.env.example` как есть.
| 5 | Длительность в объявлении | — | **✅ Закрыт, не трогаем** | Пользователь: "длительность не трогаем — я уложусь, мы постоянно завышаем время". План не режем, объявление не трогаем. Не поднимать снова без явного запроса.

---

## Не забыть

- Все решения "не чинить X" — сознательные, не забытые. Не предлагать чинить Instagram/писать Python снова, если явно не попросят.
- Пункт 3 закрыт БЕЗ кода — не создавать `claude-agent.ts` заново без явного запроса.
- Прежде чем помечать пункт "закрыт" — спросить, а не решать самому.
