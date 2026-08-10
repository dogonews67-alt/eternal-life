/**
 * ========================================
 * ONBOARDING WIZARD & TUTORIAL OVERLAY
 * For Eternal Life App
 * ========================================
 */

// --- LANGUAGE LIST for onboarding selector ---
const ONBOARDING_LANGUAGES = [
    { value: 'text', label: 'English' },
    { value: 'text_arabic', label: 'Arabic (العربية)' },
    { value: 'text_assamese', label: 'Assamese (অসমীয়া)' },
    { value: 'text_bengali', label: 'Bengali (বাংলা)' },
    { value: 'text_burmese', label: 'Burmese (ဗမာ)' },
    { value: 'text_chinese', label: 'Chinese (中文)' },
    { value: 'text_czech', label: 'Czech (Čeština)' },
    { value: 'text_dogri', label: 'Dogri (डोगरी)' },
    { value: 'text_dutch', label: 'Dutch (Nederlands)' },

    { value: 'text_french', label: 'French (Français)' },
    { value: 'text_german', label: 'German (Deutsch)' },
    { value: 'text_gujarati', label: 'Gujarati (ગુજરાતી)' },
    { value: 'text_hindi', label: 'Hindi (हिंदी)' },
    { value: 'text_hungarian', label: 'Hungarian (Magyar)' },
    { value: 'text_igbo', label: 'Igbo' },
    { value: 'text_indonesian', label: 'Indonesian (Bahasa)' },
    { value: 'text_italian', label: 'Italian (Italiano)' },
    { value: 'text_japanese', label: 'Japanese (日本語)' },
    { value: 'text_kannada', label: 'Kannada (ಕನ್ನಡ)' },
    { value: 'text_korean', label: 'Korean (한국어)' },
    { value: 'text_malayalam', label: 'Malayalam (മലയാളം)' },
    { value: 'text_manipuri', label: 'Manipuri (মৈতৈলোন্)' },
    { value: 'text_marathi', label: 'Marathi (मराठी)' },
    { value: 'text_nagamese', label: 'Nagamese' },
    { value: 'text_nepali', label: 'Nepali (नेपाली)' },
    { value: 'text_norwegian', label: 'Norwegian (Norsk)' },
    { value: 'text_odia', label: 'Odia (ଓଡ଼ିଆ)' },
    { value: 'text_oromo', label: 'Oromo' },

    { value: 'text_polish', label: 'Polish (Polski)' },
    { value: 'text_portuguese', label: 'Portuguese (Português)' },
    { value: 'text_punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)' },
    { value: 'text_rohingya', label: 'Rohingya (Rohingya)' },
    { value: 'text_romanian', label: 'Romanian (Română)' },
    { value: 'text_russian', label: 'Russian (Русский)' },
    { value: 'text_sanskrit', label: 'Sanskrit (संस्कृतम्)' },
    { value: 'text_somali', label: 'Somali (Soomaali)' },
    { value: 'text_spanish', label: 'Spanish (Español)' },
    { value: 'text_swahili', label: 'Swahili (Kiswahili)' },
    { value: 'text_swedish', label: 'Swedish (Svenska)' },
    { value: 'text_tagalog', label: 'Tagalog' },
    { value: 'text_tamil', label: 'Tamil (தமிழ்)' },
    { value: 'text_telugu', label: 'Telugu (తెలుగు)' },
    { value: 'text_thai', label: 'Thai (ไทย)' },
    { value: 'text_turkish', label: 'Turkish (Türkçe)' },
    { value: 'text_vietnamese', label: 'Vietnamese (Tiếng Việt)' },
    { value: 'text_yoruba', label: 'Yoruba (Yorùbá)' }
];

let onboardingCurrentSlide = 0;
const TOTAL_SLIDES = 1;
let selectedOnboardingLang = localStorage.getItem('myReaderPreferredLang') || 'text';
let onboardingStartTime = Date.now();

// ========================================
// WIZARD FUNCTIONS
// ========================================

/**
 * Check if onboarding should show and display it
 */
function checkAndShowOnboarding() {
    if (!localStorage.getItem('onboardingCompleted')) {
        showOnboarding();
    }
}

/**
 * Build and show the onboarding wizard
 */
