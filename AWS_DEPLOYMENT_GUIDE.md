# 🚀 AWS EC2 Deployment Guide for ScriptSensei

## Prerequisites

1. **AWS Account** with EC2 access
2. **GitHub Repository** with your code
3. **API Keys** for OpenAI, Anthropic, and Google Gemini
4. **PostgreSQL Database** (AWS RDS recommended)

## Step 1: Launch EC2 Instance

### Instance Configuration
- **AMI**: Ubuntu 22.04 LTS
- **Instance Type**: t3.medium or larger (recommended for AI processing)
- **Storage**: 20GB+ SSD
- **Security Group**: 
  - Port 22 (SSH)
  - Port 5000 (HTTP) - or your chosen port
  - Port 80/443 (if using load balancer)

## Step 2: Connect to EC2 Instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

## Step 3: Run Deployment Script

```bash
# Make script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

## Step 4: Configure Environment Variables

Edit the `.env` file with your actual values:

```bash
nano .env
```

Update these values:
- `DATABASE_URL`: Your PostgreSQL connection string
- `OPENAI_API_KEY`: Your OpenAI API key
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `GEMINI_API_KEY`: Your Google Gemini API key

## Step 5: Set Up Database

### Option A: AWS RDS (Recommended)
1. Create RDS PostgreSQL instance
2. Update `DATABASE_URL` in `.env`
3. Run: `npm run db:push`

### Option B: Local PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb scriptsensei
# Update DATABASE_URL to point to local instance
npm run db:push
```

## Step 6: Start Application

```bash
# Using PM2 (recommended)
npm run start:pm2

# Or using Node.js directly
npm start
```

## Step 7: Verify Deployment

1. **Check application status**:
   ```bash
   pm2 status
   ```

2. **View logs**:
   ```bash
   pm2 logs scriptsensei
   ```

3. **Test application**:
   - Open browser to `http://your-ec2-public-ip:5000`
   - Upload a prescription image
   - Verify AI processing works

## Step 8: Set Up Domain (Optional)

### Using AWS Route 53
1. Register domain or use existing
2. Create A record pointing to EC2 public IP
3. Update security group to allow port 80/443

### Using Nginx Reverse Proxy
```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/scriptsensei
```

Nginx configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Troubleshooting

### Common Issues

1. **TypeScript Compilation Errors**:
   ```bash
   npm run check
   npm run build
   ```

2. **Database Connection Issues**:
   - Check `DATABASE_URL` format
   - Verify RDS security groups
   - Test connection: `psql $DATABASE_URL`

3. **API Key Issues**:
   - Verify API keys are correct
   - Check API quotas and billing
   - Test with curl or Postman

4. **Port Issues**:
   - Check security group settings
   - Verify application is binding to 0.0.0.0
   - Check firewall: `sudo ufw status`

### Useful Commands

```bash
# Restart application
pm2 restart scriptsensei

# View real-time logs
pm2 logs scriptsensei --lines 100

# Monitor resources
pm2 monit

# Update application
git pull origin aws-deployment
npm install
npm run build
pm2 restart scriptsensei
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **API Keys**: Use AWS Secrets Manager for production
3. **Database**: Use RDS with encryption
4. **HTTPS**: Set up SSL certificate (Let's Encrypt)
5. **Firewall**: Restrict access to necessary ports only

## Monitoring

### Set up CloudWatch
1. Install CloudWatch agent
2. Monitor CPU, memory, disk usage
3. Set up alarms for critical metrics

### Application Monitoring
```bash
# Install monitoring tools
npm install -g clinic
clinic doctor -- node dist/index.js
```

## Backup Strategy

1. **Database**: Enable automated RDS backups
2. **Application**: Regular git pushes
3. **Files**: Backup uploaded prescription images to S3

## Cost Optimization

1. **Instance Type**: Start with t3.medium, scale as needed
2. **Storage**: Use EBS GP3 for better price/performance
3. **Reserved Instances**: For long-term usage
4. **Spot Instances**: For development/testing

## Support

For issues or questions:
1. Check application logs: `pm2 logs scriptsensei`
2. Verify environment variables
3. Test API endpoints individually
4. Check AWS CloudWatch for infrastructure issues
