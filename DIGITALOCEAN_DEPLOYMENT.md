# 🌊 DigitalOcean Deployment Guide for ScriptSensei

## 🎯 Overview

This guide will help you deploy ScriptSensei on DigitalOcean using Docker and GitHub Actions CI/CD.

---

## 📋 Prerequisites

- DigitalOcean account
- GitHub account (repository already created)
- Domain name (optional)
- AI API Keys (OpenAI, Anthropic, Google Gemini)

---

## 💰 Recommended Droplet Specs

### **Option 1: Basic (Testing/Low Traffic) - $18/month**
- **RAM**: 2GB
- **CPU**: 2 vCPU (Regular Intel)
- **Storage**: 50GB SSD
- **Bandwidth**: 2TB
- **Good for**: Testing, <10 concurrent users

### **Option 2: Recommended (Production) - $24/month**
- **RAM**: 4GB
- **CPU**: 2 vCPU (Regular Intel)
- **Storage**: 80GB SSD
- **Bandwidth**: 4TB
- **Good for**: Production, 10-50 concurrent users

### **Option 3: High Performance - $48/month**
- **RAM**: 8GB
- **CPU**: 4 vCPU (Regular Intel)
- **Storage**: 160GB SSD
- **Bandwidth**: 5TB
- **Good for**: High traffic, 50-200+ concurrent users

---

## 🚀 Step 1: Create DigitalOcean Droplet

1. **Log into DigitalOcean** → Click "Create" → "Droplets"

2. **Choose Configuration:**
   - **Region**: Choose closest to your users
   - **Image**: Ubuntu 22.04 (LTS) x64
   - **Size**: Basic - 4GB RAM / 2 vCPU (Recommended)
   - **Authentication**: SSH Key (recommended) or Password
   - **Hostname**: `scriptsensei-production`

3. **Advanced Options:**
   - Enable "IPv6"
   - Enable "Monitoring"

4. **Click "Create Droplet"**

---

## 🔐 Step 2: Initial Server Setup

### **Connect to Your Droplet:**

```bash
ssh root@your-droplet-ip
```

### **Update System:**

```bash
apt update && apt upgrade -y
```

### **Install Docker:**

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version
```

---

## 📂 Step 3: Clone Repository

```bash
cd ~
git clone https://github.com/surya-murugan-ai/script-sensei.git
cd script-sensei
```

---

## ⚙️ Step 4: Configure Environment Variables

### **Create `.env` file:**

```bash
nano .env
```

### **Add your configuration:**

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/scriptsensei

# AI API Keys - REPLACE WITH YOUR ACTUAL KEYS
OPENAI_API_KEY=sk-your-openai-api-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
GEMINI_API_KEY=your-gemini-api-key

# Server Configuration
NODE_ENV=production
PORT=5000
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

---

## 🐳 Step 5: Start Application with Docker

```bash
# Start containers
docker-compose up -d

# Check status
docker-compose ps

# Run database migrations
docker-compose exec app npm run db:push

# Restart app to initialize properly
docker-compose restart app

# View logs
docker-compose logs -f app
```

---

## ✅ Step 6: Verify Deployment

### **Test Health Check:**

```bash
curl http://localhost:5000/api/health
```

You should see:
```json
{"status":"healthy","timestamp":"...","uptime":...}
```

### **Access in Browser:**

Visit: `http://your-droplet-ip:5000`

You should see the ScriptSensei application!

---

## 🔧 Step 7: Set Up Firewall

```bash
# Install UFW (if not installed)
apt install ufw -y

# Allow SSH, HTTP, and your app port
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5000/tcp

# Enable firewall
ufw --force enable

# Check status
ufw status
```

---

## 🌐 Step 8: Set Up Nginx Reverse Proxy (Optional but Recommended)

### **Install Nginx:**

```bash
apt install nginx -y
```

### **Create Nginx Configuration:**

```bash
nano /etc/nginx/sites-available/scriptsensei
```

### **Add Configuration:**

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Or use droplet IP

    client_max_body_size 10M;  # For file uploads

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### **Enable Site:**

```bash
ln -s /etc/nginx/sites-available/scriptsensei /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## 🔒 Step 9: Set Up SSL with Let's Encrypt (Optional)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

---

## 🤖 Step 10: Set Up GitHub Actions Auto-Deployment

### **On Your Droplet:**

1. **Generate SSH key for GitHub Actions:**

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_key -N ""
cat ~/.ssh/github_actions_key.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_actions_key  # Copy this for GitHub secrets
```

2. **Create deployment user (optional, more secure):**

```bash
adduser deployer
usermod -aG docker deployer
su - deployer
cd ~
git clone https://github.com/surya-murugan-ai/script-sensei.git
```

---

### **On GitHub:**

Go to: **Repository → Settings → Secrets and variables → Actions**

