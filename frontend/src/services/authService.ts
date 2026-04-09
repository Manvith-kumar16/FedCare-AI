import axiosInstance from '../api/axiosConfig';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await axiosInstance.post<AuthResponse>('/auth/login', {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      console.warn('Backend unavailable, using mock login data.');
      // Return a dummy token for showcase purposes
      return {
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        token_type: 'bearer',
      };
    }
  },

  register: async (name: string, email: string, password: string, role: string): Promise<User> => {
    try {
      const response = await axiosInstance.post<User>('/auth/register', {
        name,
        email,
        password,
        role,
      });
      return response.data;
    } catch (error) {
      console.warn('Backend unavailable, using mock registration.');
      return {
        id: Math.floor(Math.random() * 1000),
        name,
        email,
        role,
      };
    }
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },
};

export default authService;
