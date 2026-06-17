export class TabNav {
    constructor(containerSelector, onSwitch) {
        this.container = document.querySelector(containerSelector);
        this.onSwitch = onSwitch;
        this._bind();
    }

    _bind() {
        this.container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTo(e.target.dataset.tab);
                if (this.onSwitch) this.onSwitch(e.target.dataset.tab);
            });
        });
    }

    switchTo(tabId) {
        this.container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabId);
        });
    }
}
