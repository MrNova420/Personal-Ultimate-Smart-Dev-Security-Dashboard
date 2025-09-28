# Technical Implementation Guide

## 🛠️ Development Environment Setup

### Prerequisites Installation

#### System Dependencies
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y curl wget git build-essential python3 python3-pip nodejs npm docker.io docker-compose

# macOS
brew install node python git docker docker-compose
brew install --cask docker

# Enable and start Docker
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
```

#### Development Tools
```bash
# Install Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python development tools
pip3 install virtualenv poetry black flake8 pytest

# Install Rust (for performance-critical components)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install Go (for microservices)
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
```

### Project Structure
```
nova-dashboard/
├── frontend/                    # React/TypeScript frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API services
│   │   ├── utils/             # Utility functions
│   │   ├── types/             # TypeScript definitions
│   │   └── styles/            # Global styles
│   ├── public/
│   ├── package.json
│   └── webpack.config.js
├── backend/                    # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/       # Route controllers
│   │   ├── middleware/        # Express middleware
│   │   ├── models/           # Database models
│   │   ├── services/         # Business logic
│   │   ├── utils/            # Utility functions
│   │   ├── security/         # Security implementations
│   │   └── config/           # Configuration files
│   ├── tests/
│   ├── package.json
│   └── Dockerfile
├── security-engine/           # Python security services
│   ├── src/
│   │   ├── scanners/         # Security scanners
│   │   ├── analyzers/        # Threat analyzers
│   │   ├── monitors/         # System monitors
│   │   └── alerts/           # Alert systems
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── ai-engine/                # AI/ML components
│   ├── src/
│   │   ├── nlp/             # Natural language processing
│   │   ├── patterns/        # Pattern recognition
│   │   ├── decisions/       # Decision making
│   │   └── learning/        # Machine learning
│   ├── models/              # Trained models
│   ├── requirements.txt
│   └── Dockerfile
├── terminal-service/         # Terminal emulation service
│   ├── src/
│   │   ├── pty/             # PTY management
│   │   ├── sessions/        # Session handling
│   │   └── commands/        # Command processing
│   ├── Cargo.toml           # Rust project file
│   └── Dockerfile
├── monitoring-service/       # System monitoring
│   ├── src/
│   │   ├── collectors/      # Metric collectors
│   │   ├── processors/      # Data processors
│   │   └── exporters/       # Metric exporters
│   ├── go.mod
│   └── Dockerfile
├── database/                # Database schemas and migrations
│   ├── migrations/
│   ├── seeds/
│   └── schemas/
├── docker/                  # Docker configurations
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   └── docker-compose.prod.yml
├── scripts/                 # Development and deployment scripts
│   ├── setup.sh
│   ├── build.sh
│   ├── test.sh
│   └── deploy.sh
├── docs/                    # Documentation
│   ├── api/
│   ├── architecture/
│   └── user-guides/
├── tests/                   # Integration tests
│   ├── e2e/
│   ├── integration/
│   └── performance/
├── .github/                 # GitHub workflows
│   └── workflows/
├── README.md
├── LICENSE
└── .gitignore
```

## 🏗️ Core Service Implementation

### 1. Authentication Service

#### JWT Token Implementation
```typescript
// backend/src/security/jwt.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

interface TokenPayload {
  userId: string;
  role: string;
  permissions: string[];
  sessionId: string;
}

export class JWTService {
  private readonly secret: string;
  private readonly refreshSecret: string;
  
  constructor() {
    this.secret = process.env.JWT_SECRET || randomBytes(64).toString('hex');
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || randomBytes(64).toString('hex');
  }

  generateTokenPair(payload: TokenPayload) {
    const accessToken = jwt.sign(payload, this.secret, {
      expiresIn: '15m',
      algorithm: 'HS256',
      issuer: 'nova-dashboard',
      audience: 'nova-users'
    });

    const refreshToken = jwt.sign(
      { userId: payload.userId, sessionId: payload.sessionId },
      this.refreshSecret,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.secret) as TokenPayload;
    } catch (error) {
      return null;
    }
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
```

#### Multi-Factor Authentication
```typescript
// backend/src/security/mfa.ts
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export class MFAService {
  generateSecret(userEmail: string) {
    return speakeasy.generateSecret({
      name: `Nova Dashboard (${userEmail})`,
      issuer: 'Nova Dashboard',
      length: 32
    });
  }

  async generateQR(secret: string): Promise<string> {
    return QRCode.toDataURL(secret);
  }

  verifyToken(token: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      token,
      window: 2,
      time: 30
    });
  }

  generateBackupCodes(): string[] {
    return Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 15)
    );
  }
}
```

### 2. Security Engine (Python)

#### Vulnerability Scanner
```python
# security-engine/src/scanners/vulnerability_scanner.py
import asyncio
import aiohttp
import json
import xml.etree.ElementTree as ET
from typing import List, Dict, Any
from dataclasses import dataclass
from enum import Enum

