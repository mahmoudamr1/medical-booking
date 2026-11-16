import pb, { User } from './pocketbase';

export const authService = {
  // Login
  async login(email: string, password: string) {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password);
      return authData;
    } catch (error) {
      throw error;
    }
  },

  // Register
  async register(email: string, password: string, name: string, role: 'patient' | 'doctor' = 'patient') {
    try {
      const userData = {
        email,
        password,
        passwordConfirm: password,
        name,
        role,
        is_active: true
      };
      
      const record = await pb.collection('users').create(userData);
      return record;
    } catch (error) {
      throw error;
    }
  },

  // Logout
  logout() {
    pb.authStore.clear();
  },

  // Get current user
  getCurrentUser(): User | null {
    return pb.authStore.model as User | null;
  },

  // Check if authenticated
  isAuthenticated(): boolean {
    return pb.authStore.isValid;
  },

  // Check user role
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }
};