function showOnboarding() {
    // Remove existing if any
    const existing = document.getElementById('onboardingWizard');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'onboardingWizard';
    overlay.className = 'onboarding-overlay';

    // Build language buttons
    let langButtons = '';
    ONBOARDING_LANGUAGES.forEach(lang => {
        const isSelected = lang.value === selectedOnboardingLang ? 'selected' : '';
        langButtons += `<button class="onboarding-lang-btn ${isSelected}" data-action="lang" data-lang="${lang.value}">${lang.label}</button>`;
    });

    overlay.innerHTML = `
        <div class="onboarding-slides" id="onboardingSlides">

            <!-- SINGLE WELCOME SCREEN -->
            <div class="onboarding-slide active">
                <img src="the_eternal_life.png" alt="Eternal Life" class="onboarding-cover-img">
                <h1 class="onboarding-title">Welcome to Eternal Life</h1>
                <p class="onboarding-subtitle">Your personal Bible companion for reading, learning, and growing in faith.</p>
                <div class="onboarding-btn-row">
                    <button class="onboarding-btn primary" data-action="finish">Get Started →</button>
                </div>
            </div>

        </div>
    `;

    document.body.appendChild(overlay);
    onboardingCurrentSlide = 0;
    onboardingStartTime = Date.now();

    // --- EVENT DELEGATION: Handle all button clicks via a single listener ---
    overlay.addEventListener('click', function (e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.getAttribute('data-action');

        if (action === 'slide') {
            const slideIndex = parseInt(target.getAttribute('data-slide'), 10);
            goToSlide(slideIndex);
        } else if (action === 'skip') {
            skipOnboarding();
        } else if (action === 'finish') {
            finishOnboarding();
        } else if (action === 'lang') {
            const langValue = target.getAttribute('data-lang');
            selectOnboardingLang(langValue, target);
        }
    });

    // Scroll to the selected language in the list
    setTimeout(() => {
        const selectedBtn = document.querySelector('.onboarding-lang-btn.selected');
        if (selectedBtn) {
            selectedBtn.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }, 500);
}

/**
 * Navigate to a specific slide by toggling .active class
 */
function goToSlide(index) {
    if (index < 0 || index >= TOTAL_SLIDES) return;



    onboardingCurrentSlide = index;

    // Toggle active class on slides
    const slides = document.querySelectorAll('.onboarding-slide');
    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
    });

    // Update dots
    const dots = document.querySelectorAll('.onboarding-dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

/**
 * Go to previous slide
 */
function prevOnboardingSlide() {
    if (onboardingCurrentSlide > 0) {
        goToSlide(onboardingCurrentSlide - 1);
        return true; // Handled
    }
    return false; // Not handled (let back button do default or close)
}

/**
 * Select a language during onboarding
 */
function selectOnboardingLang(langValue, btnElement) {
    selectedOnboardingLang = langValue;

    // Update UI
    document.querySelectorAll('.onboarding-lang-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    if (btnElement) btnElement.classList.add('selected');

    // Actually set the language in localStorage (same key used by the app)
    localStorage.setItem('myReaderPreferredLang', langValue);

    // Update the settings panel selector too
    const langSelector = document.getElementById('preferredLangSelector');
    if (langSelector) {
        langSelector.value = langValue;
    }
}

/**
 * Skip onboarding entirely
 */
function skipOnboarding() {
    localStorage.setItem('onboardingCompleted', 'true');
    closeOnboardingWizard();
}

/**
 * Finish onboarding (last screen) and start interactive tutorial
 */
function finishOnboarding() {
    localStorage.setItem('onboardingCompleted', 'true');
    closeOnboardingWizard();

    // Start the interactive tutorial after a short delay
    setTimeout(() => {
        startTutorial();
    }, 600);
}

/**
 * Remove the wizard overlay with animation
 */
function closeOnboardingWizard() {
    const overlay = document.getElementById('onboardingWizard');
    if (overlay) {
        overlay.style.transition = 'opacity 0.4s ease';
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
        }, 400);
    }

    // Trigger language reload if language was changed
    if (typeof setPreferredLanguage === 'function') {
        const savedLang = localStorage.getItem('myReaderPreferredLang') || 'text';
        setPreferredLanguage(savedLang);
    }
}


// ========================================
// INTERACTIVE TUTORIAL OVERLAY
// ========================================

