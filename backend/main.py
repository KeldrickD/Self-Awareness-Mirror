"""
AI Self-Awareness Mirror - Backend API
FastAPI server with WebSocket support for real-time analysis
"""

import os
import json
from datetime import datetime, date
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# Supabase connection (optional - frontend can connect directly)
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "")


# Pydantic models
class Reading(BaseModel):
    confidence: float
    focus: float
    energy: float
    emotion: str
    emotion_scores: Optional[dict] = None
    face_detected: bool = True
    raw_data: Optional[dict] = None


class SessionSummary(BaseModel):
    duration: int
    total_readings: int
    avg_confidence: float
    avg_focus: float
    avg_energy: float
    insights: List[str]


class DailyReport(BaseModel):
    date: str
    peak_hours: List[str]
    low_hours: List[str]
    avg_confidence: float
    avg_focus: float
    avg_energy: float
    dominant_emotion: str
    insights: List[str]
    total_sessions: int
    total_duration_minutes: int


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.session_data: dict = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.session_data[session_id] = {
            "readings": [],
            "start_time": datetime.now(),
            "websocket": websocket
        }
        return session_id

    def disconnect(self, websocket: WebSocket, session_id: str):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if session_id in self.session_data:
            del self.session_data[session_id]

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

    def add_reading(self, session_id: str, reading: Reading):
        if session_id in self.session_data:
            self.session_data[session_id]["readings"].append({
                **reading.dict(),
                "timestamp": datetime.now().isoformat()
            })

    def get_session_stats(self, session_id: str) -> Optional[dict]:
        if session_id not in self.session_data:
            return None
        
        data = self.session_data[session_id]
        readings = data["readings"]
        
        if not readings:
            return {
                "duration": 0,
                "total_readings": 0,
                "avg_confidence": 0,
                "avg_focus": 0,
                "avg_energy": 0
            }
        
        duration = (datetime.now() - data["start_time"]).seconds
        
        return {
            "duration": duration,
            "total_readings": len(readings),
            "avg_confidence": sum(r["confidence"] for r in readings) / len(readings),
            "avg_focus": sum(r["focus"] for r in readings) / len(readings),
            "avg_energy": sum(r["energy"] for r in readings) / len(readings)
        }


manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🪞 AI Self-Awareness Mirror Backend Starting...")
    yield
    # Shutdown
    print("🪞 Backend Shutting Down...")


# Create FastAPI app
app = FastAPI(
    title="AI Self-Awareness Mirror",
    description="Real-time psychological feedback through webcam analysis",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "name": "AI Self-Awareness Mirror API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "websocket": "/ws/{session_id}",
            "analyze": "/api/analyze"
        }
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_sessions": len(manager.active_connections)
    }


@app.post("/api/analyze")
async def analyze_reading(reading: Reading):
    """
    Analyze a single reading and return insights.
    The main analysis happens client-side, but this can provide
    additional server-side processing if needed.
    """
    insights = []
    
    # Generate quick insights
    if reading.confidence > 0.7:
        insights.append("Strong confidence detected")
    elif reading.confidence < 0.4:
        insights.append("Confidence appears low")
    
    if reading.focus > 0.7:
        insights.append("High focus maintained")
    elif reading.focus < 0.4:
        insights.append("Attention seems scattered")
    
    if reading.energy > 0.7:
        insights.append("Energy levels are high")
    elif reading.energy < 0.4:
        insights.append("Fatigue indicators detected")
    
    return {
        "reading": reading.dict(),
        "insights": insights,
        "processed_at": datetime.now().isoformat()
    }


@app.post("/api/report/generate")
async def generate_daily_report(report_date: Optional[str] = None):
    """
    Generate a daily report from stored readings.
    In production, this would aggregate data from Supabase.
    """
    target_date = report_date or date.today().isoformat()
    
    # Mock report generation
    # In production, would fetch from Supabase
    return {
        "date": target_date,
        "summary": "Report generation endpoint - connect to Supabase for full functionality",
        "note": "Daily reports are primarily generated client-side"
    }


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time bidirectional communication.
    Allows streaming readings and receiving live feedback.
    """
    await manager.connect(websocket, session_id)
    
    try:
        # Send initial connection confirmation
        await manager.send_personal_message({
            "type": "connected",
            "session_id": session_id,
            "message": "WebSocket connection established"
        }, websocket)
        
        while True:
            # Receive data from client
            data = await websocket.receive_json()
            
            if data.get("type") == "reading":
                # Process incoming reading
                reading = Reading(**data.get("data", {}))
                manager.add_reading(session_id, reading)
                
                # Get current stats
                stats = manager.get_session_stats(session_id)
                
                # Send acknowledgment with stats
                await manager.send_personal_message({
                    "type": "reading_ack",
                    "stats": stats
                }, websocket)
                
            elif data.get("type") == "get_stats":
                # Return current session stats
                stats = manager.get_session_stats(session_id)
                await manager.send_personal_message({
                    "type": "stats",
                    "data": stats
                }, websocket)
                
            elif data.get("type") == "ping":
                # Keep-alive ping
                await manager.send_personal_message({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                }, websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
        print(f"Session {session_id} disconnected")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

