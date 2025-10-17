#!/bin/bash

# DigitalOcean Deployment Script for ScriptSensei
# Run this script on your DigitalOcean Droplet

set -e  # Exit on error

echo "🚀 Starting ScriptSensei deployment on DigitalOcean..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installed successfully"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed successfully"
else
    echo "✅ Docker Compose already installed"
fi

# Clone repository
echo "📥 Setting up application..."
if [ -d "script-sensei" ]; then
    echo "Repository already exists, pulling latest changes..."
    cd script-sensei
    git pull origin main
else
    echo "Cloning repository..."
    git clone https://github.com/surya-murugan-ai/script-sensei.git
    cd script-sensei
fi

# Create .env file
echo "⚙️ Setting up environment variables..."
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/scriptsensei

# AI API Keys - REPLACE WITH YOUR ACTUAL KEYS
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here

# Server Configuration
NODE_ENV=production
PORT=5000
EOF
    echo "⚠️  IMPORTANT: Edit .env file with your actual API keys!"
    echo "   Run: nano .env"
    echo ""
    read -p "Press Enter after you've updated the .env file with your API keys..."
fi

# Start Docker containers
echo "🚀 Starting Docker containers..."
docker-compose up -d

# Wait for containers to be healthy
echo "⏳ Waiting for containers to be healthy..."
sleep 10

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose exec -T app npm run db:push || echo "⚠️ Migration might have failed, checking logs..."

# Restart app to ensure proper initialization
echo "🔄 Restarting application..."
docker-compose restart app

# Wait for restart
sleep 5

# Show status
echo "📊 Container status:"
docker-compose ps

echo ""
echo "✅ Deployment completed!"
echo ""
echo "🌐 Your application is running at:"
echo "   http://$(curl -s ifconfig.me):5000"
echo ""
echo "📝 Useful commands:"
echo "   docker-compose logs -f app    # View logs"
echo "   docker-compose ps             # Check status"
echo "   docker-compose restart app    # Restart app"
echo "   docker-compose down           # Stop everything"
echo ""
echo "🔐 Next steps:"
echo "   1. Set up Nginx reverse proxy (optional)"
echo "   2. Configure SSL with Let's Encrypt (optional)"
echo "   3. Set up GitHub Actions for auto-deployment"
echo ""
echo "📚 See DIGITALOCEAN_DEPLOYMENT.md for detailed instructions"

