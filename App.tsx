import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { generateExtensionCode, setApiKey } from './services/geminiService';
import { 
    SparklesIcon, FileIcon, DownloadIcon, CopyIcon, ClipboardCheckIcon, EyeIcon, 
    CodeBracketIcon, ArrowUpIcon, InformationCircleIcon, MoonIcon, ClipboardTextIcon, 
    SwatchIcon, ClockIcon, Squares2X2Icon, UploadCloudIcon, ShieldCheckIcon,
    BookmarkIcon, FolderIcon, TrashIcon, HomeIcon, AiSettingsSparkIcon, GoogleIcon
} from './components/icons';
import { templates } from './templates';
// FIX: Import Message and ExtensionTemplate types for type safety.
// FIX: Import SavedExtension to properly type the saved extensions state.
import type { Message, SavedExtension } from './types';
import type { ExtensionTemplate } from './templates';

// FIX: Declare global window properties to resolve TypeScript errors for JSZip and google.
declare global {
    interface Window {
        JSZip: any;
        google: any;
    }
}

const getRoute = () => {
    const hash = window.location.hash;
    if (hash === '#/builder') return '/builder';
    if (hash === '#/settings') return '/settings';
    if (hash === '#/profile') return '/profile';
    return '/';
}

const GOOGLE_CLIENT_ID = "127898517822-gdv986g9281c36jlakeisg63ukp3f438.apps.googleusercontent.com";


// --- Utility Functions ---
function decodeJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Failed to decode JWT", e);
        return null;
    }
}


// --- Icon Mapping for Templates ---
const ICONS = {
  moon: MoonIcon,
  clipboard: ClipboardTextIcon,
  palette: SwatchIcon,
  timer: ClockIcon,
  clock: ClockIcon,
  squares: Squares2X2Icon,
};


// --- Sub Components ---
const UserProfileCard = ({ user }) => (
    <a href="#/profile" className="flex items-center gap-2 p-1 pr-3 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors">
        <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
        <span className="font-medium text-sm text-white truncate">{user.name.split(' ')[0]}</span>
    </a>
);

const HomeHeader = ({ activeTab, onTabChange, onGoHome, user, onLoginClick }) => {
  
  const TabButton = ({ tab, label }) => (
    <button 
      onClick={() => onTabChange(tab)} 
      className={`text-base font-medium transition-colors whitespace-nowrap ${
        activeTab === tab ? 'text-white' : 'text-gray-400 hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  return (
    <header className="flex-shrink-0 p-4 w-full flex items-center justify-between">
      <div className="flex-1 flex items-center gap-4">
        <a href="#/settings" className="p-2 text-white" aria-label="Settings">
            <AiSettingsSparkIcon className="w-6 h-6" />
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); onGoHome(); }} className="text-xl font-bold text-white">
          RapidPlug AI
        </a>
      </div>

      <nav className="flex-1 flex justify-center items-center gap-8">
        <TabButton tab="templates" label="Templates" />
        <TabButton tab="my-extensions" label="My Extensions" />
        <TabButton tab="instructions" label="Instructions" />
        <TabButton tab="publishing" label="Publish Guide" />
      </nav>

      <div className="flex-1 flex justify-end">
        {user ? (
          <UserProfileCard user={user} />
        ) : (
          <button onClick={onLoginClick} className="px-5 py-2 bg-gray-200 text-gray-900 font-semibold rounded-full hover:bg-white transition-colors">
            Login
          </button>
        )}
      </div>
    </header>
  )
};

const BuilderHeader = ({ onGoHome, user, onLoginClick }) => (
   <header className="flex-shrink-0 p-4 w-full flex items-center justify-between">
       <div className="flex flex-1 items-center gap-4">
            <a href="#/settings" className="p-2 text-white" aria-label="Settings">
                <AiSettingsSparkIcon className="w-6 h-6" />
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); onGoHome(); }} className="text-xl font-bold text-white">
                RapidPlug AI
            </a>
       </div>
        <div className="flex flex-1 justify-end items-center gap-4">
             {user ? (
              <UserProfileCard user={user} />
            ) : (
              <button onClick={onLoginClick} className="px-5 py-2 bg-gray-200 text-gray-900 font-semibold rounded-full hover:bg-white transition-colors">
                Login
              </button>
            )}
            <button onClick={onGoHome} className="p-2 text-gray-400 hover:text-white transition-colors duration-200">
                <HomeIcon className="w-6 h-6" />
            </button>
       </div>
    </header>
);

// FIX: Explicitly define component props to prevent type errors when using it in a list with a 'key' prop.
// FIX: Explicitly type component with React.FC to correctly handle the 'key' prop in lists.
const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
    const isUser = message.role === 'user';
    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-prose p-3 rounded-lg ${isUser ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
        </div>
    );
};


const ChatPanel = ({ messages, isLoading, onSendMessage }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isLoading]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSendMessage(input);
            setInput('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-800 border-r border-gray-700">
            <div className="flex-1 p-4 overflow-y-scroll scrollbar-thin">
                {messages.map((msg, index) => <ChatMessage key={index} message={msg} />)}
                {isLoading && (
                    <div className="flex justify-start mb-4">
                        <div className="max-w-prose p-3 rounded-lg bg-gray-700 text-gray-200 flex items-center gap-2">
                             <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm">Generating...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-700">
                <form onSubmit={handleSubmit}>
                     <div className="flex items-end gap-2 p-3 bg-gray-700 border border-gray-600 rounded-2xl focus-within:ring-2 focus-within:ring-purple-500 transition-all duration-200 shadow-lg">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                            placeholder="e.g., Change the popup background to blue"
                            className="w-full bg-transparent border-none focus:ring-0 text-gray-100 placeholder-gray-400 resize-none p-0"
                            rows={2}
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading || !input.trim()} className="p-2.5 bg-white text-black rounded-full hover:bg-gray-200 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                            <ArrowUpIcon className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const FileTree = ({ files, selectedFilename, onSelectFile }) => (
    <div className="bg-gray-800 p-3 rounded-lg overflow-y-auto scrollbar-thin h-full">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">Files</h3>
        <ul className="space-y-1">
            {files.map((file) => (
                <li key={file.filename}>
                    <button onClick={() => onSelectFile(file.filename)} className={`w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors duration-150 ${selectedFilename === file.filename ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                        <FileIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{file.filename}</span>
                    </button>
                </li>
            ))}
        </ul>
    </div>
);

