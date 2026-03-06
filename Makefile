.PHONY: help install start start-frontend start-backend start-ml stop clean seed

# Default target
help:
	@echo "Work-Mesh Development Makefile"
	@echo ""
	@echo "Usage:"
	@echo "  make install       - Install dependencies for all 3 services"
	@echo "  make ui            - Start React Frontend UI (Port 3000)"
	@echo "  make server        - Start Node.js Backend Server (Port 5000)"
	@echo "  make ml            - Start Python ML Engine (Port 8000)"
	@echo "  make clean         - Remove node_modules and Python virtual environments"

# ── Installation ────────────────────────────────────────────────────────────
install:
	@echo "\n============================================="
	@echo "📦 Installing Node.js Backend Dependencies..."
	@echo "============================================="
	cd backend && npm install

	@echo "\n============================================="
	@echo "📦 Installing React Frontend Dependencies..."
	@echo "============================================="
	cd frontend && npm install

	@echo "\n============================================="
	@echo "📦 Installing Python ML Dependencies..."
	@echo "============================================="
	cd "Python ML" && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
	@echo "\n✅ All dependencies installed successfully.\n"

# ── Individual Starts ───────────────────────────────────────────────────────
ui:
	@echo "🚀 Starting Frontend UI on Port 3000..."
	cd frontend && npm run dev

server:
	@echo "🚀 Starting Backend Server on Port 5000..."
	cd backend && npm run dev

ml:
	@echo "🚀 Starting Python ML Engine on Port 8000..."
	cd "Python ML" && . .venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000

# ── Database Seeder ─────────────────────────────────────────────────────────
seed:
	@echo "🌱 Seeding MongoDB database (one-time setup, idempotent)..."
	cd backend && node seed.js

# ── Cleanup ─────────────────────────────────────────────────────────────────
clean:
	@echo "🧹 Cleaning up node_modules and Python venvs..."
	rm -rf backend/node_modules
	rm -rf frontend/node_modules
	rm -rf "Python ML/.venv"
	@echo "✅ Clean complete."