class SeverityLevel(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

@dataclass
class Vulnerability:
    id: str
    title: str
    description: str
    severity: SeverityLevel
    cvss_score: float
    affected_component: str
    recommendation: str
    references: List[str]

class VulnerabilityScanner:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.session = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def scan_dependencies(self, manifest_path: str) -> List[Vulnerability]:
        """Scan dependencies for known vulnerabilities"""
        vulnerabilities = []
        
        # Parse package.json, requirements.txt, etc.
        dependencies = await self._parse_dependencies(manifest_path)
        
        # Check against vulnerability databases
        for dep in dependencies:
            vulns = await self._check_vulnerability_db(dep)
            vulnerabilities.extend(vulns)
            
        return vulnerabilities

    async def scan_code_security(self, code_path: str) -> List[Vulnerability]:
        """Perform static code analysis for security issues"""
        vulnerabilities = []
        
        # SQL Injection detection
        sql_issues = await self._detect_sql_injection(code_path)
        vulnerabilities.extend(sql_issues)
        
        # XSS detection
        xss_issues = await self._detect_xss(code_path)
        vulnerabilities.extend(xss_issues)
        
        # Insecure cryptography detection
        crypto_issues = await self._detect_weak_crypto(code_path)
        vulnerabilities.extend(crypto_issues)
        
        return vulnerabilities

    async def scan_network_ports(self, target: str) -> List[Vulnerability]:
        """Scan network ports for security issues"""
        # Implementation for port scanning
        # Using python-nmap or custom implementation
        pass

    async def _check_vulnerability_db(self, dependency: Dict) -> List[Vulnerability]:
        """Check dependency against vulnerability databases"""
        # Check against NVD, OSV, etc.
        vulnerabilities = []
        
        # Example: Query OSV database
        osv_url = f"https://api.osv.dev/v1/query"
        payload = {
            "package": {
                "name": dependency["name"],
                "ecosystem": dependency["ecosystem"]
            },
            "version": dependency["version"]
        }
        
        if self.session:
            async with self.session.post(osv_url, json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    for vuln in data.get("vulns", []):
                        vulnerabilities.append(self._parse_osv_vulnerability(vuln))
        
        return vulnerabilities
```

#### Real-time Threat Monitor
```python
# security-engine/src/monitors/threat_monitor.py
import asyncio
import psutil
import logging
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from typing import Dict, List, Callable, Any

class ThreatMonitor:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.observers = []
        self.callbacks: List[Callable] = []
        self.logger = logging.getLogger(__name__)
        
    def add_callback(self, callback: Callable):
        """Add callback for threat detection"""
        self.callbacks.append(callback)
        
    async def start_monitoring(self):
        """Start all monitoring services"""
        await asyncio.gather(
            self._monitor_processes(),
            self._monitor_network(),
            self._monitor_filesystem(),
            self._monitor_system_resources()
        )
        
    async def _monitor_processes(self):
        """Monitor running processes for suspicious activity"""
        known_processes = set()
        
        while True:
            current_processes = set()
            
            for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'cpu_percent']):
                try:
                    proc_info = proc.info
                    proc_id = (proc_info['pid'], proc_info['name'])
                    current_processes.add(proc_id)
                    
                    # Detect new processes
                    if proc_id not in known_processes:
                        await self._analyze_new_process(proc_info)
                        
                    # Check CPU usage anomalies
                    if proc_info['cpu_percent'] > 80:
                        await self._handle_high_cpu_usage(proc_info)
                        
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
                    
            known_processes = current_processes
            await asyncio.sleep(5)
            
    async def _monitor_network(self):
        """Monitor network connections for suspicious activity"""
        while True:
            connections = psutil.net_connections()
            
            for conn in connections:
                if conn.status == 'ESTABLISHED':
                    await self._analyze_network_connection(conn)
                    
            await asyncio.sleep(10)
            
    async def _analyze_new_process(self, proc_info: Dict):
        """Analyze newly created processes"""
        suspicious_names = [
            'nc', 'netcat', 'ncat', 'socat',
            'wget', 'curl', 'powershell',
            'cmd.exe', 'bash', 'sh'
        ]
        
        if any(name in proc_info['name'].lower() for name in suspicious_names):
            alert = {
                'type': 'suspicious_process',
                'severity': 'medium',
                'process': proc_info,
                'timestamp': asyncio.get_event_loop().time()
            }
            await self._trigger_alert(alert)