const CodeViewer = ({ file }) => {
    const [copied, setCopied] = useState(false);
    useEffect(() => { setCopied(false); }, [file]);
    const handleCopy = () => {
        if (!file) return;
        navigator.clipboard.writeText(file.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!file) return <div className="flex-1 bg-gray-900 rounded-lg flex items-center justify-center text-gray-500">Select a file to view</div>;
    
    return (
        <div className="flex-1 flex flex-col bg-gray-800 rounded-lg overflow-hidden h-full">
            <div className="flex items-center justify-between bg-gray-900 p-2 border-b border-gray-700">
                <p className="font-mono text-sm text-gray-300">{file.filename}</p>
                <button onClick={handleCopy} className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-sm text-gray-200 transition-colors duration-150">
                    {copied ? <ClipboardCheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
            </div>
            <div className="flex-1 overflow-auto scrollbar-thin">
                <pre className="p-4 text-sm"><code className="language-javascript">{file.content}</code></pre>
            </div>
        </div>
    );
};

const LivePreview = ({ files }) => {
    const previewDoc = useMemo(() => {
        const htmlFile = files.find(f => f.filename.endsWith('.html'));
        if (!htmlFile) return `<body style="background-color: #111827; color: #d1d5db; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center;"><div><h2>Preview Not Available</h2><p>This extension runs on web pages, not in a popup. Follow the instructions to test it.</p></div></body>`;
        let htmlContent = htmlFile.content;
        const scriptRegex = /<script\s+[^>]*?src="([^"]+)"[^>]*?><\/script>/gi;
        htmlContent = htmlContent.replace(scriptRegex, (match, src) => {
            const scriptFile = files.find(f => f.filename === src || `./${f.filename}` === src);
            return scriptFile ? `<script>${scriptFile.content}<\/script>` : '<!-- script not found -->';
        });
        const styleRegex = /<link\s+[^>]*?href="([^"]+)"[^>]*?rel="stylesheet"[^>]*?>/gi;
        htmlContent = htmlContent.replace(styleRegex, (match, href) => {
            const styleFile = files.find(f => f.filename === href || `./${f.filename}` === href);
            return styleFile ? `<style>${styleFile.content}<\/style>` : '<!-- stylesheet not found -->';
        });
        return htmlContent;
    }, [files]);

    return (
        <div className="flex-1 bg-white rounded-lg overflow-hidden border-4 border-gray-700">
            <iframe srcDoc={previewDoc} title="Live Preview" className="w-full h-full border-0" sandbox="allow-scripts allow-modals allow-forms" />
        </div>
    );
};


