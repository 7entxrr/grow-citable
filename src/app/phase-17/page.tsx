'use client';
import { ComingSoonPage } from '@/components/ComingSoonPage';
import { BarChart3, Target, Brain, Lightbulb, TrendingUp, Search, Key } from 'lucide-react';
export default function Phase17Page() {
  return <ComingSoonPage phase={17} title="Keyword Research Tool" badgeLabel="Keyword Engine" badgeIcon={<Key size={32} />} accentColor="#be185d" features={[{icon:<BarChart3 size={18} />,label:'Volume Data'},{icon:<Target size={18} />,label:'Difficulty Score'},{icon:<Brain size={18} />,label:'Semantic Clusters'},{icon:<Lightbulb size={18} />,label:'Related Keywords'},{icon:<TrendingUp size={18} />,label:'Trend Analysis'},{icon:<Search size={18} />,label:'SERP Preview'}]} />;
}
