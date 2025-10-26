import { GoogleGenAI, Type } from "@google/genai";
import type { GeneratedFile, Message } from '../types';

// Initialize with the environment variable as a fallback.
let ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Updates the Gemini API client with a new API key.
 * This is used if the user provides their own key in the settings.
 * @param apiKey The user-provided API key.
 */
export function setApiKey(apiKey: string | null) {
    if (apiKey && apiKey.trim() !== '') {
        try {
            ai = new GoogleGenAI({ apiKey });
        } catch (e) {
            console.error("Failed to initialize GoogleGenAI with user-provided key:", e);
            // Revert to default if the new key is invalid
            ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        }
    } else {
        // Fallback to the environment key if the user-provided one is null or empty.
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
}


const systemInstruction = `You are an expert AI specializing in creating Google Chrome extensions.
Your goal is to help users build a Chrome extension by generating the necessary code based on their descriptions.

- You must always generate a complete, working Chrome extension.
- Strive to create visually appealing (beautiful) and highly functional (powerful) extensions. The UI should be clean, modern, and intuitive.
- You MUST create a separate \`style.css\` file for all but the most trivial of styling. Link it in your \`popup.html\`. DO NOT use inline styles.
- When modifying an existing extension, preserve the existing features and UI unless specifically asked to change them.
- Always include a \`manifest.json\`, a \`popup.html\`, and a \`popup.js\`. You can also include other files like content scripts, or background scripts if necessary.
- Do not add comments explaining the code in the code blocks themselves.
- Do not skip any file. You must provide the full code for every file.
- The user's request may be a new request or a modification of a previous one. You will be given the conversation history. You must generate all the files for the extension based on the latest state of the conversation.

Your output MUST be a single JSON object. This object should contain a single key, "files", which is an array of objects. Each object in the array represents a file and must have two keys: "filename" (a string) and "content" (a string with the full file content).`;


/**
 * Generates the code for a Chrome extension based on a conversation history.
 * @param messages The history of messages between the user and the assistant.
 * @returns A promise that resolves to an array of generated files.
 */
export async function generateExtensionCode(messages: Message[]): Promise<GeneratedFile[]> {
    const model = 'gemini-2.5-pro';

    // The entire conversation is passed as context.
    const conversationHistory = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: conversationHistory,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        files: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    filename: { type: Type.STRING },
                                    content: { type: Type.STRING }
                                },
                                required: ['filename', 'content']
                            }
                        }
                    },
                    required: ['files']
                }
            }
        });

        const responseText = response.text;
        if (!responseText) {
            throw new Error("Received an empty response from the AI. Please try again.");
        }

        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.files && Array.isArray(jsonResponse.files)) {
             // Validate that it fits GeneratedFile[]
             const files: GeneratedFile[] = jsonResponse.files.filter(
                (f: any) => f && typeof f.filename === 'string' && typeof f.content === 'string'
            );
            if (files.length === 0) {
                 throw new Error("The AI did not return any files. Please try rephrasing your request.");
            }
            return files;
        } else {
            throw new Error("Invalid JSON format from AI. Expected an object with a 'files' array.");
        }
    } catch (e) {
        console.error("Error generating extension code:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while contacting the AI.";
        // Re-throw a more user-friendly error
        throw new Error(`Failed to generate code. ${errorMessage}`);
    }
}