const TUTORIAL_STEPS = [
    {
        selector: '.icon-btn[onclick="toggleSettings()"]',
        text: 'Tap here to open Settings — change language, theme, font size, and more.',
        position: 'below',
        advanceOn: 'click', // Advance on click
        postActionDelay: 500, // Wait for panel to open
        nextStepIfSkipped: 2 // Skip to Book Selection if user clicks Next without opening settings
    },
    {
        selector: '#preferredLangSelector',
        text: 'Select your preferred language here.',
        position: 'below',
        raisePanel: 'settingsPanel', // Ensure panel is above backdrop
        highlightPadding: 5
    },
    {
        selector: '.icon-btn.book-icon',
        text: 'Tap here to open the Book Selector.',
        position: 'below',
        advanceOn: 'click',
        postActionDelay: 400,
        nextStepIfSkipped: 4 // Skip to Search if user clicks Next without opening book selector
    },
    {
        selector: '[data-book-id="bible"]',
        text: 'Tap Bible to switch from Eternal Life to the Holy Bible.',
        position: 'below',
        raisePanel: 'bookSelectorSidebar',
        advanceOn: 'click',
        postActionDelay: 800,
        highlightPadding: 5
    },

    {
        selector: '.icon-btn[onclick="toggleSearchPanel(true)"]',
        text: 'Tap here to Search — find any word or verse in the current book.',
        position: 'below',
        advanceOn: 'click',
        waitForPanel: 'searchPanel'
    },
    {
        selector: '.icon-btn[onclick="toggleBookmarks()"]',
        text: 'Tap here to see your Bookmarks — saved verses for quick access.',
        position: 'below',
        advanceOn: 'click',
        waitForPanel: 'sidebar' // Bookmarks use the generic sidebar element
    },
    {
        selector: '.icon-btn[onclick="toggleGamesModal()"]',
        text: 'Tap here to play Bible Games — Quiz, Scroll Restorer, and more!',
        position: 'below',
        advanceOn: 'click',
        waitForPanel: 'gamesModal'
    },
    {
        selector: '#nextBtn',
        text: 'Tap this arrow to go to the Next chapter.',
        position: 'center',
        forceVisible: true
    },
    {
        selector: '#prevBtn',
        text: 'Tap this arrow to go back to the Previous chapter.',
        position: 'center',
        forceVisible: true
    },
    {
        selector: null,
        text: 'You can also Swipe left or right on the page to change chapters!',
        position: 'center'
    }
];

let tutorialCurrentStep = 0;
let tutorialOverlayEl = null;
let tutorialHighlightEl = null;
let tutorialTooltipEl = null;
let tutorialStepListener = null; // Store listener to remove it
let tutorialRaisedPanel = null; // Track panel whose z-index was raised
let tutorialRaisedPanelOriginalZ = ''; // Original z-index to restore
let tutorialForcedElements = []; // Track elements forced visible

/**
 * Start the interactive tutorial
 */
function startTutorial() {
    // CHECK FOR LOADING OVERLAY
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay && loadingOverlay.style.display !== 'none' && loadingOverlay.style.opacity !== '0') {
        // App is still loading, wait and retry
        // console.log("Tutorial waiting for app load...");
        setTimeout(startTutorial, 500);
        return;
    }

    // Close settings panel if open (check for 'show' class, use closeSettings directly)
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsPanel && settingsPanel.classList.contains('show')) {
        if (typeof closeSettings === 'function') {
            closeSettings();
        } else {
            settingsPanel.classList.remove('show');
        }
    }

    tutorialCurrentStep = 0;

    // Create overlay elements
    tutorialOverlayEl = document.createElement('div');
    tutorialOverlayEl.id = 'tutorialOverlay';
    tutorialOverlayEl.className = 'tutorial-overlay';

    const backdrop = document.createElement('div');
    backdrop.className = 'tutorial-backdrop';
    backdrop.id = 'tutorialBackdrop';
    backdrop.onclick = () => nextTutorialStep();
    tutorialOverlayEl.appendChild(backdrop);

    tutorialHighlightEl = document.createElement('div');
    tutorialHighlightEl.className = 'tutorial-highlight';
    tutorialHighlightEl.id = 'tutorialHighlight';

    tutorialTooltipEl = document.createElement('div');
    tutorialTooltipEl.className = 'tutorial-tooltip';
    tutorialTooltipEl.id = 'tutorialTooltip';

    document.body.appendChild(tutorialOverlayEl);
    document.body.appendChild(tutorialHighlightEl);
    document.body.appendChild(tutorialTooltipEl);

    showTutorialStep(0);
}

