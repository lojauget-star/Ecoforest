

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { PlanResponse, Feedback } from '../types';
import { PlantingSketch } from './PlantingSketch';
import { generatePlanPdf } from '../services/pdfService';
import { useI18n } from '../i18n';
import { 
  Calendar, 
  Lightbulb, 
  ArrowRight, 
  BookOpen, 
  MessageSquare, 
  PenTool, 
  FileDown, 
  Globe, 
  Search,
  Star,
  CheckCircle2,
  Loader2
} from 'lucide-react';


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
    <div className={`glass-card p-8 rounded-[2rem] shadow-futuristic border border-white/60 ${className || ''}`}>
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
    <div className="flex items-center space-x-4 mb-6">
      <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl shadow-sm">
        {icon}
      </div>
      <h3 className="text-2xl font-black text-gray-900 font-display tracking-tight">{children}</h3>
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
        return (
            <div className="bg-emerald-50 text-emerald-700 p-6 rounded-2xl text-center font-black uppercase tracking-widest text-xs border border-emerald-100 flex items-center justify-center gap-3">
                <CheckCircle2 className="w-5 h-5" />
                {t('feedback.submitted')}
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block">{t('feedback.rating_label')}</span>
                <div className="flex items-center space-x-3">
                    {[1, 2, 3, 4, 5].map(star => (
                        <button type="button" key={star} onClick={() => setRating(star)} className="focus:outline-none transition-all duration-200 hover:scale-125 active:scale-95 group">
                            <Star className={`h-8 w-8 transition-colors ${rating >= star ? 'text-yellow-400 fill-yellow-400 drop-shadow-sm' : 'text-gray-200 group-hover:text-yellow-200'}`} />
                        </button>
                    ))}
                </div>
            </div>
            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('feedback.notes_placeholder')}
                className="w-full h-32 p-4 bg-gray-50/50 text-gray-900 border border-transparent focus:bg-white rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none font-medium shadow-inner"
            />
            <button type="submit" className="w-full bg-emerald-600 text-white font-black text-xs uppercase tracking-[0.2em] py-4 px-6 rounded-2xl transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-xl active:scale-95">
                {t('feedback.submit_button')}
            </button>
        </form>
    );
}

