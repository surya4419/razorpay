# ⚡ Jolt — AI Revenue Recovery Engine

> Revenue, revived.

A full-stack intelligence system that prevents and recovers failed payments using a 3-layer AI pipeline — built on top of real Razorpay APIs in test mode.

---

## What It Does

Payment failures silently drain revenue. A naive "blind retry" system recovers roughly 20-25% of failed payments at best. This engine achieves 50-65%+ by acting before, during, and after failures:

| Layer | Name | When it acts | What it does |
|-------|------|-------------|--------------|
| **Layer 1** | Predict & Prevent | Before checkout opens | Scores transaction risk, takes proactive action (AFA pre-collection, method reordering, session extension) to prevent the failure from happening at all |
| **Layer 2** | Diagnose & Recover | After a failure occurs | Classifies the failure across a 22-category taxonomy derived from Razorpay's real error fields, then executes the optimal recovery action (payment link, retry, reconciliation) |
| **Layer 3** | Learn & Adapt | Continuously | Contextual bandit (epsilon-greedy) tracks win-rates across (Category × Context × Action) buckets, promotes high-performing strategies to dynamic risk rules |

---

## Architecture

![System Architecture](./client/src/images/architecture.png)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts, Socket.io-client |
| Backend | Node.js, Express.js, Socket.io |
| Database | MongoDB (Atlas or local) |
| Payments | Razorpay Test-Mode (Orders, Payments, Payment Links, Subscriptions APIs) |
| AI/ML | Epsilon-greedy contextual bandit (custom, no ML framework) |

---

## Project Structure

```
razorpay/
├── client/                        # React frontend (Vite)
│   └── src/
│       ├── components/
│       │   ├── playground/        # Live test UI (ScenarioPicker, SplitView, etc.)
│       │   ├── dashboard/         # Analytics UI (metrics, chart, feed, bandit)
│       │   └── shared/            # StatusPill, RealDataBadge, PayloadViewer
│       ├── hooks/useSocket.js     # Socket.io live feed
│       └── services/api.js        # REST API client
│
├── server/
│   ├── layer1-predict/
│   │   ├── riskScorer.js          # Weighted risk score (0–100)
│   │   └── actionPicker.js        # Maps score → prevention action
│   ├── layer2-recover/
│   │   ├── classifier.js          # 22-category failure taxonomy
│   │   ├── decisionTable.js       # Default action per failure category
│   │   ├── executor.js            # Executes recovery (Razorpay API calls)
│   │   └── restraintGate.js       # Hard stopping rules, friction gates
│   ├── layer3-learn/
│   │   ├── bandit.js              # Epsilon-greedy bandit + context buckets
│   │   └── ruleUpdater.js         # Promotes learned strategies to RiskRules
│   ├── models/                    # Mongoose schemas
│   ├── routes/                    # Express API routes
│   ├── simulation/
│   │   ├── batchRunner.js         # Streams synthetic transactions through pipeline
│   │   └── dataGenerator.js       # Realistic India payment profile generator
│   ├── config/
│   │   ├── db.js                  # MongoDB connection
│   │   ├── env.js                 # Environment config
│   │   ├── razorpay.js            # Razorpay SDK init
│   │   └── seed.js                # Cold-start risk rules seeding
│   └── sockets/index.js           # Socket.io broadcast layer
│
├── .env.example
├── package.json                   # Root scripts (concurrently)
└── README.md
```

---

## The 3-Layer Pipeline in Detail

### Layer 1 — Predict & Prevent

Runs before the payment attempt. Computes an explainable risk score (0–100) from:

- **Amount** — high-value transactions (>₹15K) trigger RBI AFA rules
- **Time of day** — 7–10 PM peak banking hours add risk weight
- **Customer history** — low historical success rate on the chosen payment rail
- **Device** — mobile web has higher timeout/drop risk
- **Transaction type** — recurring subscriptions checked for card expiry

**Actions it can take:**

| Action | Trigger | Effect |
|--------|---------|--------|
| `PRECOLLECT_AFA` | Recurring >₹15K | Collects OTP before charge attempt (RBI mandate) |
| `REORDER_METHODS` | High-value new device | Surfaces Wallet/UPI before Card in checkout |
| `TIME_AWARE_ROUTE` | Peak hour + medium risk | Routes to lower-congestion banking channels |
| `EXTEND_SESSION` | Mobile web + slow network | Extends checkout timeout 3:00 → 5:00 |
| `PROCEED_NORMAL` | Low risk | No intervention needed |

### Layer 2 — Diagnose & Recover

Runs after a payment failure. The classifier maps Razorpay's exact error fields (`error_code`, `error_reason`, `error_source`, `error_step`) to one of **22 failure categories**:

