import { useState, useEffect } from 'react';
import { erpService, StudentProfile } from '../services/erpService';

const ERP_BASE_URL = import.meta.env.VITE_ERP_BASE_URL || 'https://learnschool.online';

function resolveImageUrl(image: string | undefined): string | undefined {
  if (!image) return undefined;
  if (image.startsWith('/private/')) return undefined;
  if (image.startsWith('http')) return image;
  return `${ERP_BASE_URL}${image}`;
}

export function useStudentProfile(studentId: string | undefined) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await erpService.getStudentById(studentId);
        if (!cancelled && data) {
          data.image = resolveImageUrl(data.image);
          setProfile(data);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Profile load nahi ho saki');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId]);

  return { profile, setProfile, loading, error };
}