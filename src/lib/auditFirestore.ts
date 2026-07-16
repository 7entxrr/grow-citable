import { db } from './firebase';
import { doc, setDoc, getDoc, collection, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { AnalysisResult } from '@/types/analysis';

interface AuditCheck {
  name: string;
  status: "good" | "warning" | "poor";
  comment: string;
}

export interface AuditData {
  id?: string;
  url: string;
  timestamp: Timestamp;
  crawl: {
    title: string;
    description: string;
    wordCount: number;
    isIndexable: boolean;
    canonicalIssue: string;
    headings: { [key: string]: number };
    linksCount: number;
    internalLinksCount: number;
    externalLinksCount: number;
    crawlDepth: number;
    duplicateContent: string;
    brokenLinks: number;
    totalCrawled: number;
    sitemapUrlsCount: number;
    sitemapValid: boolean;
    sitemapError: string;
    orphanPages: string[];
    duplicateContentList: Array<{ title: string; urls: string[] }>;
    crawledPagesList: Array<{
      url: string;
      title: string;
      description: string;
      wordCount: number;
      headings: { [key: string]: number };
      isIndexable: boolean;
      canonical: string;
      canonicalIssue: 'ok' | 'missing' | 'mismatch';
      depth: number;
      status: number;
      thinContent: boolean;
    }>;
  };
  aiReadability: {
    score: number;
    checks: AuditCheck[];
  };
  geo: {
    score: number;
    checks: AuditCheck[];
  };
  aeo: {
    score: number;
    checks: AuditCheck[];
  };
  aiVisibility?: Array<{
    name: string;
    mentions: number;
    cited: number;
    status: string;
  }>;
  analyzeData?: AnalysisResult;
}

/**
 * Save audit results to Firestore
 */
export async function saveAuditToFirestore(userId: string, auditData: AuditData): Promise<void> {
  try {
    const domain = new URL(auditData.url).hostname;
    const docId = domain.replace(/^www\./, "").toLowerCase();
    
    const auditRef = doc(db, 'users', userId, 'audits', docId);
    
    // Clean and prune the data to fit within Firestore's 1MB limit
    const cleanedCrawl = { ...auditData.crawl };
    if (cleanedCrawl.crawledPagesList) {
      cleanedCrawl.crawledPagesList = cleanedCrawl.crawledPagesList.map(page => {
        // Strip large unused fields like headings and description from individual page items
        const { headings, description, ...rest } = page as any;
        return rest;
      });
    }

    await setDoc(auditRef, {
      ...auditData,
      crawl: cleanedCrawl,
      createdAt: Timestamp.now(),
      domain: domain,
    });
    
    console.log('Audit saved successfully to Firestore');
  } catch (error) {
    console.error('Error saving audit to Firestore:', error);
    throw error;
  }
}

/**
 * Fetch all audits for a user from Firestore
 */
export async function getUserAudits(userId: string): Promise<AuditData[]> {
  try {
    const auditsRef = collection(db, 'users', userId, 'audits');
    const q = query(auditsRef, orderBy('createdAt', 'desc'), limit(20));
    const querySnapshot = await getDocs(q);
    
    const audits: AuditData[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as AuditData;
      data.id = doc.id;
      audits.push(data);
    });
    
    return audits;
  } catch (error) {
    console.error('Error fetching user audits:', error);
    throw error;
  }
}

/**
 * Fetch a single audit by its document ID
 */
export async function getAuditById(userId: string, auditId: string): Promise<AuditData | null> {
  try {
    const auditRef = doc(db, 'users', userId, 'audits', auditId);
    const auditSnap = await getDoc(auditRef);
    
    if (!auditSnap.exists()) {
      console.warn(`Audit ${auditId} not found for user ${userId}`);
      return null;
    }
    
    const data = auditSnap.data() as AuditData;
    data.id = auditSnap.id;
    return data;
  } catch (error) {
    console.error('Error fetching audit by ID:', error);
    throw error;
  }
}

/**
 * Fetch the most recent audit for a user
 */
export async function getLatestAudit(userId: string): Promise<AuditData | null> {
  try {
    const audits = await getUserAudits(userId);
    return audits.length > 0 ? audits[0] : null;
  } catch (error) {
    console.error('Error fetching latest audit:', error);
    throw error;
  }
}

/**
 * Check if user has any audits
 */
export async function hasUserAudits(userId: string): Promise<boolean> {
  try {
    const audits = await getUserAudits(userId);
    return audits.length > 0;
  } catch (error) {
    console.error('Error checking user audits:', error);
    return false;
  }
}
