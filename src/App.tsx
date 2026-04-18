import { useState, useMemo, useEffect, useRef } from "react";
import { 
  motion, 
  AnimatePresence,
  useScroll,
  useTransform,
  useInView,
  LayoutGroup
} from "motion/react";
import { 
  Cake, 
  Sparkles, 
  Menu as MenuIcon, 
  X, 
  LogOut, 
  User as UserIcon, 
  ChevronRight,
  TrendingUp,
  Star,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Calendar,
  Zap,
  BookOpen,
  ArrowRight,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  Send,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon
} from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import { generateCakeIdea, getFlavorPairs, analyzeRecipe } from "./services/gemini";
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "./lib/firebase";
import { cn } from "./lib/utils";
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";

// Sound helper
const useAudio = (url: string) => {
  useEffect(() => {
    const audio = new Audio(url);
    audio.load();
  }, [url]);

  return () => {
    const audio = new Audio(url);
    audio.volume = 0.4;
    audio.play().catch(() => {});
  };
};

const SOUNDS = {
  click: "https://www.soundjay.com/buttons/sounds/button-16.mp3",
  success: "https://www.soundjay.com/buttons/sounds/button-09.mp3",
  magic: "https://www.soundjay.com/misc/sounds/magic-chime-01.mp3",
};

// Types
interface CakeIdea {
  cakeName: string;
  flavorProfile: string;
  designConcept: string;
  chefPitch: string;
}

interface Product {
  id: string;
  name: string;
  category: "classic" | "custom" | "vegan";
  price: string;
  desc: string;
  image: string;
  weight: string;
  details: string;
}

