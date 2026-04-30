
import React from 'react';
import { motion } from 'motion/react';
import { useI18n } from '../i18n';
import type { AppView } from '../App';
import { 
    LayoutGrid, 
    Users, 
    AlertTriangle, 
} from 'lucide-react';

const BrotaLogo = ({ className = "h-8 w-8 text-emerald-600" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20v-10" className="animate-pulse" />
        <path d="M12 10a4 4 0 1 0-8 0c0 2.4 1.9 4.3 3.5 5" />
        <path d="M12 10a4 4 0 1 1 8 0c0 2.4-1.9 4.3-3.5 5" />
    </svg>
);

interface NavbarProps {
    currentView: AppView;
    onViewChange: (view: AppView) => void;
}

export function Navbar({ currentView, onViewChange }: NavbarProps) {
    const { t, language, changeLanguage } = useI18n();

    const bottomNavItemStyle = "flex flex-col items-center justify-center flex-1 py-1 transition-all duration-300 relative group";
    const bottomNavIconStyle = "w-6 h-6 mb-1 transition-transform group-hover:scale-110 group-active:scale-90";
    const bottomNavTextStyle = "text-[9px] font-bold uppercase tracking-[0.15em] transition-colors";

    const langButtonStyle = "px-1.5 py-1 text-[10px] font-black rounded-lg flex items-center justify-center transition-all min-w-[32px] h-[32px] tracking-tight";
    const activeLangStyle = "bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400";
    const inactiveLangStyle = "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50";
    
    const handleViewChange = (view: AppView) => {
        onViewChange(view);
    };

    const languageSwitcher = (
         <div className="flex items-center space-x-1 p-1 bg-white/40 backdrop-blur-md rounded-xl border border-white/40 shadow-sm">
            {['pt', 'en', 'de'].map((lang) => (
                <button 
                    key={lang}
                    onClick={() => changeLanguage(lang as any)} 
                    className={`${langButtonStyle} ${language === lang ? activeLangStyle : inactiveLangStyle}`}
                >
                    {lang.toUpperCase()}
                </button>
            ))}
        </div>
    );

    return (
        <>
            {/* Top Header - Floating Glass Island */}
            <header className="fixed top-3 left-0 right-0 z-50 flex items-center justify-center px-4 sm:px-10 pointer-events-none">
                <div className="glass-card max-w-7xl w-full h-12 rounded-xl px-4 sm:px-8 flex justify-between items-center bg-white/45 shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-white/60 backdrop-blur-3xl pointer-events-auto">
                    <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => handleViewChange('planner')}>
                        <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg group-hover:scale-110 transition-all">
                            <BrotaLogo className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-gray-900 leading-none tracking-tight font-display">{t('header.title').toUpperCase()}</span>
                            <span className="text-[7px] font-black text-emerald-600 uppercase tracking-[0.2em] leading-none mt-0.5 opacity-80">{t('header.subtitle')}</span>
                        </div>
                    </div>
                    
                    {/* Desktop Language Switcher */}
                    <div className="hidden md:block">
                        {languageSwitcher}
                    </div>

                    {/* Mobile Language Switcher (Compact) */}
                    <div className="md:hidden scale-75 origin-right">
                        {languageSwitcher}
                    </div>
                </div>
            </header>

            {/* Bottom Fixed Nav - Modern docked pill */}
            <div 
                className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 sm:px-6 pointer-events-none"
                style={{ paddingBottom: `calc(24px + env(safe-area-inset-bottom))` }}
            >
                <nav className="glass-card w-full max-w-md h-16 rounded-[1.25rem] px-4 shadow-[0_-10px_40px_rgba(0,0,0,0.12)] border-t border-white/40 flex items-center justify-around pointer-events-auto ring-1 ring-white/30 backdrop-blur-3xl bg-white/90">
                    {[
                        { id: 'planner', icon: LayoutGrid, label: 'header.planner' },
                        { id: 'producers', icon: Users, label: 'header.producers' },
                        { id: 'risk', icon: AlertTriangle, label: 'header.risk' }
                    ].map((item) => {
                        const isActive = currentView === item.id;
                        return (
                            <button 
                                key={item.id}
                                onClick={() => handleViewChange(item.id as AppView)}
                                className={`${bottomNavItemStyle} ${isActive ? 'text-emerald-700' : 'text-gray-400 hover:text-emerald-500'}`}
                            >
                                <div className="relative flex flex-col items-center">
                                    {isActive && (
                                        <motion.div 
                                            layoutId="pillHighlight"
                                            className="absolute -inset-x-4 -inset-y-1 bg-emerald-500/10 rounded-xl"
                                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                    <item.icon className={`${bottomNavIconStyle} ${isActive ? 'scale-110' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                                    <span className={`${bottomNavTextStyle} ${isActive ? 'opacity-100 font-black' : 'opacity-60 font-bold'}`}>
                                        {t(item.label)}
                                    </span>
                                    
                                    {isActive && (
                                        <motion.div 
                                            layoutId="navIndicator"
                                            className="absolute -bottom-1.5 w-8 h-1 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                        />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </nav>
            </div>
            
            {/* Safety area spacer for bottom nav */}
            <div className="h-32 sm:hidden pointer-events-none" />
        </>
    );
}
