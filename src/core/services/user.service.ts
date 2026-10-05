import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { User, UserSchema } from '../domain/user.schema';
import { db } from './firebase';

export const UserService = {
  getUserProfile: async (userId: string): Promise<User> => {
    const snapshot = await getDoc(doc(db, 'users', userId));
    if (!snapshot.exists()) {
      throw new Error(`Perfil de usuário não encontrado: ${userId}`);
    }
    return UserSchema.parse({ id: snapshot.id, ...snapshot.data() });
  },

  updateUserName: async (userId: string, name: string): Promise<User> => {
    const validatedName = UserSchema.shape.name.parse(name);
    const userReference = doc(db, 'users', userId);
    await updateDoc(userReference, { name: validatedName });
    const snapshot = await getDoc(userReference);
    if (!snapshot.exists()) {
      throw new Error(`Perfil de usuário não encontrado após atualização: ${userId}`);
    }
    return UserSchema.parse({ id: snapshot.id, ...snapshot.data() });
  },
};
