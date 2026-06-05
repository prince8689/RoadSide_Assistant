# Maintenance Guide

## Regular Maintenance Tasks

### Daily
- Check health endpoint:
  GET https://your-backend.railway.app/api/health
- Check Railway deployment logs for errors
- Monitor active requests on admin dashboard

### Weekly
- Review Railway metrics (CPU, Memory, Network)
- Check Redis memory usage
- Review error logs
- Backup database (Railway auto-backups daily)

### Monthly
- Review and rotate JWT_SECRET if needed
- Check for Node.js security updates
- Review rate limit logs for abuse
- Generate performance report

---

## How to Update the Application

### Deploy New Backend Version
1. Make changes in server/ folder
2. Test locally: npm run dev
3. Commit and push to main branch
4. Railway auto-deploys in 2-3 minutes
5. Verify: GET /api/health still returns OK

### Deploy New Frontend Version
1. Make changes in client/ folder
2. Test locally: npm start
3. Build test: npm run build
4. Commit and push to main branch
5. Vercel auto-deploys in 2-3 minutes

---

## Database Maintenance

### Access Database
Railway Dashboard → PostgreSQL → Query tab

### Useful Queries
```sql
-- Check all users
SELECT id, full_name, email, role, is_active
FROM users ORDER BY created_at DESC;

-- Check active requests
SELECT * FROM service_requests
WHERE status NOT IN ('completed','cancelled');

-- Check mechanic ratings
SELECT u.full_name, mp.rating, mp.total_jobs
FROM mechanic_profiles mp
JOIN users u ON u.id = mp.user_id
ORDER BY mp.rating DESC;

-- Cleanup old notifications (older than 90 days)
DELETE FROM notifications
WHERE created_at < NOW() - INTERVAL '90 days'
AND is_read = true;
```

## Troubleshooting Common Issues

**Issue: Socket not connecting**
Fix: Check CLIENT_URL in Railway variables. Verify frontend REACT_APP_SOCKET_URL is correct.

**Issue: API calls failing (CORS error)**
Fix: Update CLIENT_URL in Railway environment variables. Must match exact Vercel URL including https://.

**Issue: Database connection failed**
Fix: Check DATABASE_URL in Railway variables. Verify SSL configuration in db.js.

**Issue: Mechanics not receiving requests**
Fix: Check mechanic is_available = true in DB. Check mechanic is_verified = true. Check Redis mechanic:location key exists.

**Issue: Maps not loading**
Fix: Check REACT_APP_MAPS_API_KEY in Vercel. Verify OpenStreetMap tiles are accessible.

## Scaling Guide (Future)
When platform grows:
- Upgrade Railway plan for more resources
- Add read replicas for PostgreSQL
- Add Redis cluster for high availability
- Consider AWS EC2 for backend
- Add CDN for static assets
- Implement load balancing