/**
 * Show a specific tutorial step
 */
function showTutorialStep(stepIndex) {
    // CHECK FOR LOADING OVERLAY
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay && loadingOverlay.style.display !== 'none' && loadingOverlay.style.opacity !== '0') {
        // App is still loading, wait and retry this step
        setTimeout(() => showTutorialStep(stepIndex), 500);
        return;
    }

    if (stepIndex >= TUTORIAL_STEPS.length) {
        endTutorial();
        return;
    }

    tutorialCurrentStep = stepIndex;
    const step = TUTORIAL_STEPS[stepIndex];

    // --- HANDLE preAction (e.g. re-open book selector sidebar) ---
    if (step.preAction === 'openBookSelector') {
        const sidebar = document.getElementById('bookSelectorSidebar');
        if (!sidebar || !sidebar.classList.contains('open')) {
            if (typeof toggleBookSelectorSidebar === 'function') {
                toggleBookSelectorSidebar();
            }
            // Wait for sidebar to open, then continue rendering this step
            setTimeout(() => {
                showTutorialStepContinue(stepIndex, step);
            }, 400);
            return;
        }
    }

    showTutorialStepContinue(stepIndex, step);
}

/**
 * Continuation of showTutorialStep after any preAction has been handled.
 */
function showTutorialStepContinue(stepIndex, step) {
    // --- HANDLE STEPS WITH NO SELECTOR (e.g. Swipe Instruction) ---
    if (!step.selector) {
        // Hide highlight box
        tutorialHighlightEl.style.opacity = '0';

        // Full backdrop (no hole)
        const backdrop = document.getElementById('tutorialBackdrop');
        backdrop.style.clipPath = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';

        // Build tooltip content
        const isLast = stepIndex === TUTORIAL_STEPS.length - 1;
        const btnText = isLast ? 'Got it! ✓' : 'Next →';
        let nextAction = isLast ? 'endTutorial()' : `nextTutorialStep(${step.nextStepIfSkipped || ''})`;

        tutorialTooltipEl.innerHTML = `
            <div class="tutorial-step-counter">STEP ${stepIndex + 1} OF ${TUTORIAL_STEPS.length}</div>
            <div class="tutorial-tooltip-text">${step.text}</div>
            <button class="tutorial-tooltip-btn" onclick="${nextAction}">${btnText}</button>
        `;

        // Center tooltip on screen
        const tooltipWidth = 280;
        const tooltipTop = (window.innerHeight - 150) / 2;
        const tooltipLeft = (window.innerWidth - tooltipWidth) / 2;

        tutorialTooltipEl.style.top = tooltipTop + 'px';
        tutorialTooltipEl.style.left = tooltipLeft + 'px';
        tutorialTooltipEl.style.width = tooltipWidth + 'px';

        // Handle Panel Raising/Restoring for non-selector steps (unlikely needed but good for completeness)
        handlePanelState(step);

        return;
    }

    // Handle Panel Raising/Restoring BEFORE finding element (element might be inside hidden panel)
    handlePanelState(step);

    const targetEl = document.querySelector(step.selector);

    if (!targetEl) {
        // Skip if element not found
        showTutorialStep(stepIndex + 1);
        return;
    }

    // --- HANDLE FORCE VISIBLE ---
    if (step.forceVisible) {
        const targetStyle = window.getComputedStyle(targetEl);
        if (targetStyle.display === 'none' || targetStyle.visibility === 'hidden') {
            // Force show it (assume flex for buttons, block for others if needed)
            targetEl.style.display = 'flex'; // Nav buttons use flex
            targetEl.style.zIndex = '100001'; // Ensure it's above everything if needed
            tutorialForcedElements.push({
                element: targetEl,
                originalDisplay: 'none',
                originalZ: targetStyle.zIndex
            });
        }
    }

    // Skip if element is not visible (unless we just forced it)
    // Re-check visibility
    const targetRectCheck = targetEl.getBoundingClientRect();
    if (targetRectCheck.width === 0 && targetRectCheck.height === 0) {
        showTutorialStep(stepIndex + 1);
        return;
    }

    const rect = targetEl.getBoundingClientRect();
    const padding = 8;

    // Show highlight box (in case it was hidden)
    tutorialHighlightEl.style.opacity = '1';

    // Position highlight box
    tutorialHighlightEl.style.top = (rect.top - padding) + 'px';
    tutorialHighlightEl.style.left = (rect.left - padding) + 'px';
    tutorialHighlightEl.style.width = (rect.width + padding * 2) + 'px';
    tutorialHighlightEl.style.height = (rect.height + padding * 2) + 'px';

    // Highlight Listener for Advance
    if (tutorialStepListener) {
        document.removeEventListener('click', tutorialStepListener);
        tutorialStepListener = null;
    }

    if (step.advanceOn === 'click') {
        // Allow clicking the highlighted element by making the backdrop HOLE clickable
        // The element underneath receives the click
        // We listen for it globally or on the specific element if possible

        // Simpler: Just listen for the click on the TARGET element
        // But target element is covered by highlight? No, highlight is pointer-events: none.
        // Backdrop has hole.

        tutorialStepListener = function (e) {
            // Check if click was inside the highlighted rect
            if (targetEl.contains(e.target) || e.target === targetEl) {
                // Determine if we need to show a "Close Panel" step
                if (step.postActionDelay) {
                    setTimeout(() => {
                        nextTutorialStep();
                    }, step.postActionDelay);
                } else if (step.waitForPanel) {
                    // Slight delay to let panel open
                    setTimeout(() => {
                        showClosePanelStep(step.waitForPanel);
                    }, 300);
                } else {
                    nextTutorialStep();
                }
            }
        };
        // Add capturing listener to document to catch it
        document.addEventListener('click', tutorialStepListener, { capture: true, once: true });
    }

    // If there's a paired element (like both nav arrows), extend highlight
    if (step.alsoPair) {
        const pairEl = document.querySelector(step.alsoPair);
        if (pairEl) {
            const pairRect = pairEl.getBoundingClientRect();
            // Don't extend — just make highlight wider for visual effect
            // Position tooltip in center below
        }
    }

    // Create backdrop clip-path to cut out the highlighted area
    const clipTop = rect.top - padding;
    const clipLeft = rect.left - padding;
    const clipRight = rect.right + padding;
    const clipBottom = rect.bottom + padding;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Polygon that covers everything EXCEPT the highlighted rect
    const backdrop = document.getElementById('tutorialBackdrop');
    backdrop.style.clipPath = `polygon(
        0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
        ${clipLeft}px ${clipTop}px,
        ${clipLeft}px ${clipBottom}px,
        ${clipRight}px ${clipBottom}px,
        ${clipRight}px ${clipTop}px,
        ${clipLeft}px ${clipTop}px
    )`;

    // Build tooltip content
    const isLast = stepIndex === TUTORIAL_STEPS.length - 1;
    const btnText = isLast ? 'Got it! ✓' : 'Next →';
    let nextAction = isLast ? 'endTutorial()' : `nextTutorialStep(${step.nextStepIfSkipped || ''})`;

    tutorialTooltipEl.innerHTML = `
        <div class="tutorial-step-counter">STEP ${stepIndex + 1} OF ${TUTORIAL_STEPS.length}</div>
        <div class="tutorial-tooltip-text">${step.text}</div>
        <button class="tutorial-tooltip-btn" onclick="${nextAction}">${btnText}</button>
    `;

    // Position tooltip below or above the target
    const tooltipWidth = 280;
    let tooltipTop, tooltipLeft;

    if (step.position === 'center') {
        // Center on screen, below toolbar
        tooltipTop = Math.max(rect.bottom + 20, 100);
        tooltipLeft = (window.innerWidth - tooltipWidth) / 2;
    } else if (rect.bottom + 180 > window.innerHeight) {
        // Above
        tooltipTop = rect.top - 150;
        tooltipLeft = Math.max(10, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 10));
    } else {
        // Below
        tooltipTop = rect.bottom + 20;
        tooltipLeft = Math.max(10, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 10));
    }

    tutorialTooltipEl.style.top = tooltipTop + 'px';
    tutorialTooltipEl.style.left = tooltipLeft + 'px';
    tutorialTooltipEl.style.width = tooltipWidth + 'px';
}

