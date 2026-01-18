export default function selectAllContenEditable(node) {
	let sel;
	let range;
	range = document.createRange();
	range.selectNodeContents(node);
	sel = window.getSelection();
	sel.removeAllRanges();
	sel.addRange(range);
}
