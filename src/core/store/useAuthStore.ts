import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { UserService } from '../services/user.service';
import type { User } from '../domain/user.schema';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // Ações
  login: (email: string, pass: string) => Promise<User>;
  logout: () => Promise<void>;
  clearError: () => void;
  initializeAuth: () => () => void; // Retorna função de unsubscribe
}

const TOKEN_STORAGE_KEY = 'auth_token';

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignora restrições locais de storage
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: getStoredToken(),
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email: string, pass: string): Promise<User> => {
    set({ isLoading: true, error: null });

    try {
      // 1. Autenticação no Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const firebaseUser = userCredential.user;

      // 2. Extração do Token JWT
      const token = await firebaseUser.getIdToken();

      // 3. Consulta do Perfil no Firestore
      let userProfile: User;
      try {
        userProfile = await UserService.getUserProfile(firebaseUser.uid);
      } catch (profileError) {
        // Fallback resiliente caso o documento no Firestore ainda não tenha sido populado
        userProfile = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || email.split('@')[0],
          email: firebaseUser.email || email,
          role: 'operador',
          ativo: true,
          mustChangePassword: false,
        };
      }

      // 4. Verificação de status do colaborador
      if (!userProfile.ativo) {
        await signOut(auth);
        setStoredToken(null);
        const errorMsg = 'Acesso bloqueado: usuário inativo no sistema. Contate o administrador mestre.';
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: errorMsg,
        });
        throw new Error(errorMsg);
      }

      // 5. Atualização de estado e persistência de token
      setStoredToken(token);
      set({
        user: userProfile,
        token,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        error: null,
      });

      return userProfile;
    } catch (err: unknown) {
      let friendlyMessage = 'Falha na autenticação. Verifique suas credenciais.';

      if (err instanceof Error) {
        const msg = err.message;
        if (
          msg.includes('auth/invalid-credential') ||
          msg.includes('auth/wrong-password') ||
          msg.includes('auth/user-not-found') ||
          msg.includes('auth/invalid-email')
        ) {
          friendlyMessage = 'E-mail corporativo ou senha incorretos.';
        } else if (msg.includes('auth/user-disabled')) {
          friendlyMessage = 'Usuário desativado pelo administrador.';
        } else if (msg.includes('auth/too-many-requests')) {
          friendlyMessage = 'Muitas tentativas malsucedidas. Aguarde alguns instantes antes de tentar novamente.';
        } else if (msg.includes('auth/network-request-failed')) {
          friendlyMessage = 'Falha de conexão com o servidor. Verifique sua rede.';
        } else if (msg.includes('Acesso bloqueado')) {
          friendlyMessage = msg;
        }
      }

      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: friendlyMessage,
      });

      throw new Error(friendlyMessage);
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await signOut(auth);
    } catch {
      // Ignora erro de signOut se a conexão falhar
    } finally {
      setStoredToken(null);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  initializeAuth: () => {
    // Evita registrar múltiplos listeners se já inicializado
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (!firebaseUser) {
        setStoredToken(null);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isInitialized: true,
          isLoading: false,
        });
        return;
      }

      try {
        const token = await firebaseUser.getIdToken();
        let userProfile: User;
        try {
          userProfile = await UserService.getUserProfile(firebaseUser.uid);
        } catch {
          userProfile = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Colaborador'),
            email: firebaseUser.email || '',
            role: 'operador',
            ativo: true,
            mustChangePassword: false,
          };
        }

        if (!userProfile.ativo) {
          await signOut(auth);
          setStoredToken(null);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isInitialized: true,
            isLoading: false,
          });
          return;
        }

        setStoredToken(token);
        set({
          user: userProfile,
          token,
          isAuthenticated: true,
          isInitialized: true,
          isLoading: false,
        });
      } catch {
        setStoredToken(null);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isInitialized: true,
          isLoading: false,
        });
      }
    });

    return unsubscribe;
  },
}));
