export function getStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' {
  switch (status) {
    case 'Green':  return 'success';
    case 'Yellow': return 'warn';
    case 'Red':    return 'danger';
    default:       return 'info';
  }
}
