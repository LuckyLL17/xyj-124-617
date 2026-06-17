import { generateId } from '../utils/helpers.js';
import { VOTE_TYPES } from '../utils/constants.js';

export class VoteService {
    constructor(store) {
        this.store = store;
    }

    getAll() {
        const votes = this.store.get('votes') || [];
        return votes.sort((a, b) => {
            if (a.isArchived && !b.isArchived) return 1;
            if (!a.isArchived && b.isArchived) return -1;
            return b.createdAt - a.createdAt;
        });
    }

    getActive() {
        return this.getAll().filter(v => !v.isArchived);
    }

    getArchived() {
        return this.getAll().filter(v => v.isArchived);
    }

    getById(id) {
        const votes = this.store.get('votes') || [];
        return votes.find(v => v.id === id);
    }

    add({ title, description, type, options, creatorNickname, endAt, allowMultiple = false, maxChoices = 1 }) {
        const vote = {
            id: generateId(),
            title,
            description,
            type,
            options: options.map((opt, idx) => ({
                id: generateId(),
                label: opt,
                index: idx,
                votes: 0,
                voterNicknames: []
            })),
            creatorNickname,
            allowMultiple,
            maxChoices: allowMultiple ? maxChoices : 1,
            endAt: endAt || null,
            isArchived: false,
            createdAt: Date.now()
        };
        this.store.update('votes', (votes = []) => [...votes, vote]);
        return vote;
    }

    archive(id) {
        this.store.update('votes', (votes = []) =>
            votes.map(v => v.id === id ? { ...v, isArchived: true } : v)
        );
    }

    unarchive(id) {
        this.store.update('votes', (votes = []) =>
            votes.map(v => v.id === id ? { ...v, isArchived: false } : v)
        );
    }

    castVote(voteId, optionIds, voterNickname) {
        this.store.update('votes', (votes = []) =>
            votes.map(v => {
                if (v.id !== voteId) return v;
                if (v.isArchived) return v;
                if (v.endAt && Date.now() > v.endAt) return v;

                const hasVoted = v.options.some(opt =>
                    opt.voterNicknames.includes(voterNickname)
                );
                if (hasVoted) return v;

                const newOptions = v.options.map(opt => {
                    if (optionIds.includes(opt.id)) {
                        return {
                            ...opt,
                            votes: opt.votes + 1,
                            voterNicknames: [...opt.voterNicknames, voterNickname]
                        };
                    }
                    return opt;
                });

                return { ...v, options: newOptions };
            })
        );
    }

    hasUserVoted(voteId, voterNickname) {
        const vote = this.getById(voteId);
        if (!vote) return false;
        return vote.options.some(opt => opt.voterNicknames.includes(voterNickname));
    }

    getUserVotedOptions(voteId, voterNickname) {
        const vote = this.getById(voteId);
        if (!vote) return [];
        return vote.options
            .filter(opt => opt.voterNicknames.includes(voterNickname))
            .map(opt => opt.id);
    }

    getTotalVotes(voteId) {
        const vote = this.getById(voteId);
        if (!vote) return 0;
        const allVoters = new Set();
        vote.options.forEach(opt => opt.voterNicknames.forEach(n => allVoters.add(n)));
        return allVoters.size;
    }

    getStatistics(voteId) {
        const vote = this.getById(voteId);
        if (!vote) return null;
        const totalVoters = this.getTotalVotes(voteId);
        return {
            totalVoters,
            options: vote.options.map(opt => ({
                ...opt,
                percentage: totalVoters > 0 ? (opt.votes / totalVoters) * 100 : 0
            })),
            isEnded: vote.endAt ? Date.now() > vote.endAt : vote.isArchived
        };
    }

    isVoteEnded(vote) {
        if (vote.isArchived) return true;
        if (vote.endAt && Date.now() > vote.endAt) return true;
        return false;
    }

    generateSampleVotes(members) {
        if (!members || members.length === 0) return [];
        const now = Date.now();
        const DAY = 86400000;

        const votes = [
            {
                id: generateId(),
                title: '是否购买一台共享洗衣机？',
                description: '考虑到大家经常排队用洗衣机，提议共同购买一台共享洗衣机，预计人均分摊约300元，使用周期预计3年以上。',
                type: 'purchase',
                options: [
                    { id: generateId(), label: '同意购买', index: 0, votes: 3, voterNicknames: [members[0].name, members[1].name, members[2].name] },
                    { id: generateId(), label: '不同意，继续共用现有', index: 1, votes: 1, voterNicknames: [members[3]?.name || '王五'] },
                    { id: generateId(), label: '再观望一段时间', index: 2, votes: 0, voterNicknames: [] }
                ],
                creatorNickname: members[0].name,
                allowMultiple: false,
                maxChoices: 1,
                endAt: now + DAY * 3,
                isArchived: false,
                createdAt: now - DAY * 2
            },
            {
                id: generateId(),
                title: '调整轮值排班规则投票',
                description: '现有的轮值排班规则运行了一段时间，大家觉得是否需要调整？请选择你支持的方案。',
                type: 'schedule',
                options: [
                    { id: generateId(), label: '方案A：保持现有规则不变', index: 0, votes: 2, voterNicknames: [members[0].name, members[1].name] },
                    { id: generateId(), label: '方案B：改为双周轮值', index: 1, votes: 2, voterNicknames: [members[2].name, members[3]?.name || '王五'] },
                    { id: generateId(), label: '方案C：自由认领制', index: 2, votes: 1, voterNicknames: [members[4]?.name || '赵六'] }
                ],
                creatorNickname: members[1].name,
                allowMultiple: false,
                maxChoices: 1,
                endAt: now + DAY * 5,
                isArchived: false,
                createdAt: now - DAY
            },
            {
                id: generateId(),
                title: '公共区域需要添置哪些物品？（可多选，最多2项）',
                description: '为改善公共区域环境，请投票选择你认为最需要添置的物品，预算总计约500元。',
                type: 'purchase',
                options: [
                    { id: generateId(), label: '空气净化器', index: 0, votes: 4, voterNicknames: [members[0].name, members[1].name, members[2].name, members[3]?.name || '王五'] },
                    { id: generateId(), label: '落地灯/氛围灯', index: 1, votes: 3, voterNicknames: [members[0].name, members[2].name, members[4]?.name || '赵六'] },
                    { id: generateId(), label: '小型绿植盆栽', index: 2, votes: 2, voterNicknames: [members[1].name, members[3]?.name || '王五'] },
                    { id: generateId(), label: '收纳置物架', index: 3, votes: 2, voterNicknames: [members[0].name, members[4]?.name || '赵六'] }
                ],
                creatorNickname: members[2].name,
                allowMultiple: true,
                maxChoices: 2,
                endAt: now + DAY * 7,
                isArchived: false,
                createdAt: now - DAY * 3
            },
            {
                id: generateId(),
                title: '是否同意增加每月公共基金？',
                description: '当前每月公共基金200元/人，提议增加至300元/人，多出部分用于购置公共物品和维修。',
                type: 'rule',
                options: [
                    { id: generateId(), label: '同意，增加至300元', index: 0, votes: 5, voterNicknames: [members[0].name, members[1].name, members[2].name, members[3]?.name || '王五', members[4]?.name || '赵六'] },
                    { id: generateId(), label: '不同意，维持200元', index: 1, votes: 0, voterNicknames: [] }
                ],
                creatorNickname: members[0].name,
                allowMultiple: false,
                maxChoices: 1,
                endAt: now - DAY * 1,
                isArchived: true,
                createdAt: now - DAY * 15
            }
        ];

        return votes;
    }
}
