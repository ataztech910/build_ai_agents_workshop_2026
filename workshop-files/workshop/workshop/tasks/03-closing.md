# Closing — Real Conditions (n8n)

> ~25-30 минут · демо ведущего, участники не пишут код

Финальный момент воркшопа: то, что вы построили сегодня, встраивается в
настоящий процесс — не просто отвечает в чате, а работает как звенья
автоматизации, которую оркеструет n8n.

Три звена, каждое — либо уже построено сегодня, либо строится один раз
заранее (не на воркшопе):

```
[planner]  → решает, какой канал сканировать (новый агент, presenter-only)
    ↓
[data portal]  → отдаёт реальные комментарии из выбранного канала (Block 3)
    ↓
[lead-finder]  → analyst → copywriter → validator (Block 3, уже построен)
    ↓
[n8n: Split Out → Sort → Set]  → группирует и форматирует финальный список
```

`planner` и `lead-finder` — два независимых ADK-агента за двумя HTTP-
эндпоинтами. n8n дёргает оба по очереди и обрабатывает результат между
ними — ничего нового в TypeScript писать не нужно, вся оркестрация в n8n.

---

## Подготовка (до воркшопа, не при участниках)

Два `adk web` сервера на разных портах — планировщик и Lead Finder живут в
разных папках, `adk web` обслуживает только файлы на один уровень вложенности
внутри указанной директории:

```bash
# Терминал 1
npx adk web examples/03-closing --port 8001
# → serves "planner"

# Терминал 2
npx adk web examples/02-api/solution --port 8000
# → serves "lead-finder"
```

Проверка (замени `s1` на что угодно уникальное для сессии):

```bash
curl -X POST http://localhost:8001/apps/planner/users/u1/sessions/s1 -d '{}'
curl -X POST http://localhost:8001/run -H "Content-Type: application/json" -d '{
  "appName": "planner", "userId": "u1", "sessionId": "s1",
  "newMessage": { "role": "user", "parts": [{ "text": "A course on automating business operations with AI, for small business owners drowning in manual admin work." }] }
}'
# → {"channel": "smallbiz", "reason": "..."}
```

`planner.ts` — presenter-only агент (не то, что строили участники): по
описанию бизнеса выбирает один из трёх каналов учебного портала
(`startups` / `smallbiz` / `productivity`). Тот же скелет, что и везде —
`pickModel()` toggle, Gemini по умолчанию. См. `examples/03-closing/planner.ts`.

**n8n — без Docker, через npx:**

```bash
npx n8n
# → http://localhost:5678
```

**Импорт готового workflow** — не собирать 12 нод руками:
`examples/03-closing/n8n-workflow.json` → в n8n: Workflows → Import from
File → выбрать этот файл.

Проверено живьём целиком: `npx n8n import:workflow --input=...`, затем
`npx n8n execute --id=workshop-closing-demo-001` — реальный прогон
через оба `adk web` сервера и портал, дошёл до конца
(`status: success`, `lastNodeExecuted: "Format Result"`), правильно
отсортированные и отформатированные офферы на выходе. Один нюанс из
этого прогона: экспортированный JSON изначально не проходил импорт без
top-level `id` у самого workflow (не только у нод) — `SQLITE_CONSTRAINT:
NOT NULL constraint failed: workflow_entity.id` — уже исправлено в файле.

---

## Workflow в n8n — что делает каждая нода (если правишь импортированное, или собираешь руками)

**1. Manual Trigger** — "New business description"

**2. Set — `businessDescription`**
Текстовое поле с описанием бизнеса/ICP (то же, что участники используют в
`lead-finder.ts`'s `ICP`), например:
```
A course on automating business operations with AI, for small business
owners drowning in manual admin work.
```

**3. HTTP Request — create planner session**
`POST http://localhost:8001/apps/planner/users/u1/sessions/s1`, body `{}`

**4. HTTP Request — call planner**
`POST http://localhost:8001/run`
```json
{
  "appName": "planner",
  "userId": "u1",
  "sessionId": "s1",
  "newMessage": { "role": "user", "parts": [{ "text": "={{ $('Set').item.json.businessDescription }}" }] }
}
```

**5. Set/Code — extract `channel`**
Ответ приходит как массив событий; текст — в
`{{ $json[0].content.parts[0].text }}`, JSON-строкой (может быть в
```json-обёртке — планировщик тоже иногда её добавляет, как и остальные
агенты сегодня). Простое выражение вытащить `channel`:
```js
JSON.parse($json[0].content.parts[0].text.replace(/```json\n?|```/g, '')).channel
```

**6. HTTP Request — fetch comments from the portal**
`GET https://workshop-data-portal.vercel.app/api/comments?channel={{ $json.channel }}`

**7. Set/Code — build the lead-finder prompt**
```js
`ICP: ${$('Set').item.json.businessDescription}\nComments: ${JSON.stringify($json.comments)}`
```

**8. HTTP Request — create lead-finder session**
`POST http://localhost:8000/apps/lead-finder/users/u1/sessions/s2`, body `{}`

**9. HTTP Request — call lead-finder**
`POST http://localhost:8000/run`
```json
{
  "appName": "lead-finder",
  "userId": "u1",
  "sessionId": "s2",
  "newMessage": { "role": "user", "parts": [{ "text": "={{ $json.prompt }}" }] }
}
```

**10. Code — parse the final offers**
Same code-fence-stripping idea as `stripCodeFence()` in `lead-finder.ts`:
```js
const text = $json[($json.length ?? 1) - 1].content.parts[0].text;
const clean = text.replace(/```json\n?|```/g, '').trim();
return JSON.parse(clean).offers.map(o => ({ json: o }));
```
This node's output is already one n8n item per offer (return array) — no
separate Split Out node needed.

**11. Sort — by `author`**
No numeric score survives into the final `offers` shape (only `analyst`'s
intermediate `top_leads` has `score`) — sort alphabetically by `author`.

**12. Set — final display**
Format each item into one readable block (or write to a Table/Sheet — skip
the real integration on stage, same reasoning as the single-agent version of
this demo: no live logins in front of the room).

---

## Что показываем вживую (5 итоговых минут из 25-30)

1. Оба `adk web` сервера уже подняты и прогреты — открываешь n8n, жмёшь
   **Execute Workflow**
2. Зал видит подсветку нод одна за другой: planner решает канал → портал
   отдаёт данные → lead-finder гоняет 3 своих агента → n8n сортирует и
   форматирует результат
3. Показываешь итоговый список — те же самые механики, что участники
   только что писали руками, теперь работают без единого клика человека

**Фраза:** *"Ничего из этого не новый код — planner такой же LlmAgent, как
и всё сегодня, lead-finder — то, что вы только что построили. Новое здесь —
n8n, который дёргает оба агента по HTTP и обрабатывает результат между
ними."*

**Вопрос залу:** что бы вы автоматизировали первым, будь у вас такой
пайплайн за HTTP-эндпоинтом?

## Быстрый круг (в оставшееся время)

Один вопрос на человека, коротко: *"Что удивило?"*

---

→ Готово! Возвращаемся к общему обсуждению.
