export class Toast {
    constructor() {
        this.el = document.getElementById('toast');
        this._timer = null;
    }

    show(message, duration = 2500) {
        this.el.textContent = message;
        this.el.classList.remove('hidden');
        if (this._timer) clearTimeout(this._timer);
        this._timer = setTimeout(() => {
            this.el.classList.add('hidden');
        }, duration);
    }
}
