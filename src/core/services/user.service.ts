import { api } from '../api/client';
import { User, UserSchema } from '../domain/user.schema';

export const UserService = {
  getUserProfile: async (userId: string): Promise<User> => {
    const response = await api.get(`/users/${userId}`);
    // Validação em tempo de execução com Zod
    return UserSchema.parse(response.data);
  },

  updateUserName: async (userId: string, name: string): Promise<User> => {
    const response = await api.patch(`/users/${userId}`, { name });
    return UserSchema.parse(response.data);
  },
};