const InstructionsPanel = ({ permissions }) => (
    <div className="p-6 text-gray-300 bg-gray-800 rounded-lg h-full overflow-y-auto scrollbar-thin">
        <h3 className="text-xl font-bold text-white mb-4">How to Test Your Chrome Extension</h3>
        <div className="space-y-4 text-sm">
            <p>Follow these steps to load your generated extension in Google Chrome:</p>
            <ol className="list-decimal list-inside space-y-3 pl-2">
                <li><strong>Download the Code:</strong> Click the "Download .zip" button to save the extension files to your computer.</li>
                <li><strong>Unzip the File:</strong> Extract the contents of the downloaded .zip file into a dedicated folder. Remember where you save it.</li>
                <li><strong>Open Chrome Extensions:</strong> Open a new tab in Chrome and navigate to <code className="bg-gray-700 text-purple-300 px-1.5 py-0.5 rounded">chrome://extensions</code>.</li>
                <li><strong>Enable Developer Mode:</strong> In the top-right corner of the Extensions page, find the "Developer mode" toggle and switch it on.</li>
                <li><strong>Load Unpacked:</strong> A new set of buttons will appear. Click on "Load unpacked".</li>
                <li><strong>Select Your Folder:</strong> A file selection dialog will open. Navigate to and select the folder where you unzipped your extension files.</li>
                <li><strong>Done!</strong> Your extension should now appear in your list of extensions and be active in your browser. You can test its popup by clicking its icon in the Chrome toolbar.</li>
            </ol>
        </div>

        {permissions.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-700">
                <h4 className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
                    <ShieldCheckIcon className="w-6 h-6 text-green-400" />
                    <span>Required Permissions</span>
                </h4>
                <p className="text-sm text-gray-400 mb-3">
                    This extension requires the following permissions. Chrome may ask you to approve them when you load or enable the extension.
                </p>
                <div className="flex flex-wrap gap-2">
                    {permissions.map(p => (
                        <code key={p} className="bg-gray-700 text-purple-300 px-2 py-1 rounded text-sm font-mono">
                            {p}
                        </code>
                    ))}
                </div>
            </div>
        )}

        <p className={`pt-4 ${permissions.length > 0 ? 'mt-6 border-t border-gray-700' : 'mt-4 border-t border-gray-700'}`}>To see changes after asking the AI to modify the code, you'll need to download the new .zip file, replace the old files, and then click the "reload" icon on your extension's card in the <code className="bg-gray-700 text-purple-300 px-1.5 py-0.5 rounded">chrome://extensions</code> page.</p>
    </div>
);


const PublishingGuidePanel = () => (
    <div className="p-6 text-gray-300 bg-gray-800 rounded-lg h-full overflow-y-auto scrollbar-thin">
        <h3 className="text-xl font-bold text-white mb-4">How to Publish to the Chrome Web Store</h3>
        <div className="space-y-6 text-sm">
            <p>Publishing your extension makes it available to millions of users. While this app can't publish for you (for security reasons), this guide will walk you through the official process.</p>
            <div className="p-4 bg-gray-900/50 rounded-lg border border-yellow-500/30">
                <p className="font-semibold text-yellow-300">Important Note:</p>
                <p className="text-yellow-400">This is a manual process that you, the developer, must complete. It involves creating a developer account and providing information about your extension.</p>
            </div>
            <ol className="list-decimal list-inside space-y-4 pl-2">
                <li>
                    <strong>Prepare Your Files:</strong>
                    <p className="pl-4 text-gray-400">Click the "Download .zip" button. You will upload this exact file to the Chrome Web Store.</p>
                </li>
                <li>
                    <strong>Create a Developer Account:</strong>
                    <p className="pl-4 text-gray-400">
                        You need a Google Developer account. If you don't have one, you can register at the Chrome Developer Dashboard. There is a one-time <span className="font-semibold text-white">$5 registration fee</span>.
                        <br />
                        <a href="https://chrome.google.com/webstore/developer/dashboard" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Go to Developer Dashboard &rarr;</a>
                    </p>
                </li>
                 <li>
                    <strong>Create Your Store Listing:</strong>
                    <p className="pl-4 text-gray-400">In the dashboard, click "New Item". You'll need to fill out a form with details about your extension, including:</p>
                    <ul className="list-disc list-inside pl-8 mt-2 space-y-1 text-gray-400">
                        <li><span className="font-semibold text-white">Title & Description:</span> Make them clear and compelling.</li>
                        <li><span className="font-semibold text-white">Icons:</span> You must provide icons in specific sizes (e.g., 128x128, 48x48, 16x16).</li>
                        <li><span className="font-semibold text-white">Screenshots:</span> High-quality images showing your extension in action are required.</li>
                        <li><span className="font-semibold text-white">Privacy Policy:</span> You must provide a link to a privacy policy, especially if your extension handles user data.</li>
                    </ul>
                </li>
                 <li>
                    <strong>Justify Permissions:</strong>
                    <p className="pl-4 text-gray-400">For each permission listed in your `manifest.json` (like `storage` or `activeTab`), you must explain why your extension needs it. Be clear and concise. This is a critical part of the review.</p>
                </li>
                <li>
                    <strong>Submit for Review:</strong>
                    <p className="pl-4 text-gray-400">Once you've filled everything out and uploaded your .zip file, you can submit your extension for review. Google's team will check it against their policies. This can take a few days to a few weeks.</p>
                </li>
            </ol>
            <p className="pt-4 border-t border-gray-700">Congratulations! Once approved, your extension will be live on the Chrome Web Store.</p>
        </div>
    </div>
);

