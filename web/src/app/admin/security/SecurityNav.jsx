import React from 'react';
import { go } from '../../shared/router.js';
import {
  Shield,
  Users,
  KeyRound,
  FileCheck2,
  HeartHandshake,
  Stethoscope,
  History,
  AlertTriangle,
  Lock
} from 'lucide-react';

export const SECURITY_TABS = [
  { id: 'overview', path: '/app/security', label: 'Overview', icon: Shield },
  { id: 'users', path: '/app/security/users', label: 'Users & Roles', icon: Users },
  { id: 'permissions', path: '/app/security/permissions', label: 'Permissions', icon: KeyRound },
  { id: 'consents', path: '/app/security/consents', label: 'Consents', icon: FileCheck2 },
  { id: 'relationships', path: '/app/security/relationships', label: 'Partner Access', icon: HeartHandshake },
  { id: 'clinical', path: '/app/security/clinical-assignments', label: 'Clinical Access', icon: Stethoscope },
  { id: 'audit', path: '/app/security/audit', label: 'Access History', icon: History },
  { id: 'threats', path: '/app/security/threat-monitoring', label: 'Threat Monitor', icon: AlertTriangle },
];

export default function SecurityNav({ currentTab = 'overview' }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
        paddingBottom: 16,
        borderBottom: '1px solid var(--line, #E6EAE7)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'var(--green-l, #E8F3EC)',
            color: 'var(--green, #00843D)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Lock size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--ink, #17201B)' }}>
              Security & Governance Console
            </h1>
            <p style={{ fontSize: 13, color: 'var(--ink2, #56625B)', margin: 0 }}>
              Triple-Lock Authorization · ReBAC Relationship Controls · Clinical Zero-Knowledge
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#E8F3EC',
            color: '#00843D',
            fontSize: 12,
            fontWeight: 600,
            padding: '5px 12px',
            borderRadius: 20,
            border: '1px solid rgba(0,132,61,0.2)'
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00843D' }} />
            Zero-Trust Active · RLS Enforced
          </span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#F0F3F1',
            color: '#56625B',
            fontSize: 12,
            fontWeight: 500,
            padding: '5px 12px',
            borderRadius: 20
          }}>
            k-Anonymity (k ≥ 5)
          </span>
        </div>
      </div>

      {/* 8-Tab Navigation Bar */}
      <div style={{
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        paddingBottom: 4,
        borderBottom: '1px solid var(--line, #E6EAE7)'
      }}>
        {SECURITY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => go(tab.path)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 14px',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--green, #00843D)' : '2px solid transparent',
                background: isActive ? '#fff' : 'transparent',
                color: isActive ? 'var(--green, #00843D)' : 'var(--ink2, #56625B)',
                fontWeight: isActive ? 600 : 500,
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

