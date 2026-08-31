export function shouldShowLoadingState({
  hasCache,
  hasLoadedOnce,
}: {
  hasCache: boolean;
  hasLoadedOnce: boolean;
}) {
  return !hasCache && !hasLoadedOnce;
}
