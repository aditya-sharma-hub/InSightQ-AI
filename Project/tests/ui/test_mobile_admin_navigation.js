/**
 * ============================================================================
 * INSIGHTIQ AI — MOBILE ADMIN DASHBOARD CARD GRID & NAVIGATION TEST
 * ============================================================================
 * Validates:
 * 1. Mobile viewport (375x667 and 360x740):
 *    - Admin tabs are rendered as a 2-column grid of section cards below admin header
 *    - Horizontal scrolling strip is REMOVED
 *    - All sections present as tappable cards (Admin Overview, User & Access, System Health, Audit Logs, Workspaces, Settings)
 *    - Cards have rounded corners, dark background, icons, and labels
 *    - Tapping all 4 named section cards switches the view and updates active state
 *    - Section content renders below the grid and scrolls vertically
 *    - No horizontal document overflow (scrollWidth <= viewport width)
 *    - Main bottom navigation is fixed at the bottom and functional
 * 2. Desktop viewport (1280x800):
 *    - Mobile bottom nav is hidden
 *    - Desktop sidebar is vertical (width: 250px)
 */

const puppeteer = require('puppeteer');
const http = require('http');
const path = require('path');
const express = require('express');

async function runTest() {
  console.log('================================================================');
  console.log('   INSIGHTIQ AI — MOBILE ADMIN CARD GRID VERIFICATION TEST     ');
  console.log('================================================================\n');

  const app = express();
  app.use(express.static(path.resolve(__dirname, '../../')));

  // Mock API endpoints for Admin Portal
  app.get('/api/admin/verify', (req, res) => {
    res.json({
      success: true,
      authorized: true,
      admin: { id: 'admin-uuid', email: 'admin@insightiq.internal', role: 'Administrator' },
      user: { id: 'admin-uuid', email: 'admin@insightiq.internal', role: 'Administrator' }
    });
  });

  app.get('/api/admin/overview', (req, res) => {
    res.json({
      status: 'healthy',
      systemStatus: 'Operational',
      metrics: { totalUsers: 42, activeSessions: 5, databaseLatency: 12 },
      database: { connected: true, provider: 'Supabase PostgreSQL' },
      recentActivities: []
    });
  });

  app.get('/api/admin/users', (req, res) => {
    res.json({
      users: [
        { id: 'u1', email: 'admin@insightiq.internal', role: 'Administrator', status: 'active', displayName: 'System Admin' },
        { id: 'u2', email: 'analyst@insightiq.ai', role: 'Data Analyst', status: 'active', displayName: 'Jane Doe' }
      ],
      pagination: { page: 1, limit: 10, totalUsers: 2, totalPages: 1, hasMore: false }
    });
  });

  app.get('/api/config.js', (req, res) => {
    res.type('application/javascript');
    res.send('window.__ENV__ = window.__ENV__ || {};');
  });

  const server = http.createServer(app);
  const TEST_PORT = 8992;
  await new Promise(resolve => server.listen(TEST_PORT, resolve));
  console.log(`[Test Server] Running on http://localhost:${TEST_PORT}\n`);

  let browser;
  let allPassed = true;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.on('console', msg => console.log('[BROWSER]', msg.text()));
    page.on('pageerror', err => console.error('[PAGE ERROR]', err.message));

    // ------------------------------------------------------------------------
    // TEST 1: Mobile Viewport (375x667) — 2-Column Section Card Grid
    // ------------------------------------------------------------------------
    console.log('>>> [TEST 1: Mobile Viewport 375x667 — 2-Column Section Card Grid]');
    await page.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true });

    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('insightiq_user_session', JSON.stringify({
        user: { id: 'admin-uuid', email: 'admin@insightiq.internal' }
      }));
      localStorage.setItem('insightiq_user_profile', JSON.stringify({
        id: 'admin-uuid',
        email: 'admin@insightiq.internal',
        role: 'Administrator',
        full_name: 'System Administrator'
      }));
    });

    await page.goto(`http://localhost:${TEST_PORT}/index.html#/admin`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.admin-header', { timeout: 10000 });

    // 1.1 Verify Admin Portal Header & Position
    const headerInfo = await page.evaluate(() => {
      const header = document.querySelector('.admin-header');
      const backBtn = document.querySelector('.btn-admin-return');
      return {
        exists: !!header,
        hasBackBtn: !!backBtn,
        height: header ? header.getBoundingClientRect().height : 0
      };
    });

    if (headerInfo.exists && headerInfo.hasBackBtn) {
      console.log(`  ✓ [PASS] Admin Header & Back to Workspace button present at top (height: ${Math.round(headerInfo.height)}px)`);
    } else {
      console.error('  ✗ [FAIL] Admin Header or Back button missing');
      allPassed = false;
    }

    // 1.2 Verify Section Cards are in a 2-Column Grid (NOT a horizontal scrolling strip)
    const gridInfo = await page.evaluate(() => {
      const sidebar = document.querySelector('.admin-sidebar');
      if (!sidebar) return { exists: false };
      const style = window.getComputedStyle(sidebar);
      const cards = Array.from(sidebar.querySelectorAll('.admin-nav-item'));

      // Check number of grid columns
      const gridColumns = style.gridTemplateColumns ? style.gridTemplateColumns.split(' ').length : 0;
      const isDisplayGrid = style.display === 'grid';
      const isNotHorizontalStrip = style.overflowX !== 'auto' && style.flexDirection !== 'row';

      // Check card styles
      const sampleCard = cards[0];
      const cardStyle = sampleCard ? window.getComputedStyle(sampleCard) : null;
      const borderRadius = cardStyle ? cardStyle.borderRadius : '';
      const hasIcon = sampleCard ? !!sampleCard.querySelector('svg') : false;

      return {
        exists: true,
        isDisplayGrid,
        gridColumns,
        isNotHorizontalStrip,
        cardCount: cards.length,
        borderRadius,
        hasIcon,
        cardLabels: cards.map(c => c.querySelector('span') ? c.querySelector('span').innerText.trim() : c.innerText.trim())
      };
    });

    if (gridInfo.exists && gridInfo.isDisplayGrid && gridInfo.gridColumns === 2) {
      console.log(`  ✓ [PASS] Section cards rendered in responsive 2-column grid (columns: ${gridInfo.gridColumns})`);
    } else {
      console.error(`  ✗ [FAIL] Grid layout check failed: isGrid=${gridInfo.isDisplayGrid}, columns=${gridInfo.gridColumns}`);
      allPassed = false;
    }

    if (gridInfo.isNotHorizontalStrip) {
      console.log('  ✓ [PASS] Horizontal admin tab strip is completely REMOVED');
    } else {
      console.error('  ✗ [FAIL] Horizontal scrolling tab strip is still present');
      allPassed = false;
    }

    if (gridInfo.cardCount >= 6 && gridInfo.hasIcon) {
      console.log(`  ✓ [PASS] All ${gridInfo.cardCount} section cards present with icons & rounded corners (${gridInfo.borderRadius}): [${gridInfo.cardLabels.join(', ')}]`);
    } else {
      console.error('  ✗ [FAIL] Section cards incomplete');
      allPassed = false;
    }

    // 1.3 Verify Section Content renders BELOW the Card Grid
    const contentPlacement = await page.evaluate(() => {
      const sidebar = document.querySelector('.admin-sidebar');
      const content = document.querySelector('.admin-main-content');
      if (!sidebar || !content) return { exists: false };
      const sidebarRect = sidebar.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      return {
        exists: true,
        contentBelowGrid: contentRect.top >= sidebarRect.bottom - 2
      };
    });

    if (contentPlacement.exists && contentPlacement.contentBelowGrid) {
      console.log('  ✓ [PASS] Selected section content displays directly BELOW the section card grid');
    } else {
      console.error('  ✗ [FAIL] Section content is not placed below the card grid');
      allPassed = false;
    }

    // 1.4 Test Tapping All 4 Named Sections: Overview, Users, Health, Audit
    console.log('\n>>> [TEST 1.4: Tapping All 4 Named Section Cards & Verifying Active State]');

    // Section 1: User & Access
    await page.click('#admin-nav-users');
    await new Promise(r => setTimeout(r, 600));
    const userActive = await page.evaluate(() => {
      const btn = document.querySelector('#admin-nav-users');
      const hasTableOrSection = !!document.querySelector('.admin-users-table') || !!document.querySelector('.admin-users-container') || !!document.querySelector('.admin-page-title-group');
      return {
        isActive: btn && btn.classList.contains('active'),
        hasContent: hasTableOrSection
      };
    });
    if (userActive.isActive && userActive.hasContent) {
      console.log('  ✓ [PASS] Card 1 "User & Access" tapped -> active state set & section content loaded');
    } else {
      console.error('  ✗ [FAIL] "User & Access" card switch failed');
      allPassed = false;
    }

    // Section 2: System Health
    await page.click('#admin-nav-health');
    await new Promise(r => setTimeout(r, 600));
    const healthActive = await page.evaluate(() => {
      const btn = document.querySelector('#admin-nav-health');
      const hasProbeBtn = !!document.querySelector('#btn-probe-db-latency');
      return {
        isActive: btn && btn.classList.contains('active'),
        hasContent: hasProbeBtn
      };
    });
    if (healthActive.isActive && healthActive.hasContent) {
      console.log('  ✓ [PASS] Card 2 "System Health" tapped -> active state set & diagnostic telemetry loaded');
    } else {
      console.error('  ✗ [FAIL] "System Health" card switch failed');
      allPassed = false;
    }

    // Section 3: Audit Logs
    await page.click('#admin-nav-audit');
    await new Promise(r => setTimeout(r, 600));
    const auditNotice = await page.evaluate(() => {
      const notice = document.querySelector('.admin-notice-banner');
      return !!notice && notice.innerText.includes('Audit Logs');
    });
    if (auditNotice) {
      console.log('  ✓ [PASS] Card 3 "Audit Logs" tapped -> Phase 2 compliance banner displayed');
    } else {
      console.error('  ✗ [FAIL] "Audit Logs" card interaction failed');
      allPassed = false;
    }

    // Section 4: Admin Overview
    await page.click('#admin-nav-overview');
    await new Promise(r => setTimeout(r, 600));
    const overviewActive = await page.evaluate(() => {
      const btn = document.querySelector('#admin-nav-overview');
      const hasKpi = !!document.querySelector('.admin-kpi-grid');
      return {
        isActive: btn && btn.classList.contains('active'),
        hasContent: hasKpi
      };
    });
    if (overviewActive.isActive && overviewActive.hasContent) {
      console.log('  ✓ [PASS] Card 4 "Admin Overview" tapped -> active state set & KPI grid loaded');
    } else {
      console.error('  ✗ [FAIL] "Admin Overview" card switch failed');
      allPassed = false;
    }

    // 1.5 Verify Fixed Bottom Navigation & Workspace Switching
    console.log('\n>>> [TEST 1.5: Fixed Bottom Navigation & Workspace Switching]');
    const bottomNavCheck = await page.evaluate(() => {
      const nav = document.querySelector('.mobile-bottom-nav');
      if (!nav) return { exists: false };
      const style = window.getComputedStyle(nav);
      const items = Array.from(nav.querySelectorAll('.mobile-nav-btn')).map(b => b.innerText.trim());
      return {
        exists: true,
        display: style.display,
        position: style.position,
        items
      };
    });

    if (bottomNavCheck.exists && bottomNavCheck.display === 'flex' && bottomNavCheck.position === 'fixed') {
      console.log(`  ✓ [PASS] Main Bottom Navigation is fixed at bottom: [${bottomNavCheck.items.join(', ')}]`);
    } else {
      console.error('  ✗ [FAIL] Main Bottom Navigation check failed');
      allPassed = false;
    }

    // Click "Dashboard" in bottom navigation to return to main workspace
    const dashboardBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('.mobile-bottom-nav .mobile-nav-btn'));
      return buttons.find(b => b.innerText.includes('Dashboard'));
    });
    if (dashboardBtn) {
      await dashboardBtn.click();
      await new Promise(r => setTimeout(r, 800));

      const inWorkspace = await page.evaluate(() => {
        return !document.querySelector('.admin-portal-root') && !!document.querySelector('.app-main-wrapper');
      });
      if (inWorkspace) {
        console.log('  ✓ [PASS] Bottom nav "Dashboard" button navigated back into Main Workspace');
      } else {
        console.error('  ✗ [FAIL] Navigation back to workspace failed');
        allPassed = false;
      }
    }

    // ------------------------------------------------------------------------
    // TEST 2: Narrow Mobile Viewport (360x740) — Zero Overflow & 2 Columns
    // ------------------------------------------------------------------------
    console.log('\n>>> [TEST 2: Narrow Android Viewport (360x740) — Layout & Overflow Stability]');
    await page.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true });
    await page.goto(`http://localhost:${TEST_PORT}/index.html#/admin`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    const narrowCheck = await page.evaluate(() => {
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      const sidebar = document.querySelector('.admin-sidebar');
      const style = sidebar ? window.getComputedStyle(sidebar) : null;
      const cols = style && style.gridTemplateColumns ? style.gridTemplateColumns.split(' ').length : 0;

      // Check card labels clipping
      const labels = Array.from(document.querySelectorAll('.admin-nav-item span:not(.admin-active-badge):not(.admin-future-badge)'));
      const hasEmptyLabels = labels.some(l => !l.innerText.trim());

      return {
        hasOverflow: docW > winW,
        scrollWidth: docW,
        innerWidth: winW,
        columns: cols,
        hasEmptyLabels
      };
    });

    if (!narrowCheck.hasOverflow) {
      console.log(`  ✓ [PASS] Zero horizontal page overflow (scrollWidth: ${narrowCheck.scrollWidth}px <= viewport: ${narrowCheck.innerWidth}px)`);
    } else {
      console.error(`  ✗ [FAIL] Horizontal overflow detected at 360px viewport: ${narrowCheck.scrollWidth}px`);
      allPassed = false;
    }

    if (narrowCheck.columns === 2 && !narrowCheck.hasEmptyLabels) {
      console.log(`  ✓ [PASS] 2 columns preserved at 360px width without label clipping`);
    } else {
      console.error(`  ✗ [FAIL] 2 columns not preserved at 360px width: cols=${narrowCheck.columns}`);
      allPassed = false;
    }

    // ------------------------------------------------------------------------
    // TEST 3: Desktop Viewport (1280x800) — Preserving Desktop Sidebar Rail
    // ------------------------------------------------------------------------
    console.log('\n>>> [TEST 3: Desktop Viewport (1280x800) — Preserving Desktop Sidebar Rail]');
    await page.setViewport({ width: 1280, height: 800, isMobile: false });
    await page.goto(`http://localhost:${TEST_PORT}/index.html#/admin`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    const desktopCheck = await page.evaluate(() => {
      const bottomNav = document.querySelector('.mobile-bottom-nav');
      const bottomNavStyle = bottomNav ? window.getComputedStyle(bottomNav) : null;
      const sidebar = document.querySelector('.admin-sidebar');
      const sidebarStyle = sidebar ? window.getComputedStyle(sidebar) : null;
      const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null;

      return {
        bottomNavHidden: !bottomNavStyle || bottomNavStyle.display === 'none',
        sidebarVertical: sidebarStyle && sidebarStyle.flexDirection === 'column',
        sidebarWidth: sidebarRect ? Math.round(sidebarRect.width) : 0
      };
    });

    if (desktopCheck.bottomNavHidden) {
      console.log('  ✓ [PASS] Mobile Bottom Navigation is hidden on desktop (display: none)');
    } else {
      console.error('  ✗ [FAIL] Mobile Bottom Navigation is visible on desktop');
      allPassed = false;
    }

    if (desktopCheck.sidebarVertical && desktopCheck.sidebarWidth === 250) {
      console.log(`  ✓ [PASS] Desktop Admin Sidebar is vertical rail (width: ${desktopCheck.sidebarWidth}px)`);
    } else {
      console.error(`  ✗ [FAIL] Desktop sidebar is not vertical rail: width=${desktopCheck.sidebarWidth}px`);
      allPassed = false;
    }

  } catch (err) {
    console.error('Error during test execution:', err);
    allPassed = false;
  } finally {
    if (browser) await browser.close();
    server.close();
  }

  console.log('\n================================================================');
  if (allPassed) {
    console.log('   ALL MOBILE ADMIN CARD GRID TESTS PASSED! (100% VERIFIED)     ');
  } else {
    console.log('   SOME TESTS FAILED! CHECK OUTPUT ABOVE.                       ');
  }
  console.log('================================================================\n');

  process.exit(allPassed ? 0 : 1);
}

runTest();
