export function getAuthHeader() {
  const token = localStorage.getItem('token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function getCurrentUser() {
  // returns { id, role } from token or from stored user object
  try {
    const provider = localStorage.getItem('provider');
    const seeker = localStorage.getItem('seeker');
    if (provider) {
      const p = JSON.parse(provider);
      return { id: p._id || p.id, role: 'provider' };
    }
    if (seeker) {
      const s = JSON.parse(seeker);
      return { id: s._id || s.id, role: 'seeker' };
    }
  } catch (e) {}
  return null;
}
