

import React, { useState, useRef } from 'react';
import type { PlanResponse, Feedback } from '../types';
import { PlantingSketch } from './PlantingSketch';
import { generatePlanPdf } from '../services/pdfService';
import { useI18n } from '../i18n';


interface ResultsDisplayProps {
  plan: PlanResponse;
  onSubmitFeedback: (feedback: Omit<Feedback, 'plan_id'>) => void;
  feedbackSubmitted: boolean;
  onFindProducersForSpecies: (speciesName: string) => void;
}

// FIX: Add children to props type to allow component to have child elements.
interface CardProps {
  className?: string;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div className={`bg-white p-6 rounded-xl shadow-soft ${className || ''}`}>
      {children}
    </div>
  );
}

// FIX: Add children to props type to allow component to have child elements.
interface SectionTitleProps {
  icon: React.ReactNode;
  children: React.ReactNode;
}

const SectionTitle: React.FC<SectionTitleProps> = ({ children, icon }) => {
  return (
    <div className="flex items-center space-x-3 mb-4">
      <div className="bg-gray-100 p-3 rounded-full text-emerald-600">{icon}</div>
      <h3 className="text-xl font-bold text-gray-900">{children}</h3>
    </div>
  );
}

// --- Icons ---
function CalendarIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
}
function BulbIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
}
function AnimalIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>; // Placeholder icon, you can replace this with a better animal icon if you have one
}
function BookIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
}
function FeedbackIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>;
}
function SketchIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V16" /></svg>;
}
function PdfIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
}
function GlobeIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h8a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.707 4.564A9 9 0 1016.293 19.436M12 21a9 9 0 00-3.293-14.872" /></svg>;
}
function SearchIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
}


// --- Components ---

interface FeedbackFormProps {
    onSubmit: (feedback: Omit<Feedback, 'plan_id'>) => void;
    submitted: boolean;
}

function FeedbackForm({ onSubmit, submitted }: FeedbackFormProps) {
    const { t } = useI18n();
    const [rating, setRating] = useState(0);
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (rating > 0) {
            onSubmit({ rating, notes });
            setRating(0);
            setNotes('');
        }
    };
    
    if (submitted) {
        return <div className="bg-emerald-100 text-emerald-800 p-4 rounded-lg text-center font-medium">{t('feedback.submitted')}</div>
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <span className="text-gray-600 mb-2 block text-sm">{t('feedback.rating_label')}:</span>
                <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map(star => (
                        <button type="button" key={star} onClick={() => setRating(star)} className="focus:outline-none transition-transform duration-200 hover:scale-125">
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 ${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                        </button>
                    ))}
                </div>
            </div>
            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('feedback.notes_placeholder')}
                className="w-full h-24 p-3 bg-gray-100 text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition duration-200"
            />
            <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed shadow-soft hover:bg-emerald-700 active:bg-emerald-800">
                {t('feedback.submit_button')}
            </button>
        </form>
    );
}

const WfoSuggestions: React.FC<{ suggestions: string[] }> = ({ suggestions }) => {
    const { t } = useI18n();
    return (
        <Card>
            <SectionTitle icon={<GlobeIcon />}>{t('results.wfo_suggestions_title')}</SectionTitle>
            <p className="text-sm text-gray-500 mb-4">{t('results.wfo_suggestions_desc')}</p>
            <div className="flex flex-wrap gap-2">
                {suggestions.map(species => (
                    <span key={species} className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                        {species}
                    </span>
                ))}
            </div>
        </Card>
    );
};

interface FindInputsCardProps {
    species: string[];
    onFind: (speciesName: string) => void;
}

const FindInputsCard: React.FC<FindInputsCardProps> = ({ species, onFind }) => {
    const { t } = useI18n();

    if (!species || species.length === 0) {
        return null;
    }
    
    // Take a unique sample of species to not overwhelm the UI
    const speciesSample = [...new Set(species)].slice(0, 5);

    return (
        <Card>
            <SectionTitle icon={<SearchIcon />}>{t('results.find_inputs_title')}</SectionTitle>
            <p className="text-sm text-gray-500 mb-4">{t('results.find_inputs_desc')}</p>
            <div className="flex flex-wrap gap-3">
                {speciesSample.map(s => (
                    <button 
                        key={s} 
                        onClick={() => onFind(s)}
                        className="px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 border bg-white text-gray-700 border-gray-300 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-700"
                    >
                        {t('results.find_button_prefix')} "{s}"
                    </button>
                ))}
            </div>
        </Card>
    );
};

