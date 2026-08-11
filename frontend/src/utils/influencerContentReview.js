const INFLUENCER_STEP_SIX_STORAGE_KEY = "grm_influencer_register_step_6";


export const initialInfluencerContentReviewForm = {
  applicationId: "",
};

export function saveInfluencerContentReviewDraftLocal(values, storage = window.localStorage) {
  const payload = {
    values,
    savedAt: new Date().toISOString(),
  };
  storage.setItem(INFLUENCER_STEP_SIX_STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

export function loadInfluencerContentReviewDraft(storage = window.localStorage) {
  const raw = storage.getItem(INFLUENCER_STEP_SIX_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function validateContentReview(values = {}, files = {}, existingDocuments = []) {
  const errors = {};
  const sampleCount = (files.sampleContentFiles || []).length + existingDocuments.filter((item) => item.documentType === "sample_content").length;
  const identityCount = (files.identityDocumentFiles || []).length + existingDocuments.filter((item) => item.documentType === "identity_document").length;
  if (sampleCount < 3) errors.sampleContent = "Upload at least 3 sample content files.";
  if (identityCount < 1) errors.identityDocuments = "Upload at least one identity document.";
  return errors;
}
