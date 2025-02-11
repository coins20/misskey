<template>
<section class="_section">
	<div class="_card">
		<div class="_content">
			<MkInfo>{{ $t('_webhookNotification.descriptionForSlack')}}</MkInfo>
			<MkInfo>{{ $t('_webhookNotification.descriptionForBot')}}</MkInfo>
			<MkSwitch v-model:value="enableWebhook">
				{{ $t('_webhookNotification.enable') }}
			</MkSwitch>
			<MkSelect v-model:value="type">
				<template #label>{{ $t('_webhookNotification.jsonType') }}</template>
				<option v-for="type in types" :value="type" :key="type">{{ type }}</option>
			</MkSelect>
			<MkInput v-model:value="url">
				<span>{{ $t('_webhookNotification.url') }}</span>
				<template #desc>{{ $t('_webhookNotification.urlDescription') }}</template>
			</MkInput>
			<MkInput v-model:value="secret" v-if="type === 'bot'">
				<span>{{ $t('_webhookNotification.secret') }}</span>
				<template #desc>{{ $t('_webhookNotification.secretDescription') }}</template>
			</MkInput>
		</div>
		<div class="_footer">
			<MkButton @click="test()" inline :disabled="!url">{{ $t('_webhookNotification.test') }}</MkButton>
			<MkButton @click="save(true)" primary inline :disabled="!changed"><i class="fas fa-save"></i> {{ $t('save') }}</MkButton>
		</div>
	</div>
</section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import MkButton from '@client/components/ui/button.vue';
import MkInput from '@client/components/ui/input.vue';
import MkSwitch from '@client/components/ui/switch.vue';
import MkInfo from '@client/components/ui/info.vue';
import MkSelect from '@client/components/ui/select.vue';
import * as os from '@client/os';
import { webhookTypes } from '../../../types';
import * as symbols from '@client/symbols';

export default defineComponent({
	components: {
		MkButton,
		MkInput,
		MkSwitch,
		MkInfo,
		MkSelect,
	},

	emits: ['info'],

	data() {
		return {
			[symbols.PAGE_INFO]: {
				title: this.$ts.webhookNotification,
				icon: 'fas fa-link'
			},
			enableWebhook: this.$i.enableWebhookNotification,
			url: this.$i.webhookUrl,
			changed: false,
			types: webhookTypes,
			type: this.$i.webhookType || 'slack',
			secret: this.$i.webhookSecret,
		}
	},

	watch: {
		url: {
			handler() {
				this.changed = true;
			},
			deep: true
		},
		enableWebhook: {
			handler() {
				this.changed = true;
			},
			deep: true
		},
		type: {
			handler() {
				this.changed = true;
			},
			deep: true
		},
		secret: {
			handler() {
				this.changed = true;
			},
			deep: true
		},
	},

	mounted() {
		this.$emit('info', this[symbols.PAGE_INFO]);
	},

	methods: {
		async save(notify?: boolean) {
			await os.api('i/update', {
				enableWebhookNotification: this.enableWebhook,
				webhookUrl: this.url?.trim() || null,
				webhookType: this.type,
				webhookSecret: this.secret?.trim() || null
			}).then(() => {
				this.changed = false;

				this.$i.enableWebhookNotification = this.enableWebhook;
				this.$i.webhookUrl = this.url?.trim() || null;
				this.$i.webhookType = this.type;
				this.$i.webhookSecret = this.secret?.trim() || null;

				if (notify) {
					os.dialog({
						type: 'success',
						iconOnly: true,
						autoClose: true,
					});
				}
			}).catch((err) => {
				os.dialog({
					type: 'error',
					text: err.id,
				});
			});
		},

		async test() {
			await this.save(false);
			// ここではジョブキューに追加するだけにして、送信エラーは"通知"でユーザーに知らせる
			os.api('notifications/webhook-test', {
				type: 'notification',
			}).then(() => {
				console.log('postJobQueue Add');
			}).catch((err) => {
				os.dialog({
					type: 'error',
					text: err,
				});
			});
		},
	},
});
</script>
