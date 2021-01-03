import cache from 'webext-storage-cache';
import select from 'select-dom';
import * as pageDetect from 'github-url-detection';

import features from '.';
import * as api from '../github-helpers/api';
import {getRepo} from '../github-helpers';
import looseParseInt from '../helpers/loose-parse-int';
import {getPRNumber} from './sync-pr-commit-title';

function init(): void | false {
	const tab = select('.tabnav-tabs .tabnav-tab:last-child')!;
	const filesChanged = looseParseInt(tab);

	if (filesChanged > 10) {
		return false;
	}

	const updateTab = async (): Promise<void> => {
		tab.title = (await getList(filesChanged, looseParseInt(getPRNumber()))).join('\n');
	};

	tab.title = 'Loading…';
	tab.addEventListener('mouseenter', updateTab, {once: true});

	const getList = cache.function(async (filesChanged, prNumber) => {
		const {repository} = await api.v4(`
		repository() {
			pullRequest(number: ${prNumber}) {
				files(first: 10) {
					nodes {
						path
					}
				}
			}
		}
	`);

		return repository.pullRequest.files.nodes.map((file: AnyObject) => file.path);
	}, {
		maxAge: {minutes: 30},
		cacheKey: ([filesChanged, prNumber]) => __filebasename + ':' + getRepo()!.nameWithOwner + ':' + String(filesChanged) + ':' + String(prNumber)
	});
}

void features.add(__filebasename, {
	include: [
		pageDetect.isPR
	],
	exclude: [
		pageDetect.isPRFiles
	],
	init
});
