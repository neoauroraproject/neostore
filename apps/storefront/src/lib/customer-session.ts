export const CUSTOMER_SESSION_KEY = 'ns_customer_session';
export const LEGACY_CUSTOMER_SESSION_KEY = 'neostore.customer.session';

export function getCustomerSession(): string {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem(CUSTOMER_SESSION_KEY) ||
    localStorage.getItem(LEGACY_CUSTOMER_SESSION_KEY) ||
    ''
  );
}

export function setCustomerSession(token: string) {
  localStorage.setItem(CUSTOMER_SESSION_KEY, token);
  localStorage.setItem(LEGACY_CUSTOMER_SESSION_KEY, token);
}

export function clearCustomerSession() {
  localStorage.removeItem(CUSTOMER_SESSION_KEY);
  localStorage.removeItem(LEGACY_CUSTOMER_SESSION_KEY);
}
