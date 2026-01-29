# System Architecture & Absolute Rules (Phase 2+)

This document defines the non-negotiable architectural standards for the Design Jig project as of Phase 2 completion. These rules govern all future implementation, modification, and stabilization work.

---

## 1. Absolute Source of Truth: Google Sheets
**Google Sheets is the sole and final Source of Truth for all system data.** 
- Treating frontend state, UI state, `localStorage`, or in-memory data as a database is strictly prohibited.
- Components must always fetch authoritative data from Google Sheets/Apps Script.

## 2. Immutable Master Databases
The following datasets are **Immutable Master Databases**:
1. **Cost Master Table**
2. **A/S Management List** (Template/Master items)

### Rules for Master DBs:
- **Read-Only**: The application may only read and reference these sheets.
- **No Modifications**: Editing, adding, deleting rows, or re-saving modified data back to these specific master sheets from the application is strictly prohibited.
- **Result Isolation**: Any calculated results or user selections derived from these masters must be stored separately (see Save Architecture).

## 3. Save Architecture: Results vs. Materials
In this system, "Save" does **NOT** mean modifying the master database.
- **Master DB** = Materials (Immutable).
- **Saved Data** = Results (Mutable, Customer-Scoped).
- **Prohibited**: Writing directly to master sheets or polluting reference sheets with customer-specific state.
- **Required**: Store results, selected items, and derived values in separate, customer-scoped storage.

## 4. Customer-Centric Data Linking
All system data must be linked by a single unique identifier: `customerId`.
- **Linking**: Every piece of data (Estimates, Schedules, Checklists, A/S Records, Applied Costs, Settlements) must be associated with a `customerId`.
- **Syncing**: Data saved in one tab must be immediately retrievable in all other tabs for the same customer.
- **Reloading**: Switching a customer must trigger a full reload of all related datasets. Partial data leakage from previous sessions is unacceptable.

## 5. localStorage Policy
### Allowed Usage (UI Convenience Only):
- Sorting preferences
- Filtering states
- UI settings (Font size, Dark mode, etc.)
- Session/Security state (Device trust, Auth status)

### Prohibited Usage (Data Storage):
- **NO** Customer data
- **NO** Estimates or Costs
- **NO** Checklists or Expenses
- **NO** A/S records or operational data
- **NO** Business-critical data source

## 6. Stabilization Phase (Post-Phase 2)
- All work following Phase 2 is classified as **Stabilization**.
- Any changes to data flow, storage structure, or the linking architecture require prior review and explicit approval.
- Any action potentially affecting the Immutable Master Databases is subject to automatic approval protocols.

---
**Standard**: Follow these rules absolutely. If a requirement conflicts with these rules, request clarification before proceeding.
