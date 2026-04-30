
import React from 'react';
import { useI18n } from '../i18n';
import type { AppView } from '../App';
import { 
    LayoutGrid, 
    Users, 
    AlertTriangle, 
} from 'lucide-react';

const BrotaLogo = ({ className = "h-8 w-8 text-emerald-600" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20v-10" />
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

    const bottomNavItemStyle = "flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 relative";
    const bottomNavIconStyle = "w-6 h-6 mb-1";
    const bottomNavTextStyle = "text-[10px] font-bold uppercase tracking-wider";

    const langButtonStyle = "px-2 py-1 text-xs font-bold rounded flex items-center justify-center transition-all min-w-[28px] h-[28px]";
    const activeLangStyle = "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600";
    const inactiveLangStyle = "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700";
    
    const handleViewChange = (view: AppView) => {
        onViewChange(view);
    };

    const languageSwitcher = (
         <div className="flex items-center space-x-1.5 p-1 bg-gray-50 rounded-lg border border-gray-100">
            <button 
                onClick={() => changeLanguage('pt')} 
                className={`${langButtonStyle} ${language === 'pt' ? activeLangStyle : inactiveLangStyle}`}
                title="Português"
            >
                PT
            </button>
            <button 
                onClick={() => changeLanguage('en')} 
                className={`${langButtonStyle} ${language === 'en' ? activeLangStyle : inactiveLangStyle}`}
                title="English"
            >
                EN
            </button>
            <button 
                onClick={() => changeLanguage('de')} 
                className={`${langButtonStyle} ${language === 'de' ? activeLangStyle : inactiveLangStyle}`}
                title="Deutsch"
            >
                DE
            </button>
        </div>
    );

    return (
        <>
            {/* Top Header - Compact for logo and language */}
            <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 h-14 flex items-center">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex justify-between items-center">
                    <div className="flex items-center space-x-2 cursor-pointer" onClick={() => handleViewChange('planner')}>
                        <BrotaLogo className="h-6 w-6 text-emerald-600" />
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-gray-900 leading-none">BROTA</span>
                            <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest leading-none mt-0.5">Agrofloresta</span>
                        </div>
                    </div>
                    {languageSwitcher}
                </div>
            </header>

            {/* Bottom/Footer Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 px-2 pb-safe-area-inset-bottom sm:pb-0 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] selection:bg-emerald-100">
                <div className="max-w-md mx-auto flex items-center justify-around h-16">
                    <button 
                        onClick={() => handleViewChange('planner')}
                        className={`${bottomNavItemStyle} ${currentView === 'planner' ? 'text-emerald-600' : 'text-gray-400'}`}
                    >
                        <LayoutGrid className={bottomNavIconStyle} />
                        <span className={bottomNavTextStyle}>{t('header.planner')}</span>
                        {currentView === 'planner' && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-600 rounded-full" />}
                    </button>

                    <button 
                        onClick={() => handleViewChange('producers')}
                        className={`${bottomNavItemStyle} ${currentView === 'producers' ? 'text-emerald-600' : 'text-gray-400'}`}
                    >
                        <Users className={bottomNavIconStyle} />
                        <span className={bottomNavTextStyle}>{t('header.producers')}</span>
                        {currentView === 'producers' && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-600 rounded-full" />}
                    </button>

                    <button 
                        onClick={() => handleViewChange('risk')}
                        className={`${bottomNavItemStyle} ${currentView === 'risk' ? 'text-emerald-600' : 'text-gray-400'}`}
                    >
                        <AlertTriangle className={bottomNavIconStyle} />
                        <span className={bottomNavTextStyle}>{t('header.risk')}</span>
                        {currentView === 'risk' && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-600 rounded-full" />}
                    </button>
                </div>
            </nav>
        </>
    );
}
