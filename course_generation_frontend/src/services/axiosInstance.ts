import axios from 'axios'
import { API_BASE_URL } from '@/config/api'

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

axiosInstance.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error),
)

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ??
      error.response?.data?.message ??
      error.message ??
      'An unexpected error occurred'
    return Promise.reject(new Error(message))
  },
)

export default axiosInstance
