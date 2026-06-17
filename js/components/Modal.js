export class Modal {
    constructor() {
        this.overlay = document.getElementById('modalOverlay');
        this.titleEl = document.getElementById('modalTitle');
        this.bodyEl = document.getElementById('modalBody');
        this.closeBtn = document.getElementById('modalClose');
        this._bindClose();
    }

    _bindClose() {
        this.closeBtn.addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', (e) => {
            if (e.target.id === 'modalOverlay') this.close();
        });
    }

    open(title, bodyHtml) {
        this.titleEl.textContent = title;
        this.bodyEl.innerHTML = bodyHtml;
        this.overlay.classList.remove('hidden');
    }

    close() {
        this.overlay.classList.add('hidden');
    }

    isOpen() {
        return !this.overlay.classList.contains('hidden');
    }
}
