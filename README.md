# COLLinSight

> **College Student Organization Management and Governance System with Automated Compliance Monitoring**  
> Developed for the **College of Information Technology and Engineering (CITE)** — *La Consolacion University Philippines (LCUP)*.

---

## 📌 Overview

**COLLinSight** is a comprehensive web-based governance and management platform designed to streamline student organization operations, digitize multi-level event proposal clearance workflows, monitor financial ledgers with automated liquidation tracking, and maintain strict institutional compliance across departments.

```
                    ┌─────────────────────────┐
                    │ Student Officer Drafts  │
                    │   Event Proposal + APF  │
                    └───────────┬─────────────┘
                                │ Submit
                                ▼
                    ┌─────────────────────────┐
                    │ Faculty Adviser Review  │◄───┐
                    │  (Approve / Revise)     │    │
                    └───────────┬─────────────┘    │
                                │ Approve          │ Request
                                ▼                  │ Changes
                    ┌─────────────────────────┐    │
                    │   College Dean Approval │────┘
                    │  (Signatory & Clearance)│
                    └───────────┬─────────────┘
                                │ Approve
                                ▼
         ┌───────────────────────────────────────────────┐
         │  • Clearance Template & APF Dispatched to SDS │
         │  • Event Published to Public Live Calendar    │
         │  • Financial Ledger Activated for Expenses    │
         └───────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 🏛️ Multi-Stage Governance & Clearance Pipeline
- **Draft & Compliance Uploads:** Student officers submit event proposals with complete requisites, Activity Proposal Forms (APF), and supplementary appendices.
- **Hierarchical Approval:** Streamlined progression through Faculty Adviser review and final College Dean authorization.
- **Automated SDS Integration:** Generates official clearance documents and simulates email dispatch to Student Development Services (`sds@email.lcup.edu.ph`).
- **Revision Cycles:** Granular feedback loops allowing advisers and the dean to request specific amendments before final endorsement.

### 💰 Financial Ledger & Liquidation
- **Budget Monitoring:** Real-time visibility into organization budget allocations, event expenditure caps, and remaining balances.
- **Transaction Records:** Detailed expense tracking categorizing venue, logistics, catering, honorariums, and materials with mandatory receipt attachments.
- **Automated Liquidation Reports:** Post-event revenue declaration and liquidation summary generation, locking closed event ledgers while supporting formal remarks/amendments.

### 🌐 Public Portal & Organization Directory
- **Interactive Landing Page:** Modern interface showcasing upcoming activities, institutional workflows, and developer information.
- **Department Feeds:** Filterable feeds for academic departments (**BSIT**, **BSCpE**, **BSIE**) highlighting student leadership and upcoming events.
- **Live Event Calendar:** Public calendar with real-time status indicators and detailed event modal views.

### 🔐 Role-Based Portals (RBAC)

| Role | Core Capabilities |
| :--- | :--- |
| **Student Officers** | Create & manage event proposals, log expenses & upload receipts, track SDS submissions, view org analytics, submit for liquidation. |
| **Faculty Advisers** | Review assigned organization proposals (Approve, Approve with Remarks, Return for Revision), monitor financial ledgers, view org reports. |
| **College Dean** | College-wide pending approval queue, digital signatory endorsement, cross-departmental financial analytics, clearance archive. |
| **System Administrator** | Manage academic departments and organizations, allocate annual budget caps, configure event types & expenditure categories, audit logs, manage users. |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v20.x or higher recommended)
- **npm**, **pnpm**, or **yarn**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/comms-collinsight.git
   cd comms-collinsight
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:8443](http://localhost:8443) (or the port specified in terminal output) in your browser.

4. **Build for production:**
   ```bash
   npm run build
   ```

---

## 🔑 Demo Accounts

For local demonstration and evaluation, the following pre-configured credentials are available on the Login Portal:

| Role | Email | Password | Assigned Organization |
| :--- | :--- | :--- | :--- |
| **Student Officer (President)** | `mlopez@student.cite.edu.ph` | `lopez_124983` | IT Student Guild (ITSG) |
| **Faculty Adviser** | `ereyes@cite.edu.ph` | `reyes_773012` | IT Student Guild (ITSG) |
| **College Dean** | `dean@cite.edu.ph` | `villanueva_441209` | CITE (College-wide) |
| **System Administrator** | `admin@cite.edu.ph` | `cruz_882341` | System-wide |

---

## 🏗️ Project Structure

```
comms-collinsight/
├── src/
│   ├── components/
│   │   ├── layout/          # Authenticated PanelLayout, PublicNav, PublicFooter
│   │   └── ui/              # Reusable UI component library (Buttons, Dialogs, Cards, Badges, Tabs)
│   ├── context/
│   │   ├── AuthContext.tsx  # User authentication state & role verification
│   │   └── AppContext.tsx   # Global runtime state (Events, Transactions, Orgs, Users, Audit)
│   ├── pages/
│   │   ├── admin/           # Administrator management pages & configurations
│   │   ├── adviser/         # Adviser review queue & financial monitoring
│   │   ├── dean/            # Dean approval queue & college-wide reports
│   │   ├── student/         # Student events, finance ledger, SDS workspace, reports
│   │   ├── CalendarPage.tsx # Public standalone event calendar
│   │   ├── LandingPage.tsx  # Public institutional portal & department feeds
│   │   ├── LoginPage.tsx    # Institutional authentication portal
│   │   └── OrganizationsPage.tsx # Public organization directory & roster
│   ├── services/
│   │   └── mockData.ts      # TypeScript interfaces, seed datasets, and formatters
│   ├── App.tsx              # Application router, role guards, and route configuration
│   ├── index.css            # Tailwind CSS v4 design tokens, custom styles, keyframes
│   └── main.tsx             # React DOM entry point
├── index.html               # HTML shell with institutional metadata & favicon
├── package.json             # Project dependencies & npm scripts
├── tsconfig.json            # TypeScript configuration
└── vite.config.ts           # Vite bundler configuration & path aliases
```

---

## 🛠️ Technology Stack

- **Framework:** [React 19](https://react.dev/) + [Vite 8](https://vite.dev/)
- **Language:** [TypeScript 5.7](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Routing:** [React Router v7](https://reactrouter.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Charts & Visualizations:** [Recharts](https://recharts.org/)

---

## 📄 License

This project is created for academic and organizational governance purposes for the **College of Information Technology and Engineering (CITE)** at **La Consolacion University Philippines (LCUP)**.
