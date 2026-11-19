import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Shield, Award, HeartHandshake } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <Activity className="w-5 h-5 text-teal-400" />
              </div>
              <span className="font-bold text-lg text-white tracking-tight">
                PlateauCare <span className="text-teal-400">Intelligence</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              An AI-powered Population and Workforce Health Early Warning and Decision Support System for Plateau State, Nigeria. Built to empower public-health authorities through integrated multi-source surveillance.
            </p>
            <div className="flex items-center gap-2 text-xs text-teal-400/90 font-medium bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg w-fit">
              <Award className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Future Health Digital Innovation Challenge 2026 — Track: Population & Workforce Health</span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Platform Modules
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="hover:text-teal-400 transition-colors">
                  System Architecture
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-teal-400 transition-colors">
                  Multi-Source Surveillance
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-teal-400 transition-colors">
                  Officer Authentication
                </Link>
              </li>
              <li>
                <a
                  href="/admin/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-teal-400 transition-colors"
                >
                  Django Administration
                </a>
              </li>
            </ul>
          </div>

          {/* Governance & Location */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Territorial Scope
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dedicated monitoring coverage across all 17 Local Government Areas of Plateau State:
            </p>
            <p className="text-xs text-slate-300 font-mono mt-2">
              Jos North • Jos South • Barkin Ladi • Mangu • Bokkos • Pankshin • Kanam • Kanke • Wase • Shendam • Langtang N/S • Riyom • Bassa • Jos East • Mikang • Qua'an Pan
            </p>
            <div className="mt-4 pt-4 border-t border-slate-900 flex items-center gap-2 text-xs text-slate-400">
              <Shield className="w-4 h-4 text-teal-500" />
              <span>Ministry of Health & Public Health Directorate</span>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© 2026 PlateauCare Intelligence. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <HeartHandshake className="w-3.5 h-3.5 text-teal-500" />
            <span>Dedicated to the Health and Wellbeing of the Communities of Plateau State</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

