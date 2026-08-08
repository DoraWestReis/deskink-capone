export function getProjectFollowUpState(project, tasks = [], settings = {}, actionLabel = 'Contato') {
  const allProjectTasks = tasks
    .filter((task) => task.project_id === project.id)
    .sort((a, b) => {
      if ((a.step_number || 0) !== (b.step_number || 0)) {
        return (a.step_number || 0) - (b.step_number || 0);
      }
      return (a.due_date || '').localeCompare(b.due_date || '');
    });

  const pendingTasks = allProjectTasks.filter((task) => {
    if (task.status !== 'pending') return false;
    if (project?.pipeline_stage === 'pos_venda' && project?.post_sale_status === 'feito' && task.follow_up_type === 'pos_venda') return false;
    return true;
  });

  return {
    visible: pendingTasks.length > 0 || allProjectTasks.length > 0,
    tasks: allProjectTasks,
    pendingTasks,
  };
}