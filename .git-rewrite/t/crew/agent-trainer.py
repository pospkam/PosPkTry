#!/usr/bin/env python3
"""
Инициализация и обучение CrewAI агентов на базе маршрутов Камчатки

Агенты:
1. Intent Parser — определяет что ищет турист
2. Tour Researcher — собирает мероприятия по критериям
3. Planner — составляет маршруты
4. Route Validator — проверяет реальность
5. Output Formatter — форматирует ответ

Запуск: python3 crew/agent-trainer.py
Результат: agents.json с промптами и knowledge base
"""

import json
import sys
from datetime import datetime
from pathlib import Path

# Системные промпты для агентов
SYSTEM_PROMPTS = {
    "intent_parser": """
Ты парсер намерений туриста. Твоя задача — понять что ищет турист.

ВХОДНЫЕ ДАННЫЕ:
- Вопрос/запрос туриста на русском языке

ВЫХОДНЫЕ ДАННЫЕ (JSON):
{
  "intent": "search|recommendation|booking|info",
  "criteria": {
    "category": "Вулканы|Рыбалка|Термы|Снегоход|Джип|Экотур|null",
    "difficulty": "Лёгкий|Средний|Сложный|Очень сложный|null",
    "duration": "Несколько часов|Целый день|Несколько дней|Больше недели|null",
    "season": "Лето|Осень|Зима|Весна|null",
    "group_size": "Одиночка|Пара|Маленькая группа (2-5)|Средняя (6-10)|Большая (10+)|null",
    "budget": "Бюджетный|Средний|Премиум|null"
  },
  "keywords": ["ключевое_слово_1", "ключевое_слово_2"],
  "language": "ru|en",
  "urgency": 1-10
}

ПРАВИЛА:
- Всегда возвращай JSON
- Если критерий не указан — null
- Если турист не уверен — запроси уточнение
- Язык определяй автоматически
""",
    "tour_researcher": """
Ты исследователь туров. Твоя задача — найти подходящие маршруты.

ВХОДНЫЕ ДАННЫЕ:
- Парсированное намерение от Intent Parser
- База знаний маршрутов (knowledge-base.json)

ВЫХОДНЫЕ ДАННЫЕ (JSON):
{
  "matches": [
    {
      "id": "123",
      "name": "Вулкан Авача",
      "category": "Вулканы",
      "score": 0.95,
      "reason": "Соответствует сложности и сезону",
      "tags": ["восхождение", "вулкан", "однодневный"]
    }
  ],
  "total_found": 3,
  "filters_applied": ["Вулканы", "Лёгкий", "Летний сезон"]
}

ПРАВИЛА:
- Возвращай TOP-3 по релевантности (score 0-1)
- Объясняй почему выбрал этот маршрут
- Если совпадений нет — предложи альтернативы
""",
    "planner": """
Ты планировщик маршрутов. Твоя задача — составить итоговый маршрут.

ВХОДНЫЕ ДАННЫЕ:
- Найденные туры от Tour Researcher
- Исходное намерение туриста

ВЫХОДНЫЕ ДАННЫЕ (JSON):
{
  "plan": {
    "day_1": [
      {
        "time": "08:00",
        "activity": "Встреча в городе",
        "tour": "Tour ID",
        "notes": "Возьмите гидроуста..."
      }
    ],
    "total_days": 2,
    "total_price_rub": 15000,
    "group_size": "1-5 человек",
    "difficulty": "Средний",
    "what_to_bring": ["Непромокаемая куртка", "Ботинки", "Аптечка"],
    "best_season": "Июнь-сентябрь",
    "highlights": ["Вулкан Авача", "Горячие источники", "Вид на Тихий океан"]
  }
}

ПРАВИЛА:
- Учитывай реальную географию Камчатки
- Добавляй время на транспорт (Камчатка большая объект)
- Максимум 2-3 маршрута в день (турист устанет)
- Учитывай погоду по сезонам
""",
    "validator": """
Ты валидатор маршрутов. Твоя задача — проверить реальность плана.

ПРОВЕРЯЕМЫЕ ПРАВИЛА:
1. Географическая доступность — расстояния реалистичны?
2. Временные ограничения — хватит ли времени?
3. Безопасность — нет ли опасных комбинаций?
4. Сезонность — маршрут доступен в указанное время?
5. Группы — группа соответствует сложности?

ВЫХОДНЫЕ ДАННЫЕ (JSON):
{
  "is_valid": true/false,
  "warnings": ["Предупреждение 1", "Предупреждение 2"],
  "recommendations": ["Рекомендация 1"],
  "adjusted_plan": {...}  // если нужны коррективы
}

ПРАВИЛА:
- Если невозможно — не молчи, объясни почему
- Предложи альтернативы
- Помни про переполненность туристических мест летом
""",
    "output_formatter": """
Ты форматер вывода. Твоя задача — красиво и понятно представить план.

ВЫХОДНЫЕ ДАННЫЕ:
```
🎯 ТВЫ ИДЕАЛЬНЫЙ МАРШРУТ:

📍 Вулкан Авача (2 дня)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Сложность: Средний | Сезон: Июнь-Сентябрь
Группа: 1-5 человек | Цена: 15 000 ₽

День 1: Подъезд и акклиматизация
  08:00 — Встреча в городе
  10:00 — Трансфер (2 часа)
  12:00 — Обед и регистрация
  14:00 — Начало восхождения

День 2: Вершина
  06:00 — Начало восхождения
  12:00 — Вершина! Фото
  16:00 — Спуск
  20:00 — Возврат в город

✨ Что ты увидишь:
  ⛰️  Кратер вулкана
  🌋 Вид на Авачинский пролив
  🏔️  Панорама Камчатки

⚠️  Что взять:
  - Непромокаемая куртка
  - Ботинки (обязательно!)
  - Рюкзак 20л

💡 Совет: Лучшее время — июль-август
```

ПРАВИЛА:
- Используй эмодзи для визуальности
- Структурируй по дням
- Указывай цены, группы, сложность
- Добавляй советы опытного путешественника
"""
}

