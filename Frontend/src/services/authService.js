import axios from 'axios';

// Base API URL pointing to Express backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/auth';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('streamcloud_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authService = {
  /**
   * Register: Full Name + Email -> send OTP
   * POST /api/auth/register
   */
  async register(name, email) {
    const response = await apiClient.post('/register', { name, email });
    return response.data;
  },

  /**
   * Login: Email -> send OTP
   * POST /api/auth/login
   */
  async login(email) {
    const response = await apiClient.post('/login', { email });
    return response.data;
  },

  /**
   * Resend OTP functionality
   * POST /api/auth/send-otp
   */
  async sendOtp(email, type = 'login', name = '') {
    const response = await apiClient.post('/send-otp', { email, type, name });
    return response.data;
  },

  /**
   * Verify 6-digit OTP -> obtain JWT token & user profile
   * POST /api/auth/verify-otp
   */
  async verifyOtp(email, otp, type = 'login') {
    const response = await apiClient.post('/verify-otp', { email, otp, type });
    if (response.data?.token) {
      localStorage.setItem('streamcloud_token', response.data.token);
      localStorage.setItem('streamcloud_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /**
   * Get currently authenticated user profile
   * GET /api/auth/me
   */
  async getMe() {
    const response = await apiClient.get('/me');
    return response.data;
  },

  /**
   * Sign out and clear stored session
   */
  logout() {
    localStorage.removeItem('streamcloud_token');
    localStorage.removeItem('streamcloud_user');
  },

  /**
   * Get stored JWT token
   */
  getToken() {
    return localStorage.getItem('streamcloud_token');
  },

  /**
   * Get stored user object
   */
  getUser() {
    try {
      const saved = localStorage.getItem('streamcloud_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },
};

export default authService;
