import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChefHat, Sparkles, Utensils, Loader2, Camera, Save, Trash2, ArrowLeft, LogIn, User, LogOut } from 'lucide-react';
import { ImageUploader } from './components/ImageUploader';
import { generateRecipeStream } from './services/geminiService';
import { db, auth } from './lib/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, orderBy, serverTimestamp } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';

enum View {
  LAB = 'lab',
  KITCHEN = 'kitchen'
}

interface SavedRecipe {
  id: string;
  title: string;
  content: string;
  createdAt: any;
  userId: string;
}

export default function App() {
  const [imageObj, setImageObj] = useState<{ inlineData: { data: string, mimeType: string } } | null>(null);
  const [textInput, setTextInput] = useState('');
  const [result, setResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentView, setCurrentView] = useState<View>(View.LAB);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchSavedRecipes(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setSavedRecipes([]);
      setCurrentView(View.LAB);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const fetchSavedRecipes = async (uid: string) => {
    try {
      const q = query(
        collection(db, 'recipes'),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const recipes: SavedRecipe[] = [];
      querySnapshot.forEach((doc) => {
        recipes.push({ id: doc.id, ...doc.data() } as SavedRecipe);
      });
      setSavedRecipes(recipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
    }
  };

  const handleSaveRecipe = async () => {
    if (!user) {
      alert("请先登录以保存菜谱");
      return;
    }
    if (!result) return;

    setIsSaving(true);
    try {
      const titleMatch = result.match(/^# (.*)/m);
      const title = titleMatch ? titleMatch[1] : "未命名菜谱";

      await addDoc(collection(db, 'recipes'), {
        title,
        content: result,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      
      alert("菜谱已保存到我的厨房！");
      fetchSavedRecipes(user.uid);
    } catch (error) {
      console.error("Error saving recipe:", error);
      alert("保存失败，请检查网络");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!window.confirm("确定要删除这个菜谱吗？")) return;
    try {
      await deleteDoc(doc(db, 'recipes', id));
      setSavedRecipes(savedRecipes.filter(r => r.id !== id));
    } catch (error) {
      console.error("Error deleting recipe:", error);
    }
  };

  const handleImageReady = (base64: string, mimeType: string) => {
    setImageObj({
      inlineData: {
        data: base64,
        mimeType
      }
    });
  };

  const handleClearImage = () => {
    setImageObj(null);
  };

  const handleGenerate = async () => {
    if (!imageObj && !textInput.trim()) return;
    
    setIsGenerating(true);
    setResult('');
    
    // Auto-scroll to result area
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    try {
      await generateRecipeStream(imageObj, textInput, (update) => {
        setResult(update);
      });
    } catch (error: any) {
      console.error(error);
      setResult(`> **哎呀，厨房出错了！**\n\n原因：\n\n\`\`\`text\n${error.message || '请检查 API 密钥或网络连接'}\n\`\`\``);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleGenerate();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden flex flex-col relative selection:bg-orange-500/30">
      {/* Animated-style Mesh Gradient Background */}
      <div className="fixed inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-orange-600 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600 rounded-full blur-[120px]"></div>
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-amber-400 rounded-full blur-[100px]"></div>
      </div>

      {/* Header Navigation */}
      <header className="relative z-10 flex flex-col sm:flex-row items-center justify-between px-6 sm:px-10 py-5 border-b border-white/10 backdrop-blur-sm bg-black/20 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-orange-500 to-amber-300 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
            ChefLens <span className="font-light text-orange-400 text-lg ml-1">拍食得</span>
          </span>
        </div>
        <nav className="flex items-center gap-4 sm:gap-8 text-sm font-medium text-white/60">
          <button 
            onClick={() => setCurrentView(View.LAB)}
            className={`${currentView === View.LAB ? 'text-orange-400' : 'hover:text-white'} transition-colors`}
          >
            视觉实验室
          </button>
          <button 
            onClick={() => setCurrentView(View.KITCHEN)}
            className={`${currentView === View.KITCHEN ? 'text-orange-400' : 'hover:text-white'} transition-colors`}
          >
            我的厨房
          </button>
          
          <div className="ml-4 pl-4 border-l border-white/10 relative" ref={menuRef}>
            {user ? (
              <>
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 group transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/20 group-hover:border-orange-500/50 transition-colors">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-white/40" />
                    )}
                  </div>
                  <span className="hidden sm:inline text-xs text-white/60 group-hover:text-white transition-colors">
                    {user.displayName || '主厨'}
                  </span>
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-3 w-56 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-5 py-4 border-b border-white/10 bg-white/5">
                      <p className="text-sm font-bold text-white truncate">{user.displayName || 'AI 主厨'}</p>
                      <p className="text-xs text-white/40 truncate">{user.email}</p>
                    </div>
                    <div className="p-2 space-y-1">
                      <button 
                        onClick={() => {
                          setCurrentView(View.KITCHEN);
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95"
                      >
                        <Utensils className="w-4 h-4" />
                        <span>我的厨房</span>
                      </button>
                      <button 
                        onClick={async () => {
                          await logout();
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:text-white hover:bg-red-500 rounded-xl transition-all active:scale-95 group"
                      >
                        <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                        <span>退出登录</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <button 
                onClick={login}
                className="flex items-center gap-2 px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs transition-all"
              >
                <LogIn className="w-3 h-3 text-orange-400" />
                登录
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* Main Viewport */}
      {currentView === View.LAB ? (
        <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-8">
          
          {/* Left Column: Input */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-[32px] backdrop-blur-xl p-6 sm:p-8 flex flex-col shadow-xl text-left">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-semibold">食材扫描</h2>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] uppercase tracking-widest rounded-full border border-emerald-500/30 font-bold hidden sm:inline-block">AI 已就绪</span>
              </div>
              
              <div className="space-y-6 flex-1 flex flex-col">
                <div className="flex-1 min-h-[200px]">
                   <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">1. 展示食材</label>
                   <ImageUploader onImageReady={handleImageReady} onClear={handleClearImage} />
                </div>

                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-widest mb-2 block font-bold">2. 或输入食材清单</label>
                  <div className="relative">
                    <textarea 
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-orange-500/50 resize-none h-28 placeholder:text-white/20 transition-colors" 
                      placeholder="例如：'我有2个鸡蛋，一些剩米饭，半个洋葱...'"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <div className="absolute bottom-3 right-3 flex items-center justify-center p-2 rounded-lg bg-orange-500/10 text-orange-500 pointer-events-none">
                       <span className="text-[10px] font-bold">⌘↵</span>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-white/30 px-1">
                    提示：你也可以问我关于拍食得的商业建议。
                  </div>
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={(!imageObj && !textInput.trim()) || isGenerating}
                  className="w-full py-4 px-6 bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 text-white font-bold rounded-full flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30 disabled:shadow-none transition-all active:scale-[0.98]"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      正在烹饪创意...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      烹饪灵感
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Result Display */}
          <div ref={resultRef} className="lg:col-span-7 flex flex-col lg:min-h-[600px] text-left">
            {(result || isGenerating) ? (
              <div className="flex-1 bg-white/10 border border-white/20 rounded-[40px] backdrop-blur-2xl p-6 sm:p-10 shadow-2xl flex flex-col relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Top Right Glow */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="relative flex flex-col h-full overflow-y-auto custom-scrollbar pr-2">
                  <div className="flex items-center gap-2 text-orange-400 mb-6">
                    <StarIcon className="w-5 h-5" />
                    <span className="text-xs font-bold tracking-[0.2em] uppercase">米其林臻选</span>
                  </div>

                  <div className="markdown-body text-white flex-1">
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {result || '*Preparing the kitchen...*'}
                    </Markdown>
                  </div>

                  {result && !isGenerating && (
                    <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center shrink-0">
                      <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30 hidden sm:flex">
                           <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                        </div>
                        <span className="text-xs text-white/50 flex items-center">#ChefLens #拍食得</span>
                      </div>
                      <button 
                        onClick={handleSaveRecipe}
                        disabled={isSaving}
                        className="px-6 py-2 bg-orange-600 hover:bg-orange-500 rounded-2xl text-white font-bold text-sm active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-orange-600/20 disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        保存菜谱
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 bg-white/5 border border-white/10 rounded-[40px] backdrop-blur-lg flex items-center justify-center p-10 shadow-lg text-center opacity-70">
                <div className="flex flex-col items-center gap-4 text-white/40 max-w-sm">
                  <Utensils className="w-16 h-16 opacity-30" />
                  <h3 className="text-lg font-medium text-white/60">厨房已就绪</h3>
                  <p className="text-sm">上传食材照片或描述你冰箱里的食材，AI 主厨将为你定制食谱。</p>
                </div>
              </div>
            )}
          </div>
        </main>
      ) : (
        <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto p-4 sm:p-8 flex flex-col gap-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setCurrentView(View.LAB)}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                title="返回实验室"
              >
                <ArrowLeft className="w-5 h-5 text-white/60" />
              </button>
              <div>
                <h2 className="text-3xl font-bold tracking-tight">我的厨房</h2>
                <p className="text-white/40 text-sm">在这里珍藏您的烹饪灵感与配方</p>
              </div>
            </div>
            
            <div className="px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-orange-400 text-xs font-bold flex items-center gap-2">
              <Utensils className="w-4 h-4" />
              已保存 {savedRecipes.length} 个灵感
            </div>
          </div>

          {!user ? (
            <div className="flex-1 flex flex-col items-center justify-center p-20 border border-white/10 rounded-[40px] bg-white/5 backdrop-blur-sm text-center">
              <LogIn className="w-16 h-16 text-white/20 mb-4" />
              <h3 className="text-xl font-semibold mb-2">灵感需要保管箱</h3>
              <p className="text-white/40 max-w-xs mb-8">请先登录，我们将为您的专属配方提供云端存储服务。</p>
              <button 
                onClick={login}
                className="px-8 py-3 bg-orange-600 hover:bg-orange-500 rounded-full font-bold shadow-lg shadow-orange-600/20 transition-all active:scale-95"
              >
                授权登录
              </button>
            </div>
          ) : savedRecipes.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-20 border border-white/10 rounded-[40px] bg-white/5 backdrop-blur-sm text-center">
              <Sparkles className="w-16 h-16 text-white/20 mb-4" />
              <h3 className="text-xl font-semibold mb-2">厨房还是空的</h3>
              <p className="text-white/40 max-w-xs mb-8">返回视觉实验室，开始您的第一次食材进化吧。</p>
              <button 
                onClick={() => setCurrentView(View.LAB)}
                className="px-8 py-3 bg-orange-600 hover:bg-orange-500 rounded-full font-bold shadow-lg shadow-orange-600/20 transition-all active:scale-95"
              >
                开始创作
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {savedRecipes.map(recipe => (
                <div key={recipe.id} className="group bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all duration-300 flex flex-col h-[400px] relative overflow-hidden backdrop-blur-xl">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold line-clamp-1 group-hover:text-orange-400 transition-colors">{recipe.id === result ? "👀 浏览中" : recipe.title}</h3>
                    <button 
                      onClick={() => handleDeleteRecipe(recipe.id)}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex-1 text-sm text-white/60 line-clamp-[10] overflow-hidden mask-fade-bottom">
                    <Markdown>{recipe.content}</Markdown>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-[10px] text-white/30 font-bold uppercase tracking-widest">
                    <span>{recipe.createdAt?.toDate ? new Date(recipe.createdAt.toDate()).toLocaleDateString() : '刚刚'}</span>
                    <button 
                      onClick={() => {
                        setResult(recipe.content);
                        setCurrentView(View.LAB);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors"
                    >
                      查看详情
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* Footer Bar */}
      <footer className="relative z-10 px-6 sm:px-10 py-4 flex justify-between items-center bg-black/40 backdrop-blur-md border-t border-white/5 mt-auto">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
            <span className="text-[10px] text-white/40 uppercase tracking-tighter">AI 核心状态：正常</span>
          </div>
          <div className="h-4 w-[1px] bg-white/10 hidden sm:block"></div>
          <span className="text-[10px] text-white/40 uppercase hidden sm:block">模型引擎: 高性能智能模型</span>
        </div>
        <div className="text-[10px] text-white/20 uppercase tracking-wider text-right">
          © {new Date().getFullYear()} CHEFLENS CREATIVE. 专为烹饪大师设计。
        </div>
      </footer>
    </div>
  );
}

// Just a simple star icon component for the michelin star
function StarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}
