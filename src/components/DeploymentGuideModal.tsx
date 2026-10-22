import React from 'react';
import { X, Globe, Server, ShieldCheck, Terminal, Copy, Check } from 'lucide-react';

interface DeploymentGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeploymentGuideModal: React.FC<DeploymentGuideModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const nginxConfig = `
# /etc/nginx/sites-available/my.koshinnovations.com
server {
    listen 80;
    server_name my.koshinnovations.com itemmaster.koshinnovations.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name my.koshinnovations.com itemmaster.koshinnovations.com;

    ssl_certificate /etc/letsencrypt/live/my.koshinnovations.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/my.koshinnovations.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend Static Assets
    root /var/www/kosh-item-master/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy to FastAPI Backend
    location /api/v1/ {
        proxy_pass http://127.0.0.1:8000/api/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(nginxConfig);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50">
        {/* Header */}
        <div className="px-6 py-4 bg-[#060097] text-white flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5" />
              <h3 className="text-base font-bold">
                Kosh Innovations Subdomain & Enterprise Deployment Specification
              </h3>
            </div>
            <p className="text-xs text-blue-100 mt-0.5">
              Production Target: <strong className="underline">https://my.koshinnovations.com/</strong> • UAT: <strong className="underline">http://localhost/mykoshinnovations</strong>
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Section 1: DNS & Domains */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-[#060097] text-white flex items-center justify-center text-[10px]">1</span>
              <span>Subdomain Ownership & DNS Records</span>
            </h4>
            <p className="text-slate-600">
              Configure DNS records on Kosh Innovations DNS provider (Cloudflare / Route53 / Hostinger):
            </p>
            <div className="overflow-x-auto bg-slate-50 border border-slate-200 rounded p-2.5 font-mono text-[11px]">
              <div>A Record: <strong>my.koshinnovations.com</strong> → &lt;Production-Server-Static-IP&gt; (TTL: 300s)</div>
              <div>CNAME: <strong>itemmaster.koshinnovations.com</strong> → my.koshinnovations.com</div>
              <div>CAA Record: issue "letsencrypt.org"</div>
            </div>
          </div>

          {/* Section 2: Server Requirements */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-[#060097] text-white flex items-center justify-center text-[10px]">2</span>
              <span>Host Infrastructure & Server Specifications</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
              <li><strong>OS:</strong> Ubuntu Server 22.04 LTS / 24.04 LTS or RHEL 9 (On-Premises or Cloud VPS).</li>
              <li><strong>Compute:</strong> 4 vCPU, 8 GB RAM, 100 GB NVMe SSD (scales up to 500 concurrent manufacturing users).</li>
              <li><strong>Network:</strong> Static Public IP, Port 80/443 open to Internet or internal manufacturing VPN; Port 50000 restricted to internal SAP B1 HANA subnet.</li>
              <li><strong>Database:</strong> PostgreSQL 16+ with regular automated WAL archiving and pg_dump backups.</li>
            </ul>
          </div>

          {/* Section 3: Reverse Proxy Nginx Configuration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#060097] text-white flex items-center justify-center text-[10px]">3</span>
                <span>Nginx Reverse Proxy & SSL Configuration</span>
              </h4>
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-semibold flex items-center space-x-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Nginx Config'}</span>
              </button>
            </div>
            <div className="bg-slate-900 text-slate-100 p-3 rounded font-mono text-[11px] overflow-x-auto">
              <pre>{nginxConfig}</pre>
            </div>
          </div>

          {/* Section 4: SAP B1 HANA Connectivity */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-[#060097] text-white flex items-center justify-center text-[10px]">4</span>
              <span>SAP Business One HANA Integration Setup</span>
            </h4>
            <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-1">
              <p>1. Service Layer URL: <code className="font-bold text-blue-900">https://&lt;sap-hana-host&gt;:50000/b1s/v2</code></p>
              <p>2. Company Database: <code className="font-bold text-blue-900">KOSH_PROD_HANA</code></p>
              <p>3. Service Account: Dedicated integration account with OITM write authorization only (no interactive admin).</p>
              <p>4. SSL Verification: Install company private root CA or SAP HANA server certificate on application server.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <a
            href="/kosh-global-item-creation-system.zip"
            download="kosh-global-item-creation-system.zip"
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
          >
            <span>Download Full Source (.ZIP)</span>
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
