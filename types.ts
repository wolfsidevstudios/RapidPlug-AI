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
