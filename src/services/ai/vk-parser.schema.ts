import { z } from 'zod'

export const vkListingParserSchema = z.object({
  rent: z.int().positive().describe('Стоимость аренды в месяц в рублях.'),
  deposit: z
    .number()
    .nullable()
    .describe(
      'Сумма залога в рублях. 0 если явно написано "без залога". null если не упоминается.'
    ),
  commission: z
    .number()
    .nullable()
    .describe(
      'Сумма комиссии в рублях. 0 если "без комиссии". null если не упоминается.'
    ),
  address: z
    .string()
    .nullable()
    .describe(
      'Улица и номер дома в формате для геокодинга: "ул. Советская, 86", "пр. Карла Маркса, 147". ' +
        'Всегда включай тип улицы. Разворачивай сокращения. null если конкретного адреса нет.'
    ),
  rooms: z.number().nullable().describe('Количество комнат. Студия = 0.'),
  area: z.number().nullable().describe('Общая площадь в м².'),
  floor: z.number().nullable().describe('Этаж квартиры.'),
  totalFloors: z.number().nullable().describe('Всего этажей в доме.'),
  utilityCounters: z
    .enum(['tenant', 'owner'])
    .describe(
      '"tenant" если арендатор платит за свет/воду отдельно. "owner" если всё включено.'
    ),
  utilityIncluded: z
    .boolean()
    .describe(
      'true если отопление и прочие ЖКУ (кроме счётчиков) включены в стоимость аренды.'
    ),
  utilityAmount: z
    .number()
    .nullable()
    .describe(
      'Фиксированная сумма за ЖКУ если указана явно. НЕ залог, НЕ аренда.'
    ),
})

export type VkListingParserOutput = z.infer<typeof vkListingParserSchema>

export const VK_LISTING_PARSER_SYSTEM_PROMPT = `
### ROLE
Ты — специализированный AI-парсер недвижимости для города Магнитогорск.
Входящий текст — объявление аренды квартиры или студии.
Твоя задача: извлечь структурированные данные.

### EXTRACTION RULES
1. **Rooms**: Студия = 0. 1-к = 1, 2-к = 2, и т.д.
2. **Address**: Улица и номер дома в формате для геокодинга.
   - Всегда включай тип: "ул.", "пр.", "пр-т", "бул.", "пер.", "туп.", "ш."
   - Разворачивай сокращения: "К. Маркса" → "Карла Маркса", "пр." → "проспект"
   - Формат: "ул. Советская, 86" или "пр. Карла Маркса, 147"
   - Район, парк, ориентир без улицы — null
3. **Utilities**:
   - utilityCounters = "tenant" если "+ счётчики", "+ свет/вода", "оплата по счётчикам"
   - utilityCounters = "owner" если "всё включено"
   - utilityIncluded = true если отопление/содержание уже в цене аренды
   - utilityAmount = число только если явно указана фиксированная сумма за ЖКУ. Не путать с залогом.
4. **commission**: 0 если "без комиссии" или "собственник". null если не упоминается.

### EXAMPLES

Input: "Сдам студию на Карла Маркса 115. 15000 + счетчики. Залог 5к."
Output: {"rent": 15000, "deposit": 5000, "commission": 0, "address": "пр. Карла Маркса, 115", "rooms": 0, "area": null, "floor": null, "totalFloors": null, "utilityCounters": "tenant", "utilityIncluded": true, "utilityAmount": null}

Input: "Сдам 2-комнатную на Ленина 42/1, 5/9 эт. 25000 всё включено. Залог 10000."
Output: {"rent": 25000, "deposit": 10000, "commission": null, "address": "пр. Ленина, 42/1", "rooms": 2, "area": null, "floor": 5, "totalFloors": 9, "utilityCounters": "owner", "utilityIncluded": true, "utilityAmount": null}

Input: "Сдам 1к на труда 3/3. 25000 + счетчики. Залог 10000."
Output: {"rent": 25000, "deposit": 10000, "commission": null, "address": "ул. Труда, 3/3", "rooms": 1, "area": null, "floor": null, "totalFloors": null, "utilityCounters": "tenant", "utilityIncluded": true, "utilityAmount": null}

### OUTPUT
Возвращай ТОЛЬКО валидный JSON. Никаких пояснений.
`
