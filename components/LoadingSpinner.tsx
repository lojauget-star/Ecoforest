
import React from 'react';
import { useI18n } from '../i18n';

export function LoadingSpinner() {
    const { t } = useI18n();
    const messages = [
        t('loading.message1'),
        t('loading.message2'),
        t('loading.message3'),
        t('loading.message4'),
        t('loading.message5'),
    ];
    const [message, setMessage] = React.useState(messages[0]);

    React.useEffect(() => {
        const intervalId = setInterval(() => {
            setMessage(prevMessage => {
                const currentIndex = messages.indexOf(prevMessage);
                const nextIndex = (currentIndex + 1) % messages.length;
                return messages[nextIndex];
            });
        }, 2500);

        return () => clearInterval(intervalId);
    }, [messages]);

  return (
    <div className="flex flex-col items-center justify-center bg-white p-8 rounded-xl shadow-soft">
       <svg width="64" height="64" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="text-emerald-600">
            <style>{`.spinner_DupU{animation:spinner_sM3D 1.2s linear infinite}.spinner_GWtZ{animation:spinner_sM3D 1.2s linear infinite;animation-delay:-.1s}.spinner_dwN6{animation:spinner_sM3D 1.2s linear infinite;animation-delay:-.2s}.spinner_46QP{animation:spinner_sM3D 1.2s linear infinite;animation-delay:-.3s}.spinner_PD82{animation:spinner_sM3D 1.2s linear infinite;animation-delay:-.4s}.spinner_eUgh{animation:spinner_sM3D 1.2s linear infinite;animation-delay:-.5s}.spinner_eUaP{animation:spinner_sM3D 1.2s linear infinite;animation-delay:-.6s}.spinner_j38w{animation:spinner_sM3D 1.2s linear infinite;animation-delay:-.7s}.spinner_Wb3w{animation:spinner_sM3D 1.2s linear infinite;animation-delay:-.8s}.spinner_3L2O{animation:spinner_sM3D 1.2s linear infinite;animation-delay:-.9s}.spinner_vC1J{animation:spinner_sM3D 1.2s linear infinite;animation-delay:-1s}.spinner_4v46{animation:spinner_sM3D 1.2s linear infinite;animation-delay:-1.1s}@keyframes spinner_sM3D{0%,50%{width:7.3px;height:7.3px}25%{width:1.8px;height:1.8px}}`}</style>
            <rect className="spinner_DupU" x="1" y="1" rx="1" width="7.3" height="7.3" fill="currentColor"/>
            <rect className="spinner_GWtZ" x="8.3" y="1" rx="1" width="7.3" height="7.3" fill="currentColor"/>
            <rect className="spinner_dwN6" x="15.7" y="1" rx="1" width="7.3" height="7.3" fill="currentColor"/>
            <rect className="spinner_46QP" x="1" y="8.3" rx="1" width="7.3" height="7.3" fill="currentColor"/>
            <rect className="spinner_PD82" x="8.3" y="8.3" rx="1" width="7.3" height="7.3" fill="currentColor"/>
            <rect className="spinner_eUgh" x="15.7" y="8.3" rx="1" width="7.3" height="7.3" fill="currentColor"/>
            <rect className="spinner_eUaP" x="1" y="15.7" rx="1" width="7.3" height="7.3" fill="currentColor"/>
            <rect className="spinner_j38w" x="8.3" y="15.7" rx="1" width="7.3" height="7.3" fill="currentColor"/>
            <rect className="spinner_Wb3w" x="15.7" y="15.7" rx="1" width="7.3" height="7.3" fill="currentColor"/>
        </svg>
        <p className="mt-6 text-lg font-semibold text-gray-900">{t('loading.title')}</p>
        <p className="mt-2 text-gray-600 transition-opacity duration-500">{message}</p>
    </div>
  );
}