import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import StudioFlowActionCard from '@/components/ai/StudioFlowActionCard';
import { extractStudioFlowAction, getStudioFlowActionKey } from '@/lib/studioFlowActionParser';

export default function StudioFlowMessageBubble({
  message,
  actionStates = {},
  actionFeedback = {},
  onConfirmAction,
  onDismissAction,
}) {
  const isUser = message.role === 'user';
  const { cleanContent, action } = extractStudioFlowAction(message.content);
  const actionKey = action ? getStudioFlowActionKey(message, action) : null;

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[88%] space-y-2', isUser && 'items-end')}>
        {cleanContent && (
          <div
            className={cn(
              'rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-sm',
              isUser
                ? 'bg-[#231F20] text-white'
                : 'border border-[#E5DDD2] bg-white text-[#231F20]'
            )}
          >
            {isUser ? (
              <p>{cleanContent}</p>
            ) : (
              <ReactMarkdown className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-strong:text-[#231F20]">
                {cleanContent}
              </ReactMarkdown>
            )}
          </div>
        )}

        {!isUser && action && (
          <StudioFlowActionCard
            action={action}
            status={actionStates[actionKey] || 'idle'}
            feedbackMessage={actionFeedback[actionKey]}
            onConfirm={() => onConfirmAction?.(message, action, actionKey)}
            onDismiss={() => onDismissAction?.(actionKey)}
          />
        )}
      </div>
    </div>
  );
}