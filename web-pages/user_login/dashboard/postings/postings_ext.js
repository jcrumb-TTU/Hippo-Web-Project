async function deleteItem(itemId, title){
	if(!window.confirm(`Are you sure you want to delete the listing for ${title}?`)){
		console.log(`NOT Deleting ${itemId}`);
		return;
	}
	console.log(`Deleting ${itemId}!`)
	let delreq = new Request(`/api/items/${itemId}`, {method: "DELETE", credentials: "include"});
	let delresp = await fetch(delreq);
	if(!delresp.ok){
		console.log(`Failed to delete ${itemId} with status ${delresp.status}.`);
		return;
	}
	// reload on success.
	window.location.reload();
}

