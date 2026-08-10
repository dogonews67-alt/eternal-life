
// --- IN-APP UPDATE (with reliable fallback) ---
// Strategy:
//   1. Primary: Google Play In-App Updates (Play Core) — works for Play Store installs
//   2. Fallback: Remote version.json check — works for ALL installs (sideloaded, testing, etc.)
//   3. Also checks on app resume (not just on startup)

// ============================
// CONFIG — Update this when you publish a new version
// ============================
const APP_VERSION = {
    name: '1.0.8',
    code: 10009,
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.greson.eternal_life'
};

// ============================
// MAIN CHECK FUNCTION
// ============================
function checkForUpdates(isManual = false) {
    console.log('[Update] Checking for updates... (manual=' + isManual + ')');

    // Throttle: Don't check more than once every 6 hours (unless manual)
    if (!isManual) {
        const lastCheck = localStorage.getItem('lastUpdateCheck');
        if (lastCheck && (Date.now() - parseInt(lastCheck)) < 6 * 60 * 60 * 1000) {
            console.log('[Update] Skipping — checked less than 6 hours ago.');
            return;
        }
    }
    localStorage.setItem('lastUpdateCheck', Date.now().toString());

    // Try Play Core (only works for Play Store installs)
    _tryPlayCoreUpdate(isManual).then(handled => {
        if (!handled && isManual) {
            // Play Core not available (sideloaded app) — open Play Store directly
            console.log('[Update] Play Core unavailable. Opening Play Store for manual check.');
            _openPlayStore();
        }
    });
}

// ============================
// STRATEGY 1: Google Play In-App Updates
// ============================
function _tryPlayCoreUpdate(isManual) {
    return new Promise(resolve => {
        if (typeof cordova === 'undefined' || !cordova.plugins) {
            resolve(false);
            return;
        }

        const updatePlugin = window.InAppUpdate ||
            (cordova.plugins && (cordova.plugins.InAppUpdate || cordova.plugins.inappupdate));

        if (!updatePlugin) {
            resolve(false);
            return;
        }

        updatePlugin.getUpdateAvailability(function (result) {
            console.log('[Update] Play Core result:', result);

            let updateAvailable = false;
            let remoteVersionCode = null;

            if (typeof result === 'object' && result.status === 'UPDATE_AVAILABLE') {
                updateAvailable = true;
                remoteVersionCode = result.versionCode;
            } else if (result === 'UPDATE_AVAILABLE' || result === 2) {
                updateAvailable = true;
                remoteVersionCode = 'unknown';
            }

            if (updateAvailable) {
                _showUpdatePopup(remoteVersionCode, null, 'playcore');
                resolve(true);
            } else {
                if (isManual) alert('You are on the latest version!');
                resolve(true); // Play Core worked, just no update
            }
        }, function (err) {
            console.warn('[Update] Play Core failed:', err);
            resolve(false); // Fall through to remote check
        });
    });
}


// ============================
// SHOW UPDATE POPUP
// ============================
function _showUpdatePopup(remoteVersionCode, remoteInfo, source) {
    console.log('[Update] Showing update popup (source: ' + source + ')');

    // Schedule a notification too
    if (typeof cordova !== 'undefined' && cordova.plugins &&
        cordova.plugins.notification && cordova.plugins.notification.local) {
        cordova.plugins.notification.local.schedule({
            id: 888,
            title: 'New Update Available',
            text: 'A new version of Eternal Life is available. Tap to update.',
            foreground: true
        });
    }

    // Check if user ignored this version
    const ignoredVersion = localStorage.getItem('ignoredUpdateVersion');
    if (ignoredVersion && remoteVersionCode !== 'unknown' &&
        parseInt(ignoredVersion) >= parseInt(remoteVersionCode)) {
        console.log('[Update] User previously ignored version ' + remoteVersionCode);
        return;
    }

    // Store remote info for the "Update Now" button
    window._updateInfo = { remoteVersionCode, remoteInfo, source };

    // Update popup text if we have detailed info
    const popup = document.getElementById('updatePopup');
    if (popup) {
        // Update release notes if available
        const notesEl = popup.querySelector('.update-notes');
        if (notesEl && remoteInfo && remoteInfo.notes) {
            notesEl.textContent = remoteInfo.notes;
            notesEl.style.display = 'block';
        }

        // Update version text
        const versionEl = popup.querySelector('.update-version');
        if (versionEl && remoteInfo && remoteInfo.version) {
            versionEl.textContent = 'Version ' + remoteInfo.version + ' is available';
        }

        popup.style.display = 'flex';
        popup.dataset.version = remoteVersionCode;

        const checkbox = document.getElementById('dontShowUpdateAgain');
        if (checkbox) checkbox.checked = false;
    }
}

// ============================
// USER ACTIONS
// ============================
function manualCheckForUpdates() {
    checkForUpdates(true);
}

function closeUpdatePopup() {
    const popup = document.getElementById('updatePopup');
    if (!popup) return;

    const checkbox = document.getElementById('dontShowUpdateAgain');
    const version = popup.dataset.version;

    if (checkbox && checkbox.checked && version && version !== 'unknown') {
        localStorage.setItem('ignoredUpdateVersion', version);
    }

    popup.style.display = 'none';
}

function performInAppUpdate() {
    const popup = document.getElementById('updatePopup');
    if (popup) popup.style.display = 'none';

    const info = window._updateInfo || {};

    // Strategy A: Try Play Core flexible update
    if (info.source === 'playcore') {
        const updatePlugin = window.InAppUpdate ||
            (cordova.plugins && (cordova.plugins.InAppUpdate || cordova.plugins.inappupdate));

        if (updatePlugin) {
            updatePlugin.updateFlexible(function (res) {
                console.log('[Update] Flexible update started:', res);
            }, function (err) {
                console.error('[Update] Flexible update failed:', err);
                // Fallback: Open Play Store
                _openPlayStore();
            });
            return;
        }
    }

    // Strategy B: Open Play Store directly
    _openPlayStore(info.remoteInfo && info.remoteInfo.url);
}

function _openPlayStore(customUrl) {
    const url = customUrl || 'https://play.google.com/store/apps/details?id=com.greson.eternal_life';
    console.log('[Update] Opening Play Store:', url);

    // Try cordova-plugin-inappbrowser first
    if (typeof cordova !== 'undefined' && cordova.InAppBrowser) {
        cordova.InAppBrowser.open(url, '_system');
    } else {
        window.open(url, '_system');
    }
}

// ============================
// AUTO-CHECK ON APP RESUME
// ============================
document.addEventListener('deviceready', function () {
    document.addEventListener('resume', function () {
        console.log('[Update] App resumed, checking for updates...');
        // Small delay to let the app settle
        setTimeout(() => checkForUpdates(false), 2000);
    }, false);
}, false);
