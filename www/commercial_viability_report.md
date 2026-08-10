# Bible Version Commercial Viability Audit

## Executive Summary
**CRITICAL**: The app currently includes the **NIV (New International Version)** and likely **BSI (Bible Society of India)** versions. These are **copyrighted** and cannot be used in a commercial application without an expensive license.

**Recommendation**: Replace NIV with **WEB (World English Bible)** and ensure all Indian languages use **IRV (Indian Revised Version)** or confirmed Public Domain texts (like versions published before 1950 where copyright has expired, though BSI copyrights are complex).

## Detailed Breakdown

### 🔴 High Risk (Copyrighted / Non-Commercial)
These versions are likely to cause legal issues if distributed commercially.

| Language | Identifier | Source Used | Issue |
| :--- | :--- | :--- | :--- |
| **English** | `Bible-niv` | GitHub (Aruljohn) | **NIV is strictly copyrighted** (Zondervan/Biblica). Unauthorized distribution. |
| **Hindi** | `HINIRV` / `HIOV` | HelloAo / Bolls | Config states "Hindi O.V. Re-edited (**BSI**)". BSI versions are copyrighted. |
| **Swedish** | `SFB2015` | Bolls | **Svenska Folkbibeln 2015** is a modern translation, likely copyrighted. |
| **Malayalam** | `mal_irv` / `MOV` | HelloAo / Bolls | "Malayalam Indian Revised Version" (IRV) is usually CC-BY-SA (Safe), but verify it is not BSI OV. |

### 🟡 Medium Risk (Verify Source)
These versions come from GitHub repositories where the exact text version and license are not explicitly guaranteed to be Public Domain, though they likely are.

| Language | Identifier | Source Used | Notes |
| :--- | :--- | :--- | :--- |
| **Bengali** | `GodlyTalias` | GitHub | Check if text is "Bengali Bible 2013" (Open) or BSI OV (Copyrighted). |
| **Gujarati** | `GodlyTalias` | GitHub | Verify text version. |
| **Kannada** | `GodlyTalias` | GitHub | Verify text version. |
| **Marathi** | `GodlyTalias` | GitHub | Verify text version. |
| **Odia** | `GodlyTalias` | GitHub | Verify text version. |
| **Punjabi** | `GodlyTalias` | GitHub | Verify text version. |
| **Tamil** | `GodlyTalias` | GitHub | Verify text version. |
| **Telugu** | `GodlyTalias` | GitHub | Verify text version. |
| **Turkish** | `tur_obt` | HelloAo | "Open Bible Translations". Usually Safe (CC-BY-SA), but verify attribution requirements. |

### 🟢 Low Risk (Safe / Public Domain)
These versions are generally considered Public Domain or Open License.

| Language | Identifier | Version Name |
| :--- | :--- | :--- |
| **Arabic** | `SVD` | Smith & Van Dyke (Public Domain) |
| **Burmese** | `mya_jvb` | Judson 1835 (Public Domain) |
| **Chinese** | `cmn_cu1` | CUV Simplified (Public Domain) |
| **Czech** | `CSP09` | Czech Study (Verify if CSP is open, Bolls usually hosts open) |
| **Dutch** | `NLD` | Statenvertaling (Public Domain) |
| **French** | `fra_lsg` | Louis Segond 1910 (Public Domain) |
| **German** | `SCH` | Schlachter 1951 (Public Domain) |
| **Japanese** | `JPKJV` | Colloquial Japanese (Public Domain) |
| **Portuguese**| `ARC09` | Almeida (Public Domain) |
| **Russian** | `rus_syn`| Synodal (Public Domain) |
| **Spanish** | `spa_r09`| Reina Valera 1909 (Public Domain) |
| **Thai** | `tha_kjv`| Thai KJV (Public Domain) |
| **Vietnamese**| `vie_1934`| 1934 Version (Public Domain) |

## Actionable Steps
1.  **Replace English NIV**: Change source to `BOLLS` ID `WEB` (World English Bible).
    *   *Note*: `YLT` is already a fallback, but `WEB` is much more readable for modern users.
2.  **Verify Hindi**: Explicitly switch to an `IRV` (Indian Revised Version) source that is confirmed CC-BY-SA, or use a very old version (1900s) if available.
3.  **Attribution**: If using CC-BY-SA content (like IRV or Open Bible Translations), ensure the App's "About" page includes the required attribution text and links to the license.

