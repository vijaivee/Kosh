# Kosh Global Item Creation & Governance System
## Architecture, Data Model, RBAC Matrix & SAP B1 HANA Integration Guide

**Corporate Entity:** Kosh Innovations Private Limited (https://koshinnovations.com/)  
**Production URL:** `https://my.koshinnovations.com/` (also `https://itemmaster.koshinnovations.com/`)  
**UAT URL:** `http://localhost/mykoshinnovations`

---

### 1. High-Level System Architecture

```
                                  +-------------------------------------------------------------+
                                  |                 Kosh Innovations Client                     |
                                  |         (React 19 + TypeScript + Tailwind CSS)             |
                                  +------------------------------+------------------------------+
                                                                 |
                                                                 | HTTPS / REST / JSON
                                                                 v
                                  +-------------------------------------------------------------+
                                  |                      Nginx Reverse Proxy                    |
                                  |       TLS 1.3 Termination, CSRF Guard, Static Asset Caching |
                                  +------------------------------+------------------------------+
                                                                 |
                                                                 v
+-------------------------------------------------------------------------------------------------------------------+
|                                                 Application Services Layer                                        |
|  +-----------------------------+  +-------------------------------+  +-----------------------------------------+  |
|  |     RBAC & Scoping Guard    |  |     Item Code Rule Engine     |  |       Workflow State Machine            |  |
|  | Multi-Branch Data Isolation |  | Atomic Sequence Generator     |  | Maker-Checker Governance & Approvals    |  |
|  +-----------------------------+  +-------------------------------+  +-----------------------------------------+  |
|  +-----------------------------+  +-------------------------------+  +-----------------------------------------+  |
|  |  Email 2FA & Security Guard |  |  Item Description Generator   |  |   SAP B1 HANA Service Layer Adapter     |  |
|  | OTP Delivery & Verification |  | Whitespace & Separator Normal.|  | OITM Mapper, Idempotency & Retry Outbox |  |
|  +-----------------------------+  +-------------------------------+  +-----------------------------------------+  |
+------------------------------------------------+------------------------------------------------------------------+
                                                 |                                                  |
                                                 v                                                  v
                      +--------------------------------------+          +-----------------------------------------+
                      |         PostgreSQL 16 Database       |          |      SAP Business One HANA 2.0          |
                      |  - Relational Models & Schemas       |          |  - Service Layer (Port 50000 / HTTPS)   |
                      |  - Append-Only Audit Trail           |          |  - Company DB: KOSH_PROD_HANA           |
                      |  - Atomic Sequences & Lock Mgmt     |          |  - OITM (Item Master Data) Records      |
                      +--------------------------------------+          +-----------------------------------------+
```

---

### 2. Multi-Branch & Governance Hierarchy

```
Organization: Kosh Innovations Pvt. Ltd. (Pondicherry HQ)
 ├── Plant 1 (PLANT-1): Pondicherry (Injection Moulding & Tooling)
 ├── Plant 2 (PLANT-2): Chennai (Sheet Metal & Sub-Assembly)
 ├── Plant 3 (PLANT-3): Pune (Automotive Solutions)
 ├── Plant 4 (PLANT-4): Gujarat (Blow Moulding & Drain Hoses)
 └── Central Warehouse 1 (WH-01): Bengaluru (Distribution & Logistics)
```

**Global Item Master vs. Branch Availability:**
1. **Global Item Master (`global_items`):** Single authoritative definition across the company.
2. **Branch Item Availability (`item_branch_availability`):** Decoupled status per plant indicating stocking, procurement, manufacturing, or distribution permissions.

---

### 3. Role-Based Access Control (RBAC) Matrix

| Granular Permission | Platform Admin | Org Admin | Global Item Admin | Item Creator (Maker) | Branch Coordinator | Item Approver (Checker) | Master Data Auditor | Read-Only User |
|---|---|---|---|---|---|---|---|---|
| `item.read` |  |  |  |  |  |  |  |  |
| `item.create` |  |  |  |  |  | ❌ | ❌ | ❌ |
| `item.update_draft` |  |  |  |  |  | ❌ | ❌ | ❌ |
| `item.submit` |  |  |  |  |  | ❌ | ❌ | ❌ |
| `item.approve` |  |  |  | ❌ (Maker) | ❌ |  (Checker) | ❌ | ❌ |
| `item.reject` |  |  |  | ❌ | ❌ |  | ❌ | ❌ |
| `item.activate_branch`|  |  |  | ❌ |  |  | ❌ | ❌ |
| `item.export` |  |  |  |  |  |  |  | ❌ |
| `classification.manage`|  |  |  | ❌ | ❌ | ❌ | ❌ | ❌ |
| `rule.manage` |  |  |  | ❌ | ❌ | ❌ | ❌ | ❌ |
| `rule.approve` |  |  |  | ❌ | ❌ | ❌ | ❌ | ❌ |
| `user.manage` |  |  | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `branch.manage` |  |  | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `audit.read` |  |  |  | ❌ | ❌ |  |  | ❌ |
| `integration.manage` |  |  | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `system.configure` |  |  | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Strict Maker-Checker Enforcement Rule:**
```typescript
if (item.createdBy === user.id) {
  throw new ForbiddenException("Maker-Checker Violation: A creator cannot approve their own item request.");
}
```

---

### 4. Entity-Relationship Data Model

```sql
-- Organizations
CREATE TABLE organizations (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(16) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    legal_entity VARCHAR(255) NOT NULL,
    hq_location VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Branches / Plants
CREATE TABLE branches (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) REFERENCES organizations(id),
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL, -- 'Plant', 'Warehouse', 'Corporate'
    location VARCHAR(255),
    state VARCHAR(64),
    gstin VARCHAR(32),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users & RBAC
CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) REFERENCES organizations(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(64) UNIQUE NOT NULL,
    role VARCHAR(32) NOT NULL,
    is_two_factor_enabled BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Branch Assignments
CREATE TABLE user_branch_assignments (
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE CASCADE,
    PRIMARY KEY(user_id, branch_id)
);

-- Classification Dimensions & Values
CREATE TABLE classification_values (
    id VARCHAR(64) PRIMARY KEY,
    dimension VARCHAR(32) NOT NULL, -- 'Category', 'Material', 'Type', 'Material Form', 'Process', 'Colour', 'Manufacturer'
    code VARCHAR(16) NOT NULL,
    name VARCHAR(255) NOT NULL,
    display VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_dim_code UNIQUE(dimension, code)
);

-- Global Item Master
CREATE TABLE global_items (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) REFERENCES organizations(id),
    origin_branch_id VARCHAR(64) REFERENCES branches(id),
    item_code VARCHAR(32) UNIQUE NOT NULL,
    is_code_provisional BOOLEAN DEFAULT FALSE,
    item_description VARCHAR(255) NOT NULL,
    category_code VARCHAR(16) NOT NULL,
    material_code VARCHAR(16) NOT NULL,
    type_code VARCHAR(16) NOT NULL,
    form_code VARCHAR(16),
    process_code VARCHAR(16),
    colour_code VARCHAR(16),
    manufacturer_code VARCHAR(16),
    dimensions VARCHAR(128),
    part_model_number VARCHAR(128),
    rating_size VARCHAR(128),
    specification VARCHAR(255),
    status VARCHAR(32) NOT NULL, -- 'Draft', 'Submitted', 'Approved', 'Returned for Correction', 'Rejected', 'SAP Created'
    version INT DEFAULT 1,
    code_rule_version_id VARCHAR(64),
    desc_rule_version_id VARCHAR(64),
    sap_item_code VARCHAR(32),
    sap_company_db VARCHAR(64),
    sap_sync_status VARCHAR(32) DEFAULT 'Not Synced',
    sap_synced_at TIMESTAMP WITH TIME ZONE,
    sap_idempotency_key VARCHAR(128) UNIQUE,
    created_by VARCHAR(64) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Branch Item Availability
CREATE TABLE item_branch_availability (
    item_id VARCHAR(64) REFERENCES global_items(id) ON DELETE CASCADE,
    branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE CASCADE,
    is_available BOOLEAN DEFAULT TRUE,
    inventory_status VARCHAR(32) DEFAULT 'Active',
    activated_at TIMESTAMP WITH TIME ZONE,
    activated_by VARCHAR(64),
    PRIMARY KEY(item_id, branch_id)
);

-- Maker-Checker Approval Trail
CREATE TABLE approval_history (
    id VARCHAR(64) PRIMARY KEY,
    item_id VARCHAR(64) REFERENCES global_items(id) ON DELETE CASCADE,
    action VARCHAR(32) NOT NULL,
    actor_id VARCHAR(64) REFERENCES users(id),
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    comments TEXT,
    item_version_snapshot INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Append-Only Audit Trail
CREATE TABLE audit_events (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actor_id VARCHAR(64) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(32) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    organization_id VARCHAR(64),
    branch_id VARCHAR(64),
    outcome VARCHAR(16) NOT NULL, -- 'SUCCESS', 'FAILURE', 'WARNING'
    details TEXT
);
```

---

### 5. Configurable Rule Engine Evaluation

#### 5.1 Item Code Pattern:
`{CATEGORY}{MATERIAL}{TYPE}{FORM}{PROCESS}{COLOUR}{SEQUENCE:4}`
- Atomic sequence generation per category or globally.
- Real-time length validation against SAP Business One's 20-character maximum limit.
- Case normalization and unsupported character rejection.

#### 5.2 Item Description Pattern:
`{MATERIAL} – {SPECIFICATION} – {COLOUR} – {FORM}`
- Automatic omission of empty values without orphan hyphens or double spaces.
- Length validation (maximum 100 characters).
- Preserves submitted snapshot with immutable rule versioning.

---

### 6. SAP Business One HANA Integration

- **Interface:** SAP Business One Service Layer (HTTPS / Port 50000).
- **Target Table:** `OITM` (Item Master Data).
- **Payload Mapping:**
  - `ItemCode` → Global item code
  - `ItemName` → Global item description
  - `ItmsGrpCod` → Numeric code mapped from category
  - `InvntItem`, `SellItem`, `PrchseItem` → Derived from classification
  - `UDFs`: `U_Material`, `U_Type`, `U_Form`, `U_Process`, `U_Colour`, `U_OriginBranch`, `U_GlobalItemId`
- **Idempotency Key:** Protects against duplicate creations during network retries.
- **Transactional Outbox:** Retries transient failures with exponential backoff.