```

### 3. Terminal Service (Rust)

#### PTY Management
```rust
// terminal-service/src/pty/manager.rs
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::{mpsc, RwLock};
use uuid::Uuid;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalSession {
    pub id: String,
    pub user_id: String,
    pub shell: String,
    pub working_directory: String,
    pub environment: HashMap<String, String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_activity: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug)]
pub struct PtyManager {
    sessions: Arc<RwLock<HashMap<String, TerminalSession>>>,
    processes: Arc<Mutex<HashMap<String, tokio::process::Child>>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
            processes: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn create_session(
        &self,
        user_id: String,
        shell: Option<String>,
        working_directory: Option<String>,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let session_id = Uuid::new_v4().to_string();
        let shell = shell.unwrap_or_else(|| "/bin/bash".to_string());
        let working_directory = working_directory
            .unwrap_or_else(|| std::env::var("HOME").unwrap_or("/".to_string()));

        let session = TerminalSession {
            id: session_id.clone(),
            user_id,
            shell: shell.clone(),
            working_directory: working_directory.clone(),
            environment: std::env::vars().collect(),
            created_at: chrono::Utc::now(),
            last_activity: chrono::Utc::now(),
        };

        // Create PTY process
        let mut cmd = tokio::process::Command::new(&shell);
        cmd.current_dir(&working_directory);
        cmd.envs(&session.environment);
        
        // Configure PTY
        #[cfg(unix)]
        {
            use std::os::unix::process::CommandExt;
            cmd.process_group(0);
        }

        let child = cmd.spawn()?;
        
        // Store session and process
        self.sessions.write().await.insert(session_id.clone(), session);
        self.processes.lock().unwrap().insert(session_id.clone(), child);

        Ok(session_id)
    }

    pub async fn write_to_session(
        &self,
        session_id: &str,
        data: &[u8],
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Update last activity
        if let Some(session) = self.sessions.write().await.get_mut(session_id) {
            session.last_activity = chrono::Utc::now();
        }

        // Write to PTY
        if let Some(process) = self.processes.lock().unwrap().get_mut(session_id) {
            if let Some(stdin) = process.stdin.as_mut() {
                use tokio::io::AsyncWriteExt;
                stdin.write_all(data).await?;
                stdin.flush().await?;
            }
        }

        Ok(())
    }

    pub async fn cleanup_inactive_sessions(&self) {
        let mut sessions = self.sessions.write().await;
        let mut processes = self.processes.lock().unwrap();
        
        let now = chrono::Utc::now();
        let inactive_threshold = chrono::Duration::hours(24);

        let inactive_sessions: Vec<String> = sessions
            .iter()
            .filter(|(_, session)| now - session.last_activity > inactive_threshold)
            .map(|(id, _)| id.clone())
            .collect();

        for session_id in inactive_sessions {
            sessions.remove(&session_id);
            if let Some(mut process) = processes.remove(&session_id) {
                let _ = process.kill().await;
            }
        }
    }
}
```

### 4. Monitoring Service (Go)

#### System Metrics Collector
```go
// monitoring-service/src/collectors/system_collector.go
package collectors

import (
    "context"
    "encoding/json"
    "log"
    "runtime"
    "time"

    "github.com/shirou/gopsutil/v3/cpu"
    "github.com/shirou/gopsutil/v3/disk"
    "github.com/shirou/gopsutil/v3/host"
    "github.com/shirou/gopsutil/v3/mem"
    "github.com/shirou/gopsutil/v3/net"
)

type SystemMetrics struct {
    Timestamp   time.Time            `json:"timestamp"`
    CPU         CPUMetrics          `json:"cpu"`
    Memory      MemoryMetrics       `json:"memory"`
    Disk        []DiskMetrics       `json:"disk"`
    Network     NetworkMetrics      `json:"network"`
    System      SystemInfo          `json:"system"`
}

