import React from 'react';
import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getClientPaidAmount } from '@/components/utils/clientMetrics';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
};

const getInitials = (name = '') => {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
};

export default function ClientLTVRanking({
  projects,
  clients,
  subtitle = 'Quem mais gerou valor para você',
  periodLabel = 'no período',
}) {
  // Deduplicate projects by id to avoid counting the same project multiple times
  const uniqueProjects = Array.from(new Map(projects.map((p) => [p.id, p])).values());

  const clientStats = clients.map((client) => {
    const clientProjects = uniqueProjects.filter((p) => p.client_id === client.id);
    const totalPaid = getClientPaidAmount(clientProjects);

    const referralCount = clients.filter((c) => c.referred_by === client.id).length;

    return {
      id: client.id,
      name: client.name,
      totalPaid,
      referralCount,
      projectCount: clientProjects.length,
      profileImage: client.profile_image,
    };
  });

  const topClients = clientStats
    .filter((c) => c.totalPaid > 0 || c.referralCount > 0)
    .sort((a, b) => b.totalPaid - a.totalPaid || b.referralCount - a.referralCount)
    .slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="h-full rounded-[16px] border border-[#E7DED2] bg-[#FCF8F4] p-3 shadow-[0_8px_24px_rgba(35,31,32,0.05)]"
    >
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#F3E8D6]">
          <Crown className="h-3.5 w-3.5 text-[#B08954]" strokeWidth={1.8} />
        </div>
        <div>
          <h3 className="text-[13px] font-display text-[#231F20]">Top clientes</h3>
          <p className="text-[11px] text-[#7A736C]">{subtitle}</p>
        </div>
      </div>

      {topClients.length === 0 ? (
        <p className="py-6 text-sm text-[#7A736C]">Nenhum dado disponível ainda.</p>
      ) : (
        <div className="space-y-2">
          {topClients.map((client) => (
            <Link
              key={client.id}
              to={createPageUrl('ClientDetails') + `?id=${client.id}`}
              className="flex items-center gap-2.5 rounded-2xl border border-[#E9E0D4] bg-white px-2.5 py-2 transition-colors hover:bg-[#FAF6F1]"
            >
              {client.profileImage ? (
                <img
                  src={client.profileImage}
                  alt={client.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3E8D6] text-[10px] font-semibold text-[#8E6E42]">
                  {getInitials(client.name)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[#231F20]">{client.name}</p>
                <div className="mt-0.5 flex items-center gap-3 text-[11px] text-[#7A736C]">
                  <span>{client.projectCount} projeto{client.projectCount !== 1 ? 's' : ''} {periodLabel}</span>
                </div>
              </div>

              <span className="text-[13px] font-semibold text-[#231F20] whitespace-nowrap">
                {formatCurrency(client.totalPaid)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}