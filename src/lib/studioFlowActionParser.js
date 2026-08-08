export function extractStudioFlowAction(content) {
  if (typeof content !== 'string') {
    return { cleanContent: content, action: null };
  }

  const match = content.match(/```studioflow_action\s*([\s\S]*?)```/i);

  if (!match) {
    return { cleanContent: content.trim(), action: null };
  }

  let action = null;
  try {
    action = JSON.parse(match[1].trim());
  } catch {
    action = null;
  }

  const cleanContent = content.replace(match[0], '').trim();
  return { cleanContent, action };
}

export function getStudioFlowActionKey(message, action) {
  return [
    message?.created_date || 'message',
    action?.type || 'action',
    action?.summary || '',
    action?.project_id || '',
    action?.pipeline_stage || '',
    action?.revision_datetime || '',
    action?.data?.name || '',
    action?.data?.description || '',
  ].join('::');
}