type CPUMetrics struct {
    Usage       []float64   `json:"usage"`
    Count       int         `json:"count"`
    Temperature float64     `json:"temperature"`
}

type MemoryMetrics struct {
    Total       uint64      `json:"total"`
    Available   uint64      `json:"available"`
    Used        uint64      `json:"used"`
    UsedPercent float64     `json:"used_percent"`
    SwapTotal   uint64      `json:"swap_total"`
    SwapUsed    uint64      `json:"swap_used"`
}

type DiskMetrics struct {
    Device      string      `json:"device"`
    Mountpoint  string      `json:"mountpoint"`
    Total       uint64      `json:"total"`
    Used        uint64      `json:"used"`
    Free        uint64      `json:"free"`
    UsedPercent float64     `json:"used_percent"`
}

type NetworkMetrics struct {
    BytesSent   uint64      `json:"bytes_sent"`
    BytesRecv   uint64      `json:"bytes_recv"`
    PacketsSent uint64      `json:"packets_sent"`
    PacketsRecv uint64      `json:"packets_recv"`
}

type SystemInfo struct {
    Hostname    string      `json:"hostname"`
    OS          string      `json:"os"`
    Platform    string      `json:"platform"`
    Uptime      uint64      `json:"uptime"`
    Processes   uint64      `json:"processes"`
}

type SystemCollector struct {
    interval time.Duration
    output   chan<- []byte
}

func NewSystemCollector(interval time.Duration, output chan<- []byte) *SystemCollector {
    return &SystemCollector{
        interval: interval,
        output:   output,
    }
}

func (c *SystemCollector) Start(ctx context.Context) error {
    ticker := time.NewTicker(c.interval)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-ticker.C:
            metrics, err := c.collectMetrics()
            if err != nil {
                log.Printf("Error collecting system metrics: %v", err)
                continue
            }

            data, err := json.Marshal(metrics)
            if err != nil {
                log.Printf("Error marshaling metrics: %v", err)
                continue
            }

            select {
            case c.output <- data:
            default:
                log.Println("Output channel full, dropping metrics")
            }
        }
    }
}

func (c *SystemCollector) collectMetrics() (*SystemMetrics, error) {
    metrics := &SystemMetrics{
        Timestamp: time.Now(),
    }

    // CPU metrics
    cpuPercent, err := cpu.Percent(time.Second, true)
    if err != nil {
        return nil, err
    }
    metrics.CPU.Usage = cpuPercent
    metrics.CPU.Count = runtime.NumCPU()

    // Memory metrics
    vmStat, err := mem.VirtualMemory()
    if err != nil {
        return nil, err
    }
    swapStat, err := mem.SwapMemory()
    if err != nil {
        return nil, err
    }
    
    metrics.Memory = MemoryMetrics{
        Total:       vmStat.Total,
        Available:   vmStat.Available,
        Used:        vmStat.Used,
        UsedPercent: vmStat.UsedPercent,
        SwapTotal:   swapStat.Total,
        SwapUsed:    swapStat.Used,
    }

    // Disk metrics
    partitions, err := disk.Partitions(false)
    if err != nil {
        return nil, err
    }
    
    for _, partition := range partitions {
        usage, err := disk.Usage(partition.Mountpoint)
        if err != nil {
            continue
        }
        
        metrics.Disk = append(metrics.Disk, DiskMetrics{
            Device:      partition.Device,
            Mountpoint:  partition.Mountpoint,
            Total:       usage.Total,
            Used:        usage.Used,
            Free:        usage.Free,
            UsedPercent: usage.UsedPercent,
        })
    }

    // Network metrics
    netStat, err := net.IOCounters(false)
    if err != nil {
        return nil, err
    }
    
    if len(netStat) > 0 {
        metrics.Network = NetworkMetrics{
            BytesSent:   netStat[0].BytesSent,
            BytesRecv:   netStat[0].BytesRecv,
            PacketsSent: netStat[0].PacketsSent,
            PacketsRecv: netStat[0].PacketsRecv,
        }
    }

    // System info
    hostInfo, err := host.Info()
    if err != nil {
        return nil, err
    }
    
    metrics.System = SystemInfo{
        Hostname:  hostInfo.Hostname,
        OS:        hostInfo.OS,
        Platform:  hostInfo.Platform,
        Uptime:    hostInfo.Uptime,
        Processes: hostInfo.Procs,
    }

    return metrics, nil
}
```

## 🔧 Build & Deployment

### Docker Compose Configuration
```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REACT_APP_API_URL=https://localhost:8443
    volumes:
      - ../frontend/src:/app/src
    depends_on:
      - backend

  backend:
    build:
      context: ../backend
      dockerfile: Dockerfile
    ports:
      - "8443:8443"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - DATABASE_URL=sqlite:///app/data/nova.db
      - REDIS_URL=redis://redis:6379
    volumes:
      - nova-data:/app/data
      - /var/run/docker.sock:/var/run/docker.sock:ro
    depends_on:
      - redis
      - security-engine
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE

  security-engine:
    build:
      context: ../security-engine
      dockerfile: Dockerfile
    environment:
      - PYTHONPATH=/app/src
      - DATABASE_URL=sqlite:///app/data/security.db
    volumes:
      - nova-data:/app/data
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL

  ai-engine:
    build:
      context: ../ai-engine
      dockerfile: Dockerfile
    environment:
      - PYTHONPATH=/app/src
      - MODEL_PATH=/app/models
    volumes:
      - nova-data:/app/data
      - ai-models:/app/models
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  terminal-service:
    build:
      context: ../terminal-service
      dockerfile: Dockerfile
    privileged: true
    volumes:
      - /dev:/dev
      - nova-data:/app/data
    security_opt:
      - apparmor:unconfined

  monitoring-service:
    build:
      context: ../monitoring-service
      dockerfile: Dockerfile
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - HOST_PROC=/host/proc
      - HOST_SYS=/host/sys
    security_opt:
      - no-new-privileges:true

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - SETGID
      - SETUID

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ../nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ../ssl:/etc/ssl/certs:ro
    depends_on:
      - frontend
      - backend
    security_opt:
      - no-new-privileges:true

