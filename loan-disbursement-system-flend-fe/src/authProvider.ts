import { AuthProvider } from 'react-admin';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    
    if (response.ok) {
      const { access_token } = await response.json();
      localStorage.setItem('ra_token', access_token);
      
      // Decode JWT to extract user role
      try {
        const payload = JSON.parse(atob(access_token.split('.')[1]));
        if (payload.role) {
          localStorage.setItem('ra_role', payload.role);
        }
        if (payload.sub || payload.userId) {
          localStorage.setItem('ra_user_id', payload.sub || payload.userId);
        }
      } catch (e) {
        console.error('Failed to decode token:', e);
      }
      
      return Promise.resolve();
    }
    
    return Promise.reject(new Error('Invalid credentials'));
  },
  
  logout: () => {
    localStorage.removeItem('ra_token');
    localStorage.removeItem('ra_role');
    localStorage.removeItem('ra_user_id');
    return Promise.resolve();
  },
  
  checkAuth: () => {
    return localStorage.getItem('ra_token') 
      ? Promise.resolve() 
      : Promise.reject(new Error('Not authenticated'));
  },
  
  checkError: (error) => {
    const status = error.status;
    if (status === 401 || status === 403) {
      localStorage.removeItem('ra_token');
      localStorage.removeItem('ra_role');
      localStorage.removeItem('ra_user_id');
      return Promise.reject(new Error('Unauthorized'));
    }
    return Promise.resolve();
  },
  
  getPermissions: () => {
    const role = localStorage.getItem('ra_role');
    return role ? Promise.resolve(role) : Promise.reject(new Error('No role found'));
  },
  
  getIdentity: () => {
    const token = localStorage.getItem('ra_token');
    if (!token) {
      return Promise.reject(new Error('Not authenticated'));
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Promise.resolve({
        id: payload.sub || payload.userId,
        fullName: payload.username || 'User',
        avatar: undefined,
      });
    } catch (e) {
      return Promise.reject(new Error('Invalid token'));
    }
  },
};

export default authProvider;