const PRODUCTS: Product[] = [
  { id: "1", name: "Decadent Chocolate Truffle", category: "classic", price: "₹1,200", desc: "Rich layers of dark chocolate sponge and silky ganache.", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=800", weight: "1 kg", details: "Best Seller • Contains Dairy" },
  { id: "2", name: "Madagascar Vanilla Bean", category: "classic", price: "₹950", desc: "Light, fluffy, and infused with real vanilla bean pods.", image: "https://images.unsplash.com/photo-1547517023-7ca0c162f816?auto=format&fit=crop&q=80&w=800", weight: "1 kg", details: "Classic • Contains Dairy" },
  { id: "3", name: "Strawberry Summer Shortcake", category: "custom", price: "₹1,500", desc: "Custom tiered cake loaded with fresh organic strawberries.", image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&q=80&w=800", weight: "1.5 kg", details: "Seasonal • Made to Order" },
  { id: "4", name: "Lemon Raspberry Zest", category: "vegan", price: "₹1,400", desc: "Plant-based citrus sponge with a tart raspberry compote.", image: "https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&q=80&w=800", weight: "1 kg", details: "100% Vegan • Nut-Free" },
  { id: "5", name: "Classic Red Velvet", category: "classic", price: "₹1,300", desc: "The traditional southern recipe with cream cheese frosting.", image: "https://images.unsplash.com/photo-1586788680434-30d324b2d46f?auto=format&fit=crop&q=80&w=800", weight: "1 kg", details: "Customer Favorite" },
  { id: "6", name: "Matcha Floral Garden", category: "custom", price: "₹2,100", desc: "Premium grade matcha layered cake with edible sugar flowers.", image: "https://images.unsplash.com/photo-1515037893149-de7f840978e2?auto=format&fit=crop&q=80&w=800", weight: "2 kg", details: "Custom Design • 48hr Notice" },
  { id: "7", name: "Salted Caramel Pecan", category: "classic", price: "₹1,650", desc: "Buttery sponge with salted caramel drizzle and roasted pecans.", image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&q=80&w=800", weight: "1 kg", details: "Top Rated • Contains Nuts" },
  { id: "8", name: "Blueberry Royale", category: "custom", price: "₹1,850", desc: "Wild blueberry infusion with white chocolate velvet frosting.", image: "https://images.unsplash.com/photo-1535141192574-5d4897c12636?auto=format&fit=crop&q=80&w=800", weight: "1.2 kg", details: "Elegant • Made to Order" },
  { id: "9", name: "Vegan Mango Passionfruit", category: "vegan", price: "₹1,550", desc: "Refreshing tropical mango base with a tangy passionfruit glaze.", image: "https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?auto=format&fit=crop&q=80&w=800", weight: "1 kg", details: "Summer Special • DF/Egg-Free" },
  { id: "10", name: "Tiramisu Cheesecake", category: "classic", price: "₹1,950", desc: "Espresso-soaked ladyfingers inside a creamy mascarpone cheese.", image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&q=80&w=800", weight: "1.5 kg", details: "Traditional • Italian Inspired" },
  { id: "11", name: "Lavender Earl Grey", category: "custom", price: "₹2,400", desc: "Sophisticated tea-infused sponge with organic lavender buds.", image: "https://images.unsplash.com/photo-1516110833967-0b5716ca1387?auto=format&fit=crop&q=80&w=800", weight: "2 kg", details: "Chef's Signature • Unique Profile" },
  { id: "12", name: "Double Dark Choco-Fudge", category: "vegan", price: "₹1,600", desc: "Intense 70% dark cocoa sponge with whipped coconut ganache.", image: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&q=80&w=800", weight: "1 kg", details: "Rich & Moist • Healthier Choice" },
];

const FLAVOR_STATS = [
  { name: 'Chocolate', value: 35 },
  { name: 'Vanilla', value: 25 },
  { name: 'Red Velvet', value: 15 },
  { name: 'Strawberry', value: 15 },
  { name: 'Other', value: 10 },
];

const RATING_DATA = [
  { stars: '5 ★', count: 142 },
  { stars: '4 ★', count: 38 },
  { stars: '3 ★', count: 5 },
  { stars: '2 ★', count: 2 },
  { stars: '1 ★', count: 0 },
];

const CHART_COLORS = ['#4A3B32', '#D4A373', '#E6BEAE', '#F3EFEA', '#8B7355'];

const REVIEWS = [
  { name: "Sarah M.", text: "The Strawberry Shortcake we ordered for my daughter's birthday was an absolute masterpiece! It tasted even better than it looked.", stars: 5 },
  { name: "David L.", text: "Best vegan cakes in town. You honestly can't tell the Lemon Raspberry is plant-based. Highly recommend!", stars: 5 },
  { name: "Emily R.", text: "Their chocolate truffle cake is dangerously good. We order one for every office celebration now.", stars: 5 }
];

export default function App() {
  const { user, loading: authLoading, error: authError, login, logout, setError: setAuthError } = useAuth();
  const [activeFilter, setActiveFilter] = useState<"all" | "classic" | "custom" | "vegan">("all");
  
  // Sounds
  const playClick = useAudio(SOUNDS.click);
  const playSuccess = useAudio(SOUNDS.success);
  const playMagic = useAudio(SOUNDS.magic);

  // AI Concierge State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState<CakeIdea | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [savingRequest, setSavingRequest] = useState(false);

  // Baker's Lab State (Fast Gemini Task)
  const [flavorInput, setFlavorInput] = useState("");
  const [pairResults, setPairResults] = useState<any[]>([]);
  const [pairingLoading, setPairingLoading] = useState(false);

  // Recipe Analysis State (Complex Gemini Task)
  const [recipeInput, setRecipeInput] = useState("");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const filteredProducts = useMemo(() => {
    if (activeFilter === "all") return PRODUCTS;
    return PRODUCTS.filter(p => p.category === activeFilter);
  }, [activeFilter]);

  const handleAiInquiry = async () => {
    if (!aiPrompt.trim()) return;
    playClick();
    setAiLoading(true);
    setAiError("");
    setAiResult(null);
    try {
      const result = await generateCakeIdea(aiPrompt);
      setAiResult(result);
      playMagic();
    } catch (err) {
      setAiError("Our chef is currently offline. Please try again later.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleFlavorPairing = async () => {
    if (!flavorInput.trim()) return;
    playClick();
    setPairingLoading(true);
    setPairResults([]);
    try {
      const results = await getFlavorPairs(flavorInput);
      setPairResults(results);
      playSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setPairingLoading(false);
    }
  };

  const handleRecipeAnalysis = async () => {
    if (!recipeInput.trim()) return;
    playClick();
    setAnalysisLoading(true);
    setAnalysisResult(null);
    try {
      const result = await analyzeRecipe(recipeInput);
      setAnalysisResult(result);
      playSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const saveCustomRequest = async () => {
    if (!user || !aiResult) return;
    playClick();
    setSavingRequest(true);
    try {
      await addDoc(collection(db, "customRequests"), {
        userId: user.uid,
        customerPrompt: aiPrompt,
        ...aiResult,
        status: "submitted",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      playSuccess();
      alert("Your custom request has been saved and sent to our chefs!");
      setAiResult(null);
      setAiPrompt("");
    } catch (err) {
      console.error(err);
      alert("Failed to save request. Please try again.");
    } finally {
      setSavingRequest(false);
    }
  };

  // Scroll Animations
  const { scrollYProgress } = useScroll();
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#4A3B32] font-sans selection:bg-[#D4A373] selection:text-white overflow-x-hidden">
      {/* Auth Error Banner */}
      <AnimatePresence>
        {authError && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-500 text-white text-center py-2 px-4 text-sm font-bold flex items-center justify-center gap-2 overflow-hidden"
          >
            <AlertCircle size={16} />
            {authError}
            <button onClick={() => setAuthError(null)} className="ml-4 hover:opacity-70">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#F3EFEA] px-4 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-10 h-10 bg-[#D4A373] rounded-xl flex items-center justify-center text-white shadow-lg">
              <Cake size={24} />
            </div>
            <span className="text-2xl font-serif font-bold tracking-tight">Sweet Delights</span>
          </motion.div>

          <div className="hidden lg:flex items-center gap-6 font-medium text-sm">
            <a href="#menu" className="hover:text-[#D4A373] transition-colors">Menu</a>
            <a href="#ai-concierge" className="hover:text-[#D4A373] transition-colors flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#D4A373]" />
              AI Concierge
            </a>
            <a href="#bakers-lab" className="hover:text-[#D4A373] transition-colors flex items-center gap-1.5">
              <Zap size={14} className="text-orange-400" />
              Baker's Lab
            </a>
            <a href="#insights" className="hover:text-[#D4A373] transition-colors">Insights</a>
            <a href="#reviews" className="hover:text-[#D4A373] transition-colors">Reviews</a>
            <a href="#contact" className="hover:text-[#D4A373] transition-colors">Contact</a>
          </div>

          <div className="flex items-center gap-4">
            {authLoading ? (
              <div className="w-8 h-8 rounded-full bg-[#F3EFEA] animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-[#8B7355] font-medium">Welcome back,</p>
                  <p className="text-sm font-bold">{user.displayName?.split(" ")[0]}</p>
                </div>
                <div className="group relative">
                  <img 
                    src={user.photoURL || ""} 
                    alt={user.displayName || "User"} 
                    className="w-10 h-10 rounded-full border-2 border-[#D4A373] cursor-pointer"
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-[#F3EFEA] shadow-xl rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2">
                    <button 
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={login}
                className="bg-[#4A3B32] text-white px-6 py-2 rounded-full font-bold hover:bg-[#D4A373] transition-all flex items-center gap-2 shadow-md"
              >
                <UserIcon size={18} />
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-20 px-4">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-[#E6BEAE]/30 text-[#4A3B32] px-4 py-2 rounded-full text-sm font-bold mb-6">
                <TrendingUp size={16} />
                <span>#1 Artisan Bakery in Asia</span>
              </div>
              <h1 className="text-6xl md:text-8xl font-serif font-bold leading-[0.9] mb-8">
                Cakes Crafted with <span className="text-[#D4A373] italic">Passion.</span>
              </h1>
              <p className="text-xl text-[#4A3B32]/70 max-w-lg mb-10 leading-relaxed">
                Experience the fine balance of traditional craftsmanship and modern flavor profiles. From classic truffles to AI-inspired custom wonders.
              </p>
              <div className="flex flex-wrap gap-4">
                <motion.a 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  href="#menu"
                  className="bg-[#D4A373] text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all"
                  onClick={() => playClick()}
                >
                  Shop the Menu
                </motion.a>
                <motion.a 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  href="#ai-concierge"
                  className="bg-white text-[#4A3B32] border border-[#F3EFEA] px-8 py-4 rounded-full font-bold text-lg hover:bg-[#F3EFEA] transition-all flex items-center gap-2"
                  onClick={() => playClick()}
                >
                  Custom Request
                  <ChevronRight size={20} />
                </motion.a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="relative z-10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&q=80&w=1200" 
                  alt="Artisan Cake"
                  referrerPolicy="no-referrer"
                  className="w-full aspect-[4/5] object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 -left-6 bg-white p-8 rounded-3xl shadow-xl z-20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-4">
                    {[
                      "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
                      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
                      "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
                      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e"
                    ].map((url, i) => (
                      <img 
                        key={i}
                        src={`${url}?auto=format&fit=crop&q=80&w=100`} 
                        className="w-12 h-12 rounded-full border-4 border-white shadow-sm object-cover"
                        alt="Customer"
                        referrerPolicy="no-referrer"
                      />
                    ))}
                  </div>
                  <div>
                    <div className="flex text-yellow-400 gap-0.5">
                      {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="currentColor" />)}
                    </div>
                    <p className="text-sm font-bold mt-1">10k+ Happy Customers</p>
                  </div>
                </div>
                <div className="h-12 w-12 bg-[#F3EFEA] rounded-full flex items-center justify-center text-[#D4A373]">
                  <ShoppingBag size={24} />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Menu Section */}
        <section id="menu" className="py-24 bg-white border-y border-[#F3EFEA]">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-4xl md:text-5xl font-serif font-bold mb-4"
              >
                Our Signature Selection
              </motion.h2>
              <div className="flex justify-center gap-2 flex-wrap">
                <LayoutGroup>
                  {(["all", "classic", "custom", "vegan"] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => {
                        setActiveFilter(filter);
                        playClick();
                      }}
                      className={cn(
                        "px-6 py-2 rounded-full font-bold transition-all capitalize relative",
                        activeFilter === filter 
                          ? "text-white"
                          : "bg-[#F3EFEA] text-[#4A3B32]/60 hover:bg-[#E6BEAE]/30"
                      )}
                    >
                      {activeFilter === filter && (
                        <motion.div 
                          layoutId="filter-pill"
                          className="absolute inset-0 bg-[#4A3B32] rounded-full -z-10 shadow-md"
                        />
                      )}
                      {filter}
                    </button>
                  ))}
                </LayoutGroup>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ y: -10 }}
                    className="group bg-[#FAFAF7] rounded-[2rem] border border-[#F3EFEA] overflow-hidden hover:shadow-xl transition-all"
                  >
                    <div className="relative h-64 overflow-hidden">
                      <img 
                        src={product.image} 
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg font-bold text-sm shadow-sm">
                        {product.weight}
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-serif font-bold">{product.name}</h3>
                        <span className="text-[#D4A373] font-bold">{product.price}</span>
                      </div>
                      <p className="text-[#4A3B32]/60 text-sm mb-4 line-clamp-2 leading-relaxed">{product.desc}</p>
                      <div className="flex items-center gap-2 mb-6 text-[10px] uppercase font-bold tracking-wider text-[#8B7355]">
                        <span className="bg-[#E6BEAE]/40 px-2 py-0.5 rounded">{product.category}</span>
                        <span>•</span>
                        <span>{product.details}</span>
                      </div>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => playClick()}
                        className="w-full bg-white border-2 border-[#D4A373] text-[#D4A373] py-3 rounded-xl font-bold hover:bg-[#D4A373] hover:text-white transition-all shadow-sm"
                      >
                        Add to Cart
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Insights Section (Missing from turn 2) */}
        <section id="insights" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-4xl md:text-5xl font-serif font-bold mb-4"
              >
                Bakery Insights
              </motion.h2>
              <p className="text-[#4A3B32]/60 max-w-xl mx-auto">
                We celebrate quality and transparency. See which flavors our community loves most.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-[#FAFAF7] p-8 rounded-[2.5rem] border border-[#F3EFEA] shadow-sm"
              >
                <div className="flex items-center gap-3 mb-8">
                  <PieChartIcon className="text-[#D4A373]" />
                  <h3 className="text-xl font-bold">Favorite Flavors</h3>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={FLAVOR_STATS}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {FLAVOR_STATS.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-[#FAFAF7] p-8 rounded-[2.5rem] border border-[#F3EFEA] shadow-sm"
              >
                <div className="flex items-center gap-3 mb-8">
                  <BarChartIcon className="text-[#D4A373]" />
                  <h3 className="text-xl font-bold">Review Ratings</h3>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={RATING_DATA}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6BEAE33" />
                      <XAxis dataKey="stars" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip 
                         cursor={{fill: '#E6BEAE11'}}
                         contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="count" fill="#D4A373" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Baker's Lab Section (New Intelligence Features) */}
        <section id="bakers-lab" className="py-24 bg-[#4A3B32]/5">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-orange-100 text-[#4A3B32] px-4 py-2 rounded-full text-sm font-bold mb-4">
                <Zap size={16} className="text-orange-500" />
                <span>Baker's Intelligence Lab</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4">Master the Art of Flavor</h2>
              <p className="text-[#4A3B32]/60 max-w-2xl mx-auto">
                Use our advanced AI tools to pair ingredients instantly or analyze your complex recipes with precision.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
              {/* Flavor Pairing (Fast Task) */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-[#F3EFEA] shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-orange-50 rounded-2xl text-orange-500">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif font-bold">Fast Flavor Pairs</h3>
                    <p className="text-xs text-[#4A3B32]/60 uppercase font-bold tracking-widest">Powered by Flash Lite</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={flavorInput}
                    onChange={(e) => setFlavorInput(e.target.value)}
                    placeholder="e.g. Cardamom, Earl Grey..."
                    className="flex-grow bg-[#FAFAF7] border border-[#F3EFEA] rounded-xl px-4 py-3 focus:outline-none focus:border-[#D4A373]"
                  />
                  <button 
                    onClick={handleFlavorPairing}
                    disabled={pairingLoading || !flavorInput.trim()}
                    className="bg-[#4A3B32] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#D4A373] transition-all disabled:opacity-50"
                  >
                    {pairingLoading ? "..." : <ArrowRight size={20} />}
                  </button>
                </div>

                <div className="mt-8 space-y-4">
                  <AnimatePresence>
                    {pairResults.map((p, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-4 bg-[#FAFAF7] rounded-xl border border-[#F3EFEA]"
                      >
                        <h4 className="font-bold text-[#D4A373]">{p.pair}</h4>
                        <p className="text-sm text-[#4A3B32]/70 italic mt-0.5">{p.reason}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Recipe Analysis (Complex Task) */}
              <div className="bg-[#4A3B32] p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <BookOpen size={120} />
                </div>
                <div className="relative z-10 flex items-center gap-3 mb-6">
                  <div className="p-3 bg-white/10 rounded-2xl text-white">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif font-bold">Chef's Recipe Analysis</h3>
                    <p className="text-xs text-white/40 uppercase font-bold tracking-widest">Powered by Pro Intelligence</p>
                  </div>
                </div>
                
                <textarea 
                  value={recipeInput}
                  onChange={(e) => setRecipeInput(e.target.value)}
                  placeholder="Paste your recipe ingredients and method here for professional critique..."
                  className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-[#D4A373] transition-all resize-none h-32 mb-4"
                />

                <button 
                  onClick={handleRecipeAnalysis}
                  disabled={analysisLoading || !recipeInput.trim()}
                  className="w-full bg-white text-[#4A3B32] py-3 rounded-xl font-bold hover:bg-[#D4A373] hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {analysisLoading ? <div className="w-5 h-5 border-2 border-[#4A3B32] border-t-white rounded-full animate-spin" /> : <>Analyze Recipe <ChevronRight size={18} /></>}
                </button>

                <AnimatePresence>
                  {analysisResult && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8 space-y-6"
                    >
                      <div className="p-4 bg-white/10 rounded-xl border border-white/10 text-sm">
                        <p className="font-bold text-[#E6BEAE] mb-1 uppercase tracking-widest text-[10px]">Analysis</p>
                        {analysisResult.analysis}
                      </div>
                      <div className="grid gap-4">
                         {analysisResult.improvements.map((imp: any, i: number) => (
                           <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                              <div className="font-serif text-2xl text-[#D4A373]">0{i+1}</div>
                              <div>
                                <h5 className="font-bold text-sm">{imp.title}</h5>
                                <p className="text-xs text-white/60 mt-1">{imp.suggestion}</p>
                              </div>
                           </div>
                         ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* AI Concierge Section */}
        <section id="ai-concierge" className="py-24 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-[#4A3B32] rounded-[3rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
              {/* Background Decor */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4A373]/10 blur-[100px] -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#E6BEAE]/10 blur-[100px] -ml-32 -mb-32" />

              <div className="relative z-10 text-center mb-12">
                <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm font-bold mb-4">
                  <Sparkles size={16} className="text-[#D4A373]" />
                  <span>Powered by Gemini AI</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4">Ask the AI Master Chef</h2>
                <p className="text-white/60 max-w-xl mx-auto">
                  Describe your dream cake—occasions, flavors, or even moods—and our virtual chef will design a custom masterpiece just for you.
                </p>
              </div>

              <div className="relative z-10 space-y-6">
                <textarea 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., A midsummer night's dream inspired cake with lavender and wild honey hints..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white placeholder-white/30 focus:outline-none focus:border-[#D4A373] focus:ring-1 focus:ring-[#D4A373] transition-all resize-none text-lg h-32"
                />
                
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAiInquiry}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="w-full bg-[#D4A373] hover:bg-[#E6BEAE] text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 relative overflow-hidden"
                >
                  {aiLoading && (
                    <motion.div 
                      className="absolute inset-0 bg-white/10"
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    />
                  )}
                  {aiLoading ? (
                    <>
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      >
                        <Zap size={20} className="text-white" />
                      </motion.div>
                      Whisking up ideas...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Invent My Custom Cake
                    </>
                  )}
                </motion.button>

                {aiError && (
                  <p className="text-red-400 text-center text-sm font-medium">{aiError}</p>
                )}

                <AnimatePresence>
                  {aiResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="mt-12 bg-white text-[#4A3B32] rounded-3xl p-8 border border-white/10 shadow-2xl overflow-hidden relative"
                    >
                      <div className="flex items-start justify-between mb-8 gap-4">
                        <div>
                          <h3 className="text-3xl font-serif font-bold text-[#D4A373]">{aiResult.cakeName}</h3>
                          <p className="text-sm font-bold opacity-60 uppercase tracking-widest mt-1">Gourmet Concept</p>
                        </div>
                        <div className="w-12 h-12 bg-[#F3EFEA] rounded-2xl flex items-center justify-center text-[#D4A373]">
                          <Cake size={24} />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-8 mb-8">
                        <div>
                          <h4 className="flex items-center gap-2 font-bold mb-2">
                            <ShoppingBag size={16} className="text-[#D4A373]" />
                            Flavor Profile
                          </h4>
                          <p className="text-sm text-[#4A3B32]/70 leading-relaxed">{aiResult.flavorProfile}</p>
                        </div>
                        <div>
                          <h4 className="flex items-center gap-2 font-bold mb-2">
                            <Sparkles size={16} className="text-[#D4A373]" />
                            Design & Art
                          </h4>
                          <p className="text-sm text-[#4A3B32]/70 leading-relaxed">{aiResult.designConcept}</p>
                        </div>
                      </div>

                      <div className="bg-[#FAFAF7] p-6 rounded-2xl border-l-4 border-[#D4A373] italic text-sm text-[#4A3B32]/80 mb-8">
                        "{aiResult.chefPitch}"
                      </div>

                      {user ? (
                        <button 
                          onClick={saveCustomRequest}
                          disabled={savingRequest}
                          className="w-full bg-[#4A3B32] text-white py-4 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          {savingRequest ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 size={18} />
                              Save & Send to Chef
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="bg-[#E6BEAE]/20 p-6 rounded-2xl text-center">
                          <p className="text-sm font-bold mb-4">Sign in to save this masterpiece and order it!</p>
                          <button 
                            onClick={login}
                            className="bg-[#D4A373] text-white px-8 py-2 rounded-full font-bold shadow-md hover:shadow-lg transition-all"
                          >
                            Sign In with Google
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <section id="reviews" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4">Sweet Words From Our Customers</h2>
              <p className="text-[#4A3B32]/60 max-w-xl mx-auto">
                Read what the community has to say about their sweet experiences.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {REVIEWS.map((review, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-[#FAFAF7] p-8 rounded-[2rem] border border-[#F3EFEA] shadow-sm flex flex-col items-center text-center"
                >
                  <div className="flex text-yellow-400 gap-1 mb-6">
                    {[...Array(review.stars)].map((_, idx) => <Star key={idx} size={18} fill="currentColor" />)}
                  </div>
                  <p className="text-[#4A3B32]/80 italic mb-8 leading-relaxed">"{review.text}"</p>
                  <p className="font-bold text-[#D4A373] mt-auto">— {review.name}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-24 bg-[#4A3B32] text-white">
          <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
             <motion.div
               initial={{ opacity: 0, x: -30 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
             >
                <h2 className="text-5xl font-serif font-bold mb-8">Visit Our Patisserie</h2>
                <p className="text-white/60 mb-12 max-w-md text-lg leading-relaxed">
                  We're ready to make your celebrations extraordinary. Step into our world of artisanal delights.
                </p>

                <div className="space-y-8">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/10 rounded-2xl text-[#D4A373]">
                      <MapPin size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">Location</h4>
                      <p className="text-white/60">Artisan Plaza, Lavelle Road, Bangalore, India</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/10 rounded-2xl text-[#D4A373]">
                      <Phone size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">Call Us</h4>
                      <p className="text-white/60">(555) 123-4567</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/10 rounded-2xl text-[#D4A373]">
                      <Mail size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">Inquiry</h4>
                      <p className="text-white/60">hello@sweetdelights.shop</p>
                    </div>
                  </div>
                </div>
             </motion.div>

             <motion.div
               initial={{ opacity: 0, x: 30 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               className="bg-white p-10 rounded-[3rem] text-[#4A3B32] shadow-2xl"
             >
                <h3 className="text-2xl font-serif font-bold mb-8 text-center">Send Us a Message</h3>
                <form 
                  className="space-y-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    playSuccess();
                    alert("Thank you! We'll get back to you shortly.");
                  }}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-xs font-bold uppercase tracking-widest opacity-60">First Name</label>
                       <input required type="text" className="w-full bg-[#FAFAF7] border border-[#F3EFEA] rounded-xl px-4 py-3 focus:outline-none focus:border-[#D4A373]"/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold uppercase tracking-widest opacity-60">Last Name</label>
                       <input required type="text" className="w-full bg-[#FAFAF7] border border-[#F3EFEA] rounded-xl px-4 py-3 focus:outline-none focus:border-[#D4A373]"/>
                    </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold uppercase tracking-widest opacity-60">Email Address</label>
                     <input required type="email" className="w-full bg-[#FAFAF7] border border-[#F3EFEA] rounded-xl px-4 py-3 focus:outline-none focus:border-[#D4A373]"/>
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold uppercase tracking-widest opacity-60">Your Inquiry</label>
                     <textarea required className="w-full bg-[#FAFAF7] border border-[#F3EFEA] rounded-xl px-4 py-3 focus:outline-none focus:border-[#D4A373] h-32 resize-none"/>
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-[#4A3B32] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#D4A373] transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                     <Send size={18} />
                     Send Message
                  </button>
                </form>
             </motion.div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="about" className="py-24 bg-[#F3EFEA]/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Cake size={300} />
          </div>
          <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-16 items-center mb-16">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-serif font-bold mb-6">Our Commitment to Quality</h2>
              <p className="text-[#4A3B32]/70 leading-relaxed mb-6">
                At Sweet Delights, we believe that every celebration deserves a centerpiece that is as unique as the moment itself. Our bakers use only the finest organic ingredients, sourced locally whenever possible.
              </p>
              <div className="space-y-4">
                {[
                  "100% Organic Flours & Natural Sweeteners",
                  "No Artificial Preservatives or Colors",
                  "Handcrafted Decorations for Every Piece",
                  "Temperature-Controlled Professional Delivery"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Cake size={18} className="text-[#D4A373]" />
                    <span className="font-bold text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              <img src="https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&q=80&w=400" className="rounded-3xl shadow-lg mt-8" alt="Signature Cake Piece" referrerPolicy="no-referrer" />
              <img src="https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&q=80&w=400" className="rounded-3xl shadow-lg" alt="Colorful Artisan Cakes" referrerPolicy="no-referrer" />
            </motion.div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-12 border-t border-[#4A3B32]/5 pt-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6 text-[#D4A373]">
                <Clock size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Fresh Daily</h3>
              <p className="text-[#4A3B32]/60 text-sm">Every cake is baked on the day of delivery to ensure absolute freshness.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6 text-[#D4A373]">
                <Sparkles size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Artisan Design</h3>
              <p className="text-[#4A3B32]/60 text-sm">Hand-painted details and custom sugar work for every signature piece.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6 text-[#D4A373]">
                <Calendar size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Safe Delivery</h3>
              <p className="text-[#4A3B32]/60 text-sm">Temperature-controlled delivery within a 20km radius of the shop.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#4A3B32] text-white py-16 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-[#D4A373] rounded-lg flex items-center justify-center text-white">
                <Cake size={18} />
              </div>
              <span className="text-xl font-serif font-bold">Sweet Delights</span>
            </div>
            <p className="text-white/60 max-w-sm mb-8">
              Redefining the art of baking through technology and passion. Your local boutique for extraordinary celebration cakes.
            </p>
            <div className="flex gap-4">
              {/* Social icons would go here */}
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-6 pt-2">Shop</h4>
            <ul className="space-y-4 text-sm text-white/60">
              <li><a href="#menu" className="hover:text-white transition-colors">Classic Cakes</a></li>
              <li><a href="#menu" className="hover:text-white transition-colors">Custom Designs</a></li>
              <li><a href="#menu" className="hover:text-white transition-colors">Vegan Options</a></li>
              <li><a href="#menu" className="hover:text-white transition-colors">Monthly Specials</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 pt-2">Visit Us</h4>
            <ul className="space-y-4 text-sm text-white/60">
              <li>Lavelle Road, Bangalore</li>
              <li>Karnataka, India</li>
              <li>Mon-Sat: 09:00 - 18:00</li>
              <li>hello@sweetdelights.shop</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-white/10 mt-16 pt-8 text-center text-xs text-white/30">
          <p>© 2026 Sweet Delights Artisan Cakes. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