volumes:
  nova-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ${DATA_PATH:-./data}
  
  redis-data:
    driver: local
  
  ai-models:
    driver: local

networks:
  default:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Build Scripts
```bash
#!/bin/bash
# scripts/build.sh

set -e

echo "🏗️  Building Nova Dashboard..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm ci --production
npm run build
cd ..

# Build backend
echo "🚀 Building backend..."
cd backend
npm ci --production
npm run build
cd ..

# Build security engine
echo "🛡️  Building security engine..."
cd security-engine
python -m pip install -r requirements.txt
python -m py_compile src/**/*.py
cd ..

# Build AI engine
echo "🤖 Building AI engine..."
cd ai-engine
python -m pip install -r requirements.txt
python -c "import nltk; nltk.download('punkt')"
cd ..

# Build terminal service
echo "💻 Building terminal service..."
cd terminal-service
cargo build --release
cd ..

# Build monitoring service
echo "📊 Building monitoring service..."
cd monitoring-service
go mod download
go build -o bin/monitoring-service ./src
cd ..

# Build Docker images
echo "🐳 Building Docker images..."
docker-compose -f docker/docker-compose.yml build

echo "✅ Build completed successfully!"
```

### Testing Scripts
```bash
#!/bin/bash
# scripts/test.sh

set -e

echo "🧪 Running tests..."

# Frontend tests
echo "Testing frontend..."
cd frontend
npm test -- --coverage --watchAll=false
cd ..

# Backend tests
echo "Testing backend..."
cd backend
npm test -- --coverage
cd ..

# Security engine tests
echo "Testing security engine..."
cd security-engine
python -m pytest tests/ --cov=src --cov-report=html
cd ..

# AI engine tests
echo "Testing AI engine..."
cd ai-engine
python -m pytest tests/ --cov=src --cov-report=html
cd ..

# Terminal service tests
echo "Testing terminal service..."
cd terminal-service
cargo test
cd ..

# Monitoring service tests
echo "Testing monitoring service..."
cd monitoring-service
go test -v -cover ./src/...
cd ..

# Integration tests
echo "Running integration tests..."
cd tests/integration
python -m pytest -v
cd ../..

# End-to-end tests
echo "Running E2E tests..."
cd tests/e2e
npx playwright test
cd ../..

echo "✅ All tests passed!"
```

This technical implementation guide provides the foundation for building the Nova Dashboard with enterprise-grade security, comprehensive development tools, and intelligent automation. The modular architecture ensures scalability and maintainability while the detailed code examples demonstrate best practices for each component.