const OutputPanel = ({ files, onSave, user }) => {
    const [activeTab, setActiveTab] = useState('preview');
    const [selectedFilename, setSelectedFilename] = useState(null);
    const selectedFile = useMemo(() => files.find(f => f.filename === selectedFilename), [files, selectedFilename]);

    useEffect(() => {
        if (files.length > 0 && !files.some(f => f.filename === selectedFilename)) {
            setSelectedFilename(files[0].filename);
        }
    }, [files, selectedFilename]);

    const permissions = useMemo(() => {
        const manifestFile = files.find(f => f.filename === 'manifest.json');
        if (!manifestFile) return [];
        try {
            const manifest = JSON.parse(manifestFile.content);
            return (manifest.permissions && Array.isArray(manifest.permissions)) ? manifest.permissions : [];
        } catch (e) {
            console.error("Failed to parse manifest.json", e);
            return [];
        }
    }, [files]);


    const handleDownload = async () => {
        const JSZip = window.JSZip;
        if (!JSZip || files.length === 0) return;
        const zip = new JSZip();
        files.forEach(file => zip.file(file.filename, file.content));
        zip.generateAsync({ type: "blob" }).then(content => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = 'ai-generated-extension.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    };

    const TabButton = ({ tab, icon }) => (
         <button 
            onClick={() => setActiveTab(tab)} 
            className={`grid place-items-center w-8 h-8 rounded-full transition-colors duration-200 ${
                activeTab === tab 
                ? 'bg-white text-gray-900' 
                : 'text-gray-300 hover:bg-white/10'
            }`}
        >
            {icon}
        </button>
    );

    return (
        <div className="flex flex-col h-full p-4 gap-4">
            <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-1 p-1 bg-gray-900 rounded-full">
                    <TabButton tab="preview" icon={<EyeIcon className="w-5 h-5" />} />
                    <TabButton tab="code" icon={<CodeBracketIcon className="w-5 h-5" />} />
                    <TabButton tab="instructions" icon={<InformationCircleIcon className="w-5 h-5" />} />
                    <TabButton tab="publishing" icon={<UploadCloudIcon className="w-5 h-5" />} />
                </div>
                <div className="flex items-center gap-3">
                     <button onClick={onSave} disabled={files.length === 0 || !user} title={!user ? "Please log in to save extensions" : ""} className="flex items-center gap-2 py-2 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-semibold rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                        <BookmarkIcon className="w-5 h-5" />
                        <span>Save</span>
                    </button>
                    <button onClick={handleDownload} disabled={files.length === 0} className="flex items-center gap-2 py-2 px-4 bg-white hover:bg-gray-200 text-gray-900 font-semibold rounded-full transition-colors duration-200 disabled:bg-gray-400 disabled:text-gray-600 disabled:cursor-not-allowed">
                        <DownloadIcon className="w-5 h-5" />
                        <span>Download .zip</span>
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-hidden">
                {activeTab === 'preview' && <LivePreview files={files} />}
                {activeTab === 'code' && (
                    <div className="grid grid-cols-12 gap-4 h-full">
                        <div className="col-span-3"><FileTree files={files} selectedFilename={selectedFilename} onSelectFile={setSelectedFilename} /></div>
                        <div className="col-span-9"><CodeViewer file={selectedFile} /></div>
                    </div>
                )}
                {activeTab === 'instructions' && <InstructionsPanel permissions={permissions} />}
                {activeTab === 'publishing' && <PublishingGuidePanel />}
            </div>
        </div>
    );
};

// FIX: Explicitly define component props to prevent type errors when using it in a list with a 'key' prop.
// FIX: Explicitly type component with React.FC to correctly handle the 'key' prop in lists.
const TemplateCard: React.FC<{ template: ExtensionTemplate, onSelect: () => void }> = ({ template, onSelect }) => {
  const Icon = ICONS[template.icon];
  return (
    <div className="frosted-glass rounded-lg p-5 flex flex-col items-start text-left hover:border-purple-500 transition-all duration-200 w-80 flex-shrink-0">
      <div className="bg-gray-900 p-2 rounded-lg mb-4">
        {Icon && <Icon className="w-6 h-6 text-white" />}
      </div>
      <h3 className="font-bold text-white mb-2">{template.title}</h3>
      <p className="text-sm text-gray-400 flex-grow mb-4 h-20">{template.description}</p>
      <button onClick={onSelect} className="w-full text-center py-2 px-4 bg-white hover:bg-gray-200 text-gray-900 font-semibold rounded-full transition-colors duration-200 mt-auto">
        Start with this template
      </button>
    </div>
  );
};

const TemplateLibrary = ({ onSelectTemplate }) => (
    <div className="w-full max-w-7xl mx-auto px-4">
        <div className="flex gap-6 overflow-x-auto pb-4 carousel-scrollbar mt-8">
            {templates.map(template => (
                <TemplateCard key={template.id} template={template} onSelect={() => onSelectTemplate(template)} />
            ))}
        </div>
    </div>
);

// FIX: Explicitly define component props to prevent type errors when using it in a list with a 'key' prop.
// FIX: Explicitly type component with React.FC to correctly handle the 'key' prop in lists.
const SavedExtensionCard: React.FC<{ extension: SavedExtension, onLoad: (id: string) => void, onDelete: (id: string) => void }> = ({ extension, onLoad, onDelete }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-5 flex flex-col items-start text-left border border-gray-700 transition-all duration-200">
      <div className="w-full flex justify-between items-start">
          <div>
              <h3 className="font-bold text-white mb-1">{extension.name}</h3>
              <p className="text-xs text-gray-500 mb-2">Saved: {new Date(extension.savedAt).toLocaleString()}</p>
          </div>
          <button onClick={() => onDelete(extension.id)} className="p-1 text-gray-400 hover:text-red-400 transition-colors">
              <TrashIcon className="w-5 h-5" />
          </button>
      </div>
      <p className="text-sm text-gray-400 flex-grow mb-4 line-clamp-2">{extension.description}</p>
      <button onClick={() => onLoad(extension.id)} className="w-full text-center py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors duration-200">
        Load Extension
      </button>
    </div>
  );
};

const MyExtensionsPanel = ({ extensions, onLoad, onDelete, user }) => (
    <div className="p-6 h-full overflow-y-auto scrollbar-thin">
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white">My Saved Extensions</h2>
            <p className="text-lg text-gray-400 mt-2">Load a previous project or start a new one from a template.</p>
        </div>
        {user ? (
          <>
            {extensions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {extensions.map(ext => (
                        <SavedExtensionCard key={ext.id} extension={ext} onLoad={onLoad} onDelete={onDelete} />
                    ))}
                </div>
            ) : (
                 <div className="text-center text-gray-500 mt-16">
                    <FolderIcon className="w-16 h-16 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold">No extensions saved yet.</h3>
                    <p>Once you build and save an extension, it will appear here.</p>
                </div>
            )}
          </>
        ) : (
             <div className="text-center text-gray-500 mt-16">
                <ShieldCheckIcon className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-xl font-semibold">Please log in</h3>
                <p>Log in to view and manage your saved extensions.</p>
            </div>
        )}
    </div>
);

