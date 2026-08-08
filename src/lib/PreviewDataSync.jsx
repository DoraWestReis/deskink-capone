import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export default function PreviewDataSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const refreshData = () => {
      queryClient.invalidateQueries();
      queryClient.refetchQueries({ type: 'active' });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient]);

  return null;
}