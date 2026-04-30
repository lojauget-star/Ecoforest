import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import type { Producer, Seal, SealId, QuizAnswers, Product } from '../types';
import { useI18n } from '../i18n';
import { getSustainabilityTips } from '../services/apiService';
import { Search, Filter, Plus, Heart, X, Info, Scan, BarChart3, Activity, Award } from 'lucide-react';

// --- MOCK DATA ---
const sealsData: Seal[] = [
    { id: 'organic', name: 'Orgânico Certificado', description: 'Produtos cultivados sem o uso de pesticidas sintéticos, OGM ou fertilizantes químicos, seguindo práticas que promovem o equilíbrio ecológico.' },
    { id: 'fair_trade', name: 'Comércio Justo (Fair Trade)', description: 'Garante que os produtores recebam um preço justo por seus produtos, além de promover condições de trabalho seguras e desenvolvimento comunitário.' },
    { id: 'humane_certified', name: 'Bem-Estar Animal', description: 'Certifica que os animais são criados com espaço, conforto e a capacidade de expressar comportamentos naturais, sem gaiolas ou confinamento extremo.' }
];

const producersData: Producer[] = [
    { 
        id: 1, 
        name: 'Fazenda Orgânica Sol Nascente', 
        location: { lat: -27.59, lng: -48.54 }, 
        products: [
            { name: 'Alface Crespa Orgânica', description: 'Fresquinha e crocante, colhida no dia.', price: 'R$ 4,50 / maço', image: 'https://images.pexels.com/photos/2893636/pexels-photo-2893636.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
            { name: 'Ovos Caipiras', description: 'Dúzias de ovos de galinhas criadas soltas.', price: 'R$ 15,00 / dúzia', image: 'https://images.pexels.com/photos/162701/egg-white-food-protein-162701.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
            { name: 'Tomate Italiano Orgânico', description: 'Ideal para molhos, docinho e saboroso.', price: 'R$ 8,00 / kg', image: 'https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
        ], 
        seals: ['organic'], 
        story: 'Somos uma família de agricultores dedicada a produzir alimentos saudáveis e livres de agrotóxicos, cuidando do solo e da biodiversidade local há mais de 20 anos.', 
        image: 'https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' 
    },
    { 
        id: 2, 
        name: 'Sítio Café com Leite Feliz', 
        location: { lat: -27.62, lng: -48.49 }, 
        products: [
            { name: 'Café Arábica Especial', description: 'Grãos selecionados, torra média, notas de chocolate.', price: 'R$ 35,00 / 250g', image: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
            { name: 'Queijo Minas Frescal', description: 'Feito com leite cru de nossas vacas felizes.', price: 'R$ 25,00 / peça', image: 'https://images.pexels.com/photos/821365/pexels-photo-821365.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
        ], 
        seals: ['fair_trade', 'humane_certified'], 
        story: 'Nosso café é cultivado à sombra de árvores nativas e nossas vacas pastam livremente, resultando em produtos de alta qualidade e com respeito ao meio ambiente e aos animais.', 
        image: 'https://images.pexels.com/photos/6803623/pexels-photo-6803623.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' 
    },
    { 
        id: 3, 
        name: 'Apiário Doce Natureza', 
        location: { lat: -27.55, lng: -48.51 }, 
        products: [
            { name: 'Mel Silvestre Orgânico', description: 'Puro e natural, extraído de floradas nativas.', price: 'R$ 30,00 / 500g', image: 'https://images.pexels.com/photos/2646/honey-dipper-spoon-drizzle-2646.jpg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
        ], 
        seals: ['organic'], 
        story: 'Cuidamos de nossas abelhas em uma área de mata nativa preservada, garantindo um mel puro e delicioso, que contribui para a polinização e saúde do ecossistema.', 
        image: 'https://images.pexels.com/photos/7983637/pexels-photo-7983637.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' 
    },
    {
        id: 4,
        name: 'Viveiro de Mudas Nativas',
        location: { lat: -27.65, lng: -48.55 },
        products: [
            { name: 'Mudas de Ipê Amarelo', description: 'Árvore nativa de grande porte e floração exuberante.', price: 'R$ 25,00 / muda', image: 'https://images.pexels.com/photos/2886937/pexels-photo-2886937.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
            { name: 'Mudas de Manacá da Serra', description: 'Perfeita para paisagismo e atração de pássaros.', price: 'R$ 20,00 / muda', image: 'https://images.pexels.com/photos/1098460/pexels-photo-1098460.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
            { name: 'Mudas de Bananeira', description: 'Produza suas próprias bananas em casa.', price: 'R$ 15,00 / muda', image: 'https://images.pexels.com/photos/225017/pexels-photo-225017.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
        ],
        seals: [],
        story: 'Especializados na produção de mudas de espécies nativas da Mata Atlântica, ajudando a reflorestar e preservar a nossa biodiversidade.',
        image: 'https://images.pexels.com/photos/4750275/pexels-photo-4750275.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1'
    }
];


// --- ICONS ---
const SealIcon = ({ sealId }: { sealId: SealId }) => {
    switch (sealId) {
        case 'organic': return <Award className="w-3.5 h-3.5" />;
        case 'fair_trade': return <Activity className="w-3.5 h-3.5" />;
        case 'humane_certified': return <Heart className="w-3.5 h-3.5" />;
        default: return null;
    }
};

const getSealColor = (sealId: SealId) => {
    switch (sealId) {
        case 'organic': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'fair_trade': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'humane_certified': return 'bg-pink-100 text-pink-800 border-pink-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
};

// --- FEATURE CARD ICONS ---
const SealsCardIcon = () => <Award className="h-12 w-12 text-emerald-600" />;
const ScanCardIcon = () => <Scan className="h-12 w-12 text-blue-600" />;
const ImpactCardIcon = () => <BarChart3 className="h-12 w-12 text-purple-600" />;


// --- SUB-COMPONENTS ---

function ProducerMap({ producers, activeProducer, onSelectProducer }: { producers: Producer[], activeProducer: Producer | null, onSelectProducer: (p: Producer) => void }) {
    const mapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<{ [key: number]: L.Marker }>({});
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const markersLayerRef = useRef<L.LayerGroup>(new L.LayerGroup());
    
    const defaultIcon = L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] });
    const activeIcon = L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });

    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([-27.6, -48.5], 12);
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                maxZoom: 19
            }).addTo(map);
            L.control.zoom({ position: 'bottomright' }).addTo(map);
            markersLayerRef.current.addTo(map);
            mapRef.current = map;
        }
    }, []);

    useEffect(() => {
        if (!mapRef.current) return;

        markersLayerRef.current.clearLayers();
        markersRef.current = {};

        producers.forEach(p => {
            const marker = L.marker(p.location, { icon: defaultIcon })
                .addTo(markersLayerRef.current)
                .bindPopup(`<b>${p.name}</b>`)
                .on('click', () => onSelectProducer(p));
            markersRef.current[p.id] = marker;
        });

    }, [producers, onSelectProducer]);

    useEffect(() => {
        if (mapRef.current) {
            Object.values(markersRef.current).forEach((m: L.Marker) => m.setIcon(defaultIcon));
            if (activeProducer) {
                const activeMarker = markersRef.current[activeProducer.id];
                if (activeMarker) {
                    activeMarker.setIcon(activeIcon);
                }
                mapRef.current.flyTo(activeProducer.location, 14);
            }
        }
    }, [activeProducer]);

    return <div ref={mapContainerRef} className="h-[80vh] w-full rounded-2xl shadow-futuristic overflow-hidden" />;
}

