#!/usr/bin/env python3
"""
FastAPI сервер для CrewAI агентов Камчатки

Endpoints:
  POST /api/plan — Спланировать тур
  POST /api/search — Поиск маршрутов
  GET /api/agents — Список агентов
  GET /health — Статус сервера

Запуск: python3 crew/main.py
        Доступно на http://localhost:8001 (или $PORT)
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional

# FastAPI (установить: pip install fastapi uvicorn python-dotenv)
try:
    from fastapi import FastAPI, HTTPException
    from fastapi.responses import JSONResponse
    from pydantic import BaseModel
except ImportError:
    print("❌ FastAPI не установлена. Запустите:")
    print("  pip install fastapi uvicorn python-dotenv")
    sys.exit(1)

# ============================================================================
# Модели данных
# ============================================================================

class TourPlanRequest(BaseModel):
    query: str  # Что ищет пользователь: "хочу на вулкан в июле"
    group_size: Optional[int] = 1
    budget_rub: Optional[int] = None  # Рубли
    duration_days: Optional[int] = None
    difficulty: Optional[str] = None  # "Лёгкий", "Средний", "Сложный"

class SearchRequest(BaseModel):
    category: Optional[str] = None  # "Вулканы", "Рыбалка" и т.д.
    difficulty: Optional[str] = None
    season: Optional[str] = None  # "Лето", "Зима"
    limit: int = 5

# ============================================================================
# Инициализация
# ============================================================================

app = FastAPI(
    title="Kamchatka Tour Planning API",
    description="AI-powered tour planner для Камчатки",
    version="1.0.0"
)

# Загружаем конфигурацию агентов и базу знаний
AGENTS_CONFIG = None
KNOWLEDGE_BASE = None

def load_config():
    """Загружает конфигурацию"""
    global AGENTS_CONFIG, KNOWLEDGE_BASE
    
    agents_path = Path("crew/agents.json")
    kb_path = Path("crew/knowledge-base.json")
    
    if agents_path.exists():
        with open(agents_path, encoding="utf-8") as f:
            AGENTS_CONFIG = json.load(f)
    
    if kb_path.exists():
        with open(kb_path, encoding="utf-8") as f:
            KNOWLEDGE_BASE = json.load(f)

# ============================================================================
# Агенты (имитация для MVP)
# ============================================================================

def parse_intent(query: str, group_size: int) -> dict:
    """Intent Parser Agent — определяет намерение туриста"""
    return {
        "intent": "search",
        "criteria": {
            "keywords": query.lower().split(),
            "group_size": group_size
        }
    }

def search_tours(intent: dict, category: Optional[str] = None) -> list:
    """Tour Researcher Agent — ищет туры по критериям"""
    if not KNOWLEDGE_BASE:
        return []
    
    tours = KNOWLEDGE_BASE.get("tours", [])
    
    # Базовая фильтрация
    if category:
        tours = [t for t in tours if t.get("category") == category]
    
    # Поиск по ключевым словам
    keywords = intent.get("criteria", {}).get("keywords", [])
    if keywords:
        filtered = []
        for tour in tours:
            tour_text = f"{tour.get('name')} {tour.get('category')} {tour.get('description')}".lower()
            if any(kw in tour_text for kw in keywords):
                filtered.append(tour)
        tours = filtered
    
    # Возвращаем топ-3
    return tours[:3]

def plan_trip(tours: list, group_size: int, duration: Optional[int] = None) -> dict:
    """Trip Planner Agent — составляет маршрут"""
    if not tours:
        return {"error": "Туры не найдены"}
    
    primary_tour = tours[0]
    
    return {
        "plan": {
            "title": f"Путешествие в {primary_tour.get('category').lower()}",
            "tours": [t.get('id') for t in tours],
            "estimated_days": duration or 2,
            "group_size": group_size,
            "highlights": [
                primary_tour.get('name'),
                f"Сложность: {primary_tour.get('difficulty')}",
                f"Продолжительность: {primary_tour.get('duration')}"
            ]
        }
    }

def validate_plan(plan: dict) -> dict:
    """Route Validator Agent — проверяет реальность"""
    return {
        "is_valid": True,
        "warnings": []
    }

def format_output(plan: dict) -> str:
    """Output Formatter Agent — красивый вывод"""
    return f"""
🎯 ВАШ ИДЕАЛЬНЫЙ МАРШРУТ

{plan.get('plan', {}).get('title', 'Путешествие на Камчатку')}

📍 Основной тур:
{plan.get('plan', {}).get('highlights', [{}])[0]}

