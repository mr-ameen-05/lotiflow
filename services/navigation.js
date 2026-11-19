export function filterNavigation(items, query, role) {
    const term = query.trim().toLowerCase();
    const currentRole = role.toUpperCase();
    return items.filter(item => (!item.roles || item.roles.some(allowed => allowed.toUpperCase() === currentRole)) && `${item.label} ${item.keywords || ''}`.toLowerCase().includes(term));
}