**Add these secrets:**

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `DIGITALOCEAN_SSH_KEY` | Private key from above | SSH key for deployment |
| `DROPLET_IP` | Your droplet IP | e.g., 134.122.45.67 |
| `DROPLET_USER` | `root` or `deployer` | SSH username |

---

## 🔄 Step 11: Test Auto-Deployment

### **Push to GitHub:**

```bash
git add .
git commit -m "Setup CI/CD for DigitalOcean deployment"
git push origin main
```

### **Watch the Workflow:**

Go to: **GitHub Repository → Actions tab**

You'll see:
- ✅ Test & Build
- ✅ Docker Build & Push
- ✅ Security Scan
- ✅ Deploy to DigitalOcean (on main branch)

---

## 📊 Useful Commands

### **On Your Droplet:**

```bash
# View logs
docker-compose logs -f app

# Restart application
docker-compose restart app

# Update application manually
cd ~/script-sensei
git pull origin main
docker-compose pull
docker-compose up -d

# Check container status
docker-compose ps

# View resource usage
docker stats

# Stop everything
docker-compose down

# Start everything
docker-compose up -d
```

---

## 🗄️ Database Options

### **Option 1: Use Docker PostgreSQL (Included)**
- **Cost**: Free (included in droplet)
- **Setup**: Already configured in docker-compose.yml
- ✅ Easy, no extra cost
- ⚠️ Backup manually

### **Option 2: DigitalOcean Managed Database**
- **Cost**: $15/month (Basic)
- **Setup**: Create database cluster, update DATABASE_URL
- ✅ Automated backups
- ✅ Better performance
- ✅ Scalable

**To use Managed Database:**

1. Create PostgreSQL cluster in DigitalOcean
2. Update `.env`:
   ```env
   DATABASE_URL=postgresql://user:password@db-host:25060/defaultdb?sslmode=require
   ```
3. Restart containers

---

## 🔧 Troubleshooting

### **Issue: Container keeps restarting**
```bash
docker-compose logs app
# Check for errors, usually database connection or missing env vars
```

### **Issue: Port 5000 not accessible**
```bash
# Check firewall
ufw status

# Allow port
ufw allow 5000/tcp
```

### **Issue: Database connection failed**
```bash
# Check database container
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### **Issue: Out of disk space**
```bash
# Clean Docker
docker system prune -a

# Check disk usage
df -h
```

---

## 📈 Monitoring

### **Built-in DigitalOcean Monitoring:**
- CPU, Memory, Disk, Network graphs
- Available in Droplet dashboard

### **Application Monitoring:**
```bash
# Real-time logs
docker-compose logs -f app

# Container stats
docker stats scriptsensei-app

# Health check
curl http://localhost:5000/api/health
```

---

## 💾 Backup Strategy

### **Database Backup:**

```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres scriptsensei > backup_$(date +%Y%m%d).sql

# Restore database
docker-compose exec -T postgres psql -U postgres scriptsensei < backup_20251017.sql
```

### **Application Backup:**

```bash
# Backup uploaded files
tar -czf prescriptions_backup.tar.gz prescriptions/

# Backup entire application
tar -czf scriptsensei_backup.tar.gz script-sensei/
```

---

## 🔄 Update Process

### **Automatic (via GitHub Actions):**
1. Push to main branch
2. GitHub Actions automatically deploys
3. Done! ✅

### **Manual:**
```bash
cd ~/script-sensei
git pull origin main
docker-compose pull
docker-compose up -d
```

---

## 💡 Tips

1. **Use DigitalOcean Managed Database** for production (automated backups)
2. **Set up monitoring alerts** in DigitalOcean dashboard
3. **Regular backups** of database and uploaded files
4. **Use domain name** instead of IP (better UX)
5. **Enable SSL** for security (Let's Encrypt is free)
6. **Monitor logs** regularly for errors
7. **Update Docker images** weekly for security patches

---

## 🆘 Support

### **Check Logs:**
```bash
docker-compose logs app --tail 100
```

### **Restart Services:**
```bash
docker-compose restart app
```

### **Full Reset:**
```bash
docker-compose down
docker-compose up -d --build
```

---

## 📊 Cost Summary

### **Minimal Setup:**
- Droplet (2GB): $12/month
- **Total: $12/month**

### **Recommended Setup:**
- Droplet (4GB): $24/month
- **Total: $24/month**

### **Production Setup:**
- Droplet (4GB): $24/month
- Managed Database: $15/month
- **Total: $39/month**

---

## ✅ Deployment Checklist

- [ ] Create DigitalOcean Droplet
- [ ] Install Docker & Docker Compose
- [ ] Clone repository
- [ ] Create `.env` file with API keys
- [ ] Start containers with docker-compose
- [ ] Run database migrations
- [ ] Configure firewall
- [ ] Set up Nginx (optional)
- [ ] Set up SSL (optional)
- [ ] Add GitHub secrets
- [ ] Test auto-deployment
- [ ] Set up backups
- [ ] Monitor application

---

🎉 **Your ScriptSensei is ready for production deployment!**

