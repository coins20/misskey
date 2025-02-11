import Xev from 'xev';
import { deliverQueue, inboxQueue, webhookQueue } from '../queue/queues';

const ev = new Xev();

const interval = 10000;

/**
 * Report queue stats regularly
 */
export default function() {
	const log = [] as any[];

	ev.on('requestQueueStatsLog', x => {
		ev.emit(`queueStatsLog:${x.id}`, log.slice(0, x.length || 50));
	});

	let activeDeliverJobs = 0;
	let activeInboxJobs = 0;
	let activeWebhookJobs = 0;

	deliverQueue.on('global:active', () => {
		activeDeliverJobs++;
	});

	inboxQueue.on('global:active', () => {
		activeInboxJobs++;
	});

	webhookQueue.on('global:active', () => {
		activeWebhookJobs++;
	});

	async function tick() {
		const deliverJobCounts = await deliverQueue.getJobCounts();
		const inboxJobCounts = await inboxQueue.getJobCounts();
		const webhookJobCounts = await webhookQueue.getJobCounts();

		const stats = {
			deliver: {
				activeSincePrevTick: activeDeliverJobs,
				active: deliverJobCounts.active,
				waiting: deliverJobCounts.waiting,
				delayed: deliverJobCounts.delayed
			},
			inbox: {
				activeSincePrevTick: activeInboxJobs,
				active: inboxJobCounts.active,
				waiting: inboxJobCounts.waiting,
				delayed: inboxJobCounts.delayed
			},
			webhook: {
				activeSincePrevTick: activeWebhookJobs,
				active: webhookJobCounts.active,
				waiting: webhookJobCounts.waiting,
				delayed: webhookJobCounts.delayed
			},
		};

		ev.emit('queueStats', stats);

		log.unshift(stats);
		if (log.length > 200) log.pop();

		activeDeliverJobs = 0;
		activeInboxJobs = 0;
		activeWebhookJobs = 0;
	}

	tick();

	setInterval(tick, interval);
}