/**
 * Show a temporary "Close Panel" step
 */
function showClosePanelStep(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return nextTutorialStep();

    // CRITICAL: Raise the panel's z-index above the tutorial backdrop
    // so the user can actually SEE and interact with the panel content.
    tutorialRaisedPanelOriginalZ = panel.style.zIndex || '';
    tutorialRaisedPanel = panel;
    panel.style.zIndex = '99999';

    // Also raise the sidebar overlay if it exists (for settings/book sidebar)
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    if (sidebarOverlay) {
        sidebarOverlay.style.zIndex = '99997'; // Below tutorial but allow backdrop
    }

    // Find a close button inside the panel
    // First try .close-btn, then any button with close/toggle in onclick
    let closeBtn = panel.querySelector('.close-btn');
    if (!closeBtn) {
        closeBtn = panel.querySelector('button[onclick*="toggle"], button[onclick*="close"]');
    }
    if (!closeBtn) {
        // For modal-content wrapper (games modal has nested content)
        const modalContent = panel.querySelector('.modal-content');
        if (modalContent) {
            closeBtn = modalContent.querySelector('.close-btn');
        }
    }
    if (!closeBtn) {
        // Absolute fallback: just advance
        restorePanelZIndex();
        return nextTutorialStep();
    }

    // Small delay to let panel animation complete before measuring
    setTimeout(() => {
        const rect = closeBtn.getBoundingClientRect();
        const padding = 8;

        // Verify close button is visible
        if (rect.width === 0 || rect.height === 0) {
            restorePanelZIndex();
            return nextTutorialStep();
        }

        tutorialHighlightEl.style.top = (rect.top - padding) + 'px';
        tutorialHighlightEl.style.left = (rect.left - padding) + 'px';
        tutorialHighlightEl.style.width = (rect.width + padding * 2) + 'px';
        tutorialHighlightEl.style.height = (rect.height + padding * 2) + 'px';

        // Update backdrop hole to expose close button
        const backdrop = document.getElementById('tutorialBackdrop');
        const clipTop = rect.top - padding;
        const clipLeft = rect.left - padding;
        const clipRight = rect.right + padding;
        const clipBottom = rect.bottom + padding;

        backdrop.style.clipPath = `polygon(
            0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
            ${clipLeft}px ${clipTop}px,
            ${clipLeft}px ${clipBottom}px,
            ${clipRight}px ${clipBottom}px,
            ${clipRight}px ${clipTop}px,
            ${clipLeft}px ${clipTop}px
        )`;

        // Update tooltip
        tutorialTooltipEl.innerHTML = `
            <div class="tutorial-step-counter">STEP ${tutorialCurrentStep + 1} CONTINUED</div>
            <div class="tutorial-tooltip-text">Great! Now tap ✕ to close and continue.</div>
        `;

        // Position tooltip below close button
        const tooltipWidth = 260;
        const tooltipTop = rect.bottom + 20;
        const tooltipLeft = Math.max(10, Math.min(
            rect.left + rect.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - 10
        ));

        tutorialTooltipEl.style.top = tooltipTop + 'px';
        tutorialTooltipEl.style.left = tooltipLeft + 'px';
        tutorialTooltipEl.style.width = tooltipWidth + 'px';

        // Listen for close click
        if (tutorialStepListener) document.removeEventListener('click', tutorialStepListener);

        tutorialStepListener = function (e) {
            if (closeBtn.contains(e.target) || e.target === closeBtn) {
                setTimeout(() => {
                    restorePanelZIndex();
                    nextTutorialStep();
                }, 400);
            }
        };
        document.addEventListener('click', tutorialStepListener, { capture: true, once: true });
    }, 350); // Wait for panel slide/fade animation
}

