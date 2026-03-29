
import React, { useState } from 'react';
import { useI18n } from '../i18n';
import type { AppView } from '../App';

const BrotaLogo = () => (
    <svg className="h-9 w-9 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20v-10" />
        <path d="M12 10a4 4 0 1 0-8 0c0 2.4 1.9 4.3 3.5 5" />
        <path d="M12 10a4 4 0 1 1 8 0c0 2.4-1.9 4.3-3.5 5" />
    </svg>
);

const MenuIcon = () => (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const CloseIcon = () => (
     <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

interface NavbarProps {
    currentView: AppView;
    onViewChange: (view: AppView) => void;
}

export function Navbar({ currentView, onViewChange }: NavbarProps) {
    const { t, language, changeLanguage } = useI18n();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navButtonStyle = "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200";
    const activeNavStyle = "bg-gray-100 text-emerald-600 font-semibold";
    const inactiveNavStyle = "text-gray-500 hover:text-gray-900 hover:bg-gray-100/50";

    const langButtonStyle = "px-3 py-1 text-sm font-semibold rounded-md transition-all";
    const activeLangStyle = "bg-white text-emerald-700 shadow-sm";
    const inactiveLangStyle = "text-gray-500 hover:text-gray-900";
    
    const handleViewChange = (view: AppView) => {
        onViewChange(view);
        setIsMenuOpen(false); // Close menu on navigation
    };

    const navLinks = (
        <>
            <button onClick={() => handleViewChange('planner')} className={`${navButtonStyle} ${currentView === 'planner' ? activeNavStyle : inactiveNavStyle}`} aria-pressed={currentView === 'planner'}>
                {t('header.planner')}
            </button>
            <button onClick={() => handleViewChange('producers')} className={`${navButtonStyle} ${currentView === 'producers' ? activeNavStyle : inactiveNavStyle}`} aria-pressed={currentView === 'producers'}>
                {t('header.producers')}
            </button>
            <button onClick={() => handleViewChange('risk')} className={`${navButtonStyle} ${currentView === 'risk' ? activeNavStyle : inactiveNavStyle}`} aria-pressed={currentView === 'risk'}>
                {t('header.risk')}
            </button>
        </>
    );

    const languageSwitcher = (
         <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button onClick={() => changeLanguage('pt')} className={`${langButtonStyle} ${language === 'pt' ? activeLangStyle : inactiveLangStyle}`}>PT</button>
            <button onClick={() => changeLanguage('en')} className={`${langButtonStyle} ${language === 'en' ? activeLangStyle : inactiveLangStyle}`}>EN</button>
        </div>
    );

    return (
        <>
            <header className="bg-white/80 backdrop-blur-md fixed top-4 left-1/2 -translate-x-1/2 z-30 rounded-full shadow-md border border-gray-200/80 w-[95%] max-w-screen-2xl">
                <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo and Title */}
                        <div className="flex items-center space-x-3">
                            <BrotaLogo />
                            <h1 className="text-2xl font-bold text-gray-900">{t('header.title')}</h1>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden lg:flex items-center justify-center space-x-2">
                           {navLinks}
                        </div>

                        {/* Right side icons & Mobile Menu Button */}
                        <div className="flex items-center space-x-4">
                           <div className="hidden lg:block">{languageSwitcher}</div>
                             <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-900" aria-label={t('navbar.open_menu')}>
                                <MenuIcon />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="lg:hidden fixed inset-0 bg-white/95 backdrop-blur-md z-50 animate-fade-in" role="dialog" aria-modal="true">
                     <div className="flex justify-between items-center h-20 px-4 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                            <BrotaLogo />
                            <h1 className="text-2xl font-bold text-gray-900">{t('header.title')}</h1>
                        </div>
                         <button onClick={() => setIsMenuOpen(false)} className="p-2 rounded-md text-gray-500 hover:text-gray-900">
                            <CloseIcon />
                        </button>
                    </div>
                    <nav className="flex flex-col items-center space-y-8 p-8 mt-10">
                        <div className="flex flex-col items-center space-y-6">
                            {navLinks}
                        </div>
                        <div className="pt-8">
                           {languageSwitcher}
                        </div>
                    </nav>
                </div>
            )}
        </>
    );
}