const WfoSuggestions: React.FC<{ suggestions: string[] }> = ({ suggestions }) => {
    const { t } = useI18n();
    return (
        <Card>
            <SectionTitle icon={<Globe className="w-6 h-6" />}>{t('results.wfo_suggestions_title')}</SectionTitle>
            <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">{t('results.wfo_suggestions_desc')}</p>
            <div className="flex flex-wrap gap-2">
                {suggestions.map(species => (
                    <span key={species} className="bg-blue-50 text-blue-600 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full border border-blue-100">
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
            <SectionTitle icon={<Search className="w-6 h-6" />}>{t('results.find_inputs_title')}</SectionTitle>
            <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">{t('results.find_inputs_desc')}</p>
            <div className="flex flex-wrap gap-4">
                {speciesSample.map(s => (
                    <button 
                        key={s} 
                        onClick={() => onFind(s)}
                        className="px-6 py-3 text-xs font-black uppercase tracking-widest rounded-full transition-all duration-300 border bg-white text-gray-700 border-gray-100 hover:border-emerald-200 hover:text-emerald-700 hover:shadow-soft active:scale-95"
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
    <div className="space-y-10">
      <AnimatePresence mode="wait">
        <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
           key="wfo-suggestions"
        >
          {plan.wfo_suggestions && plan.wfo_suggestions.length > 0 && (
              <WfoSuggestions suggestions={plan.wfo_suggestions} />
          )}
        </motion.div>

        <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
           key="recommendation"
        >
          <Card>
            <SectionTitle icon={<Lightbulb className="w-6 h-6" />}>{t('results.recommendation_title')}</SectionTitle>
            <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
                <div className="text-gray-600 font-medium prose prose-sm max-w-none prose-p:text-gray-600 prose-strong:text-gray-900 flex-grow leading-relaxed" dangerouslySetInnerHTML={{ __html: plan.explanations.replace(/\n/g, '<br />') }}></div>
                <div className="text-center flex-shrink-0 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 min-w-[140px] relative overflow-hidden group">
                    <motion.div 
                        className="absolute inset-0 bg-emerald-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-700"
                        initial={false}
                    />
                    <div className={`text-5xl font-black font-display tracking-tighter relative z-10 ${plan.confidence_score > 0.7 ? 'text-emerald-600' : 'text-yellow-500'}`}>
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 0.5 }}
                        >
                            {(plan.confidence_score * 100).toFixed(0)}%
                        </motion.span>
                    </div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2 relative z-10">{t('results.confidence')}</div>
                </div>
            </div>
          </Card>
        </motion.div>

        {plan.animal_welfare_impact && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            key="animal-welfare"
          >
            <Card>
              <SectionTitle icon={<ArrowRight className="w-6 h-6" />}>{t('results.animal_welfare_title')}</SectionTitle>
              <div className="text-gray-600 font-medium prose prose-sm max-w-none prose-p:text-gray-600 prose-strong:text-gray-900 leading-relaxed" dangerouslySetInnerHTML={{ __html: plan.animal_welfare_impact.replace(/\n/g, '<br />') }}></div>
            </Card>
          </motion.div>
        )}
        
        <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
           key="find-inputs"
        >
          <FindInputsCard species={plan.wfo_suggestions || []} onFind={onFindProducersForSpecies} />
        </motion.div>

        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
           key="main-plan"
        >
          <Card>
            <div className="flex flex-col sm:flex-row justify-between items-center border-b border-white/20 mb-8 gap-4">
                <div className="flex bg-gray-100/50 p-1 rounded-2xl">
                    <button 
                        onClick={() => setActiveTab('schedule')}
                        className={`flex items-center space-x-2 py-3 px-6 font-black text-[10px] uppercase tracking-widest transition-all rounded-xl ${activeTab === 'schedule' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <Calendar className="w-4 h-4" />
                        <span>{t('results.schedule_tab')}</span>
                    </button>
                     <button 
                        onClick={() => setActiveTab('sketch')}
                        className={`flex items-center space-x-2 py-3 px-6 font-black text-[10px] uppercase tracking-widest transition-all rounded-xl ${activeTab === 'sketch' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <PenTool className="w-4 h-4" />
                        <span>{t('results.sketch_tab')}</span>
                    </button>
                </div>
                 <button
                    onClick={handleExportPdf}
                    disabled={isExporting}
                    className="flex items-center space-x-3 bg-emerald-50 text-emerald-600 font-black text-[10px] uppercase tracking-widest py-3 px-6 rounded-full border border-emerald-100 hover:bg-emerald-100 transition-all active:scale-95 disabled:opacity-50"
                >
                    {isExporting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{t('pdf.button_exporting')}</span>
                        </>
                    ) : (
                        <>
                            <FileDown className="w-4 h-4" />
                            <span>{t('pdf.button_export')}</span>
                        </>
                    )}
                </button>
            </div>
            
            <div className={activeTab === 'schedule' ? 'animate-fade-in' : 'hidden'}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/20">
                          <th className="py-4 px-6 font-black text-gray-400 uppercase text-[10px] tracking-[0.2em]">{t('results.schedule_col_species')}</th>
                          <th className="py-4 px-6 font-black text-gray-400 uppercase text-[10px] tracking-[0.2em]">{t('results.schedule_col_year')}</th>
                          <th className="py-4 px-6 font-black text-gray-400 uppercase text-[10px] tracking-[0.2em]">{t('results.schedule_col_strata')}</th>
                          <th className="py-4 px-6 font-black text-gray-400 uppercase text-[10px] tracking-[0.2em] hidden md:table-cell">{t('results.schedule_col_notes')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 text-sm font-medium">
                        {plan.succession_schedule.map((step, index) => (
                          <motion.tr 
                            key={index} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + (index * 0.05) }}
                            className="hover:bg-emerald-50/30 transition-colors group"
                          >
                            <td className="py-5 px-6 text-gray-900 font-black font-display tracking-tight group-hover:text-emerald-700">{step.species}</td>
                            <td className="py-5 px-6 text-gray-500"><span className="bg-gray-100 px-2 py-1 rounded-md text-[10px] font-black uppercase mr-1">{t('results.schedule_year_prefix')}</span> {step.plant_year}</td>
                            <td className="py-5 px-6"><span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{step.strata}</span></td>
                            <td className="py-5 px-6 text-gray-400 leading-relaxed italic hidden md:table-cell">"{step.notes}"</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                </div>
            </div>

            <div className={`${activeTab === 'sketch' ? 'animate-fade-in' : 'hidden'} bg-gray-50/50 p-6 rounded-[2rem] border border-white/40 shadow-inner`} ref={sketchContainerRef}>
                <PlantingSketch plan={plan} />
            </div>
          </Card>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <motion.div
             initial={{ opacity: 0, x: -30 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
             key="references"
           >
             <Card>
                <SectionTitle icon={<BookOpen className="w-6 h-6" />}>{t('results.references_title')}</SectionTitle>
                <ul className="space-y-3">
                    {plan.references.map(ref => (
                        <li key={ref.id} className="flex items-center group cursor-pointer">
                           <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-3 group-hover:scale-150 transition-transform"></div>
                           <span className="text-gray-600 hover:text-emerald-600 font-medium transition-colors border-b border-transparent hover:border-emerald-200">
                               {ref.title}
                           </span>
                        </li>
                    ))}
                </ul>
            </Card>
           </motion.div>

           <motion.div
             initial={{ opacity: 0, x: 30 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
             key="feedback"
           >
             <Card>
                <SectionTitle icon={<MessageSquare className="w-6 h-6" />}>{t('results.feedback_title')}</SectionTitle>
                <FeedbackForm onSubmit={onSubmitFeedback} submitted={feedbackSubmitted} />
            </Card>
           </motion.div>
        </div>
      </AnimatePresence>
    </div>
  );
}
