import React from 'react';

export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 hidden border-t border-white/10 bg-[#18151B]/95 py-1 backdrop-blur md:block">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69717b3c6d0ef62a22f5c054/5e314acdf_Logotipodetecnologiaprofissionalgeomtricoazul1.png"
              alt="West e Alves Tecnologia"
              className="h-4 w-4 rounded-full object-contain"
            />
            <p className="text-[8px] text-white/55">
              Desenvolvido por <span className="font-medium text-white/80">West e Alves Tecnologia</span> em parceria com <span className="font-medium text-white/80">Tattai Tattoo</span>
            </p>
          </div>
          <p className="text-[8px] text-white/55">
            ✉ westalvescode@gmail.com · ✆ (71) 99201-0338
          </p>
        </div>
      </div>
    </footer>
  );
}