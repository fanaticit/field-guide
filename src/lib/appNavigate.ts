// Lets non-React code (e.g. the auth store) navigate using the router.
// The root component registers React Router's navigate function here.
type NavigateFn = (to: string, options?: { replace?: boolean }) => void;

let navigateFn: NavigateFn | null = null;

export function setAppNavigate(fn: NavigateFn | null) {
  navigateFn = fn;
}

export function appNavigate(to: string, options?: { replace?: boolean }) {
  if (navigateFn) navigateFn(to, options);
  else if (typeof window !== 'undefined') window.location.assign(to);
}
