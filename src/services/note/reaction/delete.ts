import { publishNoteStream } from '../../stream';
import { renderLike } from '../../../remote/activitypub/renderer/like';
import renderUndo from '../../../remote/activitypub/renderer/undo';
import { renderActivity } from '../../../remote/activitypub/renderer';
import DeliverManager from '../../../remote/activitypub/deliver-manager';
import { IdentifiableError } from '@/misc/identifiable-error';
import { User, IRemoteUser } from '../../../models/entities/user';
import { Note } from '../../../models/entities/note';
import { NoteReactions, Users, Notes } from '../../../models';
import { convertLegacyReaction, decodeReaction } from '@/misc/reaction-lib';

export default async (user: { id: User['id']; host: User['host']; }, note: Note, reaction?: string) => {
	// if already unreacted
	const existReactions = await NoteReactions.find({
		noteId: note.id,
		userId: user.id,
	});
	const exist = existReactions.find(r => convertLegacyReaction(r.reaction) === reaction);

	if (exist == null) {
		throw new IdentifiableError('60527ec9-b4cb-4a88-a6bd-32d3ad26817d', 'not reacted');
	}

	// Delete reaction
	const result = await NoteReactions.delete(exist.id);

	if (result.affected !== 1) {
		throw new IdentifiableError('60527ec9-b4cb-4a88-a6bd-32d3ad26817d', 'not reacted');
	}

	// Decrement reactions count
	const sql = `jsonb_set("reactions", '{${exist.reaction}}', (COALESCE("reactions"->>'${exist.reaction}', '0')::int - 1)::text::jsonb)`;
	await Notes.createQueryBuilder().update()
		.set({
			reactions: () => sql,
		})
		.where('id = :id', { id: note.id })
		.execute();

	await Notes.createQueryBuilder().update()
		.set({
			reactionTimestamps: () => `"reactionTimestamps" - '${exist.reaction}'`,
		})
		.where('id = :id', { id: note.id })
		.andWhere(`"reactions"->>'${exist.reaction}' = '0'`)
		.execute();

	if (existReactions.length === 1) {
		Notes.decrement({ id: note.id }, 'score', 1);
	}

	publishNoteStream(note.id, 'unreacted', {
		reaction: decodeReaction(exist.reaction).reaction,
		userId: user.id
	});

	//#region 配信
	if (existReactions.length === 1 && Users.isLocalUser(user) && !note.localOnly) {
		const content = renderActivity(renderUndo(await renderLike(exist, note), user));
		const dm = new DeliverManager(user, content);
		if (note.userHost !== null) {
			const reactee = await Users.findOne(note.userId);
			dm.addDirectRecipe(reactee as IRemoteUser);
		}
		dm.addFollowersRecipe();
		dm.execute();
	}
	//#endregion
};
