#!/bin/bash

# AWS EC2 Deployment Script for ScriptSensei
# Run this script on your EC2 instance

echo "🚀 Starting ScriptSensei deployment on AWS EC2..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL client (if using local PostgreSQL)
echo "📦 Installing PostgreSQL..."
sudo apt-get install -y postgresql-client

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Clone or update repository
echo "📥 Setting up application..."
if [ -d "ScriptSensei" ]; then
    echo "Updating existing repository..."
    cd ScriptSensei
    git pull origin aws-deployment
else
    echo "Cloning repository..."
    git clone https://github.com/yourusername/ScriptSensei.git
    cd ScriptSensei
    git checkout aws-deployment
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Set up environment variables
echo "⚙️ Setting up environment variables..."
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp deployment.env.example .env
    echo "⚠️  Please edit .env file with your actual configuration values!"
    echo "   - Update DATABASE_URL with your RDS connection string"
    echo "   - Add your AI API keys"
    nano .env
fi

# Set up database
echo "🗄️ Setting up database..."
npm run db:push

# Build the application
echo "🔨 Building application..."
npm run build

# Start the application with PM2
echo "🚀 Starting application with PM2..."
pm2 start dist/index.js --name "scriptsensei" --env production

# Save PM2 configuration
pm2 save
pm2 startup

echo "✅ Deployment completed!"
echo "🌐 Your application should be running on port 5000"
echo "📊 Check status with: pm2 status"
echo "📝 View logs with: pm2 logs scriptsensei"
