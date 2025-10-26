export interface GeneratedFile {
  filename: string;
  content: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface SavedExtension {
  id: string;
  name: string;
  description: string;
  savedAt: string;
  files: GeneratedFile[];
  messages: Message[];
}

export interface User {
  id: string; // Google's 'sub' claim
  name: string;
  email: string;
  picture: string;
}
