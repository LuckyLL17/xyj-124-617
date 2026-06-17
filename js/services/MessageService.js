import { generateId } from '../utils/helpers.js';

export class MessageService {
    constructor(store) {
        this.store = store;
    }

    getAll() {
        const messages = this.store.get('messages') || [];
        return messages.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return b.createdAt - a.createdAt;
        });
    }

    getById(id) {
        const messages = this.store.get('messages') || [];
        return messages.find(m => m.id === id);
    }

    add({ nickname, content, mentionedMemberIds = [] }) {
        const message = {
            id: generateId(),
            nickname,
            content,
            mentionedMemberIds,
            isPinned: false,
            createdAt: Date.now(),
            replies: []
        };
        this.store.update('messages', (messages = []) => [...messages, message]);
        return message;
    }

    delete(id) {
        this.store.update('messages', (messages = []) => messages.filter(m => m.id !== id));
    }

    togglePin(id) {
        this.store.update('messages', (messages = []) =>
            messages.map(m => m.id === id ? { ...m, isPinned: !m.isPinned } : m)
        );
    }

    addReply(messageId, { nickname, content }) {
        const reply = {
            id: generateId(),
            nickname,
            content,
            createdAt: Date.now()
        };
        this.store.update('messages', (messages = []) =>
            messages.map(m => {
                if (m.id === messageId) {
                    return { ...m, replies: [...(m.replies || []), reply] };
                }
                return m;
            })
        );
        return reply;
    }

    deleteReply(messageId, replyId) {
        this.store.update('messages', (messages = []) =>
            messages.map(m => {
                if (m.id === messageId) {
                    return { ...m, replies: (m.replies || []).filter(r => r.id !== replyId) };
                }
                return m;
            })
        );
    }

    generateSampleMessages(members) {
        if (!members || members.length === 0) return [];

        const now = Date.now();
        const messages = [
            {
                id: generateId(),
                nickname: members[0].name,
                content: '大家好，提醒一下本周六下午需要进行公区大扫除，每个人负责自己房间门口的区域哈~',
                mentionedMemberIds: members.slice(1).map(m => m.id),
                isPinned: true,
                createdAt: now - 86400000 * 2,
                replies: [
                    {
                        id: generateId(),
                        nickname: members[1].name,
                        content: '收到！我那天下午有空',
                        createdAt: now - 86400000 * 2 + 3600000
                    },
                    {
                        id: generateId(),
                        nickname: members[2].name,
                        content: '好的没问题',
                        createdAt: now - 86400000 * 2 + 7200000
                    }
                ]
            },
            {
                id: generateId(),
                nickname: members[1].name,
                content: '有人看到我的蓝色雨伞吗？昨天好像落在客厅了',
                mentionedMemberIds: [],
                isPinned: false,
                createdAt: now - 86400000,
                replies: [
                    {
                        id: generateId(),
                        nickname: members[0].name,
                        content: '在玄关架子上，我看到了',
                        createdAt: now - 86400000 + 1800000
                    }
                ]
            },
            {
                id: generateId(),
                nickname: members[2].name,
                content: '厕所纸快用完了，记得补货哦',
                mentionedMemberIds: [],
                isPinned: false,
                createdAt: now - 3600000 * 5,
                replies: []
            }
        ];

        return messages;
    }
}
