# Jaring Metal AI - Quotation Intelligence Platform

A full-stack AI-powered quotation management system built for Jaring Metal.

## Quick Start

```bash
cd backend
PORT=3001 node server.js
```

Then open: **http://localhost:3001**

## Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@jaringmetal.com | admin123 |
| Commercial | commercial@jaringmetal.com | pass123 |
| Pricing | pricing@jaringmetal.com | pass123 |
| Approver | approver@jaringmetal.com | pass123 |
| Finance | finance@jaringmetal.com | pass123 |

## Demo Data

4 quotations pre-loaded at various workflow stages:
- **JM-2024-0001** - Released (complete end-to-end example)
- **JM-2024-0002** - Pending Approval (Pd/Au catalyst)
- **JM-2024-0003** - Extracted (Au solution, awaiting category)
- **JM-2024-0004** - Draft (forward pricing mode)

## Architecture

```
JaringMetalAI/
├── backend/
│   ├── server.js              # Express API server (port 3001)
│   ├── database/
│   │   ├── db.js              # JSON database layer
│   │   └── jaringmetal.json   # SQLite-compatible JSON database
│   ├── services/
│   │   ├── geminiService.js   # Google Gemini AI integration
│   │   ├── pricingEngine.js   # Formula evaluation engine
│   │   ├── marketData.js      # Metal price management
│   │   └── pdfGenerator.js    # PDF generation (PDFKit)
│   ├── middleware/
│   │   └── auth.js            # JWT auth + RBAC
│   └── public/
│       ├── index.html         # SPA entry point
│       └── bundle.js          # Compiled React frontend
├── client/src/                # React source code
│   ├── pages/                 # All 16 screens
│   └── components/            # Reusable components
└── README.md
```

## Features

### Core Workflow
1. **Create Quotation** - Select customer, type, pricing mode
2. **Upload Documents** - PDF/XLSX lab reports and assay results
3. **AI Extraction** - Gemini reads documents, extracts metal content
4. **Review & Edit** - Validate extracted data, resolve conflicts
5. **Category Selection** - AI recommends material category
6. **Pricing Engine** - Deterministic formula calculation
7. **Market Data** - Live benchmarks (Cu, Ag, Au, Pd, Ni, Sn, FX)
8. **Generate Output** - Professional PDF quotations
9. **Approval Workflow** - Multi-step approval with audit trail
10. **Release** - Final customer-facing output

### Key Screens
- Dashboard with KPIs and charts
- Quotation list with status filters
- Document upload with drag & drop
- AI extraction review with confidence scores
- Category selection with AI recommendation
- Market data management with override capability
- Full pricing breakdown (step-by-step)
- Approval workflow with history
- Complete audit trail
- Admin: Category, Formula, Benchmark, User management

### AI Integration
- **Gemini Flash** for document extraction and category recommendation
- Extracts: customer name, lab ref, weights, metal content (Cu, Ag, Au, Pd, Ni...)
- Confidence scores on every extracted field
- Material category classification with reasoning

### Pricing Engine
- Formula-based calculation (configurable by admin)
- Multi-metal composite formulas
- Recovery factors, commercial factors, deductions
- Spot, Forward, and Scenario pricing modes
- All calculations are deterministic and reproducible

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: JSON-based storage (SQLite-compatible)
- **AI**: Google Gemini Flash API
- **Frontend**: React 18 + Tailwind CSS
- **PDF**: PDFKit
- **Auth**: JWT + bcrypt
- **Charts**: Recharts

## Gemini API
The system uses Gemini for document extraction. The API key is configured in `backend/services/geminiService.js`.
