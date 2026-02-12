# Manual Deployment Guide - Simonov DOP

This guide enables manual deployment of the website to the SUFIDE VPS (`54.37.233.85`) using the "Ghost Container" pattern. This bypasses Coolify's build system while still integrating with its Traefik proxy.

## Prerequisites
- SSH Access to `debian@54.37.233.85` (Password: `SufideVPS2026!`).
- The `html` folder and `docker-compose.yml` must be on the server.

## Step 1: Upload Files
Run this command from your local terminal (PowerShell):

```powershell
# Create directory on server
ssh debian@54.37.233.85 "mkdir -p ~/simonov-dop/html/assets"

# Upload configuration
scp docker-compose.yml debian@54.37.233.85:~/simonov-dop/

# Upload static content (excluding large videos if preferred, but basic sync is needed)
scp -r html/* debian@54.37.233.85:~/simonov-dop/html/
```

> **Note**: If `showreel.mp4` is missing locally or ignored, you must upload it explicitly:
> `scp "path/to/showreel.mp4" debian@54.37.233.85:~/simonov-dop/html/assets/`

## Step 2: Launch Container
Connect to the server and start the service:

```bash
ssh debian@54.37.233.85
cd ~/simonov-dop

# Restart the container
sudo docker compose up -d --force-recreate
```

## Step 3: Verify
Check if the container is running and connected to the network:

```bash
# Check status
sudo docker ps | grep simonov

# Check logs for Nginx start
sudo docker logs simonov-dop
```
