import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { Profile } from '../types/index.js';
import { Language, translations } from '../i18n/translations.js';
import { CertificatesTableView } from './common/CertificatesTableView.js';
import { DriveCertificateData } from './common/CertificateCard.js';

interface CitizenCertificatesViewProps {
  lang: Language;
  user: Profile | null;
  onBack?: () => void;
  onExploreDrives?: () => void;
}

export const CitizenCertificatesView: React.FC<CitizenCertificatesViewProps> = ({
  lang,
  user,
  onBack,
  onExploreDrives
}) => {
  const t = translations[lang];
  const [certificates, setCertificates] = useState<DriveCertificateData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCertificates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMyCertificates();
      if (res.success && Array.isArray(res.data)) {
        setCertificates(res.data);
      } else {
        setCertificates([]);
      }
    } catch (err: any) {
      console.error('Failed to load certificates:', err);
      setError(err.message || 'Unable to load certificates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, [user?.id]);

  return (
    <div className="space-y-4 pb-20 max-w-7xl mx-auto px-2 sm:px-4 md:px-6 animate-fadeIn">
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
          {error}
        </div>
      )}

      <CertificatesTableView
        certificates={certificates}
        loading={loading}
        onRefresh={fetchCertificates}
        role="citizen"
        title={t.nav_certificates || 'My Verified Certificates'}
        subtitle="Official QR-verified certificates issued by Navsari Municipal Corporation for cleanliness drive participation and civic leadership."
      />
    </div>
  );
};
