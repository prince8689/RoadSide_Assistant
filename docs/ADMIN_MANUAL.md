# RoadAssist — Admin Manual

---

## Admin Login
URL: https://your-app.vercel.app/login
Email: admin@roadside.com
Password: [provided separately for security]

---

## Dashboard Overview

### Stats Cards
| Card | Description |
|------|-------------|
| Total Users | All registered vehicle owners |
| Total Mechanics | All registered mechanics |
| Verified Mechanics | Mechanics cleared for service |
| Pending Verification | Mechanics awaiting review |
| Total Requests | All service requests ever |
| Active Requests | Currently ongoing jobs |
| Completed Today | Jobs done today |
| Online Mechanics | Currently available mechanics |

### Live Updates
- Dashboard stats update automatically every 30 seconds
- New requests appear instantly without refresh

---

## Mechanic Verification

### How to Verify
1. Go to "Mechanics" from sidebar
2. Click "Pending" tab
3. Review mechanic details:
   - Name, experience, specializations
   - Document numbers (license, aadhar, certificate)
4. Click ✅ VERIFY to approve
   - Mechanic gets instant notification
   - Can now receive service requests

### How to Reject
1. Click ❌ REJECT
2. Enter rejection reason (required)
3. Click "Confirm Rejection"
   - Mechanic gets notification with reason
   - Must resubmit corrected documents

### Verification Guidelines
- Verify license number is valid format
- Verify Aadhar is 12 digits
- Check certificate is from recognized institution
- Reject if any document is missing or unclear

---

## User Management

### View All Users
- Go to "Users" from sidebar
- Use filters: Role, Status, Search by name/email

### Deactivate User
1. Click action menu (⋮) next to user
2. Select "Deactivate Account"
3. Confirm in dialog
- User cannot login after deactivation
- Use for: spam accounts, abuse reports

### Reactivate User
1. Filter by Status: Inactive
2. Find the user
3. Click action menu → "Activate Account"

---

## Service Requests Monitoring

### View All Requests
- Go to "All Requests" from sidebar
- Filters: Status, Category, Date Range
- Search by address or description

### Request Status Flow
pending → accepted → en_route → arrived → in_progress → completed
→ cancelled

### Handle Disputes
- If user or mechanic reports issue
- View full request timeline in detail modal
- Contact parties via their phone numbers
- Can cancel stuck requests if needed

---

## Service Categories Management

### Add New Category
1. Go to "Categories" from sidebar
2. Click "+ Add New"
3. Fill in:
   - Category Name
   - Base Price (₹)
   - Description
4. Save

### Edit Category
- Click Edit on any category card
- Update name, price, or description
- Changes apply immediately

### Disable Category
- Click "Disable" to hide from users
- Re-enable anytime

---

## Reports

### Generate Report
1. Go to "Reports" from sidebar
2. Select date range
3. Click "Generate Report"

### Report Contents
- Total requests in period
- Breakdown by status
- Breakdown by service category
- Top performing mechanics
- Revenue summary

---

## Important Admin Actions

### Monthly Tasks
- Review and verify pending mechanics
- Check for inactive user accounts
- Generate monthly performance report
- Monitor top mechanics by rating

### Weekly Tasks
- Check request completion rate
- Review any negative reviews
- Monitor system performance via health check

### Daily Tasks
- Check dashboard for any issues
- Verify new mechanic applications
- Monitor live requests

---

## Emergency Contacts
- Technical Support: [your email]
- Server Status: https://your-backend.railway.app/api/health
- Deployment Logs: Railway Dashboard