const WelcomeInput = ({ isLoading, onSendMessage, isInitializing }) => {
    const [input, setInput] = useState('');
    
    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim() && !isLoading && !isInitializing) {
            onSendMessage(input);
            setInput('');
        }
    };
    
    const isDisabled = isLoading || isInitializing;

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto my-12">
            <div className="relative frosted-glass rounded-3xl ring-1 ring-white/20 shadow-[0_0_25px_rgba(192,192,192,0.3)]">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        // Submit on Enter, but allow newlines with Shift+Enter
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                    placeholder={isInitializing ? "Initializing AI..." : "Describe your app, or paste an image..."}
                    className="w-full h-40 bg-transparent border-none focus:ring-0 text-gray-200 placeholder-gray-500 text-lg resize-none p-6"
                    disabled={isDisabled}
                />
                <button 
                  type="submit" 
                  disabled={isDisabled || !input.trim()} 
                  className="absolute bottom-6 right-6 py-2 px-5 bg-gray-200 text-gray-900 font-semibold rounded-full hover:bg-white disabled:bg-gray-500 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    Build my app
                </button>
            </div>
        </form>
    );
};


const WelcomePanel = ({ activeTab, onSelectTemplate, savedExtensions, onLoadExtension, onDeleteExtension, onSendMessage, isLoading, user, isInitializing }) => {
    return (
        <div className="flex flex-col h-full overflow-y-auto scrollbar-thin">
            <div className="flex-shrink-0 text-center pt-16 pb-8 px-4">
                <h2 className="text-5xl lg:text-6xl font-bold text-white tracking-tight">Build anything with RapidPlug AI</h2>
                <WelcomeInput isLoading={isLoading} onSendMessage={onSendMessage} isInitializing={isInitializing} />
            </div>

            <div className="w-full flex-grow">
                {activeTab === 'templates' && <TemplateLibrary onSelectTemplate={onSelectTemplate} />}
                {activeTab === 'my-extensions' && <MyExtensionsPanel extensions={savedExtensions} onLoad={onLoadExtension} onDelete={onDeleteExtension} user={user} />}
                {activeTab === 'instructions' && <div className="max-w-4xl mx-auto"><InstructionsPanel permissions={[]} /></div>}
                {activeTab === 'publishing' && <div className="max-w-4xl mx-auto"><PublishingGuidePanel /></div>}
            </div>
        </div>
    );
}

// --- Page Components ---

const HomePage = (props) => (
    <div className="h-full overflow-hidden">
        <WelcomePanel {...props} />
    </div>
);

const BuilderPage = ({ messages, isLoading, onSendMessage, files, onSave, user }) => (
    <div className="grid grid-cols-1 md:grid-cols-12 overflow-hidden h-full">
        <div className="md:col-span-3 h-full">
            <ChatPanel messages={messages} isLoading={isLoading} onSendMessage={onSendMessage} />
        </div>
        <div className="md:col-span-9 h-full">
            <OutputPanel files={files} onSave={onSave} user={user} />
        </div>
    </div>
);

