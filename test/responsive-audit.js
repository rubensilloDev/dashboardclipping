import fs from 'fs';
import path from 'path';

function runAudit() {
  const baseCss = fs.readFileSync('css/base.css', 'utf8');
  const layoutCss = fs.readFileSync('css/layout.css', 'utf8');
  const compCss = fs.readFileSync('css/components.css', 'utf8');
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  const appJs = fs.readFileSync('js/app.js', 'utf8');

  console.log('--- STARTING RESPONSIVE AUDIT ---');

  // Item 1: Overflow-x and text wrapping
  const hasHtmlOverflow = baseCss.includes('overflow-x: hidden') && baseCss.includes('max-width: 100%');
  const hasBodyOverflow = baseCss.includes('body {') && baseCss.includes('overflow-x: hidden');
  const hasShellOverflow = layoutCss.includes('.app-shell {') && layoutCss.includes('overflow-x: hidden');
  const hasWordBreak = baseCss.includes('overflow-wrap: anywhere') && baseCss.includes('word-break: break-word');
  console.log('Item 1 (Global Overflow-X & Wrap):', {
    hasHtmlOverflow,
    hasBodyOverflow,
    hasShellOverflow,
    hasWordBreak
  });

  // Item 2: Header in mobile <= 768px
  const hasHeaderTopBar = indexHtml.includes('header-top-bar') && indexHtml.includes('header-mobile-brand');
  const hasHeaderMobileMedia = layoutCss.includes('@media (max-width: 768px)') && layoutCss.includes('.header-top-bar');
  const hasFullWidthSearch = layoutCss.includes('.header-search') && layoutCss.includes('width: 100%');
  console.log('Item 2 (Header Responsive <= 768px):', {
    hasHeaderTopBar,
    hasHeaderMobileMedia,
    hasFullWidthSearch
  });

  // Item 3: Status filter bar pills
  const hasFilterBarOverflow = compCss.includes('.status-filter-bar') && compCss.includes('overflow-x: auto');
  const hasPillsFlexShrink = compCss.includes('.status-pill {') && compCss.includes('flex-shrink: 0') && compCss.includes('white-space: nowrap');
  const hasScrollbarHidden = compCss.includes('.status-filter-bar::-webkit-scrollbar') && compCss.includes('display: none');
  console.log('Item 3 (Filter Pills Swipe & Scroll):', {
    hasFilterBarOverflow,
    hasPillsFlexShrink,
    hasScrollbarHidden
  });

  // Item 4: Campaign banner <= 768px
  const hasCampaignBannerCol = compCss.includes('.campaign-detail-banner') && compCss.includes('flex-direction: column');
  const hasCampaignBannerActionsWrap = compCss.includes('.campaign-detail-banner__actions') && compCss.includes('flex-wrap: wrap');
  console.log('Item 4 (Campaign Banner Mobile):', {
    hasCampaignBannerCol,
    hasCampaignBannerActionsWrap
  });

  // Item 5: Grid & Table mode
  const hasGridAutoFill = compCss.includes('repeat(auto-fill, minmax(min(100%, 250px), 1fr))');
  const hasTableMobileCards = compCss.includes('.video-catalog--table .video-card') && compCss.includes('@media (max-width: 640px)');
  console.log('Item 5 (Grid Auto-Fill & Table Compact):', {
    hasGridAutoFill,
    hasTableMobileCards
  });

  // Item 6: Responsive Modals
  const hasModalMinW = compCss.includes('.modal-dialog {') && compCss.includes('width: min(94vw,');
  const hasModalMaxH = compCss.includes('max-height: 90vh') || compCss.includes('max-height: 92vh');
  console.log('Item 6 (Modals Fluid & Scrollable):', {
    hasModalMinW,
    hasModalMaxH
  });

  // Item 7: Bottom Nav Spacing
  const hasBottomNavPadding = layoutCss.includes('padding-bottom: calc(var(--bottom-nav-height') && layoutCss.includes('app-main-content');
  console.log('Item 7 (Bottom Nav Padding Spacing):', {
    hasBottomNavPadding
  });

  const allPassed = [
    hasHtmlOverflow,
    hasBodyOverflow,
    hasShellOverflow,
    hasWordBreak,
    hasHeaderTopBar,
    hasHeaderMobileMedia,
    hasFullWidthSearch,
    hasFilterBarOverflow,
    hasPillsFlexShrink,
    hasScrollbarHidden,
    hasCampaignBannerCol,
    hasCampaignBannerActionsWrap,
    hasGridAutoFill,
    hasTableMobileCards,
    hasModalMinW,
    hasModalMaxH,
    hasBottomNavPadding
  ].every(Boolean);

  console.log('\n--- AUDIT RESULT ---');
  if (allPassed) {
    console.log('✅ ALL RESPONSIVE REQUIREMENTS VERIFIED AND PASSED 100%!');
  } else {
    console.error('❌ SOME AUDIT CHECKS FAILED');
    process.exit(1);
  }
}

runAudit();