/**
 * Restore panel z-index after close panel step
 */
function restorePanelZIndex() {
    if (tutorialRaisedPanel) {
        tutorialRaisedPanel.style.zIndex = tutorialRaisedPanelOriginalZ;

        // Also force close panel if the user skipped over it without interacting
        if (tutorialRaisedPanel.classList) {
            tutorialRaisedPanel.classList.remove('open', 'show');
        }

        tutorialRaisedPanel = null;
        tutorialRaisedPanelOriginalZ = '';
    }
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    if (sidebarOverlay) {
        sidebarOverlay.style.zIndex = '';
        sidebarOverlay.classList.remove('show', 'active');
    }
}

/**
 * Advance to next tutorial step
 */
let isAdvancingStep = false;

/**
 * Advance to next tutorial step
 */
function nextTutorialStep(targetIndex) {
    if (isAdvancingStep) return;
    isAdvancingStep = true;

    // Determine next step (use targetIndex if provided, otherwise increment)
    // Careful: handle 0 as valid index
    const nextStep = (typeof targetIndex === 'number') ? targetIndex : tutorialCurrentStep + 1;

    console.log(`[Tutorial] Advancing from step ${tutorialCurrentStep} to ${nextStep}`);
    if (tutorialStepListener) {
        document.removeEventListener('click', tutorialStepListener);
        tutorialStepListener = null;
    }
    showTutorialStep(nextStep);

    // Reset flag
    setTimeout(() => { isAdvancingStep = false; }, 500);
}