interface ProducerCardProps {
    producer: Producer;
    onSelect: (p: Producer) => void;
}

const ProducerCard: React.FC<ProducerCardProps> = ({ producer, onSelect }) => {
    const { t } = useI18n();
    return (
        <div onClick={() => onSelect(producer)} className="flex p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.98] relative group">
            <img src={producer.image} alt={producer.name} className="w-16 h-16 rounded-lg object-cover shadow-sm bg-gray-50 flex-shrink-0" />
            
            <div className="flex-1 ml-4 pr-12 min-w-0">
                <h3 className="font-bold text-gray-900 truncate font-display tracking-tight text-base">{producer.name}</h3>
                
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {producer.products.slice(0, 3).map(p => (
                        <span key={p.name} className="text-[10px] font-black uppercase tracking-wider text-emerald-600/80 bg-emerald-50/50 px-2 py-0.5 rounded-full border border-emerald-100/50 truncate max-w-[100px]">
                            {p.name}
                        </span>
                    ))}
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {producer.seals.map(sealId => (
                        <span key={sealId} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight border ${getSealColor(sealId)}`}>
                            <SealIcon sealId={sealId} />
                            {t(`seals.${sealId}.name`)}
                        </span>
                    ))}
                </div>
            </div>

            <div className="absolute bottom-4 right-4 flex gap-2">
                <button className="w-8 h-8 bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full flex items-center justify-center transition-all">
                    <Plus className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 bg-gray-50 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-full flex items-center justify-center transition-all">
                    <Heart className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
    return (
        <div className="flex items-center space-x-5 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-soft transition-all group">
            <img src={product.image} alt={product.name} className="w-20 h-20 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform" />
            <div className="flex-1">
                <h5 className="font-black text-gray-900 font-display tracking-tight text-sm">{product.name}</h5>
                <p className="text-xs text-gray-400 font-medium mt-0.5 leading-relaxed">{product.description}</p>
                <div className="flex items-center justify-between mt-3">
                    <p className="text-sm font-black text-emerald-600">{product.price}</p>
                    <button className="bg-emerald-50 text-emerald-600 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function ProducerDetail({ producer, onBack }: { producer: Producer, onBack: () => void }) {
    const { t } = useI18n();
    return (
        <div className="glass-card p-6 rounded-3xl h-full flex flex-col animate-fade-in shadow-futuristic">
            <button onClick={onBack} className="flex items-center text-xs font-black text-emerald-600 hover:text-emerald-700 mb-6 self-start uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-full transition-all active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                {t('producers.back_to_list')}
            </button>
            <div className="relative group overflow-hidden rounded-2xl mb-6">
                <img src={producer.image} alt={producer.name} className="w-full h-48 object-cover shadow-md group-hover:scale-105 transition-transform duration-700"/>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
            <div className="space-y-6 overflow-y-auto pr-2 flex-grow custom-scrollbar">
                <h2 className="text-3xl font-black text-gray-900 font-display tracking-tight leading-tight">{producer.name}</h2>
                <div>
                    <h4 className="font-black text-gray-400 uppercase text-[10px] tracking-[0.2em] mb-2">{t('producers.story')}</h4>
                    <p className="text-gray-600 text-sm leading-relaxed font-medium">{producer.story}</p>
                </div>
                <div>
                    <h4 className="font-black text-gray-400 uppercase text-[10px] tracking-[0.2em] mb-4">{t('producers.products_available')}</h4>
                    <div className="space-y-4">
                        {producer.products.map(product => (
                            <ProductCard key={product.name} product={product} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}


function QuizModal({ onClose }: { onClose: () => void }) {
    const { t, language } = useI18n();
    const [answers, setAnswers] = useState<QuizAnswers>({});
    const [step, setStep] = useState<'quiz' | 'loading' | 'results'>('quiz');
    const [tips, setTips] = useState('');
    const [error, setError] = useState('');

    const questions = [
        { id: 'consumo_animal', title: t('quiz.q1_title'), options: [t('quiz.q1_opt1'), t('quiz.q1_opt2'), t('quiz.q1_opt3')] },
        { id: 'transporte', title: t('quiz.q2_title'), options: [t('quiz.q2_opt1'), t('quiz.q2_opt2'), t('quiz.q2_opt3')] },
        { id: 'compras', title: t('quiz.q3_title'), options: [t('quiz.q3_opt1'), t('quiz.q3_opt2'), t('quiz.q3_opt3')] }
    ];

    const handleAnswer = (qid: string, answer: string) => {
        setAnswers(prev => ({...prev, [qid]: answer}));
    };

    const handleSubmit = async () => {
        setStep('loading');
        setError('');
        try {
            const result = await getSustainabilityTips(answers, language as any);
            setTips(result);
            setStep('results');
        } catch (err) {
            setError(t('quiz.error'));
            setStep('quiz');
        }
    }

    return (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-white/20 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-8 border-b border-gray-50">
                    <h2 className="text-2xl font-black text-gray-900 font-display tracking-tight">
                        {step === 'results' ? t('quiz.your_tips') : t('quiz.title')}
                    </h2>
                    <button onClick={onClose} className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-full flex items-center justify-center transition-all active:scale-90 font-bold"><X className="w-5 h-5"/></button>
                </div>

                <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                    {step === 'quiz' && (
                        <>
                            {questions.map(q => (
                                <div key={q.id}>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">{q.title}</p>
                                    <div className="flex flex-col space-y-3">
                                        {q.options.map(opt => (
                                            <label key={opt} className={`flex items-center p-4 rounded-2xl cursor-pointer transition-all duration-300 border ${answers[q.id] === opt ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/20' : 'bg-gray-50/50 border-transparent hover:bg-gray-100'}`}>
                                                <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt} onChange={() => handleAnswer(q.id, opt)} className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300" />
                                                <span className="ml-4 text-sm font-bold text-gray-700">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
                        </>
                    )}

                    {step === 'loading' && (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="relative w-16 h-16 mb-6">
                                <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin"></div>
                            </div>
                            <p className="font-black text-gray-900 font-display tracking-tight text-xl">{t('quiz.getting_tips')}</p>
                            <p className="text-gray-400 text-sm font-medium mt-2">{t('producers.ai_analyzing_routine')}</p>
                        </div>
                    )}
                    
                    {step === 'results' && (
                        <div className="prose prose-sm max-w-none prose-p:text-gray-600 prose-p:leading-relaxed prose-strong:text-gray-900 prose-strong:font-black">
                            <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 mb-6">
                                <p className="text-emerald-800 font-medium !m-0">
                                    {t('producers.quiz_results_summary')}
                                </p>
                            </div>
                            <div dangerouslySetInnerHTML={{ __html: tips.replace(/\n/g, '<br />') }} />
                        </div>
                    )}
                </div>
                
                <div className="p-8 border-t border-gray-50 mt-auto">
                    {step === 'quiz' && (
                        <button 
                            onClick={handleSubmit} 
                            disabled={Object.keys(answers).length !== questions.length}
                             className="w-full bg-emerald-600 text-white font-black text-xs uppercase tracking-[0.2em] py-5 px-6 rounded-2xl transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:shadow-[0_15px_40px_rgba(16,185,129,0.4)] active:scale-[0.98]"
                        >
                            {t('quiz.get_tips')}
                        </button>
                    )}
                     {step !== 'quiz' && (
                        <button onClick={onClose} className="w-full bg-gray-50 text-gray-500 font-black text-xs uppercase tracking-[0.2em] py-4 px-6 rounded-2xl hover:bg-gray-100 transition-all active:scale-95 border border-gray-200/50">
                            {t('quiz.close')}
                        </button>
                     )}
                </div>
            </div>
        </div>
    );
}


const Modal: React.FC<{onClose: () => void, title: string, children: React.ReactNode}> = ({onClose, title, children}) => (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={onClose}>
        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-white/20 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-8 border-b border-gray-50">
                <h2 className="text-2xl font-black text-gray-900 font-display tracking-tight">{title}</h2>
                <button onClick={onClose} className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-full flex items-center justify-center transition-all active:scale-90 font-bold"><X className="w-5 h-5"/></button>
            </div>
            {children}
        </div>
    </div>
);

function SealsModal({ onClose }: { onClose: () => void }) {
    const { t } = useI18n();
    return (
        <Modal onClose={onClose} title={t('modals.seals_title')}>
            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                {sealsData.map(seal => {
                    const producersWithSeal = producersData.filter(p => p.seals.includes(seal.id));
                    return (
                        <div key={seal.id} className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100 group transition-all hover:bg-white hover:shadow-soft">
                            <div className="flex items-start space-x-5">
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <SealIcon sealId={seal.id} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-black text-gray-900 font-display tracking-tight">{t(`seals.${seal.id}.name`)}</h3>
                                    <p className="text-sm text-gray-500 font-medium mt-1 leading-relaxed">{t(`seals.${seal.id}.description`)}</p>
                                </div>
                            </div>
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <h4 className="font-black text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-3">{t('modals.producers_with_seal')}</h4>
                                {producersWithSeal.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {producersWithSeal.map(p => (
                                            <span key={p.id} className="text-[10px] font-black uppercase tracking-widest bg-white border border-gray-100 text-gray-500 px-3 py-1.5 rounded-full shadow-sm">
                                                {p.name}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 font-medium italic">{t('modals.no_producers_with_seal')}</p>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </Modal>
    );
}

function ImpactModal({ onClose }: { onClose: () => void }) {
    const { t } = useI18n();
    const impactData = {
        water: 1250,
        co2: 85,
        income: 450.75
    };
    return (
       <Modal onClose={onClose} title={t('modals.impact_title')}>
            <div className="p-8 space-y-6">
                <p className="text-center text-sm text-gray-500 font-medium">{t('modals.total_impact')}</p>
                <div className="grid grid-cols-1 gap-4">
                    <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-[2rem] group hover:bg-white transition-all hover:shadow-soft flex items-center gap-6">
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 flex-shrink-0">
                            <Info className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1">{t('modals.impact_metric1')}</p>
                            <p className="text-4xl font-black text-blue-600 font-display tracking-tight group-hover:scale-105 transition-transform origin-left">{impactData.water.toLocaleString()} <span className="text-sm font-black opacity-50">L</span></p>
                        </div>
                    </div>
                     <div className="p-6 bg-gray-50 border border-gray-200 rounded-[2rem] group hover:bg-white transition-all hover:shadow-soft flex items-center gap-6">
                        <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center text-gray-600 flex-shrink-0">
                            <Activity className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">{t('modals.impact_metric2')}</p>
                            <p className="text-4xl font-black text-gray-800 font-display tracking-tight group-hover:scale-105 transition-transform origin-left">{impactData.co2.toLocaleString()} <span className="text-sm font-black opacity-50">kg</span></p>
                        </div>
                    </div>
                     <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-[2rem] group hover:bg-white transition-all hover:shadow-soft flex items-center gap-6">
                        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 flex-shrink-0">
                            <BarChart3 className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1">{t('modals.impact_metric3')}</p>
                            <p className="text-4xl font-black text-emerald-600 font-display tracking-tight group-hover:scale-105 transition-transform origin-left">R$ {impactData.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 p-6 rounded-2xl flex items-start gap-4">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                        <Info className="h-5 w-5" />
                    </div>
                    <p className="text-xs text-gray-400 font-medium leading-relaxed">
                        {t('producers.impact_footnote')}
                    </p>
                </div>
            </div>
       </Modal>
    );
}

function ScanModal({ onClose }: { onClose: () => void }) {
    const { t } = useI18n();
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const startCamera = async () => {
            setError(null);
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        streamRef.current = stream;
                    }
                } catch (err) {
                    console.error("Error accessing camera:", err);
                    setError(t('modals.camera_error'));
                }
            }
        };

        startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [t]);

    return (
        <Modal onClose={onClose} title={t('modals.scan_title')}>
            <div className="p-4 aspect-square bg-gray-900 flex items-center justify-center relative">
                {error ? (
                    <p className="text-white text-center p-4">{error}</p>
                ) : (
                    <>
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover rounded-lg" />
                        <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                            <div className="w-full h-full border-2 border-emerald-500 rounded-lg shadow-[0_0_0_1000px_rgba(0,0,0,0.4)]"></div>
                        </div>
                    </>
                )}
            </div>
            <div className="p-4 text-center text-sm text-gray-500 border-t border-gray-200">
                {t('modals.scan_instruction')}
            </div>
        </Modal>
    );
}

function ProducerRegistrationModal({ onClose }: { onClose: () => void }) {
    const { t } = useI18n();
    const [producerName, setProducerName] = useState('');
    const [story, setStory] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [currentProduct, setCurrentProduct] = useState({ name: '', description: '', price: '', image: '' });
    
    const inputClasses = "w-full px-4 py-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none font-medium";
    const labelClasses = "block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2";


    const handleAddProduct = () => {
        if (currentProduct.name && currentProduct.price) {
            setProducts(prev => [...prev, currentProduct]);
            setCurrentProduct({ name: '', description: '', price: '', image: '' });
        }
    };

    const handleRegistrationSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onClose();
    };

    return (
        <Modal onClose={onClose} title={t('producers.register_title')}>
             <form onSubmit={handleRegistrationSubmit} className="flex-grow contents">
                <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                    <p className="text-sm text-gray-500 -mt-4 leading-relaxed">{t('producers.register_subtitle')}</p>
                    <div className="space-y-4">
                         <div>
                            <label className={labelClasses}>{t('producers.producer_name')}</label>
                            <input type="text" value={producerName} onChange={e => setProducerName(e.target.value)} className={inputClasses} required />
                        </div>
                        <div>
                            <label className={labelClasses}>{t('producers.producer_story')}</label>
                            <textarea value={story} onChange={e => setStory(e.target.value)} rows={4} className={`${inputClasses} resize-none`} placeholder={t('producers.story_placeholder')} required />
                        </div>
                    </div>
                    
                    <div className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Plus className="w-5 h-5 text-emerald-600" />
                            <h3 className="font-black text-emerald-900 font-display tracking-tight">{t('producers.add_product')}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" placeholder={t('producers.product_name')} value={currentProduct.name} onChange={e => setCurrentProduct(p => ({...p, name: e.target.value}))} className={inputClasses}/>
                            <input type="text" placeholder={t('producers.product_price')} value={currentProduct.price} onChange={e => setCurrentProduct(p => ({...p, price: e.target.value}))} className={inputClasses}/>
                        </div>
                        <input type="text" placeholder={t('producers.product_description')} value={currentProduct.description} onChange={e => setCurrentProduct(p => ({...p, description: e.target.value}))} className={inputClasses}/>
                        <input type="url" placeholder={t('producers.product_image_url')} value={currentProduct.image} onChange={e => setCurrentProduct(p => ({...p, image: e.target.value}))} className={inputClasses}/>
                        <button type="button" onClick={handleAddProduct} className="w-full bg-emerald-100 text-emerald-700 font-black text-[10px] uppercase tracking-widest py-3 rounded-xl hover:bg-emerald-200 transition-all active:scale-95 border border-emerald-200">{t('producers.save_product')}</button>
                    </div>
                    
                    <div>
                        <h3 className={labelClasses}>{t('producers.products_added')}</h3>
                        {products.length > 0 ? (
                            <div className="space-y-3">
                                {products.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden">
                                                {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <BarChart3 className="w-5 h-5 text-gray-300" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{p.name}</p>
                                                <p className="text-xs text-emerald-600 font-black">{p.price}</p>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => setProducts(prods => prods.filter((_, idx) => idx !== i))} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-xs text-gray-400 font-medium italic">{t('producers.no_products_added')}</p>}
                    </div>

                </div>
                <div className="p-8 border-t border-gray-50 mt-auto">
                    <button type="submit" className="w-full bg-emerald-600 text-white font-black text-xs uppercase tracking-[0.2em] py-5 px-6 rounded-2xl transition-all duration-300 ease-in-out shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:shadow-[0_15px_40px_rgba(16,185,129,0.4)] active:scale-[0.98]">{t('producers.submit_registration')}</button>
                </div>
            </form>
        </Modal>
    );
}

function FilterBottomSheet({ onClose }: { onClose: () => void }) {
    const { t } = useI18n();
    return (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md z-[110] flex items-end justify-center animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-t-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black text-gray-900 font-display tracking-tight">{t('producers.filters_title')}</h2>
                    <button onClick={onClose} className="w-10 h-10 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100"><X className="w-5 h-5"/></button>
                </div>
                
                <div className="space-y-8">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">{t('producers.product_category')}</label>
                        <div className="flex flex-wrap gap-2">
                            {['fruits', 'vegetables_cat', 'dairy', 'eggs', 'saplings', 'coffee'].map(cat => (
                                <button key={cat} className="px-4 py-2 rounded-full border border-gray-100 bg-gray-50 text-xs font-bold text-gray-600 hover:border-emerald-500 hover:text-emerald-600 transition-all">
                                    {t(`categories.${cat}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">{t('producers.certification')}</label>
                        <div className="flex flex-wrap gap-2">
                            {['organic', 'fair_trade', 'animal_welfare', 'agroecological'].map(cert => (
                                <button key={cert} className="px-4 py-2 rounded-full border border-gray-100 bg-gray-50 text-xs font-bold text-gray-600 hover:border-emerald-500 hover:text-emerald-600 transition-all">
                                    {t(`certifications.${cert}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">{t('producers.max_distance')}</label>
                        <input type="range" className="w-full h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                        <div className="flex justify-between mt-2 text-[10px] font-black text-gray-400 uppercase">
                            <span>0km</span>
                            <span>50km+</span>
                        </div>
                    </div>

                    <button onClick={onClose} className="w-full bg-emerald-600 text-white font-black text-xs uppercase tracking-[0.2em] py-5 px-6 rounded-2xl transition-all shadow-lg active:scale-95 mt-4">
                        {t('producers.apply_filters')}
                    </button>
                </div>
            </div>
        </div>
    );
}


// --- MAIN COMPONENT ---

interface ProducersViewProps {
  filter: string | null;
  onClearFilter: () => void;
}

export function ProducersView({ filter, onClearFilter }: ProducersViewProps) {
    const { t } = useI18n();
    const [activeProducer, setActiveProducer] = useState<Producer | null>(null);
    const [isQuizOpen, setQuizOpen] = useState(false);
    const [isSealsModalOpen, setSealsModalOpen] = useState(false);
    const [isImpactModalOpen, setImpactModalOpen] = useState(false);
    const [isScanModalOpen, setScanModalOpen] = useState(false);
    const [isRegisterModalOpen, setRegisterModalOpen] = useState(false);
    const [isFilterSheetOpen, setFilterSheetOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredProducers = useMemo(() => {
        let list = producersData;
        const query = searchQuery.toLowerCase() || filter?.toLowerCase();
        
        if (query) {
            const searchTerms = [query];
            if (query.endsWith('s')) {
                searchTerms.push(query.slice(0, -1));
            } else {
                searchTerms.push(query + 's');
            }
            if (query.includes('banana')) {
                searchTerms.push('bananeira');
            }

            list = producersData.filter(producer =>
                producer.name.toLowerCase().includes(query) ||
                producer.products.some(product =>
                    searchTerms.some(term => product.name.toLowerCase().includes(term))
                )
            );
        }
        return list;
    }, [filter, searchQuery]);

    useEffect(() => {
        if (activeProducer && !filteredProducers.find(p => p.id === activeProducer.id)) {
            setActiveProducer(null);
        }
    }, [filter, filteredProducers, activeProducer]);

    return (
        <div className="animate-fade-in space-y-8 pb-20 relative">
            <div className="text-center mb-16">
                <h1 className="text-5xl lg:text-7xl font-black text-gray-900 tracking-tight font-display mb-4">
                    {t('producers.title')}
                </h1>
                <p className="text-gray-500 font-medium text-lg max-w-2xl mx-auto leading-relaxed">
                    {t('producers.description')}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                <div onClick={() => setSealsModalOpen(true)} className="group p-8 glass-card rounded-[2.5rem] shadow-futuristic hover:bg-white transition-all cursor-pointer flex flex-col items-center justify-center text-center active:scale-95 border border-white/50">
                    <div className="p-6 bg-emerald-50 text-emerald-600 rounded-3xl group-hover:scale-110 transition-transform mb-6">
                        <Award className="h-12 w-12" />
                    </div>
                    <h3 className="font-black text-xl text-gray-900 font-display tracking-tight">{t('producers.know_the_seals')}</h3>
                    <p className="text-xs text-gray-400 font-medium mt-2 leading-relaxed px-4">{t('producers.know_the_seals_desc')}</p>
                </div>
                
                <div onClick={() => setScanModalOpen(true)} className="group p-8 glass-card rounded-[2.5rem] shadow-futuristic hover:bg-white transition-all cursor-pointer flex flex-col items-center justify-center text-center active:scale-95 border border-white/50">
                    <div className="p-6 bg-blue-50 text-blue-600 rounded-3xl group-hover:scale-110 transition-transform mb-6">
                        <Scan className="h-12 w-12" />
                    </div>
                    <h3 className="font-black text-xl text-gray-900 font-display tracking-tight">{t('producers.track_product')}</h3>
                    <p className="text-xs text-gray-400 font-medium mt-2 leading-relaxed px-4">{t('producers.track_product_desc')}</p>
                </div>

                <div onClick={() => setImpactModalOpen(true)} className="group p-8 glass-card rounded-[2.5rem] shadow-futuristic hover:bg-white transition-all cursor-pointer flex flex-col items-center justify-center text-center active:scale-95 border border-white/50">
                    <div className="p-6 bg-purple-50 text-purple-600 rounded-3xl group-hover:scale-110 transition-transform mb-6">
                        <BarChart3 className="h-12 w-12" />
                    </div>
                    <h3 className="font-black text-xl text-gray-900 font-display tracking-tight">{t('producers.your_impact')}</h3>
                    <p className="text-xs text-gray-400 font-medium mt-2 leading-relaxed px-4">{t('producers.your_impact_desc')}</p>
                </div>

                <div 
                    onClick={() => setQuizOpen(true)} 
                    className="group p-8 bg-white rounded-[2.5rem] shadow-futuristic hover:shadow-soft transition-all flex flex-col items-center justify-center text-center w-full active:scale-95 border border-white/50 cursor-pointer"
                  >
                    <div className="p-6 bg-emerald-50 text-emerald-600 rounded-3xl group-hover:scale-110 transition-transform mb-6">
                        <Activity className="h-12 w-12" />
                    </div>
                    <h3 className="font-black text-xl w-full font-display tracking-tight text-gray-900">{t('producers.take_quiz_button')}</h3>
                    <p className="text-xs text-gray-400 font-medium mt-2 leading-relaxed px-4">{t('producers.take_quiz_button_desc')}</p>
                    <button className="mt-6 w-full border-2 border-emerald-600 text-emerald-600 font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-xl hover:bg-emerald-600 hover:text-white transition-all">
                        {t('common.start')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 xl:col-span-3 h-[80vh] flex flex-col gap-4">
                    {/* Search & Filter Bar */}
                    <div className="flex gap-3 px-1">
                        <div className="relative flex-grow group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-600 transition-colors" />
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('producers.search_placeholder')}
                                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-sm font-medium transition-all"
                            />
                        </div>
                        <button 
                            onClick={() => setFilterSheetOpen(true)}
                            className="bg-white border border-gray-100 p-3 rounded-2xl shadow-sm hover:bg-gray-50 active:scale-95 transition-all text-gray-400 hover:text-emerald-600"
                        >
                            <Filter className="w-5 h-5" />
                        </button>
                    </div>

                    {activeProducer ? (
                        <ProducerDetail producer={activeProducer} onBack={() => setActiveProducer(null)} />
                    ) : (
                        <div className="glass-card p-4 rounded-[2rem] h-full flex flex-col shadow-futuristic border border-white/50">
                             <div className="flex justify-between items-center mb-6 pt-2 px-2">
                                <h3 className="font-black text-gray-900 font-display tracking-tight">
                                    {filteredProducers.length} <span className="text-gray-400 text-xs font-medium ml-1">{t('producers.producers_count')}</span>
                                </h3>
                                {filter && (
                                    <button onClick={onClearFilter} className="text-[10px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-100 px-3 py-1.5 rounded-full hover:bg-emerald-50">
                                        {t('producers.clear_filter')}: {filter}
                                    </button>
                                )}
                            </div>
                            <div className="space-y-4 overflow-y-auto pr-1 flex-grow custom-scrollbar">
                                {filteredProducers.length > 0 ? (
                                    filteredProducers.map(p => (
                                        <ProducerCard key={p.id} producer={p} onSelect={setActiveProducer} />
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-12 text-center">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                            <Info className="w-8 h-8 text-gray-200" />
                                        </div>
                                        <p className="text-gray-400 font-medium text-sm">{t('producers.no_producers_found')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-8 xl:col-span-9">
                    <ProducerMap producers={filteredProducers} activeProducer={activeProducer} onSelectProducer={setActiveProducer} />
                </div>
            </div>

            {/* Floating Action Button (FAB) */}
            <button 
                onClick={() => setRegisterModalOpen(true)}
                className="fixed bottom-8 right-8 w-16 h-16 bg-emerald-600 text-white rounded-full shadow-[0_15px_30px_rgba(16,185,129,0.4)] hover:bg-emerald-700 hover:scale-110 active:scale-95 transition-all z-40 flex items-center justify-center group"
                title={t('producers.register_button')}
            >
                <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
                <span className="absolute right-full mr-4 bg-emerald-900/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    {t('producers.register_button')}
                </span>
            </button>

            {isQuizOpen && <QuizModal onClose={() => setQuizOpen(false)} />}
            {isSealsModalOpen && <SealsModal onClose={() => setSealsModalOpen(false)} />}
            {isImpactModalOpen && <ImpactModal onClose={() => setImpactModalOpen(false)} />}
            {isScanModalOpen && <ScanModal onClose={() => setScanModalOpen(false)} />}
            {isRegisterModalOpen && <ProducerRegistrationModal onClose={() => setRegisterModalOpen(false)} />}
            {isFilterSheetOpen && <FilterBottomSheet onClose={() => setFilterSheetOpen(false)} />}
        </div>
    );
}
