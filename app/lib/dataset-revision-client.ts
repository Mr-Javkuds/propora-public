export function clearClientAccountState() {
  ["proporaWizardData", "proporaAreaSearch", "proporaCompareIds", "compareProperties", "proporaDraftAccount", "selectedBookingProperty", "selectedProperty", "proporaMlRecommendations", "proporaRentalApplication", "proporaSurveyDraft", "proporaSurveyRequest", "proporaSavedProperties", "proporaDemoLoggedIn"].forEach(key => localStorage.removeItem(key));
  sessionStorage.removeItem("proporaPendingFavorite");
  sessionStorage.removeItem("proporaGuestDraft");
}

export function syncDatasetRevision(revision: string | undefined) {
  if (!revision || localStorage.getItem("proporaDatasetRevision") === revision) return;
  clearClientAccountState();
  localStorage.setItem("proporaDatasetRevision", revision);
}
