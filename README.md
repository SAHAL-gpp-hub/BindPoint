# College Project Report Printing Management Web App

A production-grade, responsive web application for managing college project report collection, automatic page and duplex geometry analysis, physical print pricing, mandatory student PDF verification, manual UPI payment confirmation, and high-volume print station operations.

---

## 1. Quick Setup (< 5 Minutes)

### Prerequisites
- **Python 3.12+**
- **Node.js 20+ & npm**
- **Docker & Docker Compose** (for PostgreSQL)

### Step 1: Start PostgreSQL
```bash
docker compose up -d postgres
```

### Step 2: Configure Environment
Copy the template and inspect `.env`:
```bash
cp .env.example .env
```
*(Configure `ADMIN_PASSWORD`, `UPI_ID`, `PAYEE_NAME`, and `COLLECTION_INSTRUCTIONS` if needed.)*

### Step 3: Install Backend Dependencies, Initialize DB & Seed Demo Data
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. python backend/app/init_db.py
PYTHONPATH=. python scripts/seed_demo_data.py
```
*(The seed script populates sample students, uploaded PDF reports, payment verifications, and an active print batch with 50% completion progress).*

### Step 4: Install Frontend Dependencies & Build
```bash
cd frontend
npm install
npm run build
cd ..
```

### Step 5: Start Servers
- **Backend (FastAPI on Port 8000):**
  ```bash
  PYTHONPATH=. .venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
  ```
- **Frontend (Vite on Port 5173):**
  ```bash
  npm --prefix frontend run dev
  ```
- Open `http://localhost:5173` in your browser.

---

## 2. Environment Variables & Pricing Configuration

All critical secrets and configuration parameters are loaded strictly from `.env`:

| Key | Description | Default |
|---|---|---|
| `ADMIN_EMAIL` | Administrator login email | `admin@printstation.local` |
| `ADMIN_PASSWORD` | Administrator initial password (Argon2id hashed on startup) | `AdminSecurePassword2026!` |
| `UPI_ID` | Virtual Payment Address for UPI payments | `printstation@okaxis` |
| `PAYEE_NAME` | Name shown on student UPI payment apps | `College Print Station` |
| `COLLECTION_INSTRUCTIONS` | Text shown to students on receipt regarding physical collection | Project Lab Room 302 |
| `MAX_FILE_SIZE_MB` | Maximum allowed uploaded PDF size in megabytes | `50` |
| `UNIQUE_PAISE_AMOUNT` | If `true`, adds unique paise offsets for manual bank statement reconciliation | `false` |
| `FILE_RETENTION_DAYS` | Number of days to retain files for completed orders before purge | `90` |

### How to Adjust Pricing Rates
Pricing rates live in a single backend configuration file: [`backend/app/core/pricing.py`](file:///Users/mohammad/print%20simulator/backend/app/core/pricing.py):
```python
@dataclass(frozen=True)
class PricingConfig:
    special_first_page: Decimal = Decimal("10.00")   # First special paper sheet
    special_extra_sheet: Decimal = Decimal("10.00")  # Extra blank special end sheet
    colour_side: Decimal = Decimal("5.00")           # Per printed colour side (duplex)
```
*Note: The frontend displays only backend-computed values and never calculates prices.*

---

## 3. Testing UPI Deep Links with a Real ₹1 Payment

When testing on physical mobile phones:
1. Ensure your phone and development computer are on the same Wi-Fi network.
2. Start the Vite server with `--host 0.0.0.0` or tunnel via Cloudflare/Tailscale.
3. Open the web app on your phone browser (Safari / Chrome).
4. Upload a test report and advance to the payment step.
5. Tap **"Pay with UPI App"**. Your phone will prompt to open installed UPI apps (Google Pay, PhonePe, Paytm, or BHIM).
6. Verify that the app opens with the exact `pa`, `pn`, `am`, and `tn` (Order ID).
7. If testing with a real ₹1 payment, submit the 12-digit UTR shown on your receipt, then approve it in the Admin Console.

---

## 4. Database Backups & Cron Schedule

A standalone backup script is provided at `scripts/backup_db.sh`:
```bash
./scripts/backup_db.sh
```
This dumps the PostgreSQL database into a timestamped, gzip-compressed archive in `storage/backups/` and automatically prunes backups older than 14 days.

### Recommended Cron Job (Daily at 2:00 AM)
Run `crontab -e` and add:
```cron
0 2 * * * /bin/bash /path/to/print-simulator/scripts/backup_db.sh >> /path/to/print-simulator/storage/backups/backup.log 2>&1
```

---

## 5. File Retention Cleanup Command

To purge uploaded PDFs and screenshots for completed orders older than 90 days (freeing disk space while preserving database audit logs):
```bash
python -m backend.cli cleanup-files 90
```
This can be scheduled to run weekly via cron:
```cron
0 3 * * 0 /path/to/print-simulator/.venv/bin/python -m backend.cli cleanup-files 90 >> /path/to/print-simulator/storage/retention.log 2>&1
```

---

## 6. VPS Deployment Guide

For deploying to an Ubuntu/Debian Linux VPS:

1. **System packages:**
   ```bash
   sudo apt update && sudo apt install -y python3-venv python3-pip nginx docker.io docker-compose
   ```
2. **Setup application:**
   Clone repository, start PostgreSQL via `docker compose up -d`, and build the frontend bundle:
   ```bash
   npm --prefix frontend run build
   ```
3. **Systemd Service for Backend:**
   Create `/etc/systemd/system/printstation.service`:
   ```ini
   [Unit]
   Description=Print Station FastAPI Backend
   After=network.target

   [Service]
   User=www-data
   WorkingDirectory=/var/www/print-station
   ExecStart=/var/www/print-station/.venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```
4. **Nginx Reverse Proxy:**
   Configure Nginx to serve the built frontend at `/` and proxy `/api/` to `http://127.0.0.1:8000/api/`.

---

## 7. Running the Test Suite

```bash
# 1. Run all backend tests (pricing, PDF geometry, verification gate, auth, UTR uniqueness)
PYTHONPATH=. .venv/bin/pytest backend/tests/ -v

# 2. Run Playwright end-to-end browser tests
.venv/bin/python tests/e2e/test_browser_flow.py
.venv/bin/python tests/e2e/test_responsive_and_all_pdfs.py

# 3. Type check & build frontend
npm --prefix frontend run build
```
