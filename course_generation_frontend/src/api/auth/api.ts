import apiClient from '@/api/client'

export interface TempUserInfo {
  id: number
  username: string
}

export interface AuthSessionResponse {
  authenticated: boolean
  temp_user_auth: boolean
  user: TempUserInfo | null
}

export async function fetchAuthSession(): Promise<AuthSessionResponse> {
  const { data } = await apiClient.get<AuthSessionResponse>('/auth/session')
  return data
}

export async function login(username: string, password: string): Promise<void> {
  await apiClient.post('/login', { username, password })
}

export async function logout(): Promise<void> {
  await apiClient.post('/logout')
}
