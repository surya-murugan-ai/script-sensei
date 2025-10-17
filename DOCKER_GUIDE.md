# 🐳 Docker Guide for ScriptSensei

## Quick Start

### **Local Development with Docker:**

```bash
# Start everything (PostgreSQL + App)
npm run docker:dev

# View logs
npm run docker:logs

# Stop everything
npm run docker:down

# Rebuild and restart
npm run docker:rebuild
```

---

## 📋 Available Docker Commands

| Command | What It Does |
|---------|--------------|
| `npm run docker:build` | Build Docker image |
| `npm run docker:run` | Run single container |
| `npm run docker:dev` | Start full stack (PostgreSQL + App) |
| `npm run docker:down` | Stop all containers |
| `npm run docker:logs` | View application logs |
| `npm run docker:rebuild` | Rebuild and restart everything |

---

## 🐳 Docker Compose Commands

```bash
# Start containers
docker-compose up -d

# Stop containers
docker-compose down

# View logs
docker-compose logs -f app
docker-compose logs -f postgres

# Check status
docker-compose ps

# Restart specific service
docker-compose restart app

# Rebuild specific service
docker-compose build --no-cache app

# Execute commands in container
docker-compose exec app npm run db:push
docker-compose exec app sh  # Open shell

# View resource usage
docker stats
```

---

## 🗄️ Database Management

### **Access PostgreSQL:**

```bash
# Connect to database
docker-compose exec postgres psql -U postgres -d scriptsensei

# Run SQL commands
docker-compose exec postgres psql -U postgres -d scriptsensei -c "SELECT * FROM prescriptions;"

# Backup database
docker-compose exec postgres pg_dump -U postgres scriptsensei > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres scriptsensei < backup.sql
```

### **Run Migrations:**

```bash
docker-compose exec app npm run db:push
```

---

## 🔧 Troubleshooting

### **Container won't start:**

```bash
# Check logs
docker-compose logs app

# Check all containers
docker-compose ps

# Restart everything
docker-compose down
docker-compose up -d
```

### **Port already in use:**

```bash
# Windows: Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Linux/Mac: Find and kill
lsof -ti:5000 | xargs kill -9
```

### **Database connection issues:**

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Restart database
docker-compose restart postgres

# Check database logs
docker-compose logs postgres
```

### **Out of disk space:**

```bash
# Clean up Docker
docker system prune -a

# Remove unused volumes
docker volume prune
```

---

## 🏗️ Docker Architecture

```
┌─────────────────────────────────────────┐
│         Docker Compose Stack            │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐   ┌──────────────┐  │
│  │              │   │              │  │
│  │  PostgreSQL  │◄──┤ ScriptSensei │  │
│  │   Database   │   │     App      │  │
│  │              │   │              │  │
│  │  Port: 5432  │   │  Port: 5000  │  │
│  │              │   │              │  │
│  └──────────────┘   └──────────────┘  │
│         ▲                   ▲          │
│         │                   │          │
│    postgres_data       prescriptions/  │
│      (volume)             logs/        │
│                        (volumes)       │
└─────────────────────────────────────────┘
```

---

## 📦 What's Inside the Containers

### **scriptsensei-app:**
- Node.js 20 Alpine
- Built application (dist/)
- Production dependencies
- Health checks enabled
- Auto-restart on failure

### **scriptsensei-db:**
- PostgreSQL 15 Alpine
- Persistent volume
- Health checks enabled
- Auto-backup ready

---

## 🎯 Best Practices

1. **Always use docker-compose** for local development
2. **Don't commit `.env`** file (already in .gitignore)
3. **Backup database** regularly
4. **Monitor logs** for errors
5. **Update images** weekly (`docker-compose pull`)
6. **Clean up** unused images/volumes monthly

---

## 🚀 Production Deployment

See **DIGITALOCEAN_DEPLOYMENT.md** for complete deployment guide.

---

## ✅ Docker is Working When:

```bash
$ docker-compose ps

NAME               STATUS
scriptsensei-app   Up (healthy)  ✅
scriptsensei-db    Up (healthy)  ✅
```

Then visit: `http://localhost:5000` ✅

---

Need help? Check the logs:
```bash
docker-compose logs -f app
```

