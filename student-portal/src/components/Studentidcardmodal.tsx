import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface StudentIDCardData {
  student_id: string;
  student_name: string;
  grade?: string;    // e.g. "Grade 4"
  program?: string;  // fallback agar grade na ho
  email?: string;
  image?: string;
}

interface StudentIDCardModalProps {
  student: StudentIDCardData | null;
  onClose: () => void;
}

// ── School constants (apni actual details yahan set kar lein) ───────────────

const SCHOOL_NAME    = 'Learn Academy';
const SUPPORT_EMAIL  = 'info@learnschoolacademy.com';
const SUPPORT_PHONE  = '923181142457';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

// Diagonal chevron header (front + back dono cards ke liye same)
const CardHeader: React.FC<{ subtitle?: string }> = ({ subtitle }) => (
  <div style={{ position: 'relative', height: 56, background: '#1a7a4a', overflow: 'hidden', flexShrink: 0 }}>
    <div style={{
      position: 'absolute', left: 0, top: 0, width: 170, height: '100%',
      background: '#22c55e',
      clipPath: 'polygon(0 0, 60% 0, 40% 100%, 0 100%)',
    }} />
    <div style={{
      position: 'absolute', left: 24, top: 0, width: 170, height: '100%',
      background: 'rgba(255,255,255,0.25)',
      clipPath: 'polygon(0 0, 40% 0, 20% 100%, 0 100%)',
    }} />
    <div style={{ position: 'absolute', right: 16, top: subtitle ? 6 : 18, textAlign: 'right' }}>
      <div style={{ color: '#fff', fontSize: 16, fontWeight: 800, letterSpacing: 0.5 }}>
        {SCHOOL_NAME.toUpperCase()}
      </div>
      {subtitle && (
        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 9, fontWeight: 600, letterSpacing: 1.5, marginTop: 2 }}>
          {subtitle}
        </div>
      )}
    </div>
  </div>
);

const cardShell: React.CSSProperties = {
  width: 380,
  height: 240,
  borderRadius: 14,
  overflow: 'hidden',
  background: '#fff',
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  position: 'relative',
  border: '1px solid #e5e7eb',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

// ── Component ─────────────────────────────────────────────────────────────────

export const StudentIDCardModal: React.FC<StudentIDCardModalProps> = ({ student, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current || !student) return;
    const printContents = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ID Card – ${student.student_name}</title>
          <meta charset="utf-8" />
          <style>
            * {
              margin:0;
              padding:0;
              box-sizing:border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            html, body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            body {
              font-family:-apple-system, BlinkMacSystemFont,'Segoe UI',sans-serif;
              background:#fff; display:flex; flex-wrap:wrap; gap:24px; padding:24px;
            }
            @media print {
              @page { margin: 0.3in; }
              html, body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              body { padding:0; }
              .id-card {
                page-break-inside: avoid;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
            }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  if (!student) return null;

  // Barcode + QR code — free public generation APIs (no extra npm package needed)
  const barcodeSrc = `https://barcodeapi.org/api/128/${encodeURIComponent(student.student_id)}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    `${SCHOOL_NAME} | ${student.student_name} | ID: ${student.student_id}`
  )}`;

  return (
    <AnimatePresence>
      {student && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-700">Student ID Card</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save PDF
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable area */}
            <div ref={printRef} className="p-6 flex flex-col items-center gap-6 bg-gray-50">

              {/* ───── FRONT ───── */}
              <div className="id-card" style={cardShell}>
                <CardHeader subtitle="STUDENT ID CARD" />

                {/* Logo row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px 0' }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, background: '#1a7a4a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 11, fontWeight: 800,
                  }}>LA</div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1a7a4a' }}>learn</span>
                </div>

                {/* Body */}
                <div style={{ display: 'flex', gap: 14, padding: '10px 18px 0' }}>
                  <div style={{
                    width: 78, height: 96, borderRadius: 8, overflow: 'hidden',
                    border: '2px solid #e5e7eb', background: '#f3f4f6', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {student.image ? (
                      <img src={student.image} alt={student.student_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 22, fontWeight: 800, color: '#9ca3af' }}>{getInitials(student.student_name)}</span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', flex: 1, alignContent: 'start' }}>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#16a34a', letterSpacing: 0.5 }}>STUDENT NAME</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginTop: 2 }}>{student.student_name.toUpperCase()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#16a34a', letterSpacing: 0.5 }}>GRADE</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginTop: 2 }}>
                        {(student.grade || student.program || '—').toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#16a34a', letterSpacing: 0.5 }}>STUDENT ID</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginTop: 2 }}>{student.student_id}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#16a34a', letterSpacing: 0.5 }}>EMAIL</div>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: '#374151', marginTop: 2, wordBreak: 'break-all' }}>
                        {student.email || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Signature + barcode */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '8px 18px 6px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'cursive', fontSize: 14, color: '#374151', borderBottom: '1px solid #9ca3af', paddingBottom: 2, minWidth: 70 }}>
                      Admin
                    </div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: '#6b7280', letterSpacing: 1, marginTop: 2 }}>ISSUED BY</div>
                  </div>
                  <img src={barcodeSrc} alt="barcode" style={{ height: 32, maxWidth: 170, objectFit: 'contain' }} />
                </div>

                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: '#22c55e' }} />
              </div>

              {/* ───── BACK ───── */}
              <div className="id-card" style={{ ...cardShell, display: 'flex', flexDirection: 'column' }}>
                <CardHeader />

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={qrSrc} alt="QR code" style={{ width: 130, height: 130 }} />
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 18px', borderTop: '1px solid #f3f4f6', fontSize: 10.5, color: '#374151', fontWeight: 600,
                }}>
                  <span>✉ {SUPPORT_EMAIL}</span>
                  <span>☎ +{SUPPORT_PHONE}</span>
                </div>

                <div style={{ height: 6, background: '#22c55e' }} />
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};