import React, { useState } from 'react';
import { Building, MapPin, Plus, CheckCircle2, ShieldCheck, FileText } from 'lucide-react';
import { masterStore } from '../services/storage';
import { INITIAL_ORGANIZATION } from '../data/seedData';
import { Branch, User } from '../types';

interface OrgBranchManagementPageProps {
  currentUser: User;
}

export const OrgBranchManagementPage: React.FC<OrgBranchManagementPageProps> = ({ currentUser }) => {
  const branches = masterStore.getBranches();
  const org = INITIAL_ORGANIZATION;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-[#060097] text-white rounded-md">
              <Building className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Organization & Branch Hierarchy</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Section 3 & 5: Centralized organization multi-plant manufacturing footprint.
          </p>
        </div>
      </div>

      {/* Organization Card */}
      <div className="bg-white rounded-lg border-2 border-[#060097]/20 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-[#060097] text-white flex items-center justify-center font-bold text-sm">
              KOSH
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{org.name}</h3>
              <p className="text-xs text-slate-500">Legal Entity: {org.legalEntity}</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            Headquarters Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">HQ Location</span>
            <span className="font-bold text-slate-800">{org.hqLocation}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Operating Plants</span>
            <span className="font-bold text-slate-800">{branches.length} Manufacturing Plants / WH</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Quality Standards</span>
            <span className="font-bold text-slate-800">IATF 16949 / ISO 9001:2015</span>
          </div>
        </div>
      </div>

      {/* Branches & Plants Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Manufacturing Plants & Operating Units
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-lg border border-slate-200 p-4.5 shadow-xs space-y-2.5 hover:border-[#060097]/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold bg-slate-100 text-[#060097] px-2 py-0.5 rounded">
                      {b.code}
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-800">
                      {b.type}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-1.5">{b.name}</h4>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1" title="Active"></span>
              </div>

              <div className="space-y-1 text-xs text-slate-600 pt-1 border-t border-slate-100">
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{b.location}, {b.state}</span>
                </div>
                {b.gstin && (
                  <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>GSTIN: <strong className="font-mono text-slate-700">{b.gstin}</strong></span>
                  </div>
                )}
              </div>

              {/* Plant Employee Hierarchy Summary */}
              {(() => {
                const users = masterStore.getUsers();
                const plantUsers = users.filter((u) => u.assignedBranchIds.includes(b.id));
                const plantManager = plantUsers.find((u) => (u.hierarchyLevel || 1) === 3);
                const supervisors = plantUsers.filter((u) => (u.hierarchyLevel || 1) === 2);
                const makers = plantUsers.filter((u) => (u.hierarchyLevel || 1) === 1);

                return (
                  <div className="pt-2 border-t border-slate-100 text-[11px] space-y-1 bg-slate-50/60 p-2 rounded">
                    <div className="flex items-center justify-between text-slate-500 font-semibold text-[10px] uppercase">
                      <span>Plant Management Hierarchy</span>
                      <span>{plantUsers.length} Staff</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-slate-800">
                      <span className="font-bold text-[#060097]">L3 Head:</span>
                      <span>{plantManager ? plantManager.displayName : 'Corporate Escalation'}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-slate-700">
                      <span className="font-bold text-amber-700">L2 Checkers:</span>
                      <span>{supervisors.length > 0 ? supervisors.map((s) => s.displayName).join(', ') : 'None assigned'}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-slate-600">
                      <span className="font-bold text-slate-600">L1 Makers:</span>
                      <span>{makers.length > 0 ? makers.map((m) => m.displayName).join(', ') : 'None assigned'}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