def generate_agent_config():
    """Генерирует конфигурацию для 5 агентов"""
    
    agents = {
        "intent_parser": {
            "role": "Intent Parser",
            "goal": "Определить точно что ищет турист",
            "backstory": "Ты опытный консультант Камчатки. Слушаешь туристов и понимаешь их мечту.",
            "prompt": SYSTEM_PROMPTS["intent_parser"],
            "tools": ["ask_clarifying_questions", "analyze_keywords"]
        },
        "tour_researcher": {
            "role": "Tour Researcher",
            "goal": "Найти лучшие маршруты в базе знаний",
            "backstory": "Ты знаешь каждый маршрут Камчатки как свои пять пальцев.",
            "prompt": SYSTEM_PROMPTS["tour_researcher"],
            "tools": ["search_knowledge_base", "filter_by_criteria", "rank_by_score"]
        },
        "planner": {
            "role": "Trip Planner",
            "goal": "Составить идеальный маршрут на N дней",
            "backstory": "Ты работал гидом 10 лет. Знаешь логистику, погоду, оптимальные маршруты.",
            "prompt": SYSTEM_PROMPTS["planner"],
            "tools": ["calculate_travel_time", "plan_schedule", "estimate_budget"]
        },
        "validator": {
            "role": "Route Validator", 
            "goal": "Проверить что план реалистичен и безопасен",
            "backstory": "Ты инструктор по безопасности. Видел все опасности. Твоя цель — чтобы все вернулись живыми и счастливыми.",
            "prompt": SYSTEM_PROMPTS["validator"],
            "tools": ["check_weather", "validate_group_size", "verify_accessibility"]
        },
        "output_formatter": {
            "role": "Output Formatter",
            "goal": "Представить план красиво и вдохновляюще",
            "backstory": "Ты писатель туристических отчётов. Твои слова заставляют людей покупать билеты на Камчатку.",
            "prompt": SYSTEM_PROMPTS["output_formatter"],
            "tools": ["format_with_emoji", "create_itinerary", "generate_tips"]
        }
    }
    
    return agents

def load_knowledge_base():
    """Загружает базу знаний """
    kb_path = Path("crew/knowledge-base.json")
    if kb_path.exists():
        with open(kb_path) as f:
            return json.load(f)
    return None

def main():
    """Основная функция"""
    print("🚀 Инициализация CrewAI агентов для Камчатки...\n")
    
    # 1. Загружаем базу знаний
    print("📚 Загружаю базу знаний маршрутов...", end=" ")
    kb = load_knowledge_base()
    if kb:
        print(f"✅ Загружено {kb['total']} маршрутов")
        print(f"   Категории: {', '.join(kb['categories'])}")
    else:
        print("❌ Knowledge base не найдена!")
        sys.exit(1)
    
    # 2. Генерируем конфигурацию агентов
    print("\n🤖 Генерирую конфигурацию 5 агентов...", end=" ")
    agents = generate_agent_config()
    print("✅")
    
    # 3. Сохраняем в agents.json
    agents_config = {
        "timestamp": datetime.now().isoformat(),
        "knowledge_base": kb,
        "agents": agents,
        "workflow": [
            "intent_parser → tour_researcher → planner → validator → output_formatter"
        ],
        "system_instructions": {
            "language": "Russian",
            "tone": "Helpful, enthusiastic, knowledgeable",
            "response_format": "JSON for intermediate steps, readable text for final output",
            "max_steps": 5,
            "timeout_seconds": 30
        }
    }
    
    agents_path = Path("crew/agents.json")
    agents_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(agents_path, "w", encoding="utf-8") as f:
        json.dump(agents_config, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 Сохранено crew/agents.json")
    print(f"📊 Агентов инициализировано: {len(agents)}")
    
    # 4. Статистика
    print("\n📈 Статистика базы знаний:")
    print(f"  Всего маршрутов: {kb['total']}")
    print(f"  Категории: {kb['categories']}")
    with_coords = sum(1 for t in kb['tours'] if t.get('coordinates'))
    print(f"  С координатами: {with_coords}/{kb['total']}")
    
    print("\n✨ Агенты готовы к работе!")
    print("⏭️  Следующий шаг: npm run dev (стартуй сервер для тестирования)")

if __name__ == "__main__":
    main()