const SettingsPage = ({ onSaveApiKey, currentApiKey }) => {
    const [activeSection, setActiveSection] = useState('ai-settings');
    const [apiKeyInput, setApiKeyInput] = useState(currentApiKey);
    const [saveStatus, setSaveStatus] = useState('idle');
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        setApiKeyInput(currentApiKey);
    }, [currentApiKey]);

    const handleInputChange = (e) => {
        setApiKeyInput(e.target.value);
        if (saveStatus !== 'idle') {
            setSaveStatus('idle');
            setStatusMessage('');
        }
    };

    const handleSave = () => {
        setSaveStatus('saving');
        setStatusMessage('');
        try {
            onSaveApiKey(apiKeyInput); // This call can throw
            setSaveStatus('saved');
            setStatusMessage('API Key saved successfully!');
            setTimeout(() => {
                setSaveStatus('idle');
                setStatusMessage('');
            }, 3000);
        } catch (e) {
            const message = e instanceof Error ? e.message : "An unknown error occurred.";
            setSaveStatus('error');
            setStatusMessage(message);
        }
    };

    const SectionButton = ({ section, label, icon }) => (
        <button
            onClick={() => setActiveSection(section)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeSection === section
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
            }`}
        >
            {icon}
            <span>{label}</span>
        </button>
    );

    return (
        <div className="h-full overflow-y-auto scrollbar-thin p-4 sm:p-8">
            <div className="max-w-5xl mx-auto bg-gray-800 rounded-3xl overflow-hidden">
                <div className="flex flex-col md:flex-row min-h-[600px]">
                    {/* Sidebar */}
                    <nav className="w-full md:w-64 flex-shrink-0 bg-gray-900 p-6">
                        <h2 className="text-lg font-semibold text-white mb-6">Settings</h2>
                        <div className="space-y-2">
                           <SectionButton section="ai-settings" label="AI Settings" icon={<SparklesIcon className="w-5 h-5" />} />
                           {/* Add more sections here in the future */}
                        </div>
                    </nav>

                    {/* Content */}
                    <div className="flex-1 p-8 sm:p-10">
                        {activeSection === 'ai-settings' && (
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">AI Settings</h3>
                                <p className="text-gray-400 mb-8">
                                    Provide your own Gemini API key to power the extension generation.
                                </p>
                                
                                <div className="space-y-4 max-w-lg">
                                    <div>
                                        <label htmlFor="api-key" className="block text-sm font-medium text-gray-300 mb-2">
                                            Gemini API Key
                                        </label>
                                        <input
                                            type="password"
                                            id="api-key"
                                            value={apiKeyInput}
                                            onChange={handleInputChange}
                                            placeholder="Enter your Gemini API key"
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                                        />
                                        <p className="text-xs text-gray-500 mt-2">
                                            Your key is stored securely in your browser's local storage and is never sent to our servers. 
                                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline ml-1">Get your key here.</a>
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4 pt-4">
                                        <button
                                            onClick={handleSave}
                                            disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                                            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-wait"
                                        >
                                            {saveStatus === 'saving' ? 'Validating...' : saveStatus === 'saved' ? 'Saved!' : 'Save Key'}
                                        </button>
                                        {statusMessage && (
                                            <p className={`text-sm ${saveStatus === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                                                {statusMessage}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProfilePage = ({ user, savedExtensions, onLoadExtension, onDeleteExtension, onLogout }) => {
    return (
        <div className="h-full overflow-y-auto scrollbar-thin p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Profile Header */}
                <header className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 mb-10">
                    <img src={user.picture} alt={user.name} className="w-32 h-32 rounded-full border-4 border-gray-700" />
                    <div className="text-center sm:text-left">
                        <h2 className="text-3xl font-bold text-white">{user.name}</h2>
                        <p className="text-gray-400">{user.email}</p>
                        <button onClick={onLogout} className="mt-4 px-4 py-2 text-sm bg-gray-700 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
                            Logout
                        </button>
                    </div>
                </header>

                {/* Extensions Grid */}
                <div>
                     <h3 className="text-xl font-bold text-white mb-6 pb-2 border-b border-gray-700">Recent Extensions</h3>
                     {savedExtensions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {savedExtensions.map(ext => (
                                <SavedExtensionCard key={ext.id} extension={ext} onLoad={onLoadExtension} onDelete={onDeleteExtension} />
                            ))}
                        </div>
                    ) : (
                         <div className="text-center text-gray-500 py-16">
                            <FolderIcon className="w-16 h-16 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold">No extensions saved yet.</h3>
                            <p>Build and save an extension, and it will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const LoginModal = ({ isOpen, onClose }) => {
    const modalRef = useRef(null);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleOutsideClick);
        }
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div ref={modalRef} className="bg-gray-800 rounded-2xl shadow-lg w-full max-w-4xl h-auto max-h-[90vh] overflow-hidden flex">
                {/* Left Side (Branding) */}
                <div className="hidden md:flex flex-col items-center justify-center w-1/2 bg-gray-900 p-8 text-center">
                    <SparklesIcon className="w-16 h-16 text-purple-400 mb-4" />
                    <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
                    <p className="text-gray-400 mt-2">Sign in to save your extensions and access your projects from anywhere.</p>
                </div>
                {/* Right Side (Login) */}
                <div className="w-full md:w-1/2 p-10 flex flex-col justify-center">
                    <h3 className="text-2xl font-bold text-white mb-6">Login to your Account</h3>
                    <div id="google-signin-button" className="flex justify-center"></div>
                </div>
            </div>
        </div>
    );
};


// --- Main App Component ---
// FIX: Add type annotation to initialMessages to ensure correct type inference throughout the component.
const initialMessages: Message[] = [
    { role: 'assistant', content: "Hello! I'm here to help you build a Chrome extension. What would you like to create? You can describe it, or start with a template." }
];

export default function App() {
    const [route, setRoute] = useState(getRoute());
    const [welcomeTab, setWelcomeTab] = useState('templates');
    const [messages, setMessages] = useState(initialMessages);
    const [generatedFiles, setGeneratedFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    // FIX: Provide a type for the savedExtensions state to prevent type errors when loading extensions from localStorage.
    const [savedExtensions, setSavedExtensions] = useState<SavedExtension[]>([]);
    const [userApiKey, setUserApiKey] = useState('');
    const [user, setUser] = useState(null);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);

     useEffect(() => {
        const handleHashChange = () => setRoute(getRoute());
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

     useEffect(() => {
        // This effect runs only once on initial app load.
        const initializeApp = async () => {
            setIsInitializing(true);
            
            // Step 1: Check for user-provided key in local storage.
            let key = localStorage.getItem('geminiApiKey');

            // Step 2: If no user key, fetch the default key from the serverless function.
            if (!key) {
                try {
                    const response = await fetch('/api/get-key');
                    if (response.ok) {
                        const data = await response.json();
                        key = data.apiKey;
                    } else {
                         console.error("Failed to fetch default API key from server.");
                    }
                } catch (e) {
                    console.error("Error fetching default API key:", e);
                }
            }

            // Step 3: Initialize the AI service with the found key.
            try {
                if (key) {
                    setApiKey(key);
                    setUserApiKey(key); // Also update state for settings page
                } else {
                    // Handle case where no key is available at all
                    console.warn("No API key available. AI features will be disabled until a key is provided in settings.");
                    setApiKey(null);
                }
            } catch (e) {
                console.error("Failed to set API key:", e);
                setApiKey(null);
            } finally {
                setIsInitializing(false);
            }

            // Load user session
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        };
        
        initializeApp();
    }, []);

     useEffect(() => {
        // Initialize Google Sign-In button whenever the modal is opened
        if (isLoginModalOpen) {
            const google = window.google;
            if (google && google.accounts) {
                google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleSignIn,
                });
                google.accounts.id.renderButton(
                    document.getElementById("google-signin-button"),
                    { theme: "outline", size: "large", type: 'standard', shape: 'pill', text: 'signin_with' } 
                );
            } else {
                console.error("Google GSI client not ready.");
            }
        }
    }, [isLoginModalOpen]);
    
    useEffect(() => {
        // Load extensions specific to the logged-in user
        if (user) {
            try {
                const stored = localStorage.getItem(`savedExtensions_${user.id}`);
                if (stored) {
                    setSavedExtensions(JSON.parse(stored));
                } else {
                    setSavedExtensions([]);
                }
            } catch (e) {
                console.error("Failed to load user extensions from localStorage", e);
                setSavedExtensions([]);
            }
        } else {
            setSavedExtensions([]); // Clear extensions if no user is logged in
        }
    }, [user]);

    const handleGoogleSignIn = (response) => {
        const userData = decodeJwt(response.credential);
        if (userData) {
            const newUser = {
                id: userData.sub,
                name: userData.name,
                email: userData.email,
                picture: userData.picture,
            };
            setUser(newUser);
            localStorage.setItem('user', JSON.stringify(newUser));
            setIsLoginModalOpen(false);
        }
    };
    
    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('user');
        window.location.hash = '/'; // Redirect to home on logout
    };


    const handleSaveApiKey = (key) => {
        setApiKey(key);
        localStorage.setItem('geminiApiKey', key);
        setUserApiKey(key);
    };


    const handleStartNewSession = (newMessages, newFiles = []) => {
        setMessages(newMessages);
        setGeneratedFiles(newFiles);
        setError(null);
        window.location.hash = '/builder';
    }

    const handleSendMessage = useCallback(async (input) => {
        const isNewSession = route !== '/builder';
        const baseMessages = isNewSession ? initialMessages : messages;
        
        setIsLoading(true);
        setError(null);
        const newMessages: Message[] = [...baseMessages, { role: 'user', content: input }];
        setMessages(newMessages);
        if (isNewSession) {
            setGeneratedFiles([]);
            window.location.hash = '/builder';
        }

        try {
            const files = await generateExtensionCode(newMessages);
            setGeneratedFiles(files);
            setMessages(prev => [...prev, { role: 'assistant', content: "Here are the updated files for your extension." }]);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(errorMessage);
            setMessages(prev => [...prev, { role: 'assistant', content: `I encountered an error: ${errorMessage}` }]);
        } finally {
            setIsLoading(false);
        }
    }, [messages, route]);
    
    // FIX: Add type annotation to the 'template' parameter to fix type inference issues.
    const handleSelectTemplate = (template: ExtensionTemplate) => {
        const newMessages: Message[] = [
            ...initialMessages,
            { role: 'user', content: template.initialPrompt },
            { role: 'assistant', content: `I've loaded the "${template.title}" template for you. You can see the files and a live preview. What would you like to change?` }
        ];
        handleStartNewSession(newMessages, template.files);
    };

    const handleSaveExtension = useCallback(() => {
        if (generatedFiles.length === 0 || !user) {
            if (!user) alert("Please log in to save your extensions.");
            return;
        }

        const manifestFile = generatedFiles.find(f => f.filename === 'manifest.json');
        let defaultName = 'My Extension';
        if (manifestFile) {
            try {
                const manifest = JSON.parse(manifestFile.content);
                if (manifest.name) {
                    defaultName = manifest.name;
                }
            } catch (e) { /* ignore parse error */ }
        }
        
        const name = prompt("Enter a name for your extension:", defaultName);
        if (!name) return;

        const firstUserMessage = messages.find(m => m.role === 'user');
        const description = firstUserMessage ? firstUserMessage.content : "An AI-generated Chrome extension.";

        const newExtension: SavedExtension = {
            id: Date.now().toString(),
            name,
            description,
            savedAt: new Date().toISOString(),
            files: generatedFiles,
            messages: messages,
        };

        const updatedExtensions = [...savedExtensions, newExtension];
        setSavedExtensions(updatedExtensions);
        localStorage.setItem(`savedExtensions_${user.id}`, JSON.stringify(updatedExtensions));
        alert(`Extension "${name}" saved!`);
    }, [generatedFiles, messages, savedExtensions, user]);

    const handleLoadExtension = useCallback((id: string) => {
        const extensionToLoad = savedExtensions.find(ext => ext.id === id);
        if (extensionToLoad) {
            setMessages(extensionToLoad.messages);
            setGeneratedFiles(extensionToLoad.files);
            window.location.hash = '/builder';
        }
    }, [savedExtensions]);

    const handleDeleteExtension = useCallback((id: string) => {
        if (!user) return;
        if (window.confirm("Are you sure you want to delete this saved extension? This cannot be undone.")) {
            const updatedExtensions = savedExtensions.filter(ext => ext.id !== id);
            setSavedExtensions(updatedExtensions);
            localStorage.setItem(`savedExtensions_${user.id}`, JSON.stringify(updatedExtensions));
        }
    }, [savedExtensions, user]);


    return (
        <div className="h-screen flex flex-col bg-gray-900 text-gray-100">
             {route === '/' ? (
                <HomeHeader
                    activeTab={welcomeTab}
                    onTabChange={setWelcomeTab}
                    onGoHome={() => window.location.hash = '/'}
                    user={user}
                    onLoginClick={() => setIsLoginModalOpen(true)}
                />
             ) : (
                <BuilderHeader 
                    onGoHome={() => window.location.hash = '/'} 
                    user={user}
                    onLoginClick={() => setIsLoginModalOpen(true)}
                />
             )}

            <main className="flex-1 overflow-hidden">
                {route === '/builder' ? (
                    <BuilderPage 
                        messages={messages}
                        isLoading={isLoading}
                        onSendMessage={handleSendMessage}
                        files={generatedFiles}
                        onSave={handleSaveExtension}
                        user={user}
                    />
                ) : route === '/' ? (
                    <HomePage
                        activeTab={welcomeTab}
                        onSelectTemplate={handleSelectTemplate}
                        savedExtensions={savedExtensions}
                        onLoadExtension={handleLoadExtension}
                        onDeleteExtension={handleDeleteExtension}
                        onSendMessage={handleSendMessage}
                        isLoading={isLoading}
                        user={user}
                        isInitializing={isInitializing}
                    />
                ) : route === '/settings' ? (
                    <SettingsPage
                        onSaveApiKey={handleSaveApiKey}
                        currentApiKey={userApiKey}
                    />
                ) : (
                     user && route === '/profile' ? (
                        <ProfilePage 
                            user={user}
                            savedExtensions={savedExtensions}
                            onLoadExtension={handleLoadExtension}
                            onDeleteExtension={handleDeleteExtension}
                            onLogout={handleLogout}
                        />
                     ) : <HomePage // Fallback for invalid routes or logged-out profile access
                        activeTab={welcomeTab}
                        onSelectTemplate={handleSelectTemplate}
                        savedExtensions={savedExtensions}
                        onLoadExtension={handleLoadExtension}
                        onDeleteExtension={handleDeleteExtension}
                        onSendMessage={handleSendMessage}
                        isLoading={isLoading}
                        user={user}
                        isInitializing={isInitializing}
                    />
                )}
            </main>
            <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
        </div>
    );
}