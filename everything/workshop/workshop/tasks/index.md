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
  2.1  Подключаем Claude API
  2.2  Подключаем Gemini API (бесплатный)
  2.3  Model Routing — failover между моделями
  2.4  Реальный кейс: Lead Finder пайплайн

Волна 3 — ADK + Kitana       ~25 мин
  3.1  Kitana detector — что установлено
  3.2  Kitana runner — CLI без API ключа
  3.3  Kitana failover — цепочка провайдеров
  3.4  Библия проекта — состояние между шагами (бонус)
```

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
  03-kitana.md      ← волна 3
examples/
  01-adk/           ← скелеты для волны 1
  02-api/           ← скелеты для волны 2
  03-kitana/        ← скелеты для волны 3
src/                ← пиши сюда свой код
```

## Правила

- Смотри в `examples/` только если завис больше 5 минут
- Каждое задание — отдельный файл в `src/`
- Запуск всегда: `npx tsx src/ИМЯ_ФАЙЛА.ts`

---

→ Начинай с [tasks/01-adk.md](./01-adk.md)
