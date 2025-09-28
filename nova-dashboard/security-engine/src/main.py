"""
NovaShield 2025 Security Engine - Main Application
Python-based microservice for advanced security operations
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging
import os
from datetime import datetime
from typing import Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("security-engine")

# Initialize FastAPI app
app = FastAPI(
    title="NovaShield Security Engine",
    description="Enterprise-grade security microservice for threat detection and response",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state for security monitoring
security_state = {
    "alerts": [],
    "blocked_ips": set(),
    "scan_results": {},
    "threat_level": "low",
    "last_scan": None,
    "active_scans": 0
}

@app.get("/health")
async def health_check():
    """Health check endpoint for Docker health checks"""
    try:
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "service": "security-engine",
            "version": "1.0.0",
            "security": {
                "threat_level": security_state["threat_level"],
                "active_alerts": len(security_state["alerts"]),
                "blocked_ips": len(security_state["blocked_ips"]),
                "active_scans": security_state["active_scans"]
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unhealthy")

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "NovaShield Security Engine",
        "description": "Enterprise-grade security microservice",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "health": "/health",
            "alerts": "/api/alerts",
            "scans": "/api/scans",
            "threats": "/api/threats"
        },
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/alerts")
async def get_alerts():
    """Get current security alerts"""
    return {
        "alerts": security_state["alerts"],
        "total": len(security_state["alerts"]),
        "threat_level": security_state["threat_level"],
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/metrics")
async def get_security_metrics():
    """Get security metrics for monitoring"""
    return {
        "service": "security-engine",
        "metrics": {
            "alerts_total": len(security_state["alerts"]),
            "alerts_active": len([a for a in security_state["alerts"] if a.get("status") == "active"]),
            "blocked_ips_total": len(security_state["blocked_ips"]),
            "scans_completed": len(security_state["scan_results"]),
            "scans_active": security_state["active_scans"],
            "threat_level": security_state["threat_level"]
        },
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    # Create data directory
    os.makedirs("/app/data", exist_ok=True)
    os.makedirs("/app/logs", exist_ok=True)
    
    logger.info("Starting NovaShield Security Engine...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        log_level="info",
        access_log=True
    )
