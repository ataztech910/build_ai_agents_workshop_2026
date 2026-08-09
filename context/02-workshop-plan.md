# CONTEXT: Детальный план воркшопа

---

## Формат
- Офлайн, 2 часа
- 12-20 человек, технари (JS/TS)
- Один ведущий
- Каждый со своим ноутом (окружение не подготовлено заранее)
- Баланс: больше практики, минимум теории

---

## Тайминг

| Блок | Время |
|---|---|
| Сбор + настройка (пока приходят) | −15 мин |
| Открытие + синхронизация окружения | 10 мин |
| Блок 1 — первый агент | 25 мин |
| Блок 2 — пайплайн + эксперимент | 30 мин |
| Блок 3 — Lead Finder + adk web | 30 мин |
| Блок 4 — свой агент | 20 мин |
| Закрытие | 5 мин |
| **Итого** | **2 ч 00 мин** |

---

## До начала (−15 мин)

Проектор показывает:
```
git clone <repo> workshop && cd workshop
npm install
cp .env.example .env
# выбери провайдер в .env и раскомментируй
npx tsx examples/01-adk/hello-agent.ts  # проверка
```

Ведущий ходит по залу, ловит проблемы до старта.  
Главная проблема: нет Node 18+.

---

## Открытие (10 мин)

**Архитектура на проекторе (3 мин)**
Одна картинка — полная схема (файл: architecture.svg).  
Одна фраза: *"Вот что построим. Начнём с середины."*

**Два вопроса залу (3 мин)**
- Кто уже писал агентов?
- Кто использует AI в работе каждый день?
Цель: калибровать темп.

**Kitana демо (4 мин)**
Два окна на проекторе:
```bash
# Окно 1
npx @kitana-sdk/server
# → listening on :4141

# Окно 2
curl http://localhost:4141/health
```
Фраза: *"Прокси к вашему локальному Claude. Никаких ключей на экране."*

Точка синхронизации: у всех `hello-agent.ts` отвечает.

---

## Блок 1 — Первый агент (25 мин)

### Показываешь (7 мин)
- Открываешь `examples/01-adk/hello-agent.ts`
- Заполняешь TODO вживую
- Запускаешь
- Намеренно убираешь `instruction` — запускаешь снова
- Фраза: *"`instruction` — контракт, не подсказка"*
- Добавляешь FunctionTool за 2 мин вживую

### Они пишут (18 мин)
Задания 1.1 и 1.2 из `tasks/01-adk.md`

Вопрос застрявшим:
*"Что возвращает инструмент? Покажи console.log перед return."*

---

## Блок 2 — Пайплайн (30 мин)

### Эксперимент "один vs много" (10 мин) ← КЛЮЧЕВОЙ МОМЕНТ

Показываешь два запуска подряд на одних данных:

**Вариант A** — один промпт: найди лидов + напиши офферы + проверь
**Вариант B** — три агента: аналитик → копирайтер → валидатор

Зал видит оба результата. Обсуждение:
- Почему валидатор в A не критикует — он сам только что написал
- Как заменить один агент на более сильную модель

Фраза: *"Модель в одном промпте идёт на компромисс по каждой задаче.  
Три агента оптимизируют каждую задачу отдельно."*

### Показываешь SequentialAgent (5 мин)
`examples/01-adk/sequential.ts` — заполняешь вживую, запускаешь.

### Они пишут (15 мин)
Задание 1.3 — свой SequentialAgent

Точка синхронизации: двое показывают разные `instruction` на одних данных.

---

## Блок 3 — Lead Finder (30 мин)

### Показываешь (8 мин)
- `examples/02-api/lead-finder.ts` — показываешь фейковые комментарии
- Фраза: *"Замените фейк на парсер — и это продакшн инструмент"*
- Запускаешь через `adk web` — зал видит граф агентов
- Показываешь как валидатор отклоняет шаблонный оффер

### Они пишут (17 мин)
Задание 2.4 — свой Lead Finder  
Главный эксперимент: поменять ICP → другие лиды из тех же данных

Точка синхронизации: двое показывают разные ICP — зал видит разных лидов ("вау" момент)

### ADK Web (5 мин)
Показываешь дебаггер:
*"Агент ведёт себя странно — сюда смотришь первым делом"*

---

## Блок 4 — Свой агент (20 мин)

Одна фраза: *"Возьми задачу из своей работы которую делаешь руками. Напиши агента. 15 минут."*

Помогаешь формулировать задачу — это важнее чем помогать с кодом.

Вопрос застрявшим:
*"Назови три вещи которые делаешь руками каждую неделю и ненавидишь."*

Последние 5 мин: 2-3 человека показывают что получилось.

---

## Закрытие (5 мин)

По кругу быстро:
1. *Что удивило?*
2. *Где применишь на этой неделе?*
3. *Чего не хватило — что разобрать на следующем?*

---

## Что готовить

- Репо: `npm install` без ошибок, все скелеты заполнены как запасной вариант
- Проектор: два окна (терминал + adk web), шрифт 18+
- Запасной план: фейковые ответы в скелете если провайдер не работает
- Прогон накануне: весь воркшоп от начала до конца, засечь время

---

## Описание для Eventbrite

**Short:**
Learn to build AI agents from scratch using Google ADK. In 2 hours you'll go from a single LlmAgent to a full multi-agent pipeline — powered by Claude, Gemini, or a local model of your choice. You'll leave with working code, a reusable project template, and a clear mental model of how production agent systems are built.

**Full:**
Build AI Agents from Scratch — Hands-on with Google ADK

AI agents are more than a buzzword — they're the new unit of automation. In this hands-on workshop you'll build a real multi-agent pipeline that parses social media comments, identifies potential leads, and generates personalized outreach messages — all orchestrated by Google ADK.

What you'll build:
A 3-agent sequential pipeline — analyst → copywriter → validator — pulling data from Telegram, YouTube, Reddit, or Instagram.

What you'll learn:
— How Google ADK orchestrates agents (SequentialAgent, ParallelAgent, Model Routing)
— How to connect Claude, Gemini, or run fully local with Ollama
— How multi-agent pipelines handle errors, retries, and model switching
— How to structure reusable agent code for real projects

For whom:
Developers comfortable with TypeScript or Python. No prior agent experience needed — just bring your laptop.

What to install before the workshop:
node --version  # 18+
npm install -g @anthropic-ai/claude-code
claude login   # or: ollama pull llama3.2

Duration: 2 hours · Offline · Bring your laptop
