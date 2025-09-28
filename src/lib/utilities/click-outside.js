function isContainedBy(target, list = []) {
	return list.some((node) => {
		if (typeof node === 'string' && node) {
			const n = document.querySelector(node);
			return n && n.contains(target);
		} else if (node) {
			return node && node.contains(target);
		}
	});
}

/**
 * @param {HTMLElement} node
 * @param {Array<HTMLElement>} [ignoreList]
 * @returns
 */
export function clickOutside(node, ignoreList) {
	const handleClick = (event) => {
		if (!node.contains(event.target) && !isContainedBy(event.target, ignoreList)) {
			const evt = new CustomEvent('outclick');
			evt.clickTarget = event.target;

			node.dispatchEvent(evt);
		}
	};

	document.addEventListener('click', handleClick, true);

	return {
		destroy() {
			document.removeEventListener('click', handleClick, true);
		}
	};
}