/**
 * End the tutorial
 */
function endTutorial() {
    // Restore any raised panel z-indexes
    restorePanelZIndex();

    // Revert forced visible elements
    tutorialForcedElements.forEach(item => {
        if (item.element) {
            item.element.style.display = item.originalDisplay;
            item.element.style.zIndex = item.originalZ;
        }
    });
    tutorialForcedElements = [];

    // Remove step listener
    if (tutorialStepListener) {
        document.removeEventListener('click', tutorialStepListener);
        tutorialStepListener = null;
    }

    // Clean up all tutorial elements
    if (tutorialOverlayEl) {
        tutorialOverlayEl.style.transition = 'opacity 0.3s ease';
        tutorialOverlayEl.style.opacity = '0';
    }
    if (tutorialHighlightEl) {
        tutorialHighlightEl.style.transition = 'opacity 0.3s ease';
        tutorialHighlightEl.style.opacity = '0';
    }
    if (tutorialTooltipEl) {
        tutorialTooltipEl.style.transition = 'opacity 0.3s ease';
        tutorialTooltipEl.style.opacity = '0';
    }

    setTimeout(() => {
        if (tutorialOverlayEl) tutorialOverlayEl.remove();
        if (tutorialHighlightEl) tutorialHighlightEl.remove();
        if (tutorialTooltipEl) tutorialTooltipEl.remove();
        tutorialOverlayEl = null;
        tutorialHighlightEl = null;
        tutorialTooltipEl = null;
    }, 300);
}

/**
 * Replay tutorial from settings (resets onboarding flag too optionally)
 */
function replayTutorial() {
    // Close settings first
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsPanel && settingsPanel.classList.contains('open')) {
        if (typeof toggleSettings === 'function') toggleSettings();
    }

    setTimeout(() => {
        startTutorial();
    }, 400);
}

/**
 * Handle raising and restoring panels based on step configuration
 */
function handlePanelState(step) {
    console.log(`[Tutorial] handlePanelState for step with raisePanel: ${step.raisePanel}`);
    if (step.raisePanel) {
        const panel = document.getElementById(step.raisePanel);
        console.log(`[Tutorial] Raising panel: ${step.raisePanel}, Found: ${!!panel}, CurrentRaised: ${tutorialRaisedPanel ? tutorialRaisedPanel.id : 'none'}`);
        if (panel) {
            // If already raised and same panel, do nothing
            if (tutorialRaisedPanel === panel) {
                console.log(`[Tutorial] Panel ${panel.id} is already raised. Keeping it.`);
                return;
            }

            // If another panel is raised, restore it first
            if (tutorialRaisedPanel) restorePanelZIndex();

            // Raise new panel
            tutorialRaisedPanelOriginalZ = panel.style.zIndex || '';
            tutorialRaisedPanel = panel;
            panel.style.zIndex = '99999';

            // Also raise sidebar overlay
            const sidebarOverlay = document.getElementById('sidebarOverlay');
            if (sidebarOverlay) {
                sidebarOverlay.style.zIndex = '99997'; // Below tutorial but allow backdrop
            }
        }
    } else {
        // If current step doesn't require raised panel, restore any raised panel
        console.log(`[Tutorial] No raisePanel for this step. CurrentRaised: ${tutorialRaisedPanel ? tutorialRaisedPanel.id : 'none'}`);
        if (tutorialRaisedPanel) {
            restorePanelZIndex();
        }
    }
}

// Automatically check and show onboarding immediately on first run
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAndShowOnboarding);
    } else {
        checkAndShowOnboarding();
    }
}
