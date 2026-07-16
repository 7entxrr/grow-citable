'use client';
import { ComingSoonPage } from '@/components/ComingSoonPage';
import { FileText, ShoppingCart, HelpCircle, Building2, Star, Map, Dna } from 'lucide-react';
export default function Phase16Page() {
  return <ComingSoonPage phase={16} title="Schema Markup Generator" badgeLabel="Schema Engine" badgeIcon={<Dna size={32} />} accentColor="#0891b2" features={[{icon:<FileText size={18} />,label:'Article Schema'},{icon:<ShoppingCart size={18} />,label:'Product Schema'},{icon:<HelpCircle size={18} />,label:'FAQ Schema'},{icon:<Building2 size={18} />,label:'LocalBusiness'},{icon:<Star size={18} />,label:'Review Schema'},{icon:<Map size={18} />,label:'BreadcrumbList'}]} />;
}