export function ResultsDisplay({ plan, onSubmitFeedback, feedbackSubmitted, onFindProducersForSpecies }: ResultsDisplayProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'schedule' | 'sketch'>('schedule');
  const sketchContainerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExportPdf = async () => {
    if (!sketchContainerRef.current) {
        alert(t('pdf.error_sketch'));
        return;
    }
    
    setIsExporting(true);
    try {
        const pdfTranslations = {
            title: t('pdf.title'),
            recommendation_title: t('results.recommendation_title'),
            sketch_title: t('results.sketch_title'),
            schedule_title: t('results.schedule_title'),
            schedule_col_species: t('results.schedule_col_species'),
            schedule_col_year: t('results.schedule_col_year'),
            schedule_col_strata: t('results.schedule_col_strata'),
            schedule_year_prefix: t('results.schedule_year_prefix'),
            references_title: t('results.references_title'),
        };
      await generatePlanPdf(plan, sketchContainerRef.current, pdfTranslations);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert(t('pdf.error_generic'));
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <div className="space-y-8 animate-fade-in">
      {plan.wfo_suggestions && plan.wfo_suggestions.length > 0 && (
          <WfoSuggestions suggestions={plan.wfo_suggestions} />
      )}
      <Card>
        <SectionTitle icon={<BulbIcon />}>{t('results.recommendation_title')}</SectionTitle>
        <div className="flex justify-between items-start">
            <div className="text-gray-600 prose prose-sm max-w-none prose-p:text-gray-600 prose-strong:text-gray-800 pr-4" dangerouslySetInnerHTML={{ __html: plan.explanations.replace(/\n/g, '<br />') }}></div>
            <div className="text-center ml-4 flex-shrink-0">
                <div className={`text-4xl font-black ${plan.confidence_score > 0.7 ? 'text-emerald-600' : 'text-yellow-500'}`}>
                    {(plan.confidence_score * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-gray-500 uppercase tracking-wider">{t('results.confidence')}</div>
            </div>
        </div>
      </Card>

      {plan.animal_welfare_impact && (
        <Card>
          <SectionTitle icon={<AnimalIcon />}>{t('results.animal_welfare_title')}</SectionTitle>
          <div className="text-gray-600 prose prose-sm max-w-none prose-p:text-gray-600 prose-strong:text-gray-800" dangerouslySetInnerHTML={{ __html: plan.animal_welfare_impact.replace(/\n/g, '<br />') }}></div>
        </Card>
      )}
      
      <FindInputsCard species={plan.wfo_suggestions || []} onFind={onFindProducersForSpecies} />

      <Card>
        <div className="flex justify-between items-center border-b border-gray-200 mb-4">
            <div className="flex">
                <button 
                    onClick={() => setActiveTab('schedule')}
                    className={`flex items-center space-x-2 py-3 px-4 font-semibold text-sm transition-colors relative ${activeTab === 'schedule' ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <CalendarIcon />
                    <span>{t('results.schedule_tab')}</span>
                    {activeTab === 'schedule' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t-full"></div>}
                </button>
                 <button 
                    onClick={() => setActiveTab('sketch')}
                    className={`flex items-center space-x-2 py-3 px-4 font-semibold text-sm transition-colors relative ${activeTab === 'sketch' ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <SketchIcon />
                    <span>{t('results.sketch_tab')}</span>
                     {activeTab === 'sketch' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t-full"></div>}
                </button>
            </div>
             <button
                onClick={handleExportPdf}
                disabled={isExporting}
                className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-200 disabled:cursor-not-allowed border border-gray-300"
            >
                {isExporting ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span>{t('pdf.button_exporting')}</span>
                    </>
                ) : (
                    <>
                        <PdfIcon />
                        <span>{t('pdf.button_export')}</span>
                    </>
                )}
            </button>
        </div>
        
        <div className={activeTab === 'schedule' ? 'animate-fade-in' : 'hidden'}>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b-2 border-gray-200">
                    <tr>
                      <th className="py-3 px-4 font-semibold text-gray-500 uppercase text-xs tracking-wider">{t('results.schedule_col_species')}</th>
                      <th className="py-3 px-4 font-semibold text-gray-500 uppercase text-xs tracking-wider">{t('results.schedule_col_year')}</th>
                      <th className="py-3 px-4 font-semibold text-gray-500 uppercase text-xs tracking-wider">{t('results.schedule_col_strata')}</th>
                      <th className="py-3 px-4 font-semibold hidden md:table-cell text-gray-500 uppercase text-xs tracking-wider">{t('results.schedule_col_notes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.succession_schedule.map((step, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4 font-medium text-gray-800">{step.species}</td>
                        <td className="py-4 px-4 text-gray-600">{t('results.schedule_year_prefix')} {step.plant_year}</td>
                        <td className="py-4 px-4 text-gray-600 capitalize">{step.strata}</td>
                        <td className="py-4 px-4 text-gray-600 text-sm hidden md:table-cell">{step.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
        </div>

        <div className={`${activeTab === 'sketch' ? 'animate-fade-in' : 'hidden'} bg-gray-50 p-4 rounded-lg border border-gray-200`} ref={sketchContainerRef}>
            <PlantingSketch plan={plan} />
        </div>

      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <Card>
            <SectionTitle icon={<BookIcon />}>{t('results.references_title')}</SectionTitle>
            <ul className="space-y-2">
                {plan.references.map(ref => (
                    <li key={ref.id} className="text-emerald-700 hover:text-emerald-800 underline cursor-pointer transition-colors text-sm">
                       {ref.title}
                    </li>
                ))}
            </ul>
        </Card>
         <Card>
            <SectionTitle icon={<FeedbackIcon />}>{t('results.feedback_title')}</SectionTitle>
            <FeedbackForm onSubmit={onSubmitFeedback} submitted={feedbackSubmitted} />
        </Card>
      </div>

    </div>
  );
}