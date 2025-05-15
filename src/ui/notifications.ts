export function showActionNotification(
    notificationElement: HTMLDivElement | null,
    message: string,
    type: 'success' | 'warning' = 'success'
): void {
    if (!notificationElement) return;

    notificationElement.textContent = message;
    notificationElement.classList.remove('notification-show', 'notification-warning', 'notification-success');

    if (type === 'warning') {
        notificationElement.classList.add('notification-warning');
    } else {
        notificationElement.classList.add('notification-success');
    }
    notificationElement.classList.add('notification-show');

    setTimeout(() => {
        notificationElement?.classList.remove('notification-show');
    }, 3500);
}