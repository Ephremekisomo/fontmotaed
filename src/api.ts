export type LoginResponse = { user: { id: string; role: string } }
export type AuthMe = { user: { id: string; role: string }; profile?: { full_name: string; email: string; role: string; status: string } }
export function authMe() { return request<AuthMe>('/api/auth/me') }

const API_BASE = (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL?.replace(/\/$/, '') ?? ''

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options?.headers } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error ?? 'Erreur réseau')
  return body as T
}

export function login(email: string, password: string) { return request<LoginResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }) }
export function logout() { return request<void>('/api/auth/logout', { method: 'POST' }) }
export function health() { return request<{ ok: boolean; database: string }>('/api/health') }
export type ApiRider = { id: string; unique_code: string; qr_url?: string; first_name: string; last_name: string; driver_type: string; identification_number: string; plate_number: string | null; activity_zone: string | null; status: string; created_at: string; photo_url?: string | null }
export function listRiders(search = '', status = '') { return request<ApiRider[]>(`/api/riders?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`) }
export function createRider(data: { firstName: string; lastName: string; type: string; phone?: string; plate?: string; zone?: string }) { return request<ApiRider>('/api/riders', { method: 'POST', body: JSON.stringify(data) }) }
export type VerifiedRider = { first_name: string; last_name: string; middle_name: string | null; photo_url: string | null; driver_type: string; identification_number: string; plate_number: string | null; vehicle_brand: string | null; vehicle_model: string | null; activity_zone: string | null; status: string; updated_at: string }
export function verifyRider(uniqueCode: string) { return request<VerifiedRider>(`/api/verify/${encodeURIComponent(uniqueCode)}`) }
export type ApiUser = { id: string; full_name: string; email: string; role: string; status: string; created_at: string }
export function listUsers() { return request<ApiUser[]>('/api/users') }
export function createUser(data: { email: string; password: string; fullName: string; role: 'super_admin' | 'admin' }) { return request<ApiUser>('/api/users', { method: 'POST', body: JSON.stringify(data) }) }
export type StatsResponse = { riders: number; activeRiders: number; qrCodes: number; verifications: number }
export type ChartPoint = { day: string; count: number }
export function getStats() { return request<StatsResponse>('/api/stats') }
export function getChart() { return request<ChartPoint[]>('/api/stats/chart') }
export type RiderStatusPatch = { id: string; status: string }
export function patchRiderStatus(id: string, status: string) { return request<RiderStatusPatch>(`/api/riders/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }) }
export function deleteRider(id: string) { return request<void>(`/api/riders/${encodeURIComponent(id)}`, { method: 'DELETE' }) }
export function uploadRiderPhoto(id: string, photoUrl?: string) { return request<{ id: string; photo_url: string | null }>(`/api/riders/${encodeURIComponent(id)}/photo`, { method: 'POST', body: JSON.stringify({ photo_url: photoUrl }) }) }
