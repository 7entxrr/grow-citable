'use client';
import { ComingSoonPage } from '@/components/ComingSoonPage';
import { Image, MousePointer, Ruler, Clock, Zap, Smartphone } from 'lucide-react';
export default function Phase19Page() {
  return <ComingSoonPage phase={19} title="Core Web Vitals Monitor" badgeLabel="Performance Lab" badgeIcon={<Zap size={32} />} accentColor="#b45309" features={[{icon:<Image size={18} />,label:'LCP Score'},{icon:<MousePointer size={18} />,label:'FID / INP'},{icon:<Ruler size={18} />,label:'CLS Score'},{icon:<Clock size={18} />,label:'TTFB'},{icon:<Zap size={18} />,label:'FCP'},{icon:<Smartphone size={18} />,label:'Mobile vs Desktop'}]} />;
}
