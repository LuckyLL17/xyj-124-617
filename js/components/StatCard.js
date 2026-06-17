export class StatCard {
    static render(iconClass, emoji, title, value, label, iconStyle = '') {
        return `
            <div class="stat-card">
                <div class="stat-icon ${iconClass}" style="${iconStyle}">${emoji}</div>
                <div class="stat-info">
                    <h3>${title}</h3>
                    <p class="stat-value">${value}</p>
                    <p class="stat-label">${label}</p>
                </div>
            </div>
        `;
    }

    static renderGrid(cards) {
        return `<div class="stats-grid">${cards.join('')}</div>`;
    }
}
