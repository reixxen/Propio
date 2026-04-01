import { z } from 'zod'

export const vkClassifierSchema = z.object({
  isRelevant: z.boolean(),
  reason: z.string().nullable().describe('Причина если isRelevant = false'),
})

export const VK_CLASSIFIER_SYSTEM_PROMPT = `
Ты — фильтр объявлений аренды недвижимости Магнитогорска.

Ответь isRelevant = true ТОЛЬКО если выполнены ВСЕ условия:
- Сдаётся квартира или студия (не комната, не сад, не гараж, не дача)
- Указана стоимость аренды
- Есть конкретный адрес: улица + номер дома (район или ориентир — не считается)
- Не посёлок (Западный, Металлург-2 и др.)
- Не продажа и не поиск сожителя

Возвращай ТОЛЬКО валидный JSON. Никаких пояснений.
`