⏱️  Продолжительность: {plan.get('plan', {}).get('estimated_days')} дней

👥 Группа: {plan.get('plan', {}).get('group_size')} человек

✨ Готово к бронированию!
"""

# ============================================================================
# API Endpoints
# ============================================================================

@app.on_event("startup")
async def startup():
    """Инициализация при старте"""
    load_config()
    if AGENTS_CONFIG:
        print("✅ Конфигурация агентов загружена")
    if KNOWLEDGE_BASE:
        print(f"✅ База знаний: {KNOWLEDGE_BASE.get('total')} маршрутов")

@app.get("/health")
async def health():
    """Проверка здоровья сервера"""
    return {
        "status": "OK",
        "timestamp": datetime.now().isoformat(),
        "agents_ready": bool(AGENTS_CONFIG),
        "knowledge_base_loaded": bool(KNOWLEDGE_BASE)
    }

@app.get("/api/agents")
async def list_agents():
    """Получить список агентов"""
    if not AGENTS_CONFIG:
        raise HTTPException(status_code=500, detail="Агенты не загружены")
    
    agents = AGENTS_CONFIG.get("agents", {})
    return {
        "total": len(agents),
        "agents": list(agents.keys()),
        "workflow": AGENTS_CONFIG.get("workflow", [])
    }

@app.post("/api/plan")
async def plan_tour(request: TourPlanRequest):
    """
    POST /api/plan
    
    Спланировать тур по описанию туриста
    
    Пример:
    {
      "query": "хочу на вулкан в июле, группа 3 человека",
      "group_size": 3,
      "duration_days": 2,
      "difficulty": "Средний"
    }
    """
    if not KNOWLEDGE_BASE:
        raise HTTPException(status_code=503, detail="База знаний не готова")
    
    try:
        # 1. Intent Parser
        intent = parse_intent(request.query, request.group_size)
        
        # 2. Tour Researcher
        tours = search_tours(intent)
        
        # 3. Trip Planner
        plan = plan_trip(tours, request.group_size, request.duration_days)
        
        # 4. Validator
        validation = validate_plan(plan)
        
        # 5. Output Formatter
        formatted = format_output(plan)
        
        return {
            "success": True,
            "query": request.query,
            "plan": plan.get("plan"),
            "is_valid": validation.get("is_valid"),
            "formatted": formatted,
            "tours_found": len(tours),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/search")
async def search_tours_endpoint(request: SearchRequest):
    """
    POST /api/search
    
    Поиск маршрутов по категориям
    
    Пример:
    {
      "category": "Вулканы",
      "difficulty": "Средний",
      "limit": 5
    }
    """
    if not KNOWLEDGE_BASE:
        raise HTTPException(status_code=503, detail="База знаний не готова")
    
    tours = KNOWLEDGE_BASE.get("tours", [])
    
    # Фильтруем по критериям
    if request.category:
        tours = [t for t in tours if t.get("category") == request.category]
    
    if request.difficulty:
        tours = [t for t in tours if t.get("difficulty") == request.difficulty]
    
    # Сезонная фильтрация
    if request.season:
        season_tours = []
        for t in tours:
            duration = t.get("duration", "").lower()
            # Примерная логика
            if request.season.lower() == "лето" and t.get("coordinates"):
                season_tours.append(t)
        if season_tours:
            tours = season_tours
    
    return {
        "total": len(tours),
        "limit": request.limit,
        "results": tours[:request.limit],
        "categories": KNOWLEDGE_BASE.get("categories", [])
    }

@app.get("/api/stats")
async def get_stats():
    """Получить статистику базы знаний"""
    if not KNOWLEDGE_BASE:
        return {"error": "База знаний не загружена"}
    
    tours = KNOWLEDGE_BASE.get("tours", [])
    
    return {
        "total_tours": len(tours),
        "categories": KNOWLEDGE_BASE.get("categories", []),
        "with_coordinates": sum(1 for t in tours if t.get("coordinates")),
        "last_updated": KNOWLEDGE_BASE.get("timestamp"),
        "by_category": {
            cat: sum(1 for t in tours if t.get("category") == cat)
            for cat in KNOWLEDGE_BASE.get("categories", [])
        }
    }

# ============================================================================
# Главная функция
# ============================================================================

if __name__ == "__main__":
    load_config()
    
    port = int(os.getenv("PORT", 8001))
    print(f"\n🚀 FastAPI сервер CrewAI агентов")
    print(f"📍 http://localhost:{port}")
    print(f"📚 Документация: http://localhost:{port}/docs\n")
    
    # Импортируем uvicorn в главной функции
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=port)
