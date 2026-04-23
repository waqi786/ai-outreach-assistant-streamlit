export interface AuthUser {
  id: string;
  email: string;
  hasApiKey: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  register: (payload: LoginPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser>;
  setUser: (user: AuthUser | null) => void;
}

export interface ChatSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  systemPrompt: string;
  createdAt: string;
  updatedAt: string;
  chats: ChatSummary[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  chatId: string;
}

export interface Chat {
  id: string;
  title: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatDetail extends Chat {
  project: {
    id: string;
    name: string;
    systemPrompt: string;
    userId: string;
  };
  messages: Message[];
}
