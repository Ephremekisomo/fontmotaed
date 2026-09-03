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

export type IdentificationSheetPayload = {
  owner: {
    first_name: string; last_name: string; middle_name: string | null;
    gender: 'M' | 'F' | 'AUTRE' | null;
    date_of_birth: string | null; place_of_birth: string | null;
    phone: string | null;
    commune: string; chefferie_sector: string | null; neighborhood_group: string | null; avenue_village: string | null;
    photo: string | null;
  };
  vehicle: {
    registration_number: string; type: 'MOTO' | 'TRICYCLE';
    brand: string | null; chassis_number: string | null; engine_number: string | null; color: string | null;
    usage: 'TAXI_TRANSPORT_PUBLIC' | 'PERSONNEL' | 'AUTRE';
  };
  driver: {
    first_name: string; last_name: string; middle_name: string | null;
    gender: 'M' | 'F' | 'AUTRE' | null;
    date_of_birth: string | null; place_of_birth: string | null;
    phone: string | null;
    father_name: string | null; mother_name: string | null;
    marital_status: 'CELIBATAIRE' | 'MARIE' | 'DIVORCE' | 'VEUF' | null;
    origin: string | null;
    commune: string; chefferie_sector: string | null; neighborhood_group: string | null; avenue_village: string | null;
    photo: string | null;
  };
  administrative: {
    issue_date: string | null; issue_location: string | null;
    issued_by: string; status: 'ACTIF' | 'SUSPENDU' | 'EXPIRE' | 'ARCHIVE';
  };
  identification_number: string;
  public_id: string;
}

export type IdentificationVerifyResponse = { success: true; identification: IdentificationSheetPayload } | { success: false; error: string }
export function verifyIdentification(token: string) { return request<IdentificationVerifyResponse>(`/api/identifications/verify/${encodeURIComponent(token)}`) }

export type ApiIdentificationListItem = {
  id: string;
  public_id: string;
  identification_number: string;
  qr_token: string;
  status: 'ACTIF' | 'SUSPENDU' | 'EXPIRE' | 'ARCHIVE';
  issue_date: string;
  issue_location: string;
  driver_first_name: string;
  driver_last_name: string;
  registration_number: string;
  owner_first_name: string;
  owner_last_name: string;
}
export function listIdentifications() { return request<ApiIdentificationListItem[]>('/api/identifications') }

export type CreateIdentificationInput = {
  owner: {
    first_name: string; last_name: string; middle_name?: string;
    date_of_birth?: string; place_of_birth?: string;
    gender?: 'M' | 'F' | 'AUTRE';
    phone?: string; guardian_name?: string; guardian_phone?: string;
    commune: string; chefferie_sector?: string; neighborhood_group?: string; avenue_village?: string;
    photo?: string;
  };
  vehicle: {
    registration_number: string;
    vehicle_type: 'MOTO' | 'TRICYCLE';
    brand?: string; chassis_number?: string; engine_number?: string; color?: string;
    usage: 'TAXI_TRANSPORT_PUBLIC' | 'PERSONNEL' | 'AUTRE';
  };
  driver: {
    first_name: string; last_name: string; middle_name?: string;
    date_of_birth?: string; place_of_birth?: string;
    gender?: 'M' | 'F' | 'AUTRE';
    phone?: string; father_name?: string; mother_name?: string;
    marital_status?: 'CELIBATAIRE' | 'MARIE' | 'DIVORCE' | 'VEUF';
    commune: string; chefferie_sector?: string; neighborhood_group?: string; avenue_village?: string;
    origin?: string; photo?: string;
  };
  issue_location: string;
  status?: 'ACTIF' | 'SUSPENDU' | 'EXPIRE' | 'ARCHIVE';
}
export type CreateIdentificationResponse = {
  id: string;
  public_id: string;
  identification_number: string;
  qr_token: string;
  qr_code_url: string;
  status: string;
  issue_date: string;
  issue_location: string;
  owner: { first_name: string; last_name: string; photo?: string | null };
  vehicle: { registration_number: string; vehicle_type: 'MOTO' | 'TRICYCLE'; brand?: string | null };
  driver: { first_name: string; last_name: string; photo?: string | null };
}
export function createIdentification(data: CreateIdentificationInput) { return request<CreateIdentificationResponse>('/api/identifications', { method: 'POST', body: JSON.stringify(data) }) }
export function deleteIdentification(id: string) { return request<void>(`/api/identifications/${encodeURIComponent(id)}`, { method: 'DELETE' }) }

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