```
STUCK_AMBIGUOUS_TRANSACTION    →  Webhook drop — reconcile via real API
SOFT_DO_NOT_HONOR              →  Delayed retry on alternate rail
SOFT_TIMEOUT_SYSTEM_ERROR      →  Immediate retry via alt route
UPI_WRONG_PIN                  →  Re-prompt customer on same VPA
UPI_SERVER_DOWNTIME            →  Send Payment Link (Card/Netbanking)
HARD_EXPIRED_CARD              →  Send Payment Link (never retry card)
HARD_FRAUD_BLOCK               →  No intervention (restraint)
... and 15 more
```

The **Restraint Gate** enforces hard stopping rules:
- Hard declines are never auto-retried (prevents merchant risk flags)
- Max 1–2 outreach attempts per failure (prevents customer fatigue)
- Low-value + high-friction combinations are suppressed

### Layer 3 — Learn & Adapt

A **contextual epsilon-greedy bandit** that:

1. Tracks win-rates per `(failure_category, context_bucket, action)` triplet
2. Context buckets combine: `tier_low/mid/high | method | peak/off_peak`
3. Epsilon decays from 20% → 5% exploration as data accumulates
4. Every 50 transactions, `scanAndUpdateRules()` promotes strategies with `winRate delta ≥ 12%` and `attempts ≥ 12` to dynamic `RiskRule` documents
5. These promoted rules feed back into Layer 1 routing decisions

---

## 6 Live Test Scenarios (Playground)

The playground lets you run side-by-side comparisons of "without our system" vs "with our system":

| # | Scenario | Type | What it demonstrates |
|---|---------|------|---------------------|
| 1 | Slow network / Timeout | Prevention | Session extended 3:00 → 5:00 via real Checkout config |
| 2 | High-risk new device | Prevention | Wallet/UPI surfaced first instead of card |
| 3 | E-mandate >₹15,000 | Prevention | AFA pre-collected before charge (RBI compliance) |
| 4 | Expiring saved card | Prevention | Proactive card update prompt before checkout |
| 5 | Stuck/Ambiguous transaction | Recovery | Webhook drop reconciled via real Razorpay fetch API |
| 6 | UPI instant decline | Recovery | Payment Link generated — customer completes via card |

Each scenario creates **real Razorpay test-mode orders** and processes them through the actual API.

---

## Setup

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Razorpay test-mode account (free at [dashboard.razorpay.com](https://dashboard.razorpay.com))

### 1. Clone and install

```bash
git clone https://github.com/surya4419/razorpay.git
cd razorpay
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

```env
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/razorpay_recovery
PORT=5000
CLIENT_URL=http://localhost:5173
```

Get Razorpay test keys from: Settings → API Keys → Generate Test Key

### 3. Run

```bash
npm run dev
```

This starts both the Express server (port 5000) and Vite dev server (port 5173) concurrently.

Open [http://localhost:5173](http://localhost:5173)

### 4. Seed initial data

On first run, the server auto-seeds cold-start risk rules into MongoDB. No manual step needed.

---

## Demo Preparation Checklist

Before showing a demo:

1. **Wipe these 3 collections** in MongoDB Atlas:
   - `transactions`
   - `auditlogentries`
   - `banditstates`

2. **Run one simulation**: Dashboard → 500 transactions → Standard mix → 60ms → Run

3. **Click Refresh** after simulation completes

4. **Verify**: ~55-65% recovery rate, clearly above the naive baseline on the chart

5. **Run playground scenarios** with successful payments to add real data on top

> ⚠️ Never run simulation more than once without wiping first — multiple runs stack data and inflate metrics.

---

## API Reference

| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/api/metrics/summary` | Headline metrics (saved, prevented, recovered, at-risk) |
| `GET` | `/api/metrics/learning-curve` | Time-series recovery rate data for chart |
| `GET` | `/api/bandit/state` | Bandit matrix + diverged strategies |
| `GET` | `/api/risk-rules` | Active Layer 1 risk rules |
| `GET` | `/api/transactions` | Paginated transaction ledger |
| `GET` | `/api/transactions/:id` | Single transaction with audit trail |
| `POST` | `/api/playground/init-pane` | Create real Razorpay order for scenario |
| `POST` | `/api/playground/open-checkout` | Open Razorpay Checkout widget |
| `POST` | `/api/razorpay/webhook` | Receive Razorpay payment webhooks |
| `POST` | `/api/simulate/run` | Start batch simulation |
| `GET` | `/api/simulate/status` | Simulation progress |

---

## Key Design Decisions

**Why a contextual bandit instead of a ML model?**
A bandit requires no training data, updates online after every transaction, is fully explainable, and converges to optimal actions in hundreds of transactions rather than thousands. Perfect for a demo that needs to show learning within a single session.

**Why Razorpay test-mode instead of mocked APIs?**
Every order, payment, and payment link in the playground is a real Razorpay API call. This proves the system works with real infrastructure — not just a UI demo.

**Why the Restraint Gate?**
Over-recovery (spamming customers, force-retrying hard declines) actually loses merchants money through chargebacks and customer churn. The restraint gate is Layer 2's ethical constraint — it knows when not to act.

---

> ⚡ **Jolt** · Revenue, revived. · © 2026 Jolt
