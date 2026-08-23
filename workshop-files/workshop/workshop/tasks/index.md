# Воркшоп: ИИ агенты с нуля
## Карта заданий

**Стек:** Google ADK → API провайдеры → Kitana SDK  
**Формат:** офлайн, 2 часа, технари

---

```
Волна 1 — ADK basics         ~35 мин
  1.1  Первый LlmAgent
  1.2  FunctionTool — агент с инструментом
  1.3  SequentialAgent — два агента в цепочке
  1.4  ParallelAgent — два агента параллельно (бонус)

Волна 2 — ADK + API          ~35 мин
  2.1  Реальный кейс: Lead Finder пайплайн
       (routing/failover между провайдерами — уже здесь, не отдельное задание)

Closing — Real Conditions (n8n)   ~25-30 мин
  Демо ведущего: planner (новый агент) → data portal → lead-finder →
  n8n группирует результат. Оркестрация через adk web's HTTP API —
  не отдельное задание, код не пишете
```

По ходу всех волн модель можно переключать на Kitana — без единого API-ключа,
через подписку Claude CLI или Ollama. В каждом скелете это одна строка:
раскомментируй `KitanaLlm`-вариант вместо дефолтного Gemini. Это не отдельная
волна, а один из провайдеров под капотом ADK.

---

## Быстрый старт

```bash
git clone <repo> workshop && cd workshop
npm install
cp .env.example .env
```

Структура репо:

```
tasks/
  index.md          ← ты здесь
  01-adk.md         ← волна 1
  02-api.md         ← волна 2
  03-closing.md      ← closing-демо (n8n), код не пишете
examples/
  01-adk/
    starter/        ← скелеты для волны 1 (пиши сюда)
    solution/       ← готовые агенты для самопроверки
  02-api/
    starter/        ← скелеты для волны 2 (пиши сюда)
    solution/       ← готовые агенты для самопроверки
  03-closing/
    planner.ts      ← closing-демо, presenter-only, участники не пишут
```

## Правила

- Пиши прямо в скелете, `examples/*/starter/ИМЯ_ФАЙЛА.ts` — заполняй TODO на месте
- Смотри в `examples/*/solution/` только если завис больше 5 минут (или не хочешь решать сам)
- Запуск всегда: `npx tsx examples/*/starter/ИМЯ_ФАЙЛА.ts`
- Тот же файл открывается через `adk web examples/*/starter` — увидишь агента в браузере

---

→ Начинай с [tasks/01-adk.md](./01-adk.md)
