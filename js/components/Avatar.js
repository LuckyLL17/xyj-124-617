export class Avatar {
    static render(member, size = 'md') {
        const sizeMap = {
            xs: { width: 18, height: 18, fontSize: 10 },
            sm: { width: 32, height: 32, fontSize: 14 },
            md: { width: 48, height: 48, fontSize: 20 },
            lg: { width: 56, height: 56, fontSize: 28 }
        };
        const s = sizeMap[size] || sizeMap.md;
        const color = member ? member.color : '#94a3b8';
        const text = member ? member.avatar : '?';

        return `<div class="avatar-${size}" style="width:${s.width}px;height:${s.height}px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:${s.fontSize}px;font-weight:600;color:white;background:${color};flex-shrink:0;vertical-align:middle;">${text}</div>`;
    }
}
