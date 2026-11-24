import React from 'react';
import {
  PhoneCall,
  ShieldAlert,
  AlertTriangle,
  LifeBuoy,
  Truck,
  Wrench,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { Language } from '../../i18n/translations.js';

interface WorkerHelpSupportProps {
  lang: Language;
}

export const WorkerHelpSupport: React.FC<WorkerHelpSupportProps> = ({ lang }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-[#e2e8f0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-[#0f2925] flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-[#095c54]" />
            <span>Worker Field Safety, Support &amp; Emergency Helplines</span>
          </h2>
        </div>

        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          <span>Emergency Hotlines Active</span>
        </span>
      </div>

      {/* Emergency Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-[#e2e8f0] p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#e6f4f1] text-[#095c54] rounded-2xl">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-[#0f2925] text-sm">Ward 3 Sanitary Inspector</h3>
              <p className="text-xs text-[#64748b]">Immediate shift coordination</p>
            </div>
          </div>
          <p className="text-xs text-[#64748b]">
            For vehicle dispatches, site blockades, attendance disputes, or crew reallocation.
          </p>
          <a
            href="tel:+919825100003"
            className="w-full py-2.5 bg-[#095c54] hover:bg-[#06423c] text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition shadow-sm"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call +91 98251 00003</span>
          </a>
        </div>

        <div className="bg-white rounded-3xl border border-[#e2e8f0] p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#e6f4f1] text-[#095c54] rounded-2xl">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-[#0f2925] text-sm">NMC 24/7 Command Center</h3>
              <p className="text-xs text-[#64748b]">Municipal Central Helpline</p>
            </div>
          </div>
          <p className="text-xs text-[#64748b]">
            For major water pipe bursts, electrical cable cuts, or municipal equipment breakdown.
          </p>
          <a
            href="tel:02637242000"
            className="w-full py-2.5 bg-[#095c54] hover:bg-[#06423c] text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition shadow-sm"
          >
            <PhoneCall className="w-4 h-4 text-emerald-200" />
            <span>Call 02637-242000</span>
          </a>
        </div>

        <div className="bg-white rounded-3xl border border-[#e2e8f0] p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-[#0f2925] text-sm">Medical Ambulance & Trauma</h3>
              <p className="text-xs text-[#64748b]">Gujarat Emergency 108</p>
            </div>
          </div>
          <p className="text-xs text-[#64748b]">
            Immediate dispatch for injuries, bites, chemical inhalation, or heat exhaustion.
          </p>
          <a
            href="tel:108"
            className="w-full py-2.5 bg-[#b91c1c] hover:bg-rose-800 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition shadow-sm"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call 108 Emergency</span>
          </a>
        </div>
      </div>

      {/* Safety Protocols Guide */}
      <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm p-6 space-y-4">
        <h3 className="text-base font-black text-[#0f2925] flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[#095c54]" />
          <span>Navsari Municipal Sanitation Safety Regulations</span>
        </h3>

        <div className="space-y-3 text-xs text-[#0f2925]">
          <div className="p-3.5 bg-[#f8faf9] rounded-2xl border border-[#e2e8f0] flex items-start gap-3">
            <span className="font-bold text-[#047857] bg-[#ecfdf5] border border-[#a7f3d0] px-2 py-0.5 rounded-lg text-xs">1</span>
            <div>
              <p className="font-black text-[#0f2925]">Personal Protective Equipment (PPE) is Mandatory</p>
              <p className="text-[#64748b] mt-0.5">
                Reflective neon vests, heavy rubber boots, puncture-resistant gloves, and eye goggles must be worn during all drain cleaning and road sweeping tasks.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-[#f8faf9] rounded-2xl border border-[#e2e8f0] flex items-start gap-3">
            <span className="font-bold text-[#047857] bg-[#ecfdf5] border border-[#a7f3d0] px-2 py-0.5 rounded-lg text-xs">2</span>
            <div>
              <p className="font-black text-[#0f2925]">Traffic Barricading & Cones</p>
              <p className="text-[#64748b] mt-0.5">
                Place 4 warning cones at least 15 meters upstream of the work location before opening any stormwater drain cover or parking the suction jetter truck.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-[#f8faf9] rounded-2xl border border-[#e2e8f0] flex items-start gap-3">
            <span className="font-bold text-[#047857] bg-[#ecfdf5] border border-[#a7f3d0] px-2 py-0.5 rounded-lg text-xs">3</span>
            <div>
              <p className="font-black text-[#0f2925]">Strict Prohibition on Hazardous Manual Scavenging</p>
              <p className="text-[#64748b] mt-0.5">
                Workers are strictly forbidden from entering deep manholes manually without mechanical ventilators and safety harnesses. Use suction jetting trucks for all desilting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

