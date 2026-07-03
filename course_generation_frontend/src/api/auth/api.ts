import apiClient from '@/api/client'

export interface AuthMeResponse {
  authenticated: boolean
  temp_login: boolean
}

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  const { data } = await apiClient.get<AuthMeResponse>('/auth/me')
  return data
}

export async function login(password: string): Promise<void> {
  await apiClient.post('/login', { password })
}

export async function logout(): Promise<void> {
  await apiClient.post('/logout')
}
