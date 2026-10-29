# InsightIQ AI — Testing & Verification Guide

This project includes automated testing suites covering security boundaries, mathematical precision, machine learning inference, role persistence, and end-to-end browser workflows.

## Test Directory Structure

```
tests/
├── auth/
│   └── test_auth_regression.js             # Auth error handling, Supabase client init, RLS isolation
├── engine/
│   ├── test_universal_data_engine.js       # Delimiter sniffing, multi-sheet, JSON streams, logs
│   ├── test_phase_a_tabular.js             # Profiling, outlier capping, non-destructive cleaning
│   ├── test_phase_b_unstructured.js        # PDF/DOCX parsing, BM25 retrieval, grounded citations
│   ├── test_phase_c_statistical_engine.js  # Lanczos Gamma, Welch t-test, ANOVA, PCA, K-Means++
│   ├── test_phase_d_unified_intelligence.js# Multi-source intelligence, cross-source query planner
│   ├── test_phase_e_production_readiness.js# Concurrency stress, security blocking, health check
│   ├── test_phase_f_e2e_acceptance.js      # End-to-end platform acceptance verification
│   ├── test_ml_real_training.js            # Supervised regression and classification validation
│   ├── test_intelligence_engine.js         # Design tokens, shell navigation, DAG topology
│   ├── test_phase2_3_models.js             # Model registry & metrics verification
│   └── test_phase2_4_5_analytics.js        # Analytics calculation accuracy
├── roles/
│   ├── test_admin_portal_phase1.js         # Admin overview, RBAC security, health telemetry
│   ├── test_admin_portal_phase2.js         # User directory, access control, audit ledger
│   ├── test_phase1_role_persistence.js     # User role persistence across app sessions
│   ├── test_role_management_regression.js  # Role assignment boundaries and constraints
│   ├── test_role_switcher_admin_integration.js # Modal role switching and admin privilege check
│   ├── test_role_switch_verification_suite.js  # Role state transitions
│   └── test_role_sync_verification.js      # Client-server role synchronization
├── ui/
│   ├── test_anomaly_modal_centering_verification.js # Modal centering and layout
│   ├── test_modal_centering_verification.js         # Dialog positioning
│   ├── test_model_registry_ui_verification.js       # Model registry tabs and filters
│   ├── test_settings_phase3_verification.js         # Workspace settings persistence
│   ├── test_clean_workspace.js                      # Clean state initialization
│   ├── test_regression_workspace_init.js            # Workspace bootstrap verification
│   ├── test_port_fallback.js                        # Automatic TCP port incrementing
│   ├── test_next_public_resolution.js               # Environment alias resolution
│   ├── test_db.js                                   # Direct Supabase database probe
│   └── test_phase4_comprehensive_regression.js      # Full regression verification
└── verification/
    ├── verify_chrome_visual.js                      # Headless Chrome visual layout validation
    ├── verify_dataset_manager_bulk_delete_chrome.js # Multi-dataset manager bulk deletion
    ├── verify_delete_project_chrome.js              # Project deletion workflow
    ├── verify_demo_accounts_chrome.js               # Demo account audit
    ├── verify_full_switch_role_modal_chrome.js      # Responsive role switcher modal test
    ├── verify_multi_dataset_chrome.js               # Multi-dataset workbench workflows
    ├── verify_no_demo_accounts_chrome.js            # Production safety check for demo buttons
    ├── verify_remove_header_admin_btn_chrome.js     # Header admin badge security
    └── verify_signup_fix_chrome.js                  # Registration flow validation
```

## Running Tests

From the `Project/` directory:

```powershell
# Run the primary production readiness suite
npm test

# Run all unit and regression test suites
npm run test:all

# Run specific domain test suites
npm run test:auth
npm run test:ml
npm run test:phase-a
npm run test:phase-b
npm run test:phase-c
npm run test:phase-d
npm run test:phase-e
npm run test:init
npm run test:port
npm run test:clean

# Run code linter / syntax checks
npm run lint
```
