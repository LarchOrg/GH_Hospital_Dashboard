import { useState, useEffect, useMemo } from 'react';

const PATIENT_PAGE_DURATION_MS = 10000;
const SAFETY_SCREEN_DURATION_MS = 3000;
const IMAGE_SCREEN_DURATION_MS = 6000;

// How many patient cards are shown per rotation page. Raised from 6 to 10
// (a 5x2 grid) so a 52" TV, viewed from further away, surfaces more of the
// waiting area at a glance before rotating to the next page.
export const PATIENTS_PER_PAGE = 10;

/**
 * Drives the public TV dashboard's rotation between successive pages of
 * patient cards and (if any have been uploaded) full-screen uploaded
 * images:
 *
 *   patients 1 -> image 1 -> patients 2 -> image 2 -> ...
 *
 * The safety-awareness message interstitial that used to sit between
 * patient pages and images is TEMPORARILY DISABLED (commented out, not
 * removed) - see the "SAFETY SCREEN - DISABLED" comment blocks below for
 * exactly what to uncomment to bring it back:
 *
 *   patients 1 -> safety 1 -> image 1 -> patients 2 -> safety 2 -> image 2 -> ...
 *
 * Each full lap through the rotation advances one shared cycle counter, so
 * (once safety is re-enabled) the Nth safety message and the Nth uploaded
 * image always appear together - if there are fewer images than safety
 * messages, the images simply cycle back around. With safety disabled,
 * that same counter just cycles the images each time a patient page is
 * shown. If no images have been uploaded, the image phase is skipped
 * entirely and only patient pages are shown, exactly as before either
 * feature existed.
 *
 * @param {Array} patients full list of dashboard-safe patient records
 * @param {number} safetyScreenCount number of safety screens available (currently unused while disabled)
 * @param {number} imageCount number of uploaded dashboard images available
 */
export function useDashboardRotation(patients, safetyScreenCount, imageCount = 0) {
  const pages = useMemo(() => {
    if (!patients || patients.length === 0) return [[]];
    const chunks = [];
    for (let i = 0; i < patients.length; i += PATIENTS_PER_PAGE) {
      chunks.push(patients.slice(i, i + PATIENTS_PER_PAGE));
    }
    return chunks;
  }, [patients]);

  const [pageIndex, setPageIndex] = useState(0);
  // One shared counter driving both the safety-screen and uploaded-image
  // index, so the two stay paired up once safety is re-enabled (see above).
  const [cycleCount, setCycleCount] = useState(0);
  const [phase, setPhase] = useState('patients'); // 'patients' | 'image' (add 'safety' back in to re-enable it)

  useEffect(() => {
    // Reset to a safe index if the page count shrinks (e.g. after refresh).
    if (pageIndex >= pages.length) {
      setPageIndex(0);
    }
  }, [pages.length, pageIndex]);

  useEffect(() => {
    const duration = phase === 'image' ? IMAGE_SCREEN_DURATION_MS : PATIENT_PAGE_DURATION_MS;
    // --- SAFETY SCREEN - DISABLED ---
    // Restore this to bring the safety-screen duration back:
    //   const duration =
    //     phase === 'safety'
    //       ? SAFETY_SCREEN_DURATION_MS
    //       : phase === 'image'
    //         ? IMAGE_SCREEN_DURATION_MS
    //         : PATIENT_PAGE_DURATION_MS;

    const timer = setTimeout(() => {
      if (phase === 'patients') {
        // --- SAFETY SCREEN - DISABLED ---
        // Restore this to route through the safety screen again:
        //   setPhase(safetyScreenCount > 0 ? 'safety' : (imageCount > 0 ? 'image' : 'patients-advance'));
        setPhase(imageCount > 0 ? 'image' : 'patients-advance');
        return;
      }

      // --- SAFETY SCREEN - DISABLED ---
      // Restore this branch to transition from safety into the image phase:
      //   if (phase === 'safety') {
      //     setPhase(imageCount > 0 ? 'image' : 'patients-advance');
      //     return;
      //   }

      // phase === 'image' - fall through to advancing to the next patient page.
      setPhase('patients-advance');
    }, duration);

    return () => clearTimeout(timer);
  }, [phase, imageCount, safetyScreenCount]);

  // A separate, zero-delay effect performs the actual page/cycle advance so
  // the transition to 'patients-advance' above and the state updates here
  // don't race within the same render.
  useEffect(() => {
    if (phase !== 'patients-advance') return;

    setPageIndex((prev) => (pages.length > 0 ? (prev + 1) % pages.length : 0));
    setCycleCount((prev) => prev + 1);
    setPhase('patients');
  }, [phase, pages.length]);

  const currentSafetyIndex = safetyScreenCount > 0 ? cycleCount % safetyScreenCount : 0;
  const currentImageIndex = imageCount > 0 ? cycleCount % imageCount : 0;

  return {
    currentPagePatients: pages[pageIndex] || [],
    currentSafetyIndex,
    currentImageIndex,
    showingSafety: false, // phase === 'safety', // <- restore this to re-enable the safety screen
    showingImage: phase === 'image',
    totalPages: pages.length
  };
}
