
import React from 'react';
import { useI18n } from '../i18n';

function InfoIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

export function Disclaimer() {
  const { t } = useI18n();
  return (
    <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-6 rounded-r-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <InfoIcon />
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-bold text-emerald-900">{t('disclaimer.title')}</h3>
          <p className="mt-2 text-sm">
            {t('disclaimer.p1')}
          </p>
          <p className="mt-2 text-sm font-semibold text-emerald-900">
            {t('disclaimer.p2')}
          </p>
           <p className="mt-4 text-sm">
            {t('disclaimer.p3')}
          </p>
        </div>
      </div>
    </div